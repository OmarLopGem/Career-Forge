import { getModel } from './_factory.js'

let modelPromise = null

function buildSchema(Schema) {
  const schema = new Schema(
    {
      userId: { type: Schema.Types.Mixed },
      jobType: { type: String },
      score: { type: Number },
      correctCount: { type: Number },
      totalQuestions: { type: Number },
      totalMarks: { type: Number },
      percentage: { type: Number },
      passed: { type: Boolean },
      feedback: { type: String, default: '' },
      completedAt: { type: String },
      createdAt: { type: String },
    },
    { collection: 'quiz_results' },
  )
  schema.index(
    { userId: 1, completedAt: -1 },
    { name: 'quiz_results_user_completed' },
  )
  schema.index(
    { userId: 1, jobType: 1, completedAt: -1 },
    { name: 'quiz_results_user_job_type_completed' },
  )
  return schema
}

export function getQuizResultModel() {
  if (!modelPromise) {
    modelPromise = getModel('QuizResult', buildSchema)
  }
  return modelPromise
}