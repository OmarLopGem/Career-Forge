import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { clearMongo, startMongo, stopMongo } from '@/lib/cv-assistant/test/mongo-helpers.js'
import { getQuizQuestionModel } from '@/lib/db/models/quiz-question.js'
import { createUser } from '@/lib/server/auth/users.repository.js'
import { hashPassword } from '@/lib/server/auth/password.js'
import { getQuizDifficulty } from './quiz-question.repository.js'
import { listQuizResultsByUser } from '@/lib/server/progress/quiz-result.repository.js'
import { serviceGenerateAdminQuizDrafts } from './quiz-ai.service.js'
import {
  serviceCreateAdminQuizQuestion,
  serviceListAdminQuizQuestions,
  serviceListQuizQuestions,
  serviceSubmitQuiz,
} from './quiz.service.js'

async function seedQuizQuestions(questions) {
  const QuizQuestion = await getQuizQuestionModel()
  const now = new Date().toISOString()
  await QuizQuestion.deleteMany({})

  if (!questions.length) {
    return 0
  }

  await QuizQuestion.insertMany(
    questions.map((question) => ({
      jobType: question.jobType,
      type: question.type,
      difficulty: getQuizDifficulty(question),
      source: question.source ?? 'seed',
      question: question.question,
      options: question.options ?? [],
      answer: question.answer,
      marks: question.marks,
      createdAt: now,
      updatedAt: now,
    })),
  )

  return questions.length
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
})

