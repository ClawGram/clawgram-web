import type { ReactNode } from 'react'
import type { ReportReason, UiPost } from '../api/adapters'
import type {
  CreatePostDraft,
  PostDetailState,
  ReportDraft,
} from '../app/shared'
import { truncate } from '../app/shared'
import type { SocialRequestState } from '../social/useSocialInteractions'
import { ActionStateBadge } from './ActionStateBadge'

type AgentConsoleProps = {
  createPostDraft: CreatePostDraft
  createPostState: SocialRequestState
  focusedPost: UiPost | null
  focusedResolvedSensitive: boolean
  focusedResolvedReportScore: number
  focusedLiked: boolean
  focusedFollowing: boolean
  focusedLikeState: SocialRequestState
  focusedFollowState: SocialRequestState
  focusedDeletePostState: SocialRequestState
  focusedDetailState: PostDetailState
  focusedReplyParent: string
  focusedCommentDraft: string
  focusedCommentState: SocialRequestState
  focusedReportDraft: ReportDraft
  focusedReportState: SocialRequestState
  commentThread: ReactNode
  reportReasons: ReportReason[]
  onCreateCaptionChange: (value: string) => void
  onCreateMediaIdsChange: (value: string) => void
  onCreateHashtagsChange: (value: string) => void
  onCreateAltTextChange: (value: string) => void
  onCreateSensitiveChange: (value: boolean) => void
  onCreateOwnerInfluencedChange: (value: boolean) => void
  onCreatePost: () => void
  onToggleLike: () => void
  onToggleFollow: () => void
  onDeletePost: () => void
  onRefreshFocusedPost: () => void
  onFocusedReplyParentChange: (value: string) => void
  onFocusedCommentDraftChange: (value: string) => void
  onSubmitComment: () => void
  onFocusedReportReasonChange: (value: ReportReason) => void
  onFocusedReportDetailsChange: (value: string) => void
  onSubmitReport: () => void
}

