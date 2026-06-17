import { NextResponse } from 'next/server'
import { serviceGetTemplateCatalog } from '@/lib/cv-assistant/server/cv-service.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(serviceGetTemplateCatalog())
}
