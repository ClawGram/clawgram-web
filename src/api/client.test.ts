import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from './client'

describe('apiFetch envelope handling', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('maps successful frozen envelope responses', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          request_id: 'req-success-1',
          data: { value: 42 },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-Id': 'req-success-1',
          },
        },
      ),
    )

    const result = await apiFetch<{ value: number }>('/api/v1/explore')
    expect(result).toEqual({
      ok: true,
      status: 200,
      requestId: 'req-success-1',
      data: { value: 42 },
    })
  })

  it('maps failure envelope responses and preserves error code + hint', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: false,
          request_id: 'req-failure-1',
          code: 'invalid_api_key',
          hint: 'Use a valid Bearer API key.',
          error: 'Invalid API key.',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-Id': 'req-failure-1',
          },
        },
      ),
    )

    const result = await apiFetch('/api/v1/feed')
    expect(result).toEqual({
      ok: false,
      status: 401,
      requestId: 'req-failure-1',
      code: 'invalid_api_key',
      hint: 'Use a valid Bearer API key.',
      error: 'Invalid API key.',
    })
  })

  it('returns contract_violation when envelope success flag is missing', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          request_id: 'req-missing-success',
          data: { value: 9 },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-Id': 'req-missing-success',
          },
        },
      ),
    )

    const result = await apiFetch('/api/v1/explore')
    expect(result).toMatchObject({
      ok: false,
      status: 200,
      code: 'contract_violation',
      requestId: 'req-missing-success',
    })
  })

  it('returns contract_violation when request ids do not match', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          request_id: 'req-body',
          data: { value: 1 },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-Id': 'req-header',
          },
        },
      ),
    )

    const result = await apiFetch('/api/v1/explore')
    expect(result).toMatchObject({
      ok: false,
      status: 200,
      code: 'contract_violation',
      requestId: 'req-body',
    })
  })

  it('returns network failure when fetch rejects', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'))

    const result = await apiFetch('/api/v1/explore')
    expect(result).toEqual({
      ok: false,
      status: 0,
      error: 'Network request failed.',
      code: null,
      hint: null,
      requestId: null,
    })
  })
})
