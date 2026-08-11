import { AppServiceError } from '@/lib/server/api-error.js'
import { requireAdminUser } from '@/lib/server/auth/current-user.js'
import { hashPassword } from '@/lib/server/auth/password.js'
import { deleteSessionsByUserId } from '@/lib/server/auth/sessions.repository.js'
import { listProfileSummariesByUser } from '@/lib/cv-assistant/server/cv-profile.repository.js'
import { listAnalysesByProfile } from '@/lib/cv-assistant/server/cv-analysis.repository.js'
import { getCvAnalysisModel } from '@/lib/db/models/cv-analysis.js'
import { getCvProfileModel } from '@/lib/db/models/cv-profile.js'
import { getJobApplicationModel } from '@/lib/db/models/job-application.js'
import { getCalendarEventModel } from '@/lib/db/models/calendar-event.js'
import { getQuizResultModel } from '@/lib/db/models/quiz-result.js'
import { listCalendarEventsByUser } from '@/lib/job-tracker/server/calendar-event.repository.js'
import { listJobApplicationsByUser } from '@/lib/job-tracker/server/job-application.repository.js'
import { listQuizResultsByUser } from '@/lib/server/progress/quiz-result.repository.js'
import { serviceCreateUserNotification } from '@/lib/server/notifications/notification.service.js'
import {
  deleteMessagesByTickets,
} from '@/lib/server/support/support-message.repository.js'
import {
  deleteTicketsByUser,
  countActiveTicketsByUser,
  listTicketsByUser,
  listTicketIdsByUser,
} from '@/lib/server/support/support-ticket.repository.js'
import {
  countUserWarnings,
  createUserWarning,
  listUserWarnings,
  listUserWarningSummaries,
} from './user-warning.repository.js'
import {
  ALLOWED_USER_STATUSES,
  countActiveAdmins,
  createUser,
  getUserByEmail,
  getUserById,
  listUsersByIds,
  listUsersByStatuses,
  listUsers,
  markUserDeleted,
  setUserStatus,
  toSafeUser,
} from '@/lib/server/auth/users.repository.js'

const ALLOWED_ROLES = ['user', 'employer', 'admin']
const ADMIN_TOGGLEABLE_STATUSES = ['active', 'blocked']
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100
const MIN_WARNING_LENGTH = 5
const MAX_WARNING_LENGTH = 500

// Admin endpoints build on top of the shared auth repositories, but keep their
// own guardrails here for role rules and operational safety.
function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase()
}

function sanitizeOptionalString(value) {
  return String(value ?? '').trim()
}

function sanitizeRole(role) {
  const normalizedRole = String(role ?? 'user').trim().toLowerCase() || 'user'

  if (!ALLOWED_ROLES.includes(normalizedRole)) {
    throw new AppServiceError('Please choose a valid user role.', 'INVALID_ROLE', 400)
  }

  return normalizedRole
}

function validateCreateUserInput(input) {
  const firstName = String(input.firstName ?? '').trim()
  const lastName = String(input.lastName ?? '').trim()
  const email = normalizeEmail(input.email)
  const password = String(input.password ?? '')
  const role = sanitizeRole(input.role)

  if (!firstName || !lastName || !email || !password) {
    throw new AppServiceError('All fields are required.', 'VALIDATION_ERROR', 400)
  }

  if (!email.includes('@')) {
    throw new AppServiceError('Please enter a valid email address.', 'INVALID_EMAIL', 400)
  }

  if (password.length < 8) {
    throw new AppServiceError(
      'Password must contain at least 8 characters.',
      'WEAK_PASSWORD',
      400,
    )
  }

  return {
    firstName,
    lastName,
    email,
    password,
    role,
  }
}

function normalizePagination(input = {}) {
  const rawPage = Number.parseInt(input.page, 10)
  const rawPageSize = Number.parseInt(input.pageSize, 10)
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize >= 1
      ? Math.min(MAX_PAGE_SIZE, rawPageSize)
      : DEFAULT_PAGE_SIZE

  return { page, pageSize, query: input.query ?? '' }
}

async function attachWarningSummaries(users) {
  if (users.length === 0) return []
  const summaries = await listUserWarningSummaries(users.map((user) => user._id))
  const summaryByUserId = new Map(
    summaries.map((summary) => [summary.userId, summary]),
  )

  return users.map((user) => ({
    ...toSafeUser(user),
    ...(summaryByUserId.get(user._id) ?? {
      warningCount: 0,
      latestWarning: null,
      lastWarnedAt: null,
    }),
  }))
}

