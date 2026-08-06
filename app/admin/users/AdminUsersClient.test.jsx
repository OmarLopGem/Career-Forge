import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminUsersClient from './AdminUsersClient.jsx'

const { replace, requestJson } = vi.hoisted(() => ({
  replace: vi.fn(),
  requestJson: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/lib/job-tracker/client/api.js', () => ({
  requestJson,
}))

const activeUser = {
  _id: 'member-1',
  firstName: 'Career',
  lastName: 'Member',
  email: 'member@example.com',
  role: 'user',
  status: 'active',
  warningCount: 0,
}

const pagination = {
  page: 1,
  pageSize: 10,
  total: 1,
  totalPages: 1,
}

function renderDashboard(overrides = {}) {
  return render(
    <AdminUsersClient
      initialUsers={overrides.initialUsers ?? [activeUser]}
      initialPagination={overrides.initialPagination ?? pagination}
      initialQuery=""
      currentUserId="admin-1"
      initialRestrictedUsers={overrides.initialRestrictedUsers ?? []}
      initialWarningUsers={overrides.initialWarningUsers ?? []}
    />,
  )
}

describe('AdminUsersClient', () => {
  beforeEach(() => {
    replace.mockReset()
    requestJson.mockReset()
    vi.restoreAllMocks()
  })

  it('renders active, restricted, and warned account registers', () => {
    renderDashboard({
      initialRestrictedUsers: [
        {
          ...activeUser,
          _id: 'suspended-1',
          email: 'suspended@example.com',
          status: 'blocked',
          warningCount: 2,
        },
      ],
      initialWarningUsers: [
        {
          ...activeUser,
          _id: 'warned-1',
          email: 'warned@example.com',
          warningCount: 1,
          latestWarning: 'Please update your account information.',
          lastWarnedAt: '2026-08-01T12:00:00.000Z',
        },
      ],
    })

    expect(screen.getByRole('heading', { name: 'Admin User Management' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Existing Users' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Suspended and deleted accounts' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Warned accounts' })).toBeInTheDocument()
    expect(screen.getByText('suspended@example.com')).toBeInTheDocument()
    expect(screen.getByText('warned@example.com')).toBeInTheDocument()
    expect(screen.getByText('Please update your account information.')).toBeInTheDocument()
  })

  it('creates an admin account with the selected role', async () => {
    const user = userEvent.setup()
    requestJson.mockImplementation(async (url, options = {}) => {
      if (url === '/api/admin/users' && options.method === 'POST') {
        return { user: { _id: 'new-admin', role: 'admin' } }
      }
      if (url.startsWith('/api/admin/users?')) {
        return { users: [activeUser], pagination }
      }
      throw new Error(`Unexpected request: ${url}`)
    })

    renderDashboard()

    await user.type(screen.getByPlaceholderText('First Name'), 'New')
    await user.type(screen.getByPlaceholderText('Last Name'), 'Admin')
    await user.type(screen.getByPlaceholderText('Email'), 'new-admin@example.com')
    await user.type(screen.getByPlaceholderText('Temporary Password'), 'password123')
    await user.selectOptions(screen.getByRole('combobox'), 'admin')
    await user.click(screen.getByRole('button', { name: 'Add User' }))

    await waitFor(() => {
      expect(requestJson).toHaveBeenCalledWith('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          firstName: 'New',
          lastName: 'Admin',
          email: 'new-admin@example.com',
          password: 'password123',
          role: 'admin',
        }),
      })
    })
    expect(await screen.findByText('User created successfully.')).toBeInTheDocument()
  })

  it('sends a warning and refreshes the warning register', async () => {
    const user = userEvent.setup()
    const warnedUser = {
      ...activeUser,
      warningCount: 1,
      latestWarning: 'Please follow the community guidelines.',
      lastWarnedAt: '2026-08-06T12:00:00.000Z',
    }

    requestJson.mockImplementation(async (url, options = {}) => {
      if (url === '/api/admin/users/member-1/warnings' && options.method === 'POST') {
        return { action: 'warned', warningCount: 1 }
      }
      if (url.startsWith('/api/admin/users?')) {
        return { users: [warnedUser], pagination }
      }
      if (url === '/api/admin/users/restricted') return { users: [] }
      if (url === '/api/admin/users/warnings') return { users: [warnedUser] }
      throw new Error(`Unexpected request: ${url}`)
    })

    renderDashboard()

    await user.click(screen.getByRole('button', { name: 'Warn (0/2)' }))
    await user.type(screen.getByLabelText('Message'), warnedUser.latestWarning)
    await user.click(screen.getByRole('button', { name: 'Send warning' }))

    expect(
      await screen.findByText('Warning 1/2 sent to member@example.com.'),
    ).toBeInTheDocument()
    expect(screen.getByText(warnedUser.latestWarning)).toBeInTheDocument()
    expect(requestJson).toHaveBeenCalledWith('/api/admin/users/member-1/warnings', {
      method: 'POST',
      body: JSON.stringify({ message: warnedUser.latestWarning }),
    })
  })

  it('suspends an account and refreshes the restricted register', async () => {
    const user = userEvent.setup()
    const suspendedUser = { ...activeUser, status: 'blocked' }
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    requestJson.mockImplementation(async (url, options = {}) => {
      if (url === '/api/admin/users/member-1/status' && options.method === 'PATCH') {
        return { user: suspendedUser }
      }
      if (url.startsWith('/api/admin/users?')) {
        return { users: [suspendedUser], pagination }
      }
      if (url === '/api/admin/users/restricted') return { users: [suspendedUser] }
      if (url === '/api/admin/users/warnings') return { users: [] }
      throw new Error(`Unexpected request: ${url}`)
    })

    renderDashboard()
    await user.click(screen.getByRole('button', { name: 'Suspend member@example.com' }))

    expect(await screen.findByText('member@example.com is now suspended.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Revoke suspension' })).toBeInTheDocument()
    expect(requestJson).toHaveBeenCalledWith('/api/admin/users/member-1/status', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'blocked' }),
    })
  })
})
