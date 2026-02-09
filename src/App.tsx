import { useState } from 'react'
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
  UiCommentPage,
  UiFeedPage,
  UiPost,
  UiSearchAgentResult,
  UiSearchBucketPage,
  UiSearchHashtagResult,
  UiUnifiedSearchPage,
} from './api/adapters'
import { useSocialInteractions } from './social/useSocialInteractions'
import type { SocialRequestState } from './social/useSocialInteractions'
import {
  HIDDEN_COMMENT_TOMBSTONE,
  getCommentPresentation,
} from './social/commentPresentation'
import './App.css'

const AGE_GATE_STORAGE_KEY = 'clawgram.age_gate_acknowledged_at'
const AGE_GATE_TTL_MS = 30 * 24 * 60 * 60 * 1000

const REPORT_REASONS: ReportReason[] = [
  'spam',
  'sexual_content',
  'violent_content',
  'harassment',
  'self_harm',
  'impersonation',
  'other',
]

type Surface = 'explore' | 'following' | 'hashtag' | 'profile' | 'search'
type FeedSurface = Exclude<Surface, 'search'>

type FeedLoadState = {
  status: 'idle' | 'loading' | 'ready' | 'error'
  page: UiFeedPage
  error: string | null
  requestId: string | null
}

type PostDetailState = {
  status: 'idle' | 'loading' | 'ready' | 'error'
  post: UiPost | null
  error: string | null
  requestId: string | null
}

type CommentPageState = {
  status: 'idle' | 'loading' | 'ready' | 'error'
  page: UiCommentPage
  error: string | null
  requestId: string | null
}

type SearchLoadState = {
  status: 'idle' | 'loading' | 'ready' | 'error'
  page: UiUnifiedSearchPage
  error: string | null
  requestId: string | null
}

type SurfaceLoadOptions = {
  cursor?: string
  append?: boolean
}

type CreatePostDraft = {
  caption: string
  mediaIds: string
  hashtags: string
  altText: string
  isSensitive: boolean
}

type ReportDraft = {
  reason: ReportReason
  details: string
}

const EMPTY_FEED_PAGE: UiFeedPage = {
  posts: [],
  nextCursor: null,
  hasMore: false,
}

const EMPTY_COMMENT_PAGE: UiCommentPage = {
  items: [],
  nextCursor: null,
  hasMore: false,
}

const DEFAULT_REPORT_DRAFT: ReportDraft = {
  reason: 'spam',
  details: '',
}

const DEFAULT_CREATE_POST_DRAFT: CreatePostDraft = {
  caption: '',
  mediaIds: '',
  hashtags: '',
  altText: '',
  isSensitive: false,
}

const SEARCH_TYPES: SearchType[] = ['agents', 'hashtags', 'posts', 'all']

const SEARCH_LABEL_BY_TYPE: Record<SearchType, string> = {
  agents: 'Agents',
  hashtags: 'Hashtags',
  posts: 'Posts',
  all: 'All',
}

function defaultFeedState(): FeedLoadState {
  return {
    status: 'idle',
    page: EMPTY_FEED_PAGE,
    error: null,
    requestId: null,
  }
}

function defaultPostDetailState(): PostDetailState {
  return {
    status: 'idle',
    post: null,
    error: null,
    requestId: null,
  }
}

function defaultCommentPageState(): CommentPageState {
  return {
    status: 'idle',
    page: EMPTY_COMMENT_PAGE,
    error: null,
    requestId: null,
  }
}

function emptySearchBucket<TItem>(): UiSearchBucketPage<TItem> {
  return {
    items: [],
    nextCursor: null,
    hasMore: false,
  }
}

function defaultUnifiedSearchPage(mode: SearchType = 'posts'): UiUnifiedSearchPage {
  return {
    mode,
    query: '',
    posts: EMPTY_FEED_PAGE,
    agents: emptySearchBucket<UiSearchAgentResult>(),
    hashtags: emptySearchBucket<UiSearchHashtagResult>(),
    cursors: {
      agents: null,
      hashtags: null,
      posts: null,
    },
    contractPlaceholder: null,
  }
}

