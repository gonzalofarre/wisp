import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiFetch, ApiError, SESSION_EXPIRED_EVENT } from './api'

function jsonResponse(body: unknown, init: { ok: boolean; status: number }): Response {
  return { ...init, json: async () => body } as Response
}

describe('apiFetch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the parsed JSON body on success', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ hello: 'world' }, { ok: true, status: 200 }))
    await expect(apiFetch('/anything')).resolves.toEqual({ hello: 'world' })
  })

  it('returns undefined for a 204 No Content response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 204 } as Response)
    await expect(apiFetch('/anything')).resolves.toBeUndefined()
  })

  it('throws an ApiError carrying the backend message on failure', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ message: 'Recipient ID not found' }, { ok: false, status: 404 }),
    )

    await expect(apiFetch('/chat/does-not-exist')).rejects.toMatchObject({
      status: 404,
      message: 'Recipient ID not found',
    })
  })

  it('falls back to a generic message when the error body has none', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({}, { ok: false, status: 500 }))
    await expect(apiFetch('/anything')).rejects.toBeInstanceOf(ApiError)
  })

  it('dispatches the session-expired event on a 401, and only on a 401', async () => {
    const handler = vi.fn()
    window.addEventListener(SESSION_EXPIRED_EVENT, handler)

    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ message: 'nope' }, { ok: false, status: 403 }))
    await apiFetch('/anything').catch(() => {})
    expect(handler).not.toHaveBeenCalled()

    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ message: 'Invalid or expired session' }, { ok: false, status: 401 }),
    )
    await apiFetch('/anything').catch(() => {})
    expect(handler).toHaveBeenCalledTimes(1)

    window.removeEventListener(SESSION_EXPIRED_EVENT, handler)
  })
})
