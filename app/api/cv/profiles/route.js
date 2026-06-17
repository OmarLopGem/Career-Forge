import { NextResponse } from 'next/server'
import { serviceListProfiles, toApiErrorResponse } from '@/lib/cv-assistant/server/cv-service.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const profiles = await serviceListProfiles()
    return NextResponse.json({ profiles })
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
