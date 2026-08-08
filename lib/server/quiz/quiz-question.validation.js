import { AppServiceError } from '../api-error.js'
import { QUIZ_DIFFICULTIES } from './quiz-question.repository.js'

export const ALLOWED_QUESTION_TYPES = ['mcq', 'blank']
export const MAX_JOB_TYPE_LENGTH = 100
export const MAX_QUESTION_LENGTH = 1000
export const MAX_ANSWER_LENGTH = 500

function normalizeText(value) {
  return String(value ?? '').trim()
}

function normalizeOptions(value) {
  const values = Array.isArray(value)
    ? value
    : String(value ?? '').split(/[\n,]/)

  return [...new Set(values.map(normalizeText).filter(Boolean))]
}

export function validateQuizQuestionInput(input) {
  const jobType = normalizeText(input.jobType)
  const question = normalizeText(input.question)
  const answer = normalizeText(input.answer)
  const type = normalizeText(input.type).toLowerCase()
  const difficulty = normalizeText(input.difficulty)
  const marks = Number(input.marks ?? 1)
  const options = normalizeOptions(input.options)
  const source = input.source === 'ai' ? 'ai' : input.source === 'seed' ? 'seed' : 'manual'

  if (!jobType || jobType.length > MAX_JOB_TYPE_LENGTH) {
    throw new AppServiceError('Job type is required and must be under 100 characters.', 'INVALID_JOB_TYPE', 400)
  }
  if (!question || question.length > MAX_QUESTION_LENGTH) {
    throw new AppServiceError('Question text is required and must be under 1,000 characters.', 'INVALID_QUESTION', 400)
  }
  if (!answer || answer.length > MAX_ANSWER_LENGTH) {
    throw new AppServiceError('Answer text is required and must be under 500 characters.', 'INVALID_ANSWER', 400)
  }
  if (!ALLOWED_QUESTION_TYPES.includes(type)) {
    throw new AppServiceError('Choose a valid question type.', 'INVALID_QUESTION_TYPE', 400)
  }
  if (!QUIZ_DIFFICULTIES.includes(difficulty)) {
    throw new AppServiceError('Choose a valid difficulty level.', 'INVALID_DIFFICULTY', 400)
  }
  if (!Number.isFinite(marks) || marks <= 0 || marks > 10) {
    throw new AppServiceError('Marks must be a number between 0 and 10.', 'INVALID_MARKS', 400)
  }
  if (type === 'mcq') {
    if (options.length < 2 || options.length > 6) {
      throw new AppServiceError('Multiple-choice questions need between 2 and 6 options.', 'INVALID_OPTIONS', 400)
    }
    if (!options.some((option) => option.toLowerCase() === answer.toLowerCase())) {
      throw new AppServiceError('The correct answer must match one of the options.', 'ANSWER_NOT_IN_OPTIONS', 400)
    }
  }

  return {
    jobType,
    question,
    answer,
    type,
    difficulty,
    marks,
    source,
    options: type === 'mcq' ? options : [],
  }
}
