import { AppServiceError } from '@/lib/server/api-error.js'
import { requireCurrentUser } from '@/lib/server/auth/current-user.js'
import {
  archiveStaleApplicationsByUser,
  createJobApplication,
  getJobApplicationById,
  listJobApplicationsByUser,
  softDeleteJobApplication,
  updateJobApplication,
} from './job-application.repository.js'
import { getJobListingById, listActiveJobListings } from './job-listing.repository.js'
import {
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEventById,
  listCalendarEventsByUser,
  updateCalendarEvent,
} from './calendar-event.repository.js'

const ALLOWED_APPLICATION_STATUSES = [
  'saved',
  'applied',
  'interview',
  'waiting_response',
  'offer',
  'rejected',
  'archived',
]

const ALLOWED_EVENT_TYPES = [
  'interview',
  'deadline',
  'follow_up',
  'promised_response',
  'reminder',
]

const EVENT_TYPE_LABELS = {
  interview: 'Interview',
  deadline: 'Deadline',
  follow_up: 'Follow Up',
  promised_response: 'Response Date',
  reminder: 'Reminder',
}

function ensureFound(value, message, code) {
  if (!value) {
    throw new AppServiceError(message, code, 404)
  }

  return value
}

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getArchiveCutoffDate() {
  const today = new Date()
  today.setDate(today.getDate() - 30)
  return formatDate(today)
}

function sanitizeApplicationStatus(status) {
  if (!status) return null

  if (!ALLOWED_APPLICATION_STATUSES.includes(status)) {
    throw new AppServiceError('Invalid application status.', 'INVALID_APPLICATION_STATUS', 400)
  }

  return status
}

function sanitizeJobSnapshot(snapshot) {
  const title = String(snapshot?.title ?? '').trim()
  const company = String(snapshot?.company ?? '').trim()
  const source = String(snapshot?.source ?? '').trim()

  if (!title || !company || !source) {
    throw new AppServiceError(
      'jobSnapshot must include title, company, and source.',
      'INVALID_JOB_SNAPSHOT',
      400,
    )
  }

  return {
    title,
    company,
    location: String(snapshot?.location ?? '').trim(),
    url: String(snapshot?.url ?? '').trim(),
    source,
  }
}

function listingToSnapshot(listing) {
  return {
    title: listing.title,
    company: listing.company,
    location: listing.location ?? '',
    url: listing.url ?? '',
    source: listing.source,
  }
}

function sanitizeEventInput(input) {
  const scope = input.scope === 'personal' ? 'personal' : 'application'
  const type = String(input.type ?? '').trim()
  const eventDate = String(input.eventDate ?? input.startDate ?? '').trim()

  if (!ALLOWED_EVENT_TYPES.includes(type)) {
    throw new AppServiceError('Invalid event type.', 'INVALID_EVENT_TYPE', 400)
  }

  if (!eventDate) {
    throw new AppServiceError('Event date is required.', 'VALIDATION_ERROR', 400)
  }

  return {
    scope,
    jobApplicationId: input.jobApplicationId ?? null,
    title: String(input.title ?? '').trim(),
    type,
    eventDate,
    startTime: String(input.startTime ?? '').trim(),
    endTime: String(input.endTime ?? '').trim(),
    status: String(input.status ?? 'scheduled').trim() || 'scheduled',
    notes: String(input.notes ?? '').trim(),
    reminderEnabled: input.reminderEnabled !== false,
  }
}

async function autoArchiveForUser(userId) {
  await archiveStaleApplicationsByUser(userId, getArchiveCutoffDate())
}

async function resolveCurrentUser() {
  const user = await requireCurrentUser()
  await autoArchiveForUser(user._id)
  return user
}

async function resolveApplicationForUser(userId, applicationId) {
  return ensureFound(
    await getJobApplicationById(userId, applicationId),
    'Job application not found.',
    'JOB_APPLICATION_NOT_FOUND',
  )
}

