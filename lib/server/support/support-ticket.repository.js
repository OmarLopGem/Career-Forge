import { ObjectId } from 'mongodb'
import { getDb } from '@/lib/cv-assistant/server/mongo.js'
import { stringifyId, toObjectId } from '@/lib/server/object-id.js'

function toOid(id) {
  if (!id) return null
  if (id instanceof ObjectId) return id
  return toObjectId(id)
}

export const SUPPORT_TICKETS_COLLECTION = 'support_tickets'

const TICKET_STATUSES = ['open', 'answered', 'closed']
const ACTIVE_TICKET_STATUSES = ['open', 'answered']

const SORT_OPTIONS = {
  recent: { lastMessageAt: -1, createdAt: -1 },
  oldest: { createdAt: 1, lastMessageAt: 1 },
  status: { status: 1, lastMessageAt: -1 },
  subject: { subject: 1, lastMessageAt: -1 },
}

async function getCollection() {
  const db = await getDb()
  const collection = db.collection(SUPPORT_TICKETS_COLLECTION)

  await collection.createIndexes([
    { key: { userId: 1, lastMessageAt: -1 }, name: 'support_tickets_user_lastMessage' },
    { key: { status: 1, lastMessageAt: -1 }, name: 'support_tickets_status_lastMessage' },
  ])

  return collection
}

function toTicket(doc) {
  return stringifyId(doc)
}

function buildStatusFilter(status) {
  if (!status) return null
  if (status === 'active') {
    return { status: { $in: ACTIVE_TICKET_STATUSES } }
  }
  if (TICKET_STATUSES.includes(status)) {
    return { status }
  }
  return null
}

export async function createTicket(data) {
  const collection = await getCollection()
  const now = new Date().toISOString()
  const ticket = {
    _id: new ObjectId(),
    userId: data.userId,
    subject: data.subject,
    status: 'open',
    lastMessageAt: data.lastMessageAt ?? now,
    lastMessageBy: data.lastMessageBy ?? 'user',
    createdAt: now,
    updatedAt: now,
  }

  await collection.insertOne(ticket)
  return toTicket(ticket)
}

export async function getTicketById(ticketId) {
  const collection = await getCollection()
  const oid = toOid(ticketId)
  if (!oid) return null
  const doc = await collection.findOne({ _id: oid })
  return doc ? toTicket(doc) : null
}

export async function listTicketsByUser(userId) {
  if (!userId) return []
  const collection = await getCollection()
  const docs = await collection
    .find({ userId: String(userId) })
    .sort({ lastMessageAt: -1, createdAt: -1 })
    .toArray()
  return docs.map(toTicket)
}

export async function listAllTickets({
  status,
  userId,
  ticketIds,
  sort,
  limit,
  skip,
} = {}) {
  const collection = await getCollection()
  const filter = buildStatusFilter(status) ?? {}
  if (userId) {
    filter.userId = String(userId)
  }
  if (ticketIds && ticketIds.length > 0) {
    const oids = ticketIds.map((id) => (id instanceof ObjectId ? id : toObjectId(id))).filter(Boolean)
    if (oids.length === 0) return []
    filter._id = { $in: oids }
  }

  const cursor = collection
    .find(filter)
    .sort(SORT_OPTIONS[sort] ?? SORT_OPTIONS.recent)

  if (typeof skip === 'number' && skip > 0) cursor.skip(skip)
  if (typeof limit === 'number' && limit > 0) cursor.limit(limit)

  const docs = await cursor.toArray()
  return docs.map(toTicket)
}

export async function countTickets(filter = {}) {
  const collection = await getCollection()
  return collection.countDocuments(filter)
}

export async function getTicketStats({ userId } = {}) {
  const collection = await getCollection()
  const baseFilter = userId ? { userId: String(userId) } : {}

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayIso = todayStart.toISOString()

  const [open, answered, closed, answeredToday, closedToday, total] = await Promise.all([
    collection.countDocuments({ ...baseFilter, status: 'open' }),
    collection.countDocuments({ ...baseFilter, status: 'answered' }),
    collection.countDocuments({ ...baseFilter, status: 'closed' }),
    collection.countDocuments({
      ...baseFilter,
      status: 'answered',
      lastMessageAt: { $gte: todayIso },
    }),
    collection.countDocuments({
      ...baseFilter,
      status: 'closed',
      lastMessageAt: { $gte: todayIso },
    }),
    collection.countDocuments(baseFilter),
  ])

  return { open, answered, closed, answeredToday, closedToday, total }
}

export async function searchTicketsForAdmin({ q, ticketIds } = {}) {
  const collection = await getCollection()
  const filter = {}
  if (ticketIds && ticketIds.length > 0) {
    const oids = ticketIds.map((id) => (id instanceof ObjectId ? id : toObjectId(id))).filter(Boolean)
    if (oids.length === 0) return []
    filter._id = { $in: oids }
  }
  if (q) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    filter.subject = { $regex: escaped, $options: 'i' }
  }
  const docs = await collection
    .find(filter)
    .sort(SORT_OPTIONS.recent)
    .toArray()
  return docs.map(toTicket)
}

export async function countActiveTicketsByUser(userId) {
  if (!userId) return 0
  const collection = await getCollection()
  return collection.countDocuments({
    userId: String(userId),
    status: { $in: ACTIVE_TICKET_STATUSES },
  })
}

export async function updateTicketAfterMessage(ticketId, { lastMessageAt, lastMessageBy, status }) {
  const collection = await getCollection()
  const oid = toOid(ticketId)
  if (!oid) return null
  const update = { updatedAt: new Date().toISOString() }
  if (lastMessageAt !== undefined) update.lastMessageAt = lastMessageAt
  if (lastMessageBy !== undefined) update.lastMessageBy = lastMessageBy
  if (status !== undefined) update.status = status

  const result = await collection.findOneAndUpdate(
    { _id: oid },
    { $set: update },
    { returnDocument: 'after' },
  )
  return result ? toTicket(result) : null
}

export async function updateTicketStatus(ticketId, status) {
  return updateTicketAfterMessage(ticketId, { status })
}

export async function listTicketIdsByUser(userId) {
  if (!userId) return []
  const collection = await getCollection()
  const docs = await collection
    .find({ userId: String(userId) }, { projection: { _id: 1 } })
    .toArray()
  return docs.map((doc) => doc._id)
}

export async function deleteTicketsByUser(userId) {
  if (!userId) return 0
  const collection = await getCollection()
  const result = await collection.deleteMany({ userId: String(userId) })
  return result.deletedCount ?? 0
}

export { TICKET_STATUSES, ACTIVE_TICKET_STATUSES }