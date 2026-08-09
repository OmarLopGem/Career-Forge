import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { hashPassword } from '@/lib/server/auth/password.js'
import { createUser } from '@/lib/server/auth/users.repository.js'
import {
  createEmployer,
  setEmployerStatus,
} from '@/lib/db/models/employer.js'
import { createProfile } from '@/lib/cv-assistant/server/cv-profile.repository.js'
import { frontendProfile } from '@/lib/cv-assistant/test/fixtures.js'
import { serviceCreateEmployerJobListing } from '@/lib/job-tracker/server/employer-listing.service.js'
import {
  serviceGetEmployerApplicantProfile,
  serviceListEmployerApplicants,
  serviceGetEmployerApplicant,
  __resetEmployerApplicantProfileDedupForTests,
} from '@/lib/job-tracker/server/employer-applicant.service.js'
import { serviceCreateJobApplication } from '@/lib/job-tracker/server/job-tracker.service.js'
import { serviceListMyNotifications } from '@/lib/server/notifications/notification.service.js'
import { getCvProfileModel } from '@/lib/db/models/cv-profile.js'
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
  __resetEmployerApplicantProfileDedupForTests()
})

async function createEmployerAccount({ email = 'employer@example.com' } = {}) {
  const passwordHash = await hashPassword('password123')
  const user = await createUser({
    firstName: 'Owner',
    lastName: 'Boss',
    email,
    passwordHash,
    role: 'employer',
    status: 'active',
  })
  const employer = await createEmployer({ ownerUserId: user._id, name: 'Acme' })
  await setEmployerStatus(employer._id, 'verified', user._id)
  return { user, employer }
}

async function createCandidate({ email = 'candidate@example.com' } = {}) {
  const passwordHash = await hashPassword('password123')
  const candidate = await createUser({
    firstName: 'Sam',
    lastName: 'Seeker',
    email,
    passwordHash,
    role: 'user',
    status: 'active',
    headline: 'Frontend Engineer',
    location: 'Remote',
  })
  const profile = await createProfile({
    ...frontendProfile,
    userId: candidate._id,
    title: 'Candidate CV',
  })
  return { candidate, profile }
}

describe('employer applicant service', () => {
  it('lists only applicants who applied to the employer own listings', async () => {
    const employerA = await createEmployerAccount({ email: 'a@example.com' })
    const employerB = await createEmployerAccount({ email: 'b@example.com' })
    const { candidate, profile } = await createCandidate({ email: 'sam@example.com' })

    process.env.MOCK_USER_ID = employerA.user._id
    const { listing: aListing } = await serviceCreateEmployerJobListing({
      title: 'A Job',
      company: 'Acme',
      description: 'desc',
    })

    process.env.MOCK_USER_ID = employerB.user._id
    const { listing: bListing } = await serviceCreateEmployerJobListing({
      title: 'B Job',
      company: 'Acme',
      description: 'desc',
    })

    process.env.MOCK_USER_ID = candidate._id
    await serviceCreateJobApplication({
      cvProfileId: profile._id,
      status: 'applied',
      jobListingId: bListing._id,
    })

    process.env.MOCK_USER_ID = employerA.user._id
    const { applicants, pagination } = await serviceListEmployerApplicants()

    expect(applicants).toHaveLength(0)
    expect(pagination.total).toBe(0)

    process.env.MOCK_USER_ID = employerB.user._id
    const result = await serviceListEmployerApplicants()

    expect(result.applicants).toHaveLength(1)
    expect(result.applicants[0].application.jobListingId).toBe(bListing._id)
    expect(result.applicants[0].candidate.email).toBe('sam@example.com')
  })

  it('returns 404 when an employer requests an application from a different employer listing', async () => {
    const employerA = await createEmployerAccount({ email: 'a@example.com' })
    const employerB = await createEmployerAccount({ email: 'b@example.com' })
    const { candidate, profile } = await createCandidate({ email: 'sam@example.com' })

    process.env.MOCK_USER_ID = employerA.user._id
    const { listing: aListing } = await serviceCreateEmployerJobListing({
      title: 'A Job',
      company: 'Acme',
      description: 'desc',
    })

    process.env.MOCK_USER_ID = employerB.user._id
    const { listing: bListing } = await serviceCreateEmployerJobListing({
      title: 'B Job',
      company: 'Acme',
      description: 'desc',
    })

    process.env.MOCK_USER_ID = candidate._id
    const { application } = await serviceCreateJobApplication({
      cvProfileId: profile._id,
      status: 'applied',
      jobListingId: bListing._id,
    })

    process.env.MOCK_USER_ID = employerA.user._id
    try {
      await serviceGetEmployerApplicant(application._id)
      throw new Error('expected error')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(404)
      expect(body.error.code).toBe('JOB_APPLICATION_NOT_FOUND')
    }
  })

  it('requires a verified employer before listing applicants', async () => {
    const passwordHash = await hashPassword('password123')
    const user = await createUser({
      firstName: 'Pending',
      lastName: 'Owner',
      email: 'pending@example.com',
      passwordHash,
      role: 'employer',
      status: 'active',
    })
    await createEmployer({ ownerUserId: user._id, name: 'Pending Co' })
    process.env.MOCK_USER_ID = user._id

    try {
      await serviceListEmployerApplicants()
      throw new Error('expected error')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(403)
      expect(body.error.code).toBe('EMPLOYER_NOT_VERIFIED')
    }
  })
})

