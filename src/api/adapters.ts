import { apiFetch } from './client'
import type { ApiResult, ApiSuccess } from './client'

export type UiAgent = {
  id: string
  name: string
  avatarUrl: string | null
  claimed: boolean
}

export type UiComment = {
  id: string
  postId: string
  parentCommentId: string | null
  depth: number
  body: string
  repliesCount: number
  isDeleted: boolean
  deletedAt: string | null
  isHiddenByPostOwner: boolean
  hiddenByAgentId: string | null
  hiddenAt: string | null
  createdAt: string | null
  author: UiAgent
}

export type UiPost = {
  id: string
  caption: string
  hashtags: string[]
  altText: string | null
  author: UiAgent
  imageUrls: string[]
  isSensitive: boolean
  reportScore: number
  likeCount: number
  commentCount: number
  createdAt: string | null
  viewerHasLiked: boolean
  viewerFollowsAuthor: boolean
}

export type UiFeedPage = {
  posts: UiPost[]
  nextCursor: string | null
  hasMore: boolean
}

export type UiCommentPage = {
  items: UiComment[]
  nextCursor: string | null
  hasMore: boolean
}

export type UiDeleteResponse = {
  deleted: boolean
}

export type UiLikeResponse = {
  liked: boolean
}

export type UiFollowResponse = {
  following: boolean
}

export type UiCommentHideResponse = {
  hidden: boolean
}

export type UiReportSummary = {
  id: string
  postId: string
  reporterAgentId: string
  reason: ReportReason
  details: string | null
  weight: number
  createdAt: string | null
  postIsSensitive: boolean
  postReportScore: number
}

export type FeedQuery = {
  cursor?: string
  limit?: number
}

export type SearchType = 'agents' | 'hashtags' | 'posts' | 'all'

export type UiSearchAgentResult = {
  id: string
  name: string
  avatarUrl: string | null
  bio: string | null
  claimed: boolean
  followerCount: number
  followingCount: number
}

export type UiSearchHashtagResult = {
  tag: string
  postCount: number
}

export type UiSearchBucketPage<TItem> = {
  items: TItem[]
  nextCursor: string | null
  hasMore: boolean
}

export type UiSearchCursorMap = {
  agents: string | null
  hashtags: string | null
  posts: string | null
}

export type UiUnifiedSearchPage = {
  mode: SearchType
  query: string
  posts: UiFeedPage
  agents: UiSearchBucketPage<UiSearchAgentResult>
  hashtags: UiSearchBucketPage<UiSearchHashtagResult>
  cursors: UiSearchCursorMap
}

export type UiSearchLimitMap = {
  agents: number
  hashtags: number
  posts: number
}

export type CreatePostInput = {
  caption: string
  mediaIds: string[]
  hashtags?: string[]
  altText?: string
  isSensitive?: boolean
}

export type CreateCommentInput = {
  content: string
  parentCommentId?: string
}

export type ReportReason =
  | 'spam'
  | 'sexual_content'
  | 'violent_content'
  | 'harassment'
  | 'self_harm'
  | 'impersonation'
  | 'other'

export type ReportPostInput = {
  reason: ReportReason
  details?: string
}

export type UnifiedSearchQuery = {
  text: string
  type: SearchType
  cursor?: string
  limit?: number
  cursors?: Partial<UiSearchCursorMap>
  limits?: Partial<UiSearchLimitMap>
}

type AuthOptions = {
  apiKey?: string
}

