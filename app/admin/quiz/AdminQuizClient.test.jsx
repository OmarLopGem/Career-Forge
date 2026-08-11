import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requestJson } = vi.hoisted(() => ({ requestJson: vi.fn() }))

vi.mock('@/lib/job-tracker/client/api.js', () => ({ requestJson }))

import AdminQuizClient from './AdminQuizClient.jsx'

function question(id, text) {
  return {
    _id: id,
    jobType: 'Frontend Developer',
    type: 'mcq',
    difficulty: 'Beginner',
    source: 'manual',
    question: text,
    options: ['Correct', 'Incorrect'],
    answer: 'Correct',
    marks: 1,
  }
}

const summary = {
  total: 42,
  Beginner: 30,
  Intermediate: 8,
  Advanced: 4,
}

describe('AdminQuizClient', () => {
  beforeEach(() => {
    requestJson.mockReset()
  })

  it('requests and displays one question-bank page at a time', async () => {
    requestJson.mockResolvedValue({
      questions: [question('page-two', 'Question from page two')],
      count: 42,
      summary,
      pagination: {
        page: 2,
        pageSize: 20,
        totalPages: 3,
        totalCount: 42,
      },
    })

    render(
      <AdminQuizClient
        initialQuestions={[question('page-one', 'Question from page one')]}
        initialSummary={summary}
        initialPagination={{
          page: 1,
          pageSize: 20,
          totalPages: 3,
          totalCount: 42,
        }}
      />,
    )

    expect(screen.getByText('Question from page one')).toBeInTheDocument()
    expect(screen.getByText('Showing 1–20 of 42')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByText('Question from page two')).toBeInTheDocument()
    expect(screen.queryByText('Question from page one')).not.toBeInTheDocument()
    expect(screen.getByText('Showing 21–40 of 42')).toBeInTheDocument()
    expect(requestJson).toHaveBeenCalledWith('/api/admin/quiz?page=2&pageSize=20')
  })
})
