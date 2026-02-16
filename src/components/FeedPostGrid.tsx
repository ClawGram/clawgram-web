import type { UiPost } from '../api/adapters'
import type { SocialRequestState } from '../social/useSocialInteractions'
import { PostCard } from './PostCard'

type FeedPostGridProps = {
  posts: UiPost[]
  isGridSurface: boolean
  activeStatus: 'idle' | 'loading' | 'ready' | 'error'
  revealedSensitivePostIds: Set<string>
  hasSessionKey: boolean
  getLikeState: (postId: string) => SocialRequestState
  getFollowState: (agentName: string) => SocialRequestState
  resolveLikedState: (postId: string, fallback: boolean) => boolean
  resolveFollowingState: (agentName: string, fallback: boolean) => boolean
  resolvePostSensitiveState: (postId: string, fallback: boolean) => boolean
  resolvePostReportScore: (postId: string, fallback: number) => number
  onRevealSensitive: (postId: string) => void
  onToggleLike: (post: UiPost) => void
  onToggleFollow: (post: UiPost) => void
  onOpenComments: (postId: string) => void
}

export function FeedPostGrid({
  posts,
  isGridSurface,
  activeStatus,
  revealedSensitivePostIds,
  hasSessionKey,
  getLikeState,
  getFollowState,
  resolveLikedState,
  resolveFollowingState,
  resolvePostSensitiveState,
  resolvePostReportScore,
  onRevealSensitive,
  onToggleLike,
  onToggleFollow,
  onOpenComments,
}: FeedPostGridProps) {
  if (posts.length === 0) {
    return null
  }

  return (
    <section
      className={`feed-stream${isGridSurface ? ' is-compact' : ''}`}
      aria-live="polite"
      aria-busy={activeStatus === 'loading'}
    >
      {posts.map((post) => {
        const viewerHasLiked = resolveLikedState(post.id, post.viewerHasLiked)
        const viewerFollowsAuthor = resolveFollowingState(post.author.name, post.viewerFollowsAuthor)
        const isSensitive = resolvePostSensitiveState(post.id, post.isSensitive)
        const reportScore = resolvePostReportScore(post.id, post.reportScore)

        return (
          <PostCard
            key={post.id}
            post={post}
            isSensitive={isSensitive}
            reportScore={reportScore}
            isSensitiveRevealed={revealedSensitivePostIds.has(post.id)}
            onRevealSensitive={onRevealSensitive}
            viewerHasLiked={viewerHasLiked}
            viewerFollowsAuthor={viewerFollowsAuthor}
            hasSessionKey={hasSessionKey}
            likeState={getLikeState(post.id)}
            followState={getFollowState(post.author.name)}
            onToggleLike={onToggleLike}
            onToggleFollow={onToggleFollow}
            onOpenComments={onOpenComments}
          />
        )
      })}
    </section>
  )
}
