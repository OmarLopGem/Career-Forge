import { ObjectId } from 'mongodb'
import { getDb } from '@/lib/cv-assistant/server/mongo.js'
import { stringifyId } from '@/lib/server/object-id.js'

export const QUIZ_RESULTS_COLLECTION = 'quiz_results'

async function getCollection() {
  const db = await getDb()
  const collection = db.collection(QUIZ_RESULTS_COLLECTION)

  await collection.createIndexes([
    { key: { userId: 1, completedAt: -1 }, name: 'quiz_results_user_completed' },
    { key: { userId: 1, jobType: 1, completedAt: -1 }, name: 'quiz_results_user_job_type_completed' },
  ])

  return collection
}

function toQuizResult(doc) {
  return stringifyId(doc)
}

export async function createQuizResult(data) {
  const collection = await getCollection()
  const now = new Date().toISOString()
  const result = {
    _id: new ObjectId(),
    userId: data.userId,
    jobType: data.jobType,
    score: data.score,
    correctCount: data.correctCount,
    totalQuestions: data.totalQuestions,
    passed: data.passed,
    feedback: data.feedback ?? '',
    completedAt: data.completedAt ?? now,
    createdAt: now,
  }

  if (Number.isFinite(data.totalMarks)) {
    result.totalMarks = data.totalMarks
  }
  if (Number.isFinite(data.percentage)) {
    result.percentage = data.percentage
  }

  await collection.insertOne(result)
  return toQuizResult(result)
}

export async function listQuizResultsByUser(userId) {
  const collection = await getCollection()
  const docs = await collection.find({ userId }).sort({ completedAt: -1, createdAt: -1 }).toArray()
  return docs.map(toQuizResult)
}
