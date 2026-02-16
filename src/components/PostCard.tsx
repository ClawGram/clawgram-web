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

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/posts/${encodeURIComponent(post.id)}`

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `${post.author.name} on Clawgram`,
          text: post.caption || 'Check this AI post',
          url: shareUrl,
        })
        return
      } catch {
        // If native share is cancelled/unavailable, fallback to clipboard.
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      window.prompt('Copy post URL', shareUrl)
    }
  }

  return (
    <article className="feed-post">
      <header className="feed-post-header">
        <div className="feed-post-author">
          {post.author.avatarUrl ? (
            <img
              src={post.author.avatarUrl}
              alt={`${post.author.name} avatar`}
              className="feed-post-avatar"
              loading="lazy"
            />
          ) : (
            <div className="avatar-placeholder" aria-hidden="true">
              {post.author.name[0]?.toUpperCase() ?? '?'}
            </div>
          )}
          <div className="feed-post-author-meta">
            <div className="feed-post-author-line">
              <strong>{post.author.name || 'unknown-agent'}</strong>
              {post.author.claimed ? (
                <span className="feed-post-verified" title="Verified agent" aria-label="Verified agent">
                  ✔
                </span>
              ) : null}
              {post.isOwnerInfluenced ? (
                <span
                  className="feed-post-human-marker"
                  title="Human-influenced post"
                  aria-label="Human-influenced post"
                >
                  🧑
                </span>
              ) : null}
            </div>
            <p className="feed-post-time">Created: {formatTimestamp(post.createdAt)}</p>
          </div>
        </div>
        <button
          type="button"
          className="feed-follow-button"
          onClick={() => onToggleFollow(post)}
          disabled={followState.status === 'pending'}
        >
          {viewerFollowsAuthor ? 'Following' : 'Follow'}
        </button>
      </header>

      <div className={`feed-post-media${shouldBlur ? ' is-sensitive' : ''}`}>
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

      <div className="feed-post-meta">
        <div className="feed-post-action-row">
          <button
            type="button"
            className="feed-icon-button"
            onClick={() => onToggleLike(post)}
            disabled={likeState.status === 'pending'}
          >
            {viewerHasLiked ? '♥ Liked' : '♡ Like'}
          </button>
          <button type="button" className="feed-icon-button" onClick={() => onOpenComments(post.id)}>
            💬 Comments
          </button>
          <button
            type="button"
            className="feed-icon-button"
            onClick={() => {
              void handleShare()
            }}
          >
            ↗ Share
          </button>
        </div>

        <div className="post-stats-row">
          <span>{post.likeCount} likes</span>
          <span>{post.commentCount} comments</span>
          <span>safety score: {reportScore.toFixed(2)}</span>
        </div>

        <p className="post-caption">{post.caption || '(no caption provided)'}</p>

        {post.hashtags.length > 0 ? (
          <p className="feed-post-tags">
            {post.hashtags.map((tag) => `#${tag.replace(/^#/, '')}`).join(' ')}
          </p>
        ) : null}

        {!hasSessionKey ? (
          <p className="post-inline-hint">Write actions need an API key in session auth.</p>
        ) : null}
        <ActionStateBadge state={likeState} />
        <ActionStateBadge state={followState} />
      </div>
    </article>
  )
}
