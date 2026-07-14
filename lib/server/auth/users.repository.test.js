import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ObjectId } from 'mongodb'
import {
  ALLOWED_USER_STATUSES,
  countActiveAdmins,
  createUser,
  listUsers,
  setUserStatus,
  updateUserAccount,
} from './users.repository.js'
import { hashPassword } from './password.js'
import { getDb } from '@/lib/cv-assistant/server/mongo.js'
import { clearMongo, startMongo, stopMongo } from '@/lib/cv-assistant/test/mongo-helpers.js'

beforeAll(async () => {
  await startMongo()
}, 60000)

afterAll(async () => {
  await stopMongo()
})

beforeEach(async () => {
  await clearMongo()
})

async function seed(n) {
  const passwordHash = await hashPassword('password123')
  const created = []
  for (let i = 0; i < n; i += 1) {
    const user = await createUser({
      firstName: `User${i}`,
      lastName: 'Test',
      email: `user${i}@example.com`,
      passwordHash,
      role: 'user',
      status: 'active',
    })
    created.push(user)
  }
  return created
}

describe('users.repository.listUsers', () => {
  it('returns defaults when called without arguments', async () => {
    await seed(3)

    const result = await listUsers()

    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(10)
    expect(result.total).toBe(3)
    expect(result.items).toHaveLength(3)
  })

  it('respects page and pageSize parameters', async () => {
    await seed(12)

    const page1 = await listUsers({ page: 1, pageSize: 5 })
    expect(page1.items).toHaveLength(5)
    expect(page1.page).toBe(1)
    expect(page1.pageSize).toBe(5)
    expect(page1.total).toBe(12)

    const page3 = await listUsers({ page: 3, pageSize: 5 })
    expect(page3.items).toHaveLength(2)
  })

  it('returns empty results when no users exist', async () => {
    const result = await listUsers()

    expect(result.items).toEqual([])
    expect(result.total).toBe(0)
  })

  it('returns empty page when skipping beyond the end', async () => {
    await seed(2)

    const result = await listUsers({ page: 99, pageSize: 10 })

    expect(result.items).toEqual([])
    expect(result.total).toBe(2)
    expect(result.page).toBe(99)
  })

  it('treats invalid input as defaults and clamps pageSize', async () => {
    await seed(2)

    const result = await listUsers({ page: 'foo', pageSize: 5000 })

    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(100)
    expect(result.items).toHaveLength(2)
  })

  it('falls back to defaults when page or pageSize is invalid', async () => {
    await seed(2)

    const result = await listUsers({ page: -3, pageSize: 0 })

    expect(result.page).toBe(1)
    expect(result.pageSize).toBe(10)
  })

  it('does not skip users when createdAt ties by using _id as a tiebreaker', async () => {
    const db = await getDb()
    const collection = db.collection('users')
    const isoNow = '2024-01-01T00:00:00.000Z'
    const passwordHash = await hashPassword('password123')

    await collection.insertMany([
      {
        _id: new ObjectId(),
        firstName: 'A',
        lastName: 'Same',
        email: 'a@example.com',
        passwordHash,
        role: 'user',
        status: 'active',
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        _id: new ObjectId(),
        firstName: 'B',
        lastName: 'Same',
        email: 'b@example.com',
        passwordHash,
        role: 'user',
        status: 'active',
        createdAt: isoNow,
        updatedAt: isoNow,
      },
      {
        _id: new ObjectId(),
        firstName: 'C',
        lastName: 'Same',
        email: 'c@example.com',
        passwordHash,
        role: 'user',
        status: 'active',
        createdAt: isoNow,
        updatedAt: isoNow,
      },
    ])

    const page1 = await listUsers({ page: 1, pageSize: 2 })
    const page2 = await listUsers({ page: 2, pageSize: 2 })

    const ids = [...page1.items.map((u) => u._id), ...page2.items.map((u) => u._id)]
    expect(new Set(ids).size).toBe(3)
  })
})

describe('users.repository.setUserStatus', () => {
  it('exposes the expected status allow-list', () => {
    expect(ALLOWED_USER_STATUSES).toEqual(
      expect.arrayContaining(['active', 'pending', 'blocked']),
    )
  })

  it('updates the status field and bumps updatedAt', async () => {
    const passwordHash = await hashPassword('password123')
    const user = await createUser({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      passwordHash,
      role: 'user',
      status: 'active',
    })

    const before = user.updatedAt
    await new Promise((resolve) => setTimeout(resolve, 5))

    const updated = await setUserStatus(user._id, 'blocked')

    expect(updated).not.toBeNull()
    expect(updated.status).toBe('blocked')
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(
      new Date(before).getTime(),
    )
  })

  it('throws when status is not in the allow-list', async () => {
    const passwordHash = await hashPassword('password123')
    const user = await createUser({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      passwordHash,
      role: 'user',
      status: 'active',
    })

    await expect(setUserStatus(user._id, 'BANNED')).rejects.toMatchObject({
      code: 'INVALID_STATUS',
      status: 400,
    })
  })

  it('throws when userId is not a valid ObjectId', async () => {
    await expect(setUserStatus('not-an-objectid', 'active')).rejects.toMatchObject({
      code: 'INVALID_USER_ID',
      status: 400,
    })
  })

  it('returns null when no user matches the id', async () => {
    const updated = await setUserStatus('507f1f77bcf86cd799439011', 'blocked')
    expect(updated).toBeNull()
  })
})

