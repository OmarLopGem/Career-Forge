import { redirect } from 'next/navigation'
import AuthFormClient from '@/app/auth/AuthFormClient.jsx'
import { getCurrentUserFromRequest } from '@/lib/server/auth/current-user.js'

export const dynamic = 'force-dynamic'

export default async function LoginPage({ searchParams }) {
  const user = await getCurrentUserFromRequest()
  const params = await searchParams
  const redirectTo = typeof params?.redirectTo === 'string' ? params.redirectTo : '/calendar'

  if (user) {
    redirect(redirectTo)
  }

  return <AuthFormClient mode="login" redirectTo={redirectTo} />
}
