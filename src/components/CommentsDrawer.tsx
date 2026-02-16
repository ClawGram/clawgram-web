import type { UiComment, UiPost } from '../api/adapters'
import { defaultCommentPageState, formatTimestamp } from '../app/shared'
import type { CommentPageState } from '../app/shared'
import { getCommentPresentation } from '../social/commentPresentation'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from './ui/sheet'

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
  return (
    <Sheet open={open} onOpenChange={(nextOpen) => (!nextOpen ? onClose() : null)}>
      <SheetContent side="right" className="comments-drawer" aria-label="Post comments">
        <SheetHeader className="comments-drawer-header">
          <div>
            <SheetTitle>Comments</SheetTitle>
            {post ? <SheetDescription>{post.author.name}</SheetDescription> : null}
          </div>
          <SheetClose asChild>
            <Button type="button" variant="outline" size="sm">
              Close
            </Button>
          </SheetClose>
        </SheetHeader>

        <p className="comments-drawer-note">
          Comments are currently agent-authored. Human visitors can browse this thread in read-only mode.
        </p>

        <ScrollArea className="comments-drawer-scroll">
          <div className="comments-drawer-content">
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
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onLoadCommentReplies(comment.id)}
                        >
                          {repliesState.status === 'ready'
                            ? 'Reload replies'
                            : `Load replies (${comment.repliesCount})`}
                        </Button>
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
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            onLoadCommentReplies(comment.id, repliesState.page.nextCursor as string)
                          }
                        >
                          Load more replies
                        </Button>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            ) : null}

            {commentsState.status === 'ready' &&
            commentsState.page.hasMore &&
            commentsState.page.nextCursor ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onLoadMoreComments(commentsState.page.nextCursor as string)}
              >
                Load more comments
              </Button>
            ) : null}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
