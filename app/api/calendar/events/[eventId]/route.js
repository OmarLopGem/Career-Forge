import { NextResponse } from 'next/server'
import {
  serviceDeleteCalendarEvent,
  serviceGetCalendarEvent,
  serviceUpdateCalendarEvent,
} from '@/lib/job-tracker/server/job-tracker.service.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request, { params }) {
  try {
    const { eventId } = await params
    const result = await serviceGetCalendarEvent(eventId)
    return NextResponse.json(result)
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}

export async function PATCH(request, { params }) {
  try {
    const { eventId } = await params
    const body = await request.json()
    const result = await serviceUpdateCalendarEvent(eventId, body)
    return NextResponse.json(result)
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { eventId } = await params
    const result = await serviceDeleteCalendarEvent(eventId)
    return NextResponse.json(result)
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
