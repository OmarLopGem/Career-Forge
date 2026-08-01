import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import JobsClient from './JobsClient.jsx'

vi.mock('@/lib/job-tracker/client/api.js', () => ({
  requestJson: vi.fn(),
}))

const defaultProps = {
  initialJobListings: [
    {
      _id: 'listing-1',
      source: 'Adzuna',
      title: 'Frontend Developer',
      company: 'Nova Apps',
      location: 'Remote',
      description: 'React role',
      salaryMin: 60000,
      salaryMax: 60000,
      requiredSkills: ['React'],
      category: 'IT Jobs',
      url: 'https://example.com/frontend',
    },
  ],
  initialApplications: [],
  initialCVProfiles: [
    {
      _id: 'profile-1',
      title: 'Frontend Profile',
      targetRole: 'Frontend Developer',
      professionalNiche: '',
      isDefault: true,
    },
  ],
  initialSearch: {
    what: 'frontend',
    where: 'remote',
    page: 2,
  },
  sourceMeta: {
    provider: 'adzuna',
    fallbackUsed: false,
    fetchedAt: '2026-08-01T12:00:00.000Z',
    country: 'gb',
  },
  pagination: {
    page: 2,
    pageSize: 20,
    total: 45,
    totalPages: 3,
  },
}

describe('JobsClient', () => {
  it('renders pagination summary and navigation links', () => {
    render(<JobsClient {...defaultProps} />)

    expect(screen.getByText('Showing 21-21 of 45 listings.')).toBeInTheDocument()
    expect(screen.getAllByText('Page 2 of 3').length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute(
      'href',
      '/jobs?what=frontend&where=remote&page=1',
    )
    expect(screen.getByRole('link', { name: 'First page' })).toHaveAttribute(
      'href',
      '/jobs?what=frontend&where=remote&page=1',
    )
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      '/jobs?what=frontend&where=remote&page=3',
    )
  })

  it('renders a single salary value when the min and max are the same', () => {
    render(<JobsClient {...defaultProps} />)

    expect(screen.getByText(/60,000/)).toBeInTheDocument()
  })
})
