import { NextResponse } from 'next/server'
import { serviceSetAdminUserStatus } from '@/lib/server/admin/admin-users.service.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(request, { params }) {
  try {
    const { userId } = await params

    let body = null
    try {
      body = await request.json()
    } catch {
      body = {}
    }

    const result = await serviceSetAdminUserStatus(userId, body?.status)
    return NextResponse.json(result)
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
