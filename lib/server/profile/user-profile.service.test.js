import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createUser } from '@/lib/server/auth/users.repository.js'
import { hashPassword } from '@/lib/server/auth/password.js'
import { clearMongo, startMongo, stopMongo } from '@/lib/cv-assistant/test/mongo-helpers.js'
import { serviceGetMyProfile, serviceUpdateMyProfile } from './user-profile.service.js'

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

async function createTestUser(overrides = {}) {
  const passwordHash = await hashPassword('password123')

  return createUser({
    firstName: overrides.firstName ?? 'Test',
    lastName: overrides.lastName ?? 'User',
    email: overrides.email ?? 'test@example.com',
    passwordHash,
    role: overrides.role ?? 'user',
    status: overrides.status ?? 'active',
  })
}

describe('user-profile.service', () => {
  it('returns a default profile when the user has not saved one yet', async () => {
    const user = await createTestUser()
    process.env.MOCK_USER_ID = user._id

    const result = await serviceGetMyProfile()

    expect(result.profile.userId).toBe(user._id)
    expect(result.profile.skills).toEqual([])
    expect(result.profile.experience).toEqual([])
  })

  it('updates and returns the authenticated user profile only', async () => {
    const user = await createTestUser()
    await createTestUser({ email: 'other@example.com' })
    process.env.MOCK_USER_ID = user._id

    await serviceUpdateMyProfile({
      photoUrl: 'https://example.com/photo.jpg',
      headline: 'Frontend Developer',
      description: 'Building accessible interfaces.',
      skills: ['React', 'MongoDB'],
      experience: [
        {
          company: 'Career Forge',
          title: 'Intern',
          startDate: '2026-01',
          endDate: '2026-06',
          description: 'Worked on the dashboard.',
        },
      ],
    })

    const result = await serviceGetMyProfile()

    expect(result.profile.headline).toBe('Frontend Developer')
    expect(result.profile.skills).toEqual(['React', 'MongoDB'])
    expect(result.profile.experience).toHaveLength(1)
    expect(result.profile.userId).toBe(user._id)
  })
})
