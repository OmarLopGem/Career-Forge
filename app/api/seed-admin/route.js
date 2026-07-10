import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    {
      error: {
        code: 'SEED_ROUTE_DISABLED',
        message: 'Use npm run seed:admin instead of the public seed route.',
      },
    },
    { status: 410 },
  )
}
