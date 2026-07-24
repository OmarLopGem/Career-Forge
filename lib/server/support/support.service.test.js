import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ObjectId } from 'mongodb'
import { AppServiceError } from '@/lib/server/api-error.js'
import { createUser } from '@/lib/server/auth/users.repository.js'
import { hashPassword } from '@/lib/server/auth/password.js'
import { clearMongo, startMongo, stopMongo } from '@/lib/cv-assistant/test/mongo-helpers.js'
import { getDb } from '@/lib/cv-assistant/server/mongo.js'
import {
  serviceCreateTicket,
  serviceGetTicket,
  serviceGetTicketStats,
  serviceListAdminTickets,
  serviceListAllTickets,
  serviceListMyTickets,
  serviceReplyToTicket,
  serviceUpdateTicketStatus,
} from './support.service.js'
import { serviceListMyNotifications } from '@/lib/server/notifications/notification.service.js'
import { SUPPORT_MESSAGES_COLLECTION } from './support-message.repository.js'
import { SUPPORT_TICKETS_COLLECTION } from './support-ticket.repository.js'
import { NOTIFICATIONS_COLLECTION } from '@/lib/server/notifications/notification.repository.js'

beforeAll(async () => {
  await startMongo()
}, 60000)

afterAll(async () => {
  await stopMongo()
})

beforeEach(async () => {
  await clearMongo()
  delete process.env.MOCK_USER_ID
})

async function createScopedUser(email, role = 'user') {
  const user = await createUser({
    email,
    firstName: 'Test',
    lastName: role === 'admin' ? 'Admin' : 'User',
    passwordHash: await hashPassword('password123'),
    role,
    status: 'active',
  })
  process.env.MOCK_USER_ID = user._id
  return user
}

async function countCollection(name, filter = {}) {
  const db = await getDb()
  return db.collection(name).countDocuments(filter)
}

