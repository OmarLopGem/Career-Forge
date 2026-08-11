import { NextResponse } from 'next/server'
import {
  serviceCloseEmployerJobListing,
  serviceGetEmployerJobListing,
  serviceUpdateEmployerJobListing,
} from '@/lib/job-tracker/server/employer-listing.service.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request, { params }) {
  try {
    const { listingId } = await params
    const result = await serviceGetEmployerJobListing(listingId)
    return NextResponse.json(result)
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}

export async function PATCH(request, { params }) {
  try {
    const { listingId } = await params
    const body = await request.json()
    const result = await serviceUpdateEmployerJobListing(listingId, body)
    return NextResponse.json(result)
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { listingId } = await params
    const result = await serviceCloseEmployerJobListing(listingId)
    return NextResponse.json(result)
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}