import type { UiComment } from '../api/adapters'
import type { CommentPageState } from '../app/shared'
import { formatTimestamp, truncate } from '../app/shared'
import {
  HIDDEN_COMMENT_TOMBSTONE,
  getCommentPresentation,
} from '../social/commentPresentation'
import type { SocialRequestState } from '../social/useSocialInteractions'
import { ActionStateBadge } from './ActionStateBadge'

const VERIFIED_BADGE = '\u2713'

type CommentThreadProps = {
  commentsState: CommentPageState
  replyPagesByCommentId: Record<string, CommentPageState>
  revealedCommentIds: Set<string>
  resolveCommentHiddenState: (commentId: string, fallback: boolean) => boolean
  resolveCommentDeletedState: (commentId: string, fallback: boolean) => boolean
  getHideCommentState: (commentId: string) => SocialRequestState
  getDeleteCommentState: (commentId: string) => SocialRequestState
  onRevealComment: (commentId: string) => void
  onToggleCommentHidden: (comment: UiComment) => void
  onDeleteComment: (comment: UiComment) => void
  onLoadCommentReplies: (commentId: string, cursor?: string) => void
  onLoadMoreComments: (cursor: string) => void
  onOpenAuthorProfile: (agentName: string) => void
}

export function CommentThread({
  commentsState,
  replyPagesByCommentId,
  revealedCommentIds,
  resolveCommentHiddenState,
  resolveCommentDeletedState,
  getHideCommentState,
  getDeleteCommentState,
  onRevealComment,
  onToggleCommentHidden,
  onDeleteComment,
  onLoadCommentReplies,
  onLoadMoreComments,
  onOpenAuthorProfile,
}: CommentThreadProps) {
  const renderCommentRow = (comment: UiComment) => {
    const hidden = resolveCommentHiddenState(comment.id, comment.isHiddenByPostOwner)
    const deleted = resolveCommentDeletedState(comment.id, comment.isDeleted)
    const presentation = getCommentPresentation({
      body: comment.body,
      isHidden: hidden,
      isDeleted: deleted,
      isRevealed: revealedCommentIds.has(comment.id),
    })

    const hideState = getHideCommentState(comment.id)
    const deleteState = getDeleteCommentState(comment.id)
    const commentAuthorName = comment.author.name || 'unknown-agent'
    const repliesState = replyPagesByCommentId[comment.id] ?? {
      status: 'idle',
      page: {
        items: [],
        nextCursor: null,
        hasMore: false,
      },
      error: null,
      requestId: null,
    }

    return (
      <li key={comment.id} className="thread-comment-item">
        <div className="thread-comment-header">
          <button
            type="button"
            className="thread-comment-author"
            onClick={() => onOpenAuthorProfile(commentAuthorName)}
            aria-label={`Open profile for ${commentAuthorName}`}
          >
            {comment.author.avatarUrl ? (
              <img
                src={comment.author.avatarUrl}
                alt={`${commentAuthorName} avatar`}
                className="thread-comment-avatar"
                loading="lazy"
              />
            ) : (
              <span className="thread-comment-avatar thread-comment-avatar-fallback" aria-hidden="true">
                {commentAuthorName[0]?.toUpperCase() ?? '?'}
              </span>
            )}
            <strong>{commentAuthorName}</strong>
            {comment.author.claimed ? (
              <span className="feed-post-verified" title="Verified agent" aria-label="Verified agent">
                {VERIFIED_BADGE}
              </span>
            ) : null}
          </button>
          <span>depth {comment.depth}</span>
          <span>{formatTimestamp(comment.createdAt)}</span>
        </div>

        {presentation.collapsed ? (
          <p className="thread-comment-body thread-comment-tombstone">
            {HIDDEN_COMMENT_TOMBSTONE}
            <button type="button" className="inline-button" onClick={() => onRevealComment(comment.id)}>
              View
            </button>
          </p>
        ) : (
          <p className="thread-comment-body">{presentation.bodyText}</p>
        )}

        <p className="thread-comment-meta">
          hidden: {hidden ? 'yes' : 'no'}
          {comment.hiddenByAgentId ? `, hidden_by: ${truncate(comment.hiddenByAgentId, 16)}` : ''}
          {comment.hiddenAt ? `, hidden_at: ${formatTimestamp(comment.hiddenAt)}` : ''}
        </p>

        <div className="thread-comment-actions">
          <button
            type="button"
            onClick={() => onToggleCommentHidden(comment)}
            disabled={hideState.status === 'pending'}
          >
            {hidden ? 'Unhide' : 'Hide'}
          </button>
          <button
            type="button"
            onClick={() => onDeleteComment(comment)}
            disabled={deleteState.status === 'pending'}
          >
            Delete comment
          </button>
          {comment.repliesCount > 0 ? (
            <button type="button" onClick={() => onLoadCommentReplies(comment.id)}>
              {repliesState.status === 'ready' ? 'Reload replies' : `Load replies (${comment.repliesCount})`}
            </button>
          ) : null}
        </div>
        <ActionStateBadge state={hideState} />
        <ActionStateBadge state={deleteState} />

        {repliesState.error ? (
          <p className="thread-status is-error" role="alert">
            {repliesState.error}
            {repliesState.requestId ? <code>request_id: {repliesState.requestId}</code> : null}
          </p>
        ) : null}

        {repliesState.status === 'loading' ? (
          <p className="thread-status" role="status" aria-live="polite">
            Loading replies...
          </p>
        ) : null}

        {repliesState.status === 'ready' && repliesState.page.items.length === 0 ? (
          <p className="thread-status">No replies yet.</p>
        ) : null}

        {repliesState.status === 'ready' && repliesState.page.items.length > 0 ? (
          <ul className="reply-list">
            {repliesState.page.items.map((reply) => {
              const replyHidden = resolveCommentHiddenState(reply.id, reply.isHiddenByPostOwner)
              const replyDeleted = resolveCommentDeletedState(reply.id, reply.isDeleted)
              const replyAuthorName = reply.author.name || 'unknown-agent'
              const replyPresentation = getCommentPresentation({
                body: reply.body,
                isHidden: replyHidden,
                isDeleted: replyDeleted,
                isRevealed: revealedCommentIds.has(reply.id),
              })
              return (
                <li key={reply.id} className="reply-item">
                  <div className="thread-comment-header">
                    <button
                      type="button"
                      className="thread-comment-author"
                      onClick={() => onOpenAuthorProfile(replyAuthorName)}
                      aria-label={`Open profile for ${replyAuthorName}`}
                    >
                      {reply.author.avatarUrl ? (
                        <img
                          src={reply.author.avatarUrl}
                          alt={`${replyAuthorName} avatar`}
                          className="thread-comment-avatar"
                          loading="lazy"
                        />
                      ) : (
                        <span className="thread-comment-avatar thread-comment-avatar-fallback" aria-hidden="true">
                          {replyAuthorName[0]?.toUpperCase() ?? '?'}
                        </span>
                      )}
                      <strong>{replyAuthorName}</strong>
                      {reply.author.claimed ? (
                        <span className="feed-post-verified" title="Verified agent" aria-label="Verified agent">
                          {VERIFIED_BADGE}
                        </span>
                      ) : null}
                    </button>
                    <span>depth {reply.depth}</span>
                    <span>{formatTimestamp(reply.createdAt)}</span>
                  </div>
                  {replyPresentation.collapsed ? (
                    <p className="thread-comment-body thread-comment-tombstone">
                      {HIDDEN_COMMENT_TOMBSTONE}
                      <button
                        type="button"
                        className="inline-button"
                        onClick={() => onRevealComment(reply.id)}
                      >
                        View
                      </button>
                    </p>
                  ) : (
                    <p className="thread-comment-body">{replyPresentation.bodyText}</p>
                  )}
                </li>
              )
            })}
          </ul>
        ) : null}

        {repliesState.status === 'ready' && repliesState.page.hasMore && repliesState.page.nextCursor ? (
          <button
            type="button"
            onClick={() => onLoadCommentReplies(comment.id, repliesState.page.nextCursor as string)}
          >
            Load more replies
          </button>
        ) : null}
      </li>
    )
  }

  return (
    <div className="comment-thread" aria-live="polite" aria-busy={commentsState.status === 'loading'}>
      <h4>Top-level comments</h4>

      {commentsState.error ? (
        <p className="thread-status is-error" role="alert">
          {commentsState.error}
          {commentsState.requestId ? <code>request_id: {commentsState.requestId}</code> : null}
        </p>
      ) : null}

      {commentsState.status === 'loading' ? (
        <p className="thread-status" role="status" aria-live="polite">
          Loading comments...
        </p>
      ) : null}

      {commentsState.status === 'ready' && commentsState.page.items.length === 0 ? (
        <p className="thread-status">No comments yet.</p>
      ) : null}

      {commentsState.page.items.length > 0 ? (
        <ul className="thread-comment-list">
          {commentsState.page.items.map((comment) => renderCommentRow(comment))}
        </ul>
      ) : null}

      {commentsState.status === 'ready' &&
      commentsState.page.hasMore &&
      commentsState.page.nextCursor ? (
        <button type="button" onClick={() => onLoadMoreComments(commentsState.page.nextCursor as string)}>
          Load more comments
        </button>
      ) : null}
    </div>
  )
}
