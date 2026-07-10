import { requireCurrentUser } from '@/lib/server/auth/current-user.js'
import { getUserProfileByUserId, upsertUserProfile } from './user-profile.repository.js'

// Identity data lives in `users`; editable public-profile data is stored here so
// auth concerns and profile concerns can evolve independently.
function createDefaultProfile(userId) {
  return {
    _id: null,
    userId,
    photoUrl: '',
    headline: '',
    description: '',
    skills: [],
    experience: [],
    createdAt: null,
    updatedAt: null,
  }
}

function sanitizeString(value) {
  return String(value ?? '').trim()
}

function sanitizeSkills(skills) {
  if (!Array.isArray(skills)) {
    return []
  }

  return skills
    .map((skill) => sanitizeString(skill))
    .filter(Boolean)
}

function sanitizeExperienceItem(item) {
  return {
    company: sanitizeString(item?.company),
    title: sanitizeString(item?.title),
    startDate: sanitizeString(item?.startDate),
    endDate: sanitizeString(item?.endDate),
    description: sanitizeString(item?.description),
  }
}

function sanitizeExperience(experience) {
  if (!Array.isArray(experience)) {
    return []
  }

  return experience
    .map(sanitizeExperienceItem)
    .filter((item) => item.company || item.title || item.startDate || item.endDate || item.description)
}

export async function serviceGetMyProfile() {
  const user = await requireCurrentUser()
  // Return a shaped empty profile so the UI can render forms before the first save.
  const profile = (await getUserProfileByUserId(user._id)) ?? createDefaultProfile(user._id)

  return {
    user,
    profile,
  }
}

export async function serviceUpdateMyProfile(input) {
  const user = await requireCurrentUser()

  const profile = await upsertUserProfile(user._id, {
    photoUrl: sanitizeString(input.photoUrl),
    headline: sanitizeString(input.headline),
    description: sanitizeString(input.description),
    skills: sanitizeSkills(input.skills),
    experience: sanitizeExperience(input.experience),
  })

  return {
    user,
    profile,
  }
}
