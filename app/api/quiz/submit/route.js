import { NextResponse } from 'next/server'
import { serviceSubmitQuiz } from '@/lib/server/quiz/quiz.service.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const body = await request.json()
    return NextResponse.json(await serviceSubmitQuiz(body), { status: 201 })
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
