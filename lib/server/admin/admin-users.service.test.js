import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  serviceCreateAdminUser,
  serviceListAdminUsers,
} from './admin-users.service.js'
import { createUser } from '@/lib/server/auth/users.repository.js'
import { hashPassword } from '@/lib/server/auth/password.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'
import { clearMongo, startMongo, stopMongo } from '@/lib/cv-assistant/test/mongo-helpers.js'

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

describe('admin-users.service', () => {
  it('admin can list existing users', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    await createTestUser({
      firstName: 'Member',
      email: 'member@example.com',
    })
    process.env.MOCK_USER_ID = admin._id

    const result = await serviceListAdminUsers()

    expect(result.users).toHaveLength(2)
    expect(result.users.every((user) => !('passwordHash' in user))).toBe(true)
  })

  it('admin can create users manually', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    process.env.MOCK_USER_ID = admin._id

    const result = await serviceCreateAdminUser({
      firstName: 'Omar',
      lastName: 'Lopez',
      email: 'omar@example.com',
      password: 'password123',
      role: 'user',
    })

    expect(result.user.email).toBe('omar@example.com')
    expect(result.user.role).toBe('user')
  })

  it('non-admin users cannot access admin services', async () => {
    const member = await createTestUser({
      firstName: 'Member',
      email: 'member@example.com',
      role: 'user',
    })
    process.env.MOCK_USER_ID = member._id

    try {
      await serviceListAdminUsers()
      throw new Error('expected forbidden error')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(403)
      expect(body.error.code).toBe('FORBIDDEN')
    }
  })
})
