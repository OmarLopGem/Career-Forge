import { redirect } from 'next/navigation'
import AuthFormClient from '@/app/auth/AuthFormClient.jsx'
import { getCurrentUserFromRequest } from '@/lib/server/auth/current-user.js'
import { sanitizeRedirectTo } from '@/lib/server/auth/redirect.js'

export const dynamic = 'force-dynamic'

// Registration uses the same redirect flow as login so the user can continue
// into the private area they originally tried to open.
export default async function RegisterPage({ searchParams }) {
  const user = await getCurrentUserFromRequest()
  const params = await searchParams
  const redirectTo = sanitizeRedirectTo(params?.redirectTo)

  if (user) {
    redirect(redirectTo)
  }

  return <AuthFormClient mode="register" redirectTo={redirectTo} />
}
