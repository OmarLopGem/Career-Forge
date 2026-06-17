import { ObjectId } from 'mongodb'
import { CV_ANALYSIS_COLLECTION, getDb } from './mongo.js'

function toObjectId(id) {
  if (typeof id === 'string' && ObjectId.isValid(id)) return new ObjectId(id)
  return null
}

async function getCollection() {
  const db = await getDb()
  return db.collection(CV_ANALYSIS_COLLECTION)
}

function toAnalysis(doc) {
  const { _id, profileId, ...rest } = doc
  return {
    _id: _id ? String(_id) : undefined,
    profileId: profileId ? String(profileId) : undefined,
    ...rest,
  }
}

export async function createAnalysis(data) {
  const newId = new ObjectId()
  const profileOid = toObjectId(data.profileId)
  if (!profileOid) throw new Error('Invalid profileId for analysis')
  const doc = {
    ...data,
    _id: newId,
    profileId: profileOid,
    createdAt: new Date().toISOString(),
  }
  const collection = await getCollection()
  await collection.insertOne(doc)
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
  const oid = toObjectId(profileId)
  if (!oid) return null
  const collection = await getCollection()
  const doc = await collection.findOne(
    { userId, profileId: oid },
    { sort: { createdAt: -1 } },
  )
  if (!doc) return null
  return toAnalysis(doc)
}

export async function listAnalysesByProfile(userId, profileId) {
  const oid = toObjectId(profileId)
  if (!oid) return []
  const collection = await getCollection()
  const docs = await collection
    .find({ userId, profileId: oid })
    .sort({ createdAt: -1 })
    .toArray()
  return docs.map((d) => toAnalysis(d))
}
