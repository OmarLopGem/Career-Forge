import { getCalendarEventModel } from '@/lib/db/models/calendar-event.js'
import { stringifyId, toObjectId } from '@/lib/server/object-id.js'

export const CALENDAR_EVENTS_COLLECTION = 'calendar_events'

function toEvent(doc) {
  if (!doc) return null
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc
  return stringifyId(obj)
}

async function getModel() {
  return getCalendarEventModel()
}

export async function createCalendarEvent(data) {
  const Model = await getModel()
  const now = new Date().toISOString()
  const calendarEvent = await Model.create({
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
  })
  return toEvent(calendarEvent)
}

export async function listCalendarEventsByUser(userId) {
  const Model = await getModel()
  const docs = await Model.find({ userId }).sort({
    eventDate: 1,
    startTime: 1,
    createdAt: 1,
  })

  return docs.map(toEvent)
}

export async function getCalendarEventById(userId, eventId) {
  const Model = await getModel()
  const oid = toObjectId(eventId)
  if (!oid) return null
  const doc = await Model.findOne({ _id: oid, userId })
  return doc ? toEvent(doc) : null
}

export async function updateCalendarEvent(userId, eventId, patch) {
  const Model = await getModel()
  const oid = toObjectId(eventId)
  if (!oid) return null

  await Model.updateOne(
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
  const Model = await getModel()
  const oid = toObjectId(eventId)
  if (!oid) return false
  const result = await Model.deleteOne({ _id: oid, userId })
  return result.deletedCount === 1
}

export async function deleteCalendarEventsByJobApplicationId(userId, applicationId) {
  const Model = await getModel()
  const oid = toObjectId(applicationId)
  if (!oid) return 0
  const result = await Model.deleteMany({
    userId,
    jobApplicationId: String(oid),
  })
  return result.deletedCount ?? 0
}