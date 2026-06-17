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
    const title = formData.get('title')
    const desiredRole = formData.get('desiredRole')
    const target = desiredRole ? { desiredRole: String(desiredRole) } : undefined
    const buffer = new Uint8Array(await file.arrayBuffer())
    const result = await serviceImportCV({
      fileName: file.name,
      mimeType: file.type,
      buffer,
      title: title ? String(title) : undefined,
      target,
    })
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    const { body, status } = toApiErrorResponse(err)
    return NextResponse.json(body, { status })
  }
}
