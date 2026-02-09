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
  body: string
  authorName: string
  isHiddenByPostOwner: boolean
}

export type UiPost = {
  id: string
  caption: string
  author: UiAgent
  imageUrls: string[]
  isSensitive: boolean
  comments: UiComment[]
}

export type UiFeedPage = {
  posts: UiPost[]
  nextCursor: string | null
  hasMore: boolean
}

export type FeedQuery = {
  cursor?: string
  limit?: number
}

export type SearchType = 'agents' | 'hashtags' | 'posts' | 'all'

const ENDPOINTS = {
  explore: ['/api/v1/explore', '/explore'],
  following: ['/api/v1/feed', '/feed'],
  hashtag: (tag: string) => [
    `/api/v1/hashtags/${encodeURIComponent(tag)}/feed`,
    `/hashtags/${encodeURIComponent(tag)}/feed`,
  ],
  profilePosts: (name: string) => [
    `/api/v1/agents/${encodeURIComponent(name)}/posts`,
    `/agents/${encodeURIComponent(name)}/posts`,
  ],
  search: ['/api/v1/search', '/search'],
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null) {
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
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value > 0
  }

  if (typeof value === 'string') {
    const lowered = value.toLowerCase().trim()
    if (lowered === 'true') {
      return true
    }

    if (lowered === 'false') {
      return false
    }
  }

  return null
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function firstArray(record: Record<string, unknown>, keys: string[]): unknown[] {
  let firstEmptyArray: unknown[] | null = null

  for (const key of keys) {
    const value = record[key]
    if (!Array.isArray(value)) {
      continue
    }

    if (value.length > 0) {
      return value
    }

    if (!firstEmptyArray) {
      firstEmptyArray = value
    }
  }

  return firstEmptyArray ?? []
}

function firstString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = asString(record[key])
    if (value) {
      return value
    }
  }

  return null
}

function firstBoolean(record: Record<string, unknown>, keys: string[]): boolean | null {
  for (const key of keys) {
    const value = asBoolean(record[key])
    if (value !== null) {
      return value
    }
  }

  return null
}

function parseAgent(raw: unknown): UiAgent {
  const record = asRecord(raw) ?? {}
  const name = firstString(record, ['name', 'agent_name', 'username']) ?? 'unknown-agent'

  return {
    id: firstString(record, ['id', 'agent_id']) ?? name,
    name,
    avatarUrl: firstString(record, ['avatar', 'avatar_url', 'image_url']),
    claimed: firstBoolean(record, ['claimed', 'is_claimed', 'badge_claimed']) ?? false,
  }
}

function parseComment(raw: unknown, index: number): UiComment {
  const record = asRecord(raw) ?? {}
  const authorRecord =
    asRecord(record.author) ?? asRecord(record.agent) ?? asRecord(record.profile) ?? {}

  return {
    id: firstString(record, ['id', 'comment_id']) ?? `comment-${index}`,
    body: firstString(record, ['body', 'text', 'content']) ?? '',
    authorName:
      firstString(authorRecord, ['name', 'agent_name', 'username']) ??
      firstString(record, ['author_name', 'agent_name']) ??
      'unknown-agent',
    isHiddenByPostOwner:
      firstBoolean(record, ['is_hidden_by_post_owner', 'hidden_by_owner', 'is_hidden']) ?? false,
  }
}

function parseImageUrls(record: Record<string, unknown>): string[] {
  const direct = firstString(record, ['image_url', 'image', 'thumbnail_url'])
  const mediaCandidates = [record.images, record.image_urls, record.media]
  const urls: string[] = []

  for (const candidate of mediaCandidates) {
    for (const item of asArray(candidate)) {
      if (typeof item === 'string' && item.trim().length > 0) {
        urls.push(item)
        continue
      }

      const mediaRecord = asRecord(item)
      if (!mediaRecord) {
        continue
      }

      const maybeUrl = firstString(mediaRecord, ['url', 'image_url', 'src'])
      if (maybeUrl) {
        urls.push(maybeUrl)
      }
    }
  }

  if (urls.length === 0 && direct) {
    return [direct]
  }

  return urls
}

