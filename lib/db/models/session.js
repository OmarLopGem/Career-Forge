import { getModel } from './_factory.js'

let modelPromise = null

function buildSchema(Schema) {
  const schema = new Schema(
    {
      userId: { type: Schema.Types.Mixed },
      token: { type: String, required: true, unique: true },
      expiresAt: { type: Date },
      createdAt: { type: String },
      updatedAt: { type: String },
    },
    { collection: 'sessions' },
  )
  schema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, name: 'sessions_expires_at_ttl' },
  )
  return schema
}

export function getSessionModel() {
  if (!modelPromise) {
    modelPromise = getModel('Session', buildSchema)
  }
  return modelPromise
}