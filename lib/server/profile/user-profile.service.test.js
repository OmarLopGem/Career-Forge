import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createUser } from '@/lib/server/auth/users.repository.js'
import { hashPassword } from '@/lib/server/auth/password.js'
import { createProfile } from '@/lib/cv-assistant/server/cv-profile.repository.js'
import { frontendProfile } from '@/lib/cv-assistant/test/fixtures.js'
import { clearMongo, startMongo, stopMongo } from '@/lib/cv-assistant/test/mongo-helpers.js'
import { createUserWarning } from '@/lib/server/admin/user-warning.repository.js'
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
  it('returns account details plus private professional profile summaries', async () => {
    const user = await createTestUser()
    await createProfile({
      ...frontendProfile,
      userId: user._id,
      title: 'Frontend Profile',
    })
    await createProfile({
      ...frontendProfile,
      userId: 'other-user-id',
      title: 'Other User Profile',
      isDefault: true,
    })
    await createUserWarning({
      userId: user._id,
      adminId: 'admin-user-id',
      message: 'Please review the community guidelines.',
    })
    process.env.MOCK_USER_ID = user._id

    const result = await serviceGetMyProfile()

    expect(result.account.userId).toBe(user._id)
    expect(result.account.email).toBe(user.email)
    expect(result.profiles).toHaveLength(1)
    expect(result.profiles[0].title).toBe('Frontend Profile')
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0].message).toBe('Please review the community guidelines.')
  })

  it('updates account-level fields without mixing in CV data', async () => {
    const user = await createTestUser()
    await createProfile({
      ...frontendProfile,
      userId: user._id,
      title: 'Default CV',
    })
    process.env.MOCK_USER_ID = user._id

    const result = await serviceUpdateMyProfile({
      firstName: 'Jorge',
      lastName: 'Lopez',
      dateOfBirth: '2000-10-09',
      headline: 'Aspiring frontend engineer',
      phone: '+1 555 0100',
      location: 'Kitchener, ON',
      linkedinUrl: 'https://linkedin.com/in/jorge',
      githubUrl: 'https://github.com/jorge',
      portfolioUrl: 'https://jorge.dev',
    })

    expect(result.account.firstName).toBe('Jorge')
    expect(result.account.lastName).toBe('Lopez')
    expect(result.account.dateOfBirth).toBe('2000-10-09')
    expect(result.account.headline).toBe('Aspiring frontend engineer')
    expect(result.profiles).toHaveLength(1)
    expect(result.profiles[0].title).toBe('Default CV')
  })
})
