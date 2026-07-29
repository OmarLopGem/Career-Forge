import { redirect } from 'next/navigation'
import { getCurrentUserFromRequest } from '@/lib/server/auth/current-user.js'
import { serviceGetProgressOverview } from '@/lib/server/progress/progress.service.js'
import StreakBadgeServer from '@/app/quiz/components/StreakBadgeServer.jsx'

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
  const { summary, profileProgress, quizResults, applications, bestByJobType } = overview
  const activeApplications = applications.filter((application) => !application.isArchived)
  const archivedApplications = applications.filter((application) => application.isArchived)
  const profilesWithScoreHistory = profileProgress.filter(
    (profile) => (profile.scoreHistory?.length ?? 0) > 0,
  )

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

        <section className="rounded-[2rem] border border-border bg-surface p-8 shadow-sm">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-blue">
              CV Grade History
            </p>
            <h2 className="text-2xl font-bold text-navy">How your CV grades change over time</h2>
            <p className="text-sm text-text-muted">
              Review every ATS score saved for your CV profiles so you can track improvement
              across revisions.
            </p>
          </div>

          {profilesWithScoreHistory.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-border bg-background p-8 text-center text-sm text-text-muted">
              No CV score history yet. Run an analysis from CV Assistant to start tracking your
              grades over time.
            </div>
          ) : (
            <div className="mt-6 grid gap-5">
              {profilesWithScoreHistory.map((profile) => (
                <article key={profile._id} className="rounded-3xl border border-border bg-background p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-navy">{profile.title}</h3>
                      <p className="mt-1 text-sm text-text-muted">
                        {profile.targetRole || 'Target role not set yet'}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-border bg-white px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                          Latest
                        </p>
                        <p className="mt-2 text-2xl font-bold text-navy">
                          {formatScore(profile.lastAnalysisScore)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border bg-white px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                          Best
                        </p>
                        <p className="mt-2 text-2xl font-bold text-navy">
                          {formatScore(profile.bestAnalysisScore)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border bg-white px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                          Since First Review
                        </p>
                        <p className="mt-2 text-2xl font-bold text-navy">
                          {formatDelta(profile.improvementSinceFirst)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <ul className="mt-5 space-y-3">
                    {profile.scoreHistory.map((entry, index) => {
                      const previousScore =
                        index > 0 ? profile.scoreHistory[index - 1].score : null
                      const changeFromPrevious =
                        previousScore == null
                          ? null
                          : Math.round((entry.score - previousScore) * 10) / 10

                      return (
                        <li
                          key={entry._id}
                          className="flex flex-col gap-3 rounded-2xl border border-border bg-white px-4 py-4 md:flex-row md:items-center md:justify-between"
                        >
                          <div>
                            <p className="text-sm font-semibold text-navy">Review {index + 1}</p>
                            <p className="mt-1 text-xs text-text-muted">
                              Recorded on {formatDate(entry.createdAt)}
                            </p>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="h-2 w-28 overflow-hidden rounded-full bg-blue-soft">
                              <div
                                className="h-full rounded-full bg-brand-blue"
                                style={{ width: `${Math.max(0, Math.min(entry.score, 100))}%` }}
                              />
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-navy">{formatScore(entry.score)}/100</p>
                              <p className="text-xs text-text-muted">
                                {formatDelta(changeFromPrevious, 'Starting point')}
                              </p>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
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
                    <p className="mt-2 text-sm text-text-muted">
                      {result.feedback || 'No feedback saved.'}
                    </p>
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

        <section className="rounded-[2rem] border border-border bg-surface p-8 shadow-sm">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-blue">
              Best by Job Type
            </p>
            <h2 className="text-2xl font-bold text-navy">Your highest grades per quiz</h2>
            <p className="text-sm text-text-muted">
              Best percentage score across every attempt for each quiz topic.
            </p>
          </div>

          {bestByJobType.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-border bg-background p-8 text-center text-sm text-text-muted">
              Complete a quiz to start tracking your best grade per topic.
            </div>
          ) : (
            <ul className="mt-6 space-y-3">
              {bestByJobType.map((entry, index) => {
                const isTop = index === 0
                const scoreDetail =
                  entry.bestScore != null && entry.totalMarks != null
                    ? `${entry.bestScore}/${entry.totalMarks} marks`
                    : entry.bestScore != null
                      ? `${entry.bestScore}/10 marks`
                      : null
                return (
                  <li
                    key={entry.jobType}
                    className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-5 py-4 ${
                      isTop
                        ? 'border-success-green bg-cyan-soft'
                        : 'border-border bg-background'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                          isTop
                            ? 'bg-success-green text-white'
                            : 'bg-blue-soft text-brand-blue'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-base font-bold text-navy">{entry.jobType}</p>
                        <p className="mt-1 text-xs text-text-muted">
                          {entry.attempts} attempt{entry.attempts === 1 ? '' : 's'} - last achieved{' '}
                          {formatDate(entry.lastAchievedAt)}
                          {scoreDetail ? ` - ${scoreDetail}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-navy">
                        {Math.round(entry.bestPercentage)}%
                      </span>
                      {isTop ? (
                        <span className="rounded-full bg-success-green px-3 py-1 text-xs font-semibold text-white">
                          Top grade
                        </span>
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}