export async function serviceListAdminUsers(paginationInput) {
  await requireAdminUser()
  const { page, pageSize, query } = normalizePagination(paginationInput)
  const { items, total } = await listUsers({ page, pageSize, query })
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize)
  const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages)

  if (safePage !== page) {
    // Refetch if the requested page drifted after mutations so the UI always
    // receives a valid page worth of data.
    const { items: refetchedItems } = await listUsers({
      page: safePage,
      pageSize,
      query,
    })
    return {
      users: await attachWarningSummaries(refetchedItems),
      pagination: { page: safePage, pageSize, total, totalPages },
    }
  }

  return {
    users: await attachWarningSummaries(items),
    pagination: { page, pageSize, total, totalPages },
  }
}

export async function serviceListAdminRestrictedUsers() {
  await requireAdminUser()
  const users = await listUsersByStatuses(['blocked', 'deleted'])
  return { users: await attachWarningSummaries(users) }
}

export async function serviceListAdminWarningUsers() {
  await requireAdminUser()
  const summaries = await listUserWarningSummaries()
  const users = await listUsersByIds(summaries.map((summary) => summary.userId))
  const usersById = new Map(users.map((user) => [user._id, user]))

  return {
    users: summaries
      .map((summary) => {
        const user = usersById.get(summary.userId)
        return user ? { ...toSafeUser(user), ...summary } : null
      })
      .filter(Boolean),
  }
}

export async function serviceCreateAdminUser(input) {
  await requireAdminUser()
  const { firstName, lastName, email, password, role } = validateCreateUserInput(input)
  const existingUser = await getUserByEmail(email)

  if (existingUser) {
    throw new AppServiceError('An account with this email already exists.', 'EMAIL_IN_USE', 409)
  }

  const passwordHash = await hashPassword(password)
  const user = await createUser({
    firstName,
    lastName,
    email,
    passwordHash,
    role,
    status: 'active',
  })

  return {
    user: toSafeUser(user),
  }
}

function normalizeTargetStatus(rawStatus) {
  const status = String(rawStatus ?? '').trim().toLowerCase()

  if (!status) {
    throw new AppServiceError('Status is required.', 'INVALID_STATUS', 400)
  }

  if (!ADMIN_TOGGLEABLE_STATUSES.includes(status)) {
    throw new AppServiceError(
      `Status must be one of: ${ADMIN_TOGGLEABLE_STATUSES.join(', ')}.`,
      'INVALID_STATUS',
      400,
    )
  }

  if (!ALLOWED_USER_STATUSES.includes(status)) {
    throw new AppServiceError(
      `Status must be one of: ${ALLOWED_USER_STATUSES.join(', ')}.`,
      'INVALID_STATUS',
      400,
    )
  }

  return status
}

export async function serviceSetAdminUserStatus(userId, rawStatus) {
  const currentUser = await requireAdminUser()

  const { toObjectId } = await import('@/lib/server/object-id.js')
  if (!userId || typeof userId !== 'string' || !toObjectId(userId)) {
    throw new AppServiceError('Invalid user id.', 'INVALID_USER_ID', 400)
  }

  const targetStatus = normalizeTargetStatus(rawStatus)

  const targetUser = await getUserById(userId)
  if (!targetUser) {
    throw new AppServiceError('User not found.', 'USER_NOT_FOUND', 404)
  }

  if (targetStatus === 'blocked' && targetUser._id === currentUser._id) {
    throw new AppServiceError(
      'You cannot deactivate your own account.',
      'CANNOT_DEACTIVATE_SELF',
      400,
    )
  }

  if (
    targetStatus === 'blocked' &&
    targetUser.role === 'admin' &&
    targetUser.status === 'active'
  ) {
    // Prevent the system from ending up without any active admin account.
    const activeAdmins = await countActiveAdmins()
    if (activeAdmins <= 1) {
      throw new AppServiceError(
        'At least one active admin is required.',
        'LAST_ADMIN_PROTECTED',
        400,
      )
    }
  }

  if (targetUser.status === targetStatus) {
    return { user: toSafeUser(targetUser) }
  }

  const updated = await setUserStatus(userId, targetStatus)
  if (!updated) {
    throw new AppServiceError('User not found.', 'USER_NOT_FOUND', 404)
  }

  if (targetStatus === 'blocked') {
    try {
      // Blocking a user should also invalidate active sessions immediately.
      await deleteSessionsByUserId(userId)
    } catch (err) {
      console.error('Failed to delete sessions for deactivated user', err)
    }
  }

  return { user: toSafeUser(updated) }
}

