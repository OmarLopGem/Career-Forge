import { ObjectId } from 'mongodb'
import { getDb } from '@/lib/cv-assistant/server/mongo.js'
import { stringifyId } from '@/lib/server/object-id.js'

export const QUIZ_QUESTIONS_COLLECTION = 'quiz_questions'

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
