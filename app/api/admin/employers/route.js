import { NextResponse } from 'next/server'
import {
  serviceListEmployers,
  serviceListPendingEmployers,
} from '@/lib/server/admin/admin-employers.service.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const filter = request.nextUrl.searchParams.get('status')
    const result = filter === 'pending'
      ? await serviceListPendingEmployers()
      : await serviceListEmployers()
    return NextResponse.json(result)
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}