import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createUser } from '@/lib/server/auth/users.repository.js'
import { hashPassword } from '@/lib/server/auth/password.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'
import { clearMongo, startMongo, stopMongo } from '@/lib/cv-assistant/test/mongo-helpers.js'
import { frontendProfile } from '@/lib/cv-assistant/test/fixtures.js'
import { createProfile } from '@/lib/cv-assistant/server/cv-profile.repository.js'
import { upsertJobListing } from './job-listing.repository.js'
import {
  serviceCreateCalendarEvent,
  serviceCreateJobApplication,
  serviceDeleteJobApplication,
  serviceGetJobApplication,
  serviceListAdminJobListings,
  serviceListCalendarEvents,
  serviceListJobApplications,
  serviceRestoreJobApplication,
} from './job-tracker.service.js'

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(baseDate, days) {
  const next = new Date(baseDate)
  next.setDate(next.getDate() + days)
  return next
}

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

async function createProfessionalProfile(userId, overrides = {}) {
  return createProfile({
    ...frontendProfile,
    ...overrides,
    userId,
  })
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
  it('allows admins to monitor active and inactive job listings', async () => {
    const admin = await createUser({
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      passwordHash: await hashPassword('password123'),
      role: 'admin',
    })
    await upsertJobListing({
      source: 'Seed',
      externalId: 'active-listing',
      title: 'Frontend Developer',
      company: 'Nova Apps',
      location: 'Remote',
      description: 'React role',
      requiredSkills: ['React'],
      category: 'Frontend Development',
      isActive: true,
    })
    await upsertJobListing({
      source: 'Seed',
      externalId: 'inactive-listing',
      title: 'Legacy Developer',
      company: 'Archive Co',
      location: 'Remote',
      description: 'Inactive role',
      requiredSkills: ['JavaScript'],
      category: 'Frontend Development',
      isActive: false,
    })
    process.env.MOCK_USER_ID = admin._id

    const result = await serviceListAdminJobListings()

    expect(result.summary).toEqual({ total: 2, active: 1, inactive: 1 })
    expect(result.jobListings.map((listing) => listing.title)).toEqual([
      'Frontend Developer',
      'Legacy Developer',
    ])
  })

  it('creates a job application from a listing', async () => {
    const user = await createScopedUser('listing-user@example.com')
    const profile = await createProfessionalProfile(user._id)
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
      cvProfileId: profile._id,
      status: 'saved',
    })

    expect(application.jobListingId).toBe(listing._id)
    expect(application.cvProfileId).toBe(profile._id)
    expect(application.cvProfileSnapshot.title).toBe(profile.title)
    expect(application.jobSnapshot.company).toBe('Nova Apps')
    expect(application.status).toBe('saved')
  })

  it('creates a manual job application and auto-archives stale entries on read', async () => {
    const user = await createScopedUser('manual-user@example.com')
    const profile = await createProfessionalProfile(user._id)

    await serviceCreateJobApplication({
      cvProfileId: profile._id,
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
    const user = await createScopedUser('events-user@example.com')
    const profile = await createProfessionalProfile(user._id)
    const today = new Date()
    const appliedAt = formatDate(addDays(today, -5))
    const eventDate = formatDate(addDays(today, 2))
    const { application } = await serviceCreateJobApplication({
      cvProfileId: profile._id,
      status: 'applied',
      appliedAt,
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
      eventDate,
      startTime: '10:00',
      endTime: '11:00',
    })

    const updated = await serviceGetJobApplication(application._id)

    expect(result.event.scope).toBe('application')
    expect(updated.application.status).toBe('interview')
    expect(updated.application.lastActivityAt).toBe(eventDate)
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
    const user = await createScopedUser('restore-user@example.com')
    const profile = await createProfessionalProfile(user._id)
    const { application } = await serviceCreateJobApplication({
      cvProfileId: profile._id,
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

  it('deletes linked calendar events when a job application is deleted', async () => {
    const user = await createScopedUser('cleanup-user@example.com')
    const profile = await createProfessionalProfile(user._id)
    const { application } = await serviceCreateJobApplication({
      cvProfileId: profile._id,
      status: 'applied',
      jobSnapshot: {
        title: 'Product Designer',
        company: 'North Studio',
        location: 'Remote',
        url: '',
        source: 'Manual',
      },
    })

    await serviceCreateCalendarEvent({
      scope: 'application',
      jobApplicationId: application._id,
      type: 'follow_up',
      eventDate: '2026-06-22',
      title: 'Follow up with recruiter',
    })

    let calendar = await serviceListCalendarEvents()
    expect(calendar.events).toHaveLength(1)

    await serviceDeleteJobApplication(application._id)

    calendar = await serviceListCalendarEvents()
    expect(calendar.events).toHaveLength(0)
  })

  it('prevents users from reading another user application', async () => {
    const owner = await createScopedUser('owner@example.com')
    const profile = await createProfessionalProfile(owner._id)
    const { application } = await serviceCreateJobApplication({
      cvProfileId: profile._id,
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

  it('requires a CV profile when creating a job application', async () => {
    await createScopedUser('missing-profile@example.com')

    try {
      await serviceCreateJobApplication({
        status: 'applied',
        jobSnapshot: {
          title: 'Backend Developer',
          company: 'API Labs',
          location: 'Remote',
          url: '',
          source: 'Manual',
        },
      })
      throw new Error('expected validation error')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(400)
      expect(body.error.code).toBe('CV_PROFILE_REQUIRED')
    }
  })
})