describe('support.service', () => {
  it('lets a user create a ticket with the first message persisted', async () => {
    const user = await createScopedUser('user@example.com', 'user')
    const result = await serviceCreateTicket({
      subject: 'Need help with my CV',
      body: 'I cannot save my profile changes.',
    })

    expect(result.ticket.status).toBe('open')
    expect(result.ticket.userId).toBe(user._id)
    expect(result.ticket.lastMessageBy).toBe('user')

    const ticketsCount = await countCollection(SUPPORT_TICKETS_COLLECTION)
    const messagesCount = await countCollection(SUPPORT_MESSAGES_COLLECTION, {
      ticketId: new ObjectId(result.ticket._id),
    })
    expect(ticketsCount).toBe(1)
    expect(messagesCount).toBe(1)
  })

  it('only returns the owner tickets when a user lists their inbox', async () => {
    const user = await createScopedUser('user@example.com', 'user')
    await serviceCreateTicket({ subject: 'My issue', body: 'first' })
    await serviceCreateTicket({ subject: 'My second issue', body: 'second' })

    const other = await createScopedUser('other@example.com', 'user')
    await serviceCreateTicket({ subject: 'Other issue', body: 'other body' })

    process.env.MOCK_USER_ID = user._id

    const { tickets } = await serviceListMyTickets()
    expect(tickets).toHaveLength(2)
    for (const ticket of tickets) {
      expect(ticket.userId).toBe(user._id)
    }
    expect(tickets.map((t) => t.subject).sort()).toEqual(['My issue', 'My second issue'])

    process.env.MOCK_USER_ID = other._id
    const { tickets: otherTickets } = await serviceListMyTickets()
    expect(otherTickets).toHaveLength(1)
    expect(otherTickets[0].subject).toBe('Other issue')
  })

  it('lists every ticket for admins', async () => {
    await createScopedUser('admin@example.com', 'admin')
    await createScopedUser('user-a@example.com', 'user')
    await serviceCreateTicket({ subject: 'From A', body: 'msg A' })

    await createScopedUser('user-b@example.com', 'user')
    await serviceCreateTicket({ subject: 'From B', body: 'msg B' })

    process.env.MOCK_USER_ID = (
      await createScopedUser('viewer-admin@example.com', 'admin')
    )._id

    const { tickets } = await serviceListAllTickets()
    const subjects = tickets.map((t) => t.subject).sort()
    expect(subjects).toEqual(['From A', 'From B'])
  })

  it('forbids non-admin users from listing all tickets', async () => {
    await createScopedUser('user@example.com', 'user')
    await expect(serviceListAllTickets()).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })

  it('moves status to answered when an admin replies to an open ticket', async () => {
    const user = await createScopedUser('user@example.com', 'user')
    const { ticket } = await serviceCreateTicket({
      subject: 'Hello',
      body: 'Need a hand',
    })

    process.env.MOCK_USER_ID = (
      await createScopedUser('admin@example.com', 'admin')
    )._id

    const { ticket: updatedTicket } = await serviceReplyToTicket(ticket._id, {
      body: 'Sure, what is the issue?',
    })

    expect(updatedTicket.status).toBe('answered')
    expect(updatedTicket.lastMessageBy).toBe('admin')
    expect(updatedTicket.userId).toBe(user._id)
  })

  it('moves status back to open when the user replies to an answered ticket', async () => {
    await createScopedUser('user@example.com', 'user')
    const { ticket } = await serviceCreateTicket({
      subject: 'Subject',
      body: 'Body',
    })

    process.env.MOCK_USER_ID = (
      await createScopedUser('admin@example.com', 'admin')
    )._id
    const { ticket: answeredTicket } = await serviceReplyToTicket(ticket._id, {
      body: 'Admin reply',
    })
    expect(answeredTicket.status).toBe('answered')

    process.env.MOCK_USER_ID = answeredTicket.userId
    const { ticket: reopened } = await serviceReplyToTicket(ticket._id, {
      body: 'User follow up',
    })
    expect(reopened.status).toBe('open')
    expect(reopened.lastMessageBy).toBe('user')
  })

  it('lets admin view any ticket', async () => {
    await createScopedUser('user@example.com', 'user')
    const { ticket } = await serviceCreateTicket({
      subject: 'Subject',
      body: 'Body',
    })

    process.env.MOCK_USER_ID = (
      await createScopedUser('admin@example.com', 'admin')
    )._id

    const { ticket: fetched, messages } = await serviceGetTicket(ticket._id)
    expect(fetched._id).toBe(ticket._id)
    expect(messages).toHaveLength(1)
  })

  it('returns 403 when a user tries to read another user ticket', async () => {
    await createScopedUser('owner@example.com', 'user')
    const { ticket } = await serviceCreateTicket({
      subject: 'Private',
      body: 'Private body',
    })

    const other = await createScopedUser('other@example.com', 'user')
    process.env.MOCK_USER_ID = other._id

    await expect(serviceGetTicket(ticket._id)).rejects.toBeInstanceOf(AppServiceError)
    await expect(serviceGetTicket(ticket._id)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })

  it('returns 403 when a user tries to reply to someone else ticket', async () => {
    await createScopedUser('owner@example.com', 'user')
    const { ticket } = await serviceCreateTicket({
      subject: 'Private',
      body: 'Body',
    })

    const other = await createScopedUser('intruder@example.com', 'user')
    process.env.MOCK_USER_ID = other._id

    await expect(
      serviceReplyToTicket(ticket._id, { body: 'hi' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('rejects an empty subject', async () => {
    await createScopedUser('user@example.com', 'user')
    await expect(
      serviceCreateTicket({ subject: '   ', body: 'Body' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', status: 400 })
  })

  it('rejects a body longer than 2000 characters', async () => {
    await createScopedUser('user@example.com', 'user')
    await expect(
      serviceCreateTicket({ subject: 'Subj', body: 'x'.repeat(2001) }),
    ).rejects.toMatchObject({ code: 'BODY_TOO_LONG', status: 400 })
  })

  it('rejects a subject longer than 120 characters', async () => {
    await createScopedUser('user@example.com', 'user')
    await expect(
      serviceCreateTicket({ subject: 'x'.repeat(121), body: 'Body' }),
    ).rejects.toMatchObject({ code: 'SUBJECT_TOO_LONG', status: 400 })
  })

  it('forbids admins from creating tickets', async () => {
    await createScopedUser('admin@example.com', 'admin')
    await expect(
      serviceCreateTicket({ subject: 'Subj', body: 'Body' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('rejects creating a 6th active ticket', async () => {
    const user = await createScopedUser('user@example.com', 'user')

    for (let i = 1; i <= 5; i += 1) {
      await serviceCreateTicket({ subject: `Subject ${i}`, body: `Body ${i}` })
    }

    process.env.MOCK_USER_ID = user._id
    await expect(
      serviceCreateTicket({ subject: 'One more', body: 'One more body' }),
    ).rejects.toMatchObject({ code: 'TICKET_LIMIT_REACHED', status: 429 })

    const total = await countCollection(SUPPORT_TICKETS_COLLECTION)
    expect(total).toBe(5)
  })

  it('lets an admin close a ticket', async () => {
    await createScopedUser('user@example.com', 'user')
    const { ticket } = await serviceCreateTicket({
      subject: 'Subject',
      body: 'Body',
    })

    process.env.MOCK_USER_ID = (
      await createScopedUser('admin@example.com', 'admin')
    )._id

    const { ticket: closed } = await serviceUpdateTicketStatus(ticket._id, {
      status: 'closed',
    })
    expect(closed.status).toBe('closed')
  })

  it('blocks the user from replying once a ticket is closed', async () => {
    const user = await createScopedUser('user@example.com', 'user')
    const { ticket } = await serviceCreateTicket({
      subject: 'Subject',
      body: 'Body',
    })

    process.env.MOCK_USER_ID = (
      await createScopedUser('admin@example.com', 'admin')
    )._id
    await serviceUpdateTicketStatus(ticket._id, { status: 'closed' })

    process.env.MOCK_USER_ID = user._id
    await expect(
      serviceReplyToTicket(ticket._id, { body: 'still need help' }),
    ).rejects.toMatchObject({ code: 'TICKET_CLOSED', status: 403 })
  })

  it('allows the user to reply again after the admin reopens the ticket', async () => {
    const user = await createScopedUser('user@example.com', 'user')
    const { ticket } = await serviceCreateTicket({
      subject: 'Subject',
      body: 'Body',
    })

    process.env.MOCK_USER_ID = (
      await createScopedUser('admin@example.com', 'admin')
    )._id
    await serviceUpdateTicketStatus(ticket._id, { status: 'closed' })
    await serviceUpdateTicketStatus(ticket._id, { status: 'open' })

    process.env.MOCK_USER_ID = user._id
    const { ticket: updated } = await serviceReplyToTicket(ticket._id, {
      body: 'thanks for reopening',
    })
    expect(updated.status).toBe('open')
  })

  it('creates a targeted notification when the admin replies', async () => {
    const user = await createScopedUser('user@example.com', 'user')
    const { ticket } = await serviceCreateTicket({
      subject: 'Help with billing',
      body: 'My invoice looks wrong.',
    })

    process.env.MOCK_USER_ID = (
      await createScopedUser('admin@example.com', 'admin')
    )._id

    await serviceReplyToTicket(ticket._id, {
      body: 'I checked your invoice, can you share the order id?',
    })

    const db = await getDb()
    const notifications = await db
      .collection(NOTIFICATIONS_COLLECTION)
      .find({ audience: 'user', targetUserId: String(user._id) })
      .toArray()
    expect(notifications).toHaveLength(1)
    expect(notifications[0].title).toBe(`Support: ${ticket.subject}`)
    expect(notifications[0].level).toBe('info')
    expect(notifications[0].link).toBe(`/support/${ticket._id}`)

    process.env.MOCK_USER_ID = user._id
    const { notifications: inbox } = await serviceListMyNotifications()
    expect(inbox.map((n) => n.title)).toContain(`Support: ${ticket.subject}`)
  })

  it('lets the user filter their inbox by status', async () => {
    const user = await createScopedUser('user@example.com', 'user')
    const { ticket: openTicket } = await serviceCreateTicket({
      subject: 'Open',
      body: 'still pending',
    })

    process.env.MOCK_USER_ID = (
      await createScopedUser('admin@example.com', 'admin')
    )._id
    await serviceUpdateTicketStatus(openTicket._id, { status: 'closed' })

    process.env.MOCK_USER_ID = user._id
    await serviceCreateTicket({ subject: 'Another open', body: 'ping' })

    const { tickets: openOnly } = await serviceListMyTickets({ status: 'open' })
    expect(openOnly).toHaveLength(1)
    expect(openOnly[0].subject).toBe('Another open')

    const { tickets: closedOnly } = await serviceListMyTickets({ status: 'closed' })
    expect(closedOnly).toHaveLength(1)
    expect(closedOnly[0].subject).toBe('Open')
  })

  it('searches admin tickets by subject and last message body', async () => {
    await createScopedUser('user-a@example.com', 'user')
    await serviceCreateTicket({ subject: 'Login is broken', body: 'cannot enter' })

    await createScopedUser('user-b@example.com', 'user')
    await serviceCreateTicket({
      subject: 'Invoice question',
      body: 'amount looks doubled',
    })

    process.env.MOCK_USER_ID = (
      await createScopedUser('admin@example.com', 'admin')
    )._id

    const bySubject = await serviceListAdminTickets({ q: 'login' })
    expect(bySubject.tickets).toHaveLength(1)
    expect(bySubject.tickets[0].subject).toBe('Login is broken')

    const byBody = await serviceListAdminTickets({ q: 'doubled' })
    expect(byBody.tickets).toHaveLength(1)
    expect(byBody.tickets[0].subject).toBe('Invoice question')

    const noMatch = await serviceListAdminTickets({ q: 'no-such-text' })
    expect(noMatch.tickets).toHaveLength(0)
    expect(noMatch.pagination.total).toBe(0)
  })

  it('paginates the admin inbox', async () => {
    const user = await createScopedUser('user@example.com', 'user')
    const admin = await createScopedUser('admin@example.com', 'admin')

    const created = []
    process.env.MOCK_USER_ID = user._id
    for (let i = 1; i <= 7; i += 1) {
      const { ticket } = await serviceCreateTicket({ subject: `T${i}`, body: `Body ${i}` })
      created.push(ticket._id)
      // Close to stay under the rate limit while we build up the corpus.
      process.env.MOCK_USER_ID = admin._id
      await serviceUpdateTicketStatus(ticket._id, { status: 'closed' })
      process.env.MOCK_USER_ID = user._id
    }

    process.env.MOCK_USER_ID = admin._id

    const page1 = await serviceListAdminTickets({ page: 1, pageSize: 3 })
    expect(page1.tickets).toHaveLength(3)
    expect(page1.pagination.total).toBe(7)
    expect(page1.pagination.totalPages).toBe(3)

    const page3 = await serviceListAdminTickets({ page: 3, pageSize: 3 })
    expect(page3.tickets).toHaveLength(1)
  })

  it('sorts the admin inbox by subject', async () => {
    const user = await createScopedUser('user@example.com', 'user')
    process.env.MOCK_USER_ID = user._id
    await serviceCreateTicket({ subject: 'Zeta', body: 'z' })
    await serviceCreateTicket({ subject: 'Alpha', body: 'a' })
    await serviceCreateTicket({ subject: 'Mike', body: 'm' })

    process.env.MOCK_USER_ID = (
      await createScopedUser('admin@example.com', 'admin')
    )._id

    const result = await serviceListAdminTickets({ sort: 'subject' })
    expect(result.tickets.map((t) => t.subject)).toEqual(['Alpha', 'Mike', 'Zeta'])
  })

  it('returns ticket stats for the admin inbox', async () => {
    const user = await createScopedUser('user@example.com', 'user')
    process.env.MOCK_USER_ID = user._id
    const { ticket } = await serviceCreateTicket({ subject: 'S1', body: 'b' })
    await serviceCreateTicket({ subject: 'S2', body: 'b' })

    process.env.MOCK_USER_ID = (
      await createScopedUser('admin@example.com', 'admin')
    )._id

    const adminUser = await createScopedUser('admin2@example.com', 'admin')
    process.env.MOCK_USER_ID = adminUser._id
    await serviceReplyToTicket(ticket._id, { body: 'reply' })
    await serviceUpdateTicketStatus(ticket._id, { status: 'closed' })

    const { stats } = await serviceGetTicketStats()
    expect(stats.total).toBe(2)
    expect(stats.open).toBe(1)
    expect(stats.closed).toBe(1)
    expect(stats.answeredToday).toBe(0)
    expect(stats.closedToday).toBe(1)
  })
})