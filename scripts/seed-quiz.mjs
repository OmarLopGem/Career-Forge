import { MongoClient, ObjectId } from 'mongodb'
import { loadProjectEnv } from '../lib/server/load-env-file.mjs'
import { quizData } from '../app/quiz/seedQuestions.js'
import { getQuizDifficulty } from '../lib/server/quiz/quiz-question.repository.js'

loadProjectEnv()

const uri = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017'
const dbName = process.env.MONGODB_DB ?? 'career_forge'

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
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10,
  })

  try {
    await client.connect()
    const db = client.db(dbName)
    const collection = db.collection('quiz_questions')
    const now = new Date().toISOString()
    const questions = flattenQuizQuestions()

    await collection.createIndexes([
      { key: { jobType: 1 }, name: 'quiz_questions_job_type' },
      {
        key: { jobType: 1, question: 1 },
        unique: true,
        name: 'quiz_questions_job_type_question',
      },
    ])

    await collection.deleteMany({})

    if (questions.length) {
      await collection.insertMany(
        questions.map((question) => ({
          _id: new ObjectId(),
          ...question,
          createdAt: now,
          updatedAt: now,
        })),
      )
    }

    console.log(`Seeded ${questions.length} quiz questions into ${dbName}.`)
  } finally {
    await client.close()
  }
}

seedQuizQuestions().catch((error) => {
  console.error('Failed to seed quiz questions.')
  console.error(error)
  process.exitCode = 1
})