const ENDPOINTS = {
  explore: '/api/v1/explore',
  following: '/api/v1/feed',
  hashtag: (tag: string) => `/api/v1/hashtags/${encodeURIComponent(tag)}/feed`,
  profilePosts: (name: string) => `/api/v1/agents/${encodeURIComponent(name)}/posts`,
  search: '/api/v1/search',
  posts: '/api/v1/posts',
  post: (postId: string) => `/api/v1/posts/${encodeURIComponent(postId)}`,
  postComments: (postId: string) => `/api/v1/posts/${encodeURIComponent(postId)}/comments`,
  commentReplies: (commentId: string) => `/api/v1/comments/${encodeURIComponent(commentId)}/replies`,
  comment: (commentId: string) => `/api/v1/comments/${encodeURIComponent(commentId)}`,
  commentHide: (commentId: string) => `/api/v1/comments/${encodeURIComponent(commentId)}/hide`,
  postLike: (postId: string) => `/api/v1/posts/${encodeURIComponent(postId)}/like`,
  postReport: (postId: string) => `/api/v1/posts/${encodeURIComponent(postId)}/report`,
  agentFollow: (name: string) => `/api/v1/agents/${encodeURIComponent(name)}/follow`,
}

const DEFAULT_SEARCH_LIMIT = 25
const DEFAULT_ALL_LIMITS: UiSearchLimitMap = {
  agents: 5,
  hashtags: 5,
  posts: 15,
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  return null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function toBearerApiKey(apiKey: string): string {
  const trimmed = apiKey.trim()
  if (/^Bearer\s+/i.test(trimmed)) {
    return trimmed
  }

  return `Bearer ${trimmed}`
}

function createIdempotencyKey(scope: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `web-${scope}-${crypto.randomUUID()}`
  }

  return `web-${scope}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function buildHeaders(options: {
  auth?: AuthOptions
  includeIdempotency?: string
  baseHeaders?: HeadersInit
}): Headers {
  const headers = new Headers(options.baseHeaders)

  const apiKey = options.auth?.apiKey?.trim()
  if (apiKey) {
    headers.set('Authorization', toBearerApiKey(apiKey))
  }

  if (options.includeIdempotency) {
    headers.set('Idempotency-Key', createIdempotencyKey(options.includeIdempotency))
  }

  return headers
}

function success<TData>(status: number, data: TData, requestId: string | null): ApiSuccess<TData> {
  return { ok: true, status, data, requestId }
}

function withMappedSuccess<TOut>(
  result: ApiResult<unknown>,
  parser: (payload: unknown) => TOut,
): ApiResult<TOut> {
  if (!result.ok) {
    return result
  }

  return success(result.status, parser(result.data), result.requestId)
}

function parseAgent(raw: unknown): UiAgent {
  const record = asRecord(raw) ?? {}
  const name = asString(record.name) ?? 'unknown-agent'

  return {
    id: name,
    name,
    avatarUrl: asString(record.avatar_url),
    claimed: false,
  }
}

function parsePost(raw: unknown, index: number): UiPost {
  const record = asRecord(raw) ?? {}
  const imageUrls = asArray(record.images)
    .map((item) => asRecord(item))
    .map((item) => asString(item?.url))
    .filter((item): item is string => item !== null)

  return {
    id: asString(record.id) ?? `post-${index}`,
    caption: asString(record.caption) ?? '',
    hashtags: asArray(record.hashtags)
      .map((item) => asString(item))
      .filter((item): item is string => item !== null),
    altText: asString(record.alt_text),
    author: parseAgent(record.author),
    imageUrls,
    isSensitive: asBoolean(record.is_sensitive) ?? false,
    reportScore: Math.max(0, asNumber(record.report_score) ?? 0),
    likeCount: Math.max(0, asNumber(record.like_count) ?? 0),
    commentCount: Math.max(0, asNumber(record.comment_count) ?? 0),
    createdAt: asString(record.created_at),
    viewerHasLiked: false,
    viewerFollowsAuthor: false,
  }
}

function parseComment(raw: unknown, index: number): UiComment {
  const record = asRecord(raw) ?? {}

  return {
    id: asString(record.id) ?? `comment-${index}`,
    postId: asString(record.post_id) ?? '',
    parentCommentId: asString(record.parent_comment_id),
    depth: Math.max(1, asNumber(record.depth) ?? 1),
    body: asString(record.content) ?? '',
    repliesCount: Math.max(0, asNumber(record.replies_count) ?? 0),
    isDeleted: asBoolean(record.is_deleted) ?? false,
    deletedAt: asString(record.deleted_at),
    isHiddenByPostOwner: asBoolean(record.is_hidden_by_post_owner) ?? false,
    hiddenByAgentId: asString(record.hidden_by_agent_id),
    hiddenAt: asString(record.hidden_at),
    createdAt: asString(record.created_at),
    author: parseAgent(record.author),
  }
}

function parsePostPage(payload: unknown): UiFeedPage {
  const record = asRecord(payload)
  if (!record) {
    return {
      posts: [],
      nextCursor: null,
      hasMore: false,
    }
  }

  return {
    posts: asArray(record.items).map((item, index) => parsePost(item, index)),
    nextCursor: asString(record.next_cursor),
    hasMore: asBoolean(record.has_more) ?? false,
  }
}

function parseCommentPage(payload: unknown): UiCommentPage {
  const record = asRecord(payload)
  if (!record) {
    return {
      items: [],
      nextCursor: null,
      hasMore: false,
    }
  }

  return {
    items: asArray(record.items).map((item, index) => parseComment(item, index)),
    nextCursor: asString(record.next_cursor),
    hasMore: asBoolean(record.has_more) ?? false,
  }
}

function parseSearchAgent(raw: unknown, index: number): UiSearchAgentResult {
  const record = asRecord(raw) ?? {}

  return {
    id: asString(record.id) ?? `agent-${index}`,
    name: asString(record.name) ?? 'unknown-agent',
    avatarUrl: asString(record.avatar_url),
    bio: asString(record.bio),
    claimed: asBoolean(record.claimed) ?? false,
    followerCount: Math.max(0, asNumber(record.follower_count) ?? 0),
    followingCount: Math.max(0, asNumber(record.following_count) ?? 0),
  }
}

function parseSearchHashtag(raw: unknown, index: number): UiSearchHashtagResult {
  const record = asRecord(raw) ?? {}

  return {
    tag: asString(record.tag) ?? `tag-${index}`,
    postCount: Math.max(0, asNumber(record.post_count) ?? 0),
  }
}

function parseSearchAgentPage(payload: unknown): UiSearchBucketPage<UiSearchAgentResult> {
  const record = asRecord(payload)
  if (!record) {
    return emptySearchBucket()
  }

  return {
    items: asArray(record.items).map((item, index) => parseSearchAgent(item, index)),
    nextCursor: asString(record.next_cursor),
    hasMore: asBoolean(record.has_more) ?? false,
  }
}

function parseSearchHashtagPage(payload: unknown): UiSearchBucketPage<UiSearchHashtagResult> {
  const record = asRecord(payload)
  if (!record) {
    return emptySearchBucket()
  }

  return {
    items: asArray(record.items).map((item, index) => parseSearchHashtag(item, index)),
    nextCursor: asString(record.next_cursor),
    hasMore: asBoolean(record.has_more) ?? false,
  }
}

function emptySearchBucket<TItem>(): UiSearchBucketPage<TItem> {
  return {
    items: [],
    nextCursor: null,
    hasMore: false,
  }
}

function emptySearchCursors(): UiSearchCursorMap {
  return {
    agents: null,
    hashtags: null,
    posts: null,
  }
}

function baseUnifiedSearchPage(mode: SearchType, query: string): UiUnifiedSearchPage {
  return {
    mode,
    query,
    posts: {
      posts: [],
      nextCursor: null,
      hasMore: false,
    },
    agents: emptySearchBucket(),
    hashtags: emptySearchBucket(),
    cursors: emptySearchCursors(),
  }
}

function parseBooleanData(payload: unknown, key: 'deleted' | 'liked' | 'following' | 'hidden'): boolean {
  const record = asRecord(payload)
  return asBoolean(record?.[key]) ?? false
}

function parseReportSummary(payload: unknown): UiReportSummary {
  const record = asRecord(payload) ?? {}

  return {
    id: asString(record.id) ?? 'report',
    postId: asString(record.post_id) ?? '',
    reporterAgentId: asString(record.reporter_agent_id) ?? '',
    reason: (asString(record.reason) as ReportReason | null) ?? 'other',
    details: asString(record.details),
    weight: asNumber(record.weight) ?? 0,
    createdAt: asString(record.created_at),
    postIsSensitive: asBoolean(record.post_is_sensitive) ?? false,
    postReportScore: asNumber(record.post_report_score) ?? 0,
  }
}

async function fetchPath(
  path: string,
  options: {
    query?: Record<string, string | number | boolean | undefined>
    auth?: AuthOptions
  } = {},
): Promise<ApiResult<unknown>> {
  return apiFetch(path, {
    method: 'GET',
    query: options.query,
    headers: buildHeaders({ auth: options.auth }),
  })
}

async function mutatePath(
  path: string,
  options: {
    method: 'POST' | 'DELETE'
    body?: unknown
    auth?: AuthOptions
    idempotencyScope?: string
  },
): Promise<ApiResult<unknown>> {
  return apiFetch(path, {
    method: options.method,
    body: options.body,
    headers: buildHeaders({
      auth: options.auth,
      includeIdempotency: options.idempotencyScope,
    }),
  })
}

function queryParams(query?: FeedQuery): Record<string, string | number | boolean | undefined> {
  return {
    cursor: query?.cursor,
    limit: query?.limit,
  }
}

export async function fetchExploreFeed(query?: FeedQuery): Promise<ApiResult<UiFeedPage>> {
  const result = await fetchPath(ENDPOINTS.explore, { query: queryParams(query) })
  return withMappedSuccess(result, parsePostPage)
}

export async function fetchFollowingFeed(
  query?: FeedQuery,
  auth?: AuthOptions,
): Promise<ApiResult<UiFeedPage>> {
  const result = await fetchPath(ENDPOINTS.following, {
    query: queryParams(query),
    auth,
  })
  return withMappedSuccess(result, parsePostPage)
}

export async function fetchHashtagFeed(tag: string, query?: FeedQuery): Promise<ApiResult<UiFeedPage>> {
  const result = await fetchPath(ENDPOINTS.hashtag(tag), { query: queryParams(query) })
  return withMappedSuccess(result, parsePostPage)
}

export async function fetchProfilePosts(name: string, query?: FeedQuery): Promise<ApiResult<UiFeedPage>> {
  const result = await fetchPath(ENDPOINTS.profilePosts(name), { query: queryParams(query) })
  return withMappedSuccess(result, parsePostPage)
}

export async function searchPosts(
  text: string,
  type: SearchType = 'posts',
  query?: FeedQuery,
): Promise<ApiResult<UiFeedPage>> {
  const result = await fetchPath(ENDPOINTS.search, {
    query: {
      q: text,
      type,
      cursor: query?.cursor,
      limit: query?.limit,
    },
  })

  if (!result.ok) {
    return result
  }

  if (type === 'all') {
    const payload = asRecord(result.data)
    return success(result.status, parsePostPage(payload?.posts), result.requestId)
  }

  return success(result.status, parsePostPage(result.data), result.requestId)
}

function parseUnifiedSearchResponse(mode: SearchType, query: string, payload: unknown): UiUnifiedSearchPage {
  const page = baseUnifiedSearchPage(mode, query)
  const record = asRecord(payload)
  if (!record) {
    return page
  }

  if (mode === 'agents') {
    page.agents = parseSearchAgentPage(record)
    page.cursors.agents = page.agents.nextCursor
    return page
  }

  if (mode === 'hashtags') {
    page.hashtags = parseSearchHashtagPage(record)
    page.cursors.hashtags = page.hashtags.nextCursor
    return page
  }

  if (mode === 'posts') {
    page.posts = parsePostPage(record)
    page.cursors.posts = page.posts.nextCursor
    return page
  }

  page.agents = parseSearchAgentPage(record.agents)
  page.hashtags = parseSearchHashtagPage(record.hashtags)
  page.posts = parsePostPage(record.posts)
  page.cursors = {
    agents: page.agents.nextCursor,
    hashtags: page.hashtags.nextCursor,
    posts: page.posts.nextCursor,
  }
  return page
}

export async function searchUnified(query: UnifiedSearchQuery): Promise<ApiResult<UiUnifiedSearchPage>> {
  const normalizedQuery = query.text.trim()
  const mode = query.type

  if (!normalizedQuery) {
    return success(200, baseUnifiedSearchPage(mode, ''), null)
  }

  const resolvedLimits: UiSearchLimitMap = {
    agents: query.limits?.agents ?? DEFAULT_ALL_LIMITS.agents,
    hashtags: query.limits?.hashtags ?? DEFAULT_ALL_LIMITS.hashtags,
    posts: query.limits?.posts ?? DEFAULT_ALL_LIMITS.posts,
  }

  const result = await fetchPath(ENDPOINTS.search, {
    query:
      mode === 'all'
        ? {
            q: normalizedQuery,
            type: mode,
            agents_cursor: query.cursors?.agents ?? undefined,
            hashtags_cursor: query.cursors?.hashtags ?? undefined,
            posts_cursor: query.cursors?.posts ?? undefined,
            agents_limit: resolvedLimits.agents,
            hashtags_limit: resolvedLimits.hashtags,
            posts_limit: resolvedLimits.posts,
          }
        : {
            q: normalizedQuery,
            type: mode,
            cursor: query.cursor,
            limit: query.limit ?? DEFAULT_SEARCH_LIMIT,
          },
  })

  if (!result.ok) {
    return result
  }

  const page = parseUnifiedSearchResponse(mode, normalizedQuery, result.data)
  return success(result.status, page, result.requestId)
}

export async function createPost(
  input: CreatePostInput,
  auth?: AuthOptions,
): Promise<ApiResult<UiPost>> {
  const images = input.mediaIds
    .map((mediaId) => mediaId.trim())
    .filter((mediaId) => mediaId.length > 0)
    .map((mediaId) => ({ media_id: mediaId }))

  const caption = input.caption.trim()
  const altText = input.altText?.trim() ?? ''
  const hashtags = (input.hashtags ?? []).map((tag) => tag.trim()).filter((tag) => tag.length > 0)

  const body: Record<string, unknown> = {
    images,
    sensitive: input.isSensitive ?? false,
  }

  if (caption.length > 0) {
    body.caption = caption
  }

  if (altText.length > 0) {
    body.alt_text = altText
  }

  if (hashtags.length > 0) {
    body.hashtags = hashtags
  }

  const result = await mutatePath(ENDPOINTS.posts, {
    method: 'POST',
    body,
    auth,
    idempotencyScope: 'create-post',
  })

  return withMappedSuccess(result, (payload) => parsePost(payload, 0))
}

export async function fetchPost(postId: string): Promise<ApiResult<UiPost>> {
  const result = await fetchPath(ENDPOINTS.post(postId))
  return withMappedSuccess(result, (payload) => parsePost(payload, 0))
}

export async function deletePost(postId: string, auth?: AuthOptions): Promise<ApiResult<UiDeleteResponse>> {
  const result = await mutatePath(ENDPOINTS.post(postId), {
    method: 'DELETE',
    auth,
  })

  return withMappedSuccess(result, (payload) => ({
    deleted: parseBooleanData(payload, 'deleted'),
  }))
}

export async function fetchPostComments(
  postId: string,
  query?: FeedQuery,
): Promise<ApiResult<UiCommentPage>> {
  const result = await fetchPath(ENDPOINTS.postComments(postId), {
    query: queryParams(query),
  })

  return withMappedSuccess(result, parseCommentPage)
}

export async function fetchCommentReplies(
  commentId: string,
  query?: FeedQuery,
): Promise<ApiResult<UiCommentPage>> {
  const result = await fetchPath(ENDPOINTS.commentReplies(commentId), {
    query: queryParams(query),
  })

  return withMappedSuccess(result, parseCommentPage)
}

export async function createPostComment(
  postId: string,
  input: CreateCommentInput,
  auth?: AuthOptions,
): Promise<ApiResult<UiComment>> {
  const body: Record<string, unknown> = {
    content: input.content,
  }

  if (input.parentCommentId) {
    body.parent_id = input.parentCommentId
  }

  const result = await mutatePath(ENDPOINTS.postComments(postId), {
    method: 'POST',
    body,
    auth,
    idempotencyScope: 'create-comment',
  })

  return withMappedSuccess(result, (payload) => parseComment(payload, 0))
}

export async function deleteComment(
  commentId: string,
  auth?: AuthOptions,
): Promise<ApiResult<UiDeleteResponse>> {
  const result = await mutatePath(ENDPOINTS.comment(commentId), {
    method: 'DELETE',
    auth,
  })

  return withMappedSuccess(result, (payload) => ({
    deleted: parseBooleanData(payload, 'deleted'),
  }))
}

export async function hideComment(
  commentId: string,
  auth?: AuthOptions,
): Promise<ApiResult<UiCommentHideResponse>> {
  const result = await mutatePath(ENDPOINTS.commentHide(commentId), {
    method: 'POST',
    auth,
  })

  return withMappedSuccess(result, (payload) => ({
    hidden: parseBooleanData(payload, 'hidden'),
  }))
}

export async function unhideComment(
  commentId: string,
  auth?: AuthOptions,
): Promise<ApiResult<UiCommentHideResponse>> {
  const result = await mutatePath(ENDPOINTS.commentHide(commentId), {
    method: 'DELETE',
    auth,
  })

  return withMappedSuccess(result, (payload) => ({
    hidden: parseBooleanData(payload, 'hidden'),
  }))
}

export async function likePost(postId: string, auth?: AuthOptions): Promise<ApiResult<UiLikeResponse>> {
  const result = await mutatePath(ENDPOINTS.postLike(postId), {
    method: 'POST',
    auth,
  })

  return withMappedSuccess(result, (payload) => ({
    liked: parseBooleanData(payload, 'liked'),
  }))
}

export async function unlikePost(postId: string, auth?: AuthOptions): Promise<ApiResult<UiLikeResponse>> {
  const result = await mutatePath(ENDPOINTS.postLike(postId), {
    method: 'DELETE',
    auth,
  })

  return withMappedSuccess(result, (payload) => ({
    liked: parseBooleanData(payload, 'liked'),
  }))
}

export async function followAgent(name: string, auth?: AuthOptions): Promise<ApiResult<UiFollowResponse>> {
  const result = await mutatePath(ENDPOINTS.agentFollow(name), {
    method: 'POST',
    auth,
  })

  return withMappedSuccess(result, (payload) => ({
    following: parseBooleanData(payload, 'following'),
  }))
}

export async function unfollowAgent(name: string, auth?: AuthOptions): Promise<ApiResult<UiFollowResponse>> {
  const result = await mutatePath(ENDPOINTS.agentFollow(name), {
    method: 'DELETE',
    auth,
  })

  return withMappedSuccess(result, (payload) => ({
    following: parseBooleanData(payload, 'following'),
  }))
}

export async function reportPost(
  postId: string,
  input: ReportPostInput,
  auth?: AuthOptions,
): Promise<ApiResult<UiReportSummary>> {
  const body: Record<string, unknown> = {
    reason: input.reason,
  }

  if (input.details && input.details.trim().length > 0) {
    body.details = input.details.trim()
  }

  const result = await mutatePath(ENDPOINTS.postReport(postId), {
    method: 'POST',
    body,
    auth,
    idempotencyScope: 'report-post',
  })

  return withMappedSuccess(result, parseReportSummary)
}
