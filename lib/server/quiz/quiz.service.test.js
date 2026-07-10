import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { clearMongo, startMongo, stopMongo } from '@/lib/cv-assistant/test/mongo-helpers.js'
import { replaceQuizQuestions } from './quiz-question.repository.js'
import { serviceListQuizQuestions } from './quiz.service.js'

beforeAll(async () => {
  await startMongo()
}, 60000)

afterAll(async () => {
  await stopMongo()
})

beforeEach(async () => {
  await clearMongo()
})

describe('quiz.service', () => {
  it('lists quiz questions filtered by job type', async () => {
    await replaceQuizQuestions([
      {
        jobType: 'Frontend Developer',
        type: 'mcq',
        question: 'What hook manages state?',
        options: ['useEffect', 'useState'],
        answer: 'useState',
        marks: 0.5,
      },
      {
        jobType: 'QA Tester',
        type: 'mcq',
        question: 'What is regression testing?',
        options: ['A', 'B'],
        answer: 'A',
        marks: 0.5,
      },
    ])

    const result = await serviceListQuizQuestions('Frontend Developer')

    expect(result.count).toBe(1)
    expect(result.questions[0].jobType).toBe('Frontend Developer')
  })
})
