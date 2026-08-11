import { redirect } from 'next/navigation'
import AdminEmployersClient from './AdminEmployersClient.jsx'
import { getCurrentUserFromRequest } from '@/lib/server/auth/current-user.js'
import { serviceListEmployers } from '@/lib/server/admin/admin-employers.service.js'

export const dynamic = 'force-dynamic'

export default async function AdminEmployersPage() {
  const user = await getCurrentUserFromRequest()

  if (!user) {
    redirect('/login?redirectTo=/admin/employers')
  }

  if (user.role !== 'admin') {
    redirect('/calendar')
  }

  const { employers } = await serviceListEmployers()

  return <AdminEmployersClient initialEmployers={employers} />
}