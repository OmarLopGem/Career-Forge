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
    pageSize: 30,
    total: 1500,
    totalPages: 50,
  },
}

describe('JobsClient', () => {
  it('renders integrated pagination controls above and below the listings', () => {
    render(<JobsClient {...defaultProps} />)

    expect(screen.queryByText(/Showing \d+-\d+ of/i)).not.toBeInTheDocument()
    expect(screen.getAllByText('Page 2 of 50')).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'Previous' })).toHaveLength(2)
    expect(screen.getAllByRole('link', { name: 'Previous' })[0]).toHaveAttribute(
      'href',
      '/jobs?what=frontend&where=remote&page=1',
    )
    expect(screen.getAllByRole('link', { name: '1' })[0]).toHaveAttribute(
      'href',
      '/jobs?what=frontend&where=remote&page=1',
    )
    expect(screen.getAllByRole('link', { name: '3' })[0]).toHaveAttribute(
      'href',
      '/jobs?what=frontend&where=remote&page=3',
    )
    expect(screen.getAllByRole('link', { name: '4' })[0]).toHaveAttribute(
      'href',
      '/jobs?what=frontend&where=remote&page=4',
    )
    expect(screen.getAllByRole('link', { name: '50' })[0]).toHaveAttribute(
      'href',
      '/jobs?what=frontend&where=remote&page=50',
    )
    expect(screen.getAllByRole('link', { name: 'Next' })[0]).toHaveAttribute(
      'href',
      '/jobs?what=frontend&where=remote&page=3',
    )
  })

  it('renders a single salary value when the min and max are the same', () => {
    render(<JobsClient {...defaultProps} />)

    expect(screen.getByText(/60,000/)).toBeInTheDocument()
  })
})
