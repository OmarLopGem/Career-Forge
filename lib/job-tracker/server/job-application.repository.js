import { getJobApplicationModel } from '@/lib/db/models/job-application.js'
import { stringifyId, toObjectId } from '@/lib/server/object-id.js'

function toApplication(doc) {
  if (!doc) return null
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc
  return stringifyId(obj)
}

async function getModel() {
  return getJobApplicationModel()
}

export async function createJobApplication(data) {
  const Model = await getModel()
  const now = new Date().toISOString()
  const doc = await Model.create({
    userId: data.userId,
    jobListingId: data.jobListingId ?? null,
    jobSnapshot: data.jobSnapshot,
    cvProfileId: data.cvProfileId,
    cvProfileSnapshot: data.cvProfileSnapshot,
    status: data.status,
    previousStatus: data.previousStatus ?? null,
    appliedAt: data.appliedAt ?? null,
    lastActivityAt: data.lastActivityAt,
    promisedResponseDate: data.promisedResponseDate ?? null,
    notes: data.notes ?? '',
    adaptedDescription: data.adaptedDescription ?? '',
    isArchived: data.isArchived ?? false,
    archivedAt: data.archivedAt ?? null,
    archivedReason: data.archivedReason ?? null,
    deletedAt: data.deletedAt ?? null,
    createdAt: now,
    updatedAt: now,
  })
  return toApplication(doc)
}

export async function listJobApplicationsByUser(userId) {
  const Model = await getModel()
  const docs = await Model.find({ userId, deletedAt: null }).sort({
    updatedAt: -1,
    createdAt: -1,
  })

  return docs.map(toApplication)
}

export async function getJobApplicationById(userId, applicationId) {
  const Model = await getModel()
  const oid = toObjectId(applicationId)
  if (!oid) return null
  const doc = await Model.findOne({ _id: oid, userId, deletedAt: null })
  return doc ? toApplication(doc) : null
}

export async function updateJobApplication(userId, applicationId, patch) {
  const Model = await getModel()
  const oid = toObjectId(applicationId)
  if (!oid) return null

  await Model.updateOne(
    { _id: oid, userId, deletedAt: null },
    {
      $set: {
        ...patch,
        updatedAt: new Date().toISOString(),
      },
    },
  )

  return getJobApplicationById(userId, applicationId)
}

export async function softDeleteJobApplication(userId, applicationId) {
  const Model = await getModel()
  const oid = toObjectId(applicationId)
  if (!oid) return false

  const result = await Model.updateOne(
    { _id: oid, userId, deletedAt: null },
    {
      $set: {
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    },
  )

  return result.matchedCount === 1
}

export async function archiveStaleApplicationsByUser(userId, cutoffDate) {
  const Model = await getModel()
  const now = new Date().toISOString()
  const activeStatuses = ['saved', 'applied', 'interview', 'waiting_response']

  await Model.updateMany(
    {
      userId,
      deletedAt: null,
      isArchived: false,
      status: { $in: activeStatuses },
      lastActivityAt: { $lte: cutoffDate },
    },
    [
      {
        $set: {
          previousStatus: '$status',
          status: 'archived',
          isArchived: true,
          archivedAt: now,
          archivedReason: 'No updates after 30 days',
          updatedAt: now,
        },
      },
    ],
  )
}
