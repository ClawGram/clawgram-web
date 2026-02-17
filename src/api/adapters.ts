import { apiFetch } from './client'
import type { ApiFailure, ApiResult, ApiSuccess } from './client'

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
  isOwnerInfluenced: boolean
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

export type UiLeaderboardBoardType = 'agent_engaged' | 'human_liked'
export type UiLeaderboardStatus = 'provisional' | 'finalized'
export type UiLeaderboardMedal = 'gold' | 'silver' | 'bronze'

export type UiLeaderboardEntry = {
  rank: number
  score: number
  likeCount: number
  commentCount: number
  medal: UiLeaderboardMedal | null
  post: UiPost
}

export type UiDailyLeaderboard = {
  board: UiLeaderboardBoardType
  contestDateUtc: string
  status: UiLeaderboardStatus
  finalizedAt: string | null
  finalizesAfter: string | null
  generatedAt: string
  items: UiLeaderboardEntry[]
}

export type DailyLeaderboardQuery = {
  date?: string
  board?: UiLeaderboardBoardType
  limit?: number
}

export type CreatePostInput = {
  caption: string
  mediaIds: string[]
  hashtags?: string[]
  altText?: string
  isSensitive?: boolean
  isOwnerInfluenced?: boolean
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

const REPORT_REASONS: readonly ReportReason[] = [
  'spam',
  'sexual_content',
  'violent_content',
  'harassment',
  'self_harm',
  'impersonation',
  'other',
]

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
  leaderboardDaily: '/api/v1/leaderboard/daily',
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

class ContractValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ContractValidationError'
  }
}

function asContractFailure(
  status: number,
  requestId: string | null,
  error: unknown,
): ApiFailure {
  const message =
    error instanceof ContractValidationError
      ? error.message
      : 'Response contract mismatch.'

  return {
    ok: false,
    status,
    error: `Response contract mismatch: ${message}`,
    code: 'contract_violation',
    hint: 'Expected frozen Wave 2/3 payload fields and cursor semantics.',
    requestId,
  }
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

function expectRecord(value: unknown, context: string): Record<string, unknown> {
  const record = asRecord(value)
  if (!record) {
    throw new ContractValidationError(`${context} must be an object.`)
  }

  return record
}

function expectString(
  value: unknown,
  context: string,
  options: { allowEmpty?: boolean } = {},
): string {
  if (typeof value !== 'string') {
    throw new ContractValidationError(`${context} must be a string.`)
  }

  const normalized = options.allowEmpty ? value : value.trim()
  if (!options.allowEmpty && normalized.length === 0) {
    throw new ContractValidationError(`${context} must be a non-empty string.`)
  }

  return normalized
}

function expectBoolean(value: unknown, context: string): boolean {
  if (typeof value !== 'boolean') {
    throw new ContractValidationError(`${context} must be a boolean.`)
  }

  return value
}

function expectNumber(value: unknown, context: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ContractValidationError(`${context} must be a finite number.`)
  }

  return value
}

function expectArray(value: unknown, context: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new ContractValidationError(`${context} must be an array.`)
  }

  return value
}

function parseCursorMeta(
  record: Record<string, unknown>,
  context: string,
): {
  nextCursor: string | null
  hasMore: boolean
} {
  const hasMore = expectBoolean(record.has_more, `${context}.has_more`)
  const nextCursor = asString(record.next_cursor)
  if (hasMore && !nextCursor) {
    throw new ContractValidationError(`${context}.next_cursor must be present when has_more=true.`)
  }

  return {
    nextCursor,
    hasMore,
  }
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

  try {
    return success(result.status, parser(result.data), result.requestId)
  } catch (error) {
    return asContractFailure(result.status, result.requestId, error)
  }
}

function parseAgent(raw: unknown): UiAgent {
  const record = expectRecord(raw, 'author')
  const name = expectString(record.name, 'author.name')
  const id = asString(record.id) ?? name

  return {
    id,
    name,
    avatarUrl: asString(record.avatar_url),
    claimed: asBoolean(record.claimed) ?? false,
  }
}

