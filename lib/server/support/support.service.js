import { AppServiceError } from '@/lib/server/api-error.js'
import { requireAdminUser, requireCurrentUser } from '@/lib/server/auth/current-user.js'
import { toObjectId } from '@/lib/server/object-id.js'
import {
  countActiveTicketsByUser,
  countTickets,
  createTicket,
  getTicketById,
  getTicketStats,
  listAllTickets,
  listTicketsByUser,
  searchTicketsForAdmin,
  TICKET_STATUSES,
  updateTicketAfterMessage,
  updateTicketStatus,
} from './support-ticket.repository.js'
import {
  createMessage,
  findTicketIdsByLastMessageMatch,
  listMessagesByTicket,
  listLastMessageByTickets,
} from './support-message.repository.js'
import {
  serviceCreateTicketNotification,
} from '@/lib/server/notifications/notification.service.js'

const MAX_SUBJECT_LENGTH = 120
const MAX_BODY_LENGTH = 2000
const MAX_ACTIVE_TICKETS_PER_USER = 5
const TICKET_NOTIFICATION_PREVIEW_LENGTH = 120
const MAX_SEARCH_QUERY_LENGTH = 50
const ADMIN_PAGE_SIZE_DEFAULT = 20
const ADMIN_PAGE_SIZE_MAX = 100

const ALLOWED_SORT_OPTIONS = ['recent', 'oldest', 'status', 'subject']

function sanitizeString(value, fieldName) {
  const normalized = String(value ?? '').trim()
  if (!normalized) {
    throw new AppServiceError(`${fieldName} is required.`, 'VALIDATION_ERROR', 400)
  }
  return normalized
}

function sanitizeSearchQuery(value) {
  if (value === undefined || value === null) return null
  const normalized = String(value).trim().slice(0, MAX_SEARCH_QUERY_LENGTH)
  return normalized || null
}

function sanitizeSortOption(value) {
  const normalized = String(value ?? 'recent').trim().toLowerCase()
  return ALLOWED_SORT_OPTIONS.includes(normalized) ? normalized : 'recent'
}

function parsePositiveInt(value, fallback, max) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  if (typeof max === 'number') return Math.min(parsed, max)
  return parsed
}

function sanitizeSubject(value) {
  const subject = sanitizeString(value, 'Subject')
  if (subject.length > MAX_SUBJECT_LENGTH) {
    throw new AppServiceError(
      `Subject must be ${MAX_SUBJECT_LENGTH} characters or fewer.`,
      'SUBJECT_TOO_LONG',
      400,
    )
  }
  return subject
}

function sanitizeBody(value) {
  const body = sanitizeString(value, 'Message')
  if (body.length > MAX_BODY_LENGTH) {
    throw new AppServiceError(
      `Message must be ${MAX_BODY_LENGTH} characters or fewer.`,
      'BODY_TOO_LONG',
      400,
    )
  }
  return body
}

function resolveRole(currentUser) {
  if (!currentUser) return null
  if (currentUser.role === 'admin') return 'admin'
  return 'user'
}

function nextStatusOnReply(currentStatus, authorRole) {
  if (currentStatus === 'closed') return currentStatus
  if (authorRole === 'admin' && currentStatus === 'open') return 'answered'
  if (authorRole === 'user' && currentStatus === 'answered') return 'open'
  return currentStatus
}

function sanitizeStatus(value) {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!TICKET_STATUSES.includes(normalized)) {
    throw new AppServiceError(
      'Status must be open, answered or closed.',
      'INVALID_TICKET_STATUS',
      400,
    )
  }
  return normalized
}

