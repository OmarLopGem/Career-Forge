import { redirect } from 'next/navigation'
import { getCurrentUserFromRequest } from '@/lib/server/auth/current-user.js'
import { serviceGetProgressOverview } from '@/lib/server/progress/progress.service.js'
import { serializeForClient } from '@/lib/server/serialize-for-client.js'
import StreakBadgeServer from '@/app/quiz/components/StreakBadgeServer.jsx'
import ProgressHistoryClient from './ProgressHistoryClient.jsx'

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

function formatScore(value) {
  if (value == null) return 'N/A'
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function formatDelta(value, emptyLabel = 'No change yet') {
  if (value == null) return emptyLabel
  if (value === 0) return 'No change yet'
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${formatScore(value)} pts`
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
  const { summary, profileProgress } = overview

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
            This page only shows data scoped to your account: your CV profile progress, quiz
            results, and application history.
          </p>

          <div className="mt-8">
            <StreakBadgeServer />
          </div>

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
              No professional profiles yet. Create one in CV Assistant to start tracking
              progress.
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {profileProgress.map((profile) => (
                <article
                  key={profile._id}
                  className="rounded-3xl border border-border bg-background p-5"
                >
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
                        {formatScore(profile.lastAnalysisScore)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                        Reviews Logged
                      </p>
                      <p className="mt-2 text-2xl font-bold text-navy">{profile.analysisCount ?? 0}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-white px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                        Improvement
                      </p>
                      <p className="mt-2 text-2xl font-bold text-navy">
                        {formatDelta(profile.improvementSinceFirst)}
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

        <ProgressHistoryClient
          profileProgress={serializeForClient(overview.profileProgress)}
          quizResults={serializeForClient(overview.quizResults)}
          applications={serializeForClient(overview.applications)}
          bestByJobType={serializeForClient(overview.bestByJobType)}
        />
      </div>
    </main>
  )
}
