import { getQuizResultModel } from '@/lib/db/models/quiz-result.js'
import { stringifyId } from '@/lib/server/object-id.js'

function toQuizResult(doc) {
  if (!doc) return null
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc
  return stringifyId(obj)
}

async function getModel() {
  return getQuizResultModel()
}

export async function createQuizResult(data) {
  const Model = await getModel()
  const now = new Date().toISOString()
  const docData = {
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
    docData.totalMarks = data.totalMarks
  }
  if (Number.isFinite(data.percentage)) {
    docData.percentage = data.percentage
  }

  const doc = await Model.create(docData)
  return toQuizResult(doc)
}

export async function listQuizResultsByUser(userId) {
  const Model = await getModel()
  const docs = await Model.find({ userId }).sort({ completedAt: -1, createdAt: -1 })
  return docs.map(toQuizResult)
}

export async function getBestPercentageByJobType(userId) {
  const Model = await getModel()
  const pipeline = [
    { $match: { userId, percentage: { $type: 'number' } } },
    { $sort: { percentage: -1, completedAt: -1, createdAt: -1 } },
    {
      $group: {
        _id: '$jobType',
        bestPercentage: { $first: '$percentage' },
        bestScore: { $first: '$score' },
        totalMarks: { $first: '$totalMarks' },
        correctCount: { $first: '$correctCount' },
        totalQuestions: { $first: '$totalQuestions' },
        lastAchievedAt: { $first: '$completedAt' },
        attempts: { $sum: 1 },
      },
    },
    { $sort: { bestPercentage: -1, lastAchievedAt: -1 } },
  ]

  const docs = await Model.aggregate(pipeline)
  return docs.map((doc) => ({
    jobType: doc._id,
    bestPercentage: doc.bestPercentage,
    bestScore: doc.bestScore ?? null,
    totalMarks: doc.totalMarks ?? null,
    correctCount: doc.correctCount ?? null,
    totalQuestions: doc.totalQuestions ?? null,
    lastAchievedAt: doc.lastAchievedAt ?? null,
    attempts: doc.attempts,
  }))
}
