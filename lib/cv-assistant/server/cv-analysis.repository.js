import { getCvAnalysisModel } from '@/lib/db/models/cv-analysis.js'
import { toObjectId } from '@/lib/server/object-id.js'

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

export async function createAnalysisFromDraft(userId, profileId, draft) {
  const Model = await getModel()
  const { _id: _ignored, ...incoming } = {
    userId,
    profileId,
    ...draft,
  }
  const doc = await Model.create({
    ...incoming,
    createdAt: new Date().toISOString(),
  })
  return toAnalysis(doc)
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
