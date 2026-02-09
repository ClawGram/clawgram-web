import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  UiCommentHideResponse,
  UiDeleteResponse,
  UiFollowResponse,
  UiLikeResponse,
  UiReportSummary,
} from '../api/adapters'
import {
  createPostComment,
  deleteComment,
  deletePost,
  hideComment,
  likePost,
  reportPost,
  unfollowAgent,
} from '../api/adapters'
import type { ApiFailure, ApiResult } from '../api/client'
import { getFailureMessage, useSocialInteractions } from './useSocialInteractions'

vi.mock('../api/adapters', () => ({
  createPost: vi.fn(),
  createPostComment: vi.fn(),
  deleteComment: vi.fn(),
  deletePost: vi.fn(),
  hideComment: vi.fn(),
  likePost: vi.fn(),
  reportPost: vi.fn(),
  unfollowAgent: vi.fn(),
}))

const mockCreatePostComment = vi.mocked(createPostComment)
const mockDeleteComment = vi.mocked(deleteComment)
const mockDeletePost = vi.mocked(deletePost)
const mockHideComment = vi.mocked(hideComment)
const mockLikePost = vi.mocked(likePost)
const mockReportPost = vi.mocked(reportPost)
const mockUnfollowAgent = vi.mocked(unfollowAgent)

function ok<TData>(data: TData): ApiResult<TData> {
  return {
    ok: true,
    status: 200,
    requestId: 'req-success',
    data,
  }
}

function failure(code: string, error = 'Request failed.'): ApiFailure {
  return {
    ok: false,
    status: 400,
    code,
    hint: null,
    requestId: 'req-failure',
    error,
  }
}

describe('useSocialInteractions', () => {
  beforeEach(() => {
    mockCreatePostComment.mockReset()
    mockDeleteComment.mockReset()
    mockDeletePost.mockReset()
    mockHideComment.mockReset()
    mockLikePost.mockReset()
    mockReportPost.mockReset()
    mockUnfollowAgent.mockReset()
  })

  it.each([
    ['avatar_required', 'Set an avatar before this write action.'],
    ['comment_empty', 'Comment cannot be empty.'],
    ['comment_too_long', 'Comment is too long (max 140 characters).'],
    ['validation_error', 'Submitted data did not pass validation.'],
    ['forbidden', 'You are not allowed to perform this action.'],
    ['not_found', 'Resource was not found.'],
    ['cannot_report_own_post', 'You cannot report your own post.'],
  ])('maps error code %s to UX message', (code, message) => {
    expect(getFailureMessage(failure(code))).toBe(message)
  })

  it('applies mapped error message to action request state', async () => {
    mockCreatePostComment.mockResolvedValueOnce(failure('comment_too_long'))
    const { result } = renderHook(() => useSocialInteractions())

    await act(async () => {
      await result.current.submitComment('post-1', 'x'.repeat(150), 'api_key')
    })

    expect(result.current.getCommentState('post-1')).toMatchObject({
      status: 'error',
      error: 'Comment is too long (max 140 characters).',
      requestId: 'req-failure',
    })
  })

  it('uses server idempotent booleans instead of local inversion', async () => {
    mockLikePost.mockResolvedValueOnce(ok<UiLikeResponse>({ liked: false }))
    mockUnfollowAgent.mockResolvedValueOnce(ok<UiFollowResponse>({ following: true }))
    mockHideComment.mockResolvedValueOnce(ok<UiCommentHideResponse>({ hidden: false }))
    mockDeleteComment.mockResolvedValueOnce(ok<UiDeleteResponse>({ deleted: false }))
    mockDeletePost.mockResolvedValueOnce(ok<UiDeleteResponse>({ deleted: true }))

    const { result } = renderHook(() => useSocialInteractions())

    await act(async () => {
      await result.current.toggleLike('post-1', false, 'api_key')
      await result.current.toggleFollow('AgentOne', true, 'api_key')
      await result.current.toggleCommentHidden('comment-1', false, 'api_key')
      await result.current.submitDeleteComment('comment-1', 'api_key')
      await result.current.submitDeletePost('post-1', 'api_key')
    })

    expect(result.current.resolveLikedState('post-1', true)).toBe(false)
    expect(result.current.resolveFollowingState('agentone', false)).toBe(true)
    expect(result.current.resolveCommentHiddenState('comment-1', true)).toBe(false)
    expect(result.current.resolveCommentDeletedState('comment-1', true)).toBe(false)
    expect(result.current.isPostDeleted('post-1')).toBe(true)
  })

  it('updates sensitive and report score overrides from report response payload', async () => {
    mockReportPost.mockResolvedValueOnce(
      ok<UiReportSummary>({
        id: 'report-1',
        postId: 'post-2',
        reporterAgentId: 'agent-9',
        reason: 'spam',
        details: null,
        weight: 1,
        createdAt: '2026-02-09T19:00:00.000Z',
        postIsSensitive: true,
        postReportScore: 5.5,
      }),
    )

    const { result } = renderHook(() => useSocialInteractions())

    await act(async () => {
      await result.current.submitReport(
        'post-2',
        {
          reason: 'spam',
        },
        'api_key',
      )
    })

    expect(result.current.resolvePostSensitiveState('post-2', false)).toBe(true)
    expect(result.current.resolvePostReportScore('post-2', 0)).toBe(5.5)
  })
})
