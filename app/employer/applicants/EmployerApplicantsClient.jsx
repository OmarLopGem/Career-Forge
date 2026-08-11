"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export default function EmployerApplicantsClient({
  currentUser,
  applicants = [],
  pagination = { page: 1, pageSize: 20, total: 0, totalPages: 0 },
  listings = [],
  activeListingId = "",
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilterChange = (event) => {
    const value = event.target.value;
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set("listingId", value);
    } else {
      params.delete("listingId");
    }
    params.delete("page");
    router.push(`/employer/applicants?${params.toString()}`);
  };

  const handlePageChange = (nextPage) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(nextPage));
    router.push(`/employer/applicants?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-background text-foreground px-5 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-navy">Applicants</h1>
            <p className="text-text-muted">
              People who applied to one of your listings.
            </p>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-text-muted">
              Filter by listing
            </label>
            <select
              value={activeListingId}
              onChange={handleFilterChange}
              className="mt-1 rounded-xl border border-border p-3"
            >
              <option value="">All my listings</option>
              {listings.map((listing) => (
                <option key={listing._id} value={listing._id}>
                  {listing.title}
                </option>
              ))}
            </select>
          </div>
        </header>

        {applicants.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-text-muted">
            No applicants yet for the selected filter.
          </p>
        ) : (
          <ul className="grid gap-4">
            {applicants.map(({ application, candidate }) => (
              <li
                key={application._id}
                className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-navy">
                      {candidate
                        ? `${candidate.firstName} ${candidate.lastName}`.trim() || candidate.email
                        : "Unknown candidate"}
                    </h2>
                    <p className="text-sm text-text-muted">
                      {candidate?.headline || "No headline"}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-text-muted">
                      {application.jobSnapshot?.title} · {application.jobSnapshot?.company}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      Status: {application.status} · Updated{" "}
                      {application.updatedAt
                        ? new Date(application.updatedAt).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/employer/applicants/${application._id}`}
                      className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-muted transition hover:bg-cyan-soft hover:text-brand-blue"
                    >
                      View profile
                    </Link>
                    <Link
                      href={`mailto:${candidate?.email ?? ""}`}
                      className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-hover"
                    >
                      Contact
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {pagination.totalPages > 1 ? (
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
              disabled={pagination.page <= 1}
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-muted transition hover:bg-cyan-soft hover:text-brand-blue disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-text-muted">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              onClick={() =>
                handlePageChange(Math.min(pagination.totalPages, pagination.page + 1))
              }
              disabled={pagination.page >= pagination.totalPages}
              className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-muted transition hover:bg-cyan-soft hover:text-brand-blue disabled:opacity-50"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}