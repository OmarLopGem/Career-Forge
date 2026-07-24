import { redirect } from 'next/navigation'
import { getCurrentUserFromRequest } from '@/lib/server/auth/current-user.js'
import {
  serviceCountActiveTickets,
  serviceListMyTickets,
} from '@/lib/server/support/support.service.js'
import SupportInboxClient from './SupportInboxClient.jsx'

export const dynamic = 'force-dynamic'

const ALLOWED_STATUS_FILTERS = ['open', 'answered', 'closed']

function formatPreview(value) {
  if (!value) return ''
  const trimmed = String(value).trim()
  if (trimmed.length <= 120) return trimmed
  return `${trimmed.slice(0, 117)}...`
}

function formatDate(value) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function decorateTicket(ticket) {
  return {
    ...ticket,
    lastMessagePreview: formatPreview(ticket.lastMessage?.body ?? ''),
    lastMessageAtFormatted: formatDate(ticket.lastMessageAt),
  }
}

export default async function SupportInboxPage({ searchParams }) {
  const currentUser = await getCurrentUserFromRequest()
  if (!currentUser) {
    redirect('/login?redirectTo=/support')
  }

  const params = (await searchParams) ?? {}
  const rawStatus = Array.isArray(params.status) ? params.status[0] : params.status
  const status = ALLOWED_STATUS_FILTERS.includes(rawStatus) ? rawStatus : null

  const [{ tickets }, { count: activeCount }] = await Promise.all([
    serviceListMyTickets({ status }),
    serviceCountActiveTickets(),
  ])
  const decorated = tickets.map(decorateTicket)

  return (
    <SupportInboxClient
      initialTickets={decorated}
      initialActiveCount={activeCount}
      activeLimit={5}
      activeStatus={status}
    />
  )
}