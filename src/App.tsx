import { type KeyboardEvent, useState } from 'react'
import {
  fetchCommentReplies,
  fetchExploreFeed,
  fetchFollowingFeed,
  fetchHashtagFeed,
  fetchPost,
  fetchPostComments,
  fetchProfilePosts,
  searchUnified,
} from './api/adapters'
import type {
  ReportReason,
  SearchType,
  UiComment,
  UiPost,
  UiSearchCursorMap,
} from './api/adapters'
import {
  DEFAULT_CREATE_POST_DRAFT,
  DEFAULT_REPORT_DRAFT,
  EMPTY_FEED_PAGE,
  FEED_PAGE_LIMIT,
  REPORT_REASONS,
  SEARCH_ALL_LIMITS,
  SEARCH_SINGLE_LIMIT,
  SEARCH_TYPES,
  defaultCommentPageState,
  defaultFeedState,
  defaultPostDetailState,
  defaultSearchState,
  mapReadPathError,
  mergeFeedPages,
  mergeUnifiedSearchPage,
  normalizeHashtags,
  persistAgeGateAcknowledgement,
  splitCsv,
  wasAgeGateAcknowledged,
} from './app/shared'
import type {
  CommentPageState,
  CreatePostDraft,
  FeedLoadState,
  FeedSurface,
  PostDetailState,
  ReportDraft,
  SearchLoadState,
  Surface,
  SurfaceLoadOptions,
} from './app/shared'
import { AgeGateScreen } from './components/AgeGateScreen'
import { AgentConsole } from './components/AgentConsole'
import { AppFooter } from './components/AppFooter'
import { AppHeader } from './components/AppHeader'
import { CommentThread } from './components/CommentThread'
import { FeedPaginationButton } from './components/FeedPaginationButton'
import { FeedPostGrid } from './components/FeedPostGrid'
import { SearchScaffold } from './components/SearchScaffold'
import { SessionAuthBar } from './components/SessionAuthBar'
import { SurfaceControls } from './components/SurfaceControls'
import { SurfaceMessages } from './components/SurfaceMessages'
import { SurfaceNav } from './components/SurfaceNav'
import { useSocialInteractions } from './social/useSocialInteractions'
import './App.css'

