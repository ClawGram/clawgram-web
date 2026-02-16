import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  ApiResult,
} from '../api/client'
import {
  fetchExploreFeed,
  fetchFollowingFeed,
  fetchHashtagFeed,
  fetchProfilePosts,
  searchUnified,
} from '../api/adapters'
import type {
  UiFeedPage,
  UiPost,
  UiUnifiedSearchPage,
} from '../api/adapters'
import { useSurfaceData } from './useSurfaceData'

vi.mock('../api/adapters', () => ({
  fetchExploreFeed: vi.fn(),
  fetchFollowingFeed: vi.fn(),
  fetchHashtagFeed: vi.fn(),
  fetchProfilePosts: vi.fn(),
  searchUnified: vi.fn(),
}))

const mockFetchExploreFeed = vi.mocked(fetchExploreFeed)
const mockFetchFollowingFeed = vi.mocked(fetchFollowingFeed)
const mockFetchHashtagFeed = vi.mocked(fetchHashtagFeed)
const mockFetchProfilePosts = vi.mocked(fetchProfilePosts)
const mockSearchUnified = vi.mocked(searchUnified)

const BASE_POST: UiPost = {
  id: 'post-base',
  caption: 'base',
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
  likeCount: 0,
  commentCount: 0,
  createdAt: '2026-02-09T20:00:00.000Z',
  viewerHasLiked: false,
  viewerFollowsAuthor: false,
}

function ok<TData>(data: TData, requestId: string): ApiResult<TData> {
  return {
    ok: true,
    status: 200,
    requestId,
    data,
  }
}

function deferred<TValue>() {
  let resolve: (value: TValue) => void = () => {}
  const promise = new Promise<TValue>((resolvePromise) => {
    resolve = resolvePromise
  })

  return {
    promise,
    resolve,
  }
}

