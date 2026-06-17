import { NextResponse } from 'next/server'
import { serviceListTemplates, toApiErrorResponse } from '@/lib/cv-assistant/server/cv-service.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request, { params }) {
  try {
    const { profileId } = await params
    const result = await serviceListTemplates(profileId)
    return NextResponse.json(result)
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
