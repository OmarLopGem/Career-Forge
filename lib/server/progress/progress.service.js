import { AppServiceError } from '@/lib/server/api-error.js'
import { requireCurrentUser } from '@/lib/server/auth/current-user.js'
import { listProfilesByUser } from '@/lib/cv-assistant/server/cv-profile.repository.js'
import { getLatestAnalysis } from '@/lib/cv-assistant/server/cv-analysis.repository.js'
import { listJobApplicationsByUser } from '@/lib/job-tracker/server/job-application.repository.js'
import { createQuizResult, listQuizResultsByUser } from './quiz-result.repository.js'

function sanitizeString(value) {
  return String(value ?? '').trim()
}

function sanitizeScore(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10) {
    throw new AppServiceError('Quiz score must be between 0 and 10.', 'INVALID_QUIZ_SCORE', 400)
  }
  return Math.round(parsed * 10) / 10
}

function sanitizeCount(value, fieldName) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new AppServiceError(`${fieldName} must be a non-negative number.`, 'VALIDATION_ERROR', 400)
  }
  return parsed
}

function buildQuizSummary(results) {
  const attempts = results.length
  const averageScore = attempts === 0
    ? 0
    : Math.round((results.reduce((sum, result) => sum + result.score, 0) / attempts) * 10) / 10
  const passedAttempts = results.filter((result) => result.passed).length

  return {
    attempts,
    averageScore,
    passedAttempts,
    latestAttemptAt: results[0]?.completedAt ?? null,
  }
}

export async function serviceRecordQuizResult(input) {
  const user = await requireCurrentUser()
  const jobType = sanitizeString(input.jobType)

  if (!jobType) {
    throw new AppServiceError('Job type is required.', 'VALIDATION_ERROR', 400)
  }

  const score = sanitizeScore(input.score)
  const correctCount = sanitizeCount(input.correctCount, 'Correct count')
  const totalQuestions = sanitizeCount(input.totalQuestions, 'Total questions')

  if (correctCount > totalQuestions) {
    throw new AppServiceError(
      'Correct count cannot exceed total questions.',
      'VALIDATION_ERROR',
      400,
    )
  }

  const result = await createQuizResult({
    userId: user._id,
    jobType,
    score,
    correctCount,
    totalQuestions,
    passed: score >= 7,
    feedback: sanitizeString(input.feedback),
  })

  return { result }
}

export async function serviceGetProgressOverview() {
  const user = await requireCurrentUser()
  const [applications, quizResults, profiles] = await Promise.all([
    listJobApplicationsByUser(user._id),
    listQuizResultsByUser(user._id),
    listProfilesByUser(user._id),
  ])

  const profileProgress = await Promise.all(
    profiles.map(async (profile) => {
      const latestAnalysis = await getLatestAnalysis(user._id, profile._id)
      return {
        _id: profile._id,
        title: profile.title,
        isDefault: profile.isDefault,
        completionScore: profile.completion?.score ?? 0,
        targetRole: profile.target?.desiredRole ?? '',
        lastAnalysisScore: latestAnalysis?.atsFeedback?.score ?? null,
        updatedAt: profile.updatedAt,
      }
    }),
  )

  return {
    user,
    summary: {
      profiles: profileProgress.length,
      activeApplications: applications.filter((application) => !application.isArchived).length,
      archivedApplications: applications.filter((application) => application.isArchived).length,
      quiz: buildQuizSummary(quizResults),
    },
    profileProgress,
    quizResults,
    applications,
  }
}
