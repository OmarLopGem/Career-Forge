"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const statusPillStyles = {
  open: "bg-orange-soft text-forge-orange",
  answered: "bg-cyan-soft text-success-green",
  closed: "bg-white text-text-muted border border-border",
};

const statusLabels = {
  open: "Open",
  answered: "Answered",
  closed: "Closed",
};

const tabs = [
  { value: null, label: "All" },
  { value: "open", label: "Open" },
  { value: "answered", label: "Answered" },
  { value: "closed", label: "Closed" },
];

const sortOptions = [
  { value: "recent", label: "Most recent" },
  { value: "oldest", label: "Oldest first" },
  { value: "status", label: "By status" },
  { value: "subject", label: "By subject" },
];

function SummaryCard({ label, value, tone }) {
  return (
    <div
      className={`rounded-3xl border border-border bg-surface p-5 shadow-sm ${tone ?? ""}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold text-navy">{value}</p>
    </div>
  );
}

export default function AdminSupportInboxClient({
  initialTickets = [],
  pagination = { page: 1, pageSize: 20, total: 0, totalPages: 1 },
  stats = { open: 0, answered: 0, closed: 0, answeredToday: 0, closedToday: 0 },
  activeStatus = null,
  activeSort = "recent",
  initialQuery = "",
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function buildUrl(overrides = {}) {
    const params = new URLSearchParams();
    const next = {
      status: activeStatus,
      sort: activeSort,
      q: initialQuery,
      page: 1,
      ...overrides,
    };
    if (next.status) params.set("status", next.status);
    if (next.sort && next.sort !== "recent") params.set("sort", next.sort);
    if (next.q) params.set("q", next.q);
    if (next.page && next.page > 1) params.set("page", String(next.page));
    const queryString = params.toString();
    return queryString ? `/admin/support?${queryString}` : "/admin/support";
  }

  function selectTab(nextStatus) {
    router.push(buildUrl({ status: nextStatus ?? null, page: 1 }));
  }

  function changeSort(event) {
    router.push(buildUrl({ sort: event.target.value, page: 1 }));
  }

  function submitSearch(event) {
    event.preventDefault();
    router.push(buildUrl({ q: query.trim(), page: 1 }));
  }

  function goToPage(nextPage) {
    if (nextPage < 1 || nextPage > pagination.totalPages) return;
    router.push(buildUrl({ page: nextPage }));
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[2rem] border border-border bg-surface p-5 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-blue">
            Admin · Support
          </p>
          <h1 className="mt-3 text-3xl font-bold text-navy">Member conversations</h1>
          <p className="mt-2 text-sm text-text-muted">
            Review and respond to every ticket opened by your members.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Open tickets"
            value={stats.open}
            tone="bg-orange-soft/40"
          />
          <SummaryCard
            label="Answered today"
            value={stats.answeredToday}
            tone="bg-cyan-soft"
          />
          <SummaryCard
            label="Closed today"
            value={stats.closedToday}
            tone="bg-blue-soft/40"
          />
          <SummaryCard
            label="Avg first response"
            value="N/A"
            tone="bg-background"
          />
        </section>

        <section className="rounded-[2rem] border border-border bg-surface p-5 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const isActive = (tab.value ?? "") === (activeStatus ?? "");
                const count = tab.value
                  ? stats[tab.value] ?? 0
                  : stats.open + stats.answered + stats.closed;
                return (
                  <button
                    key={tab.label}
                    type="button"
                    onClick={() => selectTab(tab.value)}
                    className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
                      isActive
                        ? "border-brand-blue bg-blue-soft text-brand-blue"
                        : "border-border bg-background text-text-muted hover:text-brand-blue"
                    }`}
                  >
                    {tab.label}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${
                        isActive ? "bg-brand-blue text-white" : "bg-border text-text-muted"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <form
              onSubmit={submitSearch}
              className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto"
              role="search"
            >
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                maxLength={50}
                placeholder="Search subject or message"
                className="field w-full py-2 sm:max-w-xs"
                aria-label="Search tickets"
              />
              <button
                type="submit"
                className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-blue-hover"
              >
                Search
              </button>
            </form>

            <label className="flex w-full items-center gap-2 text-xs font-semibold text-text-muted sm:w-auto">
              <span>Sort</span>
              <select
                value={activeSort}
                onChange={changeSort}
                className="field min-w-0 flex-1 py-2 text-sm sm:w-auto"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {initialTickets.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-border bg-background p-8 text-center text-sm text-text-muted">
              No tickets match these filters.
            </div>
          ) : (
            <div className="mt-8 overflow-x-auto rounded-3xl border border-border">
              <table className="min-w-[760px] w-full divide-y divide-border text-sm">
                <thead className="bg-background text-left text-xs uppercase tracking-wide text-text-muted">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Subject</th>
                    <th className="px-5 py-3 font-semibold">Member</th>
                    <th className="px-5 py-3 font-semibold">Last message</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface">
                  {initialTickets.map((ticket) => (
                    <tr key={ticket._id} className="hover:bg-cyan-soft/40">
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/support/${ticket._id}`}
                          className="font-semibold text-navy hover:text-brand-blue"
                        >
                          {ticket.subject}
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-text-muted">
                        <p className="text-navy">{ticket.ownerName}</p>
                        <p className="text-xs">{ticket.ownerEmail}</p>
                      </td>
                      <td className="px-5 py-4 text-text-muted">
                        <p className="line-clamp-2">{ticket.lastMessagePreview || "—"}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            statusPillStyles[ticket.status] ?? statusPillStyles.open
                          }`}
                        >
                          {statusLabels[ticket.status] ?? ticket.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-text-muted">
                        {ticket.lastMessageAtFormatted}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination.totalPages > 1 ? (
            <div className="mt-6 flex flex-col gap-3 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
              <span>
                Page {pagination.page} of {pagination.totalPages} · {pagination.total} tickets
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => goToPage(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="rounded-xl border border-border bg-background px-3 py-2 font-semibold transition-colors hover:text-brand-blue disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => goToPage(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="rounded-xl border border-border bg-background px-3 py-2 font-semibold transition-colors hover:text-brand-blue disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
