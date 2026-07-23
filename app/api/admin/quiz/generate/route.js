import { NextResponse } from 'next/server'
import { serviceGenerateAdminQuizDrafts } from '@/lib/server/quiz/quiz-ai.service.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const body = await request.json()
    return NextResponse.json(await serviceGenerateAdminQuizDrafts(body))
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
