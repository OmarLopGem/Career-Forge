import { ObjectId } from 'mongodb'
import { getDb } from '@/lib/cv-assistant/server/mongo.js'
import { stringifyId, toObjectId } from '@/lib/server/object-id.js'

export const CALENDAR_EVENTS_COLLECTION = 'calendar_events'

async function getCollection() {
  const db = await getDb()
  const collection = db.collection(CALENDAR_EVENTS_COLLECTION)

  await collection.createIndexes([
    { key: { userId: 1, eventDate: 1 }, name: 'calendar_events_user_event_date' },
    { key: { userId: 1, jobApplicationId: 1 }, name: 'calendar_events_user_application' },
  ])

  return collection
}

function toEvent(doc) {
  return stringifyId(doc)
}

export async function createCalendarEvent(data) {
  const collection = await getCollection()
  const now = new Date().toISOString()
  const calendarEvent = {
    _id: new ObjectId(),
    userId: data.userId,
    scope: data.scope,
    jobApplicationId: data.jobApplicationId ?? null,
    title: data.title,
    type: data.type,
    eventDate: data.eventDate,
    startTime: data.startTime ?? '',
    endTime: data.endTime ?? '',
    status: data.status ?? 'scheduled',
    notes: data.notes ?? '',
    reminderEnabled: data.reminderEnabled ?? true,
    createdAt: now,
    updatedAt: now,
  }

  await collection.insertOne(calendarEvent)
  return toEvent(calendarEvent)
}

export async function listCalendarEventsByUser(userId) {
  const collection = await getCollection()
  const docs = await collection
    .find({ userId })
    .sort({ eventDate: 1, startTime: 1, createdAt: 1 })
    .toArray()

  return docs.map(toEvent)
}

export async function getCalendarEventById(userId, eventId) {
  const collection = await getCollection()
  const oid = toObjectId(eventId)
  if (!oid) return null
  const doc = await collection.findOne({ _id: oid, userId })
  return doc ? toEvent(doc) : null
}

export async function updateCalendarEvent(userId, eventId, patch) {
  const collection = await getCollection()
  const oid = toObjectId(eventId)
  if (!oid) return null

  await collection.updateOne(
    { _id: oid, userId },
    {
      $set: {
        ...patch,
        updatedAt: new Date().toISOString(),
      },
    },
  )

  return getCalendarEventById(userId, eventId)
}

export async function deleteCalendarEvent(userId, eventId) {
  const collection = await getCollection()
  const oid = toObjectId(eventId)
  if (!oid) return false
  const result = await collection.deleteOne({ _id: oid, userId })
  return result.deletedCount === 1
}