describe('serviceGetEmployerApplicantProfile', () => {
  it('returns the candidate CV profile when the employer owns the listing', async () => {
    const employer = await createEmployerAccount()
    const { candidate, profile } = await createCandidate({ email: 'sam@example.com' })

    process.env.MOCK_USER_ID = employer.user._id
    const { listing } = await serviceCreateEmployerJobListing({
      title: 'Job',
      company: 'Acme',
      description: 'desc',
    })

    process.env.MOCK_USER_ID = candidate._id
    const { application } = await serviceCreateJobApplication({
      cvProfileId: profile._id,
      status: 'applied',
      jobListingId: listing._id,
    })

    process.env.MOCK_USER_ID = employer.user._id
    const result = await serviceGetEmployerApplicantProfile(application._id)

    expect(result.application._id).toBe(application._id)
    expect(result.candidate.email).toBe('sam@example.com')
    expect(result.profile).toMatchObject({
      title: 'Candidate CV',
      personalInfo: { fullName: 'Jane Doe' },
    })
    expect(result.profile.experience).toHaveLength(2)
    expect(result.profile.skills).toHaveLength(2)
  })

  it('strips phone and dateOfBirth from the sanitized profile', async () => {
    const employer = await createEmployerAccount()
    const { candidate, profile } = await createCandidate({ email: 'sam@example.com' })

    const CvProfileModel = await getCvProfileModel()
    await CvProfileModel.updateOne(
      { _id: profile._id },
      {
        $set: {
          personalInfo: {
            fullName: 'Jane Doe',
            email: 'jane@example.com',
            phone: '+1 555 1234',
            dateOfBirth: '1990-01-01',
            location: 'Remote',
            linkedinUrl: 'https://linkedin.com/in/jane',
          },
        },
      },
    )

    process.env.MOCK_USER_ID = employer.user._id
    const { listing } = await serviceCreateEmployerJobListing({
      title: 'Job',
      company: 'Acme',
      description: 'desc',
    })

    process.env.MOCK_USER_ID = candidate._id
    const { application } = await serviceCreateJobApplication({
      cvProfileId: profile._id,
      status: 'applied',
      jobListingId: listing._id,
    })

    process.env.MOCK_USER_ID = employer.user._id
    const result = await serviceGetEmployerApplicantProfile(application._id)

    expect(result.profile.personalInfo).not.toHaveProperty('phone')
    expect(result.profile.personalInfo).not.toHaveProperty('dateOfBirth')
    expect(result.profile.personalInfo.fullName).toBe('Jane Doe')
    expect(result.profile.personalInfo.linkedinUrl).toBe('https://linkedin.com/in/jane')
  })

  it('returns 404 when the employer tries to open an applicant from a different employer listing', async () => {
    const employerA = await createEmployerAccount({ email: 'a@example.com' })
    const employerB = await createEmployerAccount({ email: 'b@example.com' })
    const { candidate, profile } = await createCandidate({ email: 'sam@example.com' })

    process.env.MOCK_USER_ID = employerA.user._id
    const { listing: aListing } = await serviceCreateEmployerJobListing({
      title: 'A Job',
      company: 'Acme',
      description: 'desc',
    })

    process.env.MOCK_USER_ID = employerB.user._id
    const { listing: bListing } = await serviceCreateEmployerJobListing({
      title: 'B Job',
      company: 'Acme',
      description: 'desc',
    })

    process.env.MOCK_USER_ID = candidate._id
    const { application } = await serviceCreateJobApplication({
      cvProfileId: profile._id,
      status: 'applied',
      jobListingId: bListing._id,
    })

    process.env.MOCK_USER_ID = employerA.user._id
    try {
      await serviceGetEmployerApplicantProfile(application._id)
      throw new Error('expected error')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(404)
      expect(body.error.code).toBe('JOB_APPLICATION_NOT_FOUND')
    }
  })

  it('returns profile null when the application has no cvProfileId', async () => {
    const employer = await createEmployerAccount()
    const { candidate, profile } = await createCandidate({ email: 'sam@example.com' })

    process.env.MOCK_USER_ID = employer.user._id
    const { listing } = await serviceCreateEmployerJobListing({
      title: 'Job',
      company: 'Acme',
      description: 'desc',
    })

    process.env.MOCK_USER_ID = candidate._id
    const { application } = await serviceCreateJobApplication({
      cvProfileId: profile._id,
      status: 'applied',
      jobListingId: listing._id,
    })

    const { getJobApplicationModel } = await import('@/lib/db/models/job-application.js')
    const ApplicationModel = await getJobApplicationModel()
    await ApplicationModel.updateOne(
      { _id: application._id },
      { $set: { cvProfileId: null } },
    )

    process.env.MOCK_USER_ID = employer.user._id
    const result = await serviceGetEmployerApplicantProfile(application._id)

    expect(result.profile).toBeNull()
    expect(result.application._id).toBe(application._id)
  })

  it('notifies the candidate the first time the employer opens the profile', async () => {
    const employer = await createEmployerAccount()
    const { candidate, profile } = await createCandidate({ email: 'sam@example.com' })

    process.env.MOCK_USER_ID = employer.user._id
    const { listing } = await serviceCreateEmployerJobListing({
      title: 'Job',
      company: 'Acme',
      description: 'desc',
    })

    process.env.MOCK_USER_ID = candidate._id
    const { application } = await serviceCreateJobApplication({
      cvProfileId: profile._id,
      status: 'applied',
      jobListingId: listing._id,
    })

    process.env.MOCK_USER_ID = employer.user._id
    await serviceGetEmployerApplicantProfile(application._id)

    process.env.MOCK_USER_ID = candidate._id
    const inbox = await serviceListMyNotifications()

    expect(inbox.notifications).toHaveLength(1)
    expect(inbox.notifications[0]).toMatchObject({
      audience: 'user',
      targetUserId: candidate._id,
      title: 'An employer viewed your profile',
      level: 'info',
      link: '/profile',
    })
  })

  it('does not duplicate the notification when the employer opens the same profile twice', async () => {
    const employer = await createEmployerAccount()
    const { candidate, profile } = await createCandidate({ email: 'sam@example.com' })

    process.env.MOCK_USER_ID = employer.user._id
    const { listing } = await serviceCreateEmployerJobListing({
      title: 'Job',
      company: 'Acme',
      description: 'desc',
    })

    process.env.MOCK_USER_ID = candidate._id
    const { application } = await serviceCreateJobApplication({
      cvProfileId: profile._id,
      status: 'applied',
      jobListingId: listing._id,
    })

    process.env.MOCK_USER_ID = employer.user._id
    await serviceGetEmployerApplicantProfile(application._id)
    await serviceGetEmployerApplicantProfile(application._id)
    await serviceGetEmployerApplicantProfile(application._id)

    process.env.MOCK_USER_ID = candidate._id
    const inbox = await serviceListMyNotifications()

    expect(inbox.notifications).toHaveLength(1)
  })
})