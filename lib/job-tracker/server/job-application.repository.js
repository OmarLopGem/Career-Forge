import { ObjectId } from 'mongodb'
import { getDb } from '@/lib/cv-assistant/server/mongo.js'
import { stringifyId, toObjectId } from '@/lib/server/object-id.js'

export const JOB_APPLICATIONS_COLLECTION = 'job_applications'

async function getCollection() {
  const db = await getDb()
  const collection = db.collection(JOB_APPLICATIONS_COLLECTION)

  await collection.createIndexes([
    {
      key: { userId: 1, deletedAt: 1, isArchived: 1, updatedAt: -1 },
      name: 'job_applications_user_state_updated',
    },
    { key: { userId: 1, jobListingId: 1 }, name: 'job_applications_user_listing' },
  ])

  return collection
}

function toApplication(doc) {
  return stringifyId(doc)
}

export async function createJobApplication(data) {
  const collection = await getCollection()
  const now = new Date().toISOString()
  const application = {
    _id: new ObjectId(),
    userId: data.userId,
    jobListingId: data.jobListingId ?? null,
    jobSnapshot: data.jobSnapshot,
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
  }

  await collection.insertOne(application)
  return toApplication(application)
}

export async function listJobApplicationsByUser(userId) {
  const collection = await getCollection()
  const docs = await collection
    .find({ userId, deletedAt: null })
    .sort({ updatedAt: -1, createdAt: -1 })
    .toArray()

  return docs.map(toApplication)
}

export async function getJobApplicationById(userId, applicationId) {
  const collection = await getCollection()
  const oid = toObjectId(applicationId)
  if (!oid) return null
  const doc = await collection.findOne({ _id: oid, userId, deletedAt: null })
  return doc ? toApplication(doc) : null
}

export async function updateJobApplication(userId, applicationId, patch) {
  const collection = await getCollection()
  const oid = toObjectId(applicationId)
  if (!oid) return null

  await collection.updateOne(
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
  const collection = await getCollection()
  const oid = toObjectId(applicationId)
  if (!oid) return false

  const result = await collection.updateOne(
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
  const collection = await getCollection()
  const now = new Date().toISOString()
  const activeStatuses = ['saved', 'applied', 'interview', 'waiting_response']

  await collection.updateMany(
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
