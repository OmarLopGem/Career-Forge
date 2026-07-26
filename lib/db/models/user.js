import { getModel } from './_factory.js'

let modelPromise = null

function buildSchema(Schema) {
  const schema = new Schema(
    {
      email: { type: String, required: true, unique: true },
      passwordHash: { type: String },
      firstName: { type: String },
      lastName: { type: String },
      dateOfBirth: { type: String, default: null },
      photoUrl: { type: String, default: '' },
      headline: { type: String, default: '' },
      phone: { type: String, default: '' },
      location: { type: String, default: '' },
      linkedinUrl: { type: String, default: '' },
      githubUrl: { type: String, default: '' },
      portfolioUrl: { type: String, default: '' },
      role: { type: String, default: 'user' },
      status: { type: String, default: 'active' },
      deletedAt: { type: String, default: null },
      createdAt: { type: String },
      updatedAt: { type: String },
    },
    { collection: 'users' },
  )
  schema.index({ status: 1 }, { name: 'users_status' })
  return schema
}

export function getUserModel() {
  if (!modelPromise) {
    modelPromise = getModel('User', buildSchema)
  }
  return modelPromise
}