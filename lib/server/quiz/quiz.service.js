import { AppServiceError } from '@/lib/server/api-error.js'
import { requireAdminUser, requireCurrentUser } from '@/lib/server/auth/current-user.js'
import { hasProviderConfigured } from '@/lib/services/ai.js'
import { DEFAULT_AI_BANK_LIMIT_PER_ROLE } from '@/lib/quiz/job-role-catalog.js'
import {
  createQuizQuestion,
  listAdminQuizQuestionsPage,
  listQuizQuestions,
  listQuizQuestionsByIds,
  QUIZ_DIFFICULTIES,
  saveGeneratedQuizQuestions,
} from './quiz-question.repository.js'
import {
  completeQuizAttempt,
  createQuizAttempt,
  findActiveQuizAttempt,
  getQuizAttemptForUser,
} from './quiz-attempt.repository.js'
import {
  generateQuizQuestionDrafts,
  gradeBeginnerQuizAnswers,
} from './quiz-ai.service.js'
import { ALLOWED_QUESTION_TYPES, validateQuizQuestionInput } from './quiz-question.validation.js'
import {
  createQuizResult,
  listQuizResultsByUserAndJobType,
} from '@/lib/server/progress/quiz-result.repository.js'

export { validateQuizQuestionInput } from './quiz-question.validation.js'

const USER_QUESTION_TYPES = new Set(ALLOWED_QUESTION_TYPES)
const QUESTIONS_PER_QUIZ = 10
const AI_GENERATION_ATTEMPTS = 2
const ADMIN_QUESTIONS_PAGE_SIZE = 20
const ADMIN_QUESTIONS_MAX_PAGE_SIZE = 50

function normalizeText(value) {
  return String(value ?? '').trim()
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

function shuffled(items) {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const replacementIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[replacementIndex]] = [copy[replacementIndex], copy[index]]
  }
  return copy
}

function selectQuestionsForDifficulty(questions, difficulty, options = {}) {
  const eligibleQuestions = questions.filter((question) => USER_QUESTION_TYPES.has(question.type))
  const exactMatches = eligibleQuestions.filter(
    (question) => normalizeText(question.difficulty) === difficulty,
  )
  const flexibleQuestions = eligibleQuestions.filter(
    (question) => !QUIZ_DIFFICULTIES.includes(normalizeText(question.difficulty)),
  )
  const levelIndex = QUIZ_DIFFICULTIES.indexOf(difficulty)
  const flexibleOffset = Math.floor((levelIndex * flexibleQuestions.length) / QUIZ_DIFFICULTIES.length)
  const candidates = [
    ...exactMatches,
    ...rotateQuestions(flexibleQuestions, flexibleOffset),
  ]
  const orderedCandidates = options.randomize ? shuffled(candidates) : candidates
  const selectedIds = new Set()

  return orderedCandidates
    .filter((question) => {
      const id = String(question._id)
      if (selectedIds.has(id)) return false
      selectedIds.add(id)
      return true
    })
    .slice(0, QUESTIONS_PER_QUIZ)
    .map((question) => ({ ...question, difficulty }))
}

function ensureCompleteQuiz(questions, difficulty) {
  if (questions.length < QUESTIONS_PER_QUIZ) {
    throw new AppServiceError(
      `At least ${QUESTIONS_PER_QUIZ} questions are required for the ${difficulty.toLowerCase()} level. Configure AI generation or seed this role before starting the quiz.`,
      'QUIZ_NOT_ENOUGH_QUESTIONS',
      409,
    )
  }
}

function shouldGenerateBeginnerQuestions(dependencies) {
  if (dependencies.generate) return true
  if (process.env.NODE_ENV === 'test') return false
  return hasProviderConfigured()
}

function toPublicQuestions(questions) {
  return questions.map(({ answer: _answer, ...question }) => question)
}

function countQuestionsForDifficulty(questions, difficulty) {
  return questions.filter(
    (question) => USER_QUESTION_TYPES.has(question.type)
      && normalizeText(question.difficulty) === difficulty,
  ).length
}

async function generateAndSaveBeginnerQuestions(jobType, existingQuestions, targetCount, dependencies) {
  const savedById = new Map()
  const avoidedQuestions = existingQuestions.map((question) => question.question)

  for (let attempt = 0; attempt < AI_GENERATION_ATTEMPTS; attempt += 1) {
    const remaining = targetCount - savedById.size
    if (remaining <= 0) break

    const generation = await generateQuizQuestionDrafts(
      {
        jobType,
        topic: 'Foundational role knowledge and common workplace scenarios',
        difficulty: 'Beginner',
        type: 'mixed',
        count: remaining,
        avoidQuestions: [
          ...avoidedQuestions,
          ...[...savedById.values()].map((question) => question.question),
        ],
      },
      { generate: dependencies.generate },
    )
    const saved = await saveGeneratedQuizQuestions(generation.drafts)
    for (const question of saved) {
      savedById.set(String(question._id), question)
    }
  }

  return [...savedById.values()]
}

