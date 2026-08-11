import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { hashPassword } from '@/lib/server/auth/password.js'
import { createUser, getUserByEmail } from '@/lib/server/auth/users.repository.js'
import { serviceRegister } from '@/lib/server/auth/auth-service.js'
import {
  createEmployer,
  getEmployerByOwner,
  listEmployersByStatuses,
  setEmployerStatus,
} from '@/lib/db/models/employer.js'
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
})

async function createActiveUser(overrides = {}) {
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

describe('employer registration', () => {
  it('registers a candidate with role user and active status', async () => {
    const result = await serviceRegister({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'password123',
      requestedRole: 'user',
    })

    expect(result.user).toMatchObject({ role: 'user', status: 'active' })
    const stored = await getUserByEmail('ada@example.com')
    expect(stored.role).toBe('user')
  })

  it('registers an employer with pending status and links to a pending employer doc', async () => {
    const result = await serviceRegister({
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace@example.com',
      password: 'password123',
      requestedRole: 'employer',
      companyName: 'Compiler Co',
      companyWebsite: 'https://compiler.example.com',
      companyIndustry: 'Software',
    })

    expect(result.user).toMatchObject({
      role: 'employer',
      status: 'pending',
    })

    const employer = await getEmployerByOwner(result.user._id)
    expect(employer).toMatchObject({
      name: 'Compiler Co',
      status: 'pending',
      ownerUserId: result.user._id,
    })
  })

  it('rejects employer registration when company name is missing', async () => {
    try {
      await serviceRegister({
        firstName: 'Hedy',
        lastName: 'Lamarr',
        email: 'hedy@example.com',
        password: 'password123',
        requestedRole: 'employer',
      })
      throw new Error('expected error')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(400)
      expect(body.error.code).toBe('COMPANY_NAME_REQUIRED')
    }
  })

  it('rejects unknown roles', async () => {
    try {
      await serviceRegister({
        firstName: 'Test',
        lastName: 'User',
        email: 'tester@example.com',
        password: 'password123',
        requestedRole: 'admin',
      })
      throw new Error('expected error')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(400)
      expect(body.error.code).toBe('INVALID_ROLE')
    }
  })
})

describe('employer repository', () => {
  it('verifies an employer and stamps verifiedBy + verifiedAt', async () => {
    const owner = await createActiveUser({ email: 'owner@example.com' })
    const employer = await createEmployer({ ownerUserId: owner._id, name: 'Verified Co' })
    const admin = await createActiveUser({ email: 'admin@example.com', role: 'admin' })

    const updated = await setEmployerStatus(employer._id, 'verified', admin._id)

    expect(updated.status).toBe('verified')
    expect(updated.verifiedAt).not.toBeNull()
    expect(updated.verifiedByUserId).toBe(admin._id)
  })

  it('lists pending employers', async () => {
    const ownerA = await createActiveUser({ email: 'a@example.com' })
    const ownerB = await createActiveUser({ email: 'b@example.com' })
    const pendingA = await createEmployer({ ownerUserId: ownerA._id, name: 'Pending Co' })
    const pendingB = await createEmployer({ ownerUserId: ownerB._id, name: 'Pending Two' })
    await createEmployer({ ownerUserId: ownerA._id, name: 'Verified Co', status: 'verified' })

    const pending = await listEmployersByStatuses(['pending'])

    expect(pending.map((employer) => employer._id).sort()).toEqual(
      [pendingA._id, pendingB._id].sort(),
    )
  })
})