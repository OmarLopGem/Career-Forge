import { ObjectId } from 'mongodb'
import { getDb } from '@/lib/cv-assistant/server/mongo.js'
import { stringifyId } from '@/lib/server/object-id.js'

export const QUIZ_QUESTIONS_COLLECTION = 'quiz_questions'
export const QUIZ_DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced']

export function getQuizDifficulty(question) {
  const suppliedDifficulty = String(question?.difficulty ?? '').trim()
  if (QUIZ_DIFFICULTIES.includes(suppliedDifficulty)) {
    return suppliedDifficulty
  }

  // Older seeded questions did not store a difficulty. Their question type
  // preserves the intended progression without requiring a data migration.
  if (question?.type === 'short') return 'Advanced'
  if (question?.type === 'blank') return 'Intermediate'
  return 'Beginner'
}

async function getCollection() {
  const db = await getDb()
  const collection = db.collection(QUIZ_QUESTIONS_COLLECTION)

  await collection.createIndexes([
    { key: { jobType: 1 }, name: 'quiz_questions_job_type' },
    { key: { jobType: 1, question: 1 }, unique: true, name: 'quiz_questions_job_type_question' },
  ])

  return collection
}

function toQuizQuestion(doc) {
  return stringifyId(doc)
}

export async function listQuizQuestions(jobType) {
  const collection = await getCollection()
  const filter = jobType ? { jobType } : {}
  const docs = await collection.find(filter).sort({ jobType: 1, _id: 1 }).toArray()
  return docs.map(toQuizQuestion)
}

export async function createQuizQuestion(question) {
  const collection = await getCollection()
  const now = new Date().toISOString()
  const quizQuestion = {
    _id: new ObjectId(),
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
  }

  try {
    await collection.insertOne(quizQuestion)
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

  return toQuizQuestion(quizQuestion)
}

export async function replaceQuizQuestions(questions) {
  const collection = await getCollection()
  const now = new Date().toISOString()

  await collection.deleteMany({})

  if (!questions.length) {
    return 0
  }

  await collection.insertMany(
    questions.map((question) => ({
      _id: new ObjectId(),
      jobType: question.jobType,
      type: question.type,
      difficulty: getQuizDifficulty(question),
      source: question.source ?? 'seed',
      question: question.question,
      options: question.options,
      answer: question.answer,
      marks: question.marks,
      createdAt: now,
      updatedAt: now,
    })),
  )

  return questions.length
}
