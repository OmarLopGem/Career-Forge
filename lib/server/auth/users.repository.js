import { getUserModel } from '@/lib/db/models/user.js'
import { stringifyId, toObjectId } from '@/lib/server/object-id.js'
export const ALLOWED_USER_STATUSES = ['active', 'pending', 'blocked', 'deleted']

function sanitizeString(value) {
  return String(value ?? '').trim()
}

async function getModel() {
  return getUserModel()
}

function toUser(doc) {
  if (!doc) return null
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc
  return stringifyId(obj)
}

export function toSafeUser(user) {
  if (!user) return null
  const obj = typeof user.toObject === 'function' ? user.toObject() : user
  const { passwordHash, ...safeUser } = obj
  return safeUser
}

export async function createUser(data) {
  const Model = await getModel()
  const now = new Date().toISOString()
  const doc = await Model.create({
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
  })
  return toUser(doc)
}

export async function getUserByEmail(email) {
  const Model = await getModel()
  const doc = await Model.findOne({ email })
  return doc ? toUser(doc) : null
}

export async function getUserById(userId) {
  const Model = await getModel()
  const oid = toObjectId(userId)
  if (!oid) return null
  const doc = await Model.findById(oid)
  return doc ? toUser(doc) : null
}

export async function countActiveAdmins() {
  const Model = await getModel()
  return Model.countDocuments({ role: 'admin', status: 'active' })
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

  const Model = await getModel()
  const now = new Date().toISOString()
  const doc = await Model.findByIdAndUpdate(
    oid,
    { $set: { status, updatedAt: now } },
    { new: true },
  )
  return doc ? toUser(doc) : null
}

export async function markUserDeleted(userId) {
  const oid = toObjectId(userId)
  if (!oid) {
    const { AppServiceError } = await import('@/lib/server/api-error.js')
    throw new AppServiceError('Invalid user id.', 'INVALID_USER_ID', 400)
  }

  const Model = await getModel()
  const now = new Date().toISOString()
  const doc = await Model.findByIdAndUpdate(
    oid,
    {
      $set: {
        status: 'deleted',
        deletedAt: now,
        updatedAt: now,
      },
    },
    { new: true },
  )
  return doc ? toUser(doc) : null
}

export async function updateUserAccount(userId, data) {
  const oid = toObjectId(userId)
  if (!oid) {
    const { AppServiceError } = await import('@/lib/server/api-error.js')
    throw new AppServiceError('Invalid user id.', 'INVALID_USER_ID', 400)
  }

  const Model = await getModel()
  const now = new Date().toISOString()
  const doc = await Model.findByIdAndUpdate(
    oid,
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
    { new: true },
  )

  return doc ? toUser(doc) : null
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
  const Model = await getModel()
  const safePage = parsePositiveInt(page, 1)
  const safePageSize = Math.min(
    MAX_PAGE_SIZE,
    parsePositiveInt(pageSize, DEFAULT_PAGE_SIZE),
  )
  const searchFilter = buildUserSearchFilter(query)
  const filter = searchFilter
    ? { $and: [{ status: { $nin: ['blocked', 'deleted'] } }, searchFilter] }
    : { status: { $nin: ['blocked', 'deleted'] } }

  const [docs, total] = await Promise.all([
    Model.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((safePage - 1) * safePageSize)
      .limit(safePageSize),
    Model.countDocuments(filter),
  ])

  return {
    items: docs.map(toUser),
    total,
    page: safePage,
    pageSize: safePageSize,
  }
}

export async function listUsersByStatuses(statuses) {
  const Model = await getModel()
  const normalizedStatuses = Array.isArray(statuses)
    ? statuses.filter((status) => ALLOWED_USER_STATUSES.includes(status))
    : []
  if (normalizedStatuses.length === 0) return []

  const docs = await Model.find({ status: { $in: normalizedStatuses } }).sort({
    updatedAt: -1,
    createdAt: -1,
  })

  return docs.map(toUser)
}

export async function listUsersByIds(userIds) {
  const Model = await getModel()
  const objectIds = (userIds ?? []).map(toObjectId).filter(Boolean)
  if (objectIds.length === 0) return []

  const docs = await Model.find({ _id: { $in: objectIds } })
  return docs.map(toUser)
}
