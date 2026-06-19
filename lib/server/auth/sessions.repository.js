import { ObjectId } from 'mongodb'
import { randomBytes } from 'node:crypto'
import { getDb } from '@/lib/cv-assistant/server/mongo.js'
import { stringifyId, toObjectId } from '@/lib/server/object-id.js'

export const SESSIONS_COLLECTION = 'sessions'

async function getCollection() {
  const db = await getDb()
  const collection = db.collection(SESSIONS_COLLECTION)

  await collection.createIndexes([
    { key: { token: 1 }, unique: true, name: 'sessions_token_unique' },
    { key: { expiresAt: 1 }, name: 'sessions_expires_at' },
  ])

  return collection
}

function toSession(doc) {
  return stringifyId(doc)
}

export async function createSession(userId, durationMs) {
  const collection = await getCollection()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + durationMs)
  const session = {
    _id: new ObjectId(),
    userId,
    token: randomBytes(32).toString('base64url'),
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  }

  await collection.insertOne(session)
  return toSession(session)
}

export async function getSessionByToken(token) {
  const collection = await getCollection()
  const doc = await collection.findOne({ token })
  if (!doc) return null

  if (new Date(doc.expiresAt).getTime() <= Date.now()) {
    await collection.deleteOne({ _id: doc._id })
    return null
  }

  return toSession(doc)
}

export async function deleteSessionByToken(token) {
  const collection = await getCollection()
  const result = await collection.deleteOne({ token })
  return result.deletedCount === 1
}

export async function deleteSessionById(sessionId) {
  const collection = await getCollection()
  const oid = toObjectId(sessionId)
  if (!oid) return false
  const result = await collection.deleteOne({ _id: oid })
  return result.deletedCount === 1
}
