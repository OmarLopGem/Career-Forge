import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  serviceCreateAdminUser,
  serviceListAdminUsers,
  serviceSetAdminUserStatus,
} from './admin-users.service.js'
import {
  createUser,
  getUserById,
} from '@/lib/server/auth/users.repository.js'
import { hashPassword } from '@/lib/server/auth/password.js'
import { serviceLogin } from '@/lib/server/auth/auth-service.js'
import { createSession } from '@/lib/server/auth/sessions.repository.js'
import {
  SESSION_DURATION_MS,
} from '@/lib/server/auth/session-cookie.js'
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
    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 10,
      total: 2,
      totalPages: 1,
    })
  })

  it('paginates results and returns correct pagination metadata', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    for (let i = 0; i < 12; i += 1) {
      await createTestUser({
        firstName: `Member${i}`,
        email: `member${i}@example.com`,
      })
    }
    process.env.MOCK_USER_ID = admin._id

    const firstPage = await serviceListAdminUsers({ page: 1, pageSize: 10 })
    expect(firstPage.users).toHaveLength(10)
    expect(firstPage.pagination).toEqual({
      page: 1,
      pageSize: 10,
      total: 13,
      totalPages: 2,
    })

    const secondPage = await serviceListAdminUsers({ page: 2, pageSize: 10 })
    expect(secondPage.users).toHaveLength(3)
    expect(secondPage.pagination.page).toBe(2)
  })

  it('clamps pageSize to the maximum allowed value', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    process.env.MOCK_USER_ID = admin._id

    const result = await serviceListAdminUsers({ pageSize: 9999 })

    expect(result.pagination.pageSize).toBe(100)
  })

  it('uses the default page size when inputs are invalid', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    process.env.MOCK_USER_ID = admin._id

    const result = await serviceListAdminUsers({ page: 'abc', pageSize: -5 })

    expect(result.pagination.page).toBe(1)
    expect(result.pagination.pageSize).toBe(10)
  })

  it('clamps page to the last available page when requested beyond range', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    for (let i = 0; i < 3; i += 1) {
      await createTestUser({
        firstName: `Member${i}`,
        email: `member${i}@example.com`,
      })
    }
    process.env.MOCK_USER_ID = admin._id

    const result = await serviceListAdminUsers({ page: 10, pageSize: 10 })

    expect(result.pagination.page).toBe(1)
    expect(result.pagination.totalPages).toBe(1)
  })

  it('reports zero pages when there are no users', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    await createTestUser({
      firstName: 'Disposable',
      email: 'disposable@example.com',
    })
    process.env.MOCK_USER_ID = admin._id

    const result = await serviceListAdminUsers({ page: 1, pageSize: 10 })
    expect(result.pagination.totalPages).toBe(1)
    expect(result.users).toHaveLength(2)
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

  it('admin can deactivate a user', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    const target = await createTestUser({
      firstName: 'Target',
      email: 'target@example.com',
      role: 'user',
    })
    process.env.MOCK_USER_ID = admin._id

    const result = await serviceSetAdminUserStatus(target._id, 'blocked')

    expect(result.user.status).toBe('blocked')

    const refetched = await getUserById(target._id)
    expect(refetched.status).toBe('blocked')
  })

  it('admin can reactivate a deactivated user', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    const target = await createTestUser({
      firstName: 'Target',
      email: 'target@example.com',
      role: 'user',
      status: 'blocked',
    })
    process.env.MOCK_USER_ID = admin._id

    const result = await serviceSetAdminUserStatus(target._id, 'active')

    expect(result.user.status).toBe('active')
  })

  it('non-admin cannot change user status', async () => {
    const member = await createTestUser({
      firstName: 'Member',
      email: 'member@example.com',
      role: 'user',
    })
    const target = await createTestUser({
      firstName: 'Target',
      email: 'target@example.com',
      role: 'user',
    })
    process.env.MOCK_USER_ID = member._id

    try {
      await serviceSetAdminUserStatus(target._id, 'blocked')
      throw new Error('expected forbidden')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(403)
      expect(body.error.code).toBe('FORBIDDEN')
    }
  })

  it('rejects invalid status string', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    const target = await createTestUser({
      firstName: 'Target',
      email: 'target@example.com',
      role: 'user',
    })
    process.env.MOCK_USER_ID = admin._id

    try {
      await serviceSetAdminUserStatus(target._id, 'banned')
      throw new Error('expected invalid status')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(400)
      expect(body.error.code).toBe('INVALID_STATUS')
    }
  })

  it('rejects invalid userId format', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    process.env.MOCK_USER_ID = admin._id

    try {
      await serviceSetAdminUserStatus('not-an-objectid', 'blocked')
      throw new Error('expected invalid user id')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(400)
      expect(body.error.code).toBe('INVALID_USER_ID')
    }
  })

  it('throws 404 when target user does not exist', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    process.env.MOCK_USER_ID = admin._id

    try {
      await serviceSetAdminUserStatus('507f1f77bcf86cd799439011', 'blocked')
      throw new Error('expected user not found')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(404)
      expect(body.error.code).toBe('USER_NOT_FOUND')
    }
  })

  it('prevents admin from deactivating themselves', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    process.env.MOCK_USER_ID = admin._id

    try {
      await serviceSetAdminUserStatus(admin._id, 'blocked')
      throw new Error('expected self-deactivation guard')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(400)
      expect(body.error.code).toBe('CANNOT_DEACTIVATE_SELF')
    }
  })

  it('protects the last active admin from being deactivated', async () => {
    const admin = await createTestUser({
      firstName: 'Solo',
      email: 'solo-admin@example.com',
      role: 'admin',
    })
    process.env.MOCK_USER_ID = admin._id

    try {
      await serviceSetAdminUserStatus(admin._id, 'blocked')
      throw new Error('expected last admin guard')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(400)
      expect(body.error.code).toBe('CANNOT_DEACTIVATE_SELF')
    }
  })

  it('allows deactivating an admin when another active admin exists', async () => {
    const adminA = await createTestUser({
      firstName: 'AdminA',
      email: 'admin-a@example.com',
      role: 'admin',
    })
    const adminB = await createTestUser({
      firstName: 'AdminB',
      email: 'admin-b@example.com',
      role: 'admin',
    })
    process.env.MOCK_USER_ID = adminA._id

    const result = await serviceSetAdminUserStatus(adminB._id, 'blocked')

    expect(result.user.status).toBe('blocked')
  })

  it('is idempotent when status already matches target', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    const target = await createTestUser({
      firstName: 'Target',
      email: 'target@example.com',
      role: 'user',
      status: 'active',
    })
    process.env.MOCK_USER_ID = admin._id
    const before = target.updatedAt

    await new Promise((resolve) => setTimeout(resolve, 5))

    const result = await serviceSetAdminUserStatus(target._id, 'active')

    expect(result.user.status).toBe('active')
    const refetched = await getUserById(target._id)
    expect(refetched.updatedAt).toBe(before)
  })

  it('deactivating a user deletes their sessions', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    const target = await createTestUser({
      firstName: 'Target',
      email: 'target@example.com',
      role: 'user',
    })
    process.env.MOCK_USER_ID = admin._id

    await createSession(target._id, SESSION_DURATION_MS)
    await createSession(target._id, SESSION_DURATION_MS)

    const { getDb } = await import('@/lib/cv-assistant/server/mongo.js')
    const db = await getDb()
    const beforeSessions = await db.collection('sessions').countDocuments({
      userId: target._id,
    })
    expect(beforeSessions).toBe(2)

    await serviceSetAdminUserStatus(target._id, 'blocked')

    const afterSessions = await db.collection('sessions').countDocuments({
      userId: target._id,
    })
    expect(afterSessions).toBe(0)
  })

  it('blocked users cannot log in', async () => {
    const passwordHash = await hashPassword('password123')
    const target = await createUser({
      firstName: 'Target',
      lastName: 'User',
      email: 'target@example.com',
      passwordHash,
      role: 'user',
      status: 'active',
    })
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    process.env.MOCK_USER_ID = admin._id

    await serviceSetAdminUserStatus(target._id, 'blocked')

    delete process.env.MOCK_USER_ID

    try {
      await serviceLogin({
        email: 'target@example.com',
        password: 'password123',
      })
      throw new Error('expected login to be rejected')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(403)
      expect(body.error.code).toBe('ACCOUNT_INACTIVE')
    }
  })
})
