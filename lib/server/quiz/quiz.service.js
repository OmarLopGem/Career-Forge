import { listQuizQuestions } from './quiz-question.repository.js'

export async function serviceListQuizQuestions(jobType) {
  // Normalizing here keeps route handlers and repositories free from request-shape noise.
  const questions = await listQuizQuestions(jobType ? String(jobType).trim() : '')

  return {
    questions,
    count: questions.length,
  }
}
