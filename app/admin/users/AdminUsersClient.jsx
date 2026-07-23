'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
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
  blocked: 'Suspended',
  deleted: 'Deleted',
}

// This client owns admin-side pagination, optimistic updates, and manual user
// creation while the server page handles the access check.
function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
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

function WarningPill({ count }) {
  const reachedLimit = count >= 2
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
        reachedLimit
          ? 'border-forge-orange bg-orange-soft text-forge-orange'
          : count > 0
            ? 'border-brand-blue bg-blue-soft text-brand-blue'
            : 'border-border bg-background text-text-muted'
      }`}
    >
      {count}/2 warnings
    </span>
  )
}

function formatDate(value) {
  if (!value) return 'Not available'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
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

function ResultsSummary({ total, page, pageSize, query }) {
  if (total === 0) {
    if (query) {
      return (
        <p className="text-sm text-text-muted">
          No users match{' '}
          <span className="font-semibold text-navy">&ldquo;{query}&rdquo;</span>.
        </p>
      )
    }

    return <p className="text-sm text-text-muted">No users to display.</p>
  }

  const start = (page - 1) * pageSize + 1
  const end = Math.min(total, page * pageSize)
  const noun = total === 1 ? 'user' : 'users'

  if (query) {
    return (
      <p className="text-sm text-text-muted">
        Showing{' '}
        <span className="font-semibold text-navy">{start}</span>
        –<span className="font-semibold text-navy">{end}</span> of{' '}
        <span className="font-semibold text-navy">{total}</span> {noun} for{' '}
        <span className="font-semibold text-navy">
          &ldquo;{query}&rdquo;
        </span>
      </p>
    )
  }

  return (
    <p className="text-sm text-text-muted">
      Showing <span className="font-semibold text-navy">{start}</span>
      –<span className="font-semibold text-navy">{end}</span> of{' '}
      <span className="font-semibold text-navy">{total}</span> {noun}
    </p>
  )
}

function SearchBar({
  value,
  onChange,
  onClear,
  onSubmit,
  isPending,
}) {
  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className="relative w-full md:w-80"
    >
      <label htmlFor="admin-users-search" className="sr-only">
        Search users by name or email
      </label>

      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
        <SearchIcon />
      </span>

      <input
        id="admin-users-search"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && value) {
            event.preventDefault()
            onClear()
          }
        }}
        placeholder="Search by name or email"
        autoComplete="off"
        spellCheck="false"
        className="w-full rounded-xl border border-border bg-white py-2.5 pl-9 pr-9 text-sm text-navy outline-none transition focus:border-brand-blue"
      />

      {value ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-text-muted transition hover:bg-blue-soft hover:text-navy"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      ) : null}

      {isPending ? (
        <span
          aria-hidden="true"
          className="absolute right-9 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-wider text-text-muted"
        >
          …
        </span>
      ) : null}
    </form>
  )
}

export default function AdminUsersClient({
  initialUsers,
  initialPagination,
  initialQuery = '',
  currentUserId,
  initialRestrictedUsers = [],
  initialWarningUsers = [],
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [users, setUsers] = useState(initialUsers)
  const [restrictedUsers, setRestrictedUsers] = useState(initialRestrictedUsers)
  const [warningUsers, setWarningUsers] = useState(initialWarningUsers)
  const [pagination, setPagination] = useState(
    initialPagination ?? { page: 1, pageSize: 10, total: initialUsers.length, totalPages: 1 },
  )
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingUserIds, setPendingUserIds] = useState(() => new Set())
  const [formData, setFormData] = useState(defaultForm)
  const [warningTarget, setWarningTarget] = useState(null)
  const [warningMessage, setWarningMessage] = useState('')
  const [searchInput, setSearchInput] = useState(initialQuery)
  const [query, setQuery] = useState(initialQuery)
  const queryRef = useRef(query)
  const debounceRef = useRef(null)
  const requestSeqRef = useRef(0)
  const [, startTransition] = useTransition()

  const page = pagination.page
  const totalPages = pagination.totalPages
  const hasUsers = pagination.total > 0
  const canGoPrev = hasUsers && page > 1
  const canGoNext = hasUsers && page < totalPages

  const buildApiUrl = useCallback(
    ({ targetPage, targetQuery }) => {
      const params = new URLSearchParams()
      params.set('page', String(targetPage ?? page))
      params.set('pageSize', String(pagination.pageSize))
      const nextQuery =
        targetQuery !== undefined ? targetQuery : query
      if (nextQuery.trim()) {
        params.set('q', nextQuery.trim())
      }
      return `/api/admin/users?${params.toString()}`
    },
    [page, pagination.pageSize, query],
  )

  const syncStateToUrl = useCallback(
    (nextPage, nextQuery) => {
      const params = new URLSearchParams(searchParams.toString())
      if (nextPage <= 1) {
        params.delete('page')
      } else {
        params.set('page', String(nextPage))
      }
      const trimmedQuery = (nextQuery ?? '').trim()
      if (trimmedQuery) {
        params.set('q', trimmedQuery)
      } else {
        params.delete('q')
      }
      const search = params.toString()
      const url = search ? `/admin/users?${search}` : '/admin/users'
      startTransition(() => {
        router.replace(url, { scroll: false })
      })
    },
    [router, searchParams],
  )

  const loadUsers = useCallback(
    async (targetPage = page, targetQuery = query) => {
      const seq = ++requestSeqRef.current
      setError('')
      try {
        const data = await requestJson(
          buildApiUrl({ targetPage, targetQuery }),
        )
        if (seq !== requestSeqRef.current) return
        setUsers(data.users ?? [])
        setPagination(
          data.pagination ?? {
            page: targetPage,
            pageSize: pagination.pageSize,
            total: data.users?.length ?? 0,
            totalPages: 1,
          },
        )
      } catch (err) {
        if (seq !== requestSeqRef.current) return
        setError(err instanceof Error ? err.message : 'Failed to load users.')
      }
    },
    [buildApiUrl, page, pagination.pageSize, query],
  )

  const refreshAdminSections = useCallback(async () => {
    try {
      const [restricted, warnings] = await Promise.all([
        requestJson('/api/admin/users/restricted'),
        requestJson('/api/admin/users/warnings'),
      ])
      setRestrictedUsers(restricted.users ?? [])
      setWarningUsers(warnings.users ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh account records.')
    }
  }, [])

  const applyQueryChange = useCallback(
    (nextValue) => {
      const trimmed = String(nextValue ?? '').trim()
      setSearchInput(trimmed)
      const changed = trimmed !== queryRef.current
      queryRef.current = trimmed
      if (!changed) return
      setQuery(trimmed)
      syncStateToUrl(1, trimmed)
      loadUsers(1, trimmed)
    },
    [loadUsers, syncStateToUrl],
  )

  const handleSearchChange = useCallback(
    (nextValue) => {
      setSearchInput(nextValue)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        applyQueryChange(nextValue)
      }, 300)
    },
    [applyQueryChange],
  )

  const handleSearchClear = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    applyQueryChange('')
  }, [applyQueryChange])

  const handleSearchSubmit = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    applyQueryChange(searchInput)
  }, [applyQueryChange, searchInput])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  useEffect(() => {
    queryRef.current = query
  }, [query])

  const goToPage = useCallback(
    (nextPage) => {
      const clamped = Math.max(1, Math.min(totalPages || 1, nextPage))
      if (clamped === page) return
      syncStateToUrl(clamped, query)
      setPagination((current) => ({ ...current, page: clamped }))
      loadUsers(clamped, query)
    },
    [loadUsers, page, query, syncStateToUrl, totalPages],
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
      if (debounceRef.current) clearTimeout(debounceRef.current)
      setSearchInput('')
      queryRef.current = ''
      setQuery('')
      syncStateToUrl(1, '')
      setPagination((current) => ({ ...current, page: 1 }))
      await loadUsers(1, '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const setPendingFor = useCallback((userId, isPending) => {
    setPendingUserIds((current) => {
      const next = new Set(current)
      if (isPending) {
        next.add(userId)
      } else {
        next.delete(userId)
      }
      return next
    })
  }, [])

  const handleDeleteUser = useCallback(
    async (user) => {
      if (user._id === currentUserId) return

      if (typeof window !== 'undefined') {
        const confirmed = window.confirm(
          `Permanently delete ${user.email} and their Career Forge data? This cannot be undone.`,
        )
        if (!confirmed) return
      }

      setError('')
      setMessage('')
      setPendingFor(user._id, true)

      try {
        await requestJson(`/api/admin/users/${encodeURIComponent(user._id)}`, {
          method: 'DELETE',
        })
        setMessage(`${user.email} was moved to the deleted-access register.`)
        await loadUsers(page, query)
        await refreshAdminSections()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete user.')
      } finally {
        setPendingFor(user._id, false)
      }
    },
    [currentUserId, loadUsers, page, query, refreshAdminSections, setPendingFor],
  )

  const handleWarningSubmit = useCallback(
    async (event) => {
      event.preventDefault()
      if (!warningTarget) return

      setError('')
      setMessage('')
      setPendingFor(warningTarget._id, true)

      try {
        const result = await requestJson(
          `/api/admin/users/${encodeURIComponent(warningTarget._id)}/warnings`,
          {
            method: 'POST',
            body: JSON.stringify({ message: warningMessage }),
          },
        )
        setMessage(
          result.action === 'suspended'
            ? `${warningTarget.email} reached the warning limit and was suspended.`
            : `Warning ${result.warningCount}/2 sent to ${warningTarget.email}.`,
        )
        setWarningTarget(null)
        setWarningMessage('')
        await loadUsers(page, query)
        await refreshAdminSections()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send warning.')
      } finally {
        setPendingFor(warningTarget._id, false)
      }
    },
    [loadUsers, page, query, refreshAdminSections, setPendingFor, warningMessage, warningTarget],
  )

  const toggleUserStatus = useCallback(
    async (user, targetStatus) => {
      const userId = user._id
      const previousStatus = user.status

      if (typeof window !== 'undefined') {
        const confirmationMessage =
          targetStatus === 'blocked'
            ? `Suspend ${user.email}? They'll be signed out immediately.`
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
            ? `${user.email} is now suspended.`
            : `${user.email} is now active.`,
        )
        await loadUsers(page, query)
        await refreshAdminSections()
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
    [loadUsers, page, query, refreshAdminSections, setPendingFor],
  )

  const renderAction = useCallback(
    (user) => {
      const isPending = pendingUserIds.has(user._id)
      const isActive = user.status === 'active'

      return (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => toggleUserStatus(user, isActive ? 'blocked' : 'active')}
            disabled={isPending}
            aria-label={`${isActive ? 'Suspend' : 'Activate'} ${user.email}`}
            className={`inline-flex items-center gap-1.5 rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isActive
                ? 'border-forge-orange bg-white text-forge-orange hover:bg-orange-soft'
                : 'border-success-green bg-success-green text-white hover:opacity-90'
            }`}
          >
            {isPending ? '…' : isActive ? 'Suspend' : 'Activate'}
          </button>
          {user.warningCount >= 2 ? (
            <button
              type="button"
              onClick={() => toggleUserStatus(user, 'blocked')}
              disabled={isPending || user._id === currentUserId}
              className="inline-flex items-center gap-1.5 rounded-lg border border-forge-orange bg-orange-soft px-3 py-1.5 text-xs font-semibold text-forge-orange transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Suspend (limit)
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setWarningTarget(user)
                setWarningMessage('')
              }}
              disabled={isPending || user._id === currentUserId}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-blue bg-white px-3 py-1.5 text-xs font-semibold text-brand-blue transition hover:bg-blue-soft disabled:cursor-not-allowed disabled:opacity-60"
            >
              Warn ({user.warningCount}/2)
            </button>
          )}
          <button
            type="button"
            onClick={() => handleDeleteUser(user)}
            disabled={isPending || user._id === currentUserId}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Delete
          </button>
        </div>
      )
    },
    [currentUserId, handleDeleteUser, pendingUserIds, toggleUserStatus],
  )

  const isSearching = query.trim().length > 0
  const trimSearch = searchInput.trim()

  const tableBody = useMemo(() => {
    if (users.length === 0) {
      if (isSearching) {
        return (
          <tr>
            <td
              colSpan={6}
              className="p-8 text-center text-sm text-text-muted"
            >
              <div className="flex flex-col items-center gap-2">
                <p>
                  No users match{' '}
                  <span className="font-semibold text-navy">
                    &ldquo;{query}&rdquo;
                  </span>
                  .
                </p>
                <button
                  type="button"
                  onClick={handleSearchClear}
                  className="text-xs font-semibold uppercase tracking-wider text-brand-blue transition hover:text-brand-blue-hover"
                >
                  Clear search
                </button>
              </div>
            </td>
          </tr>
        )
      }

      return (
        <tr>
          <td
            colSpan={6}
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
        <td className="p-3">
          <WarningPill count={user.warningCount ?? 0} />
        </td>
        <td className="p-3">{renderAction(user)}</td>
      </tr>
    ))
  }, [handleSearchClear, isSearching, query, renderAction, users])

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
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold text-navy">Existing Users</h2>

              <ResultsSummary
                total={pagination.total}
                page={page}
                pageSize={pagination.pageSize}
                query={isSearching ? query : ''}
              />
            </div>

            <SearchBar
              value={searchInput}
              onChange={handleSearchChange}
              onClear={handleSearchClear}
              onSubmit={handleSearchSubmit}
              isPending={trimSearch !== query}
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
                  <th className="p-3">Warnings</th>
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

      <section className="mx-auto mt-8 max-w-5xl rounded-2xl border border-forge-orange/40 bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forge-orange">
              Access register
            </p>
            <h2 className="mt-2 text-2xl font-bold text-navy">Suspended and deleted accounts</h2>
            <p className="mt-2 text-sm text-text-muted">
              These accounts cannot access Career Forge. Deleted accounts remain here for audit purposes.
            </p>
          </div>
          <span className="rounded-full bg-orange-soft px-3 py-1 text-sm font-semibold text-forge-orange">
            {restrictedUsers.length} restricted
          </span>
        </div>

        {restrictedUsers.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-border bg-background p-5 text-sm text-text-muted">
            No suspended or deleted accounts.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-xl border border-border">
            <table className="w-full border-collapse bg-white text-left text-sm">
              <thead className="bg-orange-soft">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Access status</th>
                  <th className="p-3">Warnings</th>
                </tr>
              </thead>
              <tbody>
                {restrictedUsers.map((user) => (
                  <tr key={user._id} className="border-t border-border">
                    <td className="p-3">{user.firstName} {user.lastName}</td>
                    <td className="p-3">{user.email}</td>
                    <td className="p-3 capitalize">{user.role}</td>
                    <td className="p-3"><StatusPill status={user.status} /></td>
                    <td className="p-3"><WarningPill count={user.warningCount ?? 0} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mx-auto mt-8 max-w-5xl rounded-2xl border border-brand-blue/30 bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">
              Warning register
            </p>
            <h2 className="mt-2 text-2xl font-bold text-navy">Warned accounts</h2>
            <p className="mt-2 text-sm text-text-muted">
              Each account can receive two warnings. The second warning automatically removes access.
            </p>
          </div>
          <span className="rounded-full bg-blue-soft px-3 py-1 text-sm font-semibold text-brand-blue">
            {warningUsers.length} warned
          </span>
        </div>

        {warningUsers.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-border bg-background p-5 text-sm text-text-muted">
            No warnings have been issued.
          </p>
        ) : (
          <div className="mt-6 space-y-3">
            {warningUsers.map((user) => (
              <article key={user._id} className="rounded-xl border border-border bg-background p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-navy">{user.firstName} {user.lastName}</h3>
                      <StatusPill status={user.status} />
                      <WarningPill count={user.warningCount} />
                    </div>
                    <p className="mt-1 text-sm text-text-muted">{user.email}</p>
                    <p className="mt-3 text-sm leading-6 text-text-main">{user.latestWarning}</p>
                  </div>
                  <p className="shrink-0 text-xs font-medium text-text-muted">
                    Last warned {formatDate(user.lastWarnedAt)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {warningTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/45 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="warning-dialog-title"
        >
          <form
            onSubmit={handleWarningSubmit}
            className="w-full max-w-lg rounded-3xl border border-border bg-surface p-6 shadow-xl"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forge-orange">
              Account warning
            </p>
            <h2 id="warning-dialog-title" className="mt-2 text-2xl font-bold text-navy">
              Warn {warningTarget.firstName} {warningTarget.lastName}
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              This notice will appear on the user&apos;s Profile Hub. A second warning automatically suspends access.
            </p>

            <label className="mt-5 block">
              <span className="text-sm font-semibold text-navy">Message</span>
              <textarea
                required
                minLength={5}
                maxLength={500}
                value={warningMessage}
                onChange={(event) => setWarningMessage(event.target.value)}
                placeholder="Explain the issue and any next steps."
                className="mt-2 min-h-32 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-main outline-none transition focus:border-brand-blue"
              />
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setWarningTarget(null)
                  setWarningMessage('')
                }}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-text-muted transition hover:bg-background"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pendingUserIds.has(warningTarget._id)}
                className="rounded-xl bg-forge-orange px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {pendingUserIds.has(warningTarget._id)
                  ? 'Sending...'
                  : warningTarget.warningCount === 1
                    ? 'Send final warning'
                    : 'Send warning'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  )
}
