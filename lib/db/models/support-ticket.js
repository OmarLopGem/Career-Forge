import { getModel } from './_factory.js'

let modelPromise = null

function buildSchema(Schema) {
  const schema = new Schema(
    {
      userId: { type: Schema.Types.Mixed },
      subject: { type: String },
      status: { type: String, default: 'open' },
      lastMessageAt: { type: String },
      lastMessageBy: { type: String },
      createdAt: { type: String },
      updatedAt: { type: String },
    },
    { collection: 'support_tickets' },
  )
  schema.index(
    { userId: 1, lastMessageAt: -1 },
    { name: 'support_tickets_user_lastMessage' },
  )
  schema.index(
    { status: 1, lastMessageAt: -1 },
    { name: 'support_tickets_status_lastMessage' },
  )
  return schema
}

export function getSupportTicketModel() {
  if (!modelPromise) {
    modelPromise = getModel('SupportTicket', buildSchema)
  }
  return modelPromise
}