import { redirect } from 'next/navigation'
import AuthFormClient from '@/app/auth/AuthFormClient.jsx'
import { getCurrentUserFromRequest } from '@/lib/server/auth/current-user.js'
import { sanitizeRedirectTo } from '@/lib/server/auth/redirect.js'

export const dynamic = 'force-dynamic'

// Login stays server-aware so authenticated users can be redirected before the
// client form renders, while still preserving safe internal redirect targets.
export default async function LoginPage({ searchParams }) {
  const user = await getCurrentUserFromRequest()
  const params = await searchParams
  const redirectTo = sanitizeRedirectTo(params?.redirectTo)
  const notice = params?.reason === 'access-revoked'
    ? 'Your session ended because your account access was revoked. Contact an administrator if you believe this is a mistake.'
    : ''

  if (user) {
    redirect(redirectTo)
  }

  return <AuthFormClient mode="login" redirectTo={redirectTo} notice={notice} />
}
