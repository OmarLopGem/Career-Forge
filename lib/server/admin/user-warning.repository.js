import { ObjectId } from 'mongodb'
import { getDb } from '@/lib/cv-assistant/server/mongo.js'
import { stringifyId } from '@/lib/server/object-id.js'

export const USER_WARNINGS_COLLECTION = 'user_warnings'

async function getCollection() {
  const db = await getDb()
  const collection = db.collection(USER_WARNINGS_COLLECTION)

  await collection.createIndexes([
    { key: { userId: 1, createdAt: -1 }, name: 'user_warnings_user_created' },
    { key: { adminId: 1, createdAt: -1 }, name: 'user_warnings_admin_created' },
  ])

  return collection
}

export async function createUserWarning({ userId, adminId, message }) {
  const collection = await getCollection()
  const warning = {
    _id: new ObjectId(),
    userId,
    adminId,
    message,
    createdAt: new Date().toISOString(),
  }

  await collection.insertOne(warning)
  return stringifyId(warning)
}

export async function listUserWarnings(userId) {
  const collection = await getCollection()
  const docs = await collection.find({ userId }).sort({ createdAt: -1 }).toArray()
  return docs.map(stringifyId)
}

export async function countUserWarnings(userId) {
  const collection = await getCollection()
  return collection.countDocuments({ userId })
}

export async function listUserWarningSummaries(userIds) {
  const collection = await getCollection()
  const match = Array.isArray(userIds) && userIds.length > 0
    ? { userId: { $in: userIds } }
    : {}
  const summaries = await collection
    .aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$userId',
          warningCount: { $sum: 1 },
          latestWarning: { $first: '$message' },
          lastWarnedAt: { $first: '$createdAt' },
        },
      },
      { $sort: { lastWarnedAt: -1 } },
    ])
    .toArray()

  return summaries.map((summary) => ({
    userId: summary._id,
    warningCount: summary.warningCount,
    latestWarning: summary.latestWarning,
    lastWarnedAt: summary.lastWarnedAt,
  }))
}

export async function deleteWarningsForUser(userId) {
  const collection = await getCollection()
  const result = await collection.deleteMany({
    $or: [{ userId }, { adminId: userId }],
  })
  return result.deletedCount ?? 0
}
