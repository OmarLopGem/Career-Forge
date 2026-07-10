'use client'

import { useCallback, useMemo, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { requestJson } from '@/lib/job-tracker/client/api.js'

const defaultForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'user',
}

const STATUS_LABELS = {
  active: 'Active',
  pending: 'Pending',
  blocked: 'Inactive',
}

function StatusPill({ status }) {
  const label = STATUS_LABELS[status] ?? status
  const styles =
    status === 'active'
      ? 'bg-cyan-soft text-success-green border-success-green'
      : status === 'blocked'
        ? 'bg-orange-soft text-forge-orange border-forge-orange'
        : 'bg-background text-text-muted border-border'

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize ${styles}`}
    >
      {label}
    </span>
  )
}

function PageIndicator({ page, totalPages }) {
  if (totalPages <= 1) return null

  return (
    <span
      aria-live="polite"
      className="inline-flex items-center gap-2 rounded-full border border-border bg-blue-soft px-4 py-1.5 text-sm font-semibold text-navy"
    >
      Page
      <span className="rounded-full bg-white px-2 py-0.5 text-brand-blue">
        {page}
      </span>
      of
      <span className="text-navy">{totalPages}</span>
    </span>
  )
}

function ResultsSummary({ total, page, pageSize }) {
  if (total === 0) {
    return (
      <p className="text-sm text-text-muted">No users to display.</p>
    )
  }

  const start = (page - 1) * pageSize + 1
  const end = Math.min(total, page * pageSize)

  return (
    <p className="text-sm text-text-muted">
      Showing <span className="font-semibold text-navy">{start}</span>
      –<span className="font-semibold text-navy">{end}</span> of{' '}
      <span className="font-semibold text-navy">{total}</span> users
    </p>
  )
}

export default function AdminUsersClient({ initialUsers, initialPagination }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [users, setUsers] = useState(initialUsers)
  const [pagination, setPagination] = useState(
    initialPagination ?? { page: 1, pageSize: 10, total: initialUsers.length, totalPages: 1 },
  )
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingStatusIds, setPendingStatusIds] = useState(() => new Set())
  const [formData, setFormData] = useState(defaultForm)
  const [, startTransition] = useTransition()

  const page = pagination.page
  const totalPages = pagination.totalPages
  const hasUsers = pagination.total > 0
  const canGoPrev = hasUsers && page > 1
  const canGoNext = hasUsers && page < totalPages

  const syncPageToUrl = useCallback(
    (nextPage) => {
      const params = new URLSearchParams(searchParams.toString())
      if (nextPage <= 1) {
        params.delete('page')
      } else {
        params.set('page', String(nextPage))
      }
      const query = params.toString()
      const url = query ? `/admin/users?${query}` : '/admin/users'
      startTransition(() => {
        router.replace(url, { scroll: false })
      })
    },
    [router, searchParams],
  )

  const loadUsers = useCallback(
    async (targetPage = page) => {
      const data = await requestJson(
        `/api/admin/users?page=${targetPage}&pageSize=${pagination.pageSize}`,
      )
      setUsers(data.users ?? [])
      setPagination(
        data.pagination ?? {
          page: targetPage,
          pageSize: pagination.pageSize,
          total: data.users?.length ?? 0,
          totalPages: 1,
        },
      )
    },
    [page, pagination.pageSize],
  )

  const goToPage = useCallback(
    (nextPage) => {
      const clamped = Math.max(1, Math.min(totalPages || 1, nextPage))
      if (clamped === page) return
      syncPageToUrl(clamped)
      setPagination((current) => ({ ...current, page: clamped }))
      loadUsers(clamped).catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load users.')
      })
    },
    [loadUsers, page, syncPageToUrl, totalPages],
  )

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormData((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')

    try {
      await requestJson('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(formData),
      })

      setMessage('User created successfully.')
      setFormData(defaultForm)
      syncPageToUrl(1)
      setPagination((current) => ({ ...current, page: 1 }))
      await loadUsers(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const setPendingFor = useCallback((userId, isPending) => {
    setPendingStatusIds((current) => {
      const next = new Set(current)
      if (isPending) {
        next.add(userId)
      } else {
        next.delete(userId)
      }
      return next
    })
  }, [])

  const toggleUserStatus = useCallback(
    async (user, targetStatus) => {
      const userId = user._id
      const previousStatus = user.status

      if (typeof window !== 'undefined') {
        const confirmationMessage =
          targetStatus === 'blocked'
            ? `Deactivate ${user.email}? They'll be signed out immediately.`
            : `Activate ${user.email}? They'll regain access to Career Forge.`
        const confirmed = window.confirm(confirmationMessage)
        if (!confirmed) return
      }

      setError('')
      setMessage('')
      setPendingFor(userId, true)

      setUsers((current) =>
        current.map((entry) =>
          entry._id === userId ? { ...entry, status: targetStatus } : entry,
        ),
      )

      try {
        const data = await requestJson(
          `/api/admin/users/${encodeURIComponent(userId)}/status`,
          {
            method: 'PATCH',
            body: JSON.stringify({ status: targetStatus }),
          },
        )
        const updated = data?.user
        if (updated) {
          setUsers((current) =>
            current.map((entry) =>
              entry._id === userId ? { ...entry, ...updated } : entry,
            ),
          )
        }
        setMessage(
          targetStatus === 'blocked'
            ? `${user.email} is now inactive.`
            : `${user.email} is now active.`,
        )
      } catch (err) {
        setUsers((current) =>
          current.map((entry) =>
            entry._id === userId ? { ...entry, status: previousStatus } : entry,
          ),
        )
        setError(err instanceof Error ? err.message : 'Failed to update user.')
      } finally {
        setPendingFor(userId, false)
      }
    },
    [setPendingFor],
  )

  const renderAction = useCallback(
    (user) => {
      if (user.status === 'pending') {
        return (
          <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Pending
          </span>
        )
      }

      const isPending = pendingStatusIds.has(user._id)
      const isActive = user.status === 'active'

      if (isActive) {
        return (
          <button
            type="button"
            onClick={() => toggleUserStatus(user, 'blocked')}
            disabled={isPending}
            aria-label={`Deactivate ${user.email}`}
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-forge-orange bg-white px-3 py-1.5 text-xs font-semibold text-forge-orange transition hover:bg-orange-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? '…' : 'Deactivate'}
          </button>
        )
      }

      return (
        <button
          type="button"
          onClick={() => toggleUserStatus(user, 'active')}
          disabled={isPending}
          aria-label={`Activate ${user.email}`}
          className="inline-flex items-center gap-1.5 rounded-lg border-2 border-success-green bg-success-green px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? '…' : 'Activate'}
        </button>
      )
    },
    [pendingStatusIds, toggleUserStatus],
  )

  const tableBody = useMemo(() => {
    if (users.length === 0) {
      return (
        <tr>
          <td
            colSpan={5}
            className="p-8 text-center text-sm text-text-muted"
          >
            No users yet. Add your first account using the form above.
          </td>
        </tr>
      )
    }

    return users.map((user) => (
      <tr key={user._id} className="border-t border-border">
        <td className="p-3">
          {user.firstName} {user.lastName}
        </td>
        <td className="p-3">{user.email}</td>
        <td className="p-3 capitalize">{user.role}</td>
        <td className="p-3">
          <StatusPill status={user.status} />
        </td>
        <td className="p-3">{renderAction(user)}</td>
      </tr>
    ))
  }, [users, renderAction])

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-5xl rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-4xl font-bold text-navy">
          Admin User Management
        </h1>

        <p className="mt-2 text-text-muted">
          Add users manually and review the MongoDB accounts registered in Career Forge.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-4 md:grid-cols-2">
          <input
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="First Name"
            className="rounded-xl border border-border p-3"
          />

          <input
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Last Name"
            className="rounded-xl border border-border p-3"
          />

          <input
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email"
            className="rounded-xl border border-border p-3"
          />

          <input
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Temporary Password"
            className="rounded-xl border border-border p-3"
          />

          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="rounded-xl border border-border p-3"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-brand-blue px-6 py-3 font-semibold text-white transition hover:bg-brand-blue-hover disabled:opacity-60"
          >
            {loading ? 'Creating...' : 'Add User'}
          </button>
        </form>

        {message ? (
          <p className="mt-4 font-medium text-brand-blue">{message}</p>
        ) : null}

        {error ? (
          <p className="mt-4 font-medium text-red-600">{error}</p>
        ) : null}

        <div className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-2xl font-bold text-navy">
              Existing Users
            </h2>

            <ResultsSummary
              total={pagination.total}
              page={page}
              pageSize={pagination.pageSize}
            />
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-border">
            <table className="w-full border-collapse bg-white text-left">
              <thead className="bg-blue-soft">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>

              <tbody>{tableBody}</tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-blue-soft px-4 py-3">
            <PageIndicator page={page} totalPages={totalPages} />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={!canGoPrev}
                aria-label="Previous page"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-brand-blue bg-white px-4 py-2 text-sm font-semibold text-brand-blue transition hover:bg-cyan-soft disabled:cursor-not-allowed disabled:border-border disabled:text-text-muted disabled:bg-transparent"
              >
                <span aria-hidden="true">‹</span>
                Previous
              </button>

              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={!canGoNext}
                aria-label="Next page"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-brand-blue-hover bg-brand-blue px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-blue-hover disabled:cursor-not-allowed disabled:border-border disabled:bg-background disabled:text-text-muted disabled:shadow-none"
              >
                Next
                <span aria-hidden="true">›</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
