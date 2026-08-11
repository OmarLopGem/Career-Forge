import { NextResponse } from 'next/server'
import {
  serviceCreateAdminQuizQuestion,
  serviceListAdminQuizQuestions,
} from '@/lib/server/quiz/quiz.service.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    return NextResponse.json(await serviceListAdminQuizQuestions({
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
    }))
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    return NextResponse.json(await serviceCreateAdminQuizQuestion(body), { status: 201 })
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
