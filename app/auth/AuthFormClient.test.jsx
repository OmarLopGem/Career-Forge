import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AuthFormClient from './AuthFormClient.jsx'

const { push, refresh, requestJson } = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  requestJson: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
    refresh,
  }),
}))

vi.mock('@/lib/job-tracker/client/api.js', () => ({
  requestJson,
}))

describe('AuthFormClient', () => {
  beforeEach(() => {
    push.mockReset()
    refresh.mockReset()
    requestJson.mockReset()
  })

  it('shows a validation message when passwords do not match', async () => {
    const user = userEvent.setup()

    render(<AuthFormClient mode="register" redirectTo="/calendar" />)

    await user.type(screen.getByLabelText('First Name'), 'Omar')
    await user.type(screen.getByLabelText('Last Name'), 'Lopez')
    await user.type(screen.getByLabelText('Email'), 'omar@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.type(screen.getByLabelText('Confirm Password'), 'password456')
    await user.click(screen.getByRole('button', { name: 'Register' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match.')
    expect(requestJson).not.toHaveBeenCalled()
  })

  it('submits registration details and redirects to the requested page', async () => {
    const user = userEvent.setup()
    requestJson.mockResolvedValue({ user: { email: 'omar@example.com' } })

    render(<AuthFormClient mode="register" redirectTo="/progress" />)

    await user.type(screen.getByLabelText('First Name'), ' Omar ')
    await user.type(screen.getByLabelText('Last Name'), 'Lopez ')
    await user.type(screen.getByLabelText('Email'), ' omar@example.com ')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.type(screen.getByLabelText('Confirm Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Register' }))

    await waitFor(() => {
      expect(requestJson).toHaveBeenCalledWith('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          firstName: 'Omar',
          lastName: 'Lopez',
          email: 'omar@example.com',
          password: 'password123',
        }),
      })
    })

    expect(push).toHaveBeenCalledWith('/progress')
    expect(refresh).toHaveBeenCalled()
  })

  it('shows a validation message when required registration fields are missing', async () => {
    const user = userEvent.setup()

    render(<AuthFormClient mode="register" redirectTo="/calendar" />)

    await user.type(screen.getByLabelText('Email'), 'omar@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.type(screen.getByLabelText('Confirm Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Register' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please complete all required fields before continuing.',
    )
    expect(requestJson).not.toHaveBeenCalled()
  })

  it('submits login credentials and redirects to the requested page', async () => {
    const user = userEvent.setup()
    requestJson.mockResolvedValue({ user: { email: 'omar@example.com' } })

    render(<AuthFormClient mode="login" redirectTo="/jobs" />)

    await user.type(screen.getByLabelText('Email'), ' omar@example.com ')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => {
      expect(requestJson).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'omar@example.com',
          password: 'password123',
        }),
      })
    })

    expect(push).toHaveBeenCalledWith('/jobs')
    expect(refresh).toHaveBeenCalled()
  })

  it('shows the API error when login fails', async () => {
    const user = userEvent.setup()
    requestJson.mockRejectedValue(new Error('Invalid credentials.'))

    render(<AuthFormClient mode="login" redirectTo="/jobs" />)

    await user.type(screen.getByLabelText('Email'), 'omar@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials.')
    })

    expect(push).not.toHaveBeenCalled()
  })

  it('shows a revoked-access notice on the login form', () => {
    render(
      <AuthFormClient
        mode="login"
        notice="Your session ended because your account access was revoked."
      />,
    )

    expect(screen.getByRole('status')).toHaveTextContent(
      'Your session ended because your account access was revoked.',
    )
  })
})
