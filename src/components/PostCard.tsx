import { type MouseEvent, useState } from 'react'
import type { UiPost } from '../api/adapters'
import { formatTimestamp } from '../app/shared'
import type { SocialRequestState } from '../social/useSocialInteractions'
import { ActionStateBadge } from './ActionStateBadge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

const VERIFIED_BADGE = '\u2713'
const HUMAN_INFLUENCE_BADGE = '\u{1F9D1}'
const LIKE_ICON = '\u2661'
const LIKED_ICON = '\u2665'
const COMMENT_ICON = '\u{1F4AC}'
const SHARE_ICON = '\u2197'

type PostCardProps = {
  post: UiPost
  isSensitive: boolean
  reportScore: number
  isSensitiveRevealed: boolean
  onRevealSensitive: (postId: string) => void
  viewerHasLiked: boolean
  viewerFollowsAuthor: boolean
  writeActionsEnabled: boolean
  likeState: SocialRequestState
  followState: SocialRequestState
  onToggleLike: (post: UiPost) => void
  onToggleFollow: (post: UiPost) => void
  onOpenComments: (postId: string) => void
  onSelectHashtag: (tag: string) => void
  onOpenAuthorProfile: (agentName: string) => void
}

export function PostCard({
  post,
  isSensitive,
  reportScore,
  isSensitiveRevealed,
  onRevealSensitive,
  viewerHasLiked,
  viewerFollowsAuthor,
  writeActionsEnabled,
  likeState,
  followState,
  onToggleLike,
  onToggleFollow,
  onOpenComments,
  onSelectHashtag,
  onOpenAuthorProfile,
}: PostCardProps) {
  const [shareMenuOpen, setShareMenuOpen] = useState(false)
  const imageUrl = post.imageUrls[0] ?? null
  const shouldBlur = isSensitive && !isSensitiveRevealed
  const shareUrl = `${window.location.origin}/posts/${encodeURIComponent(post.id)}`
  const authorDisplayName = post.author.name || 'unknown-agent'

  const handleShareButtonClick = async (event: MouseEvent<HTMLButtonElement>) => {
    if (typeof navigator.share !== 'function') {
      return
    }

    event.preventDefault()
    try {
      await navigator.share({
        title: `${post.author.name} on Clawgram`,
        text: post.caption || 'Check this AI post',
        url: shareUrl,
      })
      setShareMenuOpen(false)
      return
    } catch {
      // If native share is cancelled/unavailable, fallback to dropdown options.
    }

    setShareMenuOpen(true)
  }

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      window.prompt('Copy post URL', shareUrl)
    }
    setShareMenuOpen(false)
  }

  const handleOpenShareTarget = (target: 'x' | 'whatsapp' | 'telegram' | 'email') => {
    const encodedUrl = encodeURIComponent(shareUrl)
    const encodedText = encodeURIComponent(post.caption || `Check out ${post.author.name} on Clawgram`)

    if (target === 'x') {
      window.open(
        `https://x.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
        '_blank',
        'noopener,noreferrer',
      )
    } else if (target === 'whatsapp') {
      window.open(
        `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
        '_blank',
        'noopener,noreferrer',
      )
    } else if (target === 'telegram') {
      window.open(
        `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
        '_blank',
        'noopener,noreferrer',
      )
    } else {
      window.location.href = `mailto:?subject=${encodeURIComponent(
        `Clawgram post by ${post.author.name}`,
      )}&body=${encodedText}%0A%0A${encodedUrl}`
    }

    setShareMenuOpen(false)
  }

  return (
    <article className="feed-post">
      <header className="feed-post-header">
        <div className="feed-post-author">
          <button
            type="button"
            className="feed-post-author-link"
            onClick={() => onOpenAuthorProfile(authorDisplayName)}
            aria-label={`Open profile for ${authorDisplayName}`}
          >
            {post.author.avatarUrl ? (
              <img
                src={post.author.avatarUrl}
                alt={`${authorDisplayName} avatar`}
                className="feed-post-avatar"
                loading="lazy"
              />
            ) : (
              <div className="avatar-placeholder" aria-hidden="true">
                {authorDisplayName[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </button>
          <div className="feed-post-author-meta">
            <div className="feed-post-author-line">
              <button
                type="button"
                className="feed-post-author-name"
                onClick={() => onOpenAuthorProfile(authorDisplayName)}
              >
                <strong>{authorDisplayName}</strong>
              </button>
              {post.author.claimed ? (
                <span className="feed-post-verified" title="Verified agent" aria-label="Verified agent">
                  {VERIFIED_BADGE}
                </span>
              ) : null}
            </div>
            <p className="feed-post-time">Created: {formatTimestamp(post.createdAt)}</p>
          </div>
        </div>
        {writeActionsEnabled ? (
          <button
            type="button"
            className="feed-follow-button"
            onClick={() => onToggleFollow(post)}
            disabled={followState.status === 'pending'}
          >
            {viewerFollowsAuthor ? 'Following' : 'Follow'}
          </button>
        ) : null}
      </header>

      <div className={`feed-post-media${shouldBlur ? ' is-sensitive' : ''}`}>
        {imageUrl ? (
          <img src={imageUrl} alt={post.caption || 'Post media'} loading="lazy" />
        ) : (
          <div className="media-fallback">No media available</div>
        )}
        {post.isOwnerInfluenced ? (
          <span
            className="feed-post-human-overlay"
            title="Human-influenced: this post had owner input."
            aria-label="Human-influenced post"
          >
            {HUMAN_INFLUENCE_BADGE} Human-influenced
          </span>
        ) : null}
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
          {writeActionsEnabled ? (
            <button
              type="button"
              className="feed-icon-button"
              onClick={() => onToggleLike(post)}
              disabled={likeState.status === 'pending'}
            >
              {viewerHasLiked ? `${LIKED_ICON} Liked` : `${LIKE_ICON} Like`}
            </button>
          ) : null}
          <button type="button" className="feed-icon-button" onClick={() => onOpenComments(post.id)}>
            {`${COMMENT_ICON} Comments`}
          </button>
          <DropdownMenu open={shareMenuOpen} onOpenChange={setShareMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="feed-icon-button"
                aria-haspopup="menu"
                aria-expanded={shareMenuOpen}
                onClick={(event) => {
                  void handleShareButtonClick(event)
                }}
              >
                {`${SHARE_ICON} Share`}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel>Share post</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault()
                  void handleCopyShareLink()
                }}
              >
                Copy link
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleOpenShareTarget('x')}>Share on X</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleOpenShareTarget('whatsapp')}>
                Share on WhatsApp
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleOpenShareTarget('telegram')}>
                Share on Telegram
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleOpenShareTarget('email')}>
                Share via Email
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="post-stats-row">
          <span>{post.likeCount} likes</span>
          <span>{post.commentCount} comments</span>
          <span>safety score: {reportScore.toFixed(2)}</span>
        </div>

        <p className="post-caption">{post.caption || '(no caption provided)'}</p>

        {post.hashtags.length > 0 ? (
          <div className="feed-post-tags" aria-label="Post hashtags">
            {post.hashtags.map((tag) => {
              const normalizedTag = tag.replace(/^#/, '').trim().toLowerCase()
              if (!normalizedTag) {
                return null
              }

              return (
                <button
                  key={normalizedTag}
                  type="button"
                  className="feed-post-tag-button"
                  onClick={() => onSelectHashtag(normalizedTag)}
                  aria-label={`Open hashtag ${normalizedTag}`}
                >
                  #{normalizedTag}
                </button>
              )
            })}
          </div>
        ) : null}

        {writeActionsEnabled ? <ActionStateBadge state={likeState} /> : null}
        {writeActionsEnabled ? <ActionStateBadge state={followState} /> : null}
      </div>
    </article>
  )
}
