import { AppServiceError } from '@/lib/server/api-error.js'
import { readSessionToken } from './session-cookie.js'
import { getSessionByToken } from './sessions.repository.js'
import { getUserById, toSafeUser } from './users.repository.js'

export async function getCurrentUserFromRequest() {
  const token = await readSessionToken()

  if (!token && process.env.NODE_ENV === 'test' && process.env.MOCK_USER_ID) {
    const mockUser = await getUserById(process.env.MOCK_USER_ID)
    return mockUser ? toSafeUser(mockUser) : null
  }

  if (!token) return null

  const session = await getSessionByToken(token)
  if (!session) return null

  const user = await getUserById(session.userId)
  if (!user) return null

  return toSafeUser(user)
}

export async function requireCurrentUser() {
  const user = await getCurrentUserFromRequest()

  if (!user) {
    throw new AppServiceError('Authentication required.', 'UNAUTHORIZED', 401)
  }

  if (user.status !== 'active') {
    throw new AppServiceError('Your account is not active.', 'ACCOUNT_INACTIVE', 403)
  }

  return user
}
