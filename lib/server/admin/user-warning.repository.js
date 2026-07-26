import { getUserWarningModel } from '@/lib/db/models/user-warning.js'
import { stringifyId } from '@/lib/server/object-id.js'

export const USER_WARNINGS_COLLECTION = 'user_warnings'

function toDoc(doc) {
  if (!doc) return null
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc
  return stringifyId(obj)
}

export async function createUserWarning({ userId, adminId, message }) {
  const Model = await getUserWarningModel()
  const doc = await Model.create({
    userId,
    adminId,
    message,
    createdAt: new Date().toISOString(),
  })
  return toDoc(doc)
}

export async function listUserWarnings(userId) {
  const Model = await getUserWarningModel()
  const docs = await Model.find({ userId }).sort({ createdAt: -1 })
  return docs.map(toDoc)
}

export async function countUserWarnings(userId) {
  const Model = await getUserWarningModel()
  return Model.countDocuments({ userId })
}

export async function listUserWarningSummaries(userIds) {
  const Model = await getUserWarningModel()
  const match = Array.isArray(userIds) && userIds.length > 0
    ? { userId: { $in: userIds } }
    : {}
  const summaries = await Model.aggregate([
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

  return summaries.map((summary) => ({
    userId: summary._id,
    warningCount: summary.warningCount,
    latestWarning: summary.latestWarning,
    lastWarnedAt: summary.lastWarnedAt,
  }))
}

export async function deleteWarningsForUser(userId) {
  const Model = await getUserWarningModel()
  const result = await Model.deleteMany({
    $or: [{ userId }, { adminId: userId }],
  })
  return result.deletedCount ?? 0
}