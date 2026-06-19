import { NextResponse } from 'next/server'
import {
  serviceDeleteJobApplication,
  serviceGetJobApplication,
  serviceUpdateJobApplication,
} from '@/lib/job-tracker/server/job-tracker.service.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request, { params }) {
  try {
    const { applicationId } = await params
    const result = await serviceGetJobApplication(applicationId)
    return NextResponse.json(result)
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}

export async function PATCH(request, { params }) {
  try {
    const { applicationId } = await params
    const body = await request.json()
    const result = await serviceUpdateJobApplication(applicationId, body)
    return NextResponse.json(result)
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { applicationId } = await params
    const result = await serviceDeleteJobApplication(applicationId)
    return NextResponse.json(result)
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
