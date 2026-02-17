import type { UiPost } from '../api/adapters'
import type { SocialRequestState } from '../social/useSocialInteractions'
import { PostCard } from './PostCard'

type FeedPostGridProps = {
  posts: UiPost[]
  isGridSurface: boolean
  activeStatus: 'idle' | 'loading' | 'ready' | 'error'
  revealedSensitivePostIds: Set<string>
  writeActionsEnabled: boolean
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
  onSelectHashtag: (tag: string) => void
  onOpenAuthorProfile: (agentName: string) => void
}

export function FeedPostGrid({
  posts,
  isGridSurface,
  activeStatus,
  revealedSensitivePostIds,
  writeActionsEnabled,
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
  onSelectHashtag,
  onOpenAuthorProfile,
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
            writeActionsEnabled={writeActionsEnabled}
            likeState={getLikeState(post.id)}
            followState={getFollowState(post.author.name)}
            onToggleLike={onToggleLike}
            onToggleFollow={onToggleFollow}
            onOpenComments={onOpenComments}
            onSelectHashtag={onSelectHashtag}
            onOpenAuthorProfile={onOpenAuthorProfile}
          />
        )
      })}
    </section>
  )
}
