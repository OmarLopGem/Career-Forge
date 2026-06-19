import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createUser } from '@/lib/server/auth/users.repository.js'
import { hashPassword } from '@/lib/server/auth/password.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'
import { clearMongo, startMongo, stopMongo } from '@/lib/cv-assistant/test/mongo-helpers.js'
import { upsertJobListing } from './job-listing.repository.js'
import {
  serviceCreateCalendarEvent,
  serviceCreateJobApplication,
  serviceGetJobApplication,
  serviceListJobApplications,
  serviceRestoreJobApplication,
} from './job-tracker.service.js'

async function createScopedUser(email) {
  const user = await createUser({
    email,
    firstName: 'Test',
    lastName: 'User',
    passwordHash: await hashPassword('password123'),
  })
  process.env.MOCK_USER_ID = user._id
  return user
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
})

describe('job-tracker.service', () => {
  it('creates a job application from a listing', async () => {
    await createScopedUser('listing-user@example.com')
    const listing = await upsertJobListing({
      source: 'Seed',
      externalId: 'listing-001',
      title: 'Frontend Developer',
      company: 'Nova Apps',
      location: 'Remote',
      description: 'React role',
      requiredSkills: ['React'],
      category: 'Frontend Development',
      isActive: true,
    })

    const { application } = await serviceCreateJobApplication({
      jobListingId: listing._id,
      status: 'saved',
    })

    expect(application.jobListingId).toBe(listing._id)
    expect(application.jobSnapshot.company).toBe('Nova Apps')
    expect(application.status).toBe('saved')
  })

  it('creates a manual job application and auto-archives stale entries on read', async () => {
    await createScopedUser('manual-user@example.com')

    await serviceCreateJobApplication({
      status: 'applied',
      appliedAt: '2026-04-01',
      lastActivityAt: '2026-04-15',
      jobSnapshot: {
        title: 'QA Analyst',
        company: 'Orbit QA',
        location: 'Kitchener, ON',
        url: 'https://example.com/qa',
        source: 'Manual',
      },
    })

    const { applications } = await serviceListJobApplications()

    expect(applications).toHaveLength(1)
    expect(applications[0].isArchived).toBe(true)
    expect(applications[0].status).toBe('archived')
    expect(applications[0].previousStatus).toBe('applied')
  })

  it('creates an interview event and updates the linked application status', async () => {
    await createScopedUser('events-user@example.com')
    const { application } = await serviceCreateJobApplication({
      status: 'applied',
      appliedAt: '2026-06-10',
      jobSnapshot: {
        title: 'React Developer',
        company: 'Northwind Labs',
        location: 'Remote',
        url: 'https://example.com/react',
        source: 'Manual',
      },
    })

    const result = await serviceCreateCalendarEvent({
      scope: 'application',
      jobApplicationId: application._id,
      type: 'interview',
      eventDate: '2026-06-15',
      startTime: '10:00',
      endTime: '11:00',
    })

    const updated = await serviceGetJobApplication(application._id)

    expect(result.event.scope).toBe('application')
    expect(updated.application.status).toBe('interview')
    expect(updated.application.lastActivityAt).toBe('2026-06-15')
  })

  it('creates personal reminders without requiring a job application', async () => {
    await createScopedUser('personal-user@example.com')

    const result = await serviceCreateCalendarEvent({
      scope: 'personal',
      type: 'reminder',
      eventDate: '2026-06-20',
      title: 'Send thank-you email draft',
    })

    expect(result.event.scope).toBe('personal')
    expect(result.event.jobApplicationId).toBeNull()
  })

  it('restores archived applications to an active status', async () => {
    await createScopedUser('restore-user@example.com')
    const { application } = await serviceCreateJobApplication({
      status: 'applied',
      appliedAt: '2026-04-01',
      lastActivityAt: '2026-04-01',
      jobSnapshot: {
        title: 'Support Specialist',
        company: 'Helpdesk Co',
        location: 'Remote',
        url: '',
        source: 'Manual',
      },
    })

    const { applications } = await serviceListJobApplications()
    const archived = applications[0]
    expect(archived.isArchived).toBe(true)

    const restored = await serviceRestoreJobApplication(application._id)
    expect(restored.application.isArchived).toBe(false)
    expect(restored.application.status).toBe('applied')
  })

  it('prevents users from reading another user application', async () => {
    const owner = await createScopedUser('owner@example.com')
    const { application } = await serviceCreateJobApplication({
      status: 'applied',
      jobSnapshot: {
        title: 'Data Analyst',
        company: 'Insight Co',
        location: 'Toronto, ON',
        url: '',
        source: 'Manual',
      },
    })

    const otherUser = await createUser({
      email: 'other@example.com',
      firstName: 'Other',
      lastName: 'User',
      passwordHash: await hashPassword('password123'),
    })
    process.env.MOCK_USER_ID = otherUser._id

    try {
      await serviceGetJobApplication(application._id)
      throw new Error('expected not found')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(404)
      expect(body.error.code).toBe('JOB_APPLICATION_NOT_FOUND')
    }

    process.env.MOCK_USER_ID = owner._id
  })
})
