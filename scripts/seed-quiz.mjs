import { loadProjectEnv } from '../lib/server/load-env-file.mjs'
import { getMongooseConnection } from '../lib/db/mongoose.js'
import { getQuizQuestionModel } from '../lib/db/models/quiz-question.js'
import { quizData } from '../app/quiz/seedQuestions.js'
import { progressionQuizData } from '../app/quiz/progressionSeedQuestions.js'

loadProjectEnv()

const QUIZ_DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced']

function flattenQuizQuestions() {
  const questions = []

  Object.entries(quizData).forEach(([jobType, entries]) => {
    const objectiveEntries = [
      ...entries,
      ...(progressionQuizData[jobType] ?? []),
    ].filter((entry) => entry.type !== 'short')

    if (objectiveEntries.length < 30) {
      throw new Error(`${jobType} needs at least 30 objective seed questions.`)
    }

    objectiveEntries.forEach((entry, index) => {
      const levelIndex = Math.min(
        QUIZ_DIFFICULTIES.length - 1,
        Math.floor((index * QUIZ_DIFFICULTIES.length) / objectiveEntries.length),
      )
      questions.push({
        jobType,
        type: entry.type,
        difficulty: entry.difficulty ?? QUIZ_DIFFICULTIES[levelIndex],
        source: 'seed',
        question: entry.question,
        options: entry.options ?? [],
        answer: entry.answer,
        marks: 0.5,
      })
    })
  })

  return questions
}

function buildDifficultyBackfillOperations(questions, now) {
  const objectiveByJobType = new Map()

  for (const question of questions) {
    if (question.type === 'short') continue
    const jobQuestions = objectiveByJobType.get(question.jobType) ?? []
    jobQuestions.push(question)
    objectiveByJobType.set(question.jobType, jobQuestions)
  }

  return questions.map((question) => {
    let difficulty = 'Advanced'

    if (question.type !== 'short') {
      const jobQuestions = objectiveByJobType.get(question.jobType) ?? []
      const index = jobQuestions.findIndex((candidate) => String(candidate._id) === String(question._id))
      const levelIndex = Math.min(
        QUIZ_DIFFICULTIES.length - 1,
        Math.floor((index * QUIZ_DIFFICULTIES.length) / Math.max(jobQuestions.length, 1)),
      )
      difficulty = QUIZ_DIFFICULTIES[levelIndex]
    }

    return {
      updateOne: {
        filter: { _id: question._id },
        update: { $set: { difficulty, updatedAt: now } },
      },
    }
  })
}

async function seedQuizQuestions() {
  let connection = null

  try {
    connection = await getMongooseConnection()
    const QuizQuestion = await getQuizQuestionModel()
    const now = new Date().toISOString()
    const questions = flattenQuizQuestions()

    await QuizQuestion.createIndexes()

    const seedResult = await QuizQuestion.bulkWrite(
      questions.map((question) => ({
        updateOne: {
          filter: { jobType: question.jobType, question: question.question },
          update: {
            $set: {
              difficulty: question.difficulty,
              updatedAt: now,
            },
            $setOnInsert: {
              jobType: question.jobType,
              type: question.type,
              source: question.source,
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

    const unclassifiedQuestions = await QuizQuestion.find({
      difficulty: { $nin: QUIZ_DIFFICULTIES },
    }).sort({ jobType: 1, _id: 1 })
    const backfillOperations = buildDifficultyBackfillOperations(unclassifiedQuestions, now)
    if (backfillOperations.length > 0) {
      await QuizQuestion.bulkWrite(backfillOperations, { ordered: false })
    }

    const [total, difficultyCounts, objectiveCounts] = await Promise.all([
      QuizQuestion.countDocuments({}),
      QuizQuestion.aggregate([
        { $group: { _id: '$difficulty', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      QuizQuestion.aggregate([
        { $match: { type: { $in: ['mcq', 'blank'] } } },
        {
          $group: {
            _id: { jobType: '$jobType', difficulty: '$difficulty' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.jobType': 1, '_id.difficulty': 1 } },
      ]),
    ])

    const summary = Object.fromEntries(
      difficultyCounts.map((entry) => [entry._id || 'Unclassified', entry.count]),
    )
    console.log(`Quiz bank updated safely in ${connection.name}.`)
    console.log(`Inserted ${seedResult.upsertedCount} new seed questions; preserved existing questions.`)
    console.log(`Backfilled ${backfillOperations.length} question difficulties.`)
    console.log(`Total questions: ${total}. Counts: ${JSON.stringify(summary)}.`)
    for (const entry of objectiveCounts) {
      console.log(`${entry._id.jobType} | ${entry._id.difficulty}: ${entry.count} objective questions.`)
    }
  } finally {
    if (connection) {
      await connection.close()
    }
  }
}

seedQuizQuestions().catch((error) => {
  console.error('Failed to seed quiz questions.')
  console.error(error)
  process.exitCode = 1
})
