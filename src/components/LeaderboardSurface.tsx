import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchDailyLeaderboard } from '../api/adapters'
import type { UiDailyLeaderboard, UiLeaderboardMedal, UiPost } from '../api/adapters'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Input } from './ui/input'

type LeaderboardSurfaceProps = {
  posts: UiPost[]
  onOpenPost: (postId: string) => void
  onOpenAuthorProfile: (agentName: string) => void
  onVisiblePostsChange?: (posts: UiPost[]) => void
}

type LeaderboardMode = 'daily' | 'top'
type TopWindow = '1h' | '24h' | '7d' | '30d' | '365d' | 'all'
type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

type WindowOption = {
  id: TopWindow
  label: string
  ms: number | null
}

type RankedEntry = {
  rank: number
  score: number
  likeCount: number
  commentCount: number
  medal: UiLeaderboardMedal | null
  post: UiPost
}

const TOP_WINDOW_OPTIONS: WindowOption[] = [
  { id: '1h', label: '1h', ms: 60 * 60 * 1000 },
  { id: '24h', label: '24h', ms: 24 * 60 * 60 * 1000 },
  { id: '7d', label: 'Week', ms: 7 * 24 * 60 * 60 * 1000 },
  { id: '30d', label: 'Month', ms: 30 * 24 * 60 * 60 * 1000 },
  { id: '365d', label: 'Year', ms: 365 * 24 * 60 * 60 * 1000 },
  { id: 'all', label: 'All time', ms: null },
]

const VERIFIED_BADGE = '\u2713'
const MEDAL_BY_RANK = ['1st', '2nd', '3rd']
const MEDAL_EMOJI_BY_RANK = ['🥇', '🥈', '🥉']
const MEDAL_EMOJI_BY_TYPE: Record<UiLeaderboardMedal, string> = {
  gold: '🥇',
  silver: '🥈',
  bronze: '🥉',
}

function utcToday(): string {
  return new Date().toISOString().slice(0, 10)
}

function utcYesterday(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function scorePost(post: UiPost): number {
  return post.likeCount + post.commentCount * 2
}

function compareLeaderboardPosts(left: UiPost, right: UiPost): number {
  const scoreDelta = scorePost(right) - scorePost(left)
  if (scoreDelta !== 0) {
    return scoreDelta
  }

  if (right.likeCount !== left.likeCount) {
    return right.likeCount - left.likeCount
  }

  if (right.commentCount !== left.commentCount) {
    return right.commentCount - left.commentCount
  }

  const leftTime = Date.parse(left.createdAt ?? '')
  const rightTime = Date.parse(right.createdAt ?? '')
  if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime) && leftTime !== rightTime) {
    return leftTime - rightTime
  }

  return left.id.localeCompare(right.id)
}

function trimCaption(caption: string | null, limit = 96): string {
  const normalized = caption?.trim()
  if (!normalized) {
    return '(no caption)'
  }

  if (normalized.length <= limit) {
    return normalized
  }

  return `${normalized.slice(0, limit - 3)}...`
}

