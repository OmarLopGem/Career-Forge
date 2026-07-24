"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_BODY_LENGTH = 2000;

export default function AdminSupportThreadClient({
  ticketId,
  initialStatus,
  initialMessages = [],
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [status, setStatus] = useState(initialStatus);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [statusAction, setStatusAction] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          payload?.error?.message ?? "We couldn't send your reply. Please try again.";
        setError(message);
        return;
      }

      const sentMessage = payload?.message;
      if (sentMessage) {
        const createdAt = sentMessage.createdAt ?? new Date().toISOString();
        setMessages((prev) => [
          ...prev,
          {
            ...sentMessage,
            createdAtFormatted: new Date(createdAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      }

      if (payload?.ticket?.status) {
        setStatus(payload.ticket.status);
        router.refresh();
      }

      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(nextStatus) {
    setStatusAction(nextStatus);
    setError(null);
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          payload?.error?.message ?? "We couldn't update the ticket. Please try again.";
        setError(message);
        return;
      }

      if (payload?.ticket?.status) {
        setStatus(payload.ticket.status);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setStatusAction(null);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {status === "closed" ? (
            <button
              type="button"
              onClick={() => updateStatus("open")}
              disabled={statusAction !== null}
              className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-blue-hover disabled:opacity-60"
            >
              {statusAction === "open" ? "Reopening..." : "Reopen ticket"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => updateStatus("closed")}
              disabled={statusAction !== null}
              className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-text-muted transition-all duration-300 hover:text-brand-blue hover:bg-cyan-soft disabled:opacity-60"
            >
              {statusAction === "closed" ? "Closing..." : "Close ticket"}
            </button>
          )}
        </div>
      </div>

      <div className="flex max-h-[480px] flex-col gap-3 overflow-y-auto rounded-3xl border border-border bg-background p-5">
        {messages.length === 0 ? (
          <p className="text-sm text-text-muted">No messages yet.</p>
        ) : (
          messages.map((message) => {
            const isAdmin = message.authorRole === "admin";
            return (
              <div
                key={message._id}
                className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm ${
                    isAdmin
                      ? "bg-blue-soft text-navy"
                      : "bg-surface border border-border text-text-main"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  <p className="mt-2 text-[11px] uppercase tracking-wide text-text-muted">
                    {isAdmin ? "Support team" : "Member"} · {message.createdAtFormatted}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {status === "closed" ? (
        <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-text-muted">
          This ticket is closed. Reopen it to reply.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={MAX_BODY_LENGTH}
            rows={4}
            placeholder="Write a reply..."
            className="field min-h-[120px]"
          />

          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={submitting || !body.trim()}
              className="rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-blue-hover disabled:opacity-60"
            >
              {submitting ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}