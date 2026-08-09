import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProfileClient from './ProfileClient.jsx'

const { requestJson } = vi.hoisted(() => ({
  requestJson: vi.fn(),
}))

vi.mock('@/lib/job-tracker/client/api.js', () => ({
  requestJson,
}))

const baseProps = {
  currentUser: {
    _id: 'user-1',
    firstName: 'Omar',
    lastName: 'Lopez',
    email: 'omar@example.com',
  },
  initialAccount: {
    userId: 'user-1',
    firstName: 'Omar',
    lastName: 'Lopez',
    email: 'omar@example.com',
    updatedAt: '2026-08-01T12:00:00.000Z',
  },
  initialWarnings: [],
  initialProfiles: [
    {
      _id: 'profile-1',
      title: 'Frontend Profile',
      isDefault: true,
      targetRole: 'Frontend Developer',
      completionScore: 92,
      updatedAt: '2026-08-01T12:00:00.000Z',
    },
    {
      _id: 'profile-2',
      title: 'Backend Profile',
      isDefault: false,
      targetRole: 'Backend Developer',
      completionScore: 80,
      updatedAt: '2026-07-31T12:00:00.000Z',
    },
  ],
}

describe('ProfileClient', () => {
  beforeEach(() => {
    requestJson.mockReset()
    vi.stubGlobal('confirm', vi.fn(() => true))
  })

  it('deletes a professional profile from the profile hub', async () => {
    const user = userEvent.setup()
    requestJson.mockResolvedValue({ ok: true })

    render(<ProfileClient {...baseProps} />)

    await user.click(screen.getAllByRole('button', { name: 'Delete profile' })[1])

    await waitFor(() => {
      expect(requestJson).toHaveBeenCalledWith('/api/cv/profiles/profile-2', {
        method: 'DELETE',
      })
    })

    expect(screen.queryByText('Backend Profile')).toBeNull()
    expect(screen.getByText('"Backend Profile" was deleted successfully.')).toBeInTheDocument()
  })

  it('keeps a default profile visible after deleting the current default profile', async () => {
    const user = userEvent.setup()
    requestJson.mockResolvedValue({ ok: true })

    render(<ProfileClient {...baseProps} />)

    await user.click(screen.getAllByRole('button', { name: 'Delete profile' })[0])

    await waitFor(() => {
      expect(screen.queryByText('Frontend Profile')).toBeNull()
    })

    expect(screen.getAllByText('Backend Profile').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Default').length).toBeGreaterThan(0)
  })
})
