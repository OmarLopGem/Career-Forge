"use client";

import { useEffect, useState } from "react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "user",
  });

  const loadUsers = async () => {
    const res = await fetch("/api/admin/users");
    const data = await res.json();

    if (data.success) {
      setUsers(data.users);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const data = await res.json();

    if (data.success) {
      setMessage("User created successfully.");
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: "user",
      });
      loadUsers();
    } else {
      setMessage(data.message || "Something went wrong.");
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto max-w-5xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <h1 className="text-4xl font-bold text-[var(--navy)]">
          Admin User Management
        </h1>

        <p className="mt-2 text-[var(--text-muted)]">
          Add users manually and view existing MongoDB user accounts.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-4 md:grid-cols-2">
          <input
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="First Name"
            className="rounded-xl border border-[var(--border)] p-3"
            required
          />

          <input
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Last Name"
            className="rounded-xl border border-[var(--border)] p-3"
            required
          />

          <input
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email"
            className="rounded-xl border border-[var(--border)] p-3"
            required
          />

          <input
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Temporary Password"
            className="rounded-xl border border-[var(--border)] p-3"
            required
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
            {loading ? "Creating..." : "Add User"}
          </button>
        </form>

        {message && (
          <p className="mt-4 font-medium text-[var(--brand-blue)]">
            {message}
          </p>
        )}

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
  );
}