import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST as createUserViaApi } from '@/app/api/admin/users/route.js'
import { PATCH as changeUserStatusViaApi } from '@/app/api/admin/users/[userId]/status/route.js'
import { POST as warnUserViaApi } from '@/app/api/admin/users/[userId]/warnings/route.js'
import { POST as createQuizQuestionViaApi } from '@/app/api/admin/quiz/route.js'
import { POST as generateQuizDraftsViaApi } from '@/app/api/admin/quiz/generate/route.js'
import { POST as loginViaApi } from '@/app/api/auth/login/route.js'
import { GET as listNotificationsViaApi } from '@/app/api/notifications/route.js'
import { GET as listQuizViaApi } from '@/app/api/quiz/route.js'
import { POST as submitQuizViaApi } from '@/app/api/quiz/submit/route.js'
import { clearMongo, startMongo, stopMongo } from '@/lib/cv-assistant/test/mongo-helpers.js'
import { createUser, getUserById } from '@/lib/server/auth/users.repository.js'
import { hashPassword } from '@/lib/server/auth/password.js'
import { listQuizResultsByUser } from '@/lib/server/progress/quiz-result.repository.js'
import { serviceListAdminQuizQuestions } from '@/lib/server/quiz/quiz.service.js'
import { listUserWarnings } from '@/lib/server/admin/user-warning.repository.js'

const { aiChatJSON } = vi.hoisted(() => ({ aiChatJSON: vi.fn() }))

vi.mock('@/lib/services/ai.js', () => ({
  aiChatJSON,
  hasProviderConfigured: () => Boolean(process.env.MINIMAX_API_KEY),
}))

