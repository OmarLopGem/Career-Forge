import { NextResponse } from 'next/server'
import {
  serviceCreateAdminUser,
  serviceListAdminUsers,
} from '@/lib/server/admin/admin-users.service.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : undefined
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parsePositiveInt(searchParams.get('page'))
    const pageSize = parsePositiveInt(searchParams.get('pageSize'))
    const q = searchParams.get('q') ?? undefined
    const result = await serviceListAdminUsers({ page, pageSize, query: q })
    return NextResponse.json(result)
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const result = await serviceCreateAdminUser(body)
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
