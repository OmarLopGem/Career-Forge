import { NextResponse } from 'next/server'
import { serviceRegister } from '@/lib/server/auth/auth-service.js'
import { clearSessionCookie, setSessionCookie } from '@/lib/server/auth/session-cookie.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const body = await request.json()
    const result = await serviceRegister(body)
    const response = NextResponse.json({ user: result.user })
    clearSessionCookie(response)
    setSessionCookie(response, result.session.token, result.session.expiresAt)
    return response
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