async function responseForAttempt(attempt) {
  const questions = await listQuizQuestionsByIds(attempt.questionIds)
  ensureCompleteQuiz(questions, attempt.difficulty)
  const allQuestions = await listQuizQuestions(attempt.jobType)

  return {
    attemptId: attempt._id,
    questions: toPublicQuestions(questions),
    count: questions.length,
    difficulty: attempt.difficulty,
    generationMode: attempt.generationMode,
    bankCount: countQuestionsForDifficulty(allQuestions, attempt.difficulty),
  }
}

export async function serviceListQuizQuestions(jobType, options = {}, dependencies = {}) {
  const user = await requireCurrentUser()
  const normalizedJobType = normalizeText(jobType)
  if (!normalizedJobType) {
    throw new AppServiceError('Job type is required.', 'INVALID_JOB_TYPE', 400)
  }
  if (normalizedJobType.length > 100) {
    throw new AppServiceError('Job type must be under 100 characters.', 'INVALID_JOB_TYPE', 400)
  }

  let [allQuestions, results] = await Promise.all([
    listQuizQuestions(normalizedJobType),
    listQuizResultsByUserAndJobType(user._id, normalizedJobType),
  ])
  const desiredDifficulty = getCurrentQuizDifficulty(results)
  let difficulty = desiredDifficulty

  if (
    difficulty !== 'Beginner'
    && selectQuestionsForDifficulty(allQuestions, difficulty).length < QUESTIONS_PER_QUIZ
    && selectQuestionsForDifficulty(allQuestions, 'Beginner').length >= QUESTIONS_PER_QUIZ
  ) {
    difficulty = 'Beginner'
  }

  if (!options.forceNew) {
    const activeAttempt = await findActiveQuizAttempt(user._id, normalizedJobType, difficulty)
    if (activeAttempt) {
      return responseForAttempt(activeAttempt)
    }
  }

  let generatedQuestions = []
  let aiWarning = ''
  if (difficulty === 'Beginner' && shouldGenerateBeginnerQuestions(dependencies)) {
    const storedBeginnerCount = countQuestionsForDifficulty(allQuestions, 'Beginner')
    const missingForQuiz = Math.max(0, QUESTIONS_PER_QUIZ - storedBeginnerCount)
    const availableCapacity = Math.max(
      0,
      DEFAULT_AI_BANK_LIMIT_PER_ROLE - storedBeginnerCount,
    )
    try {
      if (missingForQuiz > 0 && availableCapacity > 0) {
        generatedQuestions = await generateAndSaveBeginnerQuestions(
          normalizedJobType,
          allQuestions,
          Math.min(missingForQuiz, availableCapacity),
          dependencies,
        )
        allQuestions = await listQuizQuestions(normalizedJobType)
      }
    } catch (error) {
      aiWarning = error instanceof Error
        ? error.message
        : 'AI generation was unavailable, so stored questions were used.'
    }
  }

  const selectedQuestions = selectQuestionsForDifficulty(
    [...generatedQuestions, ...allQuestions],
    difficulty,
    { randomize: true },
  )
  ensureCompleteQuiz(selectedQuestions, difficulty)

  const attempt = await createQuizAttempt({
    userId: user._id,
    jobType: normalizedJobType,
    difficulty,
    questionIds: selectedQuestions.map((question) => question._id),
    generationMode: generatedQuestions.length > 0 ? 'ai' : 'bank',
  })

  return {
    attemptId: attempt._id,
    questions: toPublicQuestions(selectedQuestions),
    count: selectedQuestions.length,
    difficulty,
    generationMode: attempt.generationMode,
    bankCount: countQuestionsForDifficulty(allQuestions, difficulty),
    aiWarning,
  }
}

function normalizePositiveInteger(value, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return Math.min(parsed, maximum)
}

export async function serviceListAdminQuizQuestions(options = {}) {
  await requireAdminUser()
  const page = normalizePositiveInteger(options.page, 1)
  const pageSize = normalizePositiveInteger(
    options.pageSize,
    ADMIN_QUESTIONS_PAGE_SIZE,
    ADMIN_QUESTIONS_MAX_PAGE_SIZE,
  )
  const { questions, summary } = await listAdminQuizQuestionsPage({ page, pageSize })

  return {
    questions,
    count: summary.total,
    summary,
    pagination: {
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(summary.total / pageSize)),
      totalCount: summary.total,
    },
  }
}

