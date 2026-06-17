import { NextResponse } from 'next/server'
import { serviceGenerateResume, toApiErrorResponse } from '@/lib/cv-assistant/server/cv-service.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request, { params }) {
  try {
    const { profileId } = await params
    const body = await request.json().catch(() => ({}))
    if (!body.templateKey) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'templateKey is required.' } },
        { status: 400 },
      )
    }
    if (body.format && body.format !== 'pdf') {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'Only PDF format is supported.' } },
        { status: 400 },
      )
    }
    const result = await serviceGenerateResume(profileId, body.templateKey)
    const bodyBytes = new Uint8Array(result.pdfBytes)
    return new NextResponse(bodyBytes, {
      status: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${result.fileName}"`,
        'content-length': String(bodyBytes.byteLength),
        'cache-control': 'no-store',
      },
    })
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
