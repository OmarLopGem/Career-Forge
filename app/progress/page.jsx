import { redirect } from 'next/navigation'
import { getCurrentUserFromRequest } from '@/lib/server/auth/current-user.js'
import { serviceGetProgressOverview } from '@/lib/server/progress/progress.service.js'

export const dynamic = 'force-dynamic'

function formatDate(value) {
  if (!value) return 'Not available yet'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
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

export default async function ProgressPage() {
  const currentUser = await getCurrentUserFromRequest()

  if (!currentUser) {
    redirect('/login?redirectTo=/progress')
  }

  const overview = await serviceGetProgressOverview()
  const { summary, profileProgress, quizResults, applications } = overview
  const activeApplications = applications.filter((application) => !application.isArchived)
  const archivedApplications = applications.filter((application) => application.isArchived)

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-[2rem] border border-border bg-surface p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-blue">
            Progress
          </p>
          <h1 className="mt-4 text-4xl font-bold text-navy">
            Private progress dashboard for {currentUser.firstName}
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-text-muted">
            This page only shows data scoped to your account: your CV profile progress, quiz results, and application history.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Professional Profiles"
              value={summary.profiles}
              detail="Profiles currently available in your CV workspace."
            />
            <SummaryCard
              label="Active Applications"
              value={summary.activeApplications}
              detail="Tracked applications that are still active."
            />
            <SummaryCard
              label="Archived Applications"
              value={summary.archivedApplications}
              detail="Applications automatically or manually archived."
            />
            <SummaryCard
              label="Quiz Average"
              value={`${summary.quiz.averageScore}/10`}
              detail={`${summary.quiz.attempts} attempt(s), ${summary.quiz.passedAttempts} passed.`}
            />
          </div>
        </section>

        <section className="rounded-[2rem] border border-border bg-surface p-8 shadow-sm">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-blue">
              CV Profiles
            </p>
            <h2 className="text-2xl font-bold text-navy">Professional profile health</h2>
          </div>

          {profileProgress.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-border bg-background p-8 text-center text-sm text-text-muted">
              No professional profiles yet. Create one in CV Assistant to start tracking progress.
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {profileProgress.map((profile) => (
                <article key={profile._id} className="rounded-3xl border border-border bg-background p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-navy">{profile.title}</h3>
                      <p className="mt-1 text-sm text-text-muted">
                        {profile.targetRole || 'Target role not set yet'}
                      </p>
                    </div>
                    {profile.isDefault ? (
                      <span className="rounded-full bg-cyan-soft px-3 py-1 text-xs font-semibold text-success-green">
                        Default
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                        Completion
                      </p>
                      <p className="mt-2 text-2xl font-bold text-navy">{profile.completionScore}%</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                        Latest ATS Score
                      </p>
                      <p className="mt-2 text-2xl font-bold text-navy">
                        {profile.lastAnalysisScore ?? 'N/A'}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm text-text-muted">
                    Updated on {formatDate(profile.updatedAt)}.
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-8 xl:grid-cols-2">
          <div className="rounded-[2rem] border border-border bg-surface p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-blue">
              Quiz History
            </p>
            <h2 className="mt-3 text-2xl font-bold text-navy">Interview practice results</h2>

            {quizResults.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-dashed border-border bg-background px-4 py-5 text-sm text-text-muted">
                You have not completed any quiz attempts yet.
              </p>
            ) : (
              <div className="mt-6 space-y-4">
                {quizResults.map((result) => (
                  <article key={result._id} className="rounded-3xl border border-border bg-background p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-navy">{result.jobType}</h3>
                        <p className="mt-1 text-sm text-text-muted">
                          Completed on {formatDate(result.completedAt)}
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-soft px-3 py-1 text-sm font-semibold text-brand-blue">
                        {result.score}/10
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-text-main">
                      {result.correctCount}/{result.totalQuestions} correct
                    </p>
                    <p className="mt-2 text-sm text-text-muted">{result.feedback || 'No feedback saved.'}</p>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-border bg-surface p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-blue">
              Application History
            </p>
            <h2 className="mt-3 text-2xl font-bold text-navy">Jobs you have applied to</h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <article className="rounded-3xl border border-border bg-background p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                  Active
                </p>
                <p className="mt-2 text-3xl font-bold text-navy">{activeApplications.length}</p>
              </article>
              <article className="rounded-3xl border border-border bg-background p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                  Archived
                </p>
                <p className="mt-2 text-3xl font-bold text-navy">{archivedApplications.length}</p>
              </article>
            </div>

            {applications.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-dashed border-border bg-background px-4 py-5 text-sm text-text-muted">
                No job applications tracked yet.
              </p>
            ) : (
              <div className="mt-6 space-y-4">
                {applications.map((application) => (
                  <article key={application._id} className="rounded-3xl border border-border bg-background p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-navy">{application.jobSnapshot.title}</h3>
                        <p className="mt-1 text-sm text-text-muted">
                          {application.jobSnapshot.company} - {application.jobSnapshot.location || 'Location not set'}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold capitalize text-brand-blue">
                        {application.isArchived ? 'Archived' : application.status.replaceAll('_', ' ')}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-muted">
                        <p className="font-semibold text-navy">CV Profile Used</p>
                        <p className="mt-1">
                          {application.cvProfileSnapshot?.title || 'Legacy application without profile snapshot'}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-muted">
                        <p className="font-semibold text-navy">Last Activity</p>
                        <p className="mt-1">{formatDate(application.lastActivityAt)}</p>
                      </div>
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
