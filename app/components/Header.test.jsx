import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Header from './Header.jsx'

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}))

describe('Header', () => {
  it('shows login and register actions for visitors', () => {
    render(<Header currentUser={null} />)

    expect(screen.getAllByRole('link', { name: 'Login' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Register' }).length).toBeGreaterThan(0)
    expect(screen.queryAllByRole('link', { name: 'Calendar' })).toHaveLength(0)
  })

  it('shows private navigation for authenticated users', () => {
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

    expect(screen.getAllByRole('link', { name: 'Calendar' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Profile' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: 'Job Matches' }).length).toBeGreaterThan(0)
    expect(screen.queryAllByRole('link', { name: 'Admin Users' })).toHaveLength(0)
  })

  it('shows admin navigation for admin users', () => {
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

    expect(screen.getAllByRole('link', { name: 'Admin Users' }).length).toBeGreaterThan(0)
  })
})