describe('quiz.service', () => {
  it('starts a new user with only Beginner objective questions', async () => {
    const user = await createUser({
      firstName: 'New',
      lastName: 'User',
      email: 'new-user@example.com',
      passwordHash: await hashPassword('password123'),
    })
    process.env.MOCK_USER_ID = user._id

    await seedQuizQuestions([
      ...Array.from({ length: 10 }, (_, index) => ({
        jobType: 'Frontend Developer',
        type: index < 5 ? 'mcq' : 'blank',
        difficulty: index < 4 ? 'Beginner' : index < 7 ? 'Intermediate' : 'Advanced',
        question: `Objective question ${index + 1}`,
        options: index < 5 ? ['Correct', 'Incorrect'] : [],
        answer: 'Correct',
        marks: 1,
      })),
      {
        jobType: 'Frontend Developer',
        type: 'short',
        difficulty: 'Advanced',
        question: 'Explain component composition.',
        answer: 'Combining components.',
        marks: 0.5,
      },
    ])

    const result = await serviceListQuizQuestions('Frontend Developer')

    expect(result.count).toBe(10)
    expect(result.questions[0].jobType).toBe('Frontend Developer')
    expect(result.questions[0].answer).toBeUndefined()
    expect(result.questions.every((question) => question.difficulty === 'Beginner')).toBe(true)
    expect(result.questions.every((question) => question.type !== 'short')).toBe(true)
    expect(result.difficulty).toBe('Beginner')
  })

  it('infers a level for questions created before difficulty was stored', () => {
    expect(getQuizDifficulty({ type: 'mcq' })).toBe('Beginner')
    expect(getQuizDifficulty({ type: 'blank' })).toBe('Intermediate')
    expect(getQuizDifficulty({ type: 'short' })).toBe('Advanced')
  })

  it('distributes legacy objective questions across levels and excludes one-line questions', async () => {
    const user = await createUser({
      firstName: 'Legacy',
      lastName: 'Learner',
      email: 'legacy-learner@example.com',
      passwordHash: await hashPassword('password123'),
    })
    process.env.MOCK_USER_ID = user._id

    const QuizQuestion = await getQuizQuestionModel()
    const now = new Date().toISOString()
    await QuizQuestion.insertMany([
      ...Array.from({ length: 12 }, (_, index) => ({
        jobType: 'Frontend Developer',
        type: index < 6 ? 'mcq' : 'blank',
        question: `Legacy question ${index + 1}`,
        options: index < 4 ? ['Correct', 'Incorrect'] : [],
        answer: 'Correct',
        marks: 1,
        createdAt: now,
        updatedAt: now,
      })),
      {
        jobType: 'Frontend Developer',
        type: 'short',
        question: 'Legacy one-line question',
        answer: 'Subjective answer',
        marks: 1,
        createdAt: now,
        updatedAt: now,
      },
    ])

    const beginnerQuiz = await serviceListQuizQuestions('Frontend Developer')
    expect(beginnerQuiz).toMatchObject({ difficulty: 'Beginner', count: 10 })
    expect(beginnerQuiz.questions.every((question) => question.type !== 'short')).toBe(true)

    await serviceSubmitQuiz({
      jobType: 'Frontend Developer',
      difficulty: 'Beginner',
      answers: Object.fromEntries(beginnerQuiz.questions.map((question) => [question._id, 'Correct'])),
    })

    const intermediateQuiz = await serviceListQuizQuestions('Frontend Developer')
    expect(intermediateQuiz).toMatchObject({ difficulty: 'Intermediate', count: 10 })
    expect(intermediateQuiz.questions.every((question) => question.difficulty === 'Intermediate')).toBe(true)
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
        generate: async () => ({
          data: {
            questions: [
              {
                type: 'mcq',
                question: 'Which HTTP method is commonly used to create a resource?',
                options: ['GET', 'POST', 'DELETE', 'HEAD'],
                answer: 'POST',
                marks: 0.5,
              },
              {
                type: 'blank',
                question: 'An HTTP 404 response means the resource was ______.',
                options: [],
                answer: 'not found',
                marks: 0.5,
              },
            ],
          },
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
      type: 'blank',
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
          generate: async () => ({
            data: { questions: 'not-an-array' },
            tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          }),
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
    await seedQuizQuestions([
      ...Array.from({ length: 10 }, (_, index) => ({
        jobType: 'Frontend Developer',
        type: index < 5 ? 'mcq' : 'blank',
        difficulty: 'Beginner',
        question: `Beginner scoring question ${index + 1}`,
        options: index < 5 ? ['Correct', 'Incorrect'] : [],
        answer: 'Correct',
        marks: 1,
      })),
      {
        jobType: 'Frontend Developer',
        type: 'mcq',
        difficulty: 'Intermediate',
        question: 'Which hook runs side effects?',
        options: ['Correct', 'Incorrect'],
        answer: 'Correct',
        marks: 1,
      },
      {
        jobType: 'Frontend Developer',
        type: 'short',
        difficulty: 'Advanced',
        question: 'Explain React reconciliation.',
        options: [],
        answer: 'Comparing UI trees.',
        marks: 1,
      },
    ])
    process.env.MOCK_USER_ID = user._id
    const { questions, difficulty } = await serviceListQuizQuestions('Frontend Developer')

    const submission = await serviceSubmitQuiz({
      jobType: 'Frontend Developer',
      difficulty,
      answers: Object.fromEntries(questions.map((question) => [question._id, 'Correct'])),
    })

    expect(submission).toMatchObject({
      correctCount: 10,
      totalQuestions: 10,
      score: 10,
      totalMarks: 10,
      percentage: 100,
      passed: true,
      difficulty: 'Beginner',
      nextDifficulty: 'Intermediate',
    })
    expect(submission.questionResults.every((result) => result.correct)).toBe(true)

    const storedResults = await listQuizResultsByUser(user._id)
    expect(storedResults).toHaveLength(1)
    expect(storedResults[0]).toMatchObject({
      jobType: 'Frontend Developer',
      score: 10,
      totalMarks: 10,
      passed: true,
      difficulty: 'Beginner',
    })

    const nextQuiz = await serviceListQuizQuestions('Frontend Developer')
    expect(nextQuiz).toMatchObject({ difficulty: 'Intermediate', count: 10 })
    expect(nextQuiz.questions.every((question) => question.difficulty === 'Intermediate')).toBe(true)
  })
})
