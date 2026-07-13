import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createUser } from '@/lib/server/auth/users.repository.js'
import { hashPassword } from '@/lib/server/auth/password.js'
import { clearMongo, startMongo, stopMongo } from '@/lib/cv-assistant/test/mongo-helpers.js'
import { createProfile } from '@/lib/cv-assistant/server/cv-profile.repository.js'
import { frontendProfile } from '@/lib/cv-assistant/test/fixtures.js'
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
  it('returns account details from users plus the professional profile list', async () => {
    const user = await createTestUser()
    await createProfile({
      ...frontendProfile,
      userId: user._id,
      title: 'Frontend Profile',
    })
    process.env.MOCK_USER_ID = user._id

    const result = await serviceGetMyProfile()

    expect(result.account.userId).toBe(user._id)
    expect(result.account.email).toBe(user.email)
    expect(result.profiles).toHaveLength(1)
    expect(result.profiles[0].title).toBe('Frontend Profile')
  })

  it('updates and returns the authenticated account details only', async () => {
    const user = await createTestUser()
    await createTestUser({ email: 'other@example.com' })
    process.env.MOCK_USER_ID = user._id

    await serviceUpdateMyProfile({
      firstName: 'Jorge',
      lastName: 'Lopez',
      dateOfBirth: '1998-04-17',
      photoUrl: 'https://example.com/photo.jpg',
      headline: 'Frontend Developer',
      phone: '+1 555 0100',
      location: 'Kitchener, ON',
      linkedinUrl: 'https://linkedin.com/in/test-user',
      githubUrl: 'https://github.com/test-user',
      portfolioUrl: 'https://test-user.dev',
    })

    const result = await serviceGetMyProfile()

    expect(result.account.firstName).toBe('Jorge')
    expect(result.account.lastName).toBe('Lopez')
    expect(result.account.dateOfBirth).toBe('1998-04-17')
    expect(result.account.headline).toBe('Frontend Developer')
    expect(result.account.phone).toBe('+1 555 0100')
    expect(result.account.linkedinUrl).toBe('https://linkedin.com/in/test-user')
    expect(result.account.userId).toBe(user._id)
  })
})