describe('users.repository.countActiveAdmins', () => {
  it('counts only users with role=admin and status=active', async () => {
    const passwordHash = await hashPassword('password123')
    await createUser({
      firstName: 'A1',
      lastName: 'Admin',
      email: 'a1@example.com',
      passwordHash,
      role: 'admin',
      status: 'active',
    })
    await createUser({
      firstName: 'A2',
      lastName: 'Admin',
      email: 'a2@example.com',
      passwordHash,
      role: 'admin',
      status: 'active',
    })
    await createUser({
      firstName: 'A3',
      lastName: 'Admin',
      email: 'a3@example.com',
      passwordHash,
      role: 'admin',
      status: 'blocked',
    })
    await createUser({
      firstName: 'U',
      lastName: 'User',
      email: 'u@example.com',
      passwordHash,
      role: 'user',
      status: 'active',
    })

    const count = await countActiveAdmins()
    expect(count).toBe(2)
  })
})

describe('users.repository.updateUserAccount', () => {
  it('updates account-only profile fields on the user record', async () => {
    const passwordHash = await hashPassword('password123')
    const user = await createUser({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      passwordHash,
      role: 'user',
      status: 'active',
    })

    const updated = await updateUserAccount(user._id, {
      firstName: 'Jorge',
      lastName: 'Lopez',
      dateOfBirth: '2000-10-09',
      photoUrl: 'https://example.com/photo.jpg',
      headline: 'Frontend student',
      phone: '+1 555 0100',
      location: 'Waterloo, ON',
      linkedinUrl: 'https://linkedin.com/in/jorge',
      githubUrl: 'https://github.com/jorge',
      portfolioUrl: 'https://jorge.dev',
    })

    expect(updated.firstName).toBe('Jorge')
    expect(updated.lastName).toBe('Lopez')
    expect(updated.dateOfBirth).toBe('2000-10-09')
    expect(updated.portfolioUrl).toBe('https://jorge.dev')
  })
})

describe('users.repository.listUsers search', () => {
  beforeEach(async () => {
    await clearMongo()
  })

  async function seedUsers() {
    const passwordHash = await hashPassword('password123')
    return Promise.all([
      createUser({
        firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com',
        passwordHash, role: 'user', status: 'active',
      }),
      createUser({
        firstName: 'Ada', lastName: 'Benitez', email: 'ada.benitez@example.com',
        passwordHash, role: 'user', status: 'active',
      }),
      createUser({
        firstName: 'Grace', lastName: 'Hopper', email: 'grace@example.com',
        passwordHash, role: 'admin', status: 'active',
      }),
      createUser({
        firstName: 'Bob', lastName: 'Lovelace', email: 'bob@example.com',
        passwordHash, role: 'user', status: 'active',
      }),
    ])
  }

  it('filters by case-insensitive firstName substring', async () => {
    const seeded = await seedUsers()
    void seeded

    const result = await listUsers({ query: 'ada', page: 1, pageSize: 10 })

    expect(result.total).toBe(2)
    expect(result.items.map((u) => u.email).sort()).toEqual([
      'ada.benitez@example.com',
      'ada@example.com',
    ])
  })

  it('filters by case-insensitive email substring', async () => {
    await seedUsers()

    const result = await listUsers({ query: 'grace@', page: 1, pageSize: 10 })

    expect(result.total).toBe(1)
    expect(result.items[0].email).toBe('grace@example.com')
  })

  it('filters by case-insensitive lastName substring', async () => {
    await seedUsers()

    const result = await listUsers({ query: 'lovelace', page: 1, pageSize: 10 })

    expect(result.total).toBe(2)
    expect(result.items.map((u) => u.email).sort()).toEqual([
      'ada@example.com',
      'bob@example.com',
    ])
  })

  it('combines multiple terms with AND across firstName/lastName/email', async () => {
    await seedUsers()

    const result = await listUsers({ query: 'ada lovelace', page: 1, pageSize: 10 })

    expect(result.total).toBe(1)
    expect(result.items[0].email).toBe('ada@example.com')
  })

  it('returns all users when query is empty or whitespace', async () => {
    await seedUsers()

    const empty = await listUsers({ query: '', page: 1, pageSize: 10 })
    expect(empty.total).toBe(4)

    const whitespace = await listUsers({ query: '   ', page: 1, pageSize: 10 })
    expect(whitespace.total).toBe(4)
  })

  it('escapes regex metacharacters in the query', async () => {
    await seedUsers()

    const result = await listUsers({ query: '(', page: 1, pageSize: 10 })

    expect(result.total).toBe(0)
  })

  it('caps pagination totals at the filtered scope', async () => {
    const passwordHash = await hashPassword('password123')
    for (let i = 0; i < 5; i += 1) {
      await createUser({
        firstName: 'Ada',
        lastName: `User${i}`,
        email: `ada.${i}@example.com`,
        passwordHash,
        role: 'user',
        status: 'active',
      })
    }
    for (let i = 0; i < 5; i += 1) {
      await createUser({
        firstName: 'Bob',
        lastName: `User${i}`,
        email: `bob.${i}@example.com`,
        passwordHash,
        role: 'user',
        status: 'active',
      })
    }

    const page1 = await listUsers({ query: 'ada', page: 1, pageSize: 2 })
    const page2 = await listUsers({ query: 'ada', page: 2, pageSize: 2 })
    const page3 = await listUsers({ query: 'ada', page: 3, pageSize: 2 })

    expect(page1.total).toBe(5)
    expect(page1.items).toHaveLength(2)
    expect(page2.items).toHaveLength(2)
    expect(page3.items).toHaveLength(1)
  })
})
