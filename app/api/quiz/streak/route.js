import { NextResponse } from 'next/server'
import { serviceGetQuizStreak } from '@/lib/server/progress/quiz-streak.service.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const streak = await serviceGetQuizStreak()
    return NextResponse.json(streak)
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
