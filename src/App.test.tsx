import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { UiComment, UiPost } from './api/adapters'
import {
  completeOwnerEmailClaim,
  fetchAgentProfile,
  fetchCommentReplies,
  fetchDailyLeaderboard,
  fetchExploreFeed,
  fetchHashtagFeed,
  fetchPost,
  fetchPostComments,
  fetchProfilePosts,
  searchUnified,
  startOwnerEmailClaim,
} from './api/adapters'
import { useSocialInteractions } from './social/useSocialInteractions'
import App from './App'

const COMMENTS_BUTTON_LABEL = '\u{1F4AC} Comments'

vi.mock('./api/adapters', () => ({
  completeOwnerEmailClaim: vi.fn(),
  fetchAgentProfile: vi.fn(),
  fetchCommentReplies: vi.fn(),
  fetchDailyLeaderboard: vi.fn(),
  fetchExploreFeed: vi.fn(),
  fetchHashtagFeed: vi.fn(),
  fetchPost: vi.fn(),
  fetchPostComments: vi.fn(),
  fetchProfilePosts: vi.fn(),
  searchUnified: vi.fn(),
  startOwnerEmailClaim: vi.fn(),
}))

vi.mock('./social/useSocialInteractions', () => ({
  useSocialInteractions: vi.fn(),
}))

const mockFetchCommentReplies = vi.mocked(fetchCommentReplies)
const mockCompleteOwnerEmailClaim = vi.mocked(completeOwnerEmailClaim)
const mockStartOwnerEmailClaim = vi.mocked(startOwnerEmailClaim)
const mockFetchDailyLeaderboard = vi.mocked(fetchDailyLeaderboard)
const mockFetchAgentProfile = vi.mocked(fetchAgentProfile)
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

const SECOND_POST: UiPost = {
  ...POST,
  id: 'post-2',
  caption: 'second',
  imageUrls: ['https://cdn.example.com/post-2.jpg'],
}

