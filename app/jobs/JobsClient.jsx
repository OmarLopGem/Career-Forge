'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { requestJson } from '@/lib/job-tracker/client/api.js'
import { jobStatusLabels, jobStatusStyles } from '@/lib/job-tracker/client/constants.js'

function getDefaultCVProfileId(cvProfiles) {
  return cvProfiles.find((profile) => profile.isDefault)?._id ?? cvProfiles[0]?._id ?? ''
}

function buildCVProfileLabel(profile) {
  const detail = profile.targetRole || profile.professionalNiche || ''
  return [profile.title, detail].filter(Boolean).join(' - ')
}

function formatFetchDate(value) {
  if (!value) return 'Not available'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
}

function formatSalaryValue(value) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatSalaryRange(listing) {
  const hasMin = Number.isFinite(listing.salaryMin)
  const hasMax = Number.isFinite(listing.salaryMax)

  if (!hasMin && !hasMax) {
    return 'Not specified'
  }

  if (hasMin && hasMax) {
    if (listing.salaryMin === listing.salaryMax) {
      return formatSalaryValue(listing.salaryMin)
    }

    return `${formatSalaryValue(listing.salaryMin)} - ${formatSalaryValue(listing.salaryMax)}`
  }

  if (hasMin) {
    return `From ${formatSalaryValue(listing.salaryMin)}`
  }

  return `Up to ${formatSalaryValue(listing.salaryMax)}`
}

function buildJobsHref({ what, where, page }) {
  const params = new URLSearchParams()

  if (what) {
    params.set('what', what)
  }

  if (where) {
    params.set('where', where)
  }

  params.set('page', String(page))

  const query = params.toString()
  return query ? `/jobs?${query}` : '/jobs'
}