function getFallbackEventTitle(type, application) {
  const label = EVENT_TYPE_LABELS[type] ?? 'Event'

  if (!application?.jobSnapshot?.company) {
    return label
  }

  return `${label} - ${application.jobSnapshot.company}`
}

async function syncApplicationStatusFromEvent(userId, eventInput, existingApplicationId = null) {
  const jobApplicationId = eventInput.scope === 'application'
    ? eventInput.jobApplicationId
    : existingApplicationId

  if (!jobApplicationId) {
    return null
  }

  const application = await resolveApplicationForUser(userId, jobApplicationId)

  let nextStatus = application.status

  if (!application.isArchived) {
    if (eventInput.type === 'interview') {
      nextStatus = 'interview'
    }

    if (eventInput.type === 'follow_up' || eventInput.type === 'promised_response') {
      nextStatus = 'waiting_response'
    }
  }

  return updateJobApplication(userId, jobApplicationId, {
    status: nextStatus,
    lastActivityAt: eventInput.eventDate,
  })
}

export async function serviceListJobListings() {
  await requireCurrentUser()
  return { jobListings: await listActiveJobListings() }
}

export async function serviceGetJobListing(listingId) {
  await requireCurrentUser()
  return {
    jobListing: ensureFound(
      await getJobListingById(listingId),
      'Job listing not found.',
      'JOB_LISTING_NOT_FOUND',
    ),
  }
}

export async function serviceListJobApplications() {
  const user = await resolveCurrentUser()
  return { applications: await listJobApplicationsByUser(user._id) }
}

export async function serviceGetJobApplication(applicationId) {
  const user = await resolveCurrentUser()
  return { application: await resolveApplicationForUser(user._id, applicationId) }
}

export async function serviceCreateJobApplication(input) {
  const user = await resolveCurrentUser()
  const status = sanitizeApplicationStatus(input.status)
  const today = formatDate(new Date())

  let jobListingId = null
  let jobSnapshot = null

  if (input.jobListingId) {
    const listing = ensureFound(
      await getJobListingById(input.jobListingId),
      'Job listing not found.',
      'JOB_LISTING_NOT_FOUND',
    )

    jobListingId = listing._id
    jobSnapshot = listingToSnapshot(listing)
  } else {
    jobSnapshot = sanitizeJobSnapshot(input.jobSnapshot)
  }

  const application = await createJobApplication({
    userId: user._id,
    jobListingId,
    jobSnapshot,
    status: status ?? (jobListingId ? 'saved' : 'applied'),
    appliedAt: String(input.appliedAt ?? '').trim() || null,
    lastActivityAt: String(input.lastActivityAt ?? input.appliedAt ?? today).trim() || today,
    promisedResponseDate: String(input.promisedResponseDate ?? '').trim() || null,
    notes: input.notes,
    adaptedDescription: input.adaptedDescription,
  })

  return { application }
}

export async function serviceUpdateJobApplication(applicationId, patch) {
  const user = await resolveCurrentUser()
  const existing = await resolveApplicationForUser(user._id, applicationId)

  const updates = {}

  if (patch.status !== undefined) {
    const nextStatus = sanitizeApplicationStatus(patch.status)
    if (nextStatus) {
      updates.status = nextStatus
      updates.isArchived = nextStatus === 'archived'
      updates.archivedAt = nextStatus === 'archived' ? new Date().toISOString() : null
      updates.archivedReason = nextStatus === 'archived' ? 'Archived manually' : null
      updates.previousStatus = nextStatus === 'archived'
        ? existing.status
        : existing.previousStatus
    }
  }

  if (patch.jobSnapshot !== undefined) {
    updates.jobSnapshot = sanitizeJobSnapshot(patch.jobSnapshot)
  }

  if (patch.appliedAt !== undefined) {
    updates.appliedAt = String(patch.appliedAt ?? '').trim() || null
  }

  if (patch.lastActivityAt !== undefined) {
    updates.lastActivityAt = String(patch.lastActivityAt ?? '').trim() || existing.lastActivityAt
  }

  if (patch.promisedResponseDate !== undefined) {
    updates.promisedResponseDate = String(patch.promisedResponseDate ?? '').trim() || null
  }

  if (patch.notes !== undefined) {
    updates.notes = String(patch.notes ?? '').trim()
  }

  if (patch.adaptedDescription !== undefined) {
    updates.adaptedDescription = String(patch.adaptedDescription ?? '').trim()
  }

  const application = await updateJobApplication(user._id, applicationId, updates)
  return { application }
}