export async function serviceCreateTicket(input) {
  const currentUser = await requireCurrentUser()
  if (currentUser.role === 'admin') {
    throw new AppServiceError(
      'Admins cannot create support tickets.',
      'FORBIDDEN',
      403,
    )
  }

  const subject = sanitizeSubject(input.subject)
  const body = sanitizeBody(input.body)

  const activeCount = await countActiveTicketsByUser(currentUser._id)
  if (activeCount >= MAX_ACTIVE_TICKETS_PER_USER) {
    throw new AppServiceError(
      `You can have at most ${MAX_ACTIVE_TICKETS_PER_USER} open tickets. Please close or wait for a response before opening a new one.`,
      'TICKET_LIMIT_REACHED',
      429,
    )
  }

  const ticket = await createTicket({
    userId: String(currentUser._id),
    subject,
    lastMessageBy: 'user',
  })

  const ticketObjectId = toObjectId(ticket._id)
  if (!ticketObjectId) {
    throw new AppServiceError('Ticket creation failed.', 'INTERNAL_ERROR', 500)
  }

  await createMessage({
    ticketId: ticketObjectId,
    authorId: currentUser._id,
    authorRole: 'user',
    body,
  })

  return { ticket }
}

export async function serviceListMyTickets(input = {}) {
  const currentUser = await requireCurrentUser()
  const status = typeof input.status === 'string' && TICKET_STATUSES.includes(input.status)
    ? input.status
    : null

  let tickets = await listTicketsByUser(currentUser._id)
  if (status) {
    tickets = tickets.filter((ticket) => ticket.status === status)
  }
  const lastMessages = await listLastMessageByTickets(tickets.map((t) => t._id))
  const lastMessageByTicket = new Map(lastMessages.map((msg) => [msg.ticketId, msg]))
  return {
    tickets: tickets.map((ticket) => ({
      ...ticket,
      lastMessage: lastMessageByTicket.get(ticket._id) ?? null,
    })),
  }
}

export async function serviceListAllTickets(input = {}) {
  await requireAdminUser()
  const status = typeof input.status === 'string' ? input.status : undefined
  const tickets = await listAllTickets({ status })
  const lastMessages = await listLastMessageByTickets(tickets.map((t) => t._id))
  const lastMessageByTicket = new Map(lastMessages.map((msg) => [msg.ticketId, msg]))
  return {
    tickets: tickets.map((ticket) => ({
      ...ticket,
      lastMessage: lastMessageByTicket.get(ticket._id) ?? null,
    })),
  }
}

