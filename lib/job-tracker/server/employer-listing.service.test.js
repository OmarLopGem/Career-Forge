import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { hashPassword } from '@/lib/server/auth/password.js'
import { createUser } from '@/lib/server/auth/users.repository.js'
import {
  createEmployer,
  setEmployerStatus,
} from '@/lib/db/models/employer.js'
import {
  serviceCreateEmployerJobListing,
  serviceListMyEmployerJobListings,
  serviceUpdateEmployerJobListing,
  serviceCloseEmployerJobListing,
} from '@/lib/job-tracker/server/employer-listing.service.js'
import { listJobListings } from '@/lib/job-tracker/server/job-listing.repository.js'
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

async function createEmployerAccount({ email = 'employer@example.com', status = 'verified' } = {}) {
  const passwordHash = await hashPassword('password123')
  const user = await createUser({
    firstName: 'Test',
    lastName: 'Employer',
    email,
    passwordHash,
    role: 'employer',
    status: 'active',
  })
  const employer = await createEmployer({ ownerUserId: user._id, name: 'Test Co' })
  if (status === 'verified') {
    await setEmployerStatus(employer._id, 'verified', user._id)
  }
  return { user, employer }
}

describe('employer listing service', () => {
  it('creates a listing owned by the verified employer', async () => {
    const { user, employer } = await createEmployerAccount()
    process.env.MOCK_USER_ID = user._id

    const { listing } = await serviceCreateEmployerJobListing({
      title: 'Senior Frontend Engineer',
      company: 'Test Co',
      location: 'Remote',
      description: 'Build the platform UI.',
      requiredSkills: ['react', 'nextjs'],
      category: 'Engineering',
      employmentType: 'full_time',
      salaryMin: 80000,
      salaryMax: 120000,
    })

    expect(listing).toMatchObject({
      title: 'Senior Frontend Engineer',
      company: 'Test Co',
      postedByUserId: user._id,
      employerId: employer._id,
      isActive: true,
    })
    expect(listing.requiredSkills).toEqual(['react', 'nextjs'])
  })

  it('blocks listing creation until the employer is verified', async () => {
    const { user } = await createEmployerAccount({ status: 'pending' })
    process.env.MOCK_USER_ID = user._id

    try {
      await serviceCreateEmployerJobListing({
        title: 'Engineer',
        company: 'Test Co',
        description: 'Work on things',
      })
      throw new Error('expected error')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(403)
      expect(body.error.code).toBe('EMPLOYER_NOT_VERIFIED')
    }
  })

  it('lists only listings owned by the current employer', async () => {
    const a = await createEmployerAccount({ email: 'a@example.com' })
    const b = await createEmployerAccount({ email: 'b@example.com' })

    process.env.MOCK_USER_ID = a.user._id
    await serviceCreateEmployerJobListing({
      title: 'A Listing',
      company: 'Test Co',
      description: 'A listing description',
    })

    process.env.MOCK_USER_ID = b.user._id
    await serviceCreateEmployerJobListing({
      title: 'B Listing',
      company: 'Test Co',
      description: 'B listing description',
    })

    process.env.MOCK_USER_ID = a.user._id
    const { listings } = await serviceListMyEmployerJobListings()

    expect(listings.map((l) => l.title)).toEqual(['A Listing'])
  })

  it('updates only the owner listings', async () => {
    const a = await createEmployerAccount({ email: 'a@example.com' })
    const b = await createEmployerAccount({ email: 'b@example.com' })

    process.env.MOCK_USER_ID = a.user._id
    const { listing: aListing } = await serviceCreateEmployerJobListing({
      title: 'A Listing',
      company: 'Test Co',
      description: 'desc',
    })

    process.env.MOCK_USER_ID = b.user._id
    const { listing: bListing } = await serviceCreateEmployerJobListing({
      title: 'B Listing',
      company: 'Test Co',
      description: 'desc',
    })

    process.env.MOCK_USER_ID = a.user._id
    try {
      await serviceUpdateEmployerJobListing(bListing._id, {
        title: 'Hijacked',
        company: 'Other',
        description: 'desc',
      })
      throw new Error('expected error')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(404)
      expect(body.error.code).toBe('JOB_LISTING_NOT_FOUND')
    }

    const { listing: updatedA } = await serviceUpdateEmployerJobListing(aListing._id, {
      title: 'A Listing Updated',
      company: 'Test Co',
      description: 'desc',
    })

    expect(updatedA.title).toBe('A Listing Updated')

    // Confirm B's listing is still intact.
    const all = await listJobListings()
    const foundB = all.find((l) => l._id === bListing._id)
    expect(foundB.title).toBe('B Listing')
  })

  it('closes the listing but keeps it queryable by admin', async () => {
    const { user } = await createEmployerAccount()
    process.env.MOCK_USER_ID = user._id

    const { listing } = await serviceCreateEmployerJobListing({
      title: 'Closing',
      company: 'Test Co',
      description: 'desc',
    })

    const { listing: closed } = await serviceCloseEmployerJobListing(listing._id)

    expect(closed.isActive).toBe(false)

    const all = await listJobListings()
    const found = all.find((l) => l._id === listing._id)
    expect(found.isActive).toBe(false)
  })
})