function parsePost(raw: unknown, index: number): UiPost {
  const record = asRecord(raw) ?? {}
  const author = parseAgent(record.author ?? record.agent ?? record.profile)
  const commentsSource = firstArray(record, ['comments', 'comment_preview', 'latest_comments'])

  return {
    id: firstString(record, ['id', 'post_id']) ?? `post-${index}`,
    caption: firstString(record, ['caption', 'text', 'body']) ?? '',
    author,
    imageUrls: parseImageUrls(record),
    isSensitive:
      firstBoolean(record, ['is_sensitive', 'sensitive', 'isSensitive', 'sensitive_blurred']) ?? false,
    comments: commentsSource.map((comment, commentIndex) => parseComment(comment, commentIndex)),
  }
}

function parseFeedPayload(payload: unknown): UiFeedPage {
  const record = asRecord(payload)

  if (!record) {
    return { posts: [], nextCursor: null, hasMore: false }
  }

  const listSource = firstArray(record, ['posts', 'items', 'results', 'data'])
  const nextCursor = firstString(record, ['next_cursor', 'nextCursor', 'cursor'])
  const hasMore = firstBoolean(record, ['has_more', 'hasMore']) ?? Boolean(nextCursor)

  return {
    posts: listSource.map((item, index) => parsePost(item, index)),
    nextCursor,
    hasMore,
  }
}

function success<TData>(status: number, data: TData, requestId: string | null): ApiSuccess<TData> {
  return { ok: true, status, data, requestId }
}

function firstFailure(failures: ApiFailure[]): ApiFailure {
  if (failures.length === 0) {
    return {
      ok: false,
      status: 0,
      error: 'No endpoint candidates were configured.',
      code: null,
      hint: null,
      requestId: null,
    }
  }

  const non404 = failures.find((item) => item.status !== 404)
  return non404 ?? failures[0]
}

async function fetchWithFallback(
  candidatePaths: string[],
  query?: Record<string, string | number | boolean | undefined>,
): Promise<ApiResult<unknown>> {
  const failures: ApiFailure[] = []

  for (const path of candidatePaths) {
    const result = await apiFetch<unknown>(path, { method: 'GET', query })
    if (result.ok) {
      return result
    }

    failures.push(result)
  }

  return firstFailure(failures)
}

async function fetchFeed(paths: string[], query?: FeedQuery): Promise<ApiResult<UiFeedPage>> {
  const result = await fetchWithFallback(paths, {
    cursor: query?.cursor,
    limit: query?.limit,
  })

  if (!result.ok) {
    return result
  }

  return success(result.status, parseFeedPayload(result.data), result.requestId)
}

export async function fetchExploreFeed(query?: FeedQuery): Promise<ApiResult<UiFeedPage>> {
  return fetchFeed(ENDPOINTS.explore, query)
}

export async function fetchFollowingFeed(query?: FeedQuery): Promise<ApiResult<UiFeedPage>> {
  return fetchFeed(ENDPOINTS.following, query)
}

export async function fetchHashtagFeed(tag: string, query?: FeedQuery): Promise<ApiResult<UiFeedPage>> {
  return fetchFeed(ENDPOINTS.hashtag(tag), query)
}

export async function fetchProfilePosts(name: string, query?: FeedQuery): Promise<ApiResult<UiFeedPage>> {
  return fetchFeed(ENDPOINTS.profilePosts(name), query)
}

export async function searchPosts(
  text: string,
  type: SearchType = 'all',
): Promise<ApiResult<UiFeedPage>> {
  const result = await fetchWithFallback(ENDPOINTS.search, {
    q: text,
    type,
  })

  if (!result.ok) {
    return result
  }

  const payload = asRecord(result.data)
  if (payload && type === 'all' && payload.posts) {
    return success(result.status, parseFeedPayload(payload.posts), result.requestId)
  }

  return success(result.status, parseFeedPayload(result.data), result.requestId)
}
