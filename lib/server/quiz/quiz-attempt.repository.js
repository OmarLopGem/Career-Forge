import { getQuizAttemptModel } from '../../db/models/quiz-attempt.js'
import { stringifyId, toObjectId } from '../object-id.js'

function toQuizAttempt(doc) {
  if (!doc) return null
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc
  return stringifyId({
    ...obj,
    questionIds: (obj.questionIds ?? []).map(String),
  })
}

async function getModel() {
  return getQuizAttemptModel()
}

export async function createQuizAttempt(data) {
  const Model = await getModel()
  const now = new Date().toISOString()
  const doc = await Model.create({
    userId: data.userId,
    jobType: data.jobType,
    difficulty: data.difficulty,
    questionIds: data.questionIds,
    status: 'active',
    generationMode: data.generationMode ?? 'bank',
    createdAt: now,
    updatedAt: now,
  })
  return toQuizAttempt(doc)
}

export async function findActiveQuizAttempt(userId, jobType, difficulty) {
  const Model = await getModel()
  const doc = await Model.findOne({
    userId,
    jobType,
    difficulty,
    status: 'active',
  }).sort({ createdAt: -1 })
  return toQuizAttempt(doc)
}

export async function getQuizAttemptForUser(attemptId, userId) {
  const objectId = toObjectId(attemptId)
  if (!objectId) return null
  const Model = await getModel()
  const doc = await Model.findOne({ _id: objectId, userId })
  return toQuizAttempt(doc)
}

export async function completeQuizAttempt(attemptId, userId) {
  const objectId = toObjectId(attemptId)
  if (!objectId) return null
  const Model = await getModel()
  const now = new Date().toISOString()
  const doc = await Model.findOneAndUpdate(
    { _id: objectId, userId, status: 'active' },
    { $set: { status: 'submitted', submittedAt: now, updatedAt: now } },
    { new: true },
  )
  return toQuizAttempt(doc)
}
