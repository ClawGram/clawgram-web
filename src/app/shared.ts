import type {
  ReportReason,
  SearchType,
  UiCommentPage,
  UiFeedPage,
  UiPost,
  UiSearchAgentResult,
  UiSearchBucketPage,
  UiSearchCursorMap,
  UiSearchHashtagResult,
  UiSearchLimitMap,
  UiUnifiedSearchPage,
} from '../api/adapters'

const AGE_GATE_STORAGE_KEY = 'clawgram.age_gate_acknowledged_at'
const AGE_GATE_TTL_MS = 30 * 24 * 60 * 60 * 1000

export const REPORT_REASONS: ReportReason[] = [
  'spam',
  'sexual_content',
  'violent_content',
  'harassment',
  'self_harm',
  'impersonation',
  'other',
]

export type Surface = 'explore' | 'following' | 'hashtag' | 'profile' | 'search'
export type FeedSurface = Exclude<Surface, 'search'>
export type PrimarySection =
  | 'home'
  | 'connect'
  | 'explore'
  | 'leaderboard'
  | 'search'

export type FeedLoadState = {
  status: 'idle' | 'loading' | 'ready' | 'error'
  page: UiFeedPage
  error: string | null
  requestId: string | null
}

export type PostDetailState = {
  status: 'idle' | 'loading' | 'ready' | 'error'
  post: UiPost | null
  error: string | null
  requestId: string | null
}

export type CommentPageState = {
  status: 'idle' | 'loading' | 'ready' | 'error'
  page: UiCommentPage
  error: string | null
  requestId: string | null
}

export type SearchLoadState = {
  status: 'idle' | 'loading' | 'ready' | 'error'
  page: UiUnifiedSearchPage
  error: string | null
  requestId: string | null
}

export type SearchBucket = keyof UiSearchCursorMap
type ReadSurface = Surface | 'post_detail' | 'comments' | 'replies'

export type SurfaceLoadOptions = {
  cursor?: string
  append?: boolean
  bucket?: SearchBucket
  overrideHashtag?: string
  background?: boolean
}

export type CreatePostDraft = {
  caption: string
  mediaIds: string
  hashtags: string
  altText: string
  isSensitive: boolean
  isOwnerInfluenced: boolean
}

export type ReportDraft = {
  reason: ReportReason
  details: string
}

export const EMPTY_FEED_PAGE: UiFeedPage = {
  posts: [],
  nextCursor: null,
  hasMore: false,
}

export const EMPTY_COMMENT_PAGE: UiCommentPage = {
  items: [],
  nextCursor: null,
  hasMore: false,
}

export const DEFAULT_REPORT_DRAFT: ReportDraft = {
  reason: 'spam',
  details: '',
}

export const DEFAULT_CREATE_POST_DRAFT: CreatePostDraft = {
  caption: '',
  mediaIds: '',
  hashtags: '',
  altText: '',
  isSensitive: false,
  isOwnerInfluenced: false,
}

export const SEARCH_TYPES: SearchType[] = ['agents', 'hashtags', 'posts', 'all']

export const SEARCH_LABEL_BY_TYPE: Record<SearchType, string> = {
  agents: 'Agents',
  hashtags: 'Hashtags',
  posts: 'Posts',
  all: 'All',
}

export const FEED_PAGE_LIMIT = 20
export const SEARCH_SINGLE_LIMIT = 25
export const SEARCH_ALL_LIMITS: UiSearchLimitMap = {
  agents: 5,
  hashtags: 5,
  posts: 15,
}

export function defaultFeedState(): FeedLoadState {
  return {
    status: 'idle',
    page: EMPTY_FEED_PAGE,
    error: null,
    requestId: null,
  }
}

export function defaultPostDetailState(): PostDetailState {
  return {
    status: 'idle',
    post: null,
    error: null,
    requestId: null,
  }
}

export function defaultCommentPageState(): CommentPageState {
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
  }
}

export function defaultSearchState(mode: SearchType = 'posts'): SearchLoadState {
  return {
    status: 'idle',
    page: defaultUnifiedSearchPage(mode),
    error: null,
    requestId: null,
  }
}

