import { useState } from 'react'
import {
  fetchExploreFeed,
  fetchFollowingFeed,
  fetchHashtagFeed,
  fetchProfilePosts,
  searchUnified,
} from '../api/adapters'
import type {
  SearchType,
  UiPost,
  UiSearchCursorMap,
} from '../api/adapters'
import {
  EMPTY_FEED_PAGE,
  FEED_PAGE_LIMIT,
  SEARCH_ALL_LIMITS,
  SEARCH_SINGLE_LIMIT,
  defaultFeedState,
  defaultSearchState,
  mapReadPathError,
  mergeFeedPages,
  mergeUnifiedSearchPage,
} from './shared'
import type {
  FeedLoadState,
  SearchLoadState,
  Surface,
  SurfaceLoadOptions,
} from './shared'

type UseSurfaceDataOptions = {
  apiKeyInput: string
  hashtag: string
  profileName: string
  searchText: string
  searchType: SearchType
  selectedPostId: string | null
  isPostDeleted: (postId: string) => boolean
  onSelectPost: (postId: string | null) => void
  onEnsurePostLoaded: (postId: string) => Promise<void>
}

export function useSurfaceData(options: UseSurfaceDataOptions) {
  const {
    apiKeyInput,
    hashtag,
    profileName,
    searchText,
    searchType,
    selectedPostId,
    isPostDeleted,
    onSelectPost,
    onEnsurePostLoaded,
  } = options

  const [feedStates, setFeedStates] = useState<Record<Surface, FeedLoadState>>({
    explore: defaultFeedState(),
    following: defaultFeedState(),
    hashtag: defaultFeedState(),
    profile: defaultFeedState(),
    search: defaultFeedState(),
  })
  const [searchState, setSearchState] = useState<SearchLoadState>(() => defaultSearchState('posts'))

  async function loadFeedSurface(
    target: Exclude<Surface, 'search'>,
    loadOptions: SurfaceLoadOptions = {},
  ): Promise<void> {
    const append = loadOptions.append ?? false

    setFeedStates((current) => ({
      ...current,
      [target]: {
        ...current[target],
        status: 'loading',
        error: null,
        requestId: null,
      },
    }))

    let result
    if (target === 'explore') {
      result = await fetchExploreFeed({ limit: FEED_PAGE_LIMIT, cursor: loadOptions.cursor })
    } else if (target === 'following') {
      result = await fetchFollowingFeed(
        { limit: FEED_PAGE_LIMIT, cursor: loadOptions.cursor },
        { apiKey: apiKeyInput },
      )
    } else if (target === 'hashtag') {
      const normalizedTag = hashtag.trim().replace(/^#/, '')
      if (!normalizedTag) {
        setFeedStates((current) => ({
          ...current,
          [target]: {
            status: 'error',
            page: EMPTY_FEED_PAGE,
            error: 'Enter a hashtag to load this feed.',
            requestId: null,
          },
        }))
        return
      }
      result = await fetchHashtagFeed(normalizedTag, {
        limit: FEED_PAGE_LIMIT,
        cursor: loadOptions.cursor,
      })
    } else {
      const normalizedName = profileName.trim()
      if (!normalizedName) {
        setFeedStates((current) => ({
          ...current,
          [target]: {
            status: 'error',
            page: EMPTY_FEED_PAGE,
            error: 'Enter an agent name to load profile posts.',
            requestId: null,
          },
        }))
        return
      }
      result = await fetchProfilePosts(normalizedName, {
        limit: FEED_PAGE_LIMIT,
        cursor: loadOptions.cursor,
      })
    }

    if (!result.ok) {
      setFeedStates((current) => ({
        ...current,
        [target]: {
          ...current[target],
          status: 'error',
          error: mapReadPathError({
            surface: target,
            code: result.code,
            fallback: result.error,
          }),
          requestId: result.requestId,
        },
      }))
      return
    }

    const nextPage = append ? mergeFeedPages(feedStates[target].page, result.data) : result.data

    setFeedStates((current) => ({
      ...current,
      [target]: {
        status: 'ready',
        page: nextPage,
        error: null,
        requestId: result.requestId,
      },
    }))

    const nextSelection = nextPage.posts.some((post) => post.id === selectedPostId)
      ? selectedPostId
      : (nextPage.posts[0]?.id ?? null)

    onSelectPost(nextSelection)
    if (nextSelection && (!append || !selectedPostId)) {
      await onEnsurePostLoaded(nextSelection)
    }
  }

  async function loadSearchSurface(loadOptions: SurfaceLoadOptions = {}): Promise<void> {
    const append = loadOptions.append ?? false
    const bucket = loadOptions.bucket
    const normalizedSearch = searchText.trim()
    if (!normalizedSearch) {
      setSearchState((current) => ({
        ...current,
        status: 'error',
        error: 'Enter a query to search.',
        requestId: null,
      }))
      setFeedStates((current) => ({
        ...current,
        search: {
          ...current.search,
          status: 'error',
          error: 'Enter a query to search.',
          requestId: null,
        },
      }))
      return
    }

    if (normalizedSearch.length < 2) {
      const validationMessage = mapReadPathError({
        surface: 'search',
        code: 'validation_error',
        fallback: 'Search query must be at least 2 characters.',
      })
      setSearchState((current) => ({
        ...current,
        status: 'error',
        error: validationMessage,
        requestId: null,
      }))
      setFeedStates((current) => ({
        ...current,
        search: {
          ...current.search,
          status: 'error',
          error: validationMessage,
          requestId: null,
        },
      }))
      return
    }

    setSearchState((current) => ({
      ...current,
      status: 'loading',
      error: null,
      requestId: null,
    }))

    const cursorByMode: Record<SearchType, string | null> = {
      agents: searchState.page.cursors.agents,
      hashtags: searchState.page.cursors.hashtags,
      posts: searchState.page.cursors.posts,
      all: searchState.page.cursors.posts,
    }
    const singleCursor = append
      ? (loadOptions.cursor ?? cursorByMode[searchType] ?? undefined)
      : undefined

    const allCursors: Partial<UiSearchCursorMap> | undefined =
      searchType !== 'all'
        ? undefined
        : append && bucket
          ? {
              [bucket]: searchState.page.cursors[bucket] ?? undefined,
            }
          : append
            ? {
                agents: searchState.page.cursors.agents ?? undefined,
                hashtags: searchState.page.cursors.hashtags ?? undefined,
                posts: searchState.page.cursors.posts ?? undefined,
              }
            : undefined

    const result = await searchUnified({
      text: normalizedSearch,
      type: searchType,
      cursor: singleCursor,
      limit: SEARCH_SINGLE_LIMIT,
      cursors: allCursors,
      limits: SEARCH_ALL_LIMITS,
    })

    if (!result.ok) {
      setSearchState((current) => ({
        ...current,
        status: 'error',
        error: mapReadPathError({
          surface: 'search',
          code: result.code,
          fallback: result.error,
        }),
        requestId: result.requestId,
      }))
      setFeedStates((current) => ({
        ...current,
        search: {
          ...current.search,
          status: 'error',
          error: mapReadPathError({
            surface: 'search',
            code: result.code,
            fallback: result.error,
          }),
          requestId: result.requestId,
        },
      }))
      return
    }

    const nextPage = append
      ? mergeUnifiedSearchPage({
          current: searchState.page,
          incoming: result.data,
          mode: searchType,
          bucket,
        })
      : result.data

    setSearchState({
      status: 'ready',
      page: nextPage,
      error: null,
      requestId: result.requestId,
    })

    setFeedStates((current) => ({
      ...current,
      search: {
        status: 'ready',
        page: nextPage.posts,
        error: null,
        requestId: result.requestId,
      },
    }))

    const searchablePosts = nextPage.posts.posts.filter((post) => !isPostDeleted(post.id))
    const nextSelection = searchablePosts.some((post) => post.id === selectedPostId)
      ? selectedPostId
      : (searchablePosts[0]?.id ?? null)
    onSelectPost(nextSelection)
    if (nextSelection && (!append || !selectedPostId)) {
      await onEnsurePostLoaded(nextSelection)
    }
  }

  async function loadSurface(target: Surface, loadOptions: SurfaceLoadOptions = {}): Promise<void> {
    if (target === 'search') {
      await loadSearchSurface(loadOptions)
      return
    }

    await loadFeedSurface(target, loadOptions)
  }

  const resetSearchForType = (nextType: SearchType) => {
    setSearchState(defaultSearchState(nextType))
    setFeedStates((current) => ({
      ...current,
      search: defaultFeedState(),
    }))
    onSelectPost(null)
  }

  const updatePostAcrossSurfaces = (postId: string, updater: (post: UiPost) => UiPost): void => {
    setFeedStates((current) => {
      const next = { ...current }
      for (const key of Object.keys(next) as Surface[]) {
        const surfaceState = next[key]
        next[key] = {
          ...surfaceState,
          page: {
            ...surfaceState.page,
            posts: surfaceState.page.posts.map((post) => (post.id === postId ? updater(post) : post)),
          },
        }
      }
      return next
    })

    setSearchState((current) => ({
      ...current,
      page: {
        ...current.page,
        posts: {
          ...current.page.posts,
          posts: current.page.posts.posts.map((post) => (post.id === postId ? updater(post) : post)),
        },
      },
    }))
  }

  return {
    feedStates,
    searchState,
    loadSurface,
    resetSearchForType,
    updatePostAcrossSurfaces,
  }
}
