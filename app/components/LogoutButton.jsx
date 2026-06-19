'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { requestJsonWithoutBody } from '@/lib/job-tracker/client/api.js'

export default function LogoutButton({ className }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleLogout = () => {
    startTransition(async () => {
      try {
        await requestJsonWithoutBody('/api/auth/logout', { method: 'POST' })
        router.push('/login')
        router.refresh()
      } catch {}
    })
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className={className}
    >
      {isPending ? 'Signing out...' : 'Logout'}
    </button>
  )
}
