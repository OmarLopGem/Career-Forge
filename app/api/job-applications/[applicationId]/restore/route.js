import { NextResponse } from 'next/server'
import { serviceRestoreJobApplication } from '@/lib/job-tracker/server/job-tracker.service.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(_request, { params }) {
  try {
    const { applicationId } = await params
    const result = await serviceRestoreJobApplication(applicationId)
    return NextResponse.json(result)
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
