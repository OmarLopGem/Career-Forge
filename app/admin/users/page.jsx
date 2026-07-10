import { redirect } from 'next/navigation'
import AdminUsersClient from './AdminUsersClient.jsx'
import { getCurrentUserFromRequest } from '@/lib/server/auth/current-user.js'
import { serviceListAdminUsers } from '@/lib/server/admin/admin-users.service.js'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const currentUser = await getCurrentUserFromRequest()

  if (!currentUser) {
    redirect('/login?redirectTo=/admin/users')
  }

  if (currentUser.role !== 'admin') {
    redirect('/calendar')
  }

  const { users } = await serviceListAdminUsers()

  return <AdminUsersClient initialUsers={users} />
}
