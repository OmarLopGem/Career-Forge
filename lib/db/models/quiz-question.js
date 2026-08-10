import { getModel } from './_factory.js'

let modelPromise = null

function buildSchema(Schema) {
  const schema = new Schema(
    {
      jobType: { type: String },
      type: { type: String },
      difficulty: { type: String },
      source: { type: String, default: 'manual' },
      question: { type: String },
      options: { type: Schema.Types.Mixed },
      answer: { type: Schema.Types.Mixed },
      marks: { type: Number },
      createdAt: { type: String },
      updatedAt: { type: String },
    },
    { collection: 'quiz_questions' },
  )
  schema.index({ jobType: 1 }, { name: 'quiz_questions_job_type' })
  schema.index(
    { createdAt: -1, _id: -1 },
    { name: 'quiz_questions_newest' },
  )
  schema.index(
    { jobType: 1, question: 1 },
    { unique: true, name: 'quiz_questions_job_type_question' },
  )
  return schema
}

export function getQuizQuestionModel() {
  if (!modelPromise) {
    modelPromise = getModel('QuizQuestion', buildSchema)
  }
  return modelPromise
}
