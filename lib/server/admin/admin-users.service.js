import { AppServiceError } from '@/lib/server/api-error.js'
import { requireAdminUser } from '@/lib/server/auth/current-user.js'
import { hashPassword } from '@/lib/server/auth/password.js'
import { deleteSessionsByUserId } from '@/lib/server/auth/sessions.repository.js'
import {
  ALLOWED_USER_STATUSES,
  countActiveAdmins,
  createUser,
  getUserByEmail,
  getUserById,
  listUsers,
  setUserStatus,
  toSafeUser,
} from '@/lib/server/auth/users.repository.js'

const ALLOWED_ROLES = ['user', 'admin']
const ADMIN_TOGGLEABLE_STATUSES = ['active', 'blocked']
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100

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

  return { page, pageSize }
}

export async function serviceListAdminUsers(paginationInput) {
  await requireAdminUser()
  const { page, pageSize } = normalizePagination(paginationInput)
  const { items, total } = await listUsers({ page, pageSize })
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize)
  const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages)

  if (safePage !== page) {
    const { items: refetchedItems } = await listUsers({
      page: safePage,
      pageSize,
    })
    return {
      users: refetchedItems.map(toSafeUser),
      pagination: { page: safePage, pageSize, total, totalPages },
    }
  }

  return {
    users: items.map(toSafeUser),
    pagination: { page, pageSize, total, totalPages },
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
      await deleteSessionsByUserId(userId)
    } catch (err) {
      console.error('Failed to delete sessions for deactivated user', err)
    }
  }

  return { user: toSafeUser(updated) }
}
