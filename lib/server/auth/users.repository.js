import { ObjectId } from 'mongodb'
import { getDb } from '@/lib/cv-assistant/server/mongo.js'
import { stringifyId, toObjectId } from '@/lib/server/object-id.js'

export const USERS_COLLECTION = 'users'
export const ALLOWED_USER_STATUSES = ['active', 'pending', 'blocked', 'deleted']

function sanitizeString(value) {
  return String(value ?? '').trim()
}

// Auth repositories return plain objects with string ids so the rest of the app
// does not need to care about Mongo-specific types.
async function getCollection() {
  const db = await getDb()
  const collection = db.collection(USERS_COLLECTION)

  // Create indexes lazily so local/dev/test databases stay aligned with the code.
  await collection.createIndexes([
    { key: { email: 1 }, unique: true, name: 'users_email_unique' },
    { key: { status: 1 }, name: 'users_status' },
  ])

  return collection
}

function toUser(doc) {
  return stringifyId(doc)
}

export function toSafeUser(user) {
  if (!user) return null

  // Password hashes never leave the repository boundary.
  const { passwordHash, ...safeUser } = user
  return safeUser
}

export async function createUser(data) {
  const collection = await getCollection()
  const now = new Date().toISOString()
  const user = {
    _id: new ObjectId(),
    email: data.email,
    passwordHash: data.passwordHash,
    firstName: data.firstName,
    lastName: data.lastName,
    dateOfBirth: sanitizeString(data.dateOfBirth) || null,
    photoUrl: sanitizeString(data.photoUrl),
    headline: sanitizeString(data.headline),
    phone: sanitizeString(data.phone),
    location: sanitizeString(data.location),
    linkedinUrl: sanitizeString(data.linkedinUrl),
    githubUrl: sanitizeString(data.githubUrl),
    portfolioUrl: sanitizeString(data.portfolioUrl),
    role: data.role ?? 'user',
    status: data.status ?? 'active',
    deletedAt: data.deletedAt ?? null,
    createdAt: now,
    updatedAt: now,
  }

  await collection.insertOne(user)
  return toUser(user)
}

export async function getUserByEmail(email) {
  const collection = await getCollection()
  const doc = await collection.findOne({ email })
  return doc ? toUser(doc) : null
}

export async function getUserById(userId) {
  const collection = await getCollection()
  const oid = toObjectId(userId)
  if (!oid) return null
  const doc = await collection.findOne({ _id: oid })
  return doc ? toUser(doc) : null
}

export async function countActiveAdmins() {
  const collection = await getCollection()
  return collection.countDocuments({ role: 'admin', status: 'active' })
}

export async function setUserStatus(userId, status) {
  if (!ALLOWED_USER_STATUSES.includes(status)) {
    const { AppServiceError } = await import('@/lib/server/api-error.js')
    throw new AppServiceError(
      `Status must be one of: ${ALLOWED_USER_STATUSES.join(', ')}.`,
      'INVALID_STATUS',
      400,
    )
  }

  const oid = toObjectId(userId)
  if (!oid) {
    const { AppServiceError } = await import('@/lib/server/api-error.js')
    throw new AppServiceError('Invalid user id.', 'INVALID_USER_ID', 400)
  }

  const { AppServiceError } = await import('@/lib/server/api-error.js')
  const collection = await getCollection()
  const now = new Date().toISOString()

  const result = await collection.findOneAndUpdate(
    { _id: oid },
    { $set: { status, updatedAt: now } },
    { returnDocument: 'after' },
  )

  const doc = result?.value ?? result
  if (!doc) return null
  return toUser(doc)
}

export async function deleteUserById(userId) {
  const oid = toObjectId(userId)
  if (!oid) {
    const { AppServiceError } = await import('@/lib/server/api-error.js')
    throw new AppServiceError('Invalid user id.', 'INVALID_USER_ID', 400)
  }

  const collection = await getCollection()
  const result = await collection.deleteOne({ _id: oid })
  return result.deletedCount === 1
}

