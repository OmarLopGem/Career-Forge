import { ObjectId } from 'mongodb'
import { getDb } from '@/lib/cv-assistant/server/mongo.js'
import { stringifyId, toObjectId } from '@/lib/server/object-id.js'

export const NOTIFICATIONS_COLLECTION = 'notifications'

async function getCollection() {
  const db = await getDb()
  const collection = db.collection(NOTIFICATIONS_COLLECTION)

  await collection.createIndexes([
    { key: { audience: 1, isPublished: 1, startsAt: -1 }, name: 'notifications_audience_published_starts' },
    { key: { createdByUserId: 1, createdAt: -1 }, name: 'notifications_creator_created' },
  ])

  return collection
}

function toNotification(doc) {
  return stringifyId(doc)
}

export async function createNotification(data) {
  const collection = await getCollection()
  const now = new Date().toISOString()
  const notification = {
    _id: new ObjectId(),
    createdByUserId: data.createdByUserId,
    audience: 'all',
    title: data.title,
    message: data.message,
    level: data.level ?? 'info',
    startsAt: data.startsAt ?? now,
    expiresAt: data.expiresAt ?? null,
    isPublished: data.isPublished ?? true,
    createdAt: now,
    updatedAt: now,
  }

  await collection.insertOne(notification)
  return toNotification(notification)
}

export async function listNotifications() {
  const collection = await getCollection()
  const docs = await collection.find({}).sort({ createdAt: -1 }).toArray()
  return docs.map(toNotification)
}

export async function listActiveNotifications(nowIso = new Date().toISOString()) {
  const collection = await getCollection()
  const docs = await collection.find({
    audience: 'all',
    isPublished: true,
    startsAt: { $lte: nowIso },
    $or: [
      { expiresAt: null },
      { expiresAt: '' },
      { expiresAt: { $gte: nowIso } },
    ],
  }).sort({ startsAt: -1, createdAt: -1 }).toArray()

  return docs.map(toNotification)
}

export async function getNotificationById(notificationId) {
  const collection = await getCollection()
  const oid = toObjectId(notificationId)
  if (!oid) return null
  const doc = await collection.findOne({ _id: oid })
  return doc ? toNotification(doc) : null
}