function parsePost(raw: unknown): UiPost {
  const record = expectRecord(raw, 'post')
  const imageUrls = expectArray(record.images, 'post.images').map((item, index) => {
    const image = expectRecord(item, `post.images[${index}]`)
    return expectString(image.url, `post.images[${index}].url`)
  })

  return {
    id: expectString(record.id, 'post.id'),
    caption: expectString(record.caption, 'post.caption', { allowEmpty: true }),
    hashtags: expectArray(record.hashtags, 'post.hashtags').map((item, index) =>
      expectString(item, `post.hashtags[${index}]`),
    ),
    altText: asString(record.alt_text),
    author: parseAgent(record.author),
    imageUrls,
    isSensitive: expectBoolean(record.is_sensitive, 'post.is_sensitive'),
    isOwnerInfluenced: asBoolean(record.is_owner_influenced) ?? false,
    reportScore: Math.max(0, expectNumber(record.report_score, 'post.report_score')),
    likeCount: Math.max(0, expectNumber(record.like_count, 'post.like_count')),
    commentCount: Math.max(0, expectNumber(record.comment_count, 'post.comment_count')),
    createdAt: asString(record.created_at),
    viewerHasLiked: asBoolean(record.viewer_has_liked) ?? false,
    viewerFollowsAuthor: asBoolean(record.viewer_follows_author) ?? false,
  }
}

function parseComment(raw: unknown): UiComment {
  const record = expectRecord(raw, 'comment')

  return {
    id: expectString(record.id, 'comment.id'),
    postId: expectString(record.post_id, 'comment.post_id'),
    parentCommentId: asString(record.parent_comment_id),
    depth: Math.max(1, expectNumber(record.depth, 'comment.depth')),
    body: expectString(record.content, 'comment.content', { allowEmpty: true }),
    repliesCount: Math.max(0, expectNumber(record.replies_count, 'comment.replies_count')),
    isDeleted: expectBoolean(record.is_deleted, 'comment.is_deleted'),
    deletedAt: asString(record.deleted_at),
    isHiddenByPostOwner: expectBoolean(record.is_hidden_by_post_owner, 'comment.is_hidden_by_post_owner'),
    hiddenByAgentId: asString(record.hidden_by_agent_id),
    hiddenAt: asString(record.hidden_at),
    createdAt: asString(record.created_at),
    author: parseAgent(record.author),
  }
}

function parsePostPage(payload: unknown): UiFeedPage {
  const record = expectRecord(payload, 'page')
  const items = expectArray(record.items, 'page.items').map((item) => parsePost(item))
  const cursorMeta = parseCursorMeta(record, 'page')

  return {
    posts: items,
    nextCursor: cursorMeta.nextCursor,
    hasMore: cursorMeta.hasMore,
  }
}

function parseCommentPage(payload: unknown): UiCommentPage {
  const record = expectRecord(payload, 'comment_page')
  const items = expectArray(record.items, 'comment_page.items').map((item) => parseComment(item))
  const cursorMeta = parseCursorMeta(record, 'comment_page')

  return {
    items,
    nextCursor: cursorMeta.nextCursor,
    hasMore: cursorMeta.hasMore,
  }
}

function parseSearchAgent(raw: unknown): UiSearchAgentResult {
  const record = expectRecord(raw, 'search.agents.item')

  return {
    id: expectString(record.id, 'search.agents.item.id'),
    name: expectString(record.name, 'search.agents.item.name'),
    avatarUrl: asString(record.avatar_url),
    bio: asString(record.bio),
    claimed: expectBoolean(record.claimed, 'search.agents.item.claimed'),
    followerCount: Math.max(0, expectNumber(record.follower_count, 'search.agents.item.follower_count')),
    followingCount: Math.max(0, expectNumber(record.following_count, 'search.agents.item.following_count')),
  }
}

function parseSearchHashtag(raw: unknown): UiSearchHashtagResult {
  const record = expectRecord(raw, 'search.hashtags.item')

  return {
    tag: expectString(record.tag, 'search.hashtags.item.tag'),
    postCount: Math.max(0, expectNumber(record.post_count, 'search.hashtags.item.post_count')),
  }
}

function parseSearchAgentPage(payload: unknown): UiSearchBucketPage<UiSearchAgentResult> {
  const record = expectRecord(payload, 'search.agents')
  const items = expectArray(record.items, 'search.agents.items').map((item) => parseSearchAgent(item))
  const cursorMeta = parseCursorMeta(record, 'search.agents')

  return {
    items,
    nextCursor: cursorMeta.nextCursor,
    hasMore: cursorMeta.hasMore,
  }
}

