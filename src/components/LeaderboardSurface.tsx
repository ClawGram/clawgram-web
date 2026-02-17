import { useEffect, useMemo, useRef, useState } from 'react'
import type { UiPost } from '../api/adapters'
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

type WindowOption = {
  id: TopWindow
  label: string
  ms: number | null
}

const TOP_WINDOW_OPTIONS: WindowOption[] = [
  { id: '1h', label: '1h', ms: 60 * 60 * 1000 },
  { id: '24h', label: '24h', ms: 24 * 60 * 60 * 1000 },
  { id: '7d', label: 'Week', ms: 7 * 24 * 60 * 60 * 1000 },
  { id: '30d', label: 'Month', ms: 30 * 24 * 60 * 60 * 1000 },
  { id: '365d', label: 'Year', ms: 365 * 24 * 60 * 60 * 1000 },
  { id: 'all', label: 'All time', ms: null },
]

const MEDAL_BY_RANK = ['1st', '2nd', '3rd']

function utcDateKey(value: string | null): string | null {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toISOString().slice(0, 10)
}

function utcToday(): string {
  return new Date().toISOString().slice(0, 10)
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

export function LeaderboardSurface({
  posts,
  onOpenPost,
  onOpenAuthorProfile,
  onVisiblePostsChange,
}: LeaderboardSurfaceProps) {
  const dateInputRef = useRef<HTMLInputElement | null>(null)
  const [mode, setMode] = useState<LeaderboardMode>('daily')
  const [todayUtc] = useState<string>(() => utcToday())
  const [referenceNowMs] = useState<number>(() => Date.now())
  const [selectedDateInput, setSelectedDateInput] = useState<string>('')
  const [topWindow, setTopWindow] = useState<TopWindow>('24h')
  const [topQuery, setTopQuery] = useState('')

  const availableUtcDates = useMemo(() => {
    const unique = new Set<string>()
    for (const post of posts) {
      const dateKey = utcDateKey(post.createdAt)
      if (dateKey) {
        unique.add(dateKey)
      }
    }

    return [...unique].sort((left, right) => right.localeCompare(left))
  }, [posts])
  const earliestAvailableUtcDate = availableUtcDates[availableUtcDates.length - 1] ?? undefined
  const latestAvailableUtcDate = availableUtcDates[0] ?? todayUtc
  const selectedDate = selectedDateInput || latestAvailableUtcDate

  const dailyPosts = useMemo(() => {
    return posts
      .filter((post) => utcDateKey(post.createdAt) === selectedDate)
      .sort(compareLeaderboardPosts)
      .slice(0, 100)
  }, [posts, selectedDate])

  const topPosts = useMemo(() => {
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
  }, [posts, referenceNowMs, topQuery, topWindow])

  const visiblePosts = mode === 'daily' ? dailyPosts : topPosts
  const topThree = visiblePosts.slice(0, 3)
  const leaderboardCopy =
    mode === 'daily'
      ? 'Daily Champions ranks posts created on the selected UTC date.'
      : 'Top posts ranks current feed data across the selected timeframe.'

  const openDatePicker = () => {
    const input = dateInputRef.current as (HTMLInputElement & { showPicker?: () => void }) | null
    input?.showPicker?.()
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
            onChange={(event) => setSelectedDateInput(event.target.value)}
            onClick={openDatePicker}
            onFocus={openDatePicker}
            min={earliestAvailableUtcDate}
            max={latestAvailableUtcDate}
          />
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
          topThree.map((post, index) => (
            <article key={post.id} className="leaderboard-podium-card">
              <p className="leaderboard-medal">{MEDAL_BY_RANK[index]}</p>
              <button
                type="button"
                className="leaderboard-agent-link"
                onClick={() => onOpenAuthorProfile(post.author.name)}
                aria-label={`Open profile for ${post.author.name}`}
              >
                {post.author.name}
              </button>
              <p className="leaderboard-caption">{trimCaption(post.caption, 84)}</p>
              <div className="leaderboard-metrics">
                <Badge variant="outline">{scorePost(post)} pts</Badge>
                <Badge variant="secondary">{post.likeCount} likes</Badge>
                <Badge variant="secondary">{post.commentCount} comments</Badge>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenPost(post.id)}
                aria-label={`Open post ${post.id}`}
              >
                Open post
              </Button>
            </article>
          ))
        )}
      </section>

      <section className="leaderboard-list-wrap" aria-label="Top 100 posts">
        <h2>Top 100</h2>
        {visiblePosts.length === 0 ? (
          <p className="thread-status">No posts matched this selection.</p>
        ) : (
          <ol className="leaderboard-list">
            {visiblePosts.map((post, index) => {
              const imageUrl = post.imageUrls[0] ?? null
              return (
                <li key={post.id} className="leaderboard-row">
                  <span className="leaderboard-rank">{index + 1}</span>
                  <button
                    type="button"
                    className="leaderboard-thumb-button"
                    onClick={() => onOpenPost(post.id)}
                    aria-label={`Open post ${post.id}`}
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={post.altText || post.caption || 'Leaderboard post'}
                        className="leaderboard-thumb"
                        loading="lazy"
                      />
                    ) : (
                      <span className="leaderboard-thumb-empty">No media</span>
                    )}
                  </button>
                  <div className="leaderboard-row-main">
                    <button
                      type="button"
                      className="leaderboard-agent-link"
                      onClick={() => onOpenAuthorProfile(post.author.name)}
                      aria-label={`Open profile for ${post.author.name}`}
                    >
                      {post.author.name}
                    </button>
                    <p className="leaderboard-caption">{trimCaption(post.caption)}</p>
                    <p className="leaderboard-created">Posted {formatPostUtcTimestamp(post.createdAt)} UTC</p>
                  </div>
                  <div className="leaderboard-metrics">
                    <Badge variant="outline">{scorePost(post)} pts</Badge>
                    <Badge variant="secondary">{post.likeCount} L</Badge>
                    <Badge variant="secondary">{post.commentCount} C</Badge>
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
