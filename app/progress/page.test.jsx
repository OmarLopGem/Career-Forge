import { render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProgressPage from './page.jsx'

const { redirect, getCurrentUserFromRequest, serviceGetProgressOverview } = vi.hoisted(() => ({
  redirect: vi.fn(),
  getCurrentUserFromRequest: vi.fn(),
  serviceGetProgressOverview: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect,
}))

vi.mock('@/lib/server/auth/current-user.js', () => ({
  getCurrentUserFromRequest,
}))

vi.mock('@/lib/server/progress/progress.service.js', () => ({
  serviceGetProgressOverview,
}))

vi.mock('@/app/quiz/components/StreakBadgeServer.jsx', () => ({
  default: () => <div>Mock streak badge</div>,
}))

describe('ProgressPage', () => {
  beforeEach(() => {
    redirect.mockReset()
    getCurrentUserFromRequest.mockReset()
    serviceGetProgressOverview.mockReset()
  })

  it('renders CV grade history and improvement over time', async () => {
    getCurrentUserFromRequest.mockResolvedValue({
      _id: 'user-1',
      firstName: 'Omar',
      lastName: 'Lopez',
      email: 'omar@example.com',
      role: 'user',
      status: 'active',
    })
    serviceGetProgressOverview.mockResolvedValue({
      user: { _id: 'user-1' },
      summary: {
        profiles: 1,
        activeApplications: 1,
        archivedApplications: 0,
        quiz: {
          averageScore: 8.5,
          attempts: 2,
          passedAttempts: 2,
        },
      },
      profileProgress: [
        {
          _id: 'profile-1',
          title: 'Frontend Profile',
          isDefault: true,
          completionScore: 92,
          targetRole: 'Frontend Developer',
          lastAnalysisScore: 84,
          bestAnalysisScore: 84,
          analysisCount: 2,
          latestChange: 16,
          improvementSinceFirst: 16,
          updatedAt: '2026-07-28T10:00:00.000Z',
          scoreHistory: [
            { _id: 'analysis-1', createdAt: '2026-07-20T10:00:00.000Z', score: 68 },
            { _id: 'analysis-2', createdAt: '2026-07-28T10:00:00.000Z', score: 84 },
          ],
        },
      ],
      quizResults: [],
      bestByJobType: [],
      applications: [
        {
          _id: 'application-1',
          isArchived: false,
          status: 'applied',
          lastActivityAt: '2026-07-28',
          jobSnapshot: {
            title: 'Frontend Developer',
            company: 'Nova Apps',
            location: 'Remote',
          },
          cvProfileSnapshot: {
            title: 'Frontend Profile',
          },
        },
      ],
    })

    render(await ProgressPage())

    expect(screen.getByText('CV Grade History')).toBeInTheDocument()
    expect(screen.getByText('How your CV grades change over time')).toBeInTheDocument()
    const historySection = screen.getByText('CV Grade History').closest('section')

    expect(historySection).not.toBeNull()
    expect(within(historySection).getByRole('heading', { name: 'Frontend Profile' })).toBeInTheDocument()
    expect(within(historySection).getByText('Review 1')).toBeInTheDocument()
    expect(within(historySection).getByText('Review 2')).toBeInTheDocument()
    expect(within(historySection).getAllByText('+16 pts')).toHaveLength(2)
    expect(within(historySection).getByText('84/100')).toBeInTheDocument()
  })
})
