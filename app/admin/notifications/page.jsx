import { redirect } from 'next/navigation'
import AdminNotificationsClient from './AdminNotificationsClient.jsx'
import { getCurrentUserFromRequest } from '@/lib/server/auth/current-user.js'
import { serviceListAdminNotifications } from '@/lib/server/notifications/notification.service.js'
import { serializeForClient } from '@/lib/server/serialize-for-client.js'

export const dynamic = 'force-dynamic'

export default async function AdminNotificationsPage() {
  const currentUser = await getCurrentUserFromRequest()

  if (!currentUser) {
    redirect('/login?redirectTo=/admin/notifications')
  }

  if (currentUser.role !== 'admin') {
    redirect('/calendar')
  }

  const { notifications } = await serviceListAdminNotifications()
  return <AdminNotificationsClient initialNotifications={serializeForClient(notifications)} />
}
