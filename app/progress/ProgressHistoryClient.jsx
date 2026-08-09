'use client'

import { useMemo, useState } from 'react'

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

function normalize(value) {
  return String(value ?? '').trim().toLowerCase()
}

function includesQuery(query, values) {
  if (!query) return true
  return values.some((value) => normalize(value).includes(query))
}

function EmptyFilterState({ children }) {
  return (
    <div className="mt-6 rounded-3xl border border-dashed border-border bg-background p-8 text-center text-sm text-text-muted">
      {children}
    </div>
  )
}

export default function ProgressHistoryClient({
  profileProgress = [],
  quizResults = [],
  applications = [],
  bestByJobType = [],
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProfile, setSelectedProfile] = useState('all')
  const [selectedJobType, setSelectedJobType] = useState('all')
  const [applicationState, setApplicationState] = useState('all')

  const normalizedQuery = normalize(searchQuery)

  const profilesWithScoreHistory = useMemo(
    () => profileProgress.filter((profile) => (profile.scoreHistory?.length ?? 0) > 0),
    [profileProgress],
  )

  const profileOptions = useMemo(
    () =>
      [...new Set(profilesWithScoreHistory.map((profile) => profile.title).filter(Boolean))].sort(),
    [profilesWithScoreHistory],
  )

  const jobTypeOptions = useMemo(
    () =>
      [...new Set(
        [...quizResults.map((result) => result.jobType), ...bestByJobType.map((entry) => entry.jobType)]
          .filter(Boolean),
      )].sort(),
    [bestByJobType, quizResults],
  )

  const filteredProfilesWithScoreHistory = useMemo(
    () =>
      profilesWithScoreHistory.filter((profile) => {
        const profileMatches = selectedProfile === 'all' || profile.title === selectedProfile
        const queryMatches = includesQuery(normalizedQuery, [
          profile.title,
          profile.targetRole,
          profile.lastAnalysisScore,
          profile.bestAnalysisScore,
          profile.scoreHistory.map((entry) => `${entry.score}`).join(' '),
        ])
        return profileMatches && queryMatches
      }),
    [normalizedQuery, profilesWithScoreHistory, selectedProfile],
  )

  const filteredQuizResults = useMemo(
    () =>
      quizResults.filter((result) => {
        const jobTypeMatches = selectedJobType === 'all' || result.jobType === selectedJobType
        const queryMatches = includesQuery(normalizedQuery, [
          result.jobType,
          result.feedback,
          result.score,
          result.correctCount,
          result.totalQuestions,
        ])
        return jobTypeMatches && queryMatches
      }),
    [normalizedQuery, quizResults, selectedJobType],
  )

  const filteredApplications = useMemo(
    () =>
      applications.filter((application) => {
        const stateMatches =
          applicationState === 'all' ||
          (applicationState === 'active' && !application.isArchived) ||
          (applicationState === 'archived' && application.isArchived)
        const profileMatches =
          selectedProfile === 'all' ||
          application.cvProfileSnapshot?.title === selectedProfile
        const queryMatches = includesQuery(normalizedQuery, [
          application.jobSnapshot?.title,
          application.jobSnapshot?.company,
          application.jobSnapshot?.location,
          application.cvProfileSnapshot?.title,
          application.status,
          application.isArchived ? 'archived' : 'active',
        ])
        return stateMatches && profileMatches && queryMatches
      }),
    [applicationState, applications, normalizedQuery, selectedProfile],
  )

  const filteredBestByJobType = useMemo(
    () =>
      bestByJobType.filter((entry) => {
        const jobTypeMatches = selectedJobType === 'all' || entry.jobType === selectedJobType
        const queryMatches = includesQuery(normalizedQuery, [
          entry.jobType,
          entry.bestScore,
          entry.bestPercentage,
          entry.attempts,
        ])
        return jobTypeMatches && queryMatches
      }),
    [bestByJobType, normalizedQuery, selectedJobType],
  )

  const filteredActiveApplications = filteredApplications.filter((application) => !application.isArchived)
  const filteredArchivedApplications = filteredApplications.filter((application) => application.isArchived)
  const activeFilterCount = [
    normalizedQuery ? 1 : 0,
    selectedProfile !== 'all' ? 1 : 0,
    selectedJobType !== 'all' ? 1 : 0,
    applicationState !== 'all' ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0)

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedProfile('all')
    setSelectedJobType('all')
    setApplicationState('all')
  }

  return (
    <>
      <section className="rounded-[2rem] border border-border bg-surface p-8 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-blue">
              History Filters
            </p>
            <h2 className="mt-2 text-2xl font-bold text-navy">Find progress records faster</h2>
            <p className="mt-2 max-w-3xl text-sm text-text-muted">
              Filter CV grade history, quiz attempts, and job applications without leaving this
              dashboard.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-text-muted">
            {activeFilterCount === 0
              ? 'No filters applied.'
              : `${activeFilterCount} active filter${activeFilterCount === 1 ? '' : 's'} applied.`}
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          <label className="block">
            <span className="text-sm font-semibold text-navy">Search histories</span>
            <input
              aria-label="Search histories"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Quiz topics, companies, scores..."
              className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-text-main outline-none transition-colors focus:border-brand-blue"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-navy">CV profile</span>
            <select
              aria-label="CV profile filter"
              value={selectedProfile}
              onChange={(event) => setSelectedProfile(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-text-main outline-none transition-colors focus:border-brand-blue"
            >
              <option value="all">All profiles</option>
              {profileOptions.map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-navy">Quiz topic</span>
            <select
              aria-label="Quiz topic filter"
              value={selectedJobType}
              onChange={(event) => setSelectedJobType(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-text-main outline-none transition-colors focus:border-brand-blue"
            >
              <option value="all">All topics</option>
              {jobTypeOptions.map((jobType) => (
                <option key={jobType} value={jobType}>
                  {jobType}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-navy">Application state</span>
            <select
              aria-label="Application state filter"
              value={applicationState}
              onChange={(event) => setApplicationState(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-text-main outline-none transition-colors focus:border-brand-blue"
            >
              <option value="all">All applications</option>
              <option value="active">Active only</option>
              <option value="archived">Archived only</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-muted transition-colors hover:bg-cyan-soft hover:text-brand-blue"
          >
            Clear filters
          </button>
          <p className="text-sm text-text-muted">
            Showing {filteredProfilesWithScoreHistory.length} CV profile
            {filteredProfilesWithScoreHistory.length === 1 ? '' : 's'}, {filteredQuizResults.length}{' '}
            quiz attempt{filteredQuizResults.length === 1 ? '' : 's'}, and{' '}
            {filteredApplications.length} application
            {filteredApplications.length === 1 ? '' : 's'}.
          </p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-border bg-surface p-8 shadow-sm">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-blue">
            CV Grade History
          </p>
          <h2 className="text-2xl font-bold text-navy">How your CV grades change over time</h2>
          <p className="text-sm text-text-muted">
            Review every ATS score saved for your CV profiles so you can track improvement across
            revisions.
          </p>
        </div>

        {profilesWithScoreHistory.length === 0 ? (
          <EmptyFilterState>
            No CV score history yet. Run an analysis from CV Assistant to start tracking your
            grades over time.
          </EmptyFilterState>
        ) : filteredProfilesWithScoreHistory.length === 0 ? (
          <EmptyFilterState>No CV grade history matches the current filters.</EmptyFilterState>
        ) : (
          <div className="mt-6 grid gap-5">
            {filteredProfilesWithScoreHistory.map((profile) => (
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
                    const previousScore = index > 0 ? profile.scoreHistory[index - 1].score : null
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
          ) : filteredQuizResults.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-border bg-background px-4 py-5 text-sm text-text-muted">
              No quiz attempts match the current filters.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {filteredQuizResults.map((result) => (
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
              <p className="mt-2 text-3xl font-bold text-navy">{filteredActiveApplications.length}</p>
            </article>
            <article className="rounded-3xl border border-border bg-background p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
                Archived
              </p>
              <p className="mt-2 text-3xl font-bold text-navy">
                {filteredArchivedApplications.length}
              </p>
            </article>
          </div>

          {applications.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-border bg-background px-4 py-5 text-sm text-text-muted">
              No job applications tracked yet.
            </p>
          ) : filteredApplications.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-border bg-background px-4 py-5 text-sm text-text-muted">
              No job applications match the current filters.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {filteredApplications.map((application) => (
                <article
                  key={application._id}
                  className="rounded-3xl border border-border bg-background p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-navy">{application.jobSnapshot.title}</h3>
                      <p className="mt-1 text-sm text-text-muted">
                        {application.jobSnapshot.company} -{' '}
                        {application.jobSnapshot.location || 'Location not set'}
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
                        {application.cvProfileSnapshot?.title ||
                          'Legacy application without profile snapshot'}
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
          <EmptyFilterState>Complete a quiz to start tracking your best grade per topic.</EmptyFilterState>
        ) : filteredBestByJobType.length === 0 ? (
          <EmptyFilterState>No best-score records match the current filters.</EmptyFilterState>
        ) : (
          <ul className="mt-6 space-y-3">
            {filteredBestByJobType.map((entry, index) => {
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
                    isTop ? 'border-success-green bg-cyan-soft' : 'border-border bg-background'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                        isTop ? 'bg-success-green text-white' : 'bg-blue-soft text-brand-blue'
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
    </>
  )
}
