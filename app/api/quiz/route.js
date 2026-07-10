import { NextResponse } from 'next/server'
import { serviceListQuizQuestions } from '@/lib/server/quiz/quiz.service.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const jobType = searchParams.get('jobType')
    const result = await serviceListQuizQuestions(jobType)

    return NextResponse.json(result)
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
