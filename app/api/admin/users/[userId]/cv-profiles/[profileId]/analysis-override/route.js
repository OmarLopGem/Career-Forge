import { NextResponse } from 'next/server'
import { serviceOverrideCvAnalysis } from '@/lib/server/admin/admin-cv-analysis.service.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(request, { params }) {
  try {
    const { userId, profileId } = await params
    const body = await request.json()
    const result = await serviceOverrideCvAnalysis(userId, profileId, body)
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}