import { describe, expect, it } from 'vitest'
import { MOCK_USER_ID, getCurrentUserId } from './get-current-user-id.js'

describe('current user id helper', () => {
  it('returns a stable fallback user id during tests', async () => {
    const id = await getCurrentUserId()
    expect(id).toBe(MOCK_USER_ID)
  })

  it('returns the same fallback value across calls', async () => {
    const a = await getCurrentUserId()
    const b = await getCurrentUserId()
    expect(a).toBe(b)
  })
})
