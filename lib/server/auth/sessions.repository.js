import { ObjectId } from 'mongodb'
import { randomBytes } from 'node:crypto'
import { getDb } from '@/lib/cv-assistant/server/mongo.js'
import { stringifyId, toObjectId } from '@/lib/server/object-id.js'

export const SESSIONS_COLLECTION = 'sessions'
const SESSION_TOKEN_INDEX = 'sessions_token_unique'
const SESSION_EXPIRES_TTL_INDEX = 'sessions_expires_at_ttl'

// Sessions stay in Mongo so server-rendered routes can validate auth from
// httpOnly cookies without relying on client storage.
async function getCollection() {
  const db = await getDb()
  const collection = db.collection(SESSIONS_COLLECTION)
  let indexes = []

  await ensureSessionIndexes(collection)

  return collection
}

async function ensureSessionIndexes(collection) {
  await collection.createIndex(
    { token: 1 },
    { unique: true, name: SESSION_TOKEN_INDEX },
  )

  try {
    // If an equivalent TTL index already exists with another name, Mongo will
    // reject the duplicate definition. In that case we keep using the existing one.
    await collection.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0, name: SESSION_EXPIRES_TTL_INDEX },
    )
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !String(error.message).includes('An equivalent index already exists')
    ) {
      throw error
    }
  }
}

function toSession(doc) {
  return stringifyId({
    ...doc,
    expiresAt: serializeDate(doc.expiresAt),
    createdAt: serializeDate(doc.createdAt),
    updatedAt: serializeDate(doc.updatedAt),
  })
}

function serializeDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export async function createSession(userId, durationMs) {
  const collection = await getCollection()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + durationMs)
  const session = {
    _id: new ObjectId(),
    userId,
    token: randomBytes(32).toString('base64url'),
    expiresAt,
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

  // Expired sessions are cleaned up on read to keep the collection tidy even
  // without a background worker.
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

export async function deleteSessionsByUserId(userId) {
  const collection = await getCollection()
  const oid = toObjectId(userId)
  if (!oid) return 0
  const userIdString = oid.toString()
  const result = await collection.deleteMany({
    $or: [
      { userId: userIdString },
      { userId: oid },
    ],
  })
  return result.deletedCount ?? 0
}
