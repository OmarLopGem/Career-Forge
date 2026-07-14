'use client'

import { useState } from 'react'

// Each professional profile keeps its own summary so users can tailor how they
// present themselves for different roles without touching account-level data.
export default function ProfessionalSummaryForm({ profile, onSave }) {
  const [summary, setSummary] = useState(profile.professionalSummary ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setSaved(false)

    try {
      await onSave(summary)
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
        <div>
          <h3 className="text-lg font-bold text-navy">Professional summary</h3>
          <p className="mt-1 text-sm text-text-muted">
            Give this specific CV profile its own positioning statement.
          </p>
        </div>
        {saved ? (
          <span className="text-xs font-semibold text-success-green">Saved</span>
        ) : null}
      </div>

      <label className="mt-5 block">
        <span className="text-xs font-semibold tracking-wider text-text-muted">
          SUMMARY
        </span>
        <textarea
          rows={6}
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          placeholder="Example: Full stack engineer focused on React, Node.js, and cloud platforms."
          className="mt-2 w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-main placeholder:text-text-muted transition focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
        />
      </label>

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-blue-hover hover:shadow-md disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save summary'}
        </button>
      </div>
    </form>
  )
}
