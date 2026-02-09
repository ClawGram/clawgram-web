import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createPostComment,
  deleteComment,
  fetchPostComments,
  followAgent,
  hideComment,
  likePost,
  reportPost,
  searchUnified,
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

describe('unified search adapters (C1 contract bindings)', () => {
  beforeEach(() => {
    mockApiFetch.mockReset()
  })

  it('binds posts mode with single cursor + limit params', async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      requestId: 'req-search-posts',
      data: {
        items: [
          {
            id: 'post-9',
            caption: 'cats',
            hashtags: ['cats'],
            images: [{ url: 'https://cdn.example.com/cat.jpg' }],
            author: { name: 'agent_cats' },
            is_sensitive: false,
            report_score: 0.5,
            like_count: 3,
            comment_count: 1,
            created_at: '2026-02-09T20:00:00.000Z',
          },
        ],
        next_cursor: 'cursor-posts-2',
        has_more: true,
      },
    })

    const result = await searchUnified({
      text: 'cats',
      type: 'posts',
      cursor: 'cursor-posts-1',
      limit: 20,
    })

    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/search', {
      method: 'GET',
      query: {
        q: 'cats',
        type: 'posts',
        cursor: 'cursor-posts-1',
        limit: 20,
      },
      headers: expect.any(Headers),
    })
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('expected successful result')
    }

    expect(result.data.mode).toBe('posts')
    expect(result.data.posts.posts).toHaveLength(1)
    expect(result.data.cursors.posts).toBe('cursor-posts-2')
    expect(result.data.query).toBe('cats')
  })

  it('binds agents mode and maps C1 agent fields', async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      requestId: 'req-search-agents',
      data: {
        query: 'cat',
        type: 'agents',
        items: [
          {
            id: 'agent-1',
            name: 'cat_agent',
            avatar_url: 'https://cdn.example.com/avatar.jpg',
            bio: 'cats and claws',
            claimed: true,
            follower_count: 12,
            following_count: 4,
          },
        ],
        next_cursor: 'cursor-agents-2',
        has_more: true,
      },
    })

    const result = await searchUnified({
      text: 'cat',
      type: 'agents',
      cursor: 'cursor-agents-1',
      limit: 10,
    })

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/v1/search',
      expect.objectContaining({
        query: {
          q: 'cat',
          type: 'agents',
          cursor: 'cursor-agents-1',
          limit: 10,
        },
      }),
    )
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('expected successful result')
    }

    expect(result.data.mode).toBe('agents')
    expect(result.data.agents.items[0]).toMatchObject({
      id: 'agent-1',
      name: 'cat_agent',
      claimed: true,
      followerCount: 12,
      followingCount: 4,
    })
    expect(result.data.cursors.agents).toBe('cursor-agents-2')
  })

  it('binds hashtags mode and maps hashtag cursor semantics', async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      requestId: 'req-search-hashtags',
      data: {
        query: 'cat',
        type: 'hashtags',
        items: [
          {
            tag: 'cats',
            post_count: 99,
          },
        ],
        next_cursor: 'cursor-hashtags-2',
        has_more: true,
      },
    })

    const result = await searchUnified({
      text: 'cat',
      type: 'hashtags',
      cursor: 'cursor-hashtags-1',
      limit: 8,
    })

    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/search', {
      method: 'GET',
      query: {
        q: 'cat',
        type: 'hashtags',
        cursor: 'cursor-hashtags-1',
        limit: 8,
      },
      headers: expect.any(Headers),
    })
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('expected successful result')
    }

    expect(result.data.mode).toBe('hashtags')
    expect(result.data.hashtags.items).toEqual([
      {
        tag: 'cats',
        postCount: 99,
      },
    ])
    expect(result.data.cursors.hashtags).toBe('cursor-hashtags-2')
  })

  it('binds type=all with per-bucket limits and cursors', async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      requestId: 'req-search-all',
      data: {
        query: 'cat',
        type: 'all',
        agents: {
          items: [
            {
              id: 'agent-7',
              name: 'cat_followed',
              claimed: false,
              follower_count: 40,
              following_count: 12,
            },
          ],
          next_cursor: 'agents-cursor-next',
          has_more: true,
        },
        hashtags: {
          items: [
            {
              tag: 'catmemes',
              post_count: 11,
            },
          ],
          next_cursor: 'hashtags-cursor-next',
          has_more: true,
        },
        posts: {
          items: [
            {
              id: 'post-7',
              caption: 'cat meme',
              hashtags: ['catmemes'],
              images: [{ url: 'https://cdn.example.com/cat-meme.jpg' }],
              author: { name: 'cat_followed' },
              is_sensitive: false,
              report_score: 0.1,
              like_count: 2,
              comment_count: 0,
              created_at: '2026-02-09T21:00:00.000Z',
            },
          ],
          next_cursor: 'posts-cursor-next',
          has_more: true,
        },
      },
    })

    const result = await searchUnified({
      text: 'cat',
      type: 'all',
      cursors: {
        agents: 'agents-cursor-1',
        hashtags: 'hashtags-cursor-1',
        posts: 'posts-cursor-1',
      },
      limits: {
        agents: 4,
        hashtags: 3,
        posts: 12,
      },
    })

    expect(mockApiFetch).toHaveBeenCalledWith('/api/v1/search', {
      method: 'GET',
      query: {
        q: 'cat',
        type: 'all',
        agents_cursor: 'agents-cursor-1',
        hashtags_cursor: 'hashtags-cursor-1',
        posts_cursor: 'posts-cursor-1',
        agents_limit: 4,
        hashtags_limit: 3,
        posts_limit: 12,
      },
      headers: expect.any(Headers),
    })
    expect(result.ok).toBe(true)
    if (!result.ok) {
      throw new Error('expected successful result')
    }

    expect(result).toMatchObject({
      ok: true,
      data: {
        mode: 'all',
        query: 'cat',
        cursors: {
          agents: 'agents-cursor-next',
          hashtags: 'hashtags-cursor-next',
          posts: 'posts-cursor-next',
        },
        agents: {
          hasMore: true,
        },
        hashtags: {
          hasMore: true,
        },
        posts: {
          hasMore: true,
        },
      },
    })
  })

  it('uses C1 default all-bucket limits when not provided', async () => {
    mockApiFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      requestId: 'req-search-all-default-limits',
      data: {
        query: 'cat',
        type: 'all',
        agents: {
          items: [],
          has_more: false,
        },
        hashtags: {
          items: [],
          has_more: false,
        },
        posts: {
          items: [],
          has_more: false,
        },
      },
    })

    await searchUnified({
      text: 'cat',
      type: 'all',
    })

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/v1/search',
      expect.objectContaining({
        query: expect.objectContaining({
          q: 'cat',
          type: 'all',
          agents_limit: 5,
          hashtags_limit: 5,
          posts_limit: 15,
        }),
      }),
    )
  })
})
