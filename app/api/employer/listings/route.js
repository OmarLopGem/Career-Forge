import { NextResponse } from 'next/server'
import {
  serviceCreateEmployerJobListing,
  serviceListMyEmployerJobListings,
} from '@/lib/job-tracker/server/employer-listing.service.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const result = await serviceListMyEmployerJobListings()
    return NextResponse.json(result)
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const result = await serviceCreateEmployerJobListing(body)
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}