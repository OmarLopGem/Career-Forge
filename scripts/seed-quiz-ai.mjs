import { loadProjectEnv } from '../lib/server/load-env-file.mjs'
import { getMongooseConnection } from '../lib/db/mongoose.js'
import { getQuizQuestionModel } from '../lib/db/models/quiz-question.js'
import { generateQuizQuestionDrafts } from '../lib/server/quiz/quiz-ai.service.js'
import {
  DEFAULT_AI_SEED_TARGET_PER_ROLE,
  DEFAULT_AI_SEED_TOTAL,
  DEFAULT_AI_BANK_LIMIT_PER_ROLE,
  JOB_ROLES,
} from '../lib/quiz/job-role-catalog.js'

loadProjectEnv()

function boundedInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(maximum, Math.max(minimum, parsed))
}

const targetPerRole = boundedInteger(
  process.env.QUIZ_AI_TARGET_PER_ROLE,
  DEFAULT_AI_SEED_TARGET_PER_ROLE,
  10,
  DEFAULT_AI_BANK_LIMIT_PER_ROLE,
)
const batchDelayMs = boundedInteger(process.env.QUIZ_AI_BATCH_DELAY_MS, 750, 0, 5000)
const batchRetries = boundedInteger(process.env.QUIZ_AI_BATCH_RETRIES, 5, 1, 10)
const retryDelayMs = boundedInteger(process.env.QUIZ_AI_RETRY_DELAY_MS, 5000, 1000, 30000)
const requestedRole = String(process.env.QUIZ_AI_ROLE ?? '').trim()
const selectedRoles = requestedRole ? [requestedRole] : JOB_ROLES

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function upsertGeneratedQuestions(Model, questions) {
  if (questions.length === 0) return
  const now = new Date().toISOString()
  await Model.bulkWrite(
    questions.map((question) => ({
      updateOne: {
        filter: { jobType: question.jobType, question: question.question },
        update: {
          $set: { updatedAt: now },
          $setOnInsert: {
            ...question,
            source: 'ai',
            createdAt: now,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  )
}

async function generateBatchWithRetry(input, jobType) {
  let lastError

  for (let attempt = 1; attempt <= batchRetries; attempt += 1) {
    try {
      return await generateQuizQuestionDrafts(input)
    } catch (error) {
      lastError = error
      if (attempt >= batchRetries) break

      const waitMs = Math.min(retryDelayMs * attempt, 30000)
      console.warn(
        `${jobType}: AI batch failed (${attempt}/${batchRetries}). `
        + `Retrying in ${Math.ceil(waitMs / 1000)} second(s)...`,
      )
      await wait(waitMs)
    }
  }

  throw lastError
}

async function seedRole(Model, jobType) {
  let currentCount = await Model.countDocuments({
    jobType,
    difficulty: 'Beginner',
    type: { $in: ['mcq', 'blank'] },
  })
  let stalledAttempts = 0

  while (currentCount < targetPerRole) {
    const missing = targetPerRole - currentCount
    const existing = await Model.find({ jobType, difficulty: 'Beginner' })
      .sort({ createdAt: -1, _id: -1 })
      .limit(40)
      .select({ question: 1, _id: 0 })
      .lean()
    const generated = await generateBatchWithRetry({
      jobType,
      topic: 'Foundational role knowledge, duties, safety, customer service, tools, and common workplace scenarios',
      difficulty: 'Beginner',
      type: 'mixed',
      count: Math.min(10, missing),
      avoidQuestions: existing.map(({ question }) => question),
    }, jobType)

    await upsertGeneratedQuestions(Model, generated.drafts)
    const nextCount = await Model.countDocuments({
      jobType,
      difficulty: 'Beginner',
      type: { $in: ['mcq', 'blank'] },
    })

    if (nextCount <= currentCount) {
      stalledAttempts += 1
      if (stalledAttempts >= 3) {
        throw new Error(`AI generation stalled for ${jobType} after three duplicate-only batches.`)
      }
    } else {
      stalledAttempts = 0
      currentCount = nextCount
      console.log(`${jobType}: ${currentCount}/${targetPerRole} Beginner questions`)
    }

    if (currentCount < targetPerRole && batchDelayMs > 0) {
      await wait(batchDelayMs)
    }
  }
}

async function main() {
  if (!process.env.MINIMAX_API_KEY || process.env.MINIMAX_API_KEY.toLowerCase() === 'sample') {
    throw new Error('A valid MINIMAX_API_KEY is required for AI quiz seeding.')
  }
  if (requestedRole && !JOB_ROLES.includes(requestedRole)) {
    throw new Error(`QUIZ_AI_ROLE must match a role from the application catalog: ${requestedRole}`)
  }

  const connection = await getMongooseConnection()
  try {
    const QuizQuestion = await getQuizQuestionModel()
    await QuizQuestion.createIndexes()
    console.log(
      `Seeding ${selectedRoles.length} role(s) to ${targetPerRole} Beginner questions each. `
      + `The default full catalog target is ${DEFAULT_AI_SEED_TOTAL} questions.`,
    )
    const failedRoles = []
    for (const role of selectedRoles) {
      try {
        await seedRole(QuizQuestion, role)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        failedRoles.push({ role, message })
        console.error(`${role}: skipped after ${batchRetries} failed batch attempts. ${message}`)
      }
    }

    const total = await QuizQuestion.countDocuments({
      jobType: { $in: selectedRoles },
      difficulty: 'Beginner',
      type: { $in: ['mcq', 'blank'] },
    })
    console.log(`AI Beginner quiz seeding complete. Selected roles now contain ${total} questions.`)
    if (failedRoles.length > 0) {
      console.error(
        `${failedRoles.length} role(s) still need another run: `
        + failedRoles.map(({ role }) => role).join(', '),
      )
      process.exitCode = 1
    }
  } finally {
    await connection.close()
  }
}

main().catch((error) => {
  console.error('AI quiz seeding failed.')
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
