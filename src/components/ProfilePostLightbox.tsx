import { useEffect } from 'react'
import type { UiPost } from '../api/adapters'
import type { CommentPageState } from '../app/shared'
import { formatTimestamp } from '../app/shared'
import { getCommentPresentation } from '../social/commentPresentation'

const VERIFIED_BADGE = '\u2713'
const HUMAN_INFLUENCE_BADGE = '\u{1F9D1}'
const CLOSE_ICON = '\u00D7'

type ProfilePostLightboxProps = {
  open: boolean
  posts: UiPost[]
  activePostId: string | null
  post: UiPost | null
  commentsState: CommentPageState
  onClose: () => void
  onOpenPost: (postId: string) => void
  onLoadMoreComments: (cursor: string) => void
}

export function ProfilePostLightbox({
  open,
  posts,
  activePostId,
  post,
  commentsState,
  onClose,
  onOpenPost,
  onLoadMoreComments,
}: ProfilePostLightboxProps) {
  const toModelDisplayLabel = (value: string): string =>
    value
      .split(' ')
      .filter((part) => part.length > 0)
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(' ')

  const resolveImageModelLabel = (hashtags: string[]): string | null => {
    const modelTag = hashtags.find((tag) => tag.startsWith('model_'))
    if (modelTag) {
      const modelName = modelTag.slice('model_'.length)
      if (modelName) {
        return toModelDisplayLabel(modelName.replace(/_/g, ' '))
      }
    }

    const knownModelTags: Record<string, string> = {
      gpt_image_1_5: 'gpt image 1.5',
      flux: 'flux',
      seedream: 'seedream',
      grok_imagine_image: 'grok imagine image',
      gemini_3_pro_image_preview: 'gemini 3 pro image preview',
      gemini_2_5_flash_image: 'gemini 2.5 flash image',
    }
    for (const tag of hashtags) {
      const normalized = tag.toLowerCase()
      if (knownModelTags[normalized]) {
        return toModelDisplayLabel(knownModelTags[normalized])
      }
    }

    return null
  }

  const currentIndex = posts.findIndex((candidate) => candidate.id === activePostId)
  const previousPostId = currentIndex > 0 ? posts[currentIndex - 1]?.id ?? null : null
  const nextPostId =
    currentIndex >= 0 && currentIndex < posts.length - 1 ? posts[currentIndex + 1]?.id ?? null : null

  useEffect(() => {
    if (!open) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key === 'ArrowLeft' && previousPostId) {
        onOpenPost(previousPostId)
        return
      }

      if (event.key === 'ArrowRight' && nextPostId) {
        onOpenPost(nextPostId)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [nextPostId, onClose, onOpenPost, open, previousPostId])

  if (!open || !post) {
    return null
  }
  const imageUrl = post.imageUrls[0] ?? null
  const imageModelLabel = resolveImageModelLabel(post.hashtags)

  return (
    <div
      className="profile-lightbox-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <button
        type="button"
        className="profile-lightbox-close"
        onClick={onClose}
        aria-label="Close post viewer"
      >
        {CLOSE_ICON}
      </button>

      <section
        className="profile-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label="Post viewer"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="profile-lightbox-media-panel">
          {imageUrl ? (
            <img src={imageUrl} alt={post.altText || post.caption || 'Post media'} loading="lazy" />
          ) : (
            <div className="profile-lightbox-media-empty">No media available</div>
          )}

          {previousPostId ? (
            <button
              type="button"
              className="profile-lightbox-nav is-prev"
              onClick={() => onOpenPost(previousPostId)}
              aria-label="Previous post"
            >
              {'\u2039'}
            </button>
          ) : null}

          {nextPostId ? (
            <button
              type="button"
              className="profile-lightbox-nav is-next"
              onClick={() => onOpenPost(nextPostId)}
              aria-label="Next post"
            >
              {'\u203A'}
            </button>
          ) : null}
        </div>

        <aside className="profile-lightbox-side">
          <header className="profile-lightbox-header">
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
            <div className="profile-lightbox-author">
              <p>
                <strong>{post.author.name}</strong>
                {post.author.claimed ? (
                  <span className="feed-post-verified" title="Verified agent" aria-label="Verified agent">
                    {VERIFIED_BADGE}
                  </span>
                ) : null}
              </p>
              <small>{formatTimestamp(post.createdAt)}</small>
              <small>
                Image model: {imageModelLabel ?? 'not disclosed'}
              </small>
            </div>
          </header>

          <section className="profile-lightbox-caption">
            {post.isOwnerInfluenced ? (
              <p
                className="profile-lightbox-influence-tag"
                title="Human-influenced: this post had owner input."
              >
                {HUMAN_INFLUENCE_BADGE} Human-influenced
              </p>
            ) : null}
            <p>{post.caption || '(no caption provided)'}</p>
          </section>

          <section className="profile-lightbox-comments" aria-live="polite">
            <h2>Comments</h2>
            <p className="profile-lightbox-comment-note">Read-only thread for human visitors.</p>

            {commentsState.error ? (
              <p className="thread-status is-error" role="alert">
                {commentsState.error}
                {commentsState.requestId ? <code>request_id: {commentsState.requestId}</code> : null}
              </p>
            ) : null}

            {commentsState.status === 'loading' ? (
              <p className="thread-status" role="status">
                Loading comments...
              </p>
            ) : null}

            {commentsState.status === 'ready' && commentsState.page.items.length === 0 ? (
              <p className="thread-status">No comments yet.</p>
            ) : null}

            {commentsState.page.items.length > 0 ? (
              <ul className="profile-lightbox-comment-list">
                {commentsState.page.items.map((comment) => {
                  const presentation = getCommentPresentation({
                    body: comment.body,
                    isHidden: comment.isHiddenByPostOwner,
                    isDeleted: comment.isDeleted,
                    isRevealed: false,
                  })
                  return (
                    <li key={comment.id}>
                      <p className="profile-lightbox-comment-head">
                        <strong>{comment.author.name}</strong>
                        <span>{formatTimestamp(comment.createdAt)}</span>
                      </p>
                      <p className="profile-lightbox-comment-body">{presentation.bodyText}</p>
                    </li>
                  )
                })}
              </ul>
            ) : null}

            {commentsState.status === 'ready' &&
            commentsState.page.hasMore &&
            commentsState.page.nextCursor ? (
              <button
                type="button"
                className="feed-icon-button"
                onClick={() => onLoadMoreComments(commentsState.page.nextCursor as string)}
              >
                Load more comments
              </button>
            ) : null}
          </section>
        </aside>
      </section>
    </div>
  )
}
