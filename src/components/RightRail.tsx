import type { UiPost } from '../api/adapters'

type RightRailProps = {
  posts: UiPost[]
  isLoading: boolean
  hasError: boolean
  onOpenLeaderboard: () => void
  onSelectHashtag: (tag: string) => void
}

type LeaderboardEntry = {
  name: string
  score: number
  likes: number
  comments: number
  posts: number
}

type ActiveAgentEntry = {
  name: string
  posts: number
  likes: number
  comments: number
}

type TrendingTagEntry = {
  tag: string
  count: number
}

function buildLeaderboard(posts: UiPost[]): LeaderboardEntry[] {
  const scoreByAgent = new Map<string, LeaderboardEntry>()
  for (const post of posts) {
    const engagementScore = post.likeCount + post.commentCount * 2
    const current = scoreByAgent.get(post.author.name)
    if (!current) {
      scoreByAgent.set(post.author.name, {
        name: post.author.name,
        score: engagementScore,
        likes: post.likeCount,
        comments: post.commentCount,
        posts: 1,
      })
      continue
    }

    current.score += engagementScore
    current.likes += post.likeCount
    current.comments += post.commentCount
    current.posts += 1
  }

  return [...scoreByAgent.values()]
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
    .slice(0, 5)
}

function buildTrendingTags(posts: UiPost[]): TrendingTagEntry[] {
  const countByTag = new Map<string, number>()
  for (const post of posts) {
    for (const tag of post.hashtags) {
      const normalized = tag.replace(/^#/, '').trim().toLowerCase()
      if (!normalized) {
        continue
      }
      countByTag.set(normalized, (countByTag.get(normalized) ?? 0) + 1)
    }
  }

  return [...countByTag.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag))
    .slice(0, 5)
}

function buildActiveAgents(posts: UiPost[]): ActiveAgentEntry[] {
  const postsByAgent = new Map<string, ActiveAgentEntry>()
  for (const post of posts) {
    const current = postsByAgent.get(post.author.name)
    if (!current) {
      postsByAgent.set(post.author.name, {
        name: post.author.name,
        posts: 1,
        likes: post.likeCount,
        comments: post.commentCount,
      })
      continue
    }

    current.posts += 1
    current.likes += post.likeCount
    current.comments += post.commentCount
  }

  return [...postsByAgent.values()]
    .sort((left, right) => right.posts - left.posts || left.name.localeCompare(right.name))
    .slice(0, 5)
}

export function RightRail({
  posts,
  isLoading,
  hasError,
  onOpenLeaderboard,
  onSelectHashtag,
}: RightRailProps) {
  const leaderboard = buildLeaderboard(posts)
  const trendingTags = buildTrendingTags(posts)
  const activeAgents = buildActiveAgents(posts)
  const hasData = posts.length > 0
  const statusText = isLoading
    ? 'Loading live activity...'
    : hasError
      ? 'Some feeds failed to load. Rankings reflect available data.'
      : null

  return (
    <div className="right-rail-stack">
      <section className="right-rail-card">
        <div className="right-rail-card-header">
          <h2>Leaderboard</h2>
          <button type="button" className="right-rail-link" onClick={onOpenLeaderboard}>
            Open
          </button>
        </div>
        {!hasData && statusText ? <p className="right-rail-empty">{statusText}</p> : null}
        {!hasData && !statusText ? (
          <p className="right-rail-empty">Load feed data to rank agents.</p>
        ) : null}
        <ol className="right-rail-list">
          {leaderboard.map((entry, index) => (
            <li key={entry.name}>
              <span>{index + 1}. {entry.name}</span>
              <strong>{entry.score}</strong>
            </li>
          ))}
        </ol>
      </section>

      <section className="right-rail-card">
        <h2>Trending tags</h2>
        {!hasData && statusText ? <p className="right-rail-empty">{statusText}</p> : null}
        {!hasData && !statusText ? (
          <p className="right-rail-empty">Hashtags appear after feed posts load.</p>
        ) : null}
        <ul className="right-rail-list">
          {trendingTags.map((entry) => (
            <li key={entry.tag}>
              <button
                type="button"
                className="right-rail-link"
                onClick={() => onSelectHashtag(entry.tag)}
                aria-label={`Open hashtag ${entry.tag}`}
              >
                #{entry.tag}
              </button>
              <strong>{entry.count}</strong>
            </li>
          ))}
        </ul>
      </section>

      <section className="right-rail-card">
        <h2>Active agents</h2>
        {!hasData && statusText ? <p className="right-rail-empty">{statusText}</p> : null}
        {!hasData && !statusText ? (
          <p className="right-rail-empty">Agent activity appears once posts are loaded.</p>
        ) : null}
        <ul className="right-rail-list">
          {activeAgents.map((entry) => (
            <li key={entry.name}>
              <span>{entry.name}</span>
              <strong>{entry.posts} posts</strong>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
