import { AppServiceError } from '@/lib/server/api-error.js'
import { getCurrentUserFromRequest } from './current-user.js'
import { hashPassword, verifyPassword } from './password.js'
import { createSession, deleteSessionByToken } from './sessions.repository.js'
import { SESSION_DURATION_MS, readSessionToken } from './session-cookie.js'
import { createUser, getUserByEmail, toSafeUser } from './users.repository.js'

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase()
}

function validateRegistrationInput(input) {
  const firstName = String(input.firstName ?? '').trim()
  const lastName = String(input.lastName ?? '').trim()
  const email = normalizeEmail(input.email)
  const password = String(input.password ?? '')

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

  return { firstName, lastName, email, password }
}

function validateLoginInput(input) {
  const email = normalizeEmail(input.email)
  const password = String(input.password ?? '')

  if (!email || !password) {
    throw new AppServiceError('Email and password are required.', 'VALIDATION_ERROR', 400)
  }

  return { email, password }
}

export async function serviceRegister(input) {
  const { firstName, lastName, email, password } = validateRegistrationInput(input)
  const existingUser = await getUserByEmail(email)

  if (existingUser) {
    throw new AppServiceError('An account with this email already exists.', 'EMAIL_IN_USE', 409)
  }

  const passwordHash = await hashPassword(password)
  const user = await createUser({ firstName, lastName, email, passwordHash })
  const session = await createSession(user._id, SESSION_DURATION_MS)

  return {
    user: toSafeUser(user),
    session,
  }
}

export async function serviceLogin(input) {
  const { email, password } = validateLoginInput(input)
  const user = await getUserByEmail(email)

  if (!user) {
    throw new AppServiceError('Invalid email or password.', 'INVALID_CREDENTIALS', 401)
  }

  if (user.status !== 'active') {
    throw new AppServiceError('Your account is not active.', 'ACCOUNT_INACTIVE', 403)
  }

  const passwordIsValid = await verifyPassword(password, user.passwordHash)

  if (!passwordIsValid) {
    throw new AppServiceError('Invalid email or password.', 'INVALID_CREDENTIALS', 401)
  }

  const session = await createSession(user._id, SESSION_DURATION_MS)

  return {
    user: toSafeUser(user),
    session,
  }
}

export async function serviceLogout() {
  const token = await readSessionToken()

  if (token) {
    await deleteSessionByToken(token)
  }

  return { ok: true }
}

export async function serviceGetCurrentUser() {
  const user = await getCurrentUserFromRequest()

  if (!user) {
    throw new AppServiceError('Authentication required.', 'UNAUTHORIZED', 401)
  }

  return { user }
}
