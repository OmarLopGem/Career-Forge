import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { startMongo, stopMongo, clearMongo } from '../test/mongo-helpers.js'
import {
  createProfile,
  listProfilesByUser,
  getProfileById,
  updateProfile,
  deleteProfile,
  setDefaultProfile,
  listProfileSummariesByUser,
} from '../server/cv-profile.repository.js'
import { minimalValidProfile, frontendProfile } from '../test/fixtures.js'

beforeAll(async () => {
  await startMongo()
}, 60000)

afterAll(async () => {
  await stopMongo()
})

beforeEach(async () => {
  await clearMongo()
})

describe('cv-profile repository', () => {
  it('creates a profile for a user', async () => {
    const profile = await createProfile({
      ...minimalValidProfile,
      userId: 'user-A',
    })
    expect(profile._id).toBeDefined()
    expect(profile.userId).toBe('user-A')
    expect(profile.completion.isMinimumComplete).toBe(true)
  })

  it('lists only profiles belonging to current user', async () => {
    await createProfile({ ...frontendProfile, userId: 'user-A' })
    await createProfile({ ...minimalValidProfile, userId: 'user-B' })
    const userA = await listProfilesByUser('user-A')
    const userB = await listProfilesByUser('user-B')
    expect(userA).toHaveLength(1)
    expect(userB).toHaveLength(1)
    expect(userA[0].userId).toBe('user-A')
  })

  it('gets profile by id only when user owns it', async () => {
    const p = await createProfile({ ...frontendProfile, userId: 'user-A' })
    const found = await getProfileById('user-A', p._id)
    expect(found).not.toBeNull()
    const notFound = await getProfileById('user-B', p._id)
    expect(notFound).toBeNull()
  })

  it('updates profile only when user owns it', async () => {
    const p = await createProfile({ ...frontendProfile, userId: 'user-A' })
    const updated = await updateProfile('user-A', p._id, { title: 'New title' })
    expect(updated?.title).toBe('New title')

    const notUpdated = await updateProfile('user-B', p._id, { title: 'Hijack' })
    expect(notUpdated).toBeNull()
  })

  it('recalculates completion on update', async () => {
    const p = await createProfile({ ...frontendProfile, userId: 'user-A' })
    const updated = await updateProfile('user-A', p._id, { personalInfo: { fullName: '' } })
    expect(updated?.completion.isMinimumComplete).toBe(false)
  })

  it('deletes profile only when user owns it', async () => {
    const p = await createProfile({ ...frontendProfile, userId: 'user-A' })
    expect(await deleteProfile('user-B', p._id)).toBe(false)
    expect(await deleteProfile('user-A', p._id)).toBe(true)
    expect(await getProfileById('user-A', p._id)).toBeNull()
  })

  it('sets default profile and unsets other defaults', async () => {
    const a = await createProfile({ ...frontendProfile, userId: 'user-A', isDefault: true })
    const b = await createProfile({ ...minimalValidProfile, userId: 'user-A', isDefault: false })
    expect(a.isDefault).toBe(true)
    expect(b.isDefault).toBe(false)
    const ok = await setDefaultProfile('user-A', b._id)
    expect(ok).toBe(true)
    const list = await listProfilesByUser('user-A')
    const updatedB = list.find((p) => p._id === b._id)
    const updatedA = list.find((p) => p._id === a._id)
    expect(updatedB?.isDefault).toBe(true)
    expect(updatedA?.isDefault).toBe(false)
  })

  it('returns profile summaries with computed fields', async () => {
    await createProfile({ ...frontendProfile, userId: 'user-A' })
    const summaries = await listProfileSummariesByUser('user-A')
    expect(summaries).toHaveLength(1)
    expect(summaries[0]).toMatchObject({
      title: frontendProfile.title,
      isDefault: true,
    })
    expect(summaries[0].completionScore).toBeGreaterThan(0)
  })
})
