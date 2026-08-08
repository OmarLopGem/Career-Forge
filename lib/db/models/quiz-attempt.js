import { getModel } from './_factory.js'

let modelPromise = null

function buildSchema(Schema) {
  const schema = new Schema(
    {
      userId: { type: Schema.Types.Mixed, required: true },
      jobType: { type: String, required: true },
      difficulty: { type: String, required: true },
      questionIds: { type: [Schema.Types.Mixed], default: [] },
      status: { type: String, default: 'active' },
      generationMode: { type: String, default: 'bank' },
      createdAt: { type: String, required: true },
      updatedAt: { type: String, required: true },
      submittedAt: { type: String },
    },
    { collection: 'quiz_attempts' },
  )
  schema.index(
    { userId: 1, jobType: 1, difficulty: 1, status: 1, createdAt: -1 },
    { name: 'quiz_attempts_user_role_level_status' },
  )
  return schema
}

export function getQuizAttemptModel() {
  if (!modelPromise) {
    modelPromise = getModel('QuizAttempt', buildSchema)
  }
  return modelPromise
}
