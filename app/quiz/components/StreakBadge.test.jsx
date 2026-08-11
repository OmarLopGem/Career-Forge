import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import StreakBadge from './StreakBadge.jsx'

const { requestJson } = vi.hoisted(() => ({
  requestJson: vi.fn(),
}))

vi.mock('@/lib/job-tracker/client/api.js', () => ({
  requestJson,
}))

describe('StreakBadge', () => {
  beforeEach(() => {
    requestJson.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('ignores expected unauthorized responses while loading the streak', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    requestJson.mockRejectedValue({
      status: 401,
      code: 'UNAUTHORIZED',
      message: 'Authentication required.',
    })

    render(<StreakBadge initialStreak={null} />)

    await waitFor(() => {
      expect(screen.getByText('0 days')).toBeInTheDocument()
    })

    expect(consoleError).not.toHaveBeenCalled()
  })
})