// This page displays the shared catalog, but the tracking action always creates
// a private application record tied to the current user.
export default function JobsClient({
  initialJobListings,
  initialApplications,
  initialCVProfiles,
  initialSearch = { what: '', where: '', page: 1 },
  sourceMeta = null,
  pagination = { page: 1, pageSize: 20, total: 0, totalPages: 0 },
}) {
  const [jobListings] = useState(initialJobListings)
  const [applications, setApplications] = useState(initialApplications)
  const [cvProfiles] = useState(initialCVProfiles)
  const [selectedCVProfileId, setSelectedCVProfileId] = useState(() => getDefaultCVProfileId(initialCVProfiles))
  const [feedback, setFeedback] = useState('')
  const [isPending, startTransition] = useTransition()
  const selectedCVProfile = useMemo(
    () => cvProfiles.find((profile) => profile._id === selectedCVProfileId) ?? null,
    [cvProfiles, selectedCVProfileId],
  )
  const canTrackJobs = cvProfiles.length > 0 && Boolean(selectedCVProfileId)
  const isLiveAdzuna = sourceMeta?.provider === 'adzuna' && sourceMeta?.fallbackUsed === false
  const isMongoFallback = sourceMeta?.fallbackUsed === true
  const currentPage = Math.max(1, Number.parseInt(pagination?.page, 10) || 1)
  const totalPages = Math.max(0, Number.parseInt(pagination?.totalPages, 10) || 0)
  const totalResults = Math.max(0, Number.parseInt(pagination?.total, 10) || 0)
  const pageSize = Math.max(1, Number.parseInt(pagination?.pageSize, 10) || 20)
  const showingFrom = totalResults === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const showingTo = totalResults === 0
    ? 0
    : Math.min(totalResults, (currentPage - 1) * pageSize + jobListings.length)
  const previousPageHref = buildJobsHref({
    what: initialSearch?.what,
    where: initialSearch?.where,
    page: Math.max(1, currentPage - 1),
  })
  const nextPageHref = buildJobsHref({
    what: initialSearch?.what,
    where: initialSearch?.where,
    page: currentPage + 1,
  })
  const firstPageHref = buildJobsHref({
    what: initialSearch?.what,
    where: initialSearch?.where,
    page: 1,
  })

  const trackedByListingId = useMemo(() => {
    // A map keeps repeated "already tracked?" lookups O(1) while rendering cards.
    return new Map(
      applications
        .filter((application) => application.jobListingId)
        .map((application) => [application.jobListingId, application]),
    )
  }, [applications])

  const handleTrackJob = (listingId) => {
    setFeedback('')

    if (!selectedCVProfileId) {
      setFeedback('Create or select a CV profile before tracking jobs.')
      return
    }

    startTransition(async () => {
      try {
        // Tracking a job is just a specialized job-application creation flow.
        const { application } = await requestJson('/api/job-applications', {
          method: 'POST',
          body: JSON.stringify({
            jobListingId: listingId,
            cvProfileId: selectedCVProfileId,
            status: 'saved',
          }),
        })

        setApplications((current) => [application, ...current])
        setFeedback(`Job saved using "${selectedCVProfile?.title ?? 'your selected profile'}".`)
      } catch (err) {
        setFeedback(err instanceof Error ? err.message : 'Unable to track this job.')
      }
    })
  }

  return (
    <div className="bg-background min-h-screen">
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span
              className={`inline-flex rounded-full px-4 py-2 text-sm font-medium ${
                isLiveAdzuna
                  ? 'bg-cyan-soft text-success-green'
                  : 'bg-blue-soft text-brand-blue'
              }`}
            >
              {isLiveAdzuna ? 'Live Adzuna Listings' : 'Shared Job Listings'}
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-navy md:text-5xl">
              Explore openings and move them into your tracker.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-text-muted">
              This catalog is shared for all users, while every tracked application stays private
              inside your Mongo-backed account and calendar flow.
            </p>
          </div>

          <Link
            href="/calendar"
            className="inline-flex items-center justify-center rounded-xl bg-brand-blue px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-blue-hover"
          >
            Open Calendar Tracker
          </Link>
        </div>

        {feedback ? (
          <p className="mt-6 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text-muted">
            {feedback}
          </p>
        ) : null}

        <section className="mt-6 rounded-[2rem] border border-border bg-surface p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-navy">Live search</h2>
              <p className="mt-1 max-w-2xl text-sm text-text-muted">
                Search Adzuna vacancies by role and location. If the provider is unavailable, the
                app falls back to the cached Mongo catalog.
              </p>
            </div>

            <div
              className={`rounded-2xl px-4 py-3 text-sm ${
                isMongoFallback
                  ? 'border border-orange-200 bg-orange-soft text-forge-orange'
                  : 'border border-border bg-background text-text-muted'
              }`}
            >
              <p className="font-semibold text-navy">
                {isLiveAdzuna ? 'Source: Live Adzuna API' : 'Source: Mongo cache'}
              </p>
              <p className="mt-1">
                Last refresh: {formatFetchDate(sourceMeta?.fetchedAt)}
                {sourceMeta?.country ? ` | Country: ${String(sourceMeta.country).toUpperCase()}` : ''}
              </p>
              {sourceMeta?.reason ? <p className="mt-1">{sourceMeta.reason}</p> : null}
            </div>
          </div>

          <form method="get" action="/jobs" className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr_auto_auto]">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                Role or keywords
              </span>
              <input
                type="text"
                name="what"
                defaultValue={initialSearch?.what ?? ''}
                placeholder="Frontend developer, data analyst..."
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-main outline-none focus:border-brand-blue"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                Location
              </span>
              <input
                type="text"
                name="where"
                defaultValue={initialSearch?.where ?? ''}
                placeholder="London, Remote..."
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-main outline-none focus:border-brand-blue"
              />
            </label>

            <input type="hidden" name="page" value="1" />

            <button
              type="submit"
              className="mt-6 rounded-xl bg-brand-blue px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-blue-hover"
            >
              Search jobs
            </button>

            <Link
              href="/jobs"
              className="mt-6 inline-flex items-center justify-center rounded-xl border border-border px-5 py-3 text-sm font-semibold text-text-muted transition-colors hover:border-brand-blue hover:text-brand-blue"
            >
              Clear
            </Link>
          </form>

          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-border bg-background px-4 py-4 text-sm text-text-muted md:flex-row md:items-center md:justify-between">
            <p>
              {totalResults > 0
                ? `Showing ${showingFrom}-${showingTo} of ${totalResults} listing${totalResults === 1 ? '' : 's'}.`
                : 'No listings available for the current search.'}
            </p>
            <p>
              Page {currentPage}
              {totalPages > 0 ? ` of ${totalPages}` : ''}
            </p>
          </div>
        </section>

        <div className="mt-6 rounded-[2rem] border border-border bg-surface p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-navy">Profile used for tracking</h2>
              <p className="mt-1 text-sm text-text-muted">
                Every saved job now records which professional CV profile you want to use.
              </p>
            </div>

            {cvProfiles.length > 0 ? (
              <label className="block min-w-[280px]">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  CV Profile
                </span>
                <select
                  value={selectedCVProfileId}
                  onChange={(event) => setSelectedCVProfileId(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-main outline-none focus:border-brand-blue"
                >
                  {cvProfiles.map((profile) => (
                    <option key={profile._id} value={profile._id}>
                      {buildCVProfileLabel(profile)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-background px-4 py-3 text-sm text-text-muted">
                No CV profiles yet.
                {' '}
                <Link href="/cv-assistant" className="font-semibold text-brand-blue hover:underline">
                  Create one in CV Assistant
                </Link>
                .
              </div>
            )}
          </div>
        </div>

        {jobListings.length === 0 ? (
          <section className="mt-8 rounded-[2rem] border border-dashed border-border bg-surface p-12 text-center">
            <h2 className="text-xl font-bold text-navy">No listings matched this search</h2>
            <p className="mt-2 text-sm text-text-muted">
              Try changing the job keywords or location, or clear the filters to explore more
              roles.
            </p>
          </section>
        ) : (
          <>
            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {jobListings.map((listing) => {
                const trackedApplication = trackedByListingId.get(listing._id)

                return (
                  <article
                    key={listing._id}
                    className="rounded-[2rem] border border-border bg-surface p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span className="inline-flex rounded-full bg-cyan-soft px-3 py-1 text-xs font-semibold text-success-green">
                          {listing.category || 'General'}
                        </span>
                        <h2 className="mt-4 text-xl font-bold text-navy">{listing.title}</h2>
                        <p className="mt-2 text-sm font-semibold text-text-main">{listing.company}</p>
                        <p className="mt-1 text-sm text-text-muted">{listing.location || 'Location not specified'}</p>
                      </div>

                      <span className="rounded-full bg-blue-soft px-3 py-1 text-xs font-semibold text-brand-blue">
                        {listing.source}
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-text-muted">{listing.description}</p>

                    {listing.requiredSkills?.length ? (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {listing.requiredSkills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-text-muted"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-6 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Estimated salary</p>
                        <p className="mt-2 text-sm font-semibold text-navy">
                          {formatSalaryRange(listing)}
                        </p>
                      </div>

                      {trackedApplication ? (
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${jobStatusStyles[trackedApplication.status]}`}
                        >
                          {jobStatusLabels[trackedApplication.status]}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => handleTrackJob(listing._id)}
                        disabled={isPending || Boolean(trackedApplication) || !canTrackJobs}
                        className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-blue-hover disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {trackedApplication
                          ? 'Already tracked'
                          : canTrackJobs
                            ? 'Track Job'
                            : 'Create CV profile first'}
                      </button>

                      {listing.url ? (
                        <a
                          href={listing.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-muted transition-colors hover:border-brand-blue hover:text-brand-blue"
                        >
                          Open Listing
                        </a>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>

            {totalPages > 1 ? (
              <nav
                aria-label="Job listings pagination"
                className="mt-8 flex flex-col gap-4 rounded-[2rem] border border-border bg-surface p-5 shadow-sm md:flex-row md:items-center md:justify-between"
              >
                <p className="text-sm text-text-muted">
                  Browse more real listings from Adzuna without losing your current search.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  {currentPage > 1 ? (
                    <Link
                      href={firstPageHref}
                      className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-muted transition-colors hover:border-brand-blue hover:text-brand-blue"
                    >
                      First page
                    </Link>
                  ) : null}

                  {currentPage > 1 ? (
                    <Link
                      href={previousPageHref}
                      className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-muted transition-colors hover:border-brand-blue hover:text-brand-blue"
                    >
                      Previous
                    </Link>
                  ) : (
                    <span className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-muted opacity-50">
                      Previous
                    </span>
                  )}

                  <span className="rounded-xl bg-blue-soft px-4 py-2 text-sm font-semibold text-brand-blue">
                    Page {currentPage} of {totalPages}
                  </span>

                  {currentPage < totalPages ? (
                    <Link
                      href={nextPageHref}
                      className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-hover"
                    >
                      Next
                    </Link>
                  ) : (
                    <span className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white opacity-50">
                      Next
                    </span>
                  )}
                </div>
              </nav>
            ) : null}
          </>
        )}
      </section>
    </div>
  )
}
