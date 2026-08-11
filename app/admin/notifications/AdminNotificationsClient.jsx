'use client'

import { useState, useTransition } from 'react'
import { requestJson } from '@/lib/job-tracker/client/api.js'

const initialForm = {
  title: '',
  message: '',
  level: 'info',
  startsAt: '',
  expiresAt: '',
}

function formatDate(value) {
  if (!value) return 'No date set'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
}

export default function AdminNotificationsClient({ initialNotifications }) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [form, setForm] = useState(initialForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (event) => {
    event.preventDefault()
    setMessage('')
    setError('')

    startTransition(async () => {
      try {
        const payload = {
          ...form,
          startsAt: form.startsAt || undefined,
          expiresAt: form.expiresAt || undefined,
        }
        const result = await requestJson('/api/admin/notifications', {
          method: 'POST',
          body: JSON.stringify(payload),
        })

        setNotifications((current) => [result.notification, ...current])
        setForm(initialForm)
        setMessage('Notification created successfully.')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to create notification.')
      }
    })
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-[2rem] border border-border bg-surface p-5 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-blue">
            Admin Notifications
          </p>
          <h1 className="mt-4 text-4xl font-bold text-navy">Broadcast important updates</h1>
          <p className="mt-3 max-w-3xl text-sm text-text-muted">
            Create announcements for all users when you need to share maintenance windows, release notes, or urgent reminders.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-navy">Title</span>
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-main outline-none focus:border-brand-blue"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-navy">Level</span>
              <select
                value={form.level}
                onChange={(event) => setForm((current) => ({ ...current, level: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-main outline-none focus:border-brand-blue"
              >
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-semibold text-navy">Message</span>
              <textarea
                value={form.message}
                onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                rows={4}
                className="mt-2 w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-main outline-none focus:border-brand-blue"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-navy">Starts At</span>
              <input
                type="date"
                value={form.startsAt}
                onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-main outline-none focus:border-brand-blue"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-navy">Expires At</span>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(event) => setForm((current) => ({ ...current, expiresAt: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-main outline-none focus:border-brand-blue"
              />
            </label>

            <div className="md:col-span-2 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-brand-blue px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-hover disabled:opacity-70"
              >
                {isPending ? 'Publishing...' : 'Publish notification'}
              </button>
              {message ? <p className="text-sm font-medium text-brand-blue">{message}</p> : null}
              {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
            </div>
          </form>
        </section>

        <section className="rounded-[2rem] border border-border bg-surface p-5 shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold text-navy">Notification history</h2>

          {notifications.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-border bg-background p-8 text-center text-sm text-text-muted">
              No notifications created yet.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {notifications.map((notification) => (
                <article key={notification._id} className="rounded-3xl border border-border bg-background p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-navy">{notification.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-text-muted">{notification.message}</p>
                    </div>
                    <span className="rounded-full bg-blue-soft px-3 py-1 text-xs font-semibold capitalize text-brand-blue">
                      {notification.level}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-muted">
                      <p className="font-semibold text-navy">Starts</p>
                      <p className="mt-1">{formatDate(notification.startsAt)}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-muted">
                      <p className="font-semibold text-navy">Expires</p>
                      <p className="mt-1">{formatDate(notification.expiresAt)}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-muted">
                      <p className="font-semibold text-navy">Published</p>
                      <p className="mt-1">{notification.isPublished ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
