import { NextResponse } from 'next/server'
import { serviceImportCV, toApiErrorResponse } from '@/lib/cv-assistant/server/cv-service.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: { code: 'UNSUPPORTED_FILE_TYPE', message: 'No file uploaded.' } },
        { status: 400 },
      )
    }
    const titleRaw = formData.get('title')
    const title = typeof titleRaw === 'string' ? titleRaw.trim() : ''
    if (title.length < 3 || title.length > 80) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_TITLE',
            message: 'A profile name between 3 and 80 characters is required.',
          },
        },
        { status: 400 },
      )
    }
    const desiredRole = formData.get('desiredRole')
    const target = desiredRole ? { desiredRole: String(desiredRole) } : undefined
    const buffer = new Uint8Array(await file.arrayBuffer())
    const result = await serviceImportCV({
      fileName: file.name,
      mimeType: file.type,
      buffer,
      title,
      target,
    })
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
