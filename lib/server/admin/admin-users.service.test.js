import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { getSessionModel } from '@/lib/db/models/session.js'
import { createProfile } from '@/lib/cv-assistant/server/cv-profile.repository.js'
import { createAnalysisFromDraft } from '@/lib/cv-assistant/server/cv-analysis.repository.js'
import { frontendProfile } from '@/lib/cv-assistant/test/fixtures.js'
import {
  serviceCreateAdminUser,
  serviceDeleteAdminUser,
  serviceGetAdminUserProfile,
  serviceListAdminRestrictedUsers,
  serviceListAdminUsers,
  serviceListAdminWarningUsers,
  serviceSetAdminUserStatus,
  serviceWarnAdminUser,
} from './admin-users.service.js'
import {
  createUser,
  getUserById,
} from '@/lib/server/auth/users.repository.js'
import { hashPassword } from '@/lib/server/auth/password.js'
import { serviceLogin } from '@/lib/server/auth/auth-service.js'
import { createSession } from '@/lib/server/auth/sessions.repository.js'
import {
  SESSION_DURATION_MS,
} from '@/lib/server/auth/session-cookie.js'
import { toApiErrorResponse } from '@/lib/server/api-error.js'
import { serviceCreateJobApplication, serviceCreateCalendarEvent } from '@/lib/job-tracker/server/job-tracker.service.js'
import { serviceRecordQuizResult } from '@/lib/server/progress/progress.service.js'
import { serviceCreateTicket } from '@/lib/server/support/support.service.js'
import { listUserWarnings } from './user-warning.repository.js'
import { serviceGetMyProfile } from '@/lib/server/profile/user-profile.service.js'
import { serviceListMyNotifications } from '@/lib/server/notifications/notification.service.js'
import { clearMongo, startMongo, stopMongo } from '@/lib/cv-assistant/test/mongo-helpers.js'

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

async function createTestUser(overrides = {}) {
  const passwordHash = await hashPassword('password123')

  return createUser({
    firstName: overrides.firstName ?? 'Test',
    lastName: overrides.lastName ?? 'User',
    email: overrides.email ?? 'test@example.com',
    passwordHash,
    role: overrides.role ?? 'user',
    status: overrides.status ?? 'active',
    dateOfBirth: overrides.dateOfBirth,
    headline: overrides.headline,
    phone: overrides.phone,
    location: overrides.location,
    linkedinUrl: overrides.linkedinUrl,
    githubUrl: overrides.githubUrl,
    portfolioUrl: overrides.portfolioUrl,
  })
}

