import { NextResponse } from 'next/server'
import { serviceWarnAdminUser } from '@/lib/server/admin/admin-users.service.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request, { params }) {
  try {
    const { userId } = await params
    const body = await request.json()
    return NextResponse.json(await serviceWarnAdminUser(userId, body?.message), {
      status: 201,
    })
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
