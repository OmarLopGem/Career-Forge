import { AppServiceError } from '@/lib/server/api-error.js'
import { requireAdminUser, requireCurrentUser } from '@/lib/server/auth/current-user.js'
import {
  createNotification,
  listActiveNotifications,
  listNotifications,
} from './notification.repository.js'

const ALLOWED_LEVELS = ['info', 'success', 'warning', 'urgent']

function sanitizeString(value) {
  return String(value ?? '').trim()
}

function sanitizeLevel(value) {
  const normalized = sanitizeString(value).toLowerCase() || 'info'
  if (!ALLOWED_LEVELS.includes(normalized)) {
    throw new AppServiceError('Invalid notification level.', 'INVALID_NOTIFICATION_LEVEL', 400)
  }
  return normalized
}

function sanitizeOptionalDate(value) {
  const normalized = sanitizeString(value)
  if (!normalized) return null
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) {
    throw new AppServiceError('Invalid notification date.', 'INVALID_NOTIFICATION_DATE', 400)
  }
  return parsed.toISOString()
}

export async function serviceCreateAdminNotification(input) {
  const admin = await requireAdminUser()
  const title = sanitizeString(input.title)
  const message = sanitizeString(input.message)

  if (!title || !message) {
    throw new AppServiceError('Title and message are required.', 'VALIDATION_ERROR', 400)
  }

  const startsAt = sanitizeOptionalDate(input.startsAt) ?? new Date().toISOString()
  const expiresAt = sanitizeOptionalDate(input.expiresAt)

  if (expiresAt && expiresAt <= startsAt) {
    throw new AppServiceError(
      'Expiration must be after the start date.',
      'INVALID_NOTIFICATION_DATE_RANGE',
      400,
    )
  }

  const notification = await createNotification({
    createdByUserId: admin._id,
    title,
    message,
    level: sanitizeLevel(input.level),
    startsAt,
    expiresAt,
    isPublished: input.isPublished !== false,
  })

  return { notification }
}

export async function serviceListAdminNotifications() {
  await requireAdminUser()
  return { notifications: await listNotifications() }
}

export async function serviceListMyNotifications() {
  const currentUser = await requireCurrentUser()
  return { notifications: await listActiveNotifications({ forUserId: currentUser._id }) }
}

export async function serviceCreateUserNotification({
  createdByUserId,
  targetUserId,
  title,
  message,
  level,
  link = null,
}) {
  if (!targetUserId) {
    throw new AppServiceError('Target user is required.', 'VALIDATION_ERROR', 400)
  }

  const sanitizedTitle = sanitizeString(title)
  const sanitizedMessage = sanitizeString(message)
  if (!sanitizedTitle || !sanitizedMessage) {
    throw new AppServiceError('Title and message are required.', 'VALIDATION_ERROR', 400)
  }

  const notification = await createNotification({
    createdByUserId,
    audience: 'user',
    targetUserId: String(targetUserId),
    title: sanitizedTitle,
    message: sanitizedMessage,
    level: sanitizeLevel(level),
    link: typeof link === 'string' ? link : null,
  })

  return { notification }
}

export async function serviceCreateTicketNotification({
  ticketId,
  targetUserId,
  title,
  message,
  level,
}) {
  return serviceCreateUserNotification({
    targetUserId,
    title,
    message,
    level,
    link: ticketId ? `/support/${ticketId}` : null,
  })
}
