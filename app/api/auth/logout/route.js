import { NextResponse } from 'next/server'
import { serviceLogout } from '@/lib/server/auth/auth-service.js'
import { clearSessionCookie } from '@/lib/server/auth/session-cookie.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const result = await serviceLogout()
    const response = NextResponse.json(result)
    clearSessionCookie(response)
    return response
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
