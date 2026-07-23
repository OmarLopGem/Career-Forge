import { requireCurrentUser } from '@/lib/server/auth/current-user.js'
import { AppServiceError } from '@/lib/server/api-error.js'
import { listProfileSummariesByUser } from '@/lib/cv-assistant/server/cv-profile.repository.js'
import { updateUserAccount } from '@/lib/server/auth/users.repository.js'
import { listUserWarnings } from '@/lib/server/admin/user-warning.repository.js'

// `/profile` is a hub view: account-level identity comes from `users`, while the
// portfolio of professional profiles comes from `cv_profiles`.
function createAccountSnapshot(user) {
  return {
    userId: user._id,
    firstName: sanitizeString(user.firstName),
    lastName: sanitizeString(user.lastName),
    email: sanitizeString(user.email),
    dateOfBirth: sanitizeString(user.dateOfBirth),
    photoUrl: sanitizeString(user.photoUrl),
    headline: sanitizeString(user.headline),
    phone: sanitizeString(user.phone),
    location: sanitizeString(user.location),
    linkedinUrl: sanitizeString(user.linkedinUrl),
    githubUrl: sanitizeString(user.githubUrl),
    portfolioUrl: sanitizeString(user.portfolioUrl),
    createdAt: user.createdAt ?? null,
    updatedAt: user.updatedAt ?? null,
  }
}

function sanitizeString(value) {
  return String(value ?? '').trim()
}

function sanitizeUrl(value) {
  return sanitizeString(value)
}

export async function serviceGetMyProfile() {
  const user = await requireCurrentUser()
  const [profiles, warnings] = await Promise.all([
    listProfileSummariesByUser(user._id),
    listUserWarnings(user._id),
  ])

  return {
    user,
    account: createAccountSnapshot(user),
    profiles,
    warnings,
  }
}

export async function serviceUpdateMyProfile(input) {
  const user = await requireCurrentUser()

  const firstName = sanitizeString(input.firstName)
  const lastName = sanitizeString(input.lastName)

  if (!firstName || !lastName) {
    throw new AppServiceError('First name and last name are required.', 'VALIDATION_ERROR', 400)
  }

  const updatedUser = await updateUserAccount(user._id, {
    firstName,
    lastName,
    dateOfBirth: sanitizeString(input.dateOfBirth),
    photoUrl: sanitizeString(input.photoUrl),
    headline: sanitizeString(input.headline),
    phone: sanitizeString(input.phone),
    location: sanitizeString(input.location),
    linkedinUrl: sanitizeUrl(input.linkedinUrl),
    githubUrl: sanitizeUrl(input.githubUrl),
    portfolioUrl: sanitizeUrl(input.portfolioUrl),
  })
  const profiles = await listProfileSummariesByUser(user._id)

  return {
    user: updatedUser,
    account: createAccountSnapshot(updatedUser),
    profiles,
  }
}
