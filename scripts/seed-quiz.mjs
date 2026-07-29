import { loadProjectEnv } from '../lib/server/load-env-file.mjs'
import { getMongooseConnection } from '../lib/db/mongoose.js'
import { getQuizQuestionModel } from '../lib/db/models/quiz-question.js'
import { quizData } from '../app/quiz/seedQuestions.js'
import { getQuizDifficulty } from '../lib/server/quiz/quiz-question.repository.js'

loadProjectEnv()

function flattenQuizQuestions() {
  const questions = []

  Object.entries(quizData).forEach(([jobType, entries]) => {
    entries.forEach((entry) => {
      questions.push({
        jobType,
        type: entry.type,
        difficulty: getQuizDifficulty(entry),
        question: entry.question,
        options: entry.options ?? [],
        answer: entry.answer,
        marks: 0.5,
      })
    })
  })

  return questions
}

async function seedQuizQuestions() {
  let connection = null

  try {
    connection = await getMongooseConnection()
    const QuizQuestion = await getQuizQuestionModel()
    const now = new Date().toISOString()
    const questions = flattenQuizQuestions()

    await QuizQuestion.createIndexes()

    await QuizQuestion.deleteMany({})

    if (questions.length) {
      await QuizQuestion.insertMany(
        questions.map((question) => ({
          ...question,
          createdAt: now,
          updatedAt: now,
        })),
      )
    }

    console.log(`Seeded ${questions.length} quiz questions into ${connection.name}.`)
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
