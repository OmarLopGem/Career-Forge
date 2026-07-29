import { ObjectId } from 'mongodb'
import { getSupportMessageModel } from '@/lib/db/models/support-message.js'
import { stringifyId, toObjectId } from '@/lib/server/object-id.js'

function toOid(id) {
  if (!id) return null
  if (id instanceof ObjectId) return id
  return toObjectId(id)
}

function toMessage(doc) {
  if (!doc) return null
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc
  return stringifyId(obj)
}

async function getModel() {
  return getSupportMessageModel()
}

export async function createMessage(data) {
  const Model = await getModel()
  const now = new Date().toISOString()
  const message = await Model.create({
    ticketId: data.ticketId,
    authorId: data.authorId,
    authorRole: data.authorRole,
    body: data.body,
    createdAt: now,
  })
  return toMessage(message)
}

export async function listMessagesByTicket(ticketId) {
  const Model = await getModel()
  const oid = toOid(ticketId)
  if (!oid) return []
  const docs = await Model.find({ ticketId: oid }).sort({ createdAt: 1, _id: 1 })
  return docs.map(toMessage)
}

export async function listLastMessageByTickets(ticketIds) {
  const Model = await getModel()
  const objectIds = (ticketIds ?? []).map(toOid).filter(Boolean)
  if (objectIds.length === 0) return []
  const docs = await Model.find({ ticketId: { $in: objectIds } }).sort({
    createdAt: -1,
    _id: -1,
  })

  const latestByTicket = new Map()
  for (const doc of docs) {
    const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc
    const key = String(obj.ticketId)
    if (!latestByTicket.has(key)) {
      latestByTicket.set(key, obj)
    }
  }

  return Array.from(latestByTicket.values()).map((doc) => {
    const { _id, ...rest } = doc
    return {
      ...rest,
      ticketId: String(doc.ticketId),
      _id: String(_id),
    }
  })
}

export async function findTicketIdsByLastMessageMatch(q) {
  if (!q) return []
  const Model = await getModel()
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pipeline = [
    { $match: { body: { $regex: escaped, $options: 'i' } } },
    { $sort: { ticketId: 1, createdAt: -1, _id: -1 } },
    {
      $group: {
        _id: '$ticketId',
        latest: { $first: '$$ROOT' },
      },
    },
    { $match: { latest: { $exists: true } } },
    { $project: { _id: '$_id' } },
  ]

  const docs = await Model.aggregate(pipeline)
  return docs.map((doc) => doc._id)
}

export async function deleteMessagesByTickets(ticketIds) {
  const Model = await getModel()
  const objectIds = (ticketIds ?? []).map(toOid).filter(Boolean)
  if (objectIds.length === 0) return 0
  const result = await Model.deleteMany({ ticketId: { $in: objectIds } })
  return result.deletedCount ?? 0
}
