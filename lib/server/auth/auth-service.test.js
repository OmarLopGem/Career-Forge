import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getSessionModel } from '@/lib/db/models/session.js'
import { serviceGetCurrentUser, serviceLogin, serviceRegister } from './auth-service.js'
import { getCurrentUserFromRequest } from './current-user.js'
import { hashPassword } from './password.js'
import { getSessionByToken } from './sessions.repository.js'
import { createUser, getUserByEmail } from './users.repository.js'
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

describe('auth-service', () => {
  it('register creates a user with a hashed password and session', async () => {
    const result = await serviceRegister({
      firstName: 'Omar',
      lastName: 'Lopez',
      email: 'omar@example.com',
      password: 'password123',
    })

    const storedUser = await getUserByEmail('omar@example.com')
    const storedSession = await getSessionByToken(result.session.token)

    expect(result.user.email).toBe('omar@example.com')
    expect(storedUser.passwordHash).not.toBe('password123')
    expect(storedSession.userId).toBe(result.user._id)
  })

  it('register rejects duplicate emails', async () => {
    await serviceRegister({
      firstName: 'Omar',
      lastName: 'Lopez',
      email: 'omar@example.com',
      password: 'password123',
    })

    try {
      await serviceRegister({
        firstName: 'Other',
        lastName: 'User',
        email: 'omar@example.com',
        password: 'password123',
      })
      throw new Error('expected duplicate email error')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(409)
      expect(body.error.code).toBe('EMAIL_IN_USE')
    }
  })

  it('register rejects weak passwords', async () => {
    try {
      await serviceRegister({
        firstName: 'Omar',
        lastName: 'Lopez',
        email: 'omar@example.com',
        password: 'short',
      })
      throw new Error('expected weak password error')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(400)
      expect(body.error.code).toBe('WEAK_PASSWORD')
    }
  })

  it('login validates credentials and creates a new session', async () => {
    await serviceRegister({
      firstName: 'Ana',
      lastName: 'Diaz',
      email: 'ana@example.com',
      password: 'password123',
    })

    const result = await serviceLogin({
      email: 'ana@example.com',
      password: 'password123',
    })

    const storedSession = await getSessionByToken(result.session.token)

    expect(result.user.firstName).toBe('Ana')
    expect(storedSession).not.toBeNull()
  })

  it('stores session expiration as a Mongo date so TTL cleanup can work', async () => {
    const result = await serviceRegister({
      firstName: 'Omar',
      lastName: 'Lopez',
      email: 'ttl@example.com',
      password: 'password123',
    })

    const Session = await getSessionModel()
    const rawSession = await Session.findOne({ token: result.session.token })

    expect(rawSession).not.toBeNull()
    expect(rawSession.expiresAt).toBeInstanceOf(Date)
  })

  it('login rejects invalid credentials', async () => {
    await serviceRegister({
      firstName: 'Mia',
      lastName: 'Chen',
      email: 'mia@example.com',
      password: 'password123',
    })

    try {
      await serviceLogin({
        email: 'mia@example.com',
        password: 'wrong-password',
      })
      throw new Error('expected login error')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(401)
      expect(body.error.code).toBe('INVALID_CREDENTIALS')
    }
  })

  it('does not expose a suspended user as the current active user', async () => {
    const passwordHash = await hashPassword('password123')
    const user = await createUser({
      firstName: 'Suspended',
      lastName: 'User',
      email: 'suspended@example.com',
      passwordHash,
      status: 'blocked',
    })
    process.env.MOCK_USER_ID = user._id

    expect(await getCurrentUserFromRequest()).toBeNull()

    try {
      await serviceGetCurrentUser()
      throw new Error('expected suspended account to be rejected')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(403)
      expect(body.error.code).toBe('ACCOUNT_INACTIVE')
    }
  })
})