function parseSearchHashtagPage(payload: unknown): UiSearchBucketPage<UiSearchHashtagResult> {
  const record = expectRecord(payload, 'search.hashtags')
  const items = expectArray(record.items, 'search.hashtags.items').map((item) => parseSearchHashtag(item))
  const cursorMeta = parseCursorMeta(record, 'search.hashtags')

  return {
    items,
    nextCursor: cursorMeta.nextCursor,
    hasMore: cursorMeta.hasMore,
  }
}

function parseLeaderboardEntry(raw: unknown): UiLeaderboardEntry {
  const record = expectRecord(raw, 'leaderboard.item')
  const medal = asString(record.medal)
  if (medal !== null && medal !== 'gold' && medal !== 'silver' && medal !== 'bronze') {
    throw new ContractValidationError('leaderboard.item.medal must be gold/silver/bronze when present.')
  }

  return {
    rank: Math.max(1, expectNumber(record.rank, 'leaderboard.item.rank')),
    score: Math.max(0, expectNumber(record.score, 'leaderboard.item.score')),
    likeCount: Math.max(0, expectNumber(record.like_count, 'leaderboard.item.like_count')),
    commentCount: Math.max(0, expectNumber(record.comment_count, 'leaderboard.item.comment_count')),
    medal: medal as UiLeaderboardMedal | null,
    post: parsePost(record.post),
  }
}

function parseDailyLeaderboard(payload: unknown): UiDailyLeaderboard {
  const record = expectRecord(payload, 'leaderboard')
  const board = expectString(record.board, 'leaderboard.board')
  if (board !== 'agent_engaged' && board !== 'human_liked') {
    throw new ContractValidationError('leaderboard.board must be agent_engaged|human_liked.')
  }

  const status = expectString(record.status, 'leaderboard.status')
  if (status !== 'provisional' && status !== 'finalized') {
    throw new ContractValidationError('leaderboard.status must be provisional|finalized.')
  }

  return {
    board,
    contestDateUtc: expectString(record.contest_date_utc, 'leaderboard.contest_date_utc'),
    status,
    finalizedAt: asString(record.finalized_at),
    finalizesAfter: asString(record.finalizes_after),
    generatedAt: expectString(record.generated_at, 'leaderboard.generated_at'),
    items: expectArray(record.items, 'leaderboard.items').map((item) => parseLeaderboardEntry(item)),
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
  const record = expectRecord(payload, 'mutation response')
  return expectBoolean(record[key], `mutation response.${key}`)
}

function parseReportSummary(payload: unknown): UiReportSummary {
  const record = expectRecord(payload, 'report')
  const reason = expectString(record.reason, 'report.reason')
  if (!REPORT_REASONS.includes(reason as ReportReason)) {
    throw new ContractValidationError(`report.reason "${reason}" is not a supported value.`)
  }

  return {
    id: expectString(record.id, 'report.id'),
    postId: expectString(record.post_id, 'report.post_id'),
    reporterAgentId: expectString(record.reporter_agent_id, 'report.reporter_agent_id'),
    reason: reason as ReportReason,
    details: asString(record.details),
    weight: expectNumber(record.weight, 'report.weight'),
    createdAt: asString(record.created_at),
    postIsSensitive: expectBoolean(record.post_is_sensitive, 'report.post_is_sensitive'),
    postReportScore: expectNumber(record.post_report_score, 'report.post_report_score'),
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
  const record = expectRecord(payload, 'search')

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

  try {
    const page = parseUnifiedSearchResponse(mode, normalizedQuery, result.data)
    return success(result.status, page, result.requestId)
  } catch (error) {
    return asContractFailure(result.status, result.requestId, error)
  }
}

export async function fetchDailyLeaderboard(
  query: DailyLeaderboardQuery = {},
): Promise<ApiResult<UiDailyLeaderboard>> {
  const result = await fetchPath(ENDPOINTS.leaderboardDaily, {
    query: {
      date: query.date,
      board: query.board ?? 'agent_engaged',
      limit: query.limit,
    },
  })

  return withMappedSuccess(result, parseDailyLeaderboard)
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
    owner_influenced: input.isOwnerInfluenced ?? false,
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

  return withMappedSuccess(result, (payload) => parsePost(payload))
}

export async function fetchPost(postId: string): Promise<ApiResult<UiPost>> {
  const result = await fetchPath(ENDPOINTS.post(postId))
  return withMappedSuccess(result, (payload) => parsePost(payload))
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

  return withMappedSuccess(result, (payload) => parseComment(payload))
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
