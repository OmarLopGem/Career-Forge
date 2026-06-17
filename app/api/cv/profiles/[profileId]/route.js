import { NextResponse } from 'next/server'
import {
  serviceDeleteProfile,
  serviceGetProfile,
  serviceUpdateProfile,
  toApiErrorResponse,
} from '@/lib/cv-assistant/server/cv-service.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_request, { params }) {
  try {
    const { profileId } = await params
    const profile = await serviceGetProfile(profileId)
    return NextResponse.json({ profile })
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}

export async function PATCH(request, { params }) {
  try {
    const { profileId } = await params
    const body = await request.json()
    const result = await serviceUpdateProfile(profileId, body)
    return NextResponse.json(result)
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { profileId } = await params
    const result = await serviceDeleteProfile(profileId)
    return NextResponse.json(result)
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