export async function serviceListAdminTickets(input = {}) {
  await requireAdminUser()

  const q = sanitizeSearchQuery(input.q)
  const status = typeof input.status === 'string' && TICKET_STATUSES.includes(input.status)
    ? input.status
    : null
  const sort = sanitizeSortOption(input.sort)
  const userId = typeof input.userId === 'string' && input.userId ? input.userId : null
  const page = parsePositiveInt(input.page, 1)
  const pageSize = parsePositiveInt(input.pageSize, ADMIN_PAGE_SIZE_DEFAULT, ADMIN_PAGE_SIZE_MAX)
  const skip = (page - 1) * pageSize

  let candidateIds = null
  if (q) {
    const subjectHits = (await searchTicketsForAdmin({ q })).map((t) => t._id)
    const lastMessageHits = (await findTicketIdsByLastMessageMatch(q)).map((id) =>
      String(id),
    )
    candidateIds = Array.from(new Set([...subjectHits, ...lastMessageHits]))
    if (candidateIds.length === 0) {
      return {
        tickets: [],
        pagination: { page, pageSize, total: 0, totalPages: 0 },
        stats: await getTicketStats(),
      }
    }
  }

  const filter = {
    status,
    userId,
    ticketIds: candidateIds,
    sort,
    limit: pageSize,
    skip,
  }

  const [tickets, total] = await Promise.all([
    listAllTickets(filter),
    countTickets({
      ...(status ? { status } : {}),
      ...(userId ? { userId } : {}),
      ...(candidateIds ? { _id: { $in: candidateIds.map((id) => toObjectId(id)).filter(Boolean) } } : {}),
    }),
  ])

  const lastMessages = await listLastMessageByTickets(tickets.map((t) => t._id))
  const lastMessageByTicket = new Map(lastMessages.map((msg) => [msg.ticketId, msg]))
  const stats = await getTicketStats()

  return {
    tickets: tickets.map((ticket) => ({
      ...ticket,
      lastMessage: lastMessageByTicket.get(ticket._id) ?? null,
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    stats,
  }
}

export async function serviceGetTicketStats() {
  await requireAdminUser()
  return { stats: await getTicketStats() }
}

export async function serviceGetTicket(ticketId) {
  const currentUser = await requireCurrentUser()
  const ticket = await getTicketById(ticketId)
  if (!ticket) {
    throw new AppServiceError('Ticket not found.', 'TICKET_NOT_FOUND', 404)
  }

  const role = resolveRole(currentUser)
  const isOwner = String(ticket.userId) === String(currentUser._id)
  if (role !== 'admin' && !isOwner) {
    throw new AppServiceError('You cannot view this ticket.', 'FORBIDDEN', 403)
  }

  const messages = await listMessagesByTicket(ticket._id)
  return { ticket, messages }
}

export async function serviceReplyToTicket(ticketId, input = {}) {
  const currentUser = await requireCurrentUser()
  const ticket = await getTicketById(ticketId)
  if (!ticket) {
    throw new AppServiceError('Ticket not found.', 'TICKET_NOT_FOUND', 404)
  }

  if (ticket.status === 'closed') {
    throw new AppServiceError(
      'This ticket is closed. Wait for an admin to reopen it.',
      'TICKET_CLOSED',
      403,
    )
  }

  const role = resolveRole(currentUser)
  const isOwner = String(ticket.userId) === String(currentUser._id)
  if (role !== 'admin' && !isOwner) {
    throw new AppServiceError('You cannot reply to this ticket.', 'FORBIDDEN', 403)
  }

  const body = sanitizeBody(input.body)
  const ticketObjectId = toObjectId(ticket._id)
  if (!ticketObjectId) {
    throw new AppServiceError('Ticket not found.', 'TICKET_NOT_FOUND', 404)
  }
  const message = await createMessage({
    ticketId: ticketObjectId,
    authorId: currentUser._id,
    authorRole: role,
    body,
  })

  const now = new Date().toISOString()
  const nextStatus = nextStatusOnReply(ticket.status, role)
  const updatedTicket = await updateTicketAfterMessage(ticket._id, {
    lastMessageAt: now,
    lastMessageBy: role,
    status: nextStatus,
  })

  if (role === 'admin') {
    try {
      await serviceCreateTicketNotification({
        ticketId: ticket._id,
        targetUserId: ticket.userId,
        title: `Support: ${ticket.subject}`,
        message: buildNotificationPreview(body),
        level: 'info',
      })
    } catch {
      // Notifications are best-effort and must never block the reply flow.
    }
  }

  return { ticket: updatedTicket ?? ticket, message }
}

export async function serviceCountActiveTickets() {
  const currentUser = await requireCurrentUser()
  return { count: await countActiveTicketsByUser(currentUser._id) }
}

export async function serviceUpdateTicketStatus(ticketId, input = {}) {
  await requireAdminUser()
  const ticket = await getTicketById(ticketId)
  if (!ticket) {
    throw new AppServiceError('Ticket not found.', 'TICKET_NOT_FOUND', 404)
  }

  const nextStatus = sanitizeStatus(input.status)
  if (nextStatus === ticket.status) {
    return { ticket }
  }

  const updatedTicket = await updateTicketStatus(ticket._id, nextStatus)
  return { ticket: updatedTicket ?? { ...ticket, status: nextStatus } }
}

function buildNotificationPreview(body) {
  const trimmed = String(body ?? '').trim()
  if (trimmed.length <= TICKET_NOTIFICATION_PREVIEW_LENGTH) return trimmed
  return `${trimmed.slice(0, TICKET_NOTIFICATION_PREVIEW_LENGTH - 3)}...`
}

export {
  MAX_SUBJECT_LENGTH,
  MAX_BODY_LENGTH,
  MAX_ACTIVE_TICKETS_PER_USER,
}