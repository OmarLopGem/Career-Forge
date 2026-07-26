import { getNotificationModel } from '@/lib/db/models/notification.js'
import { stringifyId, toObjectId } from '@/lib/server/object-id.js'

export const NOTIFICATIONS_COLLECTION = 'notifications'

function toNotification(doc) {
  if (!doc) return null
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc
  return stringifyId(obj)
}

function normalizeAudience(value) {
  return value === 'user' ? 'user' : 'all'
}

async function getModel() {
  return getNotificationModel()
}

export async function createNotification(data) {
  const Model = await getModel()
  const now = new Date().toISOString()
  const audience = normalizeAudience(data.audience)
  const notification = await Model.create({
    createdByUserId: data.createdByUserId,
    audience,
    targetUserId: audience === 'user' ? String(data.targetUserId ?? '') || null : null,
    title: data.title,
    message: data.message,
    level: data.level ?? 'info',
    startsAt: data.startsAt ?? now,
    expiresAt: data.expiresAt ?? null,
    isPublished: data.isPublished ?? true,
    link: typeof data.link === 'string' ? data.link : null,
    createdAt: now,
    updatedAt: now,
  })
  return toNotification(notification)
}

export async function listNotifications() {
  const Model = await getModel()
  const docs = await Model.find({}).sort({ createdAt: -1 })
  return docs.map(toNotification)
}

export async function listActiveNotifications({ forUserId, nowIso } = {}) {
  const Model = await getModel()
  const now = nowIso ?? new Date().toISOString()
  const windowFilter = {
    isPublished: true,
    startsAt: { $lte: now },
    $or: [
      { expiresAt: null },
      { expiresAt: '' },
      { expiresAt: { $gte: now } },
    ],
  }

  if (forUserId) {
    const docs = await Model.find({
      ...windowFilter,
      $or: [
        { audience: 'all' },
        { audience: 'user', targetUserId: String(forUserId) },
      ],
    }).sort({ startsAt: -1, createdAt: -1 })
    return docs.map(toNotification)
  }

  const docs = await Model.find({ ...windowFilter, audience: 'all' }).sort({
    startsAt: -1,
    createdAt: -1,
  })

  return docs.map(toNotification)
}

export async function getNotificationById(notificationId) {
  const Model = await getModel()
  const oid = toObjectId(notificationId)
  if (!oid) return null
  const doc = await Model.findById(oid)
  return doc ? toNotification(doc) : null
}