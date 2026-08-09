import { AppServiceError } from '@/lib/server/api-error.js'
import { requireAdminUser } from '@/lib/server/auth/current-user.js'
import {
  createQuizQuestion,
  listQuizQuestions,
  QUIZ_DIFFICULTIES,
} from './quiz-question.repository.js'
import {
  createQuizResult,
  listQuizResultsByUserAndJobType,
} from '@/lib/server/progress/quiz-result.repository.js'
import { requireCurrentUser } from '@/lib/server/auth/current-user.js'

const ALLOWED_QUESTION_TYPES = ['mcq', 'blank']
const USER_QUESTION_TYPES = new Set(ALLOWED_QUESTION_TYPES)
const QUESTIONS_PER_QUIZ = 10
const MAX_JOB_TYPE_LENGTH = 100
const MAX_QUESTION_LENGTH = 1000
const MAX_ANSWER_LENGTH = 500

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
  const marks = Number(input.marks ?? 0.5)
  const options = normalizeOptions(input.options)
  const source = input.source === 'ai' ? 'ai' : 'manual'

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

function rotateQuestions(questions, offset) {
  if (questions.length === 0) return []
  const normalizedOffset = offset % questions.length
  return [...questions.slice(normalizedOffset), ...questions.slice(0, normalizedOffset)]
}

export function getCurrentQuizDifficulty(results) {
  const passedDifficulties = new Set(
    results
      .filter((result) => result.passed)
      .map((result) => (
        QUIZ_DIFFICULTIES.includes(normalizeText(result.difficulty))
          ? result.difficulty
          : 'Beginner'
      )),
  )

  if (passedDifficulties.has('Advanced') || passedDifficulties.has('Intermediate')) {
    return 'Advanced'
  }
  if (passedDifficulties.has('Beginner')) {
    return 'Intermediate'
  }
  return 'Beginner'
}

function getNextQuizDifficulty(difficulty) {
  const currentIndex = QUIZ_DIFFICULTIES.indexOf(difficulty)
  return QUIZ_DIFFICULTIES[Math.min(currentIndex + 1, QUIZ_DIFFICULTIES.length - 1)]
}

function selectQuestionsForDifficulty(questions, difficulty) {
  const eligibleQuestions = questions.filter((question) => USER_QUESTION_TYPES.has(question.type))
  const exactMatches = eligibleQuestions.filter(
    (question) => normalizeText(question.difficulty) === difficulty,
  )
  const flexibleQuestions = eligibleQuestions.filter(
    (question) => !QUIZ_DIFFICULTIES.includes(normalizeText(question.difficulty)),
  )
  const levelIndex = QUIZ_DIFFICULTIES.indexOf(difficulty)
  const flexibleOffset = Math.floor((levelIndex * flexibleQuestions.length) / QUIZ_DIFFICULTIES.length)
  const remainingOffset = Math.floor((levelIndex * eligibleQuestions.length) / QUIZ_DIFFICULTIES.length)
  const candidates = [
    ...exactMatches,
    ...rotateQuestions(flexibleQuestions, flexibleOffset),
    ...rotateQuestions(eligibleQuestions, remainingOffset),
  ]
  const selectedIds = new Set()

  return candidates
    .filter((question) => {
      if (selectedIds.has(question._id)) return false
      selectedIds.add(question._id)
      return true
    })
    .slice(0, QUESTIONS_PER_QUIZ)
    .map((question) => ({ ...question, difficulty }))
}

function ensureCompleteQuiz(questions, difficulty) {
  if (questions.length < QUESTIONS_PER_QUIZ) {
    throw new AppServiceError(
      `At least ${QUESTIONS_PER_QUIZ} multiple-choice or fill-in-the-blank questions are required for the ${difficulty.toLowerCase()} level.`,
      'QUIZ_NOT_ENOUGH_QUESTIONS',
      409,
    )
  }
}

