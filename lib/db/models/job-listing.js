import { getModel } from './_factory.js'

let modelPromise = null

function buildSchema(Schema) {
  const schema = new Schema(
    {
      source: { type: String },
      externalId: { type: String, default: null },
      title: { type: String },
      company: { type: String },
      location: { type: String },
      description: { type: String },
      salaryMin: { type: Number, default: null },
      salaryMax: { type: Number, default: null },
      url: { type: String, default: null },
      requiredSkills: { type: [String], default: [] },
      category: { type: String },
      employmentType: { type: String, default: null },
      postedAt: { type: String, default: null },
      isActive: { type: Boolean, default: true },
      createdAt: { type: String },
      updatedAt: { type: String },
    },
    { collection: 'job_listings' },
  )
  schema.index(
    { isActive: 1, updatedAt: -1 },
    { name: 'job_listings_active_updated' },
  )
  schema.index(
    { category: 1, isActive: 1 },
    { name: 'job_listings_category_active' },
  )
  schema.index({ requiredSkills: 1 }, { name: 'job_listings_required_skills' })
  schema.index(
    { source: 1, externalId: 1 },
    { unique: true, sparse: true, name: 'job_listings_source_external_id' },
  )
  return schema
}

export function getJobListingModel() {
  if (!modelPromise) {
    modelPromise = getModel('JobListing', buildSchema)
  }
  return modelPromise
}