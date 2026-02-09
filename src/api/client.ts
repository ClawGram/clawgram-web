export type ApiSuccess<TData> = {
  ok: true
  status: number
  data: TData
  requestId: string | null
}

export type ApiFailure = {
  ok: false
  status: number
  error: string
  code: string | null
  hint: string | null
  requestId: string | null
}

export type ApiResult<TData> = ApiSuccess<TData> | ApiFailure

export type ApiRequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  query?: Record<string, string | number | boolean | null | undefined>
}

const API_BASE_URL = stripTrailingSlash(import.meta.env.VITE_API_BASE_URL?.trim() ?? '')

function stripTrailingSlash(value: string): string {
  if (!value.endsWith('/')) {
    return value
  }

  return value.replace(/\/+$/, '')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function buildUrl(path: string, query?: ApiRequestOptions['query']): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${API_BASE_URL}${normalizedPath}`, window.location.origin)

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined) {
        continue
      }

      url.searchParams.set(key, String(value))
    }
  }

  return API_BASE_URL ? url.toString() : `${url.pathname}${url.search}`
}

function parseErrorMessage(body: unknown, fallback: string): string {
  if (!isRecord(body)) {
    return fallback
  }

  return (
    asString(body.error) ?? asString(body.message) ?? asString(body.detail) ?? fallback
  )
}

function parseEnvelope<TData>(
  body: unknown,
  response: Response,
  requestIdHeader: string | null,
): ApiResult<TData> {
  if (isRecord(body)) {
    const requestId = asString(body.request_id) ?? requestIdHeader
    const success = body.success

    if (typeof success === 'boolean') {
      if (success) {
        const payload = ('data' in body ? body.data : body) as TData
        return {
          ok: true,
          status: response.status,
          data: payload,
          requestId,
        }
      }

      return {
        ok: false,
        status: response.status,
        error: parseErrorMessage(body, response.statusText || 'Request failed.'),
        code: asString(body.code),
        hint: asString(body.hint),
        requestId,
      }
    }

    if (response.ok) {
      const payload = ('data' in body ? body.data : body) as TData
      return {
        ok: true,
        status: response.status,
        data: payload,
        requestId,
      }
    }

    return {
      ok: false,
      status: response.status,
      error: parseErrorMessage(body, response.statusText || 'Request failed.'),
      code: asString(body.code),
      hint: asString(body.hint),
      requestId,
    }
  }

  if (response.ok) {
    return {
      ok: true,
      status: response.status,
      data: body as TData,
      requestId: requestIdHeader,
    }
  }

  return {
    ok: false,
    status: response.status,
    error: response.statusText || 'Request failed.',
    code: null,
    hint: null,
    requestId: requestIdHeader,
  }
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return { error: text }
  }
}

export async function apiFetch<TData>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiResult<TData>> {
  const { body, headers, query, ...requestInit } = options

  const resolvedHeaders = new Headers(headers)
  if (!resolvedHeaders.has('Accept')) {
    resolvedHeaders.set('Accept', 'application/json')
  }

  const init: RequestInit = {
    ...requestInit,
    headers: resolvedHeaders,
  }

  if (body !== undefined) {
    if (body instanceof FormData || body instanceof Blob || typeof body === 'string') {
      init.body = body
    } else {
      if (!resolvedHeaders.has('Content-Type')) {
        resolvedHeaders.set('Content-Type', 'application/json')
      }

      init.body = JSON.stringify(body)
    }
  }

  try {
    const response = await fetch(buildUrl(path, query), init)
    const requestIdHeader = asString(response.headers.get('X-Request-Id'))
    const responseBody = await parseResponseBody(response)

    return parseEnvelope<TData>(responseBody, response, requestIdHeader)
  } catch {
    return {
      ok: false,
      status: 0,
      error: 'Network request failed.',
      code: null,
      hint: null,
      requestId: null,
    }
  }
}

