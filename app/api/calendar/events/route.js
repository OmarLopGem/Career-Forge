import { NextResponse } from 'next/server'
import {
  serviceCreateCalendarEvent,
  serviceListCalendarEvents,
} from '@/lib/job-tracker/server/job-tracker.service.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result = await serviceListCalendarEvents()
    return NextResponse.json(result)
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const result = await serviceCreateCalendarEvent(body)
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
