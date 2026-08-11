import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminUserCvProfiles from './AdminUserCvProfiles.jsx'

const { requestJson, refresh, push } = vi.hoisted(() => ({
  requestJson: vi.fn(),
  refresh: vi.fn(),
  push: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh,
    push,
  }),
}))

vi.mock('@/lib/job-tracker/client/api.js', () => ({
  requestJson,
}))

describe('AdminUserCvProfiles', () => {
  beforeEach(() => {
    requestJson.mockReset()
    refresh.mockReset()
    push.mockReset()
  })

  it('renders the empty state when no profiles exist', () => {
    render(<AdminUserCvProfiles profiles={[]} targetUserId="u1" />)

    expect(
      screen.getByText('This account does not have any CV profiles yet.'),
    ).toBeInTheDocument()
  })

  it('renders the AI generated badge when the latest analysis is from the AI', () => {
    const profiles = [
      {
        _id: 'p1',
        title: 'Frontend Engineer',
        isDefault: true,
        completionScore: 80,
        targetRole: 'Senior Frontend Engineer',
        professionalNiche: 'Frontend',
        updatedAt: '2025-01-01T00:00:00.000Z',
        latestAnalysis: {
          _id: 'a1',
          overallScore: 78,
          atsScore: 72,
          gradingMode: 'ai',
          createdAt: '2025-01-02T00:00:00.000Z',
          lastEditedAt: null,
          lastEditedReason: null,
          lastEditedByUserId: null,
        },
      },
    ]

    render(<AdminUserCvProfiles profiles={profiles} targetUserId="u1" />)

    expect(screen.getByText('AI generated')).toBeInTheDocument()
    expect(screen.getByText(/Overall:/)).toHaveTextContent('78')
  })

  it('renders the admin override badge and reason when the latest analysis was overridden', () => {
    const profiles = [
      {
        _id: 'p1',
        title: 'Profile',
        isDefault: false,
        completionScore: 90,
        targetRole: null,
        professionalNiche: null,
        updatedAt: '2025-01-01T00:00:00.000Z',
        latestAnalysis: {
          _id: 'a1',
          overallScore: 92,
          atsScore: 90,
          gradingMode: 'admin-override',
          createdAt: '2025-01-02T00:00:00.000Z',
          lastEditedAt: '2025-01-03T00:00:00.000Z',
          lastEditedReason: 'AI misread the seniority level.',
          lastEditedByUserId: 'admin-1',
        },
      },
    ]

    render(<AdminUserCvProfiles profiles={profiles} targetUserId="u1" />)

    expect(screen.getByText('Admin override')).toBeInTheDocument()
    expect(screen.getByText(/AI misread the seniority level/)).toBeInTheDocument()
    expect(screen.getByText('Override again')).toBeInTheDocument()
  })

  it('renders the fallback message when no analysis exists for the profile', () => {
    const profiles = [
      {
        _id: 'p1',
        title: 'Empty Profile',
        isDefault: false,
        completionScore: 0,
        targetRole: null,
        professionalNiche: null,
        updatedAt: '2025-01-01T00:00:00.000Z',
        latestAnalysis: null,
      },
    ]

    render(<AdminUserCvProfiles profiles={profiles} targetUserId="u1" />)

    expect(
      screen.getByText('No analysis yet for this profile.'),
    ).toBeInTheDocument()
  })

  it('opens the override modal and submits the PATCH with JSON stringified body', async () => {
    requestJson.mockResolvedValue({ analysis: { _id: 'new-analysis' } })

    const profiles = [
      {
        _id: 'p1',
        title: 'Frontend Engineer',
        isDefault: true,
        completionScore: 80,
        targetRole: 'Senior',
        professionalNiche: 'Frontend',
        updatedAt: '2025-01-01T00:00:00.000Z',
        latestAnalysis: {
          _id: 'a1',
          overallScore: 72,
          atsScore: 68,
          gradingMode: 'ai',
          createdAt: '2025-01-02T00:00:00.000Z',
          lastEditedAt: null,
          lastEditedReason: null,
          lastEditedByUserId: null,
        },
      },
    ]

    render(<AdminUserCvProfiles profiles={profiles} targetUserId="u1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Override grade' }))

    const overallInput = screen.getByLabelText(/Overall score/)
    const atsInput = screen.getByLabelText(/ATS score/)
    const reasonInput = screen.getByLabelText(/Reason/)

    expect(overallInput.value).toBe('72')
    expect(atsInput.value).toBe('68')

    await userEvent.clear(overallInput)
    await userEvent.type(overallInput, '88')

    await userEvent.clear(atsInput)
    await userEvent.type(atsInput, '90')

    await userEvent.type(reasonInput, 'Manual adjustment after escalation.')

    await userEvent.click(screen.getByRole('button', { name: 'Apply override' }))

    expect(requestJson).toHaveBeenCalledTimes(1)
    const [url, options] = requestJson.mock.calls[0]
    expect(url).toBe('/api/admin/users/u1/cv-profiles/p1/analysis-override')
    expect(options.method).toBe('PATCH')
    expect(JSON.parse(options.body)).toEqual({
      overallScore: 88,
      atsScore: 90,
      reason: 'Manual adjustment after escalation.',
    })

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('blocks the submit when the reason is too short', async () => {
    requestJson.mockClear()

    const profiles = [
      {
        _id: 'p1',
        title: 'Profile',
        isDefault: true,
        completionScore: 80,
        targetRole: null,
        professionalNiche: null,
        updatedAt: '2025-01-01T00:00:00.000Z',
        latestAnalysis: {
          _id: 'a1',
          overallScore: 80,
          atsScore: 80,
          gradingMode: 'ai',
          createdAt: '2025-01-02T00:00:00.000Z',
          lastEditedAt: null,
          lastEditedReason: null,
          lastEditedByUserId: null,
        },
      },
    ]

    render(<AdminUserCvProfiles profiles={profiles} targetUserId="u1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Override grade' }))

    const reasonInput = screen.getByLabelText(/Reason/)
    await userEvent.type(reasonInput, 'short')

    const submitButton = screen.getByRole('button', { name: 'Apply override' })
    expect(submitButton).toBeDisabled()

    await userEvent.click(submitButton)
    expect(requestJson).not.toHaveBeenCalled()
  })

  it('surfaces the server error message when the override fails', async () => {
    requestJson.mockRejectedValue({
      body: { error: { message: 'CV profile not found.' } },
    })

    const profiles = [
      {
        _id: 'p1',
        title: 'Profile',
        isDefault: true,
        completionScore: 80,
        targetRole: null,
        professionalNiche: null,
        updatedAt: '2025-01-01T00:00:00.000Z',
        latestAnalysis: {
          _id: 'a1',
          overallScore: 80,
          atsScore: 80,
          gradingMode: 'ai',
          createdAt: '2025-01-02T00:00:00.000Z',
          lastEditedAt: null,
          lastEditedReason: null,
          lastEditedByUserId: null,
        },
      },
    ]

    render(<AdminUserCvProfiles profiles={profiles} targetUserId="u1" />)

    await userEvent.click(screen.getByRole('button', { name: 'Override grade' }))

    const reasonInput = screen.getByLabelText(/Reason/)
    await userEvent.type(reasonInput, 'This is a long enough reason.')

    await userEvent.click(screen.getByRole('button', { name: 'Apply override' }))

    expect(await screen.findByText('CV profile not found.')).toBeInTheDocument()
  })
})