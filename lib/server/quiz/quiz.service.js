import { listQuizQuestions } from './quiz-question.repository.js'

export async function serviceListQuizQuestions(jobType) {
  const questions = await listQuizQuestions(jobType ? String(jobType).trim() : '')

  return {
    questions,
    count: questions.length,
  }
}