async function getAdminTargetUser(currentUser, userId) {
  const { toObjectId } = await import('@/lib/server/object-id.js')
  if (!userId || typeof userId !== 'string' || !toObjectId(userId)) {
    throw new AppServiceError('Invalid user id.', 'INVALID_USER_ID', 400)
  }

  const targetUser = await getUserById(userId)
  if (!targetUser) {
    throw new AppServiceError('User not found.', 'USER_NOT_FOUND', 404)
  }

  if (targetUser._id === currentUser._id) {
    throw new AppServiceError(
      'You cannot perform this action on your own account.',
      'CANNOT_MANAGE_SELF',
      400,
    )
  }

  return targetUser
}

async function getAdminViewableUser(userId) {
  const { toObjectId } = await import('@/lib/server/object-id.js')
  if (!userId || typeof userId !== 'string' || !toObjectId(userId)) {
    throw new AppServiceError('Invalid user id.', 'INVALID_USER_ID', 400)
  }

  const targetUser = await getUserById(userId)
  if (!targetUser) {
    throw new AppServiceError('User not found.', 'USER_NOT_FOUND', 404)
  }

  return targetUser
}

function createAdminAccountSnapshot(user) {
  return {
    userId: user._id,
    firstName: sanitizeOptionalString(user.firstName),
    lastName: sanitizeOptionalString(user.lastName),
    email: sanitizeOptionalString(user.email),
    role: sanitizeOptionalString(user.role),
    status: sanitizeOptionalString(user.status),
    dateOfBirth: sanitizeOptionalString(user.dateOfBirth),
    photoUrl: sanitizeOptionalString(user.photoUrl),
    headline: sanitizeOptionalString(user.headline),
    phone: sanitizeOptionalString(user.phone),
    location: sanitizeOptionalString(user.location),
    linkedinUrl: sanitizeOptionalString(user.linkedinUrl),
    githubUrl: sanitizeOptionalString(user.githubUrl),
    portfolioUrl: sanitizeOptionalString(user.portfolioUrl),
    deletedAt: user.deletedAt ?? null,
    createdAt: user.createdAt ?? null,
    updatedAt: user.updatedAt ?? null,
  }
}

function getTodayDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function roundMetric(value) {
  return Math.round(Number(value) * 10) / 10
}

function averageQuizScore(results) {
  if (results.length === 0) return null
  const total = results.reduce((sum, result) => sum + Number(result.score ?? 0), 0)
  return roundMetric(total / results.length)
}

function validateWarningMessage(value) {
  const message = String(value ?? '').trim()
  if (message.length < MIN_WARNING_LENGTH) {
    throw new AppServiceError(
      `Warning messages must contain at least ${MIN_WARNING_LENGTH} characters.`,
      'INVALID_WARNING_MESSAGE',
      400,
    )
  }
  if (message.length > MAX_WARNING_LENGTH) {
    throw new AppServiceError(
      `Warning messages cannot exceed ${MAX_WARNING_LENGTH} characters.`,
      'INVALID_WARNING_MESSAGE',
      400,
    )
  }
  return message
}

export async function serviceWarnAdminUser(userId, rawMessage) {
  const currentUser = await requireAdminUser()
  const targetUser = await getAdminTargetUser(currentUser, userId)
  if (targetUser.status !== 'active' && targetUser.status !== 'pending') {
    throw new AppServiceError(
      'Only active accounts can receive warnings.',
      'USER_INACTIVE',
      400,
    )
  }

  const warningCount = await countUserWarnings(targetUser._id)
  if (warningCount >= 2) {
    const suspendedUser = await setUserStatus(targetUser._id, 'blocked')
    await deleteSessionsByUserId(targetUser._id)
    return {
      action: 'suspended',
      warningCount,
      user: toSafeUser(suspendedUser),
    }
  }

  const message = validateWarningMessage(rawMessage)

  const warning = await createUserWarning({
    userId: targetUser._id,
    adminId: currentUser._id,
    message,
  })

  const nextWarningCount = warningCount + 1
  const { notification } = await serviceCreateUserNotification({
    createdByUserId: currentUser._id,
    targetUserId: targetUser._id,
    title: nextWarningCount >= 2
      ? 'Final account warning (2 of 2)'
      : 'Account warning (1 of 2)',
    message,
    level: nextWarningCount >= 2 ? 'urgent' : 'warning',
    link: '/profile',
  })

  if (nextWarningCount >= 2) {
    const suspendedUser = await setUserStatus(targetUser._id, 'blocked')
    await deleteSessionsByUserId(targetUser._id)
    return {
      action: 'suspended',
      notification,
      warning,
      warningCount: nextWarningCount,
      user: toSafeUser(suspendedUser),
    }
  }

  return {
    action: 'warned',
    notification,
    warning,
    warningCount: nextWarningCount,
    user: toSafeUser(targetUser),
  }
}

