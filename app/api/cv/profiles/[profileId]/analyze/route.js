import { NextResponse } from 'next/server'
import { serviceAnalyzeProfile, toApiErrorResponse } from '@/lib/cv-assistant/server/cv-service.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(_request, { params }) {
  try {
    const { profileId } = await params
    const result = await serviceAnalyzeProfile(profileId)
    return NextResponse.json(result)
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
