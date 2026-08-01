import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import ProgressHistoryClient from './ProgressHistoryClient.jsx'

const sampleProps = {
  profileProgress: [
    {
      _id: 'profile-1',
      title: 'Frontend Profile',
      targetRole: 'Frontend Developer',
      lastAnalysisScore: 84,
      bestAnalysisScore: 84,
      improvementSinceFirst: 16,
      scoreHistory: [
        { _id: 'analysis-1', createdAt: '2026-07-20T10:00:00.000Z', score: 68 },
        { _id: 'analysis-2', createdAt: '2026-07-28T10:00:00.000Z', score: 84 },
      ],
    },
    {
      _id: 'profile-2',
      title: 'Backend Profile',
      targetRole: 'Backend Developer',
      lastAnalysisScore: 91,
      bestAnalysisScore: 91,
      improvementSinceFirst: 6,
      scoreHistory: [
        { _id: 'analysis-3', createdAt: '2026-07-18T10:00:00.000Z', score: 85 },
        { _id: 'analysis-4', createdAt: '2026-07-27T10:00:00.000Z', score: 91 },
      ],
    },
  ],
  quizResults: [
    {
      _id: 'quiz-1',
      jobType: 'Frontend Developer',
      score: 8,
      correctCount: 16,
      totalQuestions: 20,
      completedAt: '2026-07-28T10:00:00.000Z',
      feedback: 'Strong CSS answers.',
    },
    {
      _id: 'quiz-2',
      jobType: 'Backend Developer',
      score: 9,
      correctCount: 18,
      totalQuestions: 20,
      completedAt: '2026-07-29T10:00:00.000Z',
      feedback: 'Excellent API design.',
    },
  ],
  applications: [
    {
      _id: 'application-1',
      isArchived: false,
      status: 'applied',
      lastActivityAt: '2026-07-28T10:00:00.000Z',
      jobSnapshot: {
        title: 'Frontend Developer',
        company: 'Nova Apps',
        location: 'Remote',
      },
      cvProfileSnapshot: {
        title: 'Frontend Profile',
      },
    },
    {
      _id: 'application-2',
      isArchived: true,
      status: 'archived',
      lastActivityAt: '2026-07-29T10:00:00.000Z',
      jobSnapshot: {
        title: 'Backend Engineer',
        company: 'Data Forge',
        location: 'Toronto',
      },
      cvProfileSnapshot: {
        title: 'Backend Profile',
      },
    },
  ],
  bestByJobType: [
    {
      jobType: 'Frontend Developer',
      bestPercentage: 80,
      bestScore: 8,
      totalMarks: 10,
      attempts: 1,
      lastAchievedAt: '2026-07-28T10:00:00.000Z',
    },
    {
      jobType: 'Backend Developer',
      bestPercentage: 90,
      bestScore: 9,
      totalMarks: 10,
      attempts: 1,
      lastAchievedAt: '2026-07-29T10:00:00.000Z',
    },
  ],
}

describe('ProgressHistoryClient', () => {
  it('filters CV history and applications by selected profile', async () => {
    const user = userEvent.setup()
    render(<ProgressHistoryClient {...sampleProps} />)

    await user.selectOptions(screen.getByLabelText('CV profile filter'), 'Backend Profile')

    const cvHistorySection = screen.getByText('CV Grade History').closest('section')
    const applicationsSection = screen.getByText('Application History').closest('div')

    expect(cvHistorySection).not.toBeNull()
    expect(applicationsSection).not.toBeNull()
    expect(within(cvHistorySection).getByRole('heading', { name: 'Backend Profile' })).toBeInTheDocument()
    expect(within(cvHistorySection).queryByRole('heading', { name: 'Frontend Profile' })).toBeNull()
    expect(within(applicationsSection).getByText('Backend Engineer')).toBeInTheDocument()
    expect(within(applicationsSection).queryByText('Frontend Developer')).toBeNull()
  })

  it('filters quiz history and best grades by selected job type', async () => {
    const user = userEvent.setup()
    render(<ProgressHistoryClient {...sampleProps} />)

    await user.selectOptions(screen.getByLabelText('Quiz topic filter'), 'Backend Developer')

    const quizSection = screen.getByText('Quiz History').closest('div')
    const bestSection = screen.getByText('Best by Job Type').closest('section')

    expect(quizSection).not.toBeNull()
    expect(bestSection).not.toBeNull()
    expect(within(quizSection).getByText('Backend Developer')).toBeInTheDocument()
    expect(within(quizSection).queryByText('Frontend Developer')).toBeNull()
    expect(within(bestSection).getByText('Backend Developer')).toBeInTheDocument()
    expect(within(bestSection).queryByText('Frontend Developer')).toBeNull()
  })

  it('shows filtered empty states when the search does not match any history', async () => {
    const user = userEvent.setup()
    render(<ProgressHistoryClient {...sampleProps} />)

    await user.type(screen.getByLabelText('Search histories'), 'cloud security')

    expect(screen.getByText('No CV grade history matches the current filters.')).toBeInTheDocument()
    expect(screen.getByText('No quiz attempts match the current filters.')).toBeInTheDocument()
    expect(screen.getByText('No job applications match the current filters.')).toBeInTheDocument()
    expect(screen.getByText('No best-score records match the current filters.')).toBeInTheDocument()
  })
})
