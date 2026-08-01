'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const ACCESS_CHECK_INTERVAL_MS = 10_000

export default function SessionAccessGuard({ hasSession = false }) {
  const router = useRouter()

  useEffect(() => {
    if (!hasSession) return undefined

    let disposed = false
    let redirecting = false

    async function checkAccess() {
      try {
        const response = await fetch('/api/auth/me', {
          cache: 'no-store',
          credentials: 'same-origin',
        })

        if (response.ok || ![401, 403].includes(response.status)) return
        if (disposed || redirecting) return

        redirecting = true
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'same-origin',
        }).catch(() => null)

        if (disposed) return
        router.replace('/login?reason=access-revoked')
        router.refresh()
      } catch {
        // A temporary network error must not sign an otherwise valid user out.
      }
    }

    function checkWhenVisible() {
      if (document.visibilityState === 'visible') {
        void checkAccess()
      }
    }

    void checkAccess()
    const intervalId = window.setInterval(checkAccess, ACCESS_CHECK_INTERVAL_MS)
    window.addEventListener('focus', checkAccess)
    document.addEventListener('visibilitychange', checkWhenVisible)

    return () => {
      disposed = true
      window.clearInterval(intervalId)
      window.removeEventListener('focus', checkAccess)
      document.removeEventListener('visibilitychange', checkWhenVisible)
    }
  }, [hasSession, router])

  return null
}