export async function markUserDeleted(userId) {
  const oid = toObjectId(userId)
  if (!oid) {
    const { AppServiceError } = await import('@/lib/server/api-error.js')
    throw new AppServiceError('Invalid user id.', 'INVALID_USER_ID', 400)
  }

  const collection = await getCollection()
  const now = new Date().toISOString()
  const result = await collection.findOneAndUpdate(
    { _id: oid },
    {
      $set: {
        status: 'deleted',
        deletedAt: now,
        updatedAt: now,
      },
    },
    { returnDocument: 'after' },
  )
  const doc = result?.value ?? result
  return doc ? toUser(doc) : null
}

export async function updateUserAccount(userId, data) {
  const oid = toObjectId(userId)
  if (!oid) {
    const { AppServiceError } = await import('@/lib/server/api-error.js')
    throw new AppServiceError('Invalid user id.', 'INVALID_USER_ID', 400)
  }

  const collection = await getCollection()
  const now = new Date().toISOString()
  const result = await collection.findOneAndUpdate(
    { _id: oid },
    {
      $set: {
        firstName: sanitizeString(data.firstName),
        lastName: sanitizeString(data.lastName),
        dateOfBirth: sanitizeString(data.dateOfBirth) || null,
        photoUrl: sanitizeString(data.photoUrl),
        headline: sanitizeString(data.headline),
        phone: sanitizeString(data.phone),
        location: sanitizeString(data.location),
        linkedinUrl: sanitizeString(data.linkedinUrl),
        githubUrl: sanitizeString(data.githubUrl),
        portfolioUrl: sanitizeString(data.portfolioUrl),
        updatedAt: now,
      },
    },
    { returnDocument: 'after' },
  )

  const doc = result?.value ?? result
  if (!doc) return null
  return toUser(doc)
}

const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100
const MAX_SEARCH_LENGTH = 100

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : fallback
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildUserSearchFilter(rawQuery) {
  const trimmed = String(rawQuery ?? '').trim().slice(0, MAX_SEARCH_LENGTH)
  if (!trimmed) return null

  const terms = trimmed
    .split(/\s+/)
    .map((term) => term.toLowerCase())
    .filter(Boolean)
    .map(escapeRegex)

  if (terms.length === 0) return null

  const perTermFilter = terms.map((term) => ({
    $or: [
      { firstName: { $regex: term, $options: 'i' } },
      { lastName: { $regex: term, $options: 'i' } },
      { email: { $regex: term, $options: 'i' } },
    ],
  }))

  return terms.length === 1 ? perTermFilter[0] : { $and: perTermFilter }
}

export async function listUsers({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  query,
} = {}) {
  const safePage = parsePositiveInt(page, 1)
  const safePageSize = Math.min(
    MAX_PAGE_SIZE,
    parsePositiveInt(pageSize, DEFAULT_PAGE_SIZE),
  )
  const searchFilter = buildUserSearchFilter(query)
  const filter = searchFilter
    ? { $and: [{ status: { $nin: ['blocked', 'deleted'] } }, searchFilter] }
    : { status: { $nin: ['blocked', 'deleted'] } }
  const collection = await getCollection()

  const [docs, total] = await Promise.all([
    collection
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((safePage - 1) * safePageSize)
      .limit(safePageSize)
      .toArray(),
    collection.countDocuments(filter),
  ])

  return {
    items: docs.map(toUser),
    total,
    page: safePage,
    pageSize: safePageSize,
  }
}

export async function listUsersByStatuses(statuses) {
  const normalizedStatuses = Array.isArray(statuses)
    ? statuses.filter((status) => ALLOWED_USER_STATUSES.includes(status))
    : []
  if (normalizedStatuses.length === 0) return []

  const collection = await getCollection()
  const docs = await collection
    .find({ status: { $in: normalizedStatuses } })
    .sort({ updatedAt: -1, createdAt: -1 })
    .toArray()

  return docs.map(toUser)
}

export async function listUsersByIds(userIds) {
  const objectIds = (userIds ?? []).map(toObjectId).filter(Boolean)
  if (objectIds.length === 0) return []

  const collection = await getCollection()
  const docs = await collection.find({ _id: { $in: objectIds } }).toArray()
  return docs.map(toUser)
}