export async function serviceDeleteJobApplication(applicationId) {
  const user = await resolveCurrentUser()
  const ok = await softDeleteJobApplication(user._id, applicationId)

  if (!ok) {
    throw new AppServiceError('Job application not found.', 'JOB_APPLICATION_NOT_FOUND', 404)
  }

  return { ok: true }
}

export async function serviceRestoreJobApplication(applicationId) {
  const user = await resolveCurrentUser()
  const application = await resolveApplicationForUser(user._id, applicationId)
  const today = formatDate(new Date())

  return {
    application: await updateJobApplication(user._id, applicationId, {
      status: application.previousStatus || 'waiting_response',
      previousStatus: null,
      isArchived: false,
      archivedAt: null,
      archivedReason: null,
      lastActivityAt: today,
    }),
  }
}

export async function serviceListCalendarEvents() {
  const user = await resolveCurrentUser()
  return { events: await listCalendarEventsByUser(user._id) }
}

export async function serviceGetCalendarEvent(eventId) {
  const user = await resolveCurrentUser()
  return {
    event: ensureFound(
      await getCalendarEventById(user._id, eventId),
      'Calendar event not found.',
      'CALENDAR_EVENT_NOT_FOUND',
    ),
  }
}

export async function serviceCreateCalendarEvent(input) {
  const user = await resolveCurrentUser()
  const eventInput = sanitizeEventInput(input)

  let application = null

  if (eventInput.scope === 'application') {
    if (!eventInput.jobApplicationId) {
      throw new AppServiceError(
        'jobApplicationId is required for application events.',
        'VALIDATION_ERROR',
        400,
      )
    }

    application = await resolveApplicationForUser(user._id, eventInput.jobApplicationId)
  }

  const event = await createCalendarEvent({
    userId: user._id,
    ...eventInput,
    title: eventInput.title || getFallbackEventTitle(eventInput.type, application),
  })

  if (event.scope === 'application') {
    await syncApplicationStatusFromEvent(user._id, eventInput)
  }

  return { event }
}

export async function serviceUpdateCalendarEvent(eventId, patch) {
  const user = await resolveCurrentUser()
  const existing = ensureFound(
    await getCalendarEventById(user._id, eventId),
    'Calendar event not found.',
    'CALENDAR_EVENT_NOT_FOUND',
  )
  const eventInput = sanitizeEventInput({ ...existing, ...patch })

  let application = null

  if (eventInput.scope === 'application') {
    if (!eventInput.jobApplicationId) {
      throw new AppServiceError(
        'jobApplicationId is required for application events.',
        'VALIDATION_ERROR',
        400,
      )
    }

    application = await resolveApplicationForUser(user._id, eventInput.jobApplicationId)
  }

  const event = await updateCalendarEvent(user._id, eventId, {
    ...eventInput,
    title: eventInput.title || getFallbackEventTitle(eventInput.type, application),
  })

  if (eventInput.scope === 'application') {
    await syncApplicationStatusFromEvent(user._id, eventInput)
  }

  return { event }
}

export async function serviceDeleteCalendarEvent(eventId) {
  const user = await resolveCurrentUser()
  const ok = await deleteCalendarEvent(user._id, eventId)

  if (!ok) {
    throw new AppServiceError('Calendar event not found.', 'CALENDAR_EVENT_NOT_FOUND', 404)
  }

  return { ok: true }
}
