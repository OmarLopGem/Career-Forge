import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getJobListingModel } from '@/lib/db/models/job-listing.js'
import { createUser } from '@/lib/server/auth/users.repository.js'
import { hashPassword } from '@/lib/server/auth/password.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'
import { createProfile } from '@/lib/cv-assistant/server/cv-profile.repository.js'
import { frontendProfile } from '@/lib/cv-assistant/test/fixtures.js'
import { clearMongo, startMongo, stopMongo } from '@/lib/cv-assistant/test/mongo-helpers.js'
import {
  serviceCreateCalendarEvent,
  serviceCreateJobApplication,
  serviceDeleteJobApplication,
  serviceGetCalendarEvent,
  serviceGetJobApplication,
  serviceListAdminJobListings,
  serviceListJobListings,
  serviceListCalendarEvents,
  serviceListJobApplications,
  serviceRestoreJobApplication,
  serviceUpdateCalendarEvent,
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

async function seedJobListing(data) {
  const JobListing = await getJobListingModel()
  const now = new Date().toISOString()
  const listing = await JobListing.create({
    source: data.source,
    externalId: data.externalId ?? null,
    title: data.title,
    company: data.company,
    location: data.location,
    description: data.description,
    salaryMin: data.salaryMin ?? null,
    salaryMax: data.salaryMax ?? null,
    url: data.url ?? null,
    requiredSkills: Array.isArray(data.requiredSkills) ? data.requiredSkills : [],
    category: data.category,
    employmentType: data.employmentType ?? null,
    postedAt: data.postedAt ?? null,
    isActive: data.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  })
  return { ...listing.toObject(), _id: String(listing._id) }
}

async function createScopedUserWithProfile(email) {
  const user = await createUser({
    email,
    firstName: 'Test',
    lastName: 'User',
    passwordHash: await hashPassword('password123'),
  })
  process.env.MOCK_USER_ID = user._id

  const profile = await createProfile({
    ...frontendProfile,
    userId: user._id,
    title: `${user.firstName} CV Profile`,
    personalInfo: {
      ...frontendProfile.personalInfo,
      email,
    },
  })

  return { user, profile }
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
  delete process.env.ADZUNA_APP_ID
  delete process.env.ADZUNA_APP_KEY
  delete process.env.ADZUNA_COUNTRY
  delete process.env.ADZUNA_RESULTS_PER_PAGE
  vi.restoreAllMocks()
})

