import { getModel } from './_factory.js'

let modelPromise = null

function buildSchema(Schema) {
  const schema = new Schema(
    {
      userId: { type: Schema.Types.Mixed },
      jobListingId: { type: Schema.Types.Mixed, default: null },
      jobSnapshot: { type: Schema.Types.Mixed },
      cvProfileId: { type: Schema.Types.Mixed },
      cvProfileSnapshot: { type: Schema.Types.Mixed },
      status: { type: String },
      previousStatus: { type: String, default: null },
      appliedAt: { type: String, default: null },
      lastActivityAt: { type: String },
      promisedResponseDate: { type: String, default: null },
      notes: { type: String, default: '' },
      adaptedDescription: { type: String, default: '' },
      isArchived: { type: Boolean, default: false },
      archivedAt: { type: String, default: null },
      archivedReason: { type: String, default: null },
      deletedAt: { type: String, default: null },
      createdAt: { type: String },
      updatedAt: { type: String },
    },
    { collection: 'job_applications' },
  )
  schema.index(
    { userId: 1, deletedAt: 1, isArchived: 1, updatedAt: -1 },
    { name: 'job_applications_user_state_updated' },
  )
  schema.index(
    { userId: 1, jobListingId: 1 },
    { name: 'job_applications_user_listing' },
  )
  schema.index(
    { userId: 1, cvProfileId: 1 },
    { name: 'job_applications_user_cv_profile' },
  )
  return schema
}

export function getJobApplicationModel() {
  if (!modelPromise) {
    modelPromise = getModel('JobApplication', buildSchema)
  }
  return modelPromise
}