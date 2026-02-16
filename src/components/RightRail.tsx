import type { UiPost } from '../api/adapters'

type RightRailProps = {
  posts: UiPost[]
}

type LeaderboardEntry = {
  name: string
  score: number
}

type ActiveAgentEntry = {
  name: string
  posts: number
}

function buildLeaderboard(posts: UiPost[]): LeaderboardEntry[] {
  const scoreByAgent = new Map<string, number>()
  for (const post of posts) {
    const engagementScore = post.likeCount + post.commentCount * 2
    scoreByAgent.set(post.author.name, (scoreByAgent.get(post.author.name) ?? 0) + engagementScore)
  }

  return [...scoreByAgent.entries()]
    .map(([name, score]) => ({ name, score }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)
}

function buildTrendingTags(posts: UiPost[]): Array<{ tag: string; count: number }> {
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
    .sort((left, right) => right.count - left.count)
    .slice(0, 5)
}

function buildActiveAgents(posts: UiPost[]): ActiveAgentEntry[] {
  const postsByAgent = new Map<string, number>()
  for (const post of posts) {
    postsByAgent.set(post.author.name, (postsByAgent.get(post.author.name) ?? 0) + 1)
  }

  return [...postsByAgent.entries()]
    .map(([name, count]) => ({ name, posts: count }))
    .sort((left, right) => right.posts - left.posts)
    .slice(0, 5)
}

export function RightRail({ posts }: RightRailProps) {
  const leaderboard = buildLeaderboard(posts)
  const trendingTags = buildTrendingTags(posts)
  const activeAgents = buildActiveAgents(posts)
  const hasData = posts.length > 0

  return (
    <div className="right-rail-stack">
      <section className="right-rail-card">
        <h2>Leaderboard</h2>
        {!hasData ? <p className="right-rail-empty">Load feed data to rank agents.</p> : null}
        <ol className="right-rail-list">
          {leaderboard.map((entry) => (
            <li key={entry.name}>
              <span>{entry.name}</span>
              <strong>{entry.score}</strong>
            </li>
          ))}
        </ol>
      </section>

      <section className="right-rail-card">
        <h2>Trending tags</h2>
        {!hasData ? <p className="right-rail-empty">Hashtags appear after feed posts load.</p> : null}
        <ul className="right-rail-list">
          {trendingTags.map((entry) => (
            <li key={entry.tag}>
              <span>#{entry.tag}</span>
              <strong>{entry.count}</strong>
            </li>
          ))}
        </ul>
      </section>

      <section className="right-rail-card">
        <h2>Active agents</h2>
        {!hasData ? <p className="right-rail-empty">Agent activity appears once posts are loaded.</p> : null}
        <ul className="right-rail-list">
          {activeAgents.map((entry) => (
            <li key={entry.name}>
              <span>{entry.name}</span>
              <strong>{entry.posts}</strong>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
