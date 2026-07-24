'use client'

import { useEffect, useState } from 'react'
import { requestJson } from '@/lib/job-tracker/client/api.js'

function formatLastActive(value) {
  if (!value) return 'No activity yet'
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export default function StreakBadge({
  initialStreak = null,
  variant = 'soft',
  className = '',
}) {
  const [streak, setStreak] = useState(initialStreak)
  const [loading, setLoading] = useState(initialStreak === null)

  useEffect(() => {
    if (initialStreak !== null) return undefined
    let cancelled = false

    async function load() {
      try {
        const data = await requestJson('/api/quiz/streak')
        if (!cancelled) setStreak(data)
      } catch (error) {
        console.error('Failed to load quiz streak:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [initialStreak])

  if (loading) {
    return (
      <div
        className={`flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 ${className}`}
      >
        <span className="text-2xl" aria-hidden="true">🔥</span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            Streak
          </p>
          <p className="text-sm text-text-muted">Loading...</p>
        </div>
      </div>
    )
  }

  const current = streak?.currentStreak ?? 0
  const longest = streak?.longestStreak ?? 0
  const active = streak?.isActiveToday ?? false
  const lastActive = streak?.lastActiveDate ?? null

  const containerTone = active
    ? 'border-forge-orange bg-orange-soft'
    : 'border-border bg-background'
  const iconTone = active ? 'text-forge-orange' : 'text-text-muted'

  const compactLabel = variant === 'compact' ? 'Practice streak' : 'Practice streak'
  const valueColor = active ? 'text-navy' : 'text-text-muted'

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${containerTone} ${className}`}
      title={
        longest > 0
          ? `Longest streak: ${longest} day${longest === 1 ? '' : 's'}`
          : 'Start a streak today'
      }
    >
      <span className={`text-2xl ${iconTone}`} aria-hidden="true">
        {active ? '🔥' : '✨'}
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
          {compactLabel}
        </p>
        <p className={`mt-1 text-2xl font-bold ${valueColor}`}>
          {current} {current === 1 ? 'day' : 'days'}
        </p>
        <p className="mt-1 text-xs text-text-muted">
          {active
            ? 'Active today - keep it going!'
            : lastActive
              ? `Last active ${formatLastActive(lastActive)}`
              : 'Complete a quiz to start your streak'}
        </p>
      </div>
    </div>
  )
}
