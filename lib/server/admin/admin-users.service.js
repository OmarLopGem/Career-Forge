import { AppServiceError } from '@/lib/server/api-error.js'
import { requireAdminUser } from '@/lib/server/auth/current-user.js'
import { hashPassword } from '@/lib/server/auth/password.js'
import { deleteSessionsByUserId } from '@/lib/server/auth/sessions.repository.js'
import {
  CV_ANALYSIS_COLLECTION,
  CV_PROFILE_COLLECTION,
  getDb,
} from '@/lib/cv-assistant/server/mongo.js'
import { JOB_APPLICATIONS_COLLECTION } from '@/lib/job-tracker/server/job-application.repository.js'
import { CALENDAR_EVENTS_COLLECTION } from '@/lib/job-tracker/server/calendar-event.repository.js'
import {
  countUserWarnings,
  createUserWarning,
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

const ALLOWED_ROLES = ['user', 'admin']
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
  if (nextWarningCount >= 2) {
    const suspendedUser = await setUserStatus(targetUser._id, 'blocked')
    await deleteSessionsByUserId(targetUser._id)
    return {
      action: 'suspended',
      warning,
      warningCount: nextWarningCount,
      user: toSafeUser(suspendedUser),
    }
  }

  return {
    action: 'warned',
    warning,
    warningCount: nextWarningCount,
    user: toSafeUser(targetUser),
  }
}

async function removeUserOwnedData(userId) {
  const db = await getDb()
  await Promise.all([
    db.collection(CV_ANALYSIS_COLLECTION).deleteMany({ userId }),
    db.collection(CV_PROFILE_COLLECTION).deleteMany({ userId }),
    db.collection(JOB_APPLICATIONS_COLLECTION).deleteMany({ userId }),
    db.collection(CALENDAR_EVENTS_COLLECTION).deleteMany({ userId }),
    db.collection('quiz_attempts').deleteMany({ userId }),
    db.collection('quiz_results').deleteMany({ userId }),
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
