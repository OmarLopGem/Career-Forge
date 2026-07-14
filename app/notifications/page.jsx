import { redirect } from 'next/navigation'
import { getCurrentUserFromRequest } from '@/lib/server/auth/current-user.js'
import { serviceListMyNotifications } from '@/lib/server/notifications/notification.service.js'

export const dynamic = 'force-dynamic'

function formatDate(value) {
  if (!value) return 'No end date'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
}

const levelStyles = {
  info: 'bg-blue-soft text-brand-blue',
  success: 'bg-cyan-soft text-success-green',
  warning: 'bg-orange-soft text-forge-orange',
  urgent: 'bg-red-50 text-red-600',
}

export default async function NotificationsPage() {
  if (!(await getCurrentUserFromRequest())) {
    redirect('/login?redirectTo=/notifications')
  }

  const { notifications } = await serviceListMyNotifications()

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-5xl rounded-[2rem] border border-border bg-surface p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-blue">
          Notifications
        </p>
        <h1 className="mt-4 text-4xl font-bold text-navy">Updates for your account</h1>
        <p className="mt-3 max-w-3xl text-sm text-text-muted">
          These announcements are private to signed-in users and are shown here only when they are active.
        </p>

        {notifications.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-border bg-background p-8 text-center text-sm text-text-muted">
            No active notifications right now.
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {notifications.map((notification) => (
              <article key={notification._id} className="rounded-3xl border border-border bg-background p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-navy">{notification.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-text-muted">{notification.message}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${levelStyles[notification.level] ?? levelStyles.info}`}>
                    {notification.level}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-muted">
                    <p className="font-semibold text-navy">Starts</p>
                    <p className="mt-1">{formatDate(notification.startsAt)}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-muted">
                    <p className="font-semibold text-navy">Expires</p>
                    <p className="mt-1">{formatDate(notification.expiresAt)}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
