import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Header from './Header.jsx'

const { requestJson, requestJsonWithoutBody } = vi.hoisted(() => ({
  requestJson: vi.fn(),
  requestJsonWithoutBody: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

vi.mock('@/lib/job-tracker/client/api.js', () => ({
  requestJson,
  requestJsonWithoutBody,
}))

describe('Header', () => {
  beforeEach(() => {
    requestJson.mockReset()
    requestJsonWithoutBody.mockReset()
    requestJson.mockResolvedValue({ notifications: [] })
    window.localStorage.clear()
  })

  it('shows a notification badge when there are unseen notifications', async () => {
    requestJson.mockResolvedValue({
      notifications: [
        {
          _id: 'notification-1',
          createdAt: '2026-08-11T10:00:00.000Z',
          title: 'System update',
        },
      ],
    })

    render(
      <Header
        currentUser={{
          _id: 'user-1',
          firstName: 'Omar',
          lastName: 'Lopez',
          email: 'omar@example.com',
          role: 'user',
          status: 'active',
        }}
      />,
    )

    await waitFor(() => {
      expect(screen.getByLabelText('1 new notifications')).toBeInTheDocument()
    })
  })

  it('shows login and register actions for visitors', () => {
    render(<Header currentUser={null} />)

    expect(screen.getAllByRole('link', { name: 'Login' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Register' }).length).toBeGreaterThan(0)
    expect(screen.queryAllByRole('link', { name: 'Calendar' })).toHaveLength(0)
  })

  it('shows private navigation for authenticated users inside the workspace dropdown', async () => {
    const user = userEvent.setup()

    render(
      <Header
        currentUser={{
          _id: 'user-1',
          firstName: 'Omar',
          lastName: 'Lopez',
          email: 'omar@example.com',
          role: 'user',
          status: 'active',
        }}
      />,
    )

    expect(screen.getAllByRole('button', { name: /workspace/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Job Listings' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Notifications' }).length).toBeGreaterThan(0)
    expect(screen.queryAllByRole('link', { name: 'Admin Users' })).toHaveLength(0)

    await user.click(screen.getAllByRole('button', { name: /workspace/i })[0])

    expect(screen.getAllByRole('link', { name: 'Calendar' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Profile' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Progress' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Support' }).length).toBeGreaterThan(0)
  })

  it('shows admin navigation inside the admin dropdown', async () => {
    const user = userEvent.setup()

    render(
      <Header
        currentUser={{
          _id: 'admin-1',
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@example.com',
          role: 'admin',
          status: 'active',
        }}
      />,
    )

    expect(screen.getAllByRole('button', { name: /admin/i }).length).toBeGreaterThan(0)

    await user.click(screen.getAllByRole('button', { name: /admin/i })[0])

    expect(screen.getAllByRole('link', { name: 'Admin Users' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Admin Notifications' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Job Listings' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Quiz Library' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Admin Support' }).length).toBeGreaterThan(0)
  })
})
