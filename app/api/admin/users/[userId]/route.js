import { NextResponse } from 'next/server'
import {
  serviceDeleteAdminUser,
  serviceGetAdminUserProfile,
} from '@/lib/server/admin/admin-users.service.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request, { params }) {
  try {
    const { userId } = await params
    return NextResponse.json(await serviceGetAdminUserProfile(userId))
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { userId } = await params
    return NextResponse.json(await serviceDeleteAdminUser(userId))
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