describe('job-tracker.service', () => {
  it('syncs live Adzuna listings into Mongo and returns persisted records', async () => {
    await createScopedUserWithProfile('live-jobs@example.com')
    process.env.ADZUNA_APP_ID = 'test-app-id'
    process.env.ADZUNA_APP_KEY = 'test-app-key'
    process.env.ADZUNA_COUNTRY = 'gb'
    process.env.ADZUNA_RESULTS_PER_PAGE = '20'

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        count: 1,
        results: [
          {
            id: 'adzuna-001',
            title: 'Frontend Developer',
            company: { display_name: 'Nova Apps' },
            location: { display_name: 'Remote' },
            description: 'React and Next.js role',
            salary_min: 60000,
            salary_max: 80000,
            redirect_url: 'https://example.com/frontend',
            category: { label: 'IT Jobs' },
            created: '2026-07-31T12:00:00Z',
            contract_type: 'permanent',
            contract_time: 'full_time',
          },
        ],
      }),
    })

    const result = await serviceListJobListings({
      what: 'frontend developer',
      where: 'remote',
      page: 1,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result.sourceMeta).toMatchObject({
      provider: 'adzuna',
      mode: 'live',
      fallbackUsed: false,
      country: 'gb',
    })
    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    })
    expect(result.jobListings).toHaveLength(1)
    expect(result.jobListings[0]).toMatchObject({
      source: 'Adzuna',
      externalId: 'adzuna-001',
      title: 'Frontend Developer',
      company: 'Nova Apps',
      location: 'Remote',
    })

    const JobListing = await getJobListingModel()
    const stored = await JobListing.findOne({
      source: 'Adzuna',
      externalId: 'adzuna-001',
    })

    expect(stored).not.toBeNull()
  })

  it('falls back to cached Mongo listings when Adzuna is unavailable', async () => {
    await createScopedUserWithProfile('cached-jobs@example.com')
    process.env.ADZUNA_APP_ID = 'test-app-id'
    process.env.ADZUNA_APP_KEY = 'test-app-key'
    process.env.ADZUNA_COUNTRY = 'gb'

    await seedJobListing({
      source: 'Adzuna',
      externalId: 'cached-001',
      title: 'Backend Developer',
      company: 'Data Forge',
      location: 'London',
      description: 'Node.js APIs',
      requiredSkills: ['Node.js'],
      category: 'IT Jobs',
      isActive: true,
    })

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'))

    const result = await serviceListJobListings({
      what: 'backend',
      where: 'london',
      page: 1,
    })

    expect(result.sourceMeta).toMatchObject({
      provider: 'mongo-cache',
      mode: 'fallback',
      fallbackUsed: true,
    })
    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 30,
      total: 1,
      totalPages: 1,
    })
    expect(result.jobListings).toHaveLength(1)
    expect(result.jobListings[0].title).toBe('Backend Developer')
  })

  it('allows admins to monitor active and inactive job listings', async () => {
    const admin = await createUser({
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      passwordHash: await hashPassword('password123'),
      role: 'admin',
    })
    await seedJobListing({
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
    await seedJobListing({
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

  it('creates a job application from a listing with a stored CV snapshot', async () => {
    const { profile } = await createScopedUserWithProfile('listing-user@example.com')
    const listing = await seedJobListing({
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

  it('requires a CV profile when creating an application', async () => {
    await createScopedUserWithProfile('validation-user@example.com')

    try {
      await serviceCreateJobApplication({
        status: 'applied',
        jobSnapshot: {
          title: 'QA Analyst',
          company: 'Orbit QA',
          location: 'Kitchener, ON',
          url: 'https://example.com/qa',
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

  it('creates a manual job application and auto-archives stale entries on read', async () => {
    const { profile } = await createScopedUserWithProfile('manual-user@example.com')

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
    const { profile } = await createScopedUserWithProfile('events-user@example.com')
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
    await createScopedUserWithProfile('personal-user@example.com')

    const result = await serviceCreateCalendarEvent({
      scope: 'personal',
      type: 'reminder',
      eventDate: '2026-06-20',
      title: 'Send thank-you email draft',
    })

    expect(result.event.scope).toBe('personal')
    expect(result.event.jobApplicationId).toBeNull()
  })

  it('stores deadline reminders with fallback titles and reminder preferences', async () => {
    const { profile } = await createScopedUserWithProfile('deadline-user@example.com')
    const { application } = await serviceCreateJobApplication({
      cvProfileId: profile._id,
      status: 'applied',
      jobSnapshot: {
        title: 'Frontend Developer',
        company: 'Nova Apps',
        location: 'Remote',
        url: 'https://example.com/frontend',
        source: 'Manual',
      },
    })

    const { event } = await serviceCreateCalendarEvent({
      scope: 'application',
      jobApplicationId: application._id,
      type: 'deadline',
      eventDate: '2026-08-03',
      title: '',
      reminderEnabled: false,
    })

    expect(event.title).toBe('Deadline - Nova Apps')
    expect(event.reminderEnabled).toBe(false)
    expect(event.scope).toBe('application')
  })

  it('updates follow-up reminders and keeps calendar events private to their owner', async () => {
    const owner = await createScopedUserWithProfile('calendar-owner@example.com')
    const { application } = await serviceCreateJobApplication({
      cvProfileId: owner.profile._id,
      status: 'applied',
      jobSnapshot: {
        title: 'Support Specialist',
        company: 'Helpdesk Co',
        location: 'Remote',
        url: 'https://example.com/support',
        source: 'Manual',
      },
    })

    const { event } = await serviceCreateCalendarEvent({
      scope: 'application',
      jobApplicationId: application._id,
      type: 'follow_up',
      eventDate: '2026-08-04',
      title: 'Follow up reminder',
      reminderEnabled: true,
    })

    const updatedEventDate = '2026-08-06'
    const updated = await serviceUpdateCalendarEvent(event._id, {
      title: '',
      type: 'promised_response',
      eventDate: updatedEventDate,
      reminderEnabled: false,
    })
    const updatedApplication = await serviceGetJobApplication(application._id)

    expect(updated.event.title).toBe('Response Date - Helpdesk Co')
    expect(updated.event.reminderEnabled).toBe(false)
    expect(updatedApplication.application.status).toBe('waiting_response')
    expect(updatedApplication.application.lastActivityAt).toBe(updatedEventDate)

    const otherUser = await createUser({
      email: 'calendar-other@example.com',
      firstName: 'Other',
      lastName: 'User',
      passwordHash: await hashPassword('password123'),
    })
    process.env.MOCK_USER_ID = otherUser._id

    const { events } = await serviceListCalendarEvents()
    expect(events).toEqual([])
    await expect(serviceGetCalendarEvent(event._id)).rejects.toMatchObject({
      code: 'CALENDAR_EVENT_NOT_FOUND',
      status: 404,
    })

    process.env.MOCK_USER_ID = owner.user._id
  })

  it('removes linked calendar events when an application is deleted', async () => {
    const { profile } = await createScopedUserWithProfile('delete-user@example.com')
    const { application } = await serviceCreateJobApplication({
      cvProfileId: profile._id,
      status: 'applied',
      jobSnapshot: {
        title: 'Frontend Developer',
        company: 'Nova Apps',
        location: 'Remote',
        url: 'https://example.com/frontend',
        source: 'Manual',
      },
    })

    await serviceCreateCalendarEvent({
      scope: 'application',
      jobApplicationId: application._id,
      type: 'follow_up',
      eventDate: '2026-06-21',
      title: 'Follow up email',
    })

    await serviceDeleteJobApplication(application._id)
    const { events } = await serviceListCalendarEvents()

    expect(events).toHaveLength(0)
  })

  it('restores archived applications to an active status', async () => {
    const { profile } = await createScopedUserWithProfile('restore-user@example.com')
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

  it('prevents users from reading another user application', async () => {
    const owner = await createScopedUserWithProfile('owner@example.com')
    const { application } = await serviceCreateJobApplication({
      cvProfileId: owner.profile._id,
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

    process.env.MOCK_USER_ID = owner.user._id
  })

})
