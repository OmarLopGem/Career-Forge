import { getModel } from './_factory.js'

let modelPromise = null

function buildSchema(Schema) {
  const schema = new Schema(
    {
      ticketId: { type: Schema.Types.ObjectId },
      authorId: { type: Schema.Types.Mixed },
      authorRole: { type: String },
      body: { type: String },
      createdAt: { type: String },
    },
    { collection: 'support_messages' },
  )
  schema.index(
    { ticketId: 1, createdAt: 1 },
    { name: 'support_messages_ticket_created' },
  )
  return schema
}

export function getSupportMessageModel() {
  if (!modelPromise) {
    modelPromise = getModel('SupportMessage', buildSchema)
  }
  return modelPromise
}