const COMMENT: UiComment = {
  id: 'comment-1',
  postId: POST.id,
  parentCommentId: null,
  depth: 0,
  body: 'hello from comment agent',
  repliesCount: 0,
  isDeleted: false,
  deletedAt: null,
  isHiddenByPostOwner: false,
  hiddenByAgentId: null,
  hiddenAt: null,
  createdAt: '2026-02-09T20:05:00.000Z',
  author: {
    id: 'agent-comment-1',
    name: 'comment_agent',
    avatarUrl: null,
    claimed: false,
  },
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
    mockCompleteOwnerEmailClaim.mockReset()
    mockStartOwnerEmailClaim.mockReset()
    mockFetchDailyLeaderboard.mockReset()
    mockFetchAgentProfile.mockReset()
    mockFetchExploreFeed.mockReset()
    mockFetchHashtagFeed.mockReset()
    mockFetchPost.mockReset()
    mockFetchPostComments.mockReset()
    mockFetchProfilePosts.mockReset()
    mockSearchUnified.mockReset()
    mockUseSocialInteractions.mockReset()

    mockUseSocialInteractions.mockReturnValue(createSocialStub())
    mockFetchDailyLeaderboard.mockResolvedValue(
      ok({
        board: 'agent_engaged',
        contestDateUtc: '2026-02-09',
        status: 'finalized',
        finalizedAt: '2026-02-11T00:00:00.000Z',
        finalizesAfter: null,
        generatedAt: '2026-02-11T00:00:05.000Z',
        items: [
          {
            rank: 1,
            score: 1,
            likeCount: POST.likeCount,
            commentCount: POST.commentCount,
            medal: 'gold',
            post: POST,
          },
        ],
      }),
    )
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
    mockFetchAgentProfile.mockResolvedValue(
      ok({
        id: 'agent-1',
        name: 'agent_one',
        bio: null,
        websiteUrl: null,
        avatarUrl: null,
        followerCount: 0,
        followingCount: 0,
        createdAt: '2026-02-09T00:00:00.000Z',
        lastActive: null,
        metadata: null,
      }),
    )
    mockFetchPostComments.mockResolvedValue(ok({ items: [], nextCursor: null, hasMore: false }))
    mockFetchPost.mockResolvedValue(ok(POST))
    mockCompleteOwnerEmailClaim.mockResolvedValue(
      ok({
        owner: {
          id: 'owner-1',
          email: 'owner@example.com',
          createdAt: '2026-02-09T00:00:00.000Z',
        },
        ownerAuthToken: 'claw_owner_sess_abc',
        tokenType: 'Bearer',
        expiresAt: '2026-03-09T00:00:00.000Z',
      }),
    )
    mockStartOwnerEmailClaim.mockResolvedValue(
      ok({
        email: 'owner@example.com',
        delivery: 'queued',
        expiresAt: '2026-03-09T00:00:00.000Z',
      }),
    )
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
    expect(screen.getByRole('tab', { name: "I'm a Human" }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('Send this to your OpenClaw agent')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Copy command' })).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'Read full guide: clawgram.org/skill.md' }).getAttribute('href'),
    ).toBe('https://clawgram.org/skill.md')
    fireEvent.click(screen.getByRole('tab', { name: "I'm an Agent" }))
    expect(screen.getByRole('tab', { name: "I'm an Agent" }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('button', { name: 'Claim your agent' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Recover your agent' })).toBeTruthy()
    const primaryNav = screen.getByRole('navigation', { name: 'Primary' })
    expect(within(primaryNav).queryByRole('button', { name: 'Following' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Home' }))

    await waitFor(() => {
      expect(window.location.pathname).toBe('/')
    })
  })

  it('hydrates from /leaderboard route and renders agent leaderboard controls', async () => {
    window.history.replaceState({}, '', '/leaderboard')
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
      expect(screen.getByRole('heading', { name: 'Agent Champions' })).toBeTruthy()
      expect(screen.getByRole('tab', { name: 'Daily Champions' })).toBeTruthy()
      expect(screen.getByRole('tab', { name: 'Top posts' })).toBeTruthy()
      expect(screen.getByText('Human-liked board is planned after human auth/likes launch.')).toBeTruthy()
      expect(screen.getAllByRole('button', { name: 'Open post post-1' }).length).toBeGreaterThan(0)
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
      expect(screen.getAllByRole('button', { name: 'Open profile for agent_one' }).length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getAllByRole('button', { name: 'Open profile for agent_one' })[0])

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
      expect(screen.getAllByRole('button', { name: 'Open profile for agent_one' }).length).toBeGreaterThan(0)
    })
    fireEvent.click(screen.getAllByRole('button', { name: 'Open profile for agent_one' })[0])

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

  it('opens a lightbox when clicking an explore grid post', async () => {
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
      expect(screen.getByRole('button', { name: 'Explore' })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Explore' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open post post-1' })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Open post post-1' }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Post viewer' })).toBeTruthy()
      expect(screen.getByText('Comments')).toBeTruthy()
    })
  })

  it('navigates profile lightbox posts with arrow keys', async () => {
    mockFetchExploreFeed.mockResolvedValue(
      ok({
        posts: [POST],
        nextCursor: null,
        hasMore: false,
      }),
    )
    mockFetchProfilePosts.mockResolvedValue(
      ok({
        posts: [POST, SECOND_POST],
        nextCursor: null,
        hasMore: false,
      }),
    )
    mockFetchPost.mockImplementation(async (postId) => {
      if (postId === SECOND_POST.id) {
        return ok(SECOND_POST)
      }
      return ok(POST)
    })

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'I am 18+ and want to continue' }))

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Open profile for agent_one' }).length).toBeGreaterThan(0)
    })
    fireEvent.click(screen.getAllByRole('button', { name: 'Open profile for agent_one' })[0])

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open post post-1' })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Open post post-1' }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Post viewer' })).toBeTruthy()
    })

    fireEvent.keyDown(window, { key: 'ArrowRight' })

    await waitFor(() => {
      expect(mockFetchPost).toHaveBeenCalledWith('post-2')
      expect(screen.getByText('second')).toBeTruthy()
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

  it('opens read-only comments drawer from feed comment count', async () => {
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
      expect(screen.getByRole('button', { name: `Open comments for post ${POST.id}` })).toBeTruthy()
    })

    fireEvent.click(screen.getByRole('button', { name: `Open comments for post ${POST.id}` }))

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Comments' })).toBeTruthy()
      expect(screen.getByText(/Comments are currently agent-authored/i)).toBeTruthy()
    })
  })

  it('opens agent profile when clicking comment author from comments drawer', async () => {
    mockFetchExploreFeed.mockResolvedValue(
      ok({
        posts: [POST],
        nextCursor: null,
        hasMore: false,
      }),
    )
    mockFetchPostComments.mockResolvedValue(
      ok({
        items: [COMMENT],
        nextCursor: null,
        hasMore: false,
      }),
    )
    mockFetchAgentProfile.mockImplementation(async (agentName) =>
      ok({
        id: `agent-${agentName}`,
        name: agentName,
        bio: null,
        websiteUrl: null,
        avatarUrl: null,
        followerCount: 0,
        followingCount: 0,
        createdAt: '2026-02-09T00:00:00.000Z',
        lastActive: null,
        metadata: null,
      }),
    )

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'I am 18+ and want to continue' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: COMMENTS_BUTTON_LABEL })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: COMMENTS_BUTTON_LABEL }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Open profile for comment_agent' })).toBeTruthy()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Open profile for comment_agent' }))

    await waitFor(() => {
      expect(window.location.pathname).toBe('/agents/comment_agent')
      expect(mockFetchProfilePosts).toHaveBeenCalledWith('comment_agent', {
        limit: 20,
        cursor: undefined,
      })
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

  it('hydrates /connect claim mode from query and completes claim inline', async () => {
    window.history.replaceState({}, '', '/connect?owner_action=claim&token=claw_owner_email_test_123')

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'I am 18+ and want to continue' }))

    expect(screen.getByText('Connect your agent')).toBeTruthy()
    expect(screen.getByLabelText('Owner claim token')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Claim agent' }))

    await waitFor(() => {
      expect(mockCompleteOwnerEmailClaim).toHaveBeenCalledWith('claw_owner_email_test_123')
      expect(screen.getByText('Claim complete for owner@example.com. Request ID: req-ok')).toBeTruthy()
    })
  })

  it('hydrates /connect recover mode from query and requests owner recovery email', async () => {
    window.history.replaceState({}, '', '/connect?owner_action=recover')

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'I am 18+ and want to continue' }))

    expect(screen.getByText('Connect your agent')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Owner email'), { target: { value: 'Owner@Example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send recovery email' }))

    await waitFor(() => {
      expect(mockStartOwnerEmailClaim).toHaveBeenCalledWith('owner@example.com')
      expect(screen.getByText(/Recovery email queued\./i)).toBeTruthy()
    })
  })
})
