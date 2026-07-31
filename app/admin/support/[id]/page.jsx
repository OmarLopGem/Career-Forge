import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUserFromRequest } from "@/lib/server/auth/current-user.js";
import { serviceGetTicket } from "@/lib/server/support/support.service.js";
import { getUserById } from "@/lib/server/auth/users.repository.js";
import { serializeForClient } from "@/lib/server/serialize-for-client.js";
import AdminSupportThreadClient from "./AdminSupportThreadClient.jsx";

export const dynamic = "force-dynamic";

function formatDateTime(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function decorateMessage(message) {
  return {
    ...message,
    createdAtFormatted: formatDateTime(message.createdAt),
  };
}

export default async function AdminSupportThreadPage({ params }) {
  const { id } = await params;

  const currentUser = await getCurrentUserFromRequest();
  if (!currentUser) {
    redirect(`/login?redirectTo=/admin/support/${id}`);
  }
  if (currentUser.role !== "admin") {
    redirect("/support");
  }

  let result;
  try {
    result = await serviceGetTicket(id);
  } catch (err) {
    if (err?.code === "TICKET_NOT_FOUND") {
      notFound();
    }
    throw err;
  }

  const { ticket, messages } = result;
  const owner = await getUserById(ticket.userId);
  const decoratedMessages = messages.map(decorateMessage);

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-border bg-surface p-8 shadow-sm">
        <Link
          href="/admin/support"
          className="text-sm font-semibold text-brand-blue hover:underline"
        >
          ← Back to inbox
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-blue">
              Ticket
            </p>
            <h1 className="mt-2 text-2xl font-bold text-navy">{ticket.subject}</h1>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
              ticket.status === "open"
                ? "bg-orange-soft text-forge-orange"
                : ticket.status === "answered"
                ? "bg-cyan-soft text-success-green"
                : "bg-white text-text-muted border border-border"
            }`}
          >
            {ticket.status}
          </span>
        </div>

        {owner ? (
          <div className="mt-6 rounded-3xl border border-border bg-background p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Opened by
            </p>
            <p className="mt-2 text-base font-semibold text-navy">
              {owner.firstName} {owner.lastName}
            </p>
            <p className="text-sm text-text-muted">{owner.email}</p>
          </div>
        ) : null}

        <AdminSupportThreadClient
          ticketId={ticket._id}
          initialStatus={ticket.status}
          initialMessages={serializeForClient(decoratedMessages)}
        />
      </div>
    </main>
  );
}
