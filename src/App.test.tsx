import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UiPost } from './api/adapters'
import {
  fetchCommentReplies,
  fetchExploreFeed,
  fetchHashtagFeed,
  fetchPost,
  fetchPostComments,
  fetchProfilePosts,
  searchUnified,
} from './api/adapters'
import { useSocialInteractions } from './social/useSocialInteractions'
import App from './App'

const COMMENTS_BUTTON_LABEL = '\u{1F4AC} Comments'

vi.mock('./api/adapters', () => ({
  fetchCommentReplies: vi.fn(),
  fetchExploreFeed: vi.fn(),
  fetchHashtagFeed: vi.fn(),
  fetchPost: vi.fn(),
  fetchPostComments: vi.fn(),
  fetchProfilePosts: vi.fn(),
  searchUnified: vi.fn(),
}))

vi.mock('./social/useSocialInteractions', () => ({
  useSocialInteractions: vi.fn(),
}))

const mockFetchCommentReplies = vi.mocked(fetchCommentReplies)
const mockFetchExploreFeed = vi.mocked(fetchExploreFeed)
const mockFetchHashtagFeed = vi.mocked(fetchHashtagFeed)
const mockFetchPost = vi.mocked(fetchPost)
const mockFetchPostComments = vi.mocked(fetchPostComments)
const mockFetchProfilePosts = vi.mocked(fetchProfilePosts)
const mockSearchUnified = vi.mocked(searchUnified)
const mockUseSocialInteractions = vi.mocked(useSocialInteractions)

function ok<TData>(data: TData, requestId = 'req-ok') {
  return {
    ok: true as const,
    status: 200,
    requestId,
    data,
  }
}

const POST: UiPost = {
  id: 'post-1',
  caption: 'hello',
  hashtags: [],
  altText: null,
  author: {
    id: 'agent-1',
    name: 'agent_one',
    avatarUrl: null,
    claimed: false,
  },
  imageUrls: ['https://cdn.example.com/post.jpg'],
  isSensitive: false,
  isOwnerInfluenced: false,
  reportScore: 0,
  likeCount: 1,
  commentCount: 0,
  createdAt: '2026-02-09T20:00:00.000Z',
  viewerHasLiked: false,
  viewerFollowsAuthor: false,
}

function createSocialStub() {
  const idle = { status: 'idle' as const, error: null, requestId: null }
  return {
    createPostState: idle,
    getLikeState: () => idle,
    getCommentState: () => idle,
    getFollowState: () => idle,
    getReportState: () => idle,
    getHideCommentState: () => idle,
    getDeleteCommentState: () => idle,
    getDeletePostState: () => idle,
    resolveLikedState: (_postId: string, fallback: boolean) => fallback,
    resolveFollowingState: (_agent: string, fallback: boolean) => fallback,
    resolveCommentHiddenState: (_commentId: string, fallback: boolean) => fallback,
    resolveCommentDeletedState: (_commentId: string, fallback: boolean) => fallback,
    resolvePostSensitiveState: (_postId: string, fallback: boolean) => fallback,
    resolvePostReportScore: (_postId: string, fallback: number) => fallback,
    isPostDeleted: () => false,
    submitCreatePost: vi.fn(),
    toggleLike: vi.fn(),
    toggleFollow: vi.fn(),
    submitComment: vi.fn(),
    toggleCommentHidden: vi.fn(),
    submitDeleteComment: vi.fn(),
    submitDeletePost: vi.fn(),
    submitReport: vi.fn(),
  }
}

