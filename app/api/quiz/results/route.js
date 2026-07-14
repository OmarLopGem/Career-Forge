import { NextResponse } from 'next/server'
import { serviceRecordQuizResult } from '@/lib/server/progress/progress.service.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const body = await request.json()
    const result = await serviceRecordQuizResult(body)
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
