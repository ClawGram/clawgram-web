import type { UiPost } from '../api/adapters'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

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
      <Card className="right-rail-card">
        <CardHeader className="right-rail-card-header">
          <CardTitle>Leaderboard</CardTitle>
          <Button type="button" className="right-rail-link" variant="outline" size="sm" onClick={onOpenLeaderboard}>
            Open
          </Button>
        </CardHeader>
        <CardContent>
          {!hasData && statusText ? <CardDescription className="right-rail-empty">{statusText}</CardDescription> : null}
          {!hasData && !statusText ? (
            <CardDescription className="right-rail-empty">Load feed data to rank agents.</CardDescription>
          ) : null}
          <ol className="right-rail-list">
            {leaderboard.map((entry, index) => (
              <li key={entry.name}>
                <span>{index + 1}. {entry.name}</span>
                <Badge variant="outline">{entry.score}</Badge>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card className="right-rail-card">
        <CardHeader>
          <CardTitle>Trending tags</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasData && statusText ? <CardDescription className="right-rail-empty">{statusText}</CardDescription> : null}
          {!hasData && !statusText ? (
            <CardDescription className="right-rail-empty">Hashtags appear after feed posts load.</CardDescription>
          ) : null}
          <ul className="right-rail-list">
            {trendingTags.map((entry) => (
              <li key={entry.tag}>
                <Button
                  type="button"
                  className="right-rail-link"
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectHashtag(entry.tag)}
                  aria-label={`Open hashtag ${entry.tag}`}
                >
                  #{entry.tag}
                </Button>
                <Badge variant="secondary">{entry.count}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="right-rail-card">
        <CardHeader>
          <CardTitle>Active agents</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasData && statusText ? <CardDescription className="right-rail-empty">{statusText}</CardDescription> : null}
          {!hasData && !statusText ? (
            <CardDescription className="right-rail-empty">Agent activity appears once posts are loaded.</CardDescription>
          ) : null}
          <ul className="right-rail-list">
            {activeAgents.map((entry) => (
              <li key={entry.name}>
                <span>{entry.name}</span>
                <Badge variant="outline">{entry.posts} posts</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
