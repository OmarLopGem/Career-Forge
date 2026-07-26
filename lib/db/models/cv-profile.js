import { getModel } from './_factory.js'

let modelPromise = null

function buildSchema(Schema) {
  const schema = new Schema(
    {
      userId: { type: Schema.Types.Mixed },
      title: { type: String },
      isDefault: { type: Boolean },
      professionalNiche: { type: Schema.Types.Mixed },
      target: { type: Schema.Types.Mixed },
      completion: { type: Schema.Types.Mixed },
      personalInfo: { type: Schema.Types.Mixed },
      summary: { type: Schema.Types.Mixed },
      workExperience: { type: Schema.Types.Mixed },
      education: { type: Schema.Types.Mixed },
      skills: { type: Schema.Types.Mixed },
      languages: { type: Schema.Types.Mixed },
      projects: { type: Schema.Types.Mixed },
      certifications: { type: Schema.Types.Mixed },
      createdAt: { type: String },
      updatedAt: { type: String },
    },
    { collection: 'cv_profiles' },
  )
  schema.index(
    { userId: 1, updatedAt: -1 },
    { name: 'cv_profiles_user_updated' },
  )
  schema.index(
    { userId: 1, isDefault: 1 },
    { name: 'cv_profiles_user_default' },
  )
  return schema
}

export function getCvProfileModel() {
  if (!modelPromise) {
    modelPromise = getModel('CvProfile', buildSchema)
  }
  return modelPromise
}