import { ObjectId } from 'mongodb'
import { CV_PROFILE_COLLECTION, getDb } from './mongo.js'
import { computeCompletion } from '../validation.js'

function toObjectId(id) {
  if (typeof id === 'string' && ObjectId.isValid(id)) return new ObjectId(id)
  return null
}

function toProfile(doc) {
  const { _id, ...rest } = doc
  return {
    _id: _id ? String(_id) : undefined,
    ...rest,
  }
}

async function getCollection() {
  const db = await getDb()
  return db.collection(CV_PROFILE_COLLECTION)
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
  const now = new Date().toISOString()
  const newId = new ObjectId()
  const draft = {
    ...data,
    _id: newId,
    createdAt: now,
    updatedAt: now,
  }
  const completion = computeCompletion(draft)
  const toInsert = { ...draft, completion }
  const collection = await getCollection()
  await collection.insertOne(toInsert)
  return toProfile(toInsert)
}

export async function listProfilesByUser(userId) {
  const collection = await getCollection()
  const docs = await collection.find({ userId }).sort({ updatedAt: -1 }).toArray()
  return docs.map((d) => toProfile(d))
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
  const oid = toObjectId(profileId)
  if (!oid) return null
  const collection = await getCollection()
  const doc = await collection.findOne({ _id: oid, userId })
  if (!doc) return null
  return toProfile(doc)
}

export async function updateProfile(userId, profileId, patch) {
  const oid = toObjectId(profileId)
  if (!oid) return null
  const sanitized = sanitizePatch(patch)
  if (Object.keys(sanitized).length === 0) {
    return getProfileById(userId, profileId)
  }

  const collection = await getCollection()
  const existing = await collection.findOne(
    { _id: oid, userId },
    { projection: { _id: 1, userId: 1, createdAt: 1, personalInfo: 1, skills: 1 } },
  )
  if (!existing) return null

  const merged = {
    ...existing,
    ...sanitized,
  }
  merged.completion = computeCompletion(merged)

  await collection.updateOne(
    { _id: oid, userId },
    { $set: { ...sanitized, completion: merged.completion, updatedAt: new Date().toISOString() } },
  )

  return getProfileById(userId, profileId)
}

export async function deleteProfile(userId, profileId) {
  const oid = toObjectId(profileId)
  if (!oid) return false
  const collection = await getCollection()
  const res = await collection.deleteOne({ _id: oid, userId })
  return res.deletedCount === 1
}

export async function setDefaultProfile(userId, profileId) {
  const oid = toObjectId(profileId)
  if (!oid) return false
  const collection = await getCollection()
  await collection.updateMany({ userId }, { $set: { isDefault: false } })
  const res = await collection.updateOne(
    { _id: oid, userId },
    { $set: { isDefault: true } },
  )
  return res.matchedCount === 1
}
