"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestJsonWithoutBody } from "@/lib/job-tracker/client/api.js";

export default function AdminEmployersClient({ initialEmployers = [] }) {
  const router = useRouter();
  const [error, setError] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  const handleAction = async (employer, action) => {
    setError(null);
    setLoadingId(employer._id);
    try {
      await requestJsonWithoutBody(
        `/api/admin/employers/${employer._id}/${action}`,
        { method: "POST" },
      );
      router.refresh();
    } catch (err) {
      setError(err?.body?.error?.message || err?.message || "Failed to update employer");
    } finally {
      setLoadingId(null);
    }
  };

  const pending = initialEmployers.filter((employer) => employer.status === "pending");
  const verified = initialEmployers.filter((employer) => employer.status === "verified");
  const suspended = initialEmployers.filter((employer) => employer.status === "suspended");

  return (
    <main className="min-h-screen bg-background text-foreground px-5 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-navy">Employer Accounts</h1>
          <p className="text-text-muted">
            Verify new employers and review companies that publish jobs.
          </p>
        </header>

        {error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-navy">Pending verification</h2>
          {pending.length === 0 ? (
            <p className="mt-3 text-text-muted">No employers waiting for review.</p>
          ) : (
            <ul className="mt-4 grid gap-4">
              {pending.map((employer) => (
                <li
                  key={employer._id}
                  className="rounded-2xl border border-border bg-background/70 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-navy">{employer.name}</h3>
                      <p className="text-sm text-text-muted">
                        {employer.industry || "Industry not specified"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAction(employer, "verify")}
                      disabled={loadingId === employer._id}
                      className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-hover disabled:opacity-60"
                    >
                      Verify
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-navy">Verified</h2>
          {verified.length === 0 ? (
            <p className="mt-3 text-text-muted">No verified employers yet.</p>
          ) : (
            <ul className="mt-4 grid gap-4">
              {verified.map((employer) => (
                <li
                  key={employer._id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background/70 p-4"
                >
                  <div>
                    <h3 className="font-semibold text-navy">{employer.name}</h3>
                    <p className="text-sm text-text-muted">
                      {employer.industry || "Industry not specified"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAction(employer, "suspend")}
                    disabled={loadingId === employer._id}
                    className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-muted transition hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
                  >
                    Suspend
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {suspended.length > 0 ? (
          <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-navy">Suspended</h2>
            <ul className="mt-4 grid gap-4">
              {suspended.map((employer) => (
                <li
                  key={employer._id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background/70 p-4"
                >
                  <div>
                    <h3 className="font-semibold text-navy">{employer.name}</h3>
                    <p className="text-sm text-text-muted">
                      {employer.industry || "Industry not specified"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAction(employer, "verify")}
                    disabled={loadingId === employer._id}
                    className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-hover disabled:opacity-60"
                  >
                    Reactivate
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}