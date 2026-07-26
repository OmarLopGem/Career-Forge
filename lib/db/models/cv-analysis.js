import { getModel } from './_factory.js'

let modelPromise = null

function buildSchema(Schema) {
  const schema = new Schema(
    {
      userId: { type: Schema.Types.Mixed },
      profileId: { type: Schema.Types.Mixed },
      atsFeedback: { type: Schema.Types.Mixed },
      overallScore: { type: Number },
      suggestions: { type: Schema.Types.Mixed },
      strengths: { type: Schema.Types.Mixed },
      weaknesses: { type: Schema.Types.Mixed },
      createdAt: { type: String },
    },
    { collection: 'cv_analyses' },
  )
  schema.index(
    { userId: 1, profileId: 1, createdAt: -1 },
    { name: 'cv_analysis_user_profile_created' },
  )
  return schema
}

export function getCvAnalysisModel() {
  if (!modelPromise) {
    modelPromise = getModel('CvAnalysis', buildSchema)
  }
  return modelPromise
}