describe('useSurfaceData request ordering', () => {
  beforeEach(() => {
    mockFetchExploreFeed.mockReset()
    mockFetchFollowingFeed.mockReset()
    mockFetchHashtagFeed.mockReset()
    mockFetchProfilePosts.mockReset()
    mockSearchUnified.mockReset()
  })

  it('keeps the newest explore response when earlier request resolves later', async () => {
    const firstExplore = deferred<ApiResult<UiFeedPage>>()
    const secondExplore = deferred<ApiResult<UiFeedPage>>()
    mockFetchExploreFeed
      .mockImplementationOnce(() => firstExplore.promise)
      .mockImplementationOnce(() => secondExplore.promise)

    const onSelectPost = vi.fn()
    const onEnsurePostLoaded = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() =>
      useSurfaceData({
        apiKeyInput: '',
        hashtag: 'clawgram',
        profileName: '',
        searchText: 'cats',
        searchType: 'posts',
        selectedPostId: null,
        isPostDeleted: () => false,
        onSelectPost,
        onEnsurePostLoaded,
      }),
    )

    let firstLoad: Promise<void>
    let secondLoad: Promise<void>
    act(() => {
      firstLoad = result.current.loadSurface('explore')
      secondLoad = result.current.loadSurface('explore')
    })

    await act(async () => {
      secondExplore.resolve(
        ok(
          {
            posts: [{ ...BASE_POST, id: 'post-new' }],
            nextCursor: null,
            hasMore: false,
          },
          'req-new',
        ),
      )
      await secondLoad
    })

    await act(async () => {
      firstExplore.resolve(
        ok(
          {
            posts: [{ ...BASE_POST, id: 'post-old' }],
            nextCursor: null,
            hasMore: false,
          },
          'req-old',
        ),
      )
      await firstLoad
    })

    await waitFor(() => {
      expect(result.current.feedStates.explore.requestId).toBe('req-new')
      expect(result.current.feedStates.explore.page.posts.map((post) => post.id)).toEqual(['post-new'])
    })
    expect(onSelectPost).not.toHaveBeenCalledWith('post-old')
    expect(onEnsurePostLoaded).toHaveBeenCalledTimes(1)
    expect(onEnsurePostLoaded).toHaveBeenCalledWith('post-new')
  })

  it('ignores stale search responses when a newer search resolves first', async () => {
    const firstSearch = deferred<ApiResult<UiUnifiedSearchPage>>()
    const secondSearch = deferred<ApiResult<UiUnifiedSearchPage>>()
    mockSearchUnified
      .mockImplementationOnce(() => firstSearch.promise)
      .mockImplementationOnce(() => secondSearch.promise)

    const onSelectPost = vi.fn()
    const onEnsurePostLoaded = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() =>
      useSurfaceData({
        apiKeyInput: '',
        hashtag: 'clawgram',
        profileName: '',
        searchText: 'cats',
        searchType: 'posts',
        selectedPostId: null,
        isPostDeleted: () => false,
        onSelectPost,
        onEnsurePostLoaded,
      }),
    )

    let firstLoad: Promise<void>
    let secondLoad: Promise<void>
    act(() => {
      firstLoad = result.current.loadSurface('search')
      secondLoad = result.current.loadSurface('search')
    })

    await act(async () => {
      secondSearch.resolve(
        ok(
          {
            mode: 'posts',
            query: 'cats',
            posts: {
              posts: [{ ...BASE_POST, id: 'search-new' }],
              nextCursor: null,
              hasMore: false,
            },
            agents: { items: [], nextCursor: null, hasMore: false },
            hashtags: { items: [], nextCursor: null, hasMore: false },
            cursors: { agents: null, hashtags: null, posts: null },
          },
          'req-search-new',
        ),
      )
      await secondLoad
    })

    await act(async () => {
      firstSearch.resolve(
        ok(
          {
            mode: 'posts',
            query: 'cats',
            posts: {
              posts: [{ ...BASE_POST, id: 'search-old' }],
              nextCursor: null,
              hasMore: false,
            },
            agents: { items: [], nextCursor: null, hasMore: false },
            hashtags: { items: [], nextCursor: null, hasMore: false },
            cursors: { agents: null, hashtags: null, posts: null },
          },
          'req-search-old',
        ),
      )
      await firstLoad
    })

    await waitFor(() => {
      expect(result.current.searchState.requestId).toBe('req-search-new')
      expect(result.current.searchState.page.posts.posts.map((post) => post.id)).toEqual(['search-new'])
      expect(result.current.feedStates.search.page.posts.map((post) => post.id)).toEqual(['search-new'])
    })
    expect(onSelectPost).not.toHaveBeenCalledWith('search-old')
    expect(onEnsurePostLoaded).toHaveBeenCalledTimes(1)
    expect(onEnsurePostLoaded).toHaveBeenCalledWith('search-new')
  })

  it('supports overrideHashtag to load a rail-selected tag immediately', async () => {
    mockFetchHashtagFeed.mockResolvedValue(
      ok(
        {
          posts: [{ ...BASE_POST, id: 'tag-post', hashtags: ['dogs'] }],
          nextCursor: null,
          hasMore: false,
        },
        'req-hashtag',
      ),
    )

    const onSelectPost = vi.fn()
    const onEnsurePostLoaded = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() =>
      useSurfaceData({
        apiKeyInput: '',
        hashtag: 'clawgram',
        profileName: '',
        searchText: '',
        searchType: 'posts',
        selectedPostId: null,
        isPostDeleted: () => false,
        onSelectPost,
        onEnsurePostLoaded,
      }),
    )

    await act(async () => {
      await result.current.loadSurface('hashtag', { overrideHashtag: 'dogs' })
    })

    expect(mockFetchHashtagFeed).toHaveBeenCalledWith('dogs', {
      limit: 20,
      cursor: undefined,
    })
    expect(result.current.feedStates.hashtag.requestId).toBe('req-hashtag')
    expect(result.current.feedStates.hashtag.page.posts[0]?.id).toBe('tag-post')
  })

  it('merges background refresh results without resetting selection flow', async () => {
    mockFetchExploreFeed
      .mockResolvedValueOnce(
        ok(
          {
            posts: [{ ...BASE_POST, id: 'post-old' }],
            nextCursor: 'cursor-next',
            hasMore: true,
          },
          'req-initial',
        ),
      )
      .mockResolvedValueOnce(
        ok(
          {
            posts: [{ ...BASE_POST, id: 'post-new' }],
            nextCursor: 'cursor-fresh',
            hasMore: true,
          },
          'req-background',
        ),
      )

    const onSelectPost = vi.fn()
    const onEnsurePostLoaded = vi.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() =>
      useSurfaceData({
        apiKeyInput: '',
        hashtag: 'clawgram',
        profileName: '',
        searchText: '',
        searchType: 'posts',
        selectedPostId: null,
        isPostDeleted: () => false,
        onSelectPost,
        onEnsurePostLoaded,
      }),
    )

    await act(async () => {
      await result.current.loadSurface('explore')
    })

    await act(async () => {
      await result.current.loadSurface('explore', { background: true })
    })

    expect(result.current.feedStates.explore.status).toBe('ready')
    expect(result.current.feedStates.explore.page.posts.map((post) => post.id)).toEqual([
      'post-new',
      'post-old',
    ])
    expect(result.current.feedStates.explore.page.nextCursor).toBe('cursor-fresh')
    expect(onSelectPost).toHaveBeenCalledTimes(1)
    expect(onEnsurePostLoaded).toHaveBeenCalledTimes(1)
  })
})
