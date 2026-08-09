import { AppServiceError } from '@/lib/server/api-error.js'
import { requireAdminUser } from '@/lib/server/auth/current-user.js'
import { getProfileById } from '@/lib/cv-assistant/server/cv-profile.repository.js'
import { getUserById } from '@/lib/server/auth/users.repository.js'
import { toObjectId } from '@/lib/server/object-id.js'
import { createAnalysisFromDraft, getLatestAnalysis } from '@/lib/cv-assistant/server/cv-analysis.repository.js'
import { serviceCreateUserNotification } from '@/lib/server/notifications/notification.service.js'

const MIN_OVERALL_SCORE = 0
const MAX_OVERALL_SCORE = 100
const MIN_ATS_SCORE = 0
const MAX_ATS_SCORE = 100
const MIN_REASON_LENGTH = 10
const MAX_REASON_LENGTH = 500

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function sanitizeScore(raw, min, max, fieldName) {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) {
    throw new AppServiceError(`${fieldName} must be a number.`, 'INVALID_SCORE', 400)
  }
  return clamp(parsed, min, max)
}

function sanitizeReason(reason) {
  const text = String(reason ?? '').trim()
  if (text.length < MIN_REASON_LENGTH) {
    throw new AppServiceError(
      `A reason of at least ${MIN_REASON_LENGTH} characters is required.`,
      'INVALID_OVERRIDE_REASON',
      400,
    )
  }
  if (text.length > MAX_REASON_LENGTH) {
    throw new AppServiceError(
      `Reason cannot exceed ${MAX_REASON_LENGTH} characters.`,
      'INVALID_OVERRIDE_REASON',
      400,
    )
  }
  return text
}

async function resolveTargetUser(userId) {
  if (!userId || typeof userId !== 'string' || !toObjectId(userId)) {
    throw new AppServiceError('Invalid user id.', 'INVALID_USER_ID', 400)
  }
  const user = await getUserById(userId)
  if (!user) {
    throw new AppServiceError('User not found.', 'USER_NOT_FOUND', 404)
  }
  return user
}

export async function serviceOverrideCvAnalysis(targetUserId, profileId, patch) {
  const currentUser = await requireAdminUser()
  const targetUser = await resolveTargetUser(targetUserId)

  const profile = await getProfileById(targetUser._id, profileId)
  if (!profile) {
    throw new AppServiceError('CV profile not found.', 'CV_PROFILE_NOT_FOUND', 404)
  }

  const reason = sanitizeReason(patch?.reason)

  const previousAnalysis = await getLatestAnalysis(targetUser._id, profile._id)

  const now = new Date().toISOString()

  const draft = {
    gradingMode: 'admin-override',
    lastEditedByUserId: currentUser._id,
    lastEditedAt: now,
    lastEditedReason: reason,
    overallScore: sanitizeScore(
      patch?.overallScore,
      MIN_OVERALL_SCORE,
      MAX_OVERALL_SCORE,
      'overallScore',
    ),
    atsFeedback: previousAnalysis
      ? {
          ...previousAnalysis.atsFeedback,
          score: sanitizeScore(
            patch?.atsScore ?? previousAnalysis.atsFeedback?.score,
            MIN_ATS_SCORE,
            MAX_ATS_SCORE,
            'atsScore',
          ),
          comments: reason,
          formattingWarnings: previousAnalysis.atsFeedback?.formattingWarnings ?? [],
          keywordSuggestions: previousAnalysis.atsFeedback?.keywordSuggestions ?? [],
        }
      : {
          score: sanitizeScore(
            patch?.atsScore,
            MIN_ATS_SCORE,
            MAX_ATS_SCORE,
            'atsScore',
          ),
          comments: reason,
          formattingWarnings: [],
          keywordSuggestions: [],
        },
    suggestions: previousAnalysis?.suggestions ?? [],
    strengths: previousAnalysis?.strengths ?? [],
    weaknesses: previousAnalysis?.weaknesses ?? [],
  }

  const createdAnalysis = await createAnalysisFromDraft(
    targetUser._id,
    profile._id,
    draft,
  )

  await serviceCreateUserNotification({
    createdByUserId: currentUser._id,
    targetUserId: targetUser._id,
    title: 'A career advisor updated your CV review',
    message: `Your CV review was manually adjusted to grade ${createdAnalysis.overallScore}/100. Reason: ${reason}`,
    level: 'info',
    link: '/cv-assistant',
  })

  return { analysis: createdAnalysis }
}