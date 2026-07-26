import { ObjectId } from 'mongodb'
import { getSupportTicketModel } from '@/lib/db/models/support-ticket.js'
import { stringifyId, toObjectId } from '@/lib/server/object-id.js'

export const SUPPORT_TICKETS_COLLECTION = 'support_tickets'

const TICKET_STATUSES = ['open', 'answered', 'closed']
const ACTIVE_TICKET_STATUSES = ['open', 'answered']

const SORT_OPTIONS = {
  recent: { lastMessageAt: -1, createdAt: -1 },
  oldest: { createdAt: 1, lastMessageAt: 1 },
  status: { status: 1, lastMessageAt: -1 },
  subject: { subject: 1, lastMessageAt: -1 },
}

function toOid(id) {
  if (!id) return null
  if (id instanceof ObjectId) return id
  return toObjectId(id)
}

function toTicket(doc) {
  if (!doc) return null
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc
  return stringifyId(obj)
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

async function getModel() {
  return getSupportTicketModel()
}

export async function createTicket(data) {
  const Model = await getModel()
  const now = new Date().toISOString()
  const ticket = await Model.create({
    userId: data.userId,
    subject: data.subject,
    status: 'open',
    lastMessageAt: data.lastMessageAt ?? now,
    lastMessageBy: data.lastMessageBy ?? 'user',
    createdAt: now,
    updatedAt: now,
  })
  return toTicket(ticket)
}

export async function getTicketById(ticketId) {
  const Model = await getModel()
  const oid = toOid(ticketId)
  if (!oid) return null
  const doc = await Model.findById(oid)
  return doc ? toTicket(doc) : null
}

export async function listTicketsByUser(userId) {
  if (!userId) return []
  const Model = await getModel()
  const docs = await Model.find({ userId: String(userId) }).sort({
    lastMessageAt: -1,
    createdAt: -1,
  })
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
  const Model = await getModel()
  const filter = buildStatusFilter(status) ?? {}
  if (userId) {
    filter.userId = String(userId)
  }
  if (ticketIds && ticketIds.length > 0) {
    const oids = ticketIds.map((id) => (id instanceof ObjectId ? id : toObjectId(id))).filter(Boolean)
    if (oids.length === 0) return []
    filter._id = { $in: oids }
  }

  let query = Model.find(filter).sort(SORT_OPTIONS[sort] ?? SORT_OPTIONS.recent)

  if (typeof skip === 'number' && skip > 0) query = query.skip(skip)
  if (typeof limit === 'number' && limit > 0) query = query.limit(limit)

  const docs = await query
  return docs.map(toTicket)
}

export async function countTickets(filter = {}) {
  const Model = await getModel()
  return Model.countDocuments(filter)
}

export async function getTicketStats({ userId } = {}) {
  const Model = await getModel()
  const baseFilter = userId ? { userId: String(userId) } : {}

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayIso = todayStart.toISOString()

  const [open, answered, closed, answeredToday, closedToday, total] = await Promise.all([
    Model.countDocuments({ ...baseFilter, status: 'open' }),
    Model.countDocuments({ ...baseFilter, status: 'answered' }),
    Model.countDocuments({ ...baseFilter, status: 'closed' }),
    Model.countDocuments({
      ...baseFilter,
      status: 'answered',
      lastMessageAt: { $gte: todayIso },
    }),
    Model.countDocuments({
      ...baseFilter,
      status: 'closed',
      lastMessageAt: { $gte: todayIso },
    }),
    Model.countDocuments(baseFilter),
  ])

  return { open, answered, closed, answeredToday, closedToday, total }
}

export async function searchTicketsForAdmin({ q, ticketIds } = {}) {
  const Model = await getModel()
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
  const docs = await Model.find(filter).sort(SORT_OPTIONS.recent)
  return docs.map(toTicket)
}

export async function countActiveTicketsByUser(userId) {
  if (!userId) return 0
  const Model = await getModel()
  return Model.countDocuments({
    userId: String(userId),
    status: { $in: ACTIVE_TICKET_STATUSES },
  })
}

export async function updateTicketAfterMessage(ticketId, { lastMessageAt, lastMessageBy, status }) {
  const Model = await getModel()
  const oid = toOid(ticketId)
  if (!oid) return null
  const update = { updatedAt: new Date().toISOString() }
  if (lastMessageAt !== undefined) update.lastMessageAt = lastMessageAt
  if (lastMessageBy !== undefined) update.lastMessageBy = lastMessageBy
  if (status !== undefined) update.status = status

  const doc = await Model.findByIdAndUpdate(oid, { $set: update }, { new: true })
  return doc ? toTicket(doc) : null
}

export async function updateTicketStatus(ticketId, status) {
  return updateTicketAfterMessage(ticketId, { status })
}

export async function listTicketIdsByUser(userId) {
  if (!userId) return []
  const Model = await getModel()
  const docs = await Model.find({ userId: String(userId) }, { _id: 1 })
  return docs.map((doc) => doc._id)
}

export async function deleteTicketsByUser(userId) {
  if (!userId) return 0
  const Model = await getModel()
  const result = await Model.deleteMany({ userId: String(userId) })
  return result.deletedCount ?? 0
}

export { TICKET_STATUSES, ACTIVE_TICKET_STATUSES }