export async function serviceListQuizQuestions(jobType) {
  const user = await requireCurrentUser()
  const normalizedJobType = normalizeText(jobType)
  if (!normalizedJobType) {
    throw new AppServiceError('Job type is required.', 'INVALID_JOB_TYPE', 400)
  }

  const [allQuestions, results] = await Promise.all([
    listQuizQuestions(normalizedJobType),
    listQuizResultsByUserAndJobType(user._id, normalizedJobType),
  ])
  const difficulty = getCurrentQuizDifficulty(results)
  const questions = selectQuestionsForDifficulty(allQuestions, difficulty)
  ensureCompleteQuiz(questions, difficulty)

  return {
    questions: questions.map(({ answer: _answer, ...question }) => question),
    count: questions.length,
    difficulty,
  }
}

export async function serviceListAdminQuizQuestions() {
  await requireAdminUser()
  const questions = await listQuizQuestions()
  return { questions, count: questions.length }
}

export async function serviceCreateAdminQuizQuestion(input) {
  await requireAdminUser()
  const question = await createQuizQuestion(validateQuizQuestionInput(input))
  return { question }
}

function normalizeAnswer(value) {
  return normalizeText(value).toLowerCase()
}

function isAnswerCorrect(question, answer) {
  const expected = normalizeAnswer(question.answer)
  const received = normalizeAnswer(answer)
  if (!received) return false
  return question.type === 'short' ? received.includes(expected) : received === expected
}

function buildFeedback(percentage, jobType) {
  if (percentage < 50) {
    return `Keep practicing for the ${jobType} role. Review the foundations and try again.`
  }
  if (percentage < 70) {
    return `You are close to passing for the ${jobType} role. Review the questions you missed, then retry.`
  }
  return `Strong work for the ${jobType} role. You demonstrated solid interview readiness.`
}

function normalizeSubmittedAnswers(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value
}

export async function serviceSubmitQuiz(input) {
  const user = await requireCurrentUser()
  const jobType = normalizeText(input.jobType)
  if (!jobType) {
    throw new AppServiceError('Job type is required.', 'INVALID_JOB_TYPE', 400)
  }

  const [allQuestions, results] = await Promise.all([
    listQuizQuestions(jobType),
    listQuizResultsByUserAndJobType(user._id, jobType),
  ])
  const difficulty = getCurrentQuizDifficulty(results)
  const submittedDifficulty = normalizeText(input.difficulty)
  if (submittedDifficulty && submittedDifficulty !== difficulty) {
    throw new AppServiceError(
      'Your quiz level changed. Reload the quiz before submitting.',
      'QUIZ_LEVEL_CHANGED',
      409,
    )
  }

  const questions = selectQuestionsForDifficulty(allQuestions, difficulty)
  ensureCompleteQuiz(questions, difficulty)

  const answers = normalizeSubmittedAnswers(input.answers)
  const questionResults = questions.map((question) => {
    const correct = isAnswerCorrect(question, answers[question._id])
    return {
      questionId: question._id,
      correct,
      correctAnswer: question.answer,
    }
  })
  const correctQuestions = questions.filter((question) =>
    questionResults.find((result) => result.questionId === question._id)?.correct,
  )
  const totalMarks = questions.reduce((sum, question) => sum + Number(question.marks ?? 0), 0)
  const score = correctQuestions.reduce((sum, question) => sum + Number(question.marks ?? 0), 0)
  const roundedTotalMarks = Number(totalMarks.toFixed(2))
  const roundedScore = Number(score.toFixed(2))
  const percentage = totalMarks > 0 ? Number(((score / totalMarks) * 100).toFixed(2)) : 0
  const passed = percentage >= 70
  const feedback = buildFeedback(percentage, jobType)

  const result = await createQuizResult({
    userId: user._id,
    jobType,
    difficulty,
    totalQuestions: questions.length,
    correctCount: correctQuestions.length,
    score: roundedScore,
    totalMarks: roundedTotalMarks,
    percentage,
    passed,
    feedback,
  })

  return {
    result,
    correctCount: correctQuestions.length,
    totalQuestions: questions.length,
    score: roundedScore,
    totalMarks: roundedTotalMarks,
    percentage,
    passed,
    difficulty,
    nextDifficulty: passed ? getNextQuizDifficulty(difficulty) : difficulty,
    feedback,
    questionResults,
  }
}
