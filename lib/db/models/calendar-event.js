import { getModel } from './_factory.js'

let modelPromise = null

function buildSchema(Schema) {
  const schema = new Schema(
    {
      userId: { type: Schema.Types.Mixed },
      scope: { type: String },
      jobApplicationId: { type: Schema.Types.Mixed, default: null },
      title: { type: String },
      type: { type: String },
      eventDate: { type: String },
      startTime: { type: String, default: '' },
      endTime: { type: String, default: '' },
      status: { type: String, default: 'scheduled' },
      notes: { type: String, default: '' },
      reminderEnabled: { type: Boolean, default: true },
      createdAt: { type: String },
      updatedAt: { type: String },
    },
    { collection: 'calendar_events' },
  )
  schema.index(
    { userId: 1, eventDate: 1 },
    { name: 'calendar_events_user_event_date' },
  )
  schema.index(
    { userId: 1, jobApplicationId: 1 },
    { name: 'calendar_events_user_application' },
  )
  return schema
}

export function getCalendarEventModel() {
  if (!modelPromise) {
    modelPromise = getModel('CalendarEvent', buildSchema)
  }
  return modelPromise
}