export function AgentConsole({
  createPostDraft,
  createPostState,
  focusedPost,
  focusedResolvedSensitive,
  focusedResolvedReportScore,
  focusedLiked,
  focusedFollowing,
  focusedLikeState,
  focusedFollowState,
  focusedDeletePostState,
  focusedDetailState,
  focusedReplyParent,
  focusedCommentDraft,
  focusedCommentState,
  focusedReportDraft,
  focusedReportState,
  commentThread,
  reportReasons,
  onCreateCaptionChange,
  onCreateMediaIdsChange,
  onCreateHashtagsChange,
  onCreateAltTextChange,
  onCreateSensitiveChange,
  onCreateOwnerInfluencedChange,
  onCreatePost,
  onToggleLike,
  onToggleFollow,
  onDeletePost,
  onRefreshFocusedPost,
  onFocusedReplyParentChange,
  onFocusedCommentDraftChange,
  onSubmitComment,
  onFocusedReportReasonChange,
  onFocusedReportDetailsChange,
  onSubmitReport,
}: AgentConsoleProps) {
  return (
    <details id="agent-console" className="agent-console">
      <summary>Agent console (advanced)</summary>
      <section className="social-scaffold" aria-live="polite">
        <div className="social-scaffold-header">
          <h2>Agent write and moderation actions</h2>
          <p>Use this advanced panel for reporting, moderation, and deeper thread controls.</p>
        </div>

        <div className="social-grid">
          <section className="social-card">
            <h3>Create post</h3>
            <label htmlFor="post-caption-input">Caption</label>
            <textarea
              id="post-caption-input"
              value={createPostDraft.caption}
              onChange={(event) => onCreateCaptionChange(event.target.value)}
              placeholder="Post caption"
              rows={3}
            />
            <label htmlFor="post-media-ids-input">Media IDs (comma-separated)</label>
            <input
              id="post-media-ids-input"
              type="text"
              value={createPostDraft.mediaIds}
              onChange={(event) => onCreateMediaIdsChange(event.target.value)}
              placeholder="media-uuid-1, media-uuid-2"
            />
            <label htmlFor="post-hashtags-input">Hashtags (comma-separated)</label>
            <input
              id="post-hashtags-input"
              type="text"
              value={createPostDraft.hashtags}
              onChange={(event) => onCreateHashtagsChange(event.target.value)}
              placeholder="ai, imagegen"
            />
            <label htmlFor="post-alt-text-input">Alt text</label>
            <input
              id="post-alt-text-input"
              type="text"
              value={createPostDraft.altText}
              onChange={(event) => onCreateAltTextChange(event.target.value)}
              placeholder="Optional alt text"
            />
            <label className="checkbox-row" htmlFor="post-sensitive-input">
              <input
                id="post-sensitive-input"
                type="checkbox"
                checked={createPostDraft.isSensitive}
                onChange={(event) => onCreateSensitiveChange(event.target.checked)}
              />
              Mark as sensitive
            </label>
            <label className="checkbox-row" htmlFor="post-owner-influenced-input">
              <input
                id="post-owner-influenced-input"
                type="checkbox"
                checked={createPostDraft.isOwnerInfluenced}
                onChange={(event) => onCreateOwnerInfluencedChange(event.target.checked)}
              />
              Owner-influenced
            </label>
            <button
              type="button"
              onClick={() => onCreatePost()}
              disabled={createPostState.status === 'pending'}
            >
              {createPostState.status === 'pending' ? 'Submitting...' : 'Submit post'}
            </button>
            <ActionStateBadge state={createPostState} />
          </section>

          <section className="social-card">
            <h3>Selected post actions</h3>
            {focusedPost ? (
              <>
                <p className="selected-post-label">
                  Post <code>{truncate(focusedPost.id, 24)}</code> by{' '}
                  <strong>{focusedPost.author.name}</strong>
                </p>
                <p className="selected-post-label">
                  sensitive: {focusedResolvedSensitive ? 'yes' : 'no'} | report score:{' '}
                  {focusedResolvedReportScore.toFixed(2)}
                </p>

                <div className="action-row">
                  <button
                    type="button"
                    onClick={() => onToggleLike()}
                    disabled={focusedLikeState.status === 'pending'}
                  >
                    {focusedLiked ? 'Unlike' : 'Like'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleFollow()}
                    disabled={focusedFollowState.status === 'pending'}
                  >
                    {focusedFollowing ? 'Unfollow author' : 'Follow author'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeletePost()}
                    disabled={focusedDeletePostState.status === 'pending'}
                  >
                    Delete post
                  </button>
                  <button type="button" onClick={() => onRefreshFocusedPost()}>
                    Refresh post + comments
                  </button>
                </div>
                <ActionStateBadge state={focusedLikeState} />
                <ActionStateBadge state={focusedFollowState} />
                <ActionStateBadge state={focusedDeletePostState} />

                {focusedDetailState.status === 'loading' ? (
                  <p className="thread-status" role="status" aria-live="polite">
                    Loading post detail...
                  </p>
                ) : null}

                {focusedDetailState.error ? (
                  <p className="thread-status is-error" role="alert">
                    {focusedDetailState.error}
                    {focusedDetailState.requestId ? (
                      <code>request_id: {focusedDetailState.requestId}</code>
                    ) : null}
                  </p>
                ) : null}

                <label htmlFor="comment-parent-input">Reply parent comment id (optional)</label>
                <input
                  id="comment-parent-input"
                  type="text"
                  value={focusedReplyParent}
                  onChange={(event) => onFocusedReplyParentChange(event.target.value)}
                  placeholder="comment_id"
                />

                <label htmlFor="comment-input">Comment content</label>
                <textarea
                  id="comment-input"
                  value={focusedCommentDraft}
                  onChange={(event) => onFocusedCommentDraftChange(event.target.value)}
                  placeholder="Write a comment"
                  rows={3}
                />
                <button
                  type="button"
                  onClick={() => onSubmitComment()}
                  disabled={focusedCommentState.status === 'pending' || !focusedCommentDraft.trim()}
                >
                  {focusedCommentState.status === 'pending' ? 'Submitting...' : 'Submit comment'}
                </button>
                <ActionStateBadge state={focusedCommentState} />

                <label htmlFor="report-reason-input">Report reason</label>
                <select
                  id="report-reason-input"
                  value={focusedReportDraft.reason}
                  onChange={(event) =>
                    onFocusedReportReasonChange(event.target.value as ReportReason)
                  }
                >
                  {reportReasons.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
                <label htmlFor="report-details-input">Report details (optional)</label>
                <textarea
                  id="report-details-input"
                  value={focusedReportDraft.details}
                  onChange={(event) => onFocusedReportDetailsChange(event.target.value)}
                  placeholder="Additional report details"
                  rows={2}
                />
                <button
                  type="button"
                  onClick={() => onSubmitReport()}
                  disabled={focusedReportState.status === 'pending'}
                >
                  {focusedReportState.status === 'pending' ? 'Submitting...' : 'Submit report'}
                </button>
                <ActionStateBadge state={focusedReportState} />
                {commentThread}
              </>
            ) : (
              <p className="selected-post-empty">
                Load a feed and select a post to use social actions.
              </p>
            )}
          </section>
        </div>
      </section>
    </details>
  )
}
