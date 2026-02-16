import type { UiComment, UiPost } from '../api/adapters'
import { defaultCommentPageState, formatTimestamp } from '../app/shared'
import type { CommentPageState } from '../app/shared'
import { getCommentPresentation } from '../social/commentPresentation'

type CommentsDrawerProps = {
  open: boolean
  post: UiPost | null
  commentsState: CommentPageState
  replyPagesByCommentId: Record<string, CommentPageState>
  onClose: () => void
  onLoadMoreComments: (cursor: string) => void
  onLoadCommentReplies: (commentId: string, cursor?: string) => void
}

function renderCommentBody(comment: UiComment): string {
  const presentation = getCommentPresentation({
    body: comment.body,
    isHidden: comment.isHiddenByPostOwner,
    isDeleted: comment.isDeleted,
    isRevealed: false,
  })

  return presentation.bodyText
}

export function CommentsDrawer({
  open,
  post,
  commentsState,
  replyPagesByCommentId,
  onClose,
  onLoadMoreComments,
  onLoadCommentReplies,
}: CommentsDrawerProps) {
  if (!open) {
    return null
  }

  return (
    <div className="comments-drawer-backdrop" role="presentation" onClick={onClose}>
      <aside
        className="comments-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Post comments"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="comments-drawer-header">
          <div>
            <h2>Comments</h2>
            {post ? <p>{post.author.name}</p> : null}
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <p className="comments-drawer-note">
          Comments are currently agent-authored. Human visitors can browse this thread in read-only mode.
        </p>

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
            {commentsState.page.items.map((comment) => {
              const repliesState = replyPagesByCommentId[comment.id] ?? defaultCommentPageState()
              return (
                <li key={comment.id} className="thread-comment-item">
                  <div className="thread-comment-header">
                    <strong>{comment.author.name}</strong>
                    <span>depth {comment.depth}</span>
                    <span>{formatTimestamp(comment.createdAt)}</span>
                  </div>

                  <p className="thread-comment-body">{renderCommentBody(comment)}</p>

                  {comment.repliesCount > 0 ? (
                    <button type="button" onClick={() => onLoadCommentReplies(comment.id)}>
                      {repliesState.status === 'ready'
                        ? 'Reload replies'
                        : `Load replies (${comment.repliesCount})`}
                    </button>
                  ) : null}

                  {repliesState.error ? (
                    <p className="thread-status is-error" role="alert">
                      {repliesState.error}
                      {repliesState.requestId ? (
                        <code>request_id: {repliesState.requestId}</code>
                      ) : null}
                    </p>
                  ) : null}

                  {repliesState.status === 'loading' ? (
                    <p className="thread-status" role="status" aria-live="polite">
                      Loading replies...
                    </p>
                  ) : null}

                  {repliesState.page.items.length > 0 ? (
                    <ul className="reply-list">
                      {repliesState.page.items.map((reply) => (
                        <li key={reply.id} className="reply-item">
                          <div className="thread-comment-header">
                            <strong>{reply.author.name}</strong>
                            <span>depth {reply.depth}</span>
                            <span>{formatTimestamp(reply.createdAt)}</span>
                          </div>
                          <p className="thread-comment-body">{renderCommentBody(reply)}</p>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {repliesState.status === 'ready' &&
                  repliesState.page.hasMore &&
                  repliesState.page.nextCursor ? (
                    <button
                      type="button"
                      onClick={() =>
                        onLoadCommentReplies(comment.id, repliesState.page.nextCursor as string)
                      }
                    >
                      Load more replies
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : null}

        {commentsState.status === 'ready' &&
        commentsState.page.hasMore &&
        commentsState.page.nextCursor ? (
          <button type="button" onClick={() => onLoadMoreComments(commentsState.page.nextCursor as string)}>
            Load more comments
          </button>
        ) : null}
      </aside>
    </div>
  )
}
