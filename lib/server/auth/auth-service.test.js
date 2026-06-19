import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { serviceLogin, serviceRegister } from './auth-service.js'
import { getSessionByToken } from './sessions.repository.js'
import { getUserByEmail } from './users.repository.js'
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
})
