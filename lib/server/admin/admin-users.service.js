import { AppServiceError } from '@/lib/server/api-error.js'
import { requireAdminUser } from '@/lib/server/auth/current-user.js'
import { hashPassword } from '@/lib/server/auth/password.js'
import {
  createUser,
  getUserByEmail,
  listUsers,
  toSafeUser,
} from '@/lib/server/auth/users.repository.js'

const ALLOWED_ROLES = ['user', 'admin']

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

export async function serviceListAdminUsers() {
  await requireAdminUser()
  const users = await listUsers()
  return {
    users: users.map(toSafeUser),
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
