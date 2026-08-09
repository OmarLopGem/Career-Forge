import { AppServiceError } from '@/lib/server/api-error.js'
import { requireCurrentUser } from './current-user.js'
import { hashPassword, verifyPassword } from './password.js'
import { createSession, deleteSessionByToken } from './sessions.repository.js'
import { SESSION_DURATION_MS, readSessionToken } from './session-cookie.js'
import { createUser, getUserByEmail, toSafeUser } from './users.repository.js'

// Route handlers stay thin; this service owns validation, credential checks,
// and session creation for the Mongo-backed auth flow.
const REGISTRATION_ROLES = ['user', 'employer']

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase()
}

function validateRegistrationInput(input) {
  const firstName = String(input.firstName ?? '').trim()
  const lastName = String(input.lastName ?? '').trim()
  const email = normalizeEmail(input.email)
  const password = String(input.password ?? '')
  const requestedRole = String(input.requestedRole ?? 'user').trim().toLowerCase()
  const role = requestedRole || 'user'

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

  if (!REGISTRATION_ROLES.includes(role)) {
    throw new AppServiceError(
      'Please choose a valid account type.',
      'INVALID_ROLE',
      400,
    )
  }

  const companyName = String(input.companyName ?? '').trim()

  return { firstName, lastName, email, password, role, companyName }
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
  const { firstName, lastName, email, password, role, companyName } =
    validateRegistrationInput(input)
  const existingUser = await getUserByEmail(email)

  if (existingUser) {
    throw new AppServiceError('An account with this email already exists.', 'EMAIL_IN_USE', 409)
  }

  const passwordHash = await hashPassword(password)

  let employerId = null
  let accountStatus = 'active'

  if (role === 'employer') {
    if (!companyName) {
      throw new AppServiceError(
        'Company name is required to register as an employer.',
        'COMPANY_NAME_REQUIRED',
        400,
      )
    }

    const { createEmployer } = await import('@/lib/db/models/employer.js')
    const employer = await createEmployer({
      ownerUserId: 'pending',
      name: companyName,
      website: String(input.companyWebsite ?? '').trim(),
      industry: String(input.companyIndustry ?? '').trim(),
      size: String(input.companySize ?? '').trim(),
      description: String(input.companyDescription ?? '').trim(),
      status: 'pending',
    })
    employerId = employer._id
    accountStatus = 'pending'
  }

  const user = await createUser({
    firstName,
    lastName,
    email,
    passwordHash,
    role,
    status: accountStatus,
    employerId,
  })

  if (role === 'employer') {
    const { getEmployerModel } = await import('@/lib/db/models/employer.js')
    const EmployerModel = await getEmployerModel()
    await EmployerModel.updateOne(
      { _id: employerId },
      { $set: { ownerUserId: user._id, updatedAt: new Date().toISOString() } },
    )
  }

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

  if (user.status === 'blocked' || user.status === 'deleted') {
    throw new AppServiceError(
      'Your account is suspended. Please contact an administrator.',
      'ACCOUNT_INACTIVE',
      403,
    )
  }

  if (user.status !== 'active' && user.status !== 'pending') {
    throw new AppServiceError('Your account does not have access.', 'ACCOUNT_INACTIVE', 403)
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
  const user = await requireCurrentUser()
  return { user }
}
