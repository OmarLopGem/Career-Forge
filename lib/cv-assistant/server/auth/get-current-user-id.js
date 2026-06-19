import { getCurrentUserFromRequest } from '@/lib/server/auth/current-user.js'
import { AppServiceError } from '@/lib/server/api-error.js'

export const MOCK_USER_ID = 'mock-user-cv-assistant'

export async function getCurrentUserId() {
  const currentUser = await getCurrentUserFromRequest()

  if (currentUser?._id) {
    return currentUser._id
  }

  if (process.env.NODE_ENV === 'test') {
    return process.env.MOCK_USER_ID ?? MOCK_USER_ID
  }

  throw new AppServiceError('Authentication required.', 'UNAUTHORIZED', 401)
}
