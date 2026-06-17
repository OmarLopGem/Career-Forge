import { describe, expect, it } from 'vitest'
import { MOCK_USER_ID, getCurrentUserId } from './get-current-user-id.js'

describe('mock auth helper', () => {
  it('returns a stable user id', async () => {
    const id = await getCurrentUserId()
    expect(id).toBe(MOCK_USER_ID)
  })

  it('returns the same value across calls', async () => {
    const a = await getCurrentUserId()
    const b = await getCurrentUserId()
    expect(a).toBe(b)
  })
})
