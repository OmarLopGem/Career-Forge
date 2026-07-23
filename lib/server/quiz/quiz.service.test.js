import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { clearMongo, startMongo, stopMongo } from '@/lib/cv-assistant/test/mongo-helpers.js'
import { createUser } from '@/lib/server/auth/users.repository.js'
import { hashPassword } from '@/lib/server/auth/password.js'
import { replaceQuizQuestions } from './quiz-question.repository.js'
import { listQuizResultsByUser } from './quiz-result.repository.js'
import { serviceGenerateAdminQuizDrafts } from './quiz-ai.service.js'
import {
  serviceCreateAdminQuizQuestion,
  serviceListAdminQuizQuestions,
  serviceListQuizQuestions,
  serviceSubmitQuiz,
} from './quiz.service.js'

beforeAll(async () => {
  await startMongo()
}, 60000)

afterAll(async () => {
  await stopMongo()
})

beforeEach(async () => {
  await clearMongo()
  delete process.env.MOCK_USER_ID
})

describe('quiz.service', () => {
  it('lists quiz questions filtered by job type', async () => {
    await replaceQuizQuestions([
      {
        jobType: 'Frontend Developer',
        type: 'mcq',
        difficulty: 'Beginner',
        question: 'What hook manages state?',
        options: ['useEffect', 'useState'],
        answer: 'useState',
        marks: 0.5,
      },
      {
        jobType: 'QA Tester',
        type: 'mcq',
        difficulty: 'Intermediate',
        question: 'What is regression testing?',
        options: ['A', 'B'],
        answer: 'A',
        marks: 0.5,
      },
    ])

    const result = await serviceListQuizQuestions('Frontend Developer')

    expect(result.count).toBe(1)
    expect(result.questions[0].jobType).toBe('Frontend Developer')
    expect(result.questions[0].difficulty).toBe('Beginner')
  })

  it('infers a level for questions seeded before difficulty was stored', async () => {
    await replaceQuizQuestions([
      {
        jobType: 'Frontend Developer',
        type: 'short',
        question: 'What is a React component?',
        options: [],
        answer: 'A reusable UI building block.',
        marks: 0.5,
      },
    ])

    const result = await serviceListQuizQuestions('Frontend Developer')

    expect(result.questions[0].difficulty).toBe('Advanced')
  })

  it('allows an admin to add a multiple-choice quiz question', async () => {
    const admin = await createUser({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      passwordHash: await hashPassword('password123'),
      role: 'admin',
    })
    process.env.MOCK_USER_ID = admin._id

    const result = await serviceCreateAdminQuizQuestion({
      jobType: 'Frontend Developer',
      type: 'mcq',
      difficulty: 'Intermediate',
      question: 'Which hook memoizes a computed value?',
      options: ['useEffect', 'useMemo', 'useRef'],
      answer: 'useMemo',
      marks: 0.5,
    })

    expect(result.question).toMatchObject({
      jobType: 'Frontend Developer',
      difficulty: 'Intermediate',
      answer: 'useMemo',
    })
    expect(result.question.options).toEqual(['useEffect', 'useMemo', 'useRef'])

    const listing = await serviceListAdminQuizQuestions()
    expect(listing).toMatchObject({ count: 1 })
    expect(listing.questions[0]._id).toBe(result.question._id)
  })

  it('rejects quiz creation when an MCQ answer is not one of its options', async () => {
    const admin = await createUser({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      passwordHash: await hashPassword('password123'),
      role: 'admin',
    })
    process.env.MOCK_USER_ID = admin._id

    await expect(
      serviceCreateAdminQuizQuestion({
        jobType: 'Frontend Developer',
        type: 'mcq',
        difficulty: 'Beginner',
        question: 'Which hook manages state?',
        options: ['useEffect', 'useMemo'],
        answer: 'useState',
        marks: 0.5,
      }),
    ).rejects.toMatchObject({ code: 'ANSWER_NOT_IN_OPTIONS', status: 400 })
  })

  it('generates validated AI quiz drafts for admin review', async () => {
    const admin = await createUser({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      passwordHash: await hashPassword('password123'),
      role: 'admin',
    })
    process.env.MOCK_USER_ID = admin._id

    const result = await serviceGenerateAdminQuizDrafts(
      {
        jobType: 'Backend Developer',
        topic: 'REST APIs',
        difficulty: 'Intermediate',
        type: 'mixed',
        count: 2,
      },
      {
        initialize: async () => {},
        chat: async () => ({
          content: JSON.stringify({
            questions: [
              {
                type: 'mcq',
                question: 'Which HTTP method is commonly used to create a resource?',
                options: ['GET', 'POST', 'DELETE', 'HEAD'],
                answer: 'POST',
                marks: 0.5,
              },
              {
                type: 'short',
                question: 'What does an HTTP 404 response indicate?',
                options: [],
                answer: 'The requested resource was not found.',
                marks: 0.5,
              },
            ],
          }),
          tokenUsage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
        }),
      },
    )

    expect(result).toMatchObject({ count: 2, requestedCount: 2 })
    expect(result.drafts[0]).toMatchObject({
      jobType: 'Backend Developer',
      difficulty: 'Intermediate',
      type: 'mcq',
      source: 'ai',
      answer: 'POST',
    })
    expect(result.drafts[1]).toMatchObject({
      type: 'short',
      source: 'ai',
      options: [],
    })
  })

  it('rejects malformed AI quiz responses without saving questions', async () => {
    const admin = await createUser({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      passwordHash: await hashPassword('password123'),
      role: 'admin',
    })
    process.env.MOCK_USER_ID = admin._id

    await expect(
      serviceGenerateAdminQuizDrafts(
        {
          jobType: 'QA Tester',
          difficulty: 'Beginner',
          type: 'mcq',
          count: 3,
        },
        {
          initialize: async () => {},
          chat: async () => ({ content: 'not-json' }),
        },
      ),
    ).rejects.toMatchObject({ code: 'AI_INVALID_RESPONSE', status: 502 })

    const questions = await serviceListAdminQuizQuestions()
    expect(questions.count).toBe(0)
  })

  it('calculates a submitted quiz on the server and saves the private result', async () => {
    const user = await createUser({
      firstName: 'Quiz',
      lastName: 'User',
      email: 'quiz-user@example.com',
      passwordHash: await hashPassword('password123'),
    })
    await replaceQuizQuestions([
      {
        jobType: 'Frontend Developer',
        type: 'mcq',
        difficulty: 'Beginner',
        question: 'Which hook manages state?',
        options: ['useEffect', 'useState'],
        answer: 'useState',
        marks: 0.5,
      },
      {
        jobType: 'Frontend Developer',
        type: 'short',
        difficulty: 'Advanced',
        question: 'What is React used for?',
        options: [],
        answer: 'building user interfaces',
        marks: 1,
      },
    ])
    const { questions } = await serviceListQuizQuestions('Frontend Developer')
    process.env.MOCK_USER_ID = user._id

    const submission = await serviceSubmitQuiz({
      jobType: 'Frontend Developer',
      answers: {
        [questions[0]._id]: 'useState',
        [questions[1]._id]: 'React is for building user interfaces with components.',
      },
    })

    expect(submission).toMatchObject({
      correctCount: 2,
      totalQuestions: 2,
      score: 1.5,
      totalMarks: 1.5,
      percentage: 100,
      passed: true,
    })
    expect(submission.questionResults.every((result) => result.correct)).toBe(true)

    const storedResults = await listQuizResultsByUser(user._id)
    expect(storedResults).toHaveLength(1)
    expect(storedResults[0]).toMatchObject({
      jobType: 'Frontend Developer',
      score: 1.5,
      totalMarks: 1.5,
      passed: true,
    })
  })
})
