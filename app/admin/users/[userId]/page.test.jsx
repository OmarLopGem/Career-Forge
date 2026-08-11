import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminUserProfilePage from './page.jsx'

const { getCurrentUserFromRequest, notFound, redirect, serviceGetAdminUserProfile, useRouterMock } = vi.hoisted(
  () => ({
    getCurrentUserFromRequest: vi.fn(),
    notFound: vi.fn(),
    redirect: vi.fn(),
    serviceGetAdminUserProfile: vi.fn(),
    useRouterMock: { refresh: vi.fn(), push: vi.fn() },
  }),
)

vi.mock('next/navigation', () => ({
  notFound,
  redirect,
  useRouter: () => useRouterMock,
}))

vi.mock('@/lib/server/auth/current-user.js', () => ({
  getCurrentUserFromRequest,
}))

vi.mock('@/lib/server/admin/admin-users.service.js', () => ({
  serviceGetAdminUserProfile,
}))

const profileReport = {
  account: {
    _id: 'member-1',
    firstName: 'Career',
    lastName: 'Member',
    email: 'member@example.com',
    role: 'user',
    status: 'active',
    headline: 'Frontend candidate',
    location: 'Toronto',
    createdAt: '2026-07-01T12:00:00.000Z',
    updatedAt: '2026-08-01T12:00:00.000Z',
  },
  profiles: [
    {
      _id: 'profile-1',
      title: 'Frontend CV',
      targetRole: 'Frontend Developer',
      completionScore: 90,
      isDefault: true,
      updatedAt: '2026-08-01T12:00:00.000Z',
    },
  ],
  warnings: [
    {
      _id: 'warning-1',
      message: 'Please update your profile details.',
      createdAt: '2026-08-02T12:00:00.000Z',
    },
  ],
  activity: {
    summary: {
      profiles: 1,
      jobApplications: 1,
      activeApplications: 1,
      archivedApplications: 0,
      calendarEvents: 1,
      upcomingEvents: 1,
      quizAttempts: 1,
      averageQuizScore: 8,
      supportTickets: 1,
      activeSupportTickets: 1,
    },
    recentApplications: [
      {
        _id: 'application-1',
        status: 'applied',
        isArchived: false,
        lastActivityAt: '2026-08-03T12:00:00.000Z',
        jobSnapshot: {
          title: 'Frontend Developer',
          company: 'Career Labs',
          location: 'Toronto',
        },
        cvProfileSnapshot: { title: 'Frontend CV' },
      },
    ],
    upcomingEvents: [
      {
        _id: 'event-1',
        title: 'Portfolio review',
        type: 'reminder',
        eventDate: '2026-08-20',
        reminderEnabled: true,
      },
    ],
    recentQuizResults: [
      {
        _id: 'quiz-1',
        jobType: 'Frontend Developer',
        score: 8,
        correctCount: 8,
        totalQuestions: 10,
        completedAt: '2026-08-04T12:00:00.000Z',
      },
    ],
    recentSupportTickets: [
      {
        _id: 'ticket-1',
        subject: 'Need profile help',
        status: 'open',
        lastMessageAt: '2026-08-05T12:00:00.000Z',
      },
    ],
  },
}

describe('AdminUserProfilePage', () => {
  beforeEach(() => {
    getCurrentUserFromRequest.mockReset()
    serviceGetAdminUserProfile.mockReset()
    redirect.mockReset()
    notFound.mockReset()
    redirect.mockImplementation((url) => {
      throw new Error(`REDIRECT:${url}`)
    })
    notFound.mockImplementation(() => {
      throw new Error('NOT_FOUND')
    })
  })

  it('allows only administrators to view another user report', async () => {
    getCurrentUserFromRequest.mockResolvedValue({ _id: 'member-2', role: 'user' })

    await expect(
      AdminUserProfilePage({ params: Promise.resolve({ userId: 'member-1' }) }),
    ).rejects.toThrow('REDIRECT:/calendar')
    expect(serviceGetAdminUserProfile).not.toHaveBeenCalled()
  })

  it('renders account, CV, warning, and activity details for an administrator', async () => {
    getCurrentUserFromRequest.mockResolvedValue({ _id: 'admin-1', role: 'admin' })
    serviceGetAdminUserProfile.mockResolvedValue(profileReport)

    render(
      await AdminUserProfilePage({
        params: Promise.resolve({ userId: 'member-1' }),
      }),
    )

    expect(screen.getByRole('heading', { name: 'Career Member' })).toBeInTheDocument()
    expect(screen.getByText('Frontend CV')).toBeInTheDocument()
    expect(screen.getByText('Please update your profile details.')).toBeInTheDocument()
    expect(screen.getAllByText('Frontend Developer')).toHaveLength(3)
    expect(screen.getByText('Portfolio review')).toBeInTheDocument()
    expect(screen.getAllByText('8/10')).toHaveLength(2)
    expect(screen.getByText('Need profile help')).toBeInTheDocument()
    expect(serviceGetAdminUserProfile).toHaveBeenCalledWith('member-1')
  })

  it('shows not found when the requested account does not exist', async () => {
    getCurrentUserFromRequest.mockResolvedValue({ _id: 'admin-1', role: 'admin' })
    serviceGetAdminUserProfile.mockRejectedValue({ code: 'USER_NOT_FOUND' })

    await expect(
      AdminUserProfilePage({ params: Promise.resolve({ userId: 'missing' }) }),
    ).rejects.toThrow('NOT_FOUND')
  })
})
