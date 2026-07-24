import { NextResponse } from 'next/server'
import {
  serviceCreateTicket,
  serviceListAdminTickets,
  serviceListMyTickets,
} from '@/lib/server/support/support.service.js'
import { requireCurrentUser } from '@/lib/server/auth/current-user.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const currentUser = await requireCurrentUser()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') ?? undefined

    if (currentUser.role === 'admin') {
      const result = await serviceListAdminTickets({
        status,
        q: searchParams.get('q') ?? undefined,
        sort: searchParams.get('sort') ?? undefined,
        userId: searchParams.get('user') ?? undefined,
        page: searchParams.get('page') ?? undefined,
        pageSize: searchParams.get('pageSize') ?? undefined,
      })
      return NextResponse.json(result)
    }

    const result = await serviceListMyTickets({ status })
    return NextResponse.json(result)
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const result = await serviceCreateTicket(body)
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}