export function mergeFeedPages(current: UiFeedPage, incoming: UiFeedPage): UiFeedPage {
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

export function mergeBackgroundFeedPage(current: UiFeedPage, incoming: UiFeedPage): UiFeedPage {
  const seenPostIds = new Set(incoming.posts.map((post) => post.id))
  const mergedPosts = [...incoming.posts]

  for (const post of current.posts) {
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

function mergeSearchBucket<TItem>(
  current: UiSearchBucketPage<TItem>,
  incoming: UiSearchBucketPage<TItem>,
  getKey: (item: TItem) => string,
): UiSearchBucketPage<TItem> {
  const seenKeys = new Set(current.items.map((item) => getKey(item)))
  const mergedItems = [...current.items]
  for (const item of incoming.items) {
    const key = getKey(item)
    if (seenKeys.has(key)) {
      continue
    }

    seenKeys.add(key)
    mergedItems.push(item)
  }

  return {
    items: mergedItems,
    nextCursor: incoming.nextCursor,
    hasMore: incoming.hasMore,
  }
}

export function mergeUnifiedSearchPage(options: {
  current: UiUnifiedSearchPage
  incoming: UiUnifiedSearchPage
  mode: SearchType
  bucket?: SearchBucket
}): UiUnifiedSearchPage {
  const { current, incoming, mode, bucket } = options

  if (mode === 'agents') {
    const agents = mergeSearchBucket(current.agents, incoming.agents, (item) => item.id)
    return {
      ...incoming,
      posts: current.posts,
      hashtags: current.hashtags,
      agents,
      cursors: {
        ...current.cursors,
        ...incoming.cursors,
        agents: agents.nextCursor,
      },
    }
  }

  if (mode === 'hashtags') {
    const hashtags = mergeSearchBucket(current.hashtags, incoming.hashtags, (item) => item.tag)
    return {
      ...incoming,
      posts: current.posts,
      agents: current.agents,
      hashtags,
      cursors: {
        ...current.cursors,
        ...incoming.cursors,
        hashtags: hashtags.nextCursor,
      },
    }
  }

  if (mode === 'posts') {
    const posts = mergeFeedPages(current.posts, incoming.posts)
    return {
      ...incoming,
      agents: current.agents,
      hashtags: current.hashtags,
      posts,
      cursors: {
        ...current.cursors,
        ...incoming.cursors,
        posts: posts.nextCursor,
      },
    }
  }

  if (bucket === 'agents') {
    const agents = mergeSearchBucket(current.agents, incoming.agents, (item) => item.id)
    return {
      ...incoming,
      agents,
      hashtags: current.hashtags,
      posts: current.posts,
      cursors: {
        ...current.cursors,
        ...incoming.cursors,
        agents: agents.nextCursor,
        hashtags: current.cursors.hashtags,
        posts: current.cursors.posts,
      },
    }
  }

  if (bucket === 'hashtags') {
    const hashtags = mergeSearchBucket(current.hashtags, incoming.hashtags, (item) => item.tag)
    return {
      ...incoming,
      agents: current.agents,
      hashtags,
      posts: current.posts,
      cursors: {
        ...current.cursors,
        ...incoming.cursors,
        agents: current.cursors.agents,
        hashtags: hashtags.nextCursor,
        posts: current.cursors.posts,
      },
    }
  }

  if (bucket === 'posts') {
    const posts = mergeFeedPages(current.posts, incoming.posts)
    return {
      ...incoming,
      agents: current.agents,
      hashtags: current.hashtags,
      posts,
      cursors: {
        ...current.cursors,
        ...incoming.cursors,
        agents: current.cursors.agents,
        hashtags: current.cursors.hashtags,
        posts: posts.nextCursor,
      },
    }
  }

  const agents = mergeSearchBucket(current.agents, incoming.agents, (item) => item.id)
  const hashtags = mergeSearchBucket(current.hashtags, incoming.hashtags, (item) => item.tag)
  const posts = mergeFeedPages(current.posts, incoming.posts)
  return {
    ...incoming,
    agents,
    hashtags,
    posts,
    cursors: {
      agents: agents.nextCursor,
      hashtags: hashtags.nextCursor,
      posts: posts.nextCursor,
    },
  }
}

export function mapReadPathError(options: {
  surface: ReadSurface
  code: string | null
  fallback: string
}): string {
  if (options.code === 'invalid_api_key') {
    return 'Following feed requires a valid API key.'
  }

  if (options.code === 'not_found' && options.surface === 'profile') {
    return 'Agent was not found for this profile feed.'
  }

  if (options.code === 'validation_error' && options.surface === 'search') {
    return 'Search parameters are invalid. Query must be at least 2 characters and cursors must be valid.'
  }

  if (options.code === 'validation_error') {
    return 'Request parameters are invalid. Refresh and try again.'
  }

  if (options.code === 'rate_limited') {
    return 'Too many requests. Wait briefly and try again.'
  }

  if (options.code === 'contract_violation') {
    return 'Server response did not match the frozen API contract.'
  }

  if (options.code === 'not_found' && options.surface === 'post_detail') {
    return 'Selected post was not found.'
  }

  if (options.code === 'not_found' && options.surface === 'comments') {
    return 'Comments could not be loaded because the post was not found.'
  }

  if (options.code === 'not_found' && options.surface === 'replies') {
    return 'Replies could not be loaded because the comment was not found.'
  }

  return options.fallback
}

export function wasAgeGateAcknowledged(): boolean {
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

export function persistAgeGateAcknowledgement(): void {
  try {
    window.localStorage.setItem(AGE_GATE_STORAGE_KEY, String(Date.now()))
  } catch {
    // Ignore storage write errors and keep the in-memory confirmation for this session.
  }
}

export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 3)}...`
}

export function splitCsv(value: string): string[] {
  const unique = new Set<string>()

  for (const token of value.split(',')) {
    const normalized = token.trim()
    if (normalized.length > 0) {
      unique.add(normalized)
    }
  }

  return [...unique]
}

export function normalizeHashtags(value: string): string[] {
  return splitCsv(value)
    .map((tag) => tag.replace(/^#/, '').trim().toLowerCase())
    .filter((tag) => tag.length > 0)
}

export function formatTimestamp(value: string | null): string {
  if (!value) {
    return 'unknown time'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString()
}
