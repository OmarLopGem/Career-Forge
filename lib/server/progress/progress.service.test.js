import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createUser } from '@/lib/server/auth/users.repository.js'
import { hashPassword } from '@/lib/server/auth/password.js'
import { clearMongo, startMongo, stopMongo } from '@/lib/cv-assistant/test/mongo-helpers.js'
import { createProfile } from '@/lib/cv-assistant/server/cv-profile.repository.js'
import { frontendProfile } from '@/lib/cv-assistant/test/fixtures.js'
import { serviceCreateJobApplication } from '@/lib/job-tracker/server/job-tracker.service.js'
import { serviceGetProgressOverview, serviceRecordQuizResult } from './progress.service.js'

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

async function createScopedUser(email) {
  const user = await createUser({
    email,
    firstName: 'Test',
    lastName: 'User',
    passwordHash: await hashPassword('password123'),
    role: 'user',
    status: 'active',
  })
  process.env.MOCK_USER_ID = user._id
  return user
}

describe('progress.service', () => {
  it('records quiz attempts for the current user', async () => {
    await createScopedUser('progress-user@example.com')

    const result = await serviceRecordQuizResult({
      jobType: 'Frontend Developer',
      score: 8.5,
      correctCount: 17,
      totalQuestions: 20,
      feedback: 'Strong performance.',
    })

    expect(result.result.jobType).toBe('Frontend Developer')
    expect(result.result.passed).toBe(true)
  })

  it('builds a private progress overview from quiz, profile, and job data', async () => {
    const user = await createScopedUser('overview-user@example.com')
    const profile = await createProfile({
      ...frontendProfile,
      userId: user._id,
      title: 'Frontend Profile',
    })

    await serviceRecordQuizResult({
      jobType: 'Frontend Developer',
      score: 7.5,
      correctCount: 15,
      totalQuestions: 20,
      feedback: 'Good job.',
    })

    await serviceCreateJobApplication({
      cvProfileId: profile._id,
      status: 'applied',
      jobSnapshot: {
        title: 'Frontend Developer',
        company: 'Nova Apps',
        location: 'Remote',
        url: 'https://example.com/frontend',
        source: 'Manual',
      },
    })

    const overview = await serviceGetProgressOverview()

    expect(overview.summary.profiles).toBe(1)
    expect(overview.summary.activeApplications).toBe(1)
    expect(overview.summary.quiz.attempts).toBe(1)
    expect(overview.quizResults[0].jobType).toBe('Frontend Developer')
    expect(overview.profileProgress[0].title).toBe('Frontend Profile')
  })
})
