import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUserFromRequest } from "@/lib/server/auth/current-user.js";
import { serviceGetTicket } from "@/lib/server/support/support.service.js";
import SupportThreadClient from "./SupportThreadClient.jsx";

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

export default async function SupportThreadPage({ params }) {
  const { id } = await params;

  const currentUser = await getCurrentUserFromRequest();
  if (!currentUser) {
    redirect(`/login?redirectTo=/support/${id}`);
  }

  let result;
  try {
    result = await serviceGetTicket(id);
  } catch (err) {
    if (err?.code === "FORBIDDEN") {
      redirect("/support");
    }
    if (err?.code === "TICKET_NOT_FOUND") {
      notFound();
    }
    throw err;
  }

  const { ticket, messages } = result;
  const decoratedMessages = messages.map(decorateMessage);

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-border bg-surface p-8 shadow-sm">
        <Link
          href="/support"
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

        <SupportThreadClient
          ticketId={ticket._id}
          initialStatus={ticket.status}
          initialMessages={decoratedMessages}
          currentUserRole={currentUser.role === "admin" ? "admin" : "user"}
        />
      </div>
    </main>
  );
}