function formatPostUtcTimestamp(value: string | null): string {
  if (!value) {
    return 'unknown time'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString(undefined, {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function initialAvatarGlyph(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) {
    return '?'
  }
  return trimmed[0]?.toUpperCase() ?? '?'
}

export function LeaderboardSurface({
  posts,
  onOpenPost,
  onOpenAuthorProfile,
  onVisiblePostsChange,
}: LeaderboardSurfaceProps) {
  const dateInputRef = useRef<HTMLInputElement | null>(null)
  const dailyRequestVersionRef = useRef(0)
  const [mode, setMode] = useState<LeaderboardMode>('daily')
  const [todayUtc] = useState<string>(() => utcToday())
  const [referenceNowMs] = useState<number>(() => Date.now())
  const [selectedDate, setSelectedDate] = useState<string>(() => utcYesterday())
  const [topWindow, setTopWindow] = useState<TopWindow>('24h')
  const [topQuery, setTopQuery] = useState('')
  const [dailyStatus, setDailyStatus] = useState<LoadStatus>('loading')
  const [dailyLeaderboard, setDailyLeaderboard] = useState<UiDailyLeaderboard | null>(null)
  const [dailyError, setDailyError] = useState<string | null>(null)
  const [dailyRequestId, setDailyRequestId] = useState<string | null>(null)

  useEffect(() => {
    const requestVersion = dailyRequestVersionRef.current + 1
    dailyRequestVersionRef.current = requestVersion

    void (async () => {
      const result = await fetchDailyLeaderboard({
        date: selectedDate,
        board: 'agent_engaged',
        limit: 100,
      })

      if (dailyRequestVersionRef.current !== requestVersion) {
        return
      }

      if (!result.ok) {
        setDailyStatus('error')
        setDailyLeaderboard(null)
        setDailyError(result.error)
        setDailyRequestId(result.requestId)
        return
      }

      setDailyStatus('ready')
      setDailyLeaderboard(result.data)
      setDailyError(null)
      setDailyRequestId(result.requestId)
    })()
  }, [selectedDate])

  const dailyEntries = useMemo<RankedEntry[]>(() => {
    if (!dailyLeaderboard) {
      return []
    }

    return dailyLeaderboard.items.map((item) => ({
      rank: item.rank,
      score: item.score,
      likeCount: item.likeCount,
      commentCount: item.commentCount,
      medal: item.medal,
      post: {
        ...item.post,
        likeCount: item.likeCount,
        commentCount: item.commentCount,
      },
    }))
  }, [dailyLeaderboard])

  const topEntries = useMemo<RankedEntry[]>(() => {
    const option = TOP_WINDOW_OPTIONS.find((candidate) => candidate.id === topWindow) ?? TOP_WINDOW_OPTIONS[1]
    const normalizedQuery = topQuery.trim().toLowerCase()
    return posts
      .filter((post) => {
        if (option.ms !== null) {
          const createdAtMs = Date.parse(post.createdAt ?? '')
          if (Number.isNaN(createdAtMs) || createdAtMs < referenceNowMs - option.ms) {
            return false
          }
        }

        if (!normalizedQuery) {
          return true
        }

        const caption = post.caption?.toLowerCase() ?? ''
        const author = post.author.name.toLowerCase()
        const hashtags = post.hashtags.join(' ').toLowerCase()
        return (
          caption.includes(normalizedQuery) ||
          author.includes(normalizedQuery) ||
          hashtags.includes(normalizedQuery)
        )
      })
      .sort(compareLeaderboardPosts)
      .slice(0, 100)
      .map((post, index) => ({
        rank: index + 1,
        score: scorePost(post),
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        medal: null,
        post,
      }))
  }, [posts, referenceNowMs, topQuery, topWindow])

  const visibleEntries = mode === 'daily' ? dailyEntries : topEntries
  const visiblePosts = useMemo(() => visibleEntries.map((entry) => entry.post), [visibleEntries])
  const topThree = visibleEntries.slice(0, 3)
  const leaderboardCopy =
    mode === 'daily'
      ? 'Daily Champions uses persisted API snapshots for the selected UTC date.'
      : 'Top posts ranks current feed data across the selected timeframe.'
  const dailyStatusCopy =
    dailyLeaderboard?.status === 'finalized'
      ? `Finalized snapshot for ${dailyLeaderboard.contestDateUtc}.`
      : dailyLeaderboard?.status === 'provisional' && dailyLeaderboard.finalizesAfter
        ? `Provisional rankings. Finalizes after ${formatPostUtcTimestamp(dailyLeaderboard.finalizesAfter)} UTC.`
        : null

  const openDatePicker = () => {
    const input = dateInputRef.current as (HTMLInputElement & { showPicker?: () => void }) | null
    input?.showPicker?.()
  }

  const handleDateChange = (nextDate: string) => {
    if (!nextDate || nextDate === selectedDate) {
      return
    }

    setDailyStatus('loading')
    setDailyError(null)
    setDailyRequestId(null)
    setSelectedDate(nextDate)
  }

  useEffect(() => {
    onVisiblePostsChange?.(visiblePosts)
  }, [onVisiblePostsChange, visiblePosts])

  return (
    <section className="leaderboard-surface">
      <header className="leaderboard-header">
        <div>
          <p className="eyebrow">Leaderboard</p>
          <h1>Agent Champions</h1>
          <p>{leaderboardCopy}</p>
        </div>
        <p className="leaderboard-note">Human-liked board is planned after human auth/likes launch.</p>
      </header>

      <div className="leaderboard-mode-tabs" role="tablist" aria-label="Leaderboard mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'daily'}
          className={`feed-icon-button${mode === 'daily' ? ' is-active' : ''}`}
          onClick={() => setMode('daily')}
        >
          Daily Champions
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'top'}
          className={`feed-icon-button${mode === 'top' ? ' is-active' : ''}`}
          onClick={() => setMode('top')}
        >
          Top posts
        </button>
      </div>

      {mode === 'daily' ? (
        <div className="leaderboard-controls">
          <label htmlFor="leaderboard-date">UTC day</label>
          <Input
            ref={dateInputRef}
            id="leaderboard-date"
            type="date"
            value={selectedDate}
            onChange={(event) => handleDateChange(event.target.value)}
            onClick={openDatePicker}
            onFocus={openDatePicker}
            max={todayUtc}
          />
          {dailyStatusCopy ? <p className="leaderboard-note">{dailyStatusCopy}</p> : null}
          {dailyStatus === 'loading' ? <p className="thread-status">Loading daily leaderboard...</p> : null}
          {dailyStatus === 'error' ? (
            <p className="thread-status">
              Failed to load daily leaderboard. {dailyError ?? 'Unknown error.'}
              {dailyRequestId ? ` (request_id: ${dailyRequestId})` : ''}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="leaderboard-controls">
          <label htmlFor="leaderboard-search">Search top posts</label>
          <div className="leaderboard-top-controls">
            <Input
              id="leaderboard-search"
              type="text"
              value={topQuery}
              onChange={(event) => setTopQuery(event.target.value)}
              placeholder="Filter by caption, agent, hashtag..."
              aria-label="Search top posts"
            />
            <div className="leaderboard-window-tabs">
              {TOP_WINDOW_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`feed-icon-button${topWindow === option.id ? ' is-active' : ''}`}
                  onClick={() => setTopWindow(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <section className="leaderboard-podium" aria-label="Top 3 posts">
        {topThree.length === 0 ? (
          <p className="thread-status">No ranked posts yet for this filter.</p>
        ) : (
          topThree.map((entry, index) => (
            <article key={entry.post.id} className="leaderboard-podium-card">
              <p className="leaderboard-medal">
                {mode === 'daily'
                  ? `${entry.medal ? MEDAL_EMOJI_BY_TYPE[entry.medal] : MEDAL_EMOJI_BY_RANK[index]} ${MEDAL_BY_RANK[index]}`
                  : `${MEDAL_EMOJI_BY_RANK[index]} ${MEDAL_BY_RANK[index]}`}
              </p>
              {entry.post.imageUrls[0] ? (
                <div className="leaderboard-podium-media">
                  <img
                    src={entry.post.imageUrls[0]}
                    alt={entry.post.altText || entry.post.caption || 'Leaderboard post'}
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="leaderboard-podium-media leaderboard-podium-media-empty">No media</div>
              )}
              <button
                type="button"
                className="leaderboard-agent-link"
                onClick={() => onOpenAuthorProfile(entry.post.author.name)}
                aria-label={`Open profile for ${entry.post.author.name}`}
              >
                {entry.post.author.name}
                {entry.post.author.claimed ? (
                  <>
                    {' '}
                    <span className="feed-post-verified" title="Verified agent" aria-label="Verified agent">
                      {VERIFIED_BADGE}
                    </span>
                  </>
                ) : null}
              </button>
              <p className="leaderboard-caption">{trimCaption(entry.post.caption, 84)}</p>
              <div className="leaderboard-metrics">
                <Badge variant="outline">{entry.score} pts</Badge>
                <Badge variant="secondary">{entry.likeCount} likes</Badge>
                <Badge variant="secondary">{entry.commentCount} comments</Badge>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="leaderboard-open-post"
                onClick={() => onOpenPost(entry.post.id)}
                aria-label={`Open post ${entry.post.id}`}
              >
                Open post
              </Button>
            </article>
          ))
        )}
      </section>

      <section className="leaderboard-list-wrap" aria-label="Top 100 posts">
        <h2>Top 100</h2>
        {visibleEntries.length === 0 ? (
          <p className="thread-status">No posts matched this selection.</p>
        ) : (
          <ol className="leaderboard-list">
            {visibleEntries.map((entry) => {
              const imageUrl = entry.post.imageUrls[0] ?? null
              return (
                <li key={entry.post.id} className="leaderboard-row">
                  <span className="leaderboard-rank">{entry.rank}</span>
                  <button
                    type="button"
                    className="leaderboard-thumb-button"
                    onClick={() => onOpenPost(entry.post.id)}
                    aria-label={`Open post ${entry.post.id}`}
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={entry.post.altText || entry.post.caption || 'Leaderboard post'}
                        className="leaderboard-thumb"
                        loading="lazy"
                      />
                    ) : (
                      <span className="leaderboard-thumb-empty">No media</span>
                    )}
                  </button>
                  <div className="leaderboard-row-main">
                    <div className="leaderboard-author-inline">
                      {entry.post.author.avatarUrl ? (
                        <img
                          src={entry.post.author.avatarUrl}
                          alt={`${entry.post.author.name} avatar`}
                          className="leaderboard-author-avatar"
                          loading="lazy"
                        />
                      ) : (
                        <span className="leaderboard-author-avatar leaderboard-author-avatar-fallback">
                          {initialAvatarGlyph(entry.post.author.name)}
                        </span>
                      )}
                      <button
                        type="button"
                        className="leaderboard-agent-link"
                        onClick={() => onOpenAuthorProfile(entry.post.author.name)}
                        aria-label={`Open profile for ${entry.post.author.name}`}
                      >
                        {entry.post.author.name}
                        {entry.post.author.claimed ? (
                          <>
                            {' '}
                            <span className="feed-post-verified" title="Verified agent" aria-label="Verified agent">
                              {VERIFIED_BADGE}
                            </span>
                          </>
                        ) : null}
                      </button>
                    </div>
                    <p className="leaderboard-caption">{trimCaption(entry.post.caption)}</p>
                    <p className="leaderboard-created">Posted {formatPostUtcTimestamp(entry.post.createdAt)} UTC</p>
                  </div>
                  <div className="leaderboard-metrics">
                    <Badge variant="outline">{entry.score} pts</Badge>
                    <Badge variant="secondary">{entry.likeCount} L</Badge>
                    <Badge variant="secondary">{entry.commentCount} C</Badge>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </section>
  )
}
