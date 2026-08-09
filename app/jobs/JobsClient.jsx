'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { requestJson } from '@/lib/job-tracker/client/api.js'
import { jobStatusLabels, jobStatusStyles } from '@/lib/job-tracker/client/constants.js'

const DEFAULT_JOB_LISTINGS_PAGE_SIZE = 30

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

function buildPaginationItems(currentPage, totalPages) {
  if (totalPages <= 1) {
    return [1]
  }

  if (totalPages <= 6) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 'ellipsis', totalPages]
  }

  if (currentPage >= totalPages - 3) {
    return [1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
  }

  return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages]
}

function PaginationNav({ currentPage, totalPages, search, placement = 'top' }) {
  const pageItems = buildPaginationItems(currentPage, totalPages)
  const previousPageHref = buildJobsHref({
    what: search?.what,
    where: search?.where,
    page: Math.max(1, currentPage - 1),
  })
  const nextPageHref = buildJobsHref({
    what: search?.what,
    where: search?.where,
    page: Math.min(totalPages, currentPage + 1),
  })

  return (
    <nav
      aria-label={`Job listings pagination ${placement}`}
      className={`flex flex-col gap-4 ${
        placement === 'top'
          ? 'border-b border-border pb-4'
          : 'border-t border-border pt-4'
      } lg:flex-row lg:items-center lg:justify-between`}
    >
      <p className="text-sm font-medium text-text-muted">
        Page {currentPage} of {totalPages}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {currentPage > 1 ? (
          <Link
            href={previousPageHref}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-text-muted transition-colors hover:border-brand-blue hover:text-brand-blue"
          >
            Previous
          </Link>
        ) : (
          <span className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-text-muted opacity-50">
            Previous
          </span>
        )}

        {pageItems.map((item, index) => {
          if (item === 'ellipsis') {
            return (
              <span
                key={`ellipsis-${placement}-${index}`}
                className="px-2 text-sm font-semibold text-text-muted"
              >
                ...
              </span>
            )
          }

          if (item === currentPage) {
            return (
              <span
                key={`${placement}-page-${item}`}
                className="rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white"
              >
                {item}
              </span>
            )
          }

          return (
            <Link
              key={`${placement}-page-${item}`}
              href={buildJobsHref({
                what: search?.what,
                where: search?.where,
                page: item,
              })}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-text-muted transition-colors hover:border-brand-blue hover:text-brand-blue"
            >
              {item}
            </Link>
          )
        })}

        {currentPage < totalPages ? (
          <Link
            href={nextPageHref}
            className="rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-hover"
          >
            Next
          </Link>
        ) : (
          <span className="rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white opacity-50">
            Next
          </span>
        )}
      </div>
    </nav>
  )
}

// This page displays the shared catalog, but the tracking action always creates
// a private application record tied to the current user.
export default function JobsClient({
  initialJobListings,
  initialApplications,
  initialCVProfiles,
  initialSearch = { what: '', where: '', page: 1 },
  sourceMeta = null,
  pagination = { page: 1, pageSize: DEFAULT_JOB_LISTINGS_PAGE_SIZE, total: 0, totalPages: 0 },
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
  const totalPages = Math.max(jobListings.length > 0 ? 1 : 0, Number.parseInt(pagination?.totalPages, 10) || 0)

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
          <section className="mt-8">
            <PaginationNav
              currentPage={currentPage}
              totalPages={totalPages}
              search={initialSearch}
              placement="top"
            />

            <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {jobListings.map((listing) => {
                const trackedApplication = trackedByListingId.get(listing._id)

                return (
                  <article
                    key={listing._id}
                    className="border border-border bg-surface p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
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

            <div className="mt-8">
              <PaginationNav
                currentPage={currentPage}
                totalPages={totalPages}
                search={initialSearch}
                placement="bottom"
              />
            </div>
          </section>
        )}
      </section>
    </div>
  )
}
