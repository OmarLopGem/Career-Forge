import { NextResponse } from 'next/server'
import { serviceListEmployerApplicants } from '@/lib/job-tracker/server/employer-applicant.service.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const result = await serviceListEmployerApplicants({
      listingId: request.nextUrl.searchParams.get('listingId'),
      page: request.nextUrl.searchParams.get('page'),
      pageSize: request.nextUrl.searchParams.get('pageSize'),
    })
    return NextResponse.json(result)
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}