export async function serviceCreateAdminQuizQuestion(input) {
  await requireAdminUser()
  const question = await createQuizQuestion(validateQuizQuestionInput(input))
  return { question }
}

function normalizeAnswer(value) {
  return normalizeText(value).toLowerCase().replace(/\s+/g, ' ')
}

function exactAnswerResults(questions, answers) {
  return questions.map((question) => {
    const questionId = String(question._id)
    const received = normalizeAnswer(answers[questionId])
    const expected = normalizeAnswer(question.answer)
    return {
      questionId,
      correct: Boolean(received) && received === expected,
      feedback: received ? '' : 'No answer was provided.',
    }
  })
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

async function resolveSubmissionQuestions(input, user) {
  const attemptId = normalizeText(input.attemptId)
  if (attemptId) {
    const attempt = await getQuizAttemptForUser(attemptId, user._id)
    if (!attempt || attempt.status !== 'active') {
      throw new AppServiceError(
        'This quiz attempt is no longer active. Load a new quiz and try again.',
        'QUIZ_ATTEMPT_EXPIRED',
        409,
      )
    }
    const questions = await listQuizQuestionsByIds(attempt.questionIds)
    ensureCompleteQuiz(questions, attempt.difficulty)
    return {
      attempt,
      attemptId,
      jobType: attempt.jobType,
      difficulty: attempt.difficulty,
      questions,
    }
  }

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
  return { attempt: null, attemptId: '', jobType, difficulty, questions }
}

export async function serviceSubmitQuiz(input, dependencies = {}) {
  const user = await requireCurrentUser()
  const submission = await resolveSubmissionQuestions(input, user)
  const { attempt, attemptId, jobType, difficulty, questions } = submission

  const requestedJobType = normalizeText(input.jobType)
  if (requestedJobType && requestedJobType !== jobType) {
    throw new AppServiceError('The quiz attempt does not match this job role.', 'QUIZ_ATTEMPT_MISMATCH', 409)
  }

  const answers = normalizeSubmittedAnswers(input.answers)
  const grading = difficulty === 'Beginner'
    ? await gradeBeginnerQuizAnswers(
      { questions, answers },
      { grade: dependencies.grade },
    )
    : { mode: 'answer-key', results: exactAnswerResults(questions, answers) }
  const resultByQuestionId = new Map(
    grading.results.map((result) => [String(result.questionId), result]),
  )
  const questionResults = questions.map((question) => {
    const questionId = String(question._id)
    const grade = resultByQuestionId.get(questionId) ?? {
      questionId,
      correct: false,
      feedback: 'This answer could not be graded.',
    }
    return {
      questionId,
      correct: grade.correct,
      correctAnswer: question.answer,
      feedback: grade.feedback,
    }
  })
  const correctQuestionIds = new Set(
    questionResults.filter((result) => result.correct).map((result) => result.questionId),
  )
  const correctQuestions = questions.filter((question) => correctQuestionIds.has(String(question._id)))
  const totalMarks = questions.reduce((sum, question) => sum + Number(question.marks ?? 0), 0)
  const score = correctQuestions.reduce((sum, question) => sum + Number(question.marks ?? 0), 0)
  const roundedTotalMarks = Number(totalMarks.toFixed(2))
  const roundedScore = Number(score.toFixed(2))
  const percentage = totalMarks > 0 ? Number(((score / totalMarks) * 100).toFixed(2)) : 0
  const passed = percentage >= 70
  const feedback = buildFeedback(percentage, jobType)
  const allQuestions = await listQuizQuestions(jobType)
  const candidateNextDifficulty = getNextQuizDifficulty(difficulty)
  const canAdvance = candidateNextDifficulty !== difficulty
    && selectQuestionsForDifficulty(allQuestions, candidateNextDifficulty).length >= QUESTIONS_PER_QUIZ
  const nextDifficulty = passed && canAdvance ? candidateNextDifficulty : difficulty

  const result = await createQuizResult({
    userId: user._id,
    attemptId: attemptId || undefined,
    jobType,
    difficulty,
    totalQuestions: questions.length,
    correctCount: correctQuestions.length,
    score: roundedScore,
    totalMarks: roundedTotalMarks,
    percentage,
    passed,
    gradingMode: grading.mode,
    feedback,
  })

  if (passed && attempt) {
    await completeQuizAttempt(attempt._id, user._id)
  }

  return {
    result,
    correctCount: correctQuestions.length,
    totalQuestions: questions.length,
    score: roundedScore,
    totalMarks: roundedTotalMarks,
    percentage,
    passed,
    difficulty,
    nextDifficulty,
    gradingMode: grading.mode,
    feedback,
    questionResults,
  }
}
