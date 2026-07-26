import { getCvAnalysisModel } from '@/lib/db/models/cv-analysis.js'
import { toObjectId } from '@/lib/server/object-id.js'

export const CV_ANALYSIS_COLLECTION = 'cv_analyses'

function toAnalysis(doc) {
  if (!doc) return null
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc
  const { _id, profileId, ...rest } = obj
  return {
    _id: _id ? String(_id) : undefined,
    profileId: profileId ? String(profileId) : undefined,
    ...rest,
  }
}

async function getModel() {
  return getCvAnalysisModel()
}

export async function createAnalysis(data) {
  const Model = await getModel()
  const { _id: _ignored, ...incoming } = data
  const doc = await Model.create({
    ...incoming,
    createdAt: new Date().toISOString(),
  })
  return toAnalysis(doc)
}

export async function createAnalysisFromDraft(userId, profileId, draft) {
  return createAnalysis({
    userId,
    profileId,
    ...draft,
  })
}

export async function getLatestAnalysis(userId, profileId) {
  const Model = await getModel()
  const docs = await Model.find({ userId, profileId }).sort({ createdAt: -1 }).limit(1)
  const doc = docs[0]
  return doc ? toAnalysis(doc) : null
}

export async function listAnalysesByProfile(userId, profileId) {
  const Model = await getModel()
  const docs = await Model.find({ userId, profileId }).sort({ createdAt: -1 })
  return docs.map(toAnalysis)
}

export async function deleteAnalysesByProfile(userId, profileId) {
  const Model = await getModel()
  const result = await Model.deleteMany({ userId, profileId })
  return result.deletedCount ?? 0
}