function jsonRequest(url, method, body) {
  return new Request(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function createAdmin() {
  return createUser({
    firstName: 'Admin',
    lastName: 'Tester',
    email: 'admin-integration@example.com',
    passwordHash: await hashPassword('password123'),
    role: 'admin',
    status: 'active',
  })
}

beforeAll(async () => {
  await startMongo()
}, 60000)

afterAll(async () => {
  await stopMongo()
})

beforeEach(async () => {
  await clearMongo()
  delete process.env.MOCK_USER_ID
  delete process.env.MINIMAX_API_KEY
  aiChatJSON.mockReset()
})

afterEach(() => {
  delete process.env.MOCK_USER_ID
  delete process.env.MINIMAX_API_KEY
})

describe('Admin and quiz platform integration', () => {
  it('connects admin APIs, MongoDB, notifications, and authentication for account enforcement', async () => {
    const admin = await createAdmin()
    process.env.MOCK_USER_ID = admin._id

    const createResponse = await createUserViaApi(
      jsonRequest('http://localhost/api/admin/users', 'POST', {
        firstName: 'Integrated',
        lastName: 'Member',
        email: 'integrated-member@example.com',
        password: 'password123',
        role: 'user',
      }),
    )
    expect(createResponse.status).toBe(201)
    const { user: member } = await createResponse.json()

    const firstWarningResponse = await warnUserViaApi(
      jsonRequest(
        `http://localhost/api/admin/users/${member._id}/warnings`,
        'POST',
        { message: 'Please update your account information.' },
      ),
      { params: Promise.resolve({ userId: member._id }) },
    )
    expect(firstWarningResponse.status).toBe(201)
    expect(await firstWarningResponse.json()).toMatchObject({
      action: 'warned',
      warningCount: 1,
    })

    process.env.MOCK_USER_ID = member._id
    const notificationsResponse = await listNotificationsViaApi()
    expect(notificationsResponse.status).toBe(200)
    expect(await notificationsResponse.json()).toMatchObject({
      notifications: [
        expect.objectContaining({
          targetUserId: member._id,
          title: 'Account warning (1 of 2)',
          level: 'warning',
        }),
      ],
    })

    process.env.MOCK_USER_ID = admin._id
    const finalWarningResponse = await warnUserViaApi(
      jsonRequest(
        `http://localhost/api/admin/users/${member._id}/warnings`,
        'POST',
        { message: 'Final warning before account suspension.' },
      ),
      { params: Promise.resolve({ userId: member._id }) },
    )
    expect(finalWarningResponse.status).toBe(201)
    expect(await finalWarningResponse.json()).toMatchObject({
      action: 'suspended',
      warningCount: 2,
    })
    expect(await getUserById(member._id)).toMatchObject({ status: 'blocked' })

    delete process.env.MOCK_USER_ID
    const blockedLoginResponse = await loginViaApi(
      jsonRequest('http://localhost/api/auth/login', 'POST', {
        email: 'integrated-member@example.com',
        password: 'password123',
      }),
    )
    expect(blockedLoginResponse.status).toBe(403)
    expect(await blockedLoginResponse.json()).toMatchObject({
      error: { code: 'ACCOUNT_INACTIVE' },
    })

    process.env.MOCK_USER_ID = admin._id
    const reactivateResponse = await changeUserStatusViaApi(
      jsonRequest(
        `http://localhost/api/admin/users/${member._id}/status`,
        'PATCH',
        { status: 'active' },
      ),
      { params: Promise.resolve({ userId: member._id }) },
    )
    expect(reactivateResponse.status).toBe(200)
    expect(await reactivateResponse.json()).toMatchObject({
      user: { _id: member._id, status: 'active' },
    })
    expect(await listUserWarnings(member._id)).toHaveLength(2)

    delete process.env.MOCK_USER_ID
    const restoredLoginResponse = await loginViaApi(
      jsonRequest('http://localhost/api/auth/login', 'POST', {
        email: 'integrated-member@example.com',
        password: 'password123',
      }),
    )
    expect(restoredLoginResponse.status).toBe(200)
  })

  it('connects admin quiz APIs, user delivery, server scoring, and saved MongoDB results', async () => {
    const admin = await createAdmin()
    const member = await createUser({
      firstName: 'Quiz',
      lastName: 'Member',
      email: 'quiz-integration@example.com',
      passwordHash: await hashPassword('password123'),
      role: 'user',
      status: 'active',
    })
    process.env.MOCK_USER_ID = admin._id

    for (let index = 0; index < 10; index += 1) {
      const createQuestionResponse = await createQuizQuestionViaApi(
        jsonRequest('http://localhost/api/admin/quiz', 'POST', {
          jobType: 'Integration Tester',
          type: 'mcq',
          difficulty: 'Beginner',
          question: `Integration question ${index + 1}?`,
          options: ['Correct', 'Incorrect A', 'Incorrect B', 'Incorrect C'],
          answer: 'Correct',
          marks: 1,
        }),
      )
      expect(createQuestionResponse.status).toBe(201)
    }

    process.env.MOCK_USER_ID = member._id
    const quizResponse = await listQuizViaApi(
      new Request('http://localhost/api/quiz?jobType=Integration%20Tester'),
    )
    expect(quizResponse.status).toBe(200)
    const quiz = await quizResponse.json()
    expect(quiz).toMatchObject({ count: 10, difficulty: 'Beginner' })
    expect(quiz.questions.every((question) => question.answer === undefined)).toBe(true)

    const answers = Object.fromEntries(
      quiz.questions.map((question) => [question._id, 'Correct']),
    )
    const submissionResponse = await submitQuizViaApi(
      jsonRequest('http://localhost/api/quiz/submit', 'POST', {
        attemptId: quiz.attemptId,
        jobType: 'Integration Tester',
        difficulty: 'Beginner',
        answers,
      }),
    )
    expect(submissionResponse.status).toBe(201)
    expect(await submissionResponse.json()).toMatchObject({
      correctCount: 10,
      totalQuestions: 10,
      percentage: 100,
      passed: true,
      nextDifficulty: 'Beginner',
    })

    const savedResults = await listQuizResultsByUser(member._id)
    expect(savedResults).toHaveLength(1)
    expect(savedResults[0]).toMatchObject({
      jobType: 'Integration Tester',
      difficulty: 'Beginner',
      passed: true,
    })
  })

  it('connects the AI quiz API to the provider boundary while keeping drafts unsaved for review', async () => {
    const admin = await createAdmin()
    process.env.MOCK_USER_ID = admin._id
    process.env.MINIMAX_API_KEY = 'integration-test-key'
    aiChatJSON.mockResolvedValue({
      data: {
        questions: [
          {
            type: 'mcq',
            question: 'Which status code indicates a successful HTTP request?',
            options: ['200', '404', '500', '503'],
            answer: '200',
            marks: 0.5,
          },
        ],
      },
      tokenUsage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
    })

    const response = await generateQuizDraftsViaApi(
      jsonRequest('http://localhost/api/admin/quiz/generate', 'POST', {
        jobType: 'Backend Developer',
        topic: 'HTTP APIs',
        difficulty: 'Intermediate',
        type: 'mcq',
        count: 1,
      }),
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      count: 1,
      requestedCount: 1,
      drafts: [
        expect.objectContaining({
          source: 'ai',
          jobType: 'Backend Developer',
          difficulty: 'Intermediate',
          answer: '200',
        }),
      ],
    })
    expect(aiChatJSON).toHaveBeenCalledOnce()

    const storedQuestions = await serviceListAdminQuizQuestions()
    expect(storedQuestions.count).toBe(0)
  })
})
