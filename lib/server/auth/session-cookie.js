import { cookies } from 'next/headers'

export const SESSION_COOKIE_NAME = 'career_forge_session'
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7

function getCookieOptions(expiresAt) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(expiresAt),
  }
}

export async function readSessionToken() {
  try {
    const cookieStore = await cookies()
    return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null
  } catch {
    return null
  }
}

export function setSessionCookie(response, token, expiresAt) {
  response.cookies.set(SESSION_COOKIE_NAME, token, getCookieOptions(expiresAt))
  return response
}

export function clearSessionCookie(response) {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(0),
  })
  return response
}
