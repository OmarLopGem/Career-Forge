import { AppServiceError } from '@/lib/server/api-error.js'
import { requireEmployerUser } from '@/lib/server/auth/current-user.js'
import { getEmployerByOwner } from '@/lib/db/models/employer.js'
import {
  createEmployerJobListing,
  deactivateEmployerJobListing,
  getJobListingByIdIncludingInactive,
  listJobListingsByEmployer,
  updateEmployerJobListing,
} from './job-listing.repository.js'

const ALLOWED_EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'internship', 'temporary']

function ensureEmployerVerified(employer) {
  if (!employer) {
    throw new AppServiceError(
      'No employer profile is associated with this account.',
      'EMPLOYER_PROFILE_MISSING',
      400,
    )
  }
  if (employer.status !== 'verified') {
    throw new AppServiceError(
      'Your employer account is not verified yet. An administrator must approve it before you can post jobs.',
      'EMPLOYER_NOT_VERIFIED',
      403,
    )
  }
  return employer
}

async function resolveEmployerForCurrentUser() {
  const user = await requireEmployerUser()
  const employer = await getEmployerByOwner(user._id)
  if (!employer) {
    throw new AppServiceError(
      'No employer profile is associated with this account.',
      'EMPLOYER_PROFILE_MISSING',
      400,
    )
  }
  return { user, employer }
}

function sanitizeJobListingInput(input) {
  const title = String(input.title ?? '').trim()
  const company = String(input.company ?? '').trim()
  const description = String(input.description ?? '').trim()
  if (!title) {
    throw new AppServiceError('Title is required.', 'VALIDATION_ERROR', 400)
  }
  if (!company) {
    throw new AppServiceError('Company is required.', 'VALIDATION_ERROR', 400)
  }
  if (!description) {
    throw new AppServiceError('Description is required.', 'VALIDATION_ERROR', 400)
  }

  const sanitized = {
    title,
    company,
    location: String(input.location ?? '').trim(),
    description,
    url: input.url ? String(input.url).trim() : null,
    requiredSkills: Array.isArray(input.requiredSkills)
      ? input.requiredSkills.map((skill) => String(skill).trim()).filter(Boolean)
      : [],
    category: String(input.category ?? '').trim(),
    employmentType: ALLOWED_EMPLOYMENT_TYPES.includes(input.employmentType)
      ? input.employmentType
      : null,
  }

  if (input.salaryMin !== undefined && input.salaryMin !== null && input.salaryMin !== '') {
    const parsedMin = Number(input.salaryMin)
    if (Number.isFinite(parsedMin)) {
      sanitized.salaryMin = parsedMin
    }
  }
  if (input.salaryMax !== undefined && input.salaryMax !== null && input.salaryMax !== '') {
    const parsedMax = Number(input.salaryMax)
    if (Number.isFinite(parsedMax)) {
      sanitized.salaryMax = parsedMax
    }
  }

  return sanitized
}

export async function serviceCreateEmployerJobListing(input) {
  const { user, employer } = await resolveEmployerForCurrentUser()
  ensureEmployerVerified(employer)

  const data = sanitizeJobListingInput(input)
  const listing = await createEmployerJobListing({
    ...data,
    postedByUserId: user._id,
    employerId: employer._id,
  })

  return { listing }
}

export async function serviceListMyEmployerJobListings() {
  const { user } = await resolveEmployerForCurrentUser()
  const listings = await listJobListingsByEmployer(user._id)
  return { listings }
}

export async function serviceUpdateEmployerJobListing(listingId, patch) {
  const { user } = await resolveEmployerForCurrentUser()
  const data = sanitizeJobListingInput(patch)
  const updated = await updateEmployerJobListing(listingId, user._id, data)
  if (!updated) {
    throw new AppServiceError('Job listing not found.', 'JOB_LISTING_NOT_FOUND', 404)
  }
  return { listing: updated }
}

export async function serviceCloseEmployerJobListing(listingId) {
  const { user } = await resolveEmployerForCurrentUser()
  const closed = await deactivateEmployerJobListing(listingId, user._id)
  if (!closed) {
    throw new AppServiceError('Job listing not found.', 'JOB_LISTING_NOT_FOUND', 404)
  }
  return { listing: closed }
}

export async function serviceGetEmployerJobListing(listingId) {
  const { user } = await resolveEmployerForCurrentUser()
  const listing = await getJobListingByIdIncludingInactive(listingId)
  if (!listing || (listing.postedByUserId !== user._id && String(listing.postedByUserId) !== String(user._id))) {
    throw new AppServiceError('Job listing not found.', 'JOB_LISTING_NOT_FOUND', 404)
  }
  return { listing }
}