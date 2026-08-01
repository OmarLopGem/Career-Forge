import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SessionAccessGuard from './SessionAccessGuard.jsx'

const { replace, refresh } = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh }),
}))

describe('SessionAccessGuard', () => {
  beforeEach(() => {
    replace.mockReset()
    refresh.mockReset()
    global.fetch = vi.fn()
  })

  it('does nothing when the browser has no session cookie', () => {
    render(<SessionAccessGuard hasSession={false} />)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('signs out and redirects when account access has been revoked', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce({ ok: true, status: 200 })

    render(<SessionAccessGuard hasSession />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/auth/me', {
        cache: 'no-store',
        credentials: 'same-origin',
      })
      expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      })
      expect(replace).toHaveBeenCalledWith('/login?reason=access-revoked')
      expect(refresh).toHaveBeenCalled()
    })
  })
})
