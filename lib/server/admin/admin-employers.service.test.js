import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { hashPassword } from '@/lib/server/auth/password.js'
import { createUser } from '@/lib/server/auth/users.repository.js'
import {
  createEmployer,
  setEmployerStatus,
} from '@/lib/db/models/employer.js'
import {
  serviceListEmployers,
  serviceListPendingEmployers,
  serviceSuspendEmployer,
  serviceVerifyEmployer,
} from '@/lib/server/admin/admin-employers.service.js'
import { serviceLogin } from '@/lib/server/auth/auth-service.js'
import { getSessionModel } from '@/lib/db/models/session.js'
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
    lastName: 'Ops',
    email: 'admin@example.com',
    passwordHash,
    role: 'admin',
    status: 'active',
  })
}

async function createPendingEmployer() {
  const passwordHash = await hashPassword('password123')
  const user = await createUser({
    firstName: 'Owner',
    lastName: 'Boss',
    email: 'employer@example.com',
    passwordHash,
    role: 'employer',
    status: 'pending',
  })
  const employer = await createEmployer({ ownerUserId: user._id, name: 'Pending Co' })
  return { user, employer }
}

describe('admin employer verification', () => {
  it('lists employers and pending employers separately', async () => {
    const admin = await createAdmin()
    const { employer } = await createPendingEmployer()
    process.env.MOCK_USER_ID = admin._id

    const all = await serviceListEmployers()
    const pending = await serviceListPendingEmployers()

    expect(all.employers.map((e) => e._id)).toContain(employer._id)
    expect(pending.employers.map((e) => e._id)).toEqual([employer._id])
  })

  it('verifies an employer and marks the user as able to sign in', async () => {
    const admin = await createAdmin()
    const { user, employer } = await createPendingEmployer()
    process.env.MOCK_USER_ID = admin._id

    const { employer: updated } = await serviceVerifyEmployer(employer._id)

    expect(updated.status).toBe('verified')
    expect(updated.verifiedByUserId).toBe(admin._id)

    // Pending user can already log in to see the dashboard; verified stays the same.
    delete process.env.MOCK_USER_ID
    const login = await serviceLogin({
      email: 'employer@example.com',
      password: 'password123',
    })

    expect(login.user.status).toBe('active')
  })

  it('suspending an employer kills the user sessions', async () => {
    const admin = await createAdmin()
    const { user, employer } = await createPendingEmployer()
    process.env.MOCK_USER_ID = admin._id

    await serviceVerifyEmployer(employer._id)

    const { createSession } = await import('@/lib/server/auth/sessions.repository.js')
    const { SESSION_DURATION_MS } = await import('@/lib/server/auth/session-cookie.js')
    await createSession(user._id, SESSION_DURATION_MS)
    await createSession(user._id, SESSION_DURATION_MS)

    process.env.MOCK_USER_ID = admin._id
    const { employer: suspended } = await serviceSuspendEmployer(employer._id)

    expect(suspended.status).toBe('suspended')

    const SessionModel = await getSessionModel()
    const remaining = await SessionModel.countDocuments({ userId: user._id })
    expect(remaining).toBe(0)
  })

  it('rejects non-admin users from verifying', async () => {
    const passwordHash = await hashPassword('password123')
    const member = await createUser({
      firstName: 'Member',
      lastName: 'User',
      email: 'member@example.com',
      passwordHash,
      role: 'user',
      status: 'active',
    })
    const { employer } = await createPendingEmployer()
    process.env.MOCK_USER_ID = member._id

    try {
      await serviceVerifyEmployer(employer._id)
      throw new Error('expected error')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(403)
      expect(body.error.code).toBe('FORBIDDEN')
    }
  })
})