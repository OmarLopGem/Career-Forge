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

// This page displays the shared catalog, but the tracking action always creates
// a private application record tied to the current user.
export default function JobsClient({ initialJobListings, initialApplications, initialCVProfiles }) {
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
            <span className="inline-flex rounded-full bg-blue-soft px-4 py-2 text-sm font-medium text-brand-blue">
              Shared Job Listings
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-navy md:text-5xl">
              Explore openings and move them into your tracker.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-text-muted">
              This catalog is global for all users, while every tracked application stays
              private inside your Mongo-backed account and calendar flow.
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
                      {listing.category}
                    </span>
                    <h2 className="mt-4 text-xl font-bold text-navy">{listing.title}</h2>
                    <p className="mt-2 text-sm font-semibold text-text-main">{listing.company}</p>
                    <p className="mt-1 text-sm text-text-muted">{listing.location}</p>
                  </div>

                  <span className="rounded-full bg-blue-soft px-3 py-1 text-xs font-semibold text-brand-blue">
                    {listing.source}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-text-muted">{listing.description}</p>

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

                <div className="mt-6 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-text-muted">Estimated salary</p>
                    <p className="mt-2 text-sm font-semibold text-navy">
                      {listing.salaryMin && listing.salaryMax
                        ? `$${listing.salaryMin.toLocaleString()} - $${listing.salaryMax.toLocaleString()}`
                        : 'Not specified'}
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
                    {trackedApplication ? 'Already tracked' : canTrackJobs ? 'Track Job' : 'Create CV profile first'}
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
      </section>
    </div>
  )
}
