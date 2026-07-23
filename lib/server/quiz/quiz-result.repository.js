import { ObjectId } from 'mongodb'
import { getDb } from '@/lib/cv-assistant/server/mongo.js'
import { stringifyId } from '@/lib/server/object-id.js'

export const QUIZ_RESULTS_COLLECTION = 'quiz_results'

async function getCollection() {
  const db = await getDb()
  const collection = db.collection(QUIZ_RESULTS_COLLECTION)

  await collection.createIndexes([
    { key: { userId: 1, completedAt: -1 }, name: 'quiz_results_user_completed' },
    { key: { userId: 1, jobType: 1, completedAt: -1 }, name: 'quiz_results_user_job_completed' },
  ])

  return collection
}

export async function createQuizResult(result) {
  const collection = await getCollection()
  const now = new Date().toISOString()
  const quizResult = {
    _id: new ObjectId(),
    userId: result.userId,
    jobType: result.jobType,
    totalQuestions: result.totalQuestions,
    correctCount: result.correctCount,
    score: result.score,
    totalMarks: result.totalMarks,
    percentage: result.percentage,
    passed: result.passed,
    completedAt: now,
  }

  await collection.insertOne(quizResult)
  return stringifyId(quizResult)
}

export async function listQuizResultsByUser(userId) {
  const collection = await getCollection()
  const docs = await collection.find({ userId }).sort({ completedAt: -1 }).toArray()
  return docs.map(stringifyId)
}
