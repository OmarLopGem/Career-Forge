import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requestJson } = vi.hoisted(() => ({ requestJson: vi.fn() }))

vi.mock('@/lib/job-tracker/client/api.js', () => ({ requestJson }))
vi.mock('./components/StreakBadge.jsx', () => ({
  default: () => <div>Practice streak</div>,
}))

import QuizClient from './QuizClient.jsx'

function quizResponse(jobType, question, bankCount) {
  return {
    attemptId: `${jobType}-attempt`,
    questions: [
      {
        _id: `${jobType}-question`,
        jobType,
        type: 'blank',
        difficulty: 'Beginner',
        question,
        options: [],
        marks: 1,
      },
    ],
    count: 1,
    difficulty: 'Beginner',
    generationMode: 'bank',
    bankCount,
  }
}

describe('QuizClient', () => {
  beforeEach(() => {
    requestJson.mockReset()
  })

  it('ignores a late response from the previously selected job role', async () => {
    let resolveFrontendRequest
    const frontendRequest = new Promise((resolve) => {
      resolveFrontendRequest = resolve
    })

    requestJson.mockImplementation((url) => {
      if (url.includes('Cybersecurity%20Analyst')) {
        return Promise.resolve(
          quizResponse(
            'Cybersecurity Analyst',
            'Which practice protects an account from unauthorized access?',
            40,
          ),
        )
      }
      return frontendRequest
    })

    render(<QuizClient />)
    fireEvent.change(screen.getByLabelText('Select Job Type'), {
      target: { value: 'Cybersecurity Analyst' },
    })

    expect(
      await screen.findByText('Q1. Which practice protects an account from unauthorized access?'),
    ).toBeInTheDocument()

    await act(async () => {
      resolveFrontendRequest(
        quizResponse(
          'Frontend Developer',
          'Which HTML attribute describes an image?',
          50,
        ),
      )
      await frontendRequest
    })

    expect(screen.queryByText('Q1. Which HTML attribute describes an image?')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Select Job Type')).toHaveValue('Cybersecurity Analyst')
    expect(screen.queryByText(/AI grading:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Stored question-bank quiz/)).not.toBeInTheDocument()
  })
})
