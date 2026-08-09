import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminJobListingsPage from './page.jsx'

const { getCurrentUserFromRequest, redirect, serviceListAdminJobListings } = vi.hoisted(() => ({
  getCurrentUserFromRequest: vi.fn(),
  redirect: vi.fn(),
  serviceListAdminJobListings: vi.fn(),
}))

vi.mock('next/navigation', () => ({ redirect }))

vi.mock('@/lib/server/auth/current-user.js', () => ({
  getCurrentUserFromRequest,
}))

vi.mock('@/lib/job-tracker/server/job-tracker.service.js', () => ({
  serviceListAdminJobListings,
}))

describe('AdminJobListingsPage', () => {
  beforeEach(() => {
    getCurrentUserFromRequest.mockReset()
    serviceListAdminJobListings.mockReset()
    redirect.mockReset()
    redirect.mockImplementation((url) => {
      throw new Error(`REDIRECT:${url}`)
    })
  })

  it('requires an authenticated admin', async () => {
    getCurrentUserFromRequest.mockResolvedValue(null)

    await expect(AdminJobListingsPage()).rejects.toThrow(
      'REDIRECT:/login?redirectTo=/admin/job-listings',
    )
    expect(serviceListAdminJobListings).not.toHaveBeenCalled()
  })

  it('rejects authenticated non-admin users', async () => {
    getCurrentUserFromRequest.mockResolvedValue({ _id: 'user-1', role: 'user' })

    await expect(AdminJobListingsPage()).rejects.toThrow('REDIRECT:/calendar')
    expect(serviceListAdminJobListings).not.toHaveBeenCalled()
  })

  it('renders active and inactive listing totals for admins', async () => {
    getCurrentUserFromRequest.mockResolvedValue({ _id: 'admin-1', role: 'admin' })
    serviceListAdminJobListings.mockResolvedValue({
      summary: { total: 2, active: 1, inactive: 1 },
      jobListings: [
        {
          _id: 'listing-1',
          title: 'Frontend Developer',
          company: 'Career Labs',
          location: 'Toronto',
          description: 'Build accessible interfaces.',
          category: 'Software Development',
          requiredSkills: ['React', 'Accessibility'],
          source: 'Adzuna',
          salaryMin: 70000,
          salaryMax: 90000,
          postedAt: '2026-08-01T12:00:00.000Z',
          isActive: true,
        },
        {
          _id: 'listing-2',
          title: 'Archived QA Analyst',
          company: 'Quality Works',
          location: 'Remote',
          description: 'Review automated test coverage.',
          category: 'Quality Assurance',
          requiredSkills: ['Vitest'],
          source: 'Manual',
          salaryMin: null,
          salaryMax: null,
          postedAt: '2026-07-20T12:00:00.000Z',
          isActive: false,
        },
      ],
    })

    render(await AdminJobListingsPage())

    expect(screen.getByRole('heading', { name: 'Job listing monitor' })).toBeInTheDocument()
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument()
    expect(screen.getByText('Archived QA Analyst')).toBeInTheDocument()
    expect(screen.getByText('Visible')).toBeInTheDocument()
    expect(screen.getAllByText('Inactive')).toHaveLength(2)
    expect(screen.getByText('React')).toBeInTheDocument()
  })
})
