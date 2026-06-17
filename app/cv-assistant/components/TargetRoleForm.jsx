'use client'

import { useState } from 'react'

const SENIORITY_OPTIONS = [
  { value: 'intern', label: 'Intern' },
  { value: 'junior', label: 'Junior' },
  { value: 'mid', label: 'Mid-level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead' },
  { value: 'executive', label: 'Executive' },
]

export default function TargetRoleForm({ profile, onSave }) {
  const [target, setTarget] = useState(profile.target ?? {})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      await onSave(target)
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-border bg-surface p-6 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-navy">Target role</h3>
        {saved ? (
          <span className="text-xs font-semibold text-success-green">Saved</span>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-text-muted">
        Optional. Helps the AI tailor its feedback and template suggestions.
      </p>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs font-semibold text-text-muted tracking-wider">
            DESIRED ROLE
          </span>
          <input
            type="text"
            value={target?.desiredRole ?? ''}
            placeholder="e.g. Senior Frontend Engineer"
            onChange={(e) => setTarget({ ...target, desiredRole: e.target.value })}
            className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-text-main placeholder:text-text-muted focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-text-muted tracking-wider">
            DESIRED INDUSTRY
          </span>
          <input
            type="text"
            value={target?.desiredIndustry ?? ''}
            placeholder="e.g. SaaS, Fintech"
            onChange={(e) => setTarget({ ...target, desiredIndustry: e.target.value })}
            className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-text-main placeholder:text-text-muted focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-text-muted tracking-wider">
            SENIORITY
          </span>
          <select
            value={target?.seniority ?? ''}
            onChange={(e) =>
              setTarget({ ...target, seniority: e.target.value || undefined })
            }
            className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-text-main focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition"
          >
            <option value="">Select…</option>
            {SENIORITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-text-muted tracking-wider">
            COUNTRY
          </span>
          <input
            type="text"
            value={target?.country ?? ''}
            placeholder="e.g. Spain"
            onChange={(e) => setTarget({ ...target, country: e.target.value })}
            className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-text-main placeholder:text-text-muted focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition"
          />
        </label>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-brand-blue-hover hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save target role'}
        </button>
      </div>
    </form>
  )
}
