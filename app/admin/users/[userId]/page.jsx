import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getCurrentUserFromRequest } from '@/lib/server/auth/current-user.js'
import { serviceGetAdminUserProfile } from '@/lib/server/admin/admin-users.service.js'
import AdminUserCvProfiles from './AdminUserCvProfiles.jsx'

export const dynamic = 'force-dynamic'

function formatDate(value) {
  if (!value) return 'Not available'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
}

function formatScore(value) {
  if (value == null) return 'N/A'
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function statusClasses(status) {
  if (status === 'active') return 'border-success-green bg-cyan-soft text-success-green'
  if (status === 'blocked') return 'border-forge-orange bg-orange-soft text-forge-orange'
  if (status === 'deleted') return 'border-red-300 bg-red-50 text-red-600'
  return 'border-border bg-background text-text-muted'
}

function SummaryCard({ label, value, detail }) {
  return (
    <article className="rounded-3xl border border-border bg-background p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">{label}</p>
      <p className="mt-3 text-3xl font-bold text-navy">{value}</p>
      <p className="mt-2 text-sm text-text-muted">{detail}</p>
    </article>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-background px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className="mt-2 text-sm text-text-main">{value || 'Not provided'}</p>
    </div>
  )
}

export default async function AdminUserProfilePage({ params }) {
  const currentUser = await getCurrentUserFromRequest()

  if (!currentUser) {
    redirect('/login?redirectTo=/admin/users')
  }

  if (currentUser.role !== 'admin') {
    redirect('/calendar')
  }

  const { userId } = await params

  let result
  try {
    result = await serviceGetAdminUserProfile(userId)
  } catch (err) {
    if (err?.code === 'USER_NOT_FOUND' || err?.code === 'INVALID_USER_ID') {
      notFound()
    }
    throw err
  }

  const { account, profiles, warnings, activity } = result
  const { summary, recentApplications, upcomingEvents, recentQuizResults, recentSupportTickets } =
    activity

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-[2rem] border border-border bg-surface p-5 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link
                href="/admin/users"
                className="text-sm font-semibold text-brand-blue transition hover:text-brand-blue-hover"
              >
                Back to Admin Users
              </Link>
              <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-brand-blue">
                Admin Review
              </p>
              <h1 className="mt-3 text-4xl font-bold text-navy">
                {account.firstName} {account.lastName}
              </h1>
              <p className="mt-2 text-text-muted">{account.email}</p>
              <p className="mt-3 max-w-3xl text-sm text-text-muted">
                Review this user&apos;s account details, professional profiles, warnings, and
                recent activity across Career Forge.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusClasses(account.status)}`}
              >
                {account.status}
              </span>
              <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold capitalize text-navy">
                {account.role}
              </span>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              label="CV Profiles"
              value={summary.profiles}
              detail="Professional workspaces linked to this account."
            />
            <SummaryCard
              label="Applications"
              value={summary.jobApplications}
              detail={`${summary.activeApplications} active, ${summary.archivedApplications} archived.`}
            />
            <SummaryCard
              label="Upcoming Events"
              value={summary.upcomingEvents}
              detail={`${summary.calendarEvents} total calendar entries.`}
            />
            <SummaryCard
              label="Quiz Average"
              value={summary.averageQuizScore == null ? 'N/A' : `${formatScore(summary.averageQuizScore)}/10`}
              detail={`${summary.quizAttempts} quiz attempt(s) saved.`}
            />
            <SummaryCard
              label="Support Tickets"
              value={summary.supportTickets}
              detail={`${summary.activeSupportTickets} active ticket(s).`}
            />
          </div>
        </section>

        <section className="rounded-[2rem] border border-border bg-surface p-5 shadow-sm sm:p-8">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-blue">
              Account Details
            </p>
            <h2 className="text-2xl font-bold text-navy">Identity and account metadata</h2>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <DetailRow label="Headline" value={account.headline} />
            <DetailRow label="Phone" value={account.phone} />
            <DetailRow label="Location" value={account.location} />
            <DetailRow label="Date of Birth" value={account.dateOfBirth} />
            <DetailRow label="LinkedIn" value={account.linkedinUrl} />
            <DetailRow label="GitHub" value={account.githubUrl} />
            <DetailRow label="Portfolio" value={account.portfolioUrl} />
            <DetailRow label="Created" value={formatDate(account.createdAt)} />
            <DetailRow label="Updated" value={formatDate(account.updatedAt)} />
          </div>
        </section>

        <section className="rounded-[2rem] border border-border bg-surface p-5 shadow-sm sm:p-8">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-blue">
              Warnings
            </p>
            <h2 className="text-2xl font-bold text-navy">Administrative notices</h2>
          </div>

          {warnings.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-border bg-background p-8 text-center text-sm text-text-muted">
              This user has not received any warnings.
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {warnings.map((warning) => (
                <article key={warning._id} className="rounded-2xl border border-forge-orange/30 bg-orange-soft p-4">
                  <p className="text-sm leading-6 text-text-main">{warning.message}</p>
                  <p className="mt-2 text-xs font-medium text-text-muted">
                    Sent {formatDate(warning.createdAt)}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <AdminUserCvProfiles
          profiles={profiles}
          targetUserId={result.account.userId}
          currentAdminId={currentUser._id}
        />

        <section className="grid gap-8 xl:grid-cols-2">
          <div className="rounded-[2rem] border border-border bg-surface p-5 shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-blue">
              Job Activity
            </p>
            <h2 className="mt-3 text-2xl font-bold text-navy">Recent applications</h2>

            {recentApplications.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-dashed border-border bg-background px-4 py-5 text-sm text-text-muted">
                No job applications recorded for this user.
              </p>
            ) : (
              <div className="mt-6 space-y-4">
                {recentApplications.map((application) => (
                  <article key={application._id} className="rounded-3xl border border-border bg-background p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-navy">{application.jobSnapshot.title}</h3>
                        <p className="mt-1 text-sm text-text-muted">
                          {application.jobSnapshot.company} - {application.jobSnapshot.location || 'Location not set'}
                        </p>
                      </div>
                      <span className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold capitalize text-brand-blue">
                        {application.isArchived ? 'archived' : application.status.replaceAll('_', ' ')}
                      </span>
                    </div>
                    <p className="mt-4 text-sm text-text-muted">
                      CV profile: {application.cvProfileSnapshot?.title || 'Legacy snapshot'}
                    </p>
                    <p className="mt-2 text-sm text-text-muted">
                      Last activity: {formatDate(application.lastActivityAt)}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-border bg-surface p-5 shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-blue">
              Calendar Activity
            </p>
            <h2 className="mt-3 text-2xl font-bold text-navy">Upcoming reminders and events</h2>

            {upcomingEvents.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-dashed border-border bg-background px-4 py-5 text-sm text-text-muted">
                No upcoming events for this user.
              </p>
            ) : (
              <div className="mt-6 space-y-4">
                {upcomingEvents.map((event) => (
                  <article key={event._id} className="rounded-3xl border border-border bg-background p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-navy">{event.title}</h3>
                        <p className="mt-1 text-sm text-text-muted capitalize">
                          {event.type.replaceAll('_', ' ')}
                        </p>
                      </div>
                      <span className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-brand-blue">
                        {event.eventDate}
                      </span>
                    </div>
                    <p className="mt-4 text-sm text-text-muted">
                      Reminder enabled: {event.reminderEnabled ? 'Yes' : 'No'}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-8 xl:grid-cols-2">
          <div className="rounded-[2rem] border border-border bg-surface p-5 shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-blue">
              Quiz Activity
            </p>
            <h2 className="mt-3 text-2xl font-bold text-navy">Recent quiz results</h2>

            {recentQuizResults.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-dashed border-border bg-background px-4 py-5 text-sm text-text-muted">
                No quiz attempts saved for this user.
              </p>
            ) : (
              <div className="mt-6 space-y-4">
                {recentQuizResults.map((result) => (
                  <article key={result._id} className="rounded-3xl border border-border bg-background p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-navy">{result.jobType}</h3>
                        <p className="mt-1 text-sm text-text-muted">
                          Completed {formatDate(result.completedAt)}
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-soft px-3 py-1 text-sm font-semibold text-brand-blue">
                        {result.score}/10
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-text-main">
                      {result.correctCount}/{result.totalQuestions} correct
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-border bg-surface p-5 shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-blue">
              Support Activity
            </p>
            <h2 className="mt-3 text-2xl font-bold text-navy">Recent support tickets</h2>

            {recentSupportTickets.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-dashed border-border bg-background px-4 py-5 text-sm text-text-muted">
                No support tickets found for this user.
              </p>
            ) : (
              <div className="mt-6 space-y-4">
                {recentSupportTickets.map((ticket) => (
                  <article key={ticket._id} className="rounded-3xl border border-border bg-background p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-navy">{ticket.subject}</h3>
                        <p className="mt-1 text-sm text-text-muted capitalize">
                          Status: {ticket.status}
                        </p>
                      </div>
                      <span className="rounded-full border border-border bg-white px-3 py-1 text-xs font-semibold text-brand-blue">
                        {formatDate(ticket.lastMessageAt)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