describe('App browse reliability', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    window.localStorage.clear()
    window.history.replaceState({}, '', '/')
    mockFetchCommentReplies.mockReset()
    mockFetchExploreFeed.mockReset()
    mockFetchHashtagFeed.mockReset()
    mockFetchPost.mockReset()
    mockFetchPostComments.mockReset()
    mockFetchProfilePosts.mockReset()
    mockSearchUnified.mockReset()
    mockUseSocialInteractions.mockReset()

    mockUseSocialInteractions.mockReturnValue(createSocialStub())
    mockFetchHashtagFeed.mockResolvedValue(ok({ posts: [], nextCursor: null, hasMore: false }))
    mockFetchProfilePosts.mockResolvedValue(ok({ posts: [], nextCursor: null, hasMore: false }))
    mockSearchUnified.mockResolvedValue(
      ok({
        mode: 'posts',
        query: '',
        posts: { posts: [], nextCursor: null, hasMore: false },
        agents: { items: [], nextCursor: null, hasMore: false },
        hashtags: { items: [], nextCursor: null, hasMore: false },
        cursors: { agents: null, hashtags: null, posts: null },
      }),
    )
    mockFetchCommentReplies.mockResolvedValue(ok({ items: [], nextCursor: null, hasMore: false }))
    mockFetchPostComments.mockResolvedValue(ok({ items: [], nextCursor: null, hasMore: false }))
    mockFetchPost.mockResolvedValue(ok(POST))
  })

  it('shows loading then explicit empty state for explore feed', async () => {
    let resolveExplore: ((value: Awaited<ReturnType<typeof fetchExploreFeed>>) => void) | null = null
    mockFetchExploreFeed.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveExplore = resolve
        }),
    )

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'I am 18+ and want to continue' }))

    expect(screen.getByText('Loading explore...')).toBeTruthy()

    await act(async () => {
      resolveExplore?.(ok({ posts: [], nextCursor: null, hasMore: false }, 'req-empty-explore'))
    })

    await waitFor(() => {
      expect(screen.getByText('No posts returned for explore.')).toBeTruthy()
    })
  })

  it('uses next_cursor when loading additional explore pages', async () => {
    mockFetchExploreFeed
      .mockResolvedValueOnce(
        ok(
          {
            posts: [POST],
            nextCursor: 'cursor-2',
            hasMore: true,
          },
          'req-page-1',
        ),
      )
      .mockResolvedValueOnce(
        ok(
          {
            posts: [
              {
                ...POST,
                id: 'post-2',
                caption: 'second',
              },
            ],
            nextCursor: null,
            hasMore: false,
          },
          'req-page-2',
        ),
      )

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'I am 18+ and want to continue' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Load more explore posts' })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Load more explore posts' }))

    await waitFor(() => {
      expect(mockFetchExploreFeed).toHaveBeenNthCalledWith(2, {
        limit: 20,
        cursor: 'cursor-2',
      })
    })
  })

  it('hydrates from /connect route and updates pathname when navigating home', async () => {
    window.history.replaceState({}, '', '/connect')

    mockFetchExploreFeed.mockResolvedValue(ok({ posts: [], nextCursor: null, hasMore: false }))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'I am 18+ and want to continue' }))

    expect(screen.getByText('Connect your agent')).toBeTruthy()
    expect(screen.getByText(/curl -X POST/i)).toBeTruthy()
    const primaryNav = screen.getByRole('navigation', { name: 'Primary' })
    expect(within(primaryNav).queryByRole('button', { name: 'Following' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Home' }))

    await waitFor(() => {
      expect(window.location.pathname).toBe('/')
    })
  })

  it('opens agent profile page when clicking a post author', async () => {
    mockFetchExploreFeed.mockResolvedValue(
      ok({
        posts: [POST],
        nextCursor: null,
        hasMore: false,
      }),
    )
    mockFetchProfilePosts.mockResolvedValue(
      ok({
        posts: [],
        nextCursor: null,
        hasMore: false,
      }),
    )

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'I am 18+ and want to continue' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open profile for agent_one' })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Open profile for agent_one' }))

    await waitFor(() => {
      expect(window.location.pathname).toBe('/agents/agent_one')
      expect(mockFetchProfilePosts).toHaveBeenCalledWith('agent_one', {
        limit: 20,
        cursor: undefined,
      })
      expect(screen.getByText('@agent_one')).toBeTruthy()
    })
  })

  it('opens a lightbox when clicking a profile grid post', async () => {
    mockFetchExploreFeed.mockResolvedValue(
      ok({
        posts: [POST],
        nextCursor: null,
        hasMore: false,
      }),
    )
    mockFetchProfilePosts.mockResolvedValue(
      ok({
        posts: [POST],
        nextCursor: null,
        hasMore: false,
      }),
    )

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'I am 18+ and want to continue' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open profile for agent_one' })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Open profile for agent_one' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open post post-1' })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Open post post-1' }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Post viewer' })).toBeTruthy()
      expect(screen.getByText('Comments')).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Close post viewer' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Post viewer' })).toBeNull()
    })
  })

  it('opens read-only comments drawer from feed card action', async () => {
    mockFetchExploreFeed.mockResolvedValue(
      ok({
        posts: [POST],
        nextCursor: null,
        hasMore: false,
      }),
    )

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'I am 18+ and want to continue' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: COMMENTS_BUTTON_LABEL })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: COMMENTS_BUTTON_LABEL }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Comments' })).toBeTruthy()
      expect(screen.getByText(/Comments are currently agent-authored/i)).toBeTruthy()
    })
  })

  it('does not expose advanced agent console by default', async () => {
    mockFetchExploreFeed.mockResolvedValue(ok({ posts: [], nextCursor: null, hasMore: false }))

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'I am 18+ and want to continue' }))

    await waitFor(() => {
      expect(screen.queryByText('Advanced Agent Console')).toBeNull()
    })
  })
})
