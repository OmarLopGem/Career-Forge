import { getCvProfileModel } from '@/lib/db/models/cv-profile.js'
import { computeCompletion } from '@/lib/cv-assistant/validation.js'
import { toObjectId } from '@/lib/server/object-id.js'

function toProfile(doc) {
  if (!doc) return null
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc
  const { _id, ...rest } = obj
  return {
    _id: _id ? String(_id) : undefined,
    ...rest,
  }
}

function buildIdQuery(profileId) {
  if (profileId == null) return null
  const oid = toObjectId(profileId)
  if (oid) return { _id: oid }
  return { _id: profileId }
}

async function getModel() {
  return getCvProfileModel()
}

function sanitizePatch(patch) {
  const sanitized = { ...patch }
  delete sanitized.userId
  delete sanitized.createdAt
  delete sanitized._id
  delete sanitized.completion
  return sanitized
}

export async function createProfile(data) {
  const Model = await getModel()
  const now = new Date().toISOString()
  const { _id: _ignored, ...incoming } = data
  const hasExistingProfiles = (await Model.countDocuments({ userId: incoming.userId }, { limit: 1 })) > 0
  const shouldBeDefault = incoming.isDefault === true || !hasExistingProfiles
  if (shouldBeDefault) {
    await Model.updateMany(
      { userId: incoming.userId, isDefault: true },
      { $set: { isDefault: false, updatedAt: now } },
    )
  }

  const draft = {
    ...incoming,
    isDefault: shouldBeDefault,
    createdAt: now,
    updatedAt: now,
  }
  const completion = computeCompletion(draft)
  const toInsert = { ...draft, completion }
  const doc = await Model.create(toInsert)
  return toProfile(doc)
}

export async function listProfilesByUser(userId) {
  const Model = await getModel()
  const docs = await Model.find({ userId }).sort({ updatedAt: -1 })
  return docs.map(toProfile)
}

export async function listProfileSummariesByUser(userId) {
  const profiles = await listProfilesByUser(userId)
  return profiles.map(toSummary)
}

function toSummary(profile) {
  return {
    _id: profile._id,
    title: profile.title,
    isDefault: profile.isDefault,
    professionalNiche: profile.professionalNiche?.label,
    targetRole: profile.target?.desiredRole,
    completionScore: profile.completion?.score ?? 0,
    updatedAt: profile.updatedAt,
  }
}

export async function getProfileById(userId, profileId) {
  const query = buildIdQuery(profileId)
  if (!query) return null
  const Model = await getModel()
  let doc
  try {
    doc = await Model.findOne({ ...query, userId })
  } catch (err) {
    if (err?.name === 'CastError') return null
    throw err
  }
  return doc ? toProfile(doc) : null
}

export async function updateProfile(userId, profileId, patch) {
  const query = buildIdQuery(profileId)
  if (!query) return null
  const sanitized = sanitizePatch(patch)
  if (Object.keys(sanitized).length === 0) {
    return getProfileById(userId, profileId)
  }

  const Model = await getModel()
  let existing
  try {
    existing = await Model.findOne({ ...query, userId })
  } catch (err) {
    if (err?.name === 'CastError') return null
    throw err
  }
  if (!existing) return null

  const existingObj = existing.toObject()
  const merged = {
    ...existingObj,
    ...sanitized,
  }
  merged.completion = computeCompletion(merged)

  await Model.updateOne(
    { ...query, userId },
    { $set: { ...sanitized, completion: merged.completion, updatedAt: new Date().toISOString() } },
  )

  return getProfileById(userId, profileId)
}

export async function deleteProfile(userId, profileId) {
  const query = buildIdQuery(profileId)
  if (!query) return false
  const Model = await getModel()
  let profile
  try {
    profile = await Model.findOne({ ...query, userId })
  } catch (err) {
    if (err?.name === 'CastError') return false
    throw err
  }
  if (!profile) return false

  const res = await Model.deleteOne({ ...query, userId })
  if (res.deletedCount !== 1) return false

  if (profile.isDefault) {
    const replacement = await Model.findOne({ userId }).sort({ updatedAt: -1, createdAt: -1 })
    if (replacement) {
      await Model.updateOne(
        { _id: replacement._id, userId },
        { $set: { isDefault: true, updatedAt: new Date().toISOString() } },
      )
    }
  }

  return true
}

export async function setDefaultProfile(userId, profileId) {
  const query = buildIdQuery(profileId)
  if (!query) return false
  const Model = await getModel()
  const now = new Date().toISOString()
  await Model.updateMany(
    { userId, isDefault: true },
    { $set: { isDefault: false, updatedAt: now } },
  )
  let res
  try {
    res = await Model.updateOne(
      { ...query, userId },
      { $set: { isDefault: true, updatedAt: now } },
    )
  } catch (err) {
    if (err?.name === 'CastError') return false
    throw err
  }
  return res.matchedCount === 1
}