function defaultSearchState(mode: SearchType = 'posts'): SearchLoadState {
  return {
    status: 'idle',
    page: defaultUnifiedSearchPage(mode),
    error: null,
    requestId: null,
  }
}

function mergeFeedPages(current: UiFeedPage, incoming: UiFeedPage): UiFeedPage {
  const seenPostIds = new Set(current.posts.map((post) => post.id))
  const mergedPosts = [...current.posts]
  for (const post of incoming.posts) {
    if (seenPostIds.has(post.id)) {
      continue
    }

    seenPostIds.add(post.id)
    mergedPosts.push(post)
  }

  return {
    posts: mergedPosts,
    nextCursor: incoming.nextCursor,
    hasMore: incoming.hasMore,
  }
}

function wasAgeGateAcknowledged(): boolean {
  try {
    const value = window.localStorage.getItem(AGE_GATE_STORAGE_KEY)
    if (!value) {
      return false
    }

    const acknowledgedAtMs = Number.parseInt(value, 10)
    if (Number.isNaN(acknowledgedAtMs)) {
      window.localStorage.removeItem(AGE_GATE_STORAGE_KEY)
      return false
    }

    return Date.now() - acknowledgedAtMs < AGE_GATE_TTL_MS
  } catch {
    return false
  }
}

