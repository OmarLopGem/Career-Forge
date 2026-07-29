import { randomBytes } from 'node:crypto'
import { getSessionModel } from '@/lib/db/models/session.js'
import { stringifyId, toObjectId } from '@/lib/server/object-id.js'

function toSession(doc) {
  if (!doc) return null
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc
  return stringifyId({
    ...obj,
    expiresAt: serializeDate(obj.expiresAt),
    createdAt: serializeDate(obj.createdAt),
    updatedAt: serializeDate(obj.updatedAt),
  })
}

function serializeDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export async function createSession(userId, durationMs) {
  const Model = await getSessionModel()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + durationMs)
  const session = await Model.create({
    userId,
    token: randomBytes(32).toString('base64url'),
    expiresAt,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  })
  return toSession(session)
}

export async function getSessionByToken(token) {
  const Model = await getSessionModel()
  const doc = await Model.findOne({ token })
  if (!doc) return null

  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc
  if (new Date(obj.expiresAt).getTime() <= Date.now()) {
    await Model.deleteOne({ _id: obj._id })
    return null
  }

  return toSession(doc)
}

export async function deleteSessionByToken(token) {
  const Model = await getSessionModel()
  const result = await Model.deleteOne({ token })
  return result.deletedCount === 1
}

export async function deleteSessionsByUserId(userId) {
  const Model = await getSessionModel()
  const oid = toObjectId(userId)
  if (!oid) return 0
  const userIdString = oid.toString()
  const result = await Model.deleteMany({
    $or: [
      { userId: userIdString },
      { userId: oid },
    ],
  })
  return result.deletedCount ?? 0
}
