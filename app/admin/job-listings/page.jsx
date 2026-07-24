import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUserFromRequest } from '@/lib/server/auth/current-user.js'
import { serviceListAdminJobListings } from '@/lib/job-tracker/server/job-tracker.service.js'

export const dynamic = 'force-dynamic'

function formatSalary(listing) {
  if (!listing.salaryMin && !listing.salaryMax) return 'Not specified'
  if (listing.salaryMin && listing.salaryMax) {
    return `$${listing.salaryMin.toLocaleString()} – $${listing.salaryMax.toLocaleString()}`
  }
  return listing.salaryMin
    ? `From $${listing.salaryMin.toLocaleString()}`
    : `Up to $${listing.salaryMax.toLocaleString()}`
}

function formatDate(value) {
  if (!value) return 'Not provided'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

export default async function AdminJobListingsPage() {
  const currentUser = await getCurrentUserFromRequest()

  if (!currentUser) {
    redirect('/login?redirectTo=/admin/job-listings')
  }
  if (currentUser.role !== 'admin') {
    redirect('/calendar')
  }

  const { jobListings, summary } = await serviceListAdminJobListings()

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-[2rem] border border-border bg-surface p-8 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-blue">
                Catalog oversight
              </p>
              <h1 className="mt-3 text-4xl font-bold text-navy">Job listing monitor</h1>
              <p className="mt-3 max-w-2xl text-text-muted">
                Review the openings available to Career Forge users, including their source,
                category, skills, and publication status.
              </p>
            </div>
            <Link
              href="/jobs"
              className="inline-flex items-center justify-center rounded-xl border border-border px-5 py-3 text-sm font-semibold text-text-muted transition hover:border-brand-blue hover:text-brand-blue"
            >
              View member catalog
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <SummaryCard label="All listings" value={summary.total} tone="bg-blue-soft text-brand-blue" />
            <SummaryCard label="Visible to members" value={summary.active} tone="bg-cyan-soft text-success-green" />
            <SummaryCard label="Inactive" value={summary.inactive} tone="bg-orange-soft text-forge-orange" />
          </div>
        </section>

        {jobListings.length === 0 ? (
          <section className="rounded-[2rem] border border-dashed border-border bg-surface p-12 text-center">
            <h2 className="text-xl font-bold text-navy">No job listings yet</h2>
            <p className="mt-2 text-sm text-text-muted">Seed or import a listing to monitor it here.</p>
          </section>
        ) : (
          <section className="overflow-hidden rounded-[2rem] border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-6 py-5">
              <h2 className="text-xl font-bold text-navy">All listings</h2>
            </div>
            <div className="divide-y divide-border">
              {jobListings.map((listing) => (
                <article key={listing._id} className="p-6">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-soft px-3 py-1 text-xs font-semibold text-brand-blue">
                          {listing.category || 'Uncategorized'}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            listing.isActive
                              ? 'bg-cyan-soft text-success-green'
                              : 'bg-orange-soft text-forge-orange'
                          }`}
                        >
                          {listing.isActive ? 'Visible' : 'Inactive'}
                        </span>
                      </div>
                      <h3 className="mt-4 text-2xl font-bold text-navy">{listing.title}</h3>
                      <p className="mt-1 text-sm font-semibold text-text-main">{listing.company}</p>
                      <p className="mt-1 text-sm text-text-muted">{listing.location || 'Location not provided'}</p>
                      {listing.description ? (
                        <p className="mt-4 max-w-3xl text-sm leading-6 text-text-muted">
                          {listing.description}
                        </p>
                      ) : null}
                    </div>

                    <dl className="grid min-w-72 gap-3 rounded-2xl border border-border bg-background p-4 text-sm sm:grid-cols-2 xl:grid-cols-1">
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-text-muted">Source</dt>
                        <dd className="mt-1 font-semibold text-navy">{listing.source || 'Not provided'}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-text-muted">Salary</dt>
                        <dd className="mt-1 font-semibold text-navy">{formatSalary(listing)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-[0.15em] text-text-muted">Posted</dt>
                        <dd className="mt-1 font-semibold text-navy">{formatDate(listing.postedAt)}</dd>
                      </div>
                    </dl>
                  </div>

                  {listing.requiredSkills?.length ? (
                    <div className="mt-5 flex flex-wrap gap-2">
                      {listing.requiredSkills.map((skill) => (
                        <span key={skill} className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-text-muted">
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

function SummaryCard({ label, value, tone }) {
  return (
    <div className={`rounded-2xl p-5 ${tone}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em]">{label}</p>
      <p className="mt-3 text-3xl font-bold">{value}</p>
    </div>
  )
}
