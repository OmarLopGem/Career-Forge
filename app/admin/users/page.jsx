import { redirect } from 'next/navigation'
import AdminUsersClient from './AdminUsersClient.jsx'
import { getCurrentUserFromRequest } from '@/lib/server/auth/current-user.js'
import { serviceListAdminUsers } from '@/lib/server/admin/admin-users.service.js'

export const dynamic = 'force-dynamic'

// This server page enforces admin-only access before any management UI renders.
function parsePositiveInt(value) {
  if (Array.isArray(value)) value = value[0]
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : undefined
}

export default async function AdminUsersPage({ searchParams }) {
  const currentUser = await getCurrentUserFromRequest()

  if (!currentUser) {
    redirect('/login?redirectTo=/admin/users')
  }

  if (currentUser.role !== 'admin') {
    redirect('/calendar')
  }

  const resolvedSearchParams = await searchParams
  const page = parsePositiveInt(resolvedSearchParams?.page)
  const q = resolvedSearchParams?.q
  const { users, pagination } = await serviceListAdminUsers({
    page,
    query: typeof q === 'string' ? q : undefined,
  })

  return (
    <AdminUsersClient
      initialUsers={users}
      initialPagination={pagination}
      initialQuery={typeof q === 'string' ? q : ''}
    />
  )
}
