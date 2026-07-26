import { getModel } from './_factory.js'

let modelPromise = null

function buildSchema(Schema) {
  const schema = new Schema(
    {
      createdByUserId: { type: Schema.Types.Mixed },
      audience: { type: String, default: 'all' },
      targetUserId: { type: String, default: null },
      title: { type: String },
      message: { type: String },
      level: { type: String, default: 'info' },
      startsAt: { type: String },
      expiresAt: { type: String, default: null },
      isPublished: { type: Boolean, default: true },
      link: { type: String, default: null },
      createdAt: { type: String },
      updatedAt: { type: String },
    },
    { collection: 'notifications' },
  )
  schema.index(
    { audience: 1, isPublished: 1, startsAt: -1 },
    { name: 'notifications_audience_published_starts' },
  )
  schema.index(
    { audience: 1, targetUserId: 1, isPublished: 1, startsAt: -1 },
    { name: 'notifications_audience_target_published_starts' },
  )
  schema.index(
    { createdByUserId: 1, createdAt: -1 },
    { name: 'notifications_creator_created' },
  )
  return schema
}

export function getNotificationModel() {
  if (!modelPromise) {
    modelPromise = getModel('Notification', buildSchema)
  }
  return modelPromise
}