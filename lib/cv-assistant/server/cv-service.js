import {
  createProfile,
  deleteProfile,
  getProfileById,
  listProfileSummariesByUser,
  setDefaultProfile,
  updateProfile,
} from './cv-profile.repository.js'
import {
  createAnalysisFromDraft,
  getLatestAnalysis,
  listAnalysesByProfile,
} from './cv-analysis.repository.js'
import { analyzeCVProfile } from './ai/analyze-cv-profile.js'
import { generateResumePDF, PDFGenerationError } from './generate-resume-pdf.js'
import { importCVFromBuffer, ImportCVError } from './import-cv.js'
import { getCurrentUserId } from './auth/get-current-user-id.js'
import { CV_TEMPLATE_CATALOG, getTemplate } from '../template-catalog.js'
import { computeCompletion, evaluateTemplate } from '../validation.js'

export class CVServiceError extends Error {
  constructor(message, code, status = 400, details) {
    super(message)
    this.code = code
    this.status = status
    this.details = details
  }
}

function ensureFound(value, message) {
  if (value === null || value === undefined) {
    throw new CVServiceError(message, 'PROFILE_NOT_FOUND', 404)
  }
  return value
}

export async function serviceImportCV(input) {
  const userId = await getCurrentUserId()
  try {
    const result = await importCVFromBuffer(input, userId)
    return { profile: result.profile, completion: result.profile.completion }
  } catch (err) {
    if (err instanceof ImportCVError) {
      throw new CVServiceError(err.message, err.code, 400)
    }
    throw err
  }
}

export async function serviceListProfiles() {
  const userId = await getCurrentUserId()
  return listProfileSummariesByUser(userId)
}

export async function serviceGetProfile(profileId) {
  const userId = await getCurrentUserId()
  return ensureFound(await getProfileById(userId, profileId), 'Profile not found.')
}

export async function serviceUpdateProfile(profileId, patch) {
  const userId = await getCurrentUserId()
  const updated = ensureFound(
    await updateProfile(userId, profileId, patch),
    'Profile not found.',
  )
  return { profile: updated, completion: computeCompletion(updated) }
}

export async function serviceDeleteProfile(profileId) {
  const userId = await getCurrentUserId()
  const ok = await deleteProfile(userId, profileId)
  if (!ok) {
    throw new CVServiceError('Profile not found.', 'PROFILE_NOT_FOUND', 404)
  }
  return { ok: true }
}

export async function serviceAnalyzeProfile(profileId) {
  const userId = await getCurrentUserId()
  const profile = ensureFound(
    await getProfileById(userId, profileId),
    'Profile not found.',
  )
  const draft = await analyzeCVProfile({ profile, userId })
  const analysis = await createAnalysisFromDraft(userId, profileId, draft)
  return { analysis, profile }
}

export async function serviceGetLatestAnalysis(profileId) {
  const userId = await getCurrentUserId()
  return { analysis: await getLatestAnalysis(userId, profileId) }
}

export async function serviceListAnalyses(profileId) {
  const userId = await getCurrentUserId()
  return { analyses: await listAnalysesByProfile(userId, profileId) }
}

export async function serviceListTemplates(profileId) {
  const userId = await getCurrentUserId()
  const profile = ensureFound(
    await getProfileById(userId, profileId),
    'Profile not found.',
  )
  return {
    templates: CV_TEMPLATE_CATALOG.map((template) => ({
      template,
      evaluation: evaluateTemplate(profile, template),
    })),
  }
}

export async function serviceGenerateResume(profileId, templateKey) {
  const userId = await getCurrentUserId()
  const profile = ensureFound(
    await getProfileById(userId, profileId),
    'Profile not found.',
  )
  try {
    return await generateResumePDF({ profile, templateKey })
  } catch (err) {
    if (err instanceof PDFGenerationError) {
      throw new CVServiceError(err.message, err.code, 400)
    }
    throw err
  }
}

export async function serviceSetDefaultProfile(profileId) {
  const userId = await getCurrentUserId()
  const ok = await setDefaultProfile(userId, profileId)
  if (!ok) {
    throw new CVServiceError('Profile not found.', 'PROFILE_NOT_FOUND', 404)
  }
  return { ok: true }
}

export function serviceGetTemplateCatalog() {
  return { templates: CV_TEMPLATE_CATALOG }
}

export function serviceGetTemplate(key) {
  return getTemplate(key)
}

export function toApiErrorResponse(err) {
  if (err instanceof CVServiceError) {
    return {
      body: {
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      },
      status: err.status,
    }
  }
  return {
    body: {
      error: {
        code: 'INTERNAL_ERROR',
        message: err instanceof Error ? err.message : 'Unexpected error',
      },
    },
    status: 500,
  }
}