export async function serviceGetAdminUserProfile(userId) {
  await requireAdminUser()
  const targetUser = await getAdminViewableUser(userId)
  const today = getTodayDateString()

  const [
    profiles,
    warnings,
    applications,
    calendarEvents,
    quizResults,
    supportTickets,
    activeSupportTickets,
  ] = await Promise.all([
    listProfileSummariesByUser(targetUser._id),
    listUserWarnings(targetUser._id),
    listJobApplicationsByUser(targetUser._id),
    listCalendarEventsByUser(targetUser._id),
    listQuizResultsByUser(targetUser._id),
    listTicketsByUser(targetUser._id),
    countActiveTicketsByUser(targetUser._id),
  ])

  const upcomingEvents = calendarEvents.filter((event) => {
    const eventDate = String(event.eventDate ?? '').trim()
    return eventDate && eventDate >= today
  })
  const activeApplications = applications.filter((application) => !application.isArchived)
  const archivedApplications = applications.filter((application) => application.isArchived)

  const profilesWithAnalysis = await Promise.all(
    profiles.map(async (profile) => {
      const analyses = await listAnalysesByProfile(targetUser._id, profile._id)
      const latest = analyses[0] ?? null
      return {
        ...profile,
        latestAnalysis: latest ? toLatestAnalysisSummary(latest) : null,
      }
    }),
  )

  return {
    user: toSafeUser(targetUser),
    account: createAdminAccountSnapshot(targetUser),
    profiles: profilesWithAnalysis,
    warnings,
    activity: {
      summary: {
        profiles: profilesWithAnalysis.length,
        jobApplications: applications.length,
        activeApplications: activeApplications.length,
        archivedApplications: archivedApplications.length,
        calendarEvents: calendarEvents.length,
        upcomingEvents: upcomingEvents.length,
        quizAttempts: quizResults.length,
        averageQuizScore: averageQuizScore(quizResults),
        supportTickets: supportTickets.length,
        activeSupportTickets,
      },
      recentApplications: applications.slice(0, 5),
      upcomingEvents: upcomingEvents.slice(0, 5),
      recentQuizResults: quizResults.slice(0, 5),
      recentSupportTickets: supportTickets.slice(0, 5),
    },
  }
}

function toLatestAnalysisSummary(analysis) {
  return {
    _id: analysis._id,
    overallScore: analysis.overallScore ?? null,
    atsScore: analysis.atsFeedback?.score ?? null,
    gradingMode: analysis.gradingMode ?? 'ai',
    createdAt: analysis.createdAt ?? null,
    lastEditedAt: analysis.lastEditedAt ?? null,
    lastEditedReason: analysis.lastEditedReason ?? null,
    lastEditedByUserId: analysis.lastEditedByUserId ?? null,
  }
}

async function removeUserOwnedData(userId) {
  const [CvAnalysis, CvProfile, JobApplication, CalendarEvent, QuizResult] = await Promise.all([
    getCvAnalysisModel(),
    getCvProfileModel(),
    getJobApplicationModel(),
    getCalendarEventModel(),
    getQuizResultModel(),
  ])
  const ticketIds = await listTicketIdsByUser(userId)
  await deleteMessagesByTickets(ticketIds)
  await deleteTicketsByUser(userId)
  await Promise.all([
    CvAnalysis.deleteMany({ userId }),
    CvProfile.deleteMany({ userId }),
    JobApplication.deleteMany({ userId }),
    CalendarEvent.deleteMany({ userId }),
    QuizResult.deleteMany({ userId }),
    deleteSessionsByUserId(userId),
  ])
}

export async function serviceDeleteAdminUser(userId) {
  const currentUser = await requireAdminUser()
  const targetUser = await getAdminTargetUser(currentUser, userId)

  if (targetUser.role === 'admin' && targetUser.status === 'active') {
    const activeAdmins = await countActiveAdmins()
    if (activeAdmins <= 1) {
      throw new AppServiceError(
        'At least one active admin is required.',
        'LAST_ADMIN_PROTECTED',
        400,
      )
    }
  }

  await removeUserOwnedData(targetUser._id)
  const deleted = await markUserDeleted(targetUser._id)
  if (!deleted) {
    throw new AppServiceError('User not found.', 'USER_NOT_FOUND', 404)
  }

  return { ok: true, user: toSafeUser(deleted) }
}
