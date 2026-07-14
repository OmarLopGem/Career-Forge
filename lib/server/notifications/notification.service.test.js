import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createUser } from '@/lib/server/auth/users.repository.js'
import { hashPassword } from '@/lib/server/auth/password.js'
import { clearMongo, startMongo, stopMongo } from '@/lib/cv-assistant/test/mongo-helpers.js'
import {
  serviceCreateAdminNotification,
  serviceListAdminNotifications,
  serviceListMyNotifications,
} from './notification.service.js'

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

describe('notification.service', () => {
  it('lets admins create notifications for all users', async () => {
    const admin = await createScopedUser('admin@example.com', 'admin')
    void admin

    const result = await serviceCreateAdminNotification({
      title: 'System maintenance',
      message: 'Career Forge will be updated tonight.',
      level: 'warning',
    })

    expect(result.notification.title).toBe('System maintenance')
    expect(result.notification.audience).toBe('all')
  })

  it('shows active notifications to authenticated users', async () => {
    await createScopedUser('admin@example.com', 'admin')
    await serviceCreateAdminNotification({
      title: 'Interview prep tip',
      message: 'Review your saved QA profile before tomorrow.',
      level: 'info',
    })

    await createScopedUser('user@example.com', 'user')
    const result = await serviceListMyNotifications()

    expect(result.notifications).toHaveLength(1)
    expect(result.notifications[0].title).toBe('Interview prep tip')
  })

  it('lets admins review the full notification history', async () => {
    await createScopedUser('admin@example.com', 'admin')
    await serviceCreateAdminNotification({
      title: 'Release note',
      message: 'New profile hub is live.',
      level: 'success',
    })

    const result = await serviceListAdminNotifications()
    expect(result.notifications).toHaveLength(1)
  })
})
