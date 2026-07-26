import { getModel } from './_factory.js'

let modelPromise = null

function buildSchema(Schema) {
  const schema = new Schema(
    {
      userId: { type: Schema.Types.Mixed },
      adminId: { type: Schema.Types.Mixed },
      message: { type: String },
      createdAt: { type: String },
    },
    { collection: 'user_warnings' },
  )
  schema.index({ userId: 1, createdAt: -1 }, { name: 'user_warnings_user_created' })
  schema.index({ adminId: 1, createdAt: -1 }, { name: 'user_warnings_admin_created' })
  return schema
}

export function getUserWarningModel() {
  if (!modelPromise) {
    modelPromise = getModel('UserWarning', buildSchema)
  }
  return modelPromise
}