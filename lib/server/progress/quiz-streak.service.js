import { requireCurrentUser } from '@/lib/server/auth/current-user.js'
import { listQuizResultsByUser } from './quiz-result.repository.js'

function toUtcDayKey(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

function utcDayKeyToday() {
  return new Date().toISOString().slice(0, 10)
}

function previousUtcDayKey(dayKey) {
  const [year, month, day] = dayKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

function nextUtcDayKey(dayKey) {
  const [year, month, day] = dayKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

function collectUniqueDayKeys(results) {
  const unique = new Set()
  for (const result of results) {
    const key = toUtcDayKey(result.completedAt)
    if (key) unique.add(key)
  }
  return Array.from(unique).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
}

function computeLongestStreak(sortedDescDayKeys) {
  if (sortedDescDayKeys.length === 0) return 0
  const ascending = [...sortedDescDayKeys].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))

  let longest = 1
  let current = 1
  for (let i = 1; i < ascending.length; i += 1) {
    const expected = nextUtcDayKey(ascending[i - 1])
    if (ascending[i] === expected) {
      current += 1
      if (current > longest) longest = current
    } else {
      current = 1
    }
  }
  return longest
}

function computeCurrentStreak(sortedDescDayKeys) {
  if (sortedDescDayKeys.length === 0) return 0

  const today = utcDayKeyToday()
  const mostRecent = sortedDescDayKeys[0]

  if (mostRecent !== today && mostRecent !== previousUtcDayKey(today)) {
    return 0
  }

  let streak = 1
  for (let i = 1; i < sortedDescDayKeys.length; i += 1) {
    if (sortedDescDayKeys[i] === previousUtcDayKey(sortedDescDayKeys[i - 1])) {
      streak += 1
    } else {
      break
    }
  }
  return streak
}

export async function serviceGetQuizStreak() {
  const user = await requireCurrentUser()
  const results = await listQuizResultsByUser(user._id)
  const dayKeys = collectUniqueDayKeys(results)

  const today = utcDayKeyToday()
  const mostRecent = dayKeys[0] ?? null
  const isActiveToday = mostRecent === today

  return {
    currentStreak: computeCurrentStreak(dayKeys),
    longestStreak: computeLongestStreak(dayKeys),
    lastActiveDate: mostRecent,
    isActiveToday,
    totalActiveDays: dayKeys.length,
  }
}
