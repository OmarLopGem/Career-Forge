'use client'

import { useState } from 'react'
import { requestJson } from '@/lib/job-tracker/client/api.js'

const defaultForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'user',
}

export default function AdminUsersClient({ initialUsers }) {
  const [users, setUsers] = useState(initialUsers)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState(defaultForm)

  const loadUsers = async () => {
    const data = await requestJson('/api/admin/users')
    setUsers(data.users ?? [])
  }

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
      await loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto max-w-5xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <h1 className="text-4xl font-bold text-[var(--navy)]">
          Admin User Management
        </h1>

        <p className="mt-2 text-[var(--text-muted)]">
          Add users manually and review the MongoDB accounts registered in Career Forge.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-4 md:grid-cols-2">
          <input
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="First Name"
            className="rounded-xl border border-[var(--border)] p-3"
          />

          <input
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Last Name"
            className="rounded-xl border border-[var(--border)] p-3"
          />

          <input
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email"
            className="rounded-xl border border-[var(--border)] p-3"
          />

          <input
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Temporary Password"
            className="rounded-xl border border-[var(--border)] p-3"
          />

          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="rounded-xl border border-[var(--border)] p-3"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Creating...' : 'Add User'}
          </button>
        </form>

        {message ? (
          <p className="mt-4 font-medium text-[var(--brand-blue)]">{message}</p>
        ) : null}

        {error ? (
          <p className="mt-4 font-medium text-red-600">{error}</p>
        ) : null}

        <div className="mt-10">
          <h2 className="text-2xl font-bold text-[var(--navy)]">
            Existing Users
          </h2>

          <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full border-collapse bg-white text-left">
              <thead className="bg-[var(--blue-soft)]">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="border-t border-[var(--border)]">
                    <td className="p-3">
                      {user.firstName} {user.lastName}
                    </td>
                    <td className="p-3">{user.email}</td>
                    <td className="p-3 capitalize">{user.role}</td>
                    <td className="p-3 capitalize">{user.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}
