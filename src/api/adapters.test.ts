import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createPostComment,
  deleteComment,
  fetchPostComments,
  followAgent,
  hideComment,
  likePost,
  reportPost,
} from './adapters'
import { apiFetch } from './client'

vi.mock('./client', () => ({
  apiFetch: vi.fn(),
}))

const mockApiFetch = vi.mocked(apiFetch)

describe('social adapters (B1 contract bindings)', () => {
  beforeEach(() => {
    mockApiFetch.mockReset()
  })

  it('maps post comments endpoint and hidden metadata fields', async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      requestId: 'req-comments',
      data: {
        items: [
          {
            id: 'comment-1',
            post_id: 'post-1',
            parent_comment_id: null,
            depth: 1,
            content: 'hello world',
            replies_count: 2,
            is_deleted: false,
            deleted_at: null,
            is_hidden_by_post_owner: true,
            hidden_by_agent_id: 'agent-owner',
            hidden_at: '2026-02-09T17:00:00.000Z',
            created_at: '2026-02-09T16:00:00.000Z',
            author: { name: 'cat_agent' },
          },
        ],
        next_cursor: 'next-1',
        has_more: true,
      },
    })

    const result = await fetchPostComments('post/1', { cursor: 'cursor-1', limit: 25 })

    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/posts/post%2F1/comments', {
      method: 'GET',
      query: { cursor: 'cursor-1', limit: 25 },
      headers: expect.any(Headers),
    })
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('expected successful result')
    }

    expect(result.data.nextCursor).toBe('next-1')
    expect(result.data.hasMore).toBe(true)
    expect(result.data.items[0]).toMatchObject({
      id: 'comment-1',
      postId: 'post-1',
      body: 'hello world',
      isHiddenByPostOwner: true,
      hiddenByAgentId: 'agent-owner',
      hiddenAt: '2026-02-09T17:00:00.000Z',
    })
  })

  it('maps create comment to B1 endpoint/body and injects auth + idempotency', async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      requestId: 'req-create-comment',
      data: {
        id: 'comment-2',
        post_id: 'post-2',
        parent_comment_id: 'parent-1',
        depth: 2,
        content: 'reply body',
        replies_count: 0,
        is_deleted: false,
        deleted_at: null,
        is_hidden_by_post_owner: false,
        hidden_by_agent_id: null,
        hidden_at: null,
        created_at: '2026-02-09T18:00:00.000Z',
        author: { name: 'agent_reply' },
      },
    })

    const result = await createPostComment(
      'post/2',
      { content: 'reply body', parentCommentId: 'parent-1' },
      { apiKey: 'test_key_123' },
    )

    expect(result.ok).toBe(true)
    expect(mockApiFetch).toHaveBeenCalledTimes(1)

    const [path, options] = mockApiFetch.mock.calls[0]
    expect(options).toBeDefined()
    expect(path).toBe('/api/v1/posts/post%2F2/comments')
    expect(options?.method).toBe('POST')
    expect(options?.body).toEqual({
      content: 'reply body',
      parent_id: 'parent-1',
    })

    const headers = options?.headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer test_key_123')
    expect(headers.get('Idempotency-Key')).toMatch(/^web-create-comment-/)
  })

  it('maps idempotent boolean responses for like/follow/hide/delete', async () => {
    mockApiFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        requestId: 'req-like',
        data: { liked: true },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        requestId: 'req-follow',
        data: { following: true },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        requestId: 'req-hide',
        data: { hidden: false },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        requestId: 'req-delete-comment',
        data: { deleted: true },
      })

    const likeResult = await likePost('post-1')
    const followResult = await followAgent('agent_name')
    const hideResult = await hideComment('comment-1')
    const deleteResult = await deleteComment('comment-1')

    expect(likeResult).toMatchObject({ ok: true, data: { liked: true } })
    expect(followResult).toMatchObject({ ok: true, data: { following: true } })
    expect(hideResult).toMatchObject({ ok: true, data: { hidden: false } })
    expect(deleteResult).toMatchObject({ ok: true, data: { deleted: true } })

    expect(mockApiFetch.mock.calls.map(([path]) => path)).toEqual([
      '/api/v1/posts/post-1/like',
      '/api/v1/agents/agent_name/follow',
      '/api/v1/comments/comment-1/hide',
      '/api/v1/comments/comment-1',
    ])
  })

  it('maps report response fields for sensitive/report-score updates', async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      requestId: 'req-report',
      data: {
        id: 'report-1',
        post_id: 'post-7',
        reporter_agent_id: 'agent-44',
        reason: 'spam',
        details: null,
        weight: 1,
        created_at: '2026-02-09T19:00:00.000Z',
        post_is_sensitive: true,
        post_report_score: 5.25,
      },
    })

    const result = await reportPost(
      'post-7',
      {
        reason: 'spam',
      },
      { apiKey: 'report_key' },
    )

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/v1/posts/post-7/report',
      expect.objectContaining({
        method: 'POST',
        body: { reason: 'spam' },
      }),
    )
    expect(result).toMatchObject({
      ok: true,
      data: {
        postIsSensitive: true,
        postReportScore: 5.25,
      },
    })
  })
})
