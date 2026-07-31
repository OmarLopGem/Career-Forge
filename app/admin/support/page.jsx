import { redirect } from "next/navigation";
import { getCurrentUserFromRequest } from "@/lib/server/auth/current-user.js";
import { serviceListAdminTickets } from "@/lib/server/support/support.service.js";
import { listUsersByIds } from "@/lib/server/auth/users.repository.js";
import { serializeForClient } from "@/lib/server/serialize-for-client.js";
import AdminSupportInboxClient from "./AdminSupportInboxClient.jsx";

export const dynamic = "force-dynamic";

const ALLOWED_STATUS_FILTERS = ["open", "answered", "closed"];
const ALLOWED_SORT_FILTERS = ["recent", "oldest", "status", "subject"];

function formatPreview(value) {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (trimmed.length <= 100) return trimmed;
  return `${trimmed.slice(0, 97)}...`;
}

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

function decorateTickets(tickets, userMap) {
  return tickets.map((ticket) => {
    const owner = userMap.get(ticket.userId);
    return {
      ...ticket,
      lastMessagePreview: formatPreview(ticket.lastMessage?.body ?? ""),
      lastMessageAtFormatted: formatDateTime(ticket.lastMessageAt),
      ownerName: owner
        ? `${owner.firstName ?? ""} ${owner.lastName ?? ""}`.trim() || owner.email
        : "Unknown user",
      ownerEmail: owner?.email ?? "",
    };
  });
}

export default async function AdminSupportInboxPage({ searchParams }) {
  const currentUser = await getCurrentUserFromRequest();
  if (!currentUser) {
    redirect("/login?redirectTo=/admin/support");
  }
  if (currentUser.role !== "admin") {
    redirect("/support");
  }

  const params = (await searchParams) ?? {};
  const pickFirst = (value) => (Array.isArray(value) ? value[0] : value);
  const status = ALLOWED_STATUS_FILTERS.includes(pickFirst(params.status))
    ? pickFirst(params.status)
    : null;
  const sort = ALLOWED_SORT_FILTERS.includes(pickFirst(params.sort))
    ? pickFirst(params.sort)
    : "recent";
  const q = pickFirst(params.q) ?? "";
  const page = Math.max(1, Number.parseInt(pickFirst(params.page), 10) || 1);

  const result = await serviceListAdminTickets({
    status,
    sort,
    q,
    page,
  });

  const userIds = Array.from(new Set(result.tickets.map((ticket) => ticket.userId)));
  const users = await listUsersByIds(userIds);
  const userMap = new Map(users.map((user) => [user._id, user]));

  return (
    <AdminSupportInboxClient
      initialTickets={serializeForClient(decorateTickets(result.tickets, userMap))}
      pagination={serializeForClient(result.pagination)}
      stats={serializeForClient(result.stats)}
      activeStatus={status}
      activeSort={sort}
      initialQuery={q}
    />
  );
}