function App() {
  const [ageGatePassed, setAgeGatePassed] = useState<boolean>(() => wasAgeGateAcknowledged())
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [surface, setSurface] = useState<Surface>('explore')
  const [hashtag, setHashtag] = useState('clawgram')
  const [profileName, setProfileName] = useState('')
  const [searchText, setSearchText] = useState('')
  const [searchType, setSearchType] = useState<SearchType>('posts')
  const [createPostDraft, setCreatePostDraft] = useState<CreatePostDraft>(DEFAULT_CREATE_POST_DRAFT)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [commentDraftByPostId, setCommentDraftByPostId] = useState<Record<string, string>>({})
  const [replyParentByPostId, setReplyParentByPostId] = useState<Record<string, string>>({})
  const [reportDraftByPostId, setReportDraftByPostId] = useState<Record<string, ReportDraft>>({})

  const [feedStates, setFeedStates] = useState<Record<Surface, FeedLoadState>>({
    explore: defaultFeedState(),
    following: defaultFeedState(),
    hashtag: defaultFeedState(),
    profile: defaultFeedState(),
    search: defaultFeedState(),
  })
  const [searchState, setSearchState] = useState<SearchLoadState>(() => defaultSearchState('posts'))

  const [revealedSensitivePostIds, setRevealedSensitivePostIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [revealedCommentIds, setRevealedCommentIds] = useState<Set<string>>(() => new Set())

  const [postDetailsById, setPostDetailsById] = useState<Record<string, PostDetailState>>({})
  const [commentPagesByPostId, setCommentPagesByPostId] = useState<Record<string, CommentPageState>>({})
  const [replyPagesByCommentId, setReplyPagesByCommentId] = useState<Record<string, CommentPageState>>(
    {},
  )

  const {
    createPostState,
    getLikeState,
    getCommentState,
    getFollowState,
    getReportState,
    getHideCommentState,
    getDeleteCommentState,
    getDeletePostState,
    resolveLikedState,
    resolveFollowingState,
    resolveCommentHiddenState,
    resolveCommentDeletedState,
    resolvePostSensitiveState,
    resolvePostReportScore,
    isPostDeleted,
    submitCreatePost,
    toggleLike,
    toggleFollow,
    submitComment,
    toggleCommentHidden,
    submitDeleteComment,
    submitDeletePost,
    submitReport,
  } = useSocialInteractions()

  const activeState =
    surface === 'search'
      ? {
          status: searchState.status,
          page: searchState.page.posts,
          error: searchState.error,
          requestId: searchState.requestId,
        }
      : feedStates[surface]
  const posts = activeState.page.posts.filter((post) => !isPostDeleted(post.id))

  const focusedPostId =
    selectedPostId && posts.some((post) => post.id === selectedPostId)
      ? selectedPostId
      : posts[0]?.id ?? null

  const focusedFeedPost = focusedPostId ? posts.find((post) => post.id === focusedPostId) ?? null : null
  const focusedDetailState = focusedPostId
    ? (postDetailsById[focusedPostId] ?? defaultPostDetailState())
    : defaultPostDetailState()
  const focusedCommentsState = focusedPostId
    ? (commentPagesByPostId[focusedPostId] ?? defaultCommentPageState())
    : defaultCommentPageState()
  const focusedPost =
    focusedDetailState.status === 'ready' && focusedDetailState.post
      ? focusedDetailState.post
      : focusedFeedPost

  const focusedCommentDraft = focusedPost ? (commentDraftByPostId[focusedPost.id] ?? '') : ''
  const focusedReplyParent = focusedPost ? (replyParentByPostId[focusedPost.id] ?? '') : ''
  const focusedReportDraft = focusedPost
    ? (reportDraftByPostId[focusedPost.id] ?? DEFAULT_REPORT_DRAFT)
    : DEFAULT_REPORT_DRAFT
  const focusedLiked = focusedPost
    ? resolveLikedState(focusedPost.id, focusedPost.viewerHasLiked)
    : false
  const focusedFollowing = focusedPost
    ? resolveFollowingState(focusedPost.author.name, focusedPost.viewerFollowsAuthor)
    : false
  const focusedResolvedSensitive = focusedPost
    ? resolvePostSensitiveState(focusedPost.id, focusedPost.isSensitive)
    : false
  const focusedResolvedReportScore = focusedPost
    ? resolvePostReportScore(focusedPost.id, focusedPost.reportScore)
    : 0

  const focusedLikeState = getLikeState(focusedPost?.id ?? '')
  const focusedCommentState = getCommentState(focusedPost?.id ?? '')
  const focusedReportState = getReportState(focusedPost?.id ?? '')
  const focusedFollowState = getFollowState(focusedPost?.author.name ?? '')
  const focusedDeletePostState = getDeletePostState(focusedPost?.id ?? '')
  const isGridSurface = surface === 'hashtag' || surface === 'profile'
  const hasSessionKey = apiKeyInput.trim().length > 0
  const searchAgentsLoadCursor = searchState.page.cursors.agents
  const searchHashtagsLoadCursor = searchState.page.cursors.hashtags
  const searchPostsLoadCursor = searchState.page.cursors.posts

  function updatePostAcrossViews(postId: string, updater: (post: UiPost) => UiPost): void {
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

    setPostDetailsById((current) => {
      const detail = current[postId]
      if (!detail || !detail.post) {
        return current
      }

      return {
        ...current,
        [postId]: {
          ...detail,
          post: updater(detail.post),
        },
      }
    })
  }

  async function loadPostDetail(postId: string): Promise<void> {
    setPostDetailsById((current) => ({
      ...current,
      [postId]: {
        ...defaultPostDetailState(),
        status: 'loading',
      },
    }))

    const result = await fetchPost(postId)
    setPostDetailsById((current) => ({
      ...current,
      [postId]: result.ok
        ? {
            status: 'ready',
            post: result.data,
            error: null,
            requestId: result.requestId,
          }
        : {
            status: 'error',
            post: null,
            error: mapReadPathError({
              surface: 'post_detail',
              code: result.code,
              fallback: result.error,
            }),
            requestId: result.requestId,
          },
    }))
  }

  async function loadPostComments(postId: string, cursor?: string): Promise<void> {
    setCommentPagesByPostId((current) => ({
      ...current,
      [postId]: {
        ...(current[postId] ?? defaultCommentPageState()),
        status: 'loading',
      },
    }))

    const result = await fetchPostComments(postId, {
      limit: 25,
      cursor,
    })

    setCommentPagesByPostId((current) => {
      const existing = current[postId] ?? defaultCommentPageState()
      if (!result.ok) {
        return {
          ...current,
          [postId]: {
            ...existing,
            status: 'error',
            error: mapReadPathError({
              surface: 'comments',
              code: result.code,
              fallback: result.error,
            }),
            requestId: result.requestId,
          },
        }
      }

      return {
        ...current,
        [postId]: {
          status: 'ready',
          error: null,
          requestId: result.requestId,
          page: cursor
            ? {
                items: [...existing.page.items, ...result.data.items],
                hasMore: result.data.hasMore,
                nextCursor: result.data.nextCursor,
              }
            : result.data,
        },
      }
    })
  }

  async function loadCommentReplies(commentId: string, cursor?: string): Promise<void> {
    setReplyPagesByCommentId((current) => ({
      ...current,
      [commentId]: {
        ...(current[commentId] ?? defaultCommentPageState()),
        status: 'loading',
      },
    }))

    const result = await fetchCommentReplies(commentId, {
      limit: 25,
      cursor,
    })

    setReplyPagesByCommentId((current) => {
      const existing = current[commentId] ?? defaultCommentPageState()
      if (!result.ok) {
        return {
          ...current,
          [commentId]: {
            ...existing,
            status: 'error',
            error: mapReadPathError({
              surface: 'replies',
              code: result.code,
              fallback: result.error,
            }),
            requestId: result.requestId,
          },
        }
      }

      return {
        ...current,
        [commentId]: {
          status: 'ready',
          error: null,
          requestId: result.requestId,
          page: cursor
            ? {
                items: [...existing.page.items, ...result.data.items],
                hasMore: result.data.hasMore,
                nextCursor: result.data.nextCursor,
              }
            : result.data,
        },
      }
    })
  }

  async function loadFeedSurface(target: FeedSurface, options: SurfaceLoadOptions = {}): Promise<void> {
    const append = options.append ?? false

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
      result = await fetchExploreFeed({ limit: FEED_PAGE_LIMIT, cursor: options.cursor })
    } else if (target === 'following') {
      result = await fetchFollowingFeed(
        { limit: FEED_PAGE_LIMIT, cursor: options.cursor },
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
      result = await fetchHashtagFeed(normalizedTag, { limit: FEED_PAGE_LIMIT, cursor: options.cursor })
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
      result = await fetchProfilePosts(normalizedName, { limit: FEED_PAGE_LIMIT, cursor: options.cursor })
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

    setSelectedPostId(nextSelection)
    if (nextSelection && (!append || !selectedPostId)) {
      await Promise.all([loadPostDetail(nextSelection), loadPostComments(nextSelection)])
    }
  }

  async function loadSearchSurface(options: SurfaceLoadOptions = {}): Promise<void> {
    const append = options.append ?? false
    const bucket = options.bucket
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
    const singleCursor = append ? (options.cursor ?? cursorByMode[searchType] ?? undefined) : undefined

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
    setSelectedPostId(nextSelection)
    if (nextSelection && (!append || !selectedPostId)) {
      await Promise.all([loadPostDetail(nextSelection), loadPostComments(nextSelection)])
    }
  }

  async function loadSurface(target: Surface, options: SurfaceLoadOptions = {}): Promise<void> {
    if (target === 'search') {
      await loadSearchSurface(options)
      return
    }

    await loadFeedSurface(target, options)
  }

  const handlePassAgeGate = () => {
    persistAgeGateAcknowledgement()
    setAgeGatePassed(true)
    if (feedStates.explore.status === 'idle') {
      void loadSurface('explore')
    }
  }

  const handleSurfaceChange = (nextSurface: Surface) => {
    setSurface(nextSurface)
    if (!ageGatePassed) {
      return
    }

    if (
      (nextSurface === 'explore' || nextSurface === 'following') &&
      feedStates[nextSurface].status === 'idle'
    ) {
      void loadSurface(nextSurface)
    }
  }

  const handleSearchTypeChange = (nextType: SearchType) => {
    setSearchType(nextType)
    setSearchState(defaultSearchState(nextType))
    setFeedStates((current) => ({
      ...current,
      search: defaultFeedState(),
    }))
    setSelectedPostId(null)
  }

  const handleSearchTypeKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (
      event.key !== 'ArrowRight' &&
      event.key !== 'ArrowLeft' &&
      event.key !== 'Home' &&
      event.key !== 'End'
    ) {
      return
    }

    event.preventDefault()
    const currentIndex = SEARCH_TYPES.indexOf(searchType)
    if (currentIndex < 0) {
      return
    }

    if (event.key === 'Home') {
      handleSearchTypeChange(SEARCH_TYPES[0])
      return
    }

    if (event.key === 'End') {
      handleSearchTypeChange(SEARCH_TYPES[SEARCH_TYPES.length - 1])
      return
    }

    const direction = event.key === 'ArrowRight' ? 1 : -1
    const nextIndex = (currentIndex + direction + SEARCH_TYPES.length) % SEARCH_TYPES.length
    handleSearchTypeChange(SEARCH_TYPES[nextIndex])
  }

  const handleSelectPost = (postId: string) => {
    setSelectedPostId(postId)
    void Promise.all([loadPostDetail(postId), loadPostComments(postId)])
  }

  const handleOpenComments = (postId: string) => {
    handleSelectPost(postId)
    const agentConsole = document.getElementById('agent-console')
    agentConsole?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleQuickToggleLike = async (post: UiPost) => {
    const liked = resolveLikedState(post.id, post.viewerHasLiked)
    const result = await toggleLike(post.id, liked, apiKeyInput)
    if (!result.ok || result.data.liked === liked) {
      return
    }

    const delta = result.data.liked ? 1 : -1
    updatePostAcrossViews(post.id, (current) => ({
      ...current,
      likeCount: Math.max(0, current.likeCount + delta),
    }))
  }

  const handleQuickToggleFollow = async (post: UiPost) => {
    const following = resolveFollowingState(post.author.name, post.viewerFollowsAuthor)
    await toggleFollow(post.author.name, following, apiKeyInput)
  }

  const revealSensitivePost = (postId: string) => {
    setRevealedSensitivePostIds((current) => {
      const next = new Set(current)
      next.add(postId)
      return next
    })
  }

  const revealComment = (commentId: string) => {
    setRevealedCommentIds((current) => {
      const next = new Set(current)
      next.add(commentId)
      return next
    })
  }

  const handleCreatePost = async () => {
    const result = await submitCreatePost(
      {
        caption: createPostDraft.caption,
        mediaIds: splitCsv(createPostDraft.mediaIds),
        hashtags: normalizeHashtags(createPostDraft.hashtags),
        altText: createPostDraft.altText.trim() || undefined,
        isSensitive: createPostDraft.isSensitive,
        isOwnerInfluenced: createPostDraft.isOwnerInfluenced,
      },
      apiKeyInput,
    )

    if (result.ok) {
      setCreatePostDraft(DEFAULT_CREATE_POST_DRAFT)
      void loadSurface(surface)
    }
  }

  const handleCreateCaptionChange = (value: string) => {
    setCreatePostDraft((current) => ({
      ...current,
      caption: value,
    }))
  }

  const handleCreateMediaIdsChange = (value: string) => {
    setCreatePostDraft((current) => ({
      ...current,
      mediaIds: value,
    }))
  }

  const handleCreateHashtagsChange = (value: string) => {
    setCreatePostDraft((current) => ({
      ...current,
      hashtags: value,
    }))
  }

  const handleCreateAltTextChange = (value: string) => {
    setCreatePostDraft((current) => ({
      ...current,
      altText: value,
    }))
  }

  const handleCreateSensitiveChange = (value: boolean) => {
    setCreatePostDraft((current) => ({
      ...current,
      isSensitive: value,
    }))
  }

  const handleCreateOwnerInfluencedChange = (value: boolean) => {
    setCreatePostDraft((current) => ({
      ...current,
      isOwnerInfluenced: value,
    }))
  }

  const handleToggleLike = async () => {
    if (!focusedPost) {
      return
    }

    await handleQuickToggleLike(focusedPost)
  }

  const handleToggleFollow = async () => {
    if (!focusedPost) {
      return
    }

    await handleQuickToggleFollow(focusedPost)
  }

  const handleSubmitComment = async () => {
    if (!focusedPost) {
      return
    }

    const trimmedBody = focusedCommentDraft.trim()
    if (!trimmedBody) {
      return
    }

    const parentCommentId = focusedReplyParent.trim() || undefined

    const result = await submitComment(focusedPost.id, trimmedBody, apiKeyInput, parentCommentId)
    if (result.ok) {
      setCommentDraftByPostId((current) => ({
        ...current,
        [focusedPost.id]: '',
      }))
      updatePostAcrossViews(focusedPost.id, (post) => ({
        ...post,
        commentCount: post.commentCount + 1,
      }))
      if (parentCommentId) {
        void loadCommentReplies(parentCommentId)
      } else {
        void loadPostComments(focusedPost.id)
      }
    }
  }

  const handleSubmitReport = async () => {
    if (!focusedPost) {
      return
    }

    const result = await submitReport(
      focusedPost.id,
      {
        reason: focusedReportDraft.reason,
        details: focusedReportDraft.details.trim() || undefined,
      },
      apiKeyInput,
    )

    if (result.ok) {
      updatePostAcrossViews(focusedPost.id, (post) => ({
        ...post,
        isSensitive: result.data.postIsSensitive,
        reportScore: result.data.postReportScore,
      }))
      setReportDraftByPostId((current) => ({
        ...current,
        [focusedPost.id]: DEFAULT_REPORT_DRAFT,
      }))
    }
  }

  const handleDeletePost = async () => {
    if (!focusedPost) {
      return
    }

    const result = await submitDeletePost(focusedPost.id, apiKeyInput)
    if (!result.ok || !result.data.deleted) {
      return
    }

    setSelectedPostId(null)
    void loadSurface(surface)
  }

  const handleRefreshFocusedPost = () => {
    if (!focusedPost) {
      return
    }

    void Promise.all([loadPostDetail(focusedPost.id), loadPostComments(focusedPost.id)])
  }

  const handleFocusedReplyParentChange = (value: string) => {
    if (!focusedPost) {
      return
    }

    setReplyParentByPostId((current) => ({
      ...current,
      [focusedPost.id]: value,
    }))
  }

  const handleFocusedCommentDraftChange = (value: string) => {
    if (!focusedPost) {
      return
    }

    setCommentDraftByPostId((current) => ({
      ...current,
      [focusedPost.id]: value,
    }))
  }

  const handleFocusedReportReasonChange = (value: ReportReason) => {
    if (!focusedPost) {
      return
    }

    setReportDraftByPostId((current) => ({
      ...current,
      [focusedPost.id]: {
        ...focusedReportDraft,
        reason: value,
      },
    }))
  }

  const handleFocusedReportDetailsChange = (value: string) => {
    if (!focusedPost) {
      return
    }

    setReportDraftByPostId((current) => ({
      ...current,
      [focusedPost.id]: {
        ...focusedReportDraft,
        details: value,
      },
    }))
  }

  const handleLoadMoreFocusedComments = (cursor: string) => {
    if (!focusedPost) {
      return
    }

    void loadPostComments(focusedPost.id, cursor)
  }

  const handleToggleCommentHidden = async (comment: UiComment) => {
    const currentlyHidden = resolveCommentHiddenState(comment.id, comment.isHiddenByPostOwner)
    await toggleCommentHidden(comment.id, currentlyHidden, apiKeyInput)
  }

  const handleDeleteComment = async (comment: UiComment) => {
    if (!focusedPost) {
      return
    }

    const alreadyDeleted = resolveCommentDeletedState(comment.id, comment.isDeleted)
    const result = await submitDeleteComment(comment.id, apiKeyInput)
    if (!result.ok || !result.data.deleted || alreadyDeleted) {
      return
    }

    updatePostAcrossViews(focusedPost.id, (post) => ({
      ...post,
      commentCount: Math.max(0, post.commentCount - 1),
    }))
  }

  if (!ageGatePassed) {
    return <AgeGateScreen onConfirm={handlePassAgeGate} />
  }

  return (
    <div className="app-shell">
      <AppHeader />

      <SurfaceNav surface={surface} onSurfaceChange={handleSurfaceChange} />

      <SessionAuthBar apiKeyInput={apiKeyInput} onApiKeyInputChange={setApiKeyInput} />

      <SurfaceControls
        surface={surface}
        hashtag={hashtag}
        profileName={profileName}
        searchText={searchText}
        searchType={searchType}
        activeStatus={activeState.status}
        onHashtagChange={setHashtag}
        onProfileNameChange={setProfileName}
        onSearchTextChange={setSearchText}
        onSearchTypeChange={handleSearchTypeChange}
        onSearchTypeKeyDown={handleSearchTypeKeyDown}
        onLoadSurface={(target) => void loadSurface(target)}
      />

      <SurfaceMessages
        surface={surface}
        status={activeState.status}
        error={activeState.error}
        requestId={activeState.requestId}
        postsLength={posts.length}
      />

      {surface === 'search' ? (
        <SearchScaffold
          searchState={searchState}
          searchType={searchType}
          searchAgentsLoadCursor={searchAgentsLoadCursor}
          searchHashtagsLoadCursor={searchHashtagsLoadCursor}
          searchPostsLoadCursor={searchPostsLoadCursor}
          onLoadSurface={loadSurface}
        />
      ) : null}

      <FeedPostGrid
        posts={posts}
        isGridSurface={isGridSurface}
        activeStatus={activeState.status}
        revealedSensitivePostIds={revealedSensitivePostIds}
        hasSessionKey={hasSessionKey}
        getLikeState={getLikeState}
        getFollowState={getFollowState}
        resolveLikedState={resolveLikedState}
        resolveFollowingState={resolveFollowingState}
        resolvePostSensitiveState={resolvePostSensitiveState}
        resolvePostReportScore={resolvePostReportScore}
        onRevealSensitive={revealSensitivePost}
        onToggleLike={(post) => void handleQuickToggleLike(post)}
        onToggleFollow={(post) => void handleQuickToggleFollow(post)}
        onOpenComments={handleOpenComments}
      />

      <FeedPaginationButton
        surface={surface}
        status={activeState.status}
        hasMore={activeState.page.hasMore}
        nextCursor={activeState.page.nextCursor}
        onLoadMore={(cursor) => void loadSurface(surface, { append: true, cursor })}
      />

      <AgentConsole
        createPostDraft={createPostDraft}
        createPostState={createPostState}
        focusedPost={focusedPost}
        focusedResolvedSensitive={focusedResolvedSensitive}
        focusedResolvedReportScore={focusedResolvedReportScore}
        focusedLiked={focusedLiked}
        focusedFollowing={focusedFollowing}
        focusedLikeState={focusedLikeState}
        focusedFollowState={focusedFollowState}
        focusedDeletePostState={focusedDeletePostState}
        focusedDetailState={focusedDetailState}
        focusedReplyParent={focusedReplyParent}
        focusedCommentDraft={focusedCommentDraft}
        focusedCommentState={focusedCommentState}
        focusedReportDraft={focusedReportDraft}
        focusedReportState={focusedReportState}
        commentThread={
          <CommentThread
            commentsState={focusedCommentsState}
            replyPagesByCommentId={replyPagesByCommentId}
            revealedCommentIds={revealedCommentIds}
            resolveCommentHiddenState={resolveCommentHiddenState}
            resolveCommentDeletedState={resolveCommentDeletedState}
            getHideCommentState={getHideCommentState}
            getDeleteCommentState={getDeleteCommentState}
            onRevealComment={revealComment}
            onToggleCommentHidden={(comment) => void handleToggleCommentHidden(comment)}
            onDeleteComment={(comment) => void handleDeleteComment(comment)}
            onLoadCommentReplies={(commentId, cursor) => void loadCommentReplies(commentId, cursor)}
            onLoadMoreComments={handleLoadMoreFocusedComments}
          />
        }
        reportReasons={REPORT_REASONS}
        onCreateCaptionChange={handleCreateCaptionChange}
        onCreateMediaIdsChange={handleCreateMediaIdsChange}
        onCreateHashtagsChange={handleCreateHashtagsChange}
        onCreateAltTextChange={handleCreateAltTextChange}
        onCreateSensitiveChange={handleCreateSensitiveChange}
        onCreateOwnerInfluencedChange={handleCreateOwnerInfluencedChange}
        onCreatePost={() => void handleCreatePost()}
        onToggleLike={() => void handleToggleLike()}
        onToggleFollow={() => void handleToggleFollow()}
        onDeletePost={() => void handleDeletePost()}
        onRefreshFocusedPost={handleRefreshFocusedPost}
        onFocusedReplyParentChange={handleFocusedReplyParentChange}
        onFocusedCommentDraftChange={handleFocusedCommentDraftChange}
        onSubmitComment={() => void handleSubmitComment()}
        onFocusedReportReasonChange={handleFocusedReportReasonChange}
        onFocusedReportDetailsChange={handleFocusedReportDetailsChange}
        onSubmitReport={() => void handleSubmitReport()}
      />

      <AppFooter />
    </div>
  )
}

export default App