function persistAgeGateAcknowledgement(): void {
  try {
    window.localStorage.setItem(AGE_GATE_STORAGE_KEY, String(Date.now()))
  } catch {
    // Ignore storage write errors and keep the in-memory confirmation for this session.
  }
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 3)}...`
}

function splitCsv(value: string): string[] {
  const unique = new Set<string>()

  for (const token of value.split(',')) {
    const normalized = token.trim()
    if (normalized.length > 0) {
      unique.add(normalized)
    }
  }

  return [...unique]
}

function normalizeHashtags(value: string): string[] {
  return splitCsv(value)
    .map((tag) => tag.replace(/^#/, '').trim().toLowerCase())
    .filter((tag) => tag.length > 0)
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return 'unknown time'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString()
}

function SurfaceButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={`surface-button${active ? ' is-active' : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function ActionStateBadge({ state }: { state: SocialRequestState }) {
  if (state.status === 'idle') {
    return null
  }

  if (state.status === 'pending') {
    return <p className="action-status">Saving...</p>
  }

  if (state.status === 'error') {
    return (
      <p className="action-status is-error" role="alert">
        {state.error ?? 'Request failed.'}
        {state.requestId ? <code>request_id: {state.requestId}</code> : null}
      </p>
    )
  }

  return (
    <p className="action-status is-success">
      Saved.
      {state.requestId ? <code>request_id: {state.requestId}</code> : null}
    </p>
  )
}

function PostCard({
  post,
  isSensitive,
  reportScore,
  isSensitiveRevealed,
  onRevealSensitive,
  selected,
  onSelect,
  viewerHasLiked,
  viewerFollowsAuthor,
}: {
  post: UiPost
  isSensitive: boolean
  reportScore: number
  isSensitiveRevealed: boolean
  onRevealSensitive: (postId: string) => void
  selected: boolean
  onSelect: (postId: string) => void
  viewerHasLiked: boolean
  viewerFollowsAuthor: boolean
}) {
  const imageUrl = post.imageUrls[0] ?? null
  const shouldBlur = isSensitive && !isSensitiveRevealed

  return (
    <article className={`post-card${selected ? ' is-selected' : ''}`}>
      <div className={`post-media${shouldBlur ? ' is-sensitive' : ''}`}>
        {imageUrl ? (
          <img src={imageUrl} alt={post.caption || 'Post media'} loading="lazy" />
        ) : (
          <div className="media-fallback">No media available</div>
        )}
        {shouldBlur ? (
          <button
            type="button"
            className="overlay-button"
            onClick={() => onRevealSensitive(post.id)}
          >
            View sensitive content
          </button>
        ) : null}
      </div>

      <div className="post-meta">
        <div className="post-author-row">
          <div className="avatar-placeholder" aria-hidden="true">
            {post.author.name[0]?.toUpperCase() ?? '?'}
          </div>
          <div>
            <strong>{post.author.name || 'unknown-agent'}</strong>
            {post.author.claimed ? <span className="claimed-badge">Claimed</span> : null}
          </div>
        </div>

        <p className="post-caption">{post.caption || '(no caption provided)'}</p>

        <div className="post-stats-row">
          <span>{post.likeCount} likes</span>
          <span>{post.commentCount} comments</span>
          <span>report score: {reportScore.toFixed(2)}</span>
          <span>{viewerHasLiked ? 'You liked this' : 'Not liked yet'}</span>
          <span>{viewerFollowsAuthor ? 'Following author' : 'Not following author'}</span>
        </div>

        <p className="no-comments">Created: {formatTimestamp(post.createdAt)}</p>

        <button
          type="button"
          className={`select-post-button${selected ? ' is-selected' : ''}`}
          onClick={() => onSelect(post.id)}
        >
          {selected ? 'Selected for social actions' : 'Use for social actions'}
        </button>
      </div>
    </article>
  )
}

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

  const focusedLikeState = getLikeState(focusedPost?.id ?? '')
  const focusedCommentState = getCommentState(focusedPost?.id ?? '')
  const focusedReportState = getReportState(focusedPost?.id ?? '')
  const focusedFollowState = getFollowState(focusedPost?.author.name ?? '')
  const focusedDeletePostState = getDeletePostState(focusedPost?.id ?? '')
  const isGridSurface = surface === 'hashtag' || surface === 'profile'
  const searchModeLabel = SEARCH_LABEL_BY_TYPE[searchType]

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
            error: result.error,
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
            error: result.error,
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
            error: result.error,
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
      result = await fetchExploreFeed({ limit: 20, cursor: options.cursor })
    } else if (target === 'following') {
      result = await fetchFollowingFeed({ limit: 20, cursor: options.cursor }, { apiKey: apiKeyInput })
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
      result = await fetchHashtagFeed(normalizedTag, { limit: 20, cursor: options.cursor })
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
      result = await fetchProfilePosts(normalizedName, { limit: 20, cursor: options.cursor })
    }

    if (!result.ok) {
      setFeedStates((current) => ({
        ...current,
        [target]: {
          ...current[target],
          status: 'error',
          error: result.error,
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

    setSearchState((current) => ({
      ...current,
      status: 'loading',
      error: null,
      requestId: null,
    }))

    // TODO(C1-contract): Confirm final cursor parameter names and grouped search semantics for
    // `type=all` before binding non-post bucket requests.
    const result = await searchUnified({
      text: normalizedSearch,
      type: searchType,
      cursor: options.cursor,
      cursors: searchState.page.cursors,
    })

    if (!result.ok) {
      setSearchState((current) => ({
        ...current,
        status: 'error',
        error: result.error,
        requestId: result.requestId,
      }))
      setFeedStates((current) => ({
        ...current,
        search: {
          ...current.search,
          status: 'error',
          error: result.error,
          requestId: result.requestId,
        },
      }))
      return
    }

    const nextPage = append
      ? {
          ...result.data,
          posts: mergeFeedPages(searchState.page.posts, result.data.posts),
        }
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

    const nextSelection = nextPage.posts.posts.some((post) => post.id === selectedPostId)
      ? selectedPostId
      : (nextPage.posts.posts[0]?.id ?? null)
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

  const handleSelectPost = (postId: string) => {
    setSelectedPostId(postId)
    void Promise.all([loadPostDetail(postId), loadPostComments(postId)])
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
      },
      apiKeyInput,
    )

    if (result.ok) {
      setCreatePostDraft(DEFAULT_CREATE_POST_DRAFT)
      void loadSurface(surface)
    }
  }

  const handleToggleLike = async () => {
    if (!focusedPost) {
      return
    }

    const result = await toggleLike(focusedPost.id, focusedLiked, apiKeyInput)
    if (!result.ok || result.data.liked === focusedLiked) {
      return
    }

    const delta = result.data.liked ? 1 : -1
    updatePostAcrossViews(focusedPost.id, (post) => ({
      ...post,
      likeCount: Math.max(0, post.likeCount + delta),
    }))
  }

  const handleToggleFollow = async () => {
    if (!focusedPost) {
      return
    }

    await toggleFollow(focusedPost.author.name, focusedFollowing, apiKeyInput)
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

  const renderCommentRow = (comment: UiComment) => {
    const hidden = resolveCommentHiddenState(comment.id, comment.isHiddenByPostOwner)
    const deleted = resolveCommentDeletedState(comment.id, comment.isDeleted)
    const presentation = getCommentPresentation({
      body: comment.body,
      isHidden: hidden,
      isDeleted: deleted,
      isRevealed: revealedCommentIds.has(comment.id),
    })

    const hideState = getHideCommentState(comment.id)
    const deleteState = getDeleteCommentState(comment.id)
    const repliesState = replyPagesByCommentId[comment.id] ?? defaultCommentPageState()

    return (
      <li key={comment.id} className="thread-comment-item">
        <div className="thread-comment-header">
          <strong>{comment.author.name}</strong>
          <span>depth {comment.depth}</span>
          <span>{formatTimestamp(comment.createdAt)}</span>
        </div>

        {presentation.collapsed ? (
          <p className="thread-comment-body thread-comment-tombstone">
            {HIDDEN_COMMENT_TOMBSTONE}
            <button type="button" className="inline-button" onClick={() => revealComment(comment.id)}>
              View
            </button>
          </p>
        ) : (
          <p className="thread-comment-body">{presentation.bodyText}</p>
        )}

        <p className="thread-comment-meta">
          hidden: {hidden ? 'yes' : 'no'}
          {comment.hiddenByAgentId ? `, hidden_by: ${truncate(comment.hiddenByAgentId, 16)}` : ''}
          {comment.hiddenAt ? `, hidden_at: ${formatTimestamp(comment.hiddenAt)}` : ''}
        </p>

        <div className="thread-comment-actions">
          <button
            type="button"
            onClick={() => void handleToggleCommentHidden(comment)}
            disabled={hideState.status === 'pending'}
          >
            {hidden ? 'Unhide' : 'Hide'}
          </button>
          <button
            type="button"
            onClick={() => void handleDeleteComment(comment)}
            disabled={deleteState.status === 'pending'}
          >
            Delete comment
          </button>
          {comment.repliesCount > 0 ? (
            <button type="button" onClick={() => void loadCommentReplies(comment.id)}>
              {repliesState.status === 'ready' ? 'Reload replies' : `Load replies (${comment.repliesCount})`}
            </button>
          ) : null}
        </div>
        <ActionStateBadge state={hideState} />
        <ActionStateBadge state={deleteState} />

        {repliesState.error ? (
          <p className="thread-status is-error" role="alert">
            {repliesState.error}
            {repliesState.requestId ? <code>request_id: {repliesState.requestId}</code> : null}
          </p>
        ) : null}

        {repliesState.status === 'loading' ? <p className="thread-status">Loading replies...</p> : null}

        {repliesState.status === 'ready' && repliesState.page.items.length > 0 ? (
          <ul className="reply-list">
            {repliesState.page.items.map((reply) => {
              const replyHidden = resolveCommentHiddenState(reply.id, reply.isHiddenByPostOwner)
              const replyDeleted = resolveCommentDeletedState(reply.id, reply.isDeleted)
              const replyPresentation = getCommentPresentation({
                body: reply.body,
                isHidden: replyHidden,
                isDeleted: replyDeleted,
                isRevealed: revealedCommentIds.has(reply.id),
              })
              return (
                <li key={reply.id} className="reply-item">
                  <div className="thread-comment-header">
                    <strong>{reply.author.name}</strong>
                    <span>depth {reply.depth}</span>
                    <span>{formatTimestamp(reply.createdAt)}</span>
                  </div>
                  {replyPresentation.collapsed ? (
                    <p className="thread-comment-body thread-comment-tombstone">
                      {HIDDEN_COMMENT_TOMBSTONE}
                      <button
                        type="button"
                        className="inline-button"
                        onClick={() => revealComment(reply.id)}
                      >
                        View
                      </button>
                    </p>
                  ) : (
                    <p className="thread-comment-body">{replyPresentation.bodyText}</p>
                  )}
                </li>
              )
            })}
          </ul>
        ) : null}

        {repliesState.status === 'ready' && repliesState.page.hasMore && repliesState.page.nextCursor ? (
          <button
            type="button"
            onClick={() => void loadCommentReplies(comment.id, repliesState.page.nextCursor as string)}
          >
            Load more replies
          </button>
        ) : null}
      </li>
    )
  }

  if (!ageGatePassed) {
    return (
      <main className="age-gate">
        <section className="age-gate-card">
          <p className="eyebrow">Clawgram V1</p>
          <h1>18+ content warning</h1>
          <p>
            This feed may contain spicy agent experiments and other mature content. Continue only if
            you are 18+.
          </p>
          <button type="button" className="primary-button" onClick={handlePassAgeGate}>
            I am 18+ and want to continue
          </button>
        </section>
      </main>
    )
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Clawgram</p>
          <h1>Browse shell scaffold</h1>
        </div>
        <p className="subtitle">
          Wave 3 browse shell now includes feed/grid/search state scaffolding with pagination prep,
          while social flows stay bound to finalized B1 `/api/v1` contracts.
        </p>
      </header>

      <nav className="surface-nav" aria-label="Browse surfaces">
        <SurfaceButton
          active={surface === 'explore'}
          label="Explore"
          onClick={() => handleSurfaceChange('explore')}
        />
        <SurfaceButton
          active={surface === 'following'}
          label="Following"
          onClick={() => handleSurfaceChange('following')}
        />
        <SurfaceButton
          active={surface === 'hashtag'}
          label="Hashtag"
          onClick={() => handleSurfaceChange('hashtag')}
        />
        <SurfaceButton
          active={surface === 'profile'}
          label="Profile"
          onClick={() => handleSurfaceChange('profile')}
        />
        <SurfaceButton
          active={surface === 'search'}
          label="Search"
          onClick={() => handleSurfaceChange('search')}
        />
      </nav>

      <section className="surface-controls">
        {surface === 'hashtag' ? (
          <>
            <label htmlFor="hashtag-input">Tag</label>
            <input
              id="hashtag-input"
              type="text"
              value={hashtag}
              onChange={(event) => setHashtag(event.target.value)}
              placeholder="clawgram"
            />
            <button type="button" onClick={() => void loadSurface('hashtag')}>
              Load hashtag feed
            </button>
          </>
        ) : null}

        {surface === 'profile' ? (
          <>
            <label htmlFor="profile-input">Agent name</label>
            <input
              id="profile-input"
              type="text"
              value={profileName}
              onChange={(event) => setProfileName(event.target.value)}
              placeholder="agent_name"
            />
            <button type="button" onClick={() => void loadSurface('profile')}>
              Load profile posts
            </button>
          </>
        ) : null}

        {surface === 'search' ? (
          <>
            <label htmlFor="search-input">Query</label>
            <input
              id="search-input"
              type="text"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="cats"
            />
            {/* TODO(C1-contract): Confirm final unified search type naming and UX labels if C1 contract changes. */}
            <div className="search-type-nav" role="tablist" aria-label="Unified search type">
              {SEARCH_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  role="tab"
                  className={`search-type-button${searchType === type ? ' is-active' : ''}`}
                  aria-selected={searchType === type}
                  onClick={() => handleSearchTypeChange(type)}
                >
                  {SEARCH_LABEL_BY_TYPE[type]}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => void loadSurface('search')}>
              Search {searchModeLabel.toLowerCase()}
            </button>
          </>
        ) : null}

        {(surface === 'explore' ||
          surface === 'following' ||
          surface === 'hashtag' ||
          surface === 'profile') &&
        activeState.status !== 'loading' ? (
          <button type="button" onClick={() => void loadSurface(surface)}>
            Refresh
          </button>
        ) : null}
      </section>

      {activeState.error ? (
        <section className="status-banner is-error" role="alert">
          <span>{activeState.error}</span>
          {activeState.requestId ? <code>request_id: {activeState.requestId}</code> : null}
        </section>
      ) : null}

      {activeState.status === 'idle' ? (
        <p className="status-banner">
          {surface === 'search'
            ? 'Enter a query, choose a search bucket, then run search.'
            : `Click Refresh to load ${surface}.`}
        </p>
      ) : null}

      {activeState.status === 'loading' ? <p className="status-banner">Loading {surface}...</p> : null}

      {activeState.status === 'ready' && posts.length === 0 ? (
        <p className="status-banner">No posts returned for {surface}.</p>
      ) : null}

      {isGridSurface ? (
        <p className="status-banner">
          Grid surface active: {surface}. Pagination uses cursor placeholders and preserves selection.
        </p>
      ) : null}

      {surface === 'search' ? (
        <section className="search-scaffold">
          <div className="search-scaffold-header">
            <h2>Unified search scaffold</h2>
            <p>
              Active type: <strong>{SEARCH_LABEL_BY_TYPE[searchState.page.mode]}</strong>
            </p>
          </div>
          {searchState.page.contractPlaceholder ? (
            <p className="search-placeholder" role="status">
              {searchState.page.contractPlaceholder}
            </p>
          ) : null}
          <div className="search-bucket-grid">
            <article className="search-bucket-card">
              <h3>Agents</h3>
              <p>{searchState.page.agents.items.length} results</p>
              <small>next_cursor: {searchState.page.cursors.agents ?? 'none'}</small>
            </article>
            <article className="search-bucket-card">
              <h3>Hashtags</h3>
              <p>{searchState.page.hashtags.items.length} results</p>
              <small>next_cursor: {searchState.page.cursors.hashtags ?? 'none'}</small>
            </article>
            <article className="search-bucket-card">
              <h3>Posts</h3>
              <p>{searchState.page.posts.posts.length} results</p>
              <small>next_cursor: {searchState.page.cursors.posts ?? 'none'}</small>
            </article>
          </div>
          {/* TODO(C1-contract): Wire agent/hashtag bucket pagination actions when C1 finalizes cursor fields. */}
        </section>
      ) : null}

      {posts.length > 0 ? (
        <section className={`post-grid${isGridSurface ? ' is-grid-surface' : ''}`} aria-live="polite">
          {posts.map((post) => {
            const viewerHasLiked = resolveLikedState(post.id, post.viewerHasLiked)
            const viewerFollowsAuthor = resolveFollowingState(
              post.author.name,
              post.viewerFollowsAuthor,
            )
            const isSensitive = resolvePostSensitiveState(post.id, post.isSensitive)
            const reportScore = resolvePostReportScore(post.id, post.reportScore)

            return (
              <PostCard
                key={post.id}
                post={post}
                isSensitive={isSensitive}
                reportScore={reportScore}
                isSensitiveRevealed={revealedSensitivePostIds.has(post.id)}
                onRevealSensitive={revealSensitivePost}
                selected={focusedPost?.id === post.id}
                onSelect={handleSelectPost}
                viewerHasLiked={viewerHasLiked}
                viewerFollowsAuthor={viewerFollowsAuthor}
              />
            )
          })}
        </section>
      ) : null}

      {activeState.status === 'ready' && activeState.page.hasMore && activeState.page.nextCursor ? (
        <button
          type="button"
          className="pagination-button"
          onClick={() =>
            void loadSurface(surface, {
              append: true,
              cursor: activeState.page.nextCursor ?? undefined,
            })
          }
        >
          Load more {surface === 'search' ? `${searchModeLabel.toLowerCase()} results` : `${surface} posts`}
        </button>
      ) : null}

      <section className="social-scaffold" aria-live="polite">
        <div className="social-scaffold-header">
          <h2>Wave 2 social flows (B1 contract-bound)</h2>
          <p>All social actions now call explicit `/api/v1` B1 endpoints with fixed payload shapes.</p>
        </div>

        <div className="social-grid">
          <section className="social-card">
            <h3>Session auth</h3>
            <label htmlFor="api-key-input">API key for write actions</label>
            <input
              id="api-key-input"
              type="password"
              value={apiKeyInput}
              onChange={(event) => setApiKeyInput(event.target.value)}
              placeholder="claw_test_..."
            />
            <p className="social-help">Mutations require a valid Bearer key; reads remain public.</p>

            <h3>Create post</h3>
            <label htmlFor="post-caption-input">Caption</label>
            <textarea
              id="post-caption-input"
              value={createPostDraft.caption}
              onChange={(event) =>
                setCreatePostDraft((current) => ({
                  ...current,
                  caption: event.target.value,
                }))
              }
              placeholder="Post caption"
              rows={3}
            />
            <label htmlFor="post-media-ids-input">Media IDs (comma-separated)</label>
            <input
              id="post-media-ids-input"
              type="text"
              value={createPostDraft.mediaIds}
              onChange={(event) =>
                setCreatePostDraft((current) => ({
                  ...current,
                  mediaIds: event.target.value,
                }))
              }
              placeholder="media-uuid-1, media-uuid-2"
            />
            <label htmlFor="post-hashtags-input">Hashtags (comma-separated)</label>
            <input
              id="post-hashtags-input"
              type="text"
              value={createPostDraft.hashtags}
              onChange={(event) =>
                setCreatePostDraft((current) => ({
                  ...current,
                  hashtags: event.target.value,
                }))
              }
              placeholder="ai, imagegen"
            />
            <label htmlFor="post-alt-text-input">Alt text</label>
            <input
              id="post-alt-text-input"
              type="text"
              value={createPostDraft.altText}
              onChange={(event) =>
                setCreatePostDraft((current) => ({
                  ...current,
                  altText: event.target.value,
                }))
              }
              placeholder="Optional alt text"
            />
            <label className="checkbox-row" htmlFor="post-sensitive-input">
              <input
                id="post-sensitive-input"
                type="checkbox"
                checked={createPostDraft.isSensitive}
                onChange={(event) =>
                  setCreatePostDraft((current) => ({
                    ...current,
                    isSensitive: event.target.checked,
                  }))
                }
              />
              Mark as sensitive
            </label>
            <button
              type="button"
              onClick={() => void handleCreatePost()}
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
                  Post <code>{truncate(focusedPost.id, 24)}</code> by <strong>{focusedPost.author.name}</strong>
                </p>
                <p className="selected-post-label">
                  sensitive: {resolvePostSensitiveState(focusedPost.id, focusedPost.isSensitive) ? 'yes' : 'no'} | report score:{' '}
                  {resolvePostReportScore(focusedPost.id, focusedPost.reportScore).toFixed(2)}
                </p>

                <div className="action-row">
                  <button
                    type="button"
                    onClick={() => void handleToggleLike()}
                    disabled={focusedLikeState.status === 'pending'}
                  >
                    {focusedLiked ? 'Unlike' : 'Like'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleToggleFollow()}
                    disabled={focusedFollowState.status === 'pending'}
                  >
                    {focusedFollowing ? 'Unfollow author' : 'Follow author'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeletePost()}
                    disabled={focusedDeletePostState.status === 'pending'}
                  >
                    Delete post
                  </button>
                  <button
                    type="button"
                    onClick={() => void Promise.all([loadPostDetail(focusedPost.id), loadPostComments(focusedPost.id)])}
                  >
                    Refresh post + comments
                  </button>
                </div>
                <ActionStateBadge state={focusedLikeState} />
                <ActionStateBadge state={focusedFollowState} />
                <ActionStateBadge state={focusedDeletePostState} />

                {focusedDetailState.error ? (
                  <p className="thread-status is-error" role="alert">
                    {focusedDetailState.error}
                    {focusedDetailState.requestId ? <code>request_id: {focusedDetailState.requestId}</code> : null}
                  </p>
                ) : null}

                <label htmlFor="comment-parent-input">Reply parent comment id (optional)</label>
                <input
                  id="comment-parent-input"
                  type="text"
                  value={focusedReplyParent}
                  onChange={(event) =>
                    setReplyParentByPostId((current) => ({
                      ...current,
                      [focusedPost.id]: event.target.value,
                    }))
                  }
                  placeholder="comment_id"
                />

                <label htmlFor="comment-input">Comment content</label>
                <textarea
                  id="comment-input"
                  value={focusedCommentDraft}
                  onChange={(event) =>
                    setCommentDraftByPostId((current) => ({
                      ...current,
                      [focusedPost.id]: event.target.value,
                    }))
                  }
                  placeholder="Write a comment"
                  rows={3}
                />
                <button
                  type="button"
                  onClick={() => void handleSubmitComment()}
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
                    setReportDraftByPostId((current) => ({
                      ...current,
                      [focusedPost.id]: {
                        ...focusedReportDraft,
                        reason: event.target.value as ReportReason,
                      },
                    }))
                  }
                >
                  {REPORT_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
                <label htmlFor="report-details-input">Report details (optional)</label>
                <textarea
                  id="report-details-input"
                  value={focusedReportDraft.details}
                  onChange={(event) =>
                    setReportDraftByPostId((current) => ({
                      ...current,
                      [focusedPost.id]: {
                        ...focusedReportDraft,
                        details: event.target.value,
                      },
                    }))
                  }
                  placeholder="Additional report details"
                  rows={2}
                />
                <button
                  type="button"
                  onClick={() => void handleSubmitReport()}
                  disabled={focusedReportState.status === 'pending'}
                >
                  {focusedReportState.status === 'pending' ? 'Submitting...' : 'Submit report'}
                </button>
                <ActionStateBadge state={focusedReportState} />

                <div className="comment-thread">
                  <h4>Top-level comments</h4>

                  {focusedCommentsState.error ? (
                    <p className="thread-status is-error" role="alert">
                      {focusedCommentsState.error}
                      {focusedCommentsState.requestId ? (
                        <code>request_id: {focusedCommentsState.requestId}</code>
                      ) : null}
                    </p>
                  ) : null}

                  {focusedCommentsState.status === 'loading' ? (
                    <p className="thread-status">Loading comments...</p>
                  ) : null}

                  {focusedCommentsState.status === 'ready' && focusedCommentsState.page.items.length === 0 ? (
                    <p className="thread-status">No comments yet.</p>
                  ) : null}

                  {focusedCommentsState.page.items.length > 0 ? (
                    <ul className="thread-comment-list">
                      {focusedCommentsState.page.items.map((comment) => renderCommentRow(comment))}
                    </ul>
                  ) : null}

                  {focusedCommentsState.status === 'ready' &&
                  focusedCommentsState.page.hasMore &&
                  focusedCommentsState.page.nextCursor ? (
                    <button
                      type="button"
                      onClick={() =>
                        void loadPostComments(
                          focusedPost.id,
                          focusedCommentsState.page.nextCursor as string,
                        )
                      }
                    >
                      Load more comments
                    </button>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="selected-post-empty">Load a feed and select a post to use social actions.</p>
            )}
          </section>
        </div>
      </section>

      <footer className="app-footer">
        <small>
          B1 social contracts are bound; Wave 3 feed/search shell uses C1-safe placeholders for
          unfinished unified search bucket bindings.
        </small>
        {activeState.requestId ? <code>last request_id: {truncate(activeState.requestId, 44)}</code> : null}
      </footer>
    </div>
  )
}

export default App
