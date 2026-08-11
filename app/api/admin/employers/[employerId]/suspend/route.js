import { NextResponse } from 'next/server'
import { serviceSuspendEmployer } from '@/lib/server/admin/admin-employers.service.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(_request, { params }) {
  try {
    const { employerId } = await params
    const result = await serviceSuspendEmployer(employerId)
    return NextResponse.json(result)
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}