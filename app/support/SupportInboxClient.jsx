"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

const statusTabs = [
  { value: null, label: "All" },
  { value: "open", label: "Open" },
  { value: "answered", label: "Answered" },
  { value: "closed", label: "Closed" },
];

const MAX_SUBJECT_LENGTH = 120;
const MAX_BODY_LENGTH = 2000;

export default function SupportInboxClient({
  initialTickets = [],
  initialActiveCount = 0,
  activeLimit = 5,
  activeStatus = null,
}) {
  const router = useRouter();
  const [tickets, setTickets] = useState(initialTickets);
  const [activeCount, setActiveCount] = useState(initialActiveCount);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [, startTransition] = useTransition();

  const atLimit = activeCount >= activeLimit;

  function openModal() {
    if (atLimit) return;
    setSubject("");
    setBody("");
    setError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    if (submitting) return;
    setIsModalOpen(false);
  }

  function selectStatusTab(nextStatus) {
    const url = nextStatus ? `/support?status=${nextStatus}` : "/support";
    startTransition(() => router.push(url));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          payload?.error?.message ?? "We couldn't create the ticket. Please try again.";
        setError(message);
        if (payload?.error?.code === "TICKET_LIMIT_REACHED") {
          setActiveCount(activeLimit);
        }
        return;
      }

      const createdTicket = payload?.ticket;
      if (createdTicket) {
        const decorated = {
          ...createdTicket,
          lastMessagePreview: body,
          lastMessageAtFormatted: createdTicket.lastMessageAt,
          lastMessage: { body, authorRole: "user" },
        };
        setTickets((prev) => [decorated, ...prev]);
        setActiveCount((prev) => prev + 1);
      }

      setIsModalOpen(false);
      setSubject("");
      setBody("");

      if (createdTicket?._id) {
        startTransition(() => {
          router.push(`/support/${createdTicket._id}`);
        });
      } else {
        startTransition(() => router.refresh());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-border bg-surface p-5 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-blue">
              Support
            </p>
            <h1 className="mt-3 text-3xl font-bold text-navy">Your conversations</h1>
            <p className="mt-2 text-sm text-text-muted">
              Ask a question or follow up with the team. Each ticket is a private thread.
            </p>
          </div>
          <button
            type="button"
            onClick={openModal}
            disabled={atLimit}
            className="rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-blue-hover hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            + New ticket
          </button>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {statusTabs.map((tab) => {
            const isActive = (tab.value ?? "") === (activeStatus ?? "");
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => selectStatusTab(tab.value)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
                  isActive
                    ? "border-brand-blue bg-blue-soft text-brand-blue"
                    : "border-border bg-background text-text-muted hover:text-brand-blue"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>
            <span className="font-semibold text-navy">{activeCount}</span> / {activeLimit} open tickets
          </span>
          {atLimit ? (
            <span className="text-xs font-semibold text-forge-orange">
              Limit reached. Close or wait for a reply before opening a new one.
            </span>
          ) : null}
        </div>

        {tickets.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-border bg-background p-8 text-center text-sm text-text-muted">
            {activeStatus
              ? "No tickets match this filter."
              : "You don\u2019t have any tickets yet. Open one to get started."}
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {tickets.map((ticket) => (
              <li key={ticket._id}>
                <Link
                  href={`/support/${ticket._id}`}
                  className="block rounded-3xl border border-border bg-background p-5 transition-colors hover:border-brand-blue"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-navy">{ticket.subject}</p>
                      <p className="mt-2 text-sm text-text-muted">
                        {ticket.lastMessagePreview || "No messages yet."}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-xs">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          statusPillStyles[ticket.status] ?? statusPillStyles.open
                        }`}
                      >
                        {statusLabels[ticket.status] ?? ticket.status}
                      </span>
                      <span className="text-text-muted">{ticket.lastMessageAtFormatted}</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 px-4 py-10">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-lg rounded-3xl border border-border bg-surface p-8 shadow-xl"
          >
            <h2 className="text-xl font-bold text-navy">Open a new ticket</h2>
            <p className="mt-2 text-sm text-text-muted">
              Tell us what&apos;s going on. We&apos;ll reply here.
            </p>

            {error ? (
              <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </p>
            ) : null}

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-navy">Subject</span>
                <input
                  type="text"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  maxLength={MAX_SUBJECT_LENGTH}
                  required
                  className="field mt-2"
                  placeholder="Short summary"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-navy">Message</span>
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  maxLength={MAX_BODY_LENGTH}
                  required
                  rows={5}
                  className="field mt-2 min-h-[140px]"
                  placeholder="Describe what you need help with"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-muted transition-all duration-300 hover:text-brand-blue hover:bg-cyan-soft disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-blue-hover disabled:opacity-60"
              >
                {submitting ? "Opening..." : "Open ticket"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
