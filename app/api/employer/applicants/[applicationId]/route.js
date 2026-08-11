import { NextResponse } from 'next/server'
import { serviceGetEmployerApplicant } from '@/lib/job-tracker/server/employer-applicant.service.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request, { params }) {
  try {
    const { applicationId } = await params
    const result = await serviceGetEmployerApplicant(applicationId)
    return NextResponse.json(result)
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}