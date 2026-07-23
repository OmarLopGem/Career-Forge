import { NextResponse } from 'next/server'
import { serviceListAdminWarningUsers } from '@/lib/server/admin/admin-users.service.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json(await serviceListAdminWarningUsers())
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