describe('admin-users.service', () => {
  it('admin can list existing users', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    await createTestUser({
      firstName: 'Member',
      email: 'member@example.com',
    })
    process.env.MOCK_USER_ID = admin._id

    const result = await serviceListAdminUsers()

    expect(result.users).toHaveLength(2)
    expect(result.users.every((user) => !('passwordHash' in user))).toBe(true)
    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 10,
      total: 2,
      totalPages: 1,
    })
  })

  it('paginates results and returns correct pagination metadata', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    for (let i = 0; i < 12; i += 1) {
      await createTestUser({
        firstName: `Member${i}`,
        email: `member${i}@example.com`,
      })
    }
    process.env.MOCK_USER_ID = admin._id

    const firstPage = await serviceListAdminUsers({ page: 1, pageSize: 10 })
    expect(firstPage.users).toHaveLength(10)
    expect(firstPage.pagination).toEqual({
      page: 1,
      pageSize: 10,
      total: 13,
      totalPages: 2,
    })

    const secondPage = await serviceListAdminUsers({ page: 2, pageSize: 10 })
    expect(secondPage.users).toHaveLength(3)
    expect(secondPage.pagination.page).toBe(2)
  })

  it('clamps pageSize to the maximum allowed value', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    process.env.MOCK_USER_ID = admin._id

    const result = await serviceListAdminUsers({ pageSize: 9999 })

    expect(result.pagination.pageSize).toBe(100)
  })

  it('uses the default page size when inputs are invalid', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    process.env.MOCK_USER_ID = admin._id

    const result = await serviceListAdminUsers({ page: 'abc', pageSize: -5 })

    expect(result.pagination.page).toBe(1)
    expect(result.pagination.pageSize).toBe(10)
  })

  it('clamps page to the last available page when requested beyond range', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    for (let i = 0; i < 3; i += 1) {
      await createTestUser({
        firstName: `Member${i}`,
        email: `member${i}@example.com`,
      })
    }
    process.env.MOCK_USER_ID = admin._id

    const result = await serviceListAdminUsers({ page: 10, pageSize: 10 })

    expect(result.pagination.page).toBe(1)
    expect(result.pagination.totalPages).toBe(1)
  })

  it('reports zero pages when there are no users', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    await createTestUser({
      firstName: 'Disposable',
      email: 'disposable@example.com',
    })
    process.env.MOCK_USER_ID = admin._id

    const result = await serviceListAdminUsers({ page: 1, pageSize: 10 })
    expect(result.pagination.totalPages).toBe(1)
    expect(result.users).toHaveLength(2)
  })

  it('admin can create users manually', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    process.env.MOCK_USER_ID = admin._id

    const result = await serviceCreateAdminUser({
      firstName: 'Omar',
      lastName: 'Lopez',
      email: 'omar@example.com',
      password: 'password123',
      role: 'user',
    })

    expect(result.user.email).toBe('omar@example.com')
    expect(result.user.role).toBe('user')
  })

  it('creates each supported account type with its selected role', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    process.env.MOCK_USER_ID = admin._id

    const createdUser = await serviceCreateAdminUser({
      firstName: 'Career',
      lastName: 'User',
      email: 'career-user@example.com',
      password: 'password123',
      role: 'user',
    })
    const createdAdmin = await serviceCreateAdminUser({
      firstName: 'Career',
      lastName: 'Admin',
      email: 'career-admin@example.com',
      password: 'password123',
      role: 'admin',
    })

    expect(createdUser.user).toMatchObject({ role: 'user', status: 'active' })
    expect(createdAdmin.user).toMatchObject({ role: 'admin', status: 'active' })
    expect((await getUserById(createdUser.user._id)).role).toBe('user')
    expect((await getUserById(createdAdmin.user._id)).role).toBe('admin')
  })

  it('non-admin users cannot access admin services', async () => {
    const member = await createTestUser({
      firstName: 'Member',
      email: 'member@example.com',
      role: 'user',
    })
    process.env.MOCK_USER_ID = member._id

    try {
      await serviceListAdminUsers()
      throw new Error('expected forbidden error')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(403)
      expect(body.error.code).toBe('FORBIDDEN')
    }
  })

  it('admin can deactivate a user', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    const target = await createTestUser({
      firstName: 'Target',
      email: 'target@example.com',
      role: 'user',
    })
    process.env.MOCK_USER_ID = admin._id

    const result = await serviceSetAdminUserStatus(target._id, 'blocked')

    expect(result.user.status).toBe('blocked')

    const refetched = await getUserById(target._id)
    expect(refetched.status).toBe('blocked')
  })

  it('admin can reactivate a deactivated user', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    const target = await createTestUser({
      firstName: 'Target',
      email: 'target@example.com',
      role: 'user',
      status: 'blocked',
    })
    process.env.MOCK_USER_ID = admin._id

    const result = await serviceSetAdminUserStatus(target._id, 'active')

    expect(result.user.status).toBe('active')
  })

  it('non-admin cannot change user status', async () => {
    const member = await createTestUser({
      firstName: 'Member',
      email: 'member@example.com',
      role: 'user',
    })
    const target = await createTestUser({
      firstName: 'Target',
      email: 'target@example.com',
      role: 'user',
    })
    process.env.MOCK_USER_ID = member._id

    try {
      await serviceSetAdminUserStatus(target._id, 'blocked')
      throw new Error('expected forbidden')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(403)
      expect(body.error.code).toBe('FORBIDDEN')
    }
  })

  it('rejects invalid status string', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    const target = await createTestUser({
      firstName: 'Target',
      email: 'target@example.com',
      role: 'user',
    })
    process.env.MOCK_USER_ID = admin._id

    try {
      await serviceSetAdminUserStatus(target._id, 'banned')
      throw new Error('expected invalid status')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(400)
      expect(body.error.code).toBe('INVALID_STATUS')
    }
  })

  it('rejects invalid userId format', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    process.env.MOCK_USER_ID = admin._id

    try {
      await serviceSetAdminUserStatus('not-an-objectid', 'blocked')
      throw new Error('expected invalid user id')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(400)
      expect(body.error.code).toBe('INVALID_USER_ID')
    }
  })

  it('throws 404 when target user does not exist', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    process.env.MOCK_USER_ID = admin._id

    try {
      await serviceSetAdminUserStatus('507f1f77bcf86cd799439011', 'blocked')
      throw new Error('expected user not found')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(404)
      expect(body.error.code).toBe('USER_NOT_FOUND')
    }
  })

  it('prevents admin from deactivating themselves', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    process.env.MOCK_USER_ID = admin._id

    try {
      await serviceSetAdminUserStatus(admin._id, 'blocked')
      throw new Error('expected self-deactivation guard')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(400)
      expect(body.error.code).toBe('CANNOT_DEACTIVATE_SELF')
    }
  })

  it('protects the last active admin from being deactivated', async () => {
    const admin = await createTestUser({
      firstName: 'Solo',
      email: 'solo-admin@example.com',
      role: 'admin',
    })
    process.env.MOCK_USER_ID = admin._id

    try {
      await serviceSetAdminUserStatus(admin._id, 'blocked')
      throw new Error('expected last admin guard')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(400)
      expect(body.error.code).toBe('CANNOT_DEACTIVATE_SELF')
    }
  })

  it('allows deactivating an admin when another active admin exists', async () => {
    const adminA = await createTestUser({
      firstName: 'AdminA',
      email: 'admin-a@example.com',
      role: 'admin',
    })
    const adminB = await createTestUser({
      firstName: 'AdminB',
      email: 'admin-b@example.com',
      role: 'admin',
    })
    process.env.MOCK_USER_ID = adminA._id

    const result = await serviceSetAdminUserStatus(adminB._id, 'blocked')

    expect(result.user.status).toBe('blocked')
  })

  it('is idempotent when status already matches target', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    const target = await createTestUser({
      firstName: 'Target',
      email: 'target@example.com',
      role: 'user',
      status: 'active',
    })
    process.env.MOCK_USER_ID = admin._id
    const before = target.updatedAt

    await new Promise((resolve) => setTimeout(resolve, 5))

    const result = await serviceSetAdminUserStatus(target._id, 'active')

    expect(result.user.status).toBe('active')
    const refetched = await getUserById(target._id)
    expect(refetched.updatedAt).toBe(before)
  })

  it('deactivating a user deletes their sessions', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    const target = await createTestUser({
      firstName: 'Target',
      email: 'target@example.com',
      role: 'user',
    })
    process.env.MOCK_USER_ID = admin._id

    await createSession(target._id, SESSION_DURATION_MS)
    await createSession(target._id, SESSION_DURATION_MS)

    const Session = await getSessionModel()
    const beforeSessions = await Session.countDocuments({
      userId: target._id,
    })
    expect(beforeSessions).toBe(2)

    await serviceSetAdminUserStatus(target._id, 'blocked')

    const afterSessions = await Session.countDocuments({
      userId: target._id,
    })
    expect(afterSessions).toBe(0)
  })

  it('blocked users cannot log in', async () => {
    const passwordHash = await hashPassword('password123')
    const target = await createUser({
      firstName: 'Target',
      lastName: 'User',
      email: 'target@example.com',
      passwordHash,
      role: 'user',
      status: 'active',
    })
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    process.env.MOCK_USER_ID = admin._id

    await serviceSetAdminUserStatus(target._id, 'blocked')

    delete process.env.MOCK_USER_ID

    try {
      await serviceLogin({
        email: 'target@example.com',
        password: 'password123',
      })
      throw new Error('expected login to be rejected')
    } catch (err) {
      const { body, status } = toApiErrorResponse(err)
      expect(status).toBe(403)
      expect(body.error.code).toBe('ACCOUNT_INACTIVE')
    }
  })

  it('searches users by name and email', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    await createTestUser({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
    })
    await createTestUser({
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace@example.com',
    })
    process.env.MOCK_USER_ID = admin._id

    const result = await serviceListAdminUsers({ query: 'ada' })

    expect(result.users).toHaveLength(1)
    expect(result.users[0].email).toBe('ada@example.com')
    expect(result.pagination.total).toBe(1)
  })

  it('returns empty results when no users match the search query', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    await createTestUser({
      firstName: 'Bob',
      email: 'bob@example.com',
    })
    process.env.MOCK_USER_ID = admin._id

    const result = await serviceListAdminUsers({ query: 'nobody' })

    expect(result.users).toHaveLength(0)
    expect(result.pagination.total).toBe(0)
    expect(result.pagination.totalPages).toBe(0)
  })

  it('admin can warn a user and the user receives the notice in Profile Hub and Notifications', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    const target = await createTestUser({
      firstName: 'Target',
      email: 'target@example.com',
    })
    process.env.MOCK_USER_ID = admin._id

    const result = await serviceWarnAdminUser(
      target._id,
      'Please update your profile information before your next application.',
    )

    expect(result.warning.message).toContain('update your profile')
    expect(await listUserWarnings(target._id)).toHaveLength(1)

    process.env.MOCK_USER_ID = target._id
    const profile = await serviceGetMyProfile()
    const inbox = await serviceListMyNotifications()

    expect(profile.warnings[0].message).toBe(result.warning.message)
    expect(inbox.notifications).toHaveLength(1)
    expect(inbox.notifications[0]).toMatchObject({
      audience: 'user',
      targetUserId: target._id,
      title: 'Account warning (1 of 2)',
      message: result.warning.message,
      level: 'warning',
      link: '/profile',
    })
  })

  it('admin can view a user profile together with their private activity summary', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    const target = await createTestUser({
      firstName: 'Omar',
      lastName: 'Lopez',
      email: 'omar@example.com',
      headline: 'Frontend candidate',
      location: 'Kitchener, ON',
    })
    const otherUser = await createTestUser({
      firstName: 'Other',
      email: 'other@example.com',
    })

    const targetProfile = await createProfile({
      ...frontendProfile,
      userId: target._id,
      title: 'Frontend Profile',
    })
    await createProfile({
      ...frontendProfile,
      userId: otherUser._id,
      title: 'Other Profile',
    })

    process.env.MOCK_USER_ID = target._id
    await serviceCreateJobApplication({
      cvProfileId: targetProfile._id,
      status: 'applied',
      jobSnapshot: {
        title: 'Frontend Developer',
        company: 'Nova Apps',
        location: 'Remote',
        url: 'https://example.com/frontend',
        source: 'Manual',
      },
    })
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const futureEventDate = [
      tomorrow.getFullYear(),
      String(tomorrow.getMonth() + 1).padStart(2, '0'),
      String(tomorrow.getDate()).padStart(2, '0'),
    ].join('-')
    await serviceCreateCalendarEvent({
      scope: 'personal',
      type: 'reminder',
      eventDate: futureEventDate,
      title: 'Portfolio review',
      reminderEnabled: true,
    })
    await serviceRecordQuizResult({
      jobType: 'Frontend Developer',
      score: 8,
      correctCount: 4,
      totalQuestions: 5,
      passed: true,
      feedback: 'Strong React fundamentals.',
    })
    await serviceCreateTicket({
      subject: 'Need help with profile',
      body: 'I cannot figure out how to improve my resume summary.',
    })

    process.env.MOCK_USER_ID = otherUser._id
    const otherProfile = await createProfile({
      ...frontendProfile,
      userId: otherUser._id,
      title: 'Secondary Profile',
    })
    await serviceCreateJobApplication({
      cvProfileId: otherProfile._id,
      status: 'applied',
      jobSnapshot: {
        title: 'Backend Developer',
        company: 'Hidden Co',
        location: 'Toronto',
        url: 'https://example.com/backend',
        source: 'Manual',
      },
    })

    process.env.MOCK_USER_ID = admin._id
    await serviceWarnAdminUser(
      target._id,
      'Please complete your account details before the next review.',
    )

    const result = await serviceGetAdminUserProfile(target._id)

    expect(result.account).toMatchObject({
      userId: target._id,
      email: 'omar@example.com',
      headline: 'Frontend candidate',
      location: 'Kitchener, ON',
      status: 'active',
    })
    expect(result.profiles).toHaveLength(1)
    expect(result.profiles[0].title).toBe('Frontend Profile')
    expect(result.warnings).toHaveLength(1)
    expect(result.activity.summary).toMatchObject({
      profiles: 1,
      jobApplications: 1,
      activeApplications: 1,
      archivedApplications: 0,
      calendarEvents: 1,
      upcomingEvents: 1,
      quizAttempts: 1,
      averageQuizScore: 8,
      supportTickets: 1,
      activeSupportTickets: 1,
    })
    expect(result.activity.recentApplications[0].jobSnapshot.company).toBe('Nova Apps')
    expect(result.activity.upcomingEvents[0].title).toBe('Portfolio review')
    expect(result.activity.recentQuizResults[0].jobType).toBe('Frontend Developer')
    expect(result.activity.recentSupportTickets[0].subject).toBe('Need help with profile')
  })

  it('admin can revoke a deleted user\'s access while retaining an audit record', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    const target = await createTestUser({
      firstName: 'Target',
      email: 'target@example.com',
    })
    await createSession(target._id, SESSION_DURATION_MS)
    process.env.MOCK_USER_ID = admin._id

    const result = await serviceDeleteAdminUser(target._id)

    expect(result).toMatchObject({ ok: true, user: { status: 'deleted' } })
    expect(await getUserById(target._id)).toMatchObject({ status: 'deleted' })

    const Session = await getSessionModel()
    expect(await Session.countDocuments({ userId: target._id })).toBe(0)
  })

  it('lists suspended and deleted users separately from accounts with access', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    const suspended = await createTestUser({
      firstName: 'Suspended',
      email: 'suspended@example.com',
      status: 'blocked',
    })
    const deleted = await createTestUser({
      firstName: 'Deleted',
      email: 'deleted@example.com',
      status: 'deleted',
    })
    process.env.MOCK_USER_ID = admin._id

    const active = await serviceListAdminUsers()
    const restricted = await serviceListAdminRestrictedUsers()

    expect(active.users.map((user) => user._id)).toEqual([admin._id])
    expect(restricted.users.map((user) => user._id)).toEqual(
      expect.arrayContaining([suspended._id, deleted._id]),
    )
  })

  it('tracks two warnings and suspends the account after the final warning', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    const target = await createTestUser({
      firstName: 'Target',
      email: 'target@example.com',
    })
    process.env.MOCK_USER_ID = admin._id
    await createSession(target._id, SESSION_DURATION_MS)

    const first = await serviceWarnAdminUser(target._id, 'Please update your profile details.')
    const second = await serviceWarnAdminUser(target._id, 'Please review the platform guidelines.')

    expect(first).toMatchObject({ action: 'warned', warningCount: 1 })
    expect(second).toMatchObject({ action: 'suspended', warningCount: 2 })
    expect(first.notification).toMatchObject({
      targetUserId: target._id,
      title: 'Account warning (1 of 2)',
      level: 'warning',
    })
    expect(second.notification).toMatchObject({
      targetUserId: target._id,
      title: 'Final account warning (2 of 2)',
      level: 'urgent',
    })
    expect(await listUserWarnings(target._id)).toHaveLength(2)
    expect(await getUserById(target._id)).toMatchObject({ status: 'blocked' })

    const Session = await getSessionModel()
    expect(await Session.countDocuments({ userId: target._id })).toBe(0)

    const warningRegister = await serviceListAdminWarningUsers()
    expect(warningRegister.users[0]).toMatchObject({
      _id: target._id,
      warningCount: 2,
      status: 'blocked',
    })
  })

  it('reactivates a suspended user without clearing warning or notification history', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    const target = await createTestUser({
      firstName: 'Target',
      email: 'target@example.com',
    })
    process.env.MOCK_USER_ID = admin._id

    await serviceWarnAdminUser(target._id, 'Please update your profile details.')
    await serviceWarnAdminUser(target._id, 'Please review the platform guidelines.')

    expect(await getUserById(target._id)).toMatchObject({ status: 'blocked' })

    const result = await serviceSetAdminUserStatus(target._id, 'active')

    expect(result.user.status).toBe('active')
    expect(await listUserWarnings(target._id)).toHaveLength(2)

    process.env.MOCK_USER_ID = target._id
    const inbox = await serviceListMyNotifications()

    expect(inbox.notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Account warning (1 of 2)',
          level: 'warning',
        }),
        expect.objectContaining({
          title: 'Final account warning (2 of 2)',
          level: 'urgent',
        }),
      ]),
    )

    delete process.env.MOCK_USER_ID
    const login = await serviceLogin({
      email: 'target@example.com',
      password: 'password123',
    })
    expect(login.user.status).toBe('active')
  })
})

