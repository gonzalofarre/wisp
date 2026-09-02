import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { SessionProvider, useSession, SESSION_END_REASON_KEY } from './useSession'
import { SESSION_EXPIRED_EVENT } from '@/lib/api'

function wrapper({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}

describe('useSession', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts with no session', () => {
    const { result } = renderHook(() => useSession(), { wrapper })
    expect(result.current.session).toBeNull()
    expect(result.current.isStarting).toBe(false)
  })

  it('creates a session and persists it to sessionStorage', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: 'AAAA-1111', token: 'tok123' }),
    } as Response)

    const { result } = renderHook(() => useSession(), { wrapper })

    await act(async () => {
      await result.current.startSession()
    })

    expect(result.current.session).toEqual({ id: 'AAAA-1111', token: 'tok123' })
    expect(JSON.parse(sessionStorage.getItem('wisp:session') ?? 'null')).toEqual({
      id: 'AAAA-1111',
      token: 'tok123',
    })
  })

  it('sets an error and no session when starting fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response)

    const { result } = renderHook(() => useSession(), { wrapper })

    await act(async () => {
      await result.current.startSession()
    })

    expect(result.current.session).toBeNull()
    expect(result.current.error).toBeTruthy()
  })

  it('ends a session and clears it locally', async () => {
    sessionStorage.setItem('wisp:session', JSON.stringify({ id: 'AAAA-1111', token: 'tok123' }))
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, status: 204 } as Response)

    const { result } = renderHook(() => useSession(), { wrapper })
    expect(result.current.session).toEqual({ id: 'AAAA-1111', token: 'tok123' })

    await act(async () => {
      await result.current.endSession()
    })

    expect(result.current.session).toBeNull()
    expect(sessionStorage.getItem('wisp:session')).toBeNull()
  })

  it('refreshes the session by creating a new one and discarding the old one', async () => {
    sessionStorage.setItem('wisp:session', JSON.stringify({ id: 'AAAA-1111', token: 'tok123' }))
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'BBBB-2222', token: 'tok456' }),
      } as Response)
      .mockResolvedValueOnce({ ok: true, status: 204 } as Response)

    const { result } = renderHook(() => useSession(), { wrapper })
    expect(result.current.session).toEqual({ id: 'AAAA-1111', token: 'tok123' })

    await act(async () => {
      await result.current.refreshSession()
    })

    expect(result.current.session).toEqual({ id: 'BBBB-2222', token: 'tok456' })
    // La sesión vieja se borra con SU token, no el nuevo.
    const deleteCall = vi.mocked(fetch).mock.calls[1]
    expect((deleteCall[1] as RequestInit).headers).toEqual({ Authorization: 'Bearer tok123' })
  })

  it('keeps the old session and sets an error when refreshing fails', async () => {
    sessionStorage.setItem('wisp:session', JSON.stringify({ id: 'AAAA-1111', token: 'tok123' }))
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) } as Response)

    const { result } = renderHook(() => useSession(), { wrapper })

    await act(async () => {
      await result.current.refreshSession()
    })

    expect(result.current.session).toEqual({ id: 'AAAA-1111', token: 'tok123' })
    expect(result.current.error).toBeTruthy()
  })

  it('clears the session and records the reason when the session-expired event fires', () => {
    sessionStorage.setItem('wisp:session', JSON.stringify({ id: 'AAAA-1111', token: 'tok123' }))

    const { result } = renderHook(() => useSession(), { wrapper })
    expect(result.current.session).toEqual({ id: 'AAAA-1111', token: 'tok123' })

    act(() => {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
    })

    expect(result.current.session).toBeNull()
    expect(sessionStorage.getItem(SESSION_END_REASON_KEY)).toBe('expired')
  })
})
