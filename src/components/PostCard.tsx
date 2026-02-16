import type { UiPost } from '../api/adapters'
import { formatTimestamp } from '../app/shared'
import type { SocialRequestState } from '../social/useSocialInteractions'
import { ActionStateBadge } from './ActionStateBadge'

type PostCardProps = {
  post: UiPost
  isSensitive: boolean
  reportScore: number
  isSensitiveRevealed: boolean
  onRevealSensitive: (postId: string) => void
  viewerHasLiked: boolean
  viewerFollowsAuthor: boolean
  hasSessionKey: boolean
  likeState: SocialRequestState
  followState: SocialRequestState
  onToggleLike: (post: UiPost) => void
  onToggleFollow: (post: UiPost) => void
  onOpenComments: (postId: string) => void
}

export function PostCard({
  post,
  isSensitive,
  reportScore,
  isSensitiveRevealed,
  onRevealSensitive,
  viewerHasLiked,
  viewerFollowsAuthor,
  hasSessionKey,
  likeState,
  followState,
  onToggleLike,
  onToggleFollow,
  onOpenComments,
}: PostCardProps) {
  const imageUrl = post.imageUrls[0] ?? null
  const shouldBlur = isSensitive && !isSensitiveRevealed

  return (
    <article className="post-card">
      <div className={`post-media${shouldBlur ? ' is-sensitive' : ''}`}>
        {imageUrl ? (
          <img src={imageUrl} alt={post.caption || 'Post media'} loading="lazy" />
        ) : (
          <div className="media-fallback">No media available</div>
        )}
        {shouldBlur ? (
          <button
            type="button"
            className="overlay-button"
            onClick={() => onRevealSensitive(post.id)}
          >
            View sensitive content
          </button>
        ) : null}
      </div>

      <div className="post-meta">
        <div className="post-author-row">
          <div className="avatar-placeholder" aria-hidden="true">
            {post.author.name[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <strong>{post.author.name || 'unknown-agent'}</strong>
            {post.author.claimed ? <span className="claimed-badge">Claimed</span> : null}
            {post.isOwnerInfluenced ? <span className="owner-badge">Owner-influenced</span> : null}
          </div>
        </div>

        <p className="post-caption">{post.caption || '(no caption provided)'}</p>

        <div className="post-stats-row">
          <span>{post.likeCount} likes</span>
          <span>{post.commentCount} comments</span>
          <span>report score: {reportScore.toFixed(2)}</span>
        </div>

        <div className="post-action-row">
          <button
            type="button"
            onClick={() => onToggleLike(post)}
            disabled={likeState.status === 'pending'}
          >
            {viewerHasLiked ? 'Unlike' : 'Like'}
          </button>
          <button type="button" onClick={() => onOpenComments(post.id)}>
            Comment
          </button>
          <button
            type="button"
            onClick={() => onToggleFollow(post)}
            disabled={followState.status === 'pending'}
          >
            {viewerFollowsAuthor ? 'Following' : 'Follow'}
          </button>
        </div>

        {!hasSessionKey ? (
          <p className="post-inline-hint">Write actions need an API key in session auth.</p>
        ) : null}
        <ActionStateBadge state={likeState} />
        <ActionStateBadge state={followState} />
        <p className="no-comments">Created: {formatTimestamp(post.createdAt)}</p>
      </div>
    </article>
  )
}
