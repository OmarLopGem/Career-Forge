import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { hashPassword } from '@/lib/server/auth/password.js'
import { createUser, getUserById } from '@/lib/server/auth/users.repository.js'
import { createProfile } from '@/lib/cv-assistant/server/cv-profile.repository.js'
import { createAnalysisFromDraft } from '@/lib/cv-assistant/server/cv-analysis.repository.js'
import { frontendProfile } from '@/lib/cv-assistant/test/fixtures.js'
import { serviceOverrideCvAnalysis } from '@/lib/server/admin/admin-cv-analysis.service.js'
import { getCvAnalysisModel } from '@/lib/db/models/cv-analysis.js'
import { serviceListMyNotifications } from '@/lib/server/notifications/notification.service.js'
import { clearMongo, startMongo, stopMongo } from '@/lib/cv-assistant/test/mongo-helpers.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'

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

async function createAdmin() {
  const passwordHash = await hashPassword('password123')
  return createUser({
    firstName: 'Admin',
    lastName: 'Reviewer',
    email: 'admin@example.com',
    passwordHash,
    role: 'admin',
    status: 'active',
  })
}

async function createCandidateWithAnalysis() {
  const passwordHash = await hashPassword('password123')
  const candidate = await createUser({
    firstName: 'Sam',
    lastName: 'Seeker',
    email: 'sam@example.com',
    passwordHash,
    role: 'user',
    status: 'active',
  })
  const profile = await createProfile({
    ...frontendProfile,
    userId: candidate._id,
    title: 'Profile',
  })
  await createAnalysisFromDraft(candidate._id, profile._id, {
    gradingMode: 'ai',
    overallScore: 72,
    atsFeedback: { score: 68, comments: 'ok', formattingWarnings: [], keywordSuggestions: [] },
    suggestions: [],
    strengths: [],
    weaknesses: [],
  })
  return { candidate, profile }
}

describe('admin CV analysis override', () => {
  it('creates a new admin-override analysis while keeping the original AI one', async () => {
    const admin = await createAdmin()
    const { candidate, profile } = await createCandidateWithAnalysis()
    process.env.MOCK_USER_ID = admin._id

    const { analysis } = await serviceOverrideCvAnalysis(candidate._id, profile._id, {
      overallScore: 88,
      atsScore: 90,
      reason: 'AI misread the seniority level. Adjusting upward.',
    })

    expect(analysis).toMatchObject({
      gradingMode: 'admin-override',
      overallScore: 88,
      lastEditedByUserId: admin._id,
      lastEditedReason: 'AI misread the seniority level. Adjusting upward.',
    })
    expect(analysis.atsFeedback.score).toBe(90)

    const AnalysisModel = await getCvAnalysisModel()
    const docs = await AnalysisModel.find({ userId: candidate._id, profileId: profile._id })
      .sort({ createdAt: -1 })

    expect(docs).toHaveLength(2)
    const [latest, original] = docs
    expect(latest.gradingMode).toBe('admin-override')
    expect(original.gradingMode).toBe('ai')
    expect(original.overallScore).toBe(72)
  })

  it('notifies the candidate about the manual adjustment', async () => {
    const admin = await createAdmin()
    const { candidate, profile } = await createCandidateWithAnalysis()
    process.env.MOCK_USER_ID = admin._id

    await serviceOverrideCvAnalysis(candidate._id, profile._id, {
      overallScore: 88,
      atsScore: 90,
      reason: 'AI misread the seniority level. Adjusting upward.',
    })

    process.env.MOCK_USER_ID = candidate._id
    const inbox = await serviceListMyNotifications()

    expect(inbox.notifications).toHaveLength(1)
    expect(inbox.notifications[0]).toMatchObject({
      audience: 'user',
      targetUserId: candidate._id,
      title: 'A career advisor updated your CV review',
      level: 'info',
      link: '/cv-assistant',
    })
  })

  it('rejects overrides without a reason', async () => {
    const admin = await createAdmin()
    const { candidate, profile } = await createCandidateWithAnalysis()
    process.env.MOCK_USER_ID = admin._id

    try {
      await serviceOverrideCvAnalysis(candidate._id, profile._id, {
        overallScore: 88,
        atsScore: 90,
        reason: 'short',
      })
      throw new Error('expected error')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(400)
      expect(body.error.code).toBe('INVALID_OVERRIDE_REASON')
    }
  })

  it('rejects override from a non-admin user', async () => {
    const passwordHash = await hashPassword('password123')
    const user = await createUser({
      firstName: 'Member',
      lastName: 'User',
      email: 'member@example.com',
      passwordHash,
      role: 'user',
      status: 'active',
    })
    const { candidate, profile } = await createCandidateWithAnalysis()
    process.env.MOCK_USER_ID = user._id

    try {
      await serviceOverrideCvAnalysis(candidate._id, profile._id, {
        overallScore: 88,
        atsScore: 90,
        reason: 'Attempting to manipulate the grade',
      })
      throw new Error('expected error')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(403)
      expect(body.error.code).toBe('FORBIDDEN')
    }
  })

  it('clamps scores into the allowed range', async () => {
    const admin = await createAdmin()
    const { candidate, profile } = await createCandidateWithAnalysis()
    process.env.MOCK_USER_ID = admin._id

    const { analysis } = await serviceOverrideCvAnalysis(candidate._id, profile._id, {
      overallScore: 250,
      atsScore: -5,
      reason: 'Manual adjustment beyond range to validate clamping behavior.',
    })

    expect(analysis.overallScore).toBe(100)
    expect(analysis.atsFeedback.score).toBe(0)
  })
})