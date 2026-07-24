import { ObjectId } from 'mongodb'
import { getDb } from '@/lib/cv-assistant/server/mongo.js'
import { stringifyId, toObjectId } from '@/lib/server/object-id.js'

function toOid(id) {
  if (!id) return null
  if (id instanceof ObjectId) return id
  return toObjectId(id)
}

export const SUPPORT_MESSAGES_COLLECTION = 'support_messages'

async function getCollection() {
  const db = await getDb()
  const collection = db.collection(SUPPORT_MESSAGES_COLLECTION)

  await collection.createIndexes([
    { key: { ticketId: 1, createdAt: 1 }, name: 'support_messages_ticket_created' },
  ])

  return collection
}

function toMessage(doc) {
  return stringifyId(doc)
}

export async function createMessage(data) {
  const collection = await getCollection()
  const now = new Date().toISOString()
  const message = {
    _id: new ObjectId(),
    ticketId: data.ticketId,
    authorId: data.authorId,
    authorRole: data.authorRole,
    body: data.body,
    createdAt: now,
  }

  await collection.insertOne(message)
  return toMessage(message)
}

export async function listMessagesByTicket(ticketId) {
  const collection = await getCollection()
  const oid = toOid(ticketId)
  if (!oid) return []
  const docs = await collection
    .find({ ticketId: oid })
    .sort({ createdAt: 1, _id: 1 })
    .toArray()
  return docs.map(toMessage)
}

export async function listLastMessageByTickets(ticketIds) {
  const collection = await getCollection()
  const objectIds = (ticketIds ?? []).map(toOid).filter(Boolean)
  if (objectIds.length === 0) return []
  const docs = await collection
    .find({ ticketId: { $in: objectIds } })
    .sort({ createdAt: -1, _id: -1 })
    .toArray()

  const latestByTicket = new Map()
  for (const doc of docs) {
    const key = String(doc.ticketId)
    if (!latestByTicket.has(key)) {
      latestByTicket.set(key, doc)
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
  const collection = await getCollection()
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

  const docs = await collection.aggregate(pipeline).toArray()
  return docs.map((doc) => doc._id)
}

export async function deleteMessagesByTickets(ticketIds) {
  const collection = await getCollection()
  const objectIds = (ticketIds ?? []).map(toOid).filter(Boolean)
  if (objectIds.length === 0) return 0
  const result = await collection.deleteMany({ ticketId: { $in: objectIds } })
  return result.deletedCount ?? 0
}