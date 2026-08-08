import { getQuizQuestionModel } from '../../db/models/quiz-question.js'
import { stringifyId } from '../object-id.js'
export const QUIZ_DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced']

export function getQuizDifficulty(question) {
  const suppliedDifficulty = String(question?.difficulty ?? '').trim()
  if (QUIZ_DIFFICULTIES.includes(suppliedDifficulty)) {
    return suppliedDifficulty
  }

  if (question?.type === 'short') return 'Advanced'
  if (question?.type === 'blank') return 'Intermediate'
  return 'Beginner'
}

function toQuizQuestion(doc) {
  if (!doc) return null
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc
  return stringifyId(obj)
}

async function getModel() {
  return getQuizQuestionModel()
}

export async function listQuizQuestions(jobType) {
  const Model = await getModel()
  const filter = jobType ? { jobType } : {}
  const docs = await Model.find(filter).sort({ jobType: 1, _id: 1 })
  return docs.map(toQuizQuestion)
}

export async function listQuizQuestionsByIds(questionIds) {
  if (!Array.isArray(questionIds) || questionIds.length === 0) return []
  const Model = await getModel()
  const docs = await Model.find({ _id: { $in: questionIds } })
  const byId = new Map(docs.map((doc) => [String(doc._id), toQuizQuestion(doc)]))
  return questionIds.map(String).map((id) => byId.get(id)).filter(Boolean)
}

export async function saveGeneratedQuizQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) return []
  const Model = await getModel()
  const now = new Date().toISOString()

  await Model.bulkWrite(
    questions.map((question) => ({
      updateOne: {
        filter: { jobType: question.jobType, question: question.question },
        update: {
          $set: { updatedAt: now },
          $setOnInsert: {
            jobType: question.jobType,
            type: question.type,
            difficulty: getQuizDifficulty(question),
            source: 'ai',
            question: question.question,
            options: question.options,
            answer: question.answer,
            marks: question.marks,
            createdAt: now,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  )

  const docs = await Model.find({
    $or: questions.map(({ jobType, question }) => ({ jobType, question })),
  })
  const byKey = new Map(
    docs.map((doc) => [`${doc.jobType}\u0000${doc.question}`, toQuizQuestion(doc)]),
  )
  return questions
    .map(({ jobType, question }) => byKey.get(`${jobType}\u0000${question}`))
    .filter(Boolean)
}

export async function createQuizQuestion(question) {
  const Model = await getModel()
  const now = new Date().toISOString()
  try {
    const doc = await Model.create({
      jobType: question.jobType,
      type: question.type,
      difficulty: getQuizDifficulty(question),
      source: question.source ?? 'manual',
      question: question.question,
      options: question.options,
      answer: question.answer,
      marks: question.marks,
      createdAt: now,
      updatedAt: now,
    })
    return toQuizQuestion(doc)
  } catch (err) {
    if (err?.code === 11000) {
      const { AppServiceError } = await import('@/lib/server/api-error.js')
      throw new AppServiceError(
        'A question with this wording already exists for that job type.',
        'DUPLICATE_QUIZ_QUESTION',
        409,
      )
    }
    throw err
  }
}
