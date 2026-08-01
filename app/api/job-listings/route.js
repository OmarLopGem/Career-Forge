import { NextResponse } from 'next/server'
import { serviceListJobListings } from '@/lib/job-tracker/server/job-tracker.service.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const result = await serviceListJobListings({
      what: request.nextUrl.searchParams.get('what'),
      where: request.nextUrl.searchParams.get('where'),
      page: request.nextUrl.searchParams.get('page'),
    })
    return NextResponse.json(result)
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
