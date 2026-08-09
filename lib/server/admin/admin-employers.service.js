import { AppServiceError } from '@/lib/server/api-error.js'
import { requireAdminUser } from '@/lib/server/auth/current-user.js'
import {
  ALLOWED_EMPLOYER_STATUSES,
  getEmployerById,
  listEmployers,
  listEmployersByStatuses,
  setEmployerStatus,
} from '@/lib/db/models/employer.js'
import { getUserById } from '@/lib/server/auth/users.repository.js'
import { deleteSessionsByUserId } from '@/lib/server/auth/sessions.repository.js'
import { serviceCreateUserNotification } from '@/lib/server/notifications/notification.service.js'
import { toObjectId } from '@/lib/server/object-id.js'

function resolveEmployer(employerId) {
  if (!employerId || typeof employerId !== 'string' || !toObjectId(employerId)) {
    throw new AppServiceError('Invalid employer id.', 'INVALID_EMPLOYER_ID', 400)
  }
}

export async function serviceListEmployers() {
  await requireAdminUser()
  const employers = await listEmployers()
  return { employers }
}

export async function serviceListPendingEmployers() {
  await requireAdminUser()
  const employers = await listEmployersByStatuses(['pending'])
  return { employers }
}

export async function serviceVerifyEmployer(employerId) {
  const currentUser = await requireAdminUser()
  resolveEmployer(employerId)

  const employer = await getEmployerById(employerId)
  if (!employer) {
    throw new AppServiceError('Employer not found.', 'EMPLOYER_NOT_FOUND', 404)
  }

  if (employer.status === 'verified') {
    return { employer }
  }

  const updated = await setEmployerStatus(employerId, 'verified', currentUser._id)

  const ownerUser = await getUserById(employer.ownerUserId)
  if (ownerUser) {
    if (ownerUser.status !== 'active') {
      const { setUserStatus } = await import('@/lib/server/auth/users.repository.js')
      await setUserStatus(ownerUser._id, 'active')
    }
    await serviceCreateUserNotification({
      createdByUserId: currentUser._id,
      targetUserId: ownerUser._id,
      title: 'Your employer account is verified',
      message: `${employer.name} is now verified. You can publish jobs and review applicants.`,
      level: 'info',
      link: '/employer/listings',
    })
  }

  return { employer: updated }
}

export async function serviceSuspendEmployer(employerId) {
  const currentUser = await requireAdminUser()
  resolveEmployer(employerId)

  const employer = await getEmployerById(employerId)
  if (!employer) {
    throw new AppServiceError('Employer not found.', 'EMPLOYER_NOT_FOUND', 404)
  }

  const updated = await setEmployerStatus(employerId, 'suspended')

  const ownerUser = await getUserById(employer.ownerUserId)
  if (ownerUser) {
    try {
      await deleteSessionsByUserId(ownerUser._id)
    } catch (err) {
      console.error('Failed to delete sessions for suspended employer', err)
    }
    try {
      const { setUserStatus } = await import('@/lib/server/auth/users.repository.js')
      await setUserStatus(ownerUser._id, 'blocked')
    } catch (err) {
      console.error('Failed to update user status for suspended employer', err)
    }
    await serviceCreateUserNotification({
      createdByUserId: currentUser._id,
      targetUserId: ownerUser._id,
      title: 'Your employer account has been suspended',
      message: `An administrator suspended ${employer.name}. Contact support for more details.`,
      level: 'urgent',
      link: '/support',
    })
  }

  return { employer: updated }
}