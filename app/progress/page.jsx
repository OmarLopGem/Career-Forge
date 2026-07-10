import { redirect } from 'next/navigation'
import { getCurrentUserFromRequest } from '@/lib/server/auth/current-user.js'

export const dynamic = 'force-dynamic'

export default async function ProgressPage() {
  const user = await getCurrentUserFromRequest()

  if (!user) {
    redirect('/login?redirectTo=/progress')
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto max-w-4xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--brand-blue)]">
          Progress
        </p>
        <h1 className="mt-4 text-4xl font-bold text-[var(--navy)]">
          Progress tracking in progress
        </h1>
      
      </div>
    </main>
  )
}
