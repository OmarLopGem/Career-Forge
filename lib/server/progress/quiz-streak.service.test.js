import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { startMongo, stopMongo, clearMongo } from '@/lib/cv-assistant/test/mongo-helpers.js'
import { createUser } from '@/lib/server/auth/users.repository.js'
import { hashPassword } from '@/lib/server/auth/password.js'

vi.mock('./quiz-result.repository.js', async () => {
  const actual = await vi.importActual('./quiz-result.repository.js')
  return {
    ...actual,
    listQuizResultsByUser: vi.fn(),
  }
})

const { listQuizResultsByUser } = await import('./quiz-result.repository.js')
const { serviceGetQuizStreak } = await import('./quiz-streak.service.js')

function isoForUtcDay(dayKey, hour = 12) {
  const [year, month, day] = dayKey.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, hour)).toISOString()
}

function utcDayKeyOffset(daysAgo) {
  const now = new Date()
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  date.setUTCDate(date.getUTCDate() - daysAgo)
  return date.toISOString().slice(0, 10)
}

beforeAll(async () => {
  await startMongo()
}, 60000)

afterAll(async () => {
  await stopMongo()
})

beforeEach(async () => {
  await clearMongo()
  delete process.env.MOCK_USER_ID
  listQuizResultsByUser.mockReset()
})

async function createScopedUser(email) {
  const user = await createUser({
    email,
    firstName: 'Test',
    lastName: 'User',
    passwordHash: await hashPassword('password123'),
    role: 'user',
    status: 'active',
  })
  process.env.MOCK_USER_ID = user._id
  return user
}

describe('quiz-streak.service', () => {
  it('returns a 5-day streak when there are 5 consecutive active days ending today', async () => {
    await createScopedUser('streak-5@example.com')

    const dayKeys = [0, 1, 2, 3, 4].map(utcDayKeyOffset)
    const results = dayKeys.map((dayKey) => ({ completedAt: isoForUtcDay(dayKey) }))
    listQuizResultsByUser.mockResolvedValue(results)

    const streak = await serviceGetQuizStreak()

    expect(streak.currentStreak).toBe(5)
    expect(streak.longestStreak).toBe(5)
    expect(streak.isActiveToday).toBe(true)
    expect(streak.totalActiveDays).toBe(5)
    expect(streak.lastActiveDate).toBe(utcDayKeyOffset(0))
  })

  it('keeps the streak alive when today has no quiz but yesterday does (soft rule)', async () => {
    await createScopedUser('streak-soft@example.com')

    const dayKeys = [1, 2, 3].map(utcDayKeyOffset)
    const results = dayKeys.map((dayKey) => ({ completedAt: isoForUtcDay(dayKey) }))
    listQuizResultsByUser.mockResolvedValue(results)

    const streak = await serviceGetQuizStreak()

    expect(streak.currentStreak).toBe(3)
    expect(streak.longestStreak).toBe(3)
    expect(streak.isActiveToday).toBe(false)
    expect(streak.lastActiveDate).toBe(utcDayKeyOffset(1))
  })

  it('resets the current streak when there is a 2-day gap (UTC)', async () => {
    await createScopedUser('streak-broken@example.com')

    const today = utcDayKeyOffset(0)
    const dayKeys = [0, 3, 4].map(utcDayKeyOffset)
    const results = dayKeys.map((dayKey) => ({ completedAt: isoForUtcDay(dayKey) }))
    listQuizResultsByUser.mockResolvedValue(results)

    const streak = await serviceGetQuizStreak()

    expect(streak.currentStreak).toBe(1)
    expect(streak.longestStreak).toBe(2)
    expect(streak.isActiveToday).toBe(true)
    expect(streak.lastActiveDate).toBe(today)
  })

  it('counts multiple attempts on the same UTC day as one active day', async () => {
    await createScopedUser('streak-same-day@example.com')

    const today = utcDayKeyOffset(0)
    const results = [
      { completedAt: isoForUtcDay(today, 8) },
      { completedAt: isoForUtcDay(today, 14) },
      { completedAt: isoForUtcDay(today, 22) },
      { completedAt: isoForUtcDay(utcDayKeyOffset(1), 10) },
    ]
    listQuizResultsByUser.mockResolvedValue(results)

    const streak = await serviceGetQuizStreak()

    expect(streak.currentStreak).toBe(2)
    expect(streak.totalActiveDays).toBe(2)
    expect(streak.longestStreak).toBe(2)
  })

  it('returns a zeroed streak when the user has no attempts', async () => {
    await createScopedUser('streak-empty@example.com')

    listQuizResultsByUser.mockResolvedValue([])

    const streak = await serviceGetQuizStreak()

    expect(streak).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      isActiveToday: false,
      totalActiveDays: 0,
    })
  })

  it('ignores attempts with an unparseable completedAt value', async () => {
    await createScopedUser('streak-invalid@example.com')

    const today = utcDayKeyOffset(0)
    const results = [
      { completedAt: isoForUtcDay(today) },
      { completedAt: 'not-a-date' },
      { completedAt: undefined },
    ]
    listQuizResultsByUser.mockResolvedValue(results)

    const streak = await serviceGetQuizStreak()

    expect(streak.currentStreak).toBe(1)
    expect(streak.totalActiveDays).toBe(1)
    expect(streak.longestStreak).toBe(1)
  })
})