describe('serviceGetAdminUserProfile latest analysis', () => {
  it('attaches null latestAnalysis when the profile has no analysis', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    const target = await createTestUser({
      firstName: 'Target',
      email: 'target@example.com',
    })
    await createProfile({
      ...frontendProfile,
      userId: target._id,
      title: 'No Analysis Profile',
    })
    process.env.MOCK_USER_ID = admin._id

    const result = await serviceGetAdminUserProfile(target._id)

    expect(result.profiles).toHaveLength(1)
    expect(result.profiles[0].latestAnalysis).toBeNull()
  })

  it('attaches the latest AI analysis summary when no override exists', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    const target = await createTestUser({
      firstName: 'Target',
      email: 'target@example.com',
    })
    const profile = await createProfile({
      ...frontendProfile,
      userId: target._id,
      title: 'AI Profile',
    })
    await createAnalysisFromDraft(target._id, profile._id, {
      gradingMode: 'ai',
      overallScore: 72,
      atsFeedback: { score: 68, comments: 'ok' },
      suggestions: [],
      strengths: [],
      weaknesses: [],
    })
    process.env.MOCK_USER_ID = admin._id

    const result = await serviceGetAdminUserProfile(target._id)

    expect(result.profiles[0].latestAnalysis).toMatchObject({
      overallScore: 72,
      atsScore: 68,
      gradingMode: 'ai',
      lastEditedReason: null,
    })
  })

  it('attaches the admin-override analysis when one is the latest', async () => {
    const admin = await createTestUser({
      firstName: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    })
    const target = await createTestUser({
      firstName: 'Target',
      email: 'target@example.com',
    })
    const profile = await createProfile({
      ...frontendProfile,
      userId: target._id,
      title: 'Override Profile',
    })
    await createAnalysisFromDraft(target._id, profile._id, {
      gradingMode: 'ai',
      overallScore: 50,
      atsFeedback: { score: 50, comments: 'first' },
      suggestions: [],
      strengths: [],
      weaknesses: [],
    })
    await createAnalysisFromDraft(target._id, profile._id, {
      gradingMode: 'admin-override',
      overallScore: 88,
      atsFeedback: { score: 90, comments: 'manual adjustment' },
      suggestions: [],
      strengths: [],
      weaknesses: [],
      lastEditedByUserId: admin._id,
      lastEditedAt: new Date().toISOString(),
      lastEditedReason: 'Manual adjustment after escalation.',
    })
    process.env.MOCK_USER_ID = admin._id

    const result = await serviceGetAdminUserProfile(target._id)

    expect(result.profiles[0].latestAnalysis).toMatchObject({
      overallScore: 88,
      atsScore: 90,
      gradingMode: 'admin-override',
      lastEditedReason: 'Manual adjustment after escalation.',
      lastEditedByUserId: admin._id,
    })
  })
})
