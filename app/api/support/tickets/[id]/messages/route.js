import { NextResponse } from 'next/server'
import { serviceReplyToTicket } from '@/lib/server/support/support.service.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const result = await serviceReplyToTicket(id, body)
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}