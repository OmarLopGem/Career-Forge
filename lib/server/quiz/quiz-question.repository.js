import { getQuizQuestionModel } from '@/lib/db/models/quiz-question.js'
import { stringifyId } from '@/lib/server/object-id.js'
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
