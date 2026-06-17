'use client'

import { useState } from 'react'

export default function PersonalInfoForm({ profile, onSave }) {
  const [info, setInfo] = useState(profile.personalInfo)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      await onSave(info)
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
        <h3 className="text-lg font-bold text-navy">Personal information</h3>
        {saved ? (
          <span className="text-xs font-semibold text-success-green">Saved</span>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label="Full name"
          value={info.fullName ?? ''}
          onChange={(v) => setInfo({ ...info, fullName: v })}
        />
        <Field
          label="Headline"
          value={info.headline ?? ''}
          onChange={(v) => setInfo({ ...info, headline: v })}
          placeholder="e.g. Frontend Engineer"
        />
        <Field
          label="Email"
          type="email"
          value={info.email ?? ''}
          onChange={(v) => setInfo({ ...info, email: v })}
        />
        <Field
          label="Phone"
          value={info.phone ?? ''}
          onChange={(v) => setInfo({ ...info, phone: v })}
        />
        <Field
          label="Location"
          value={info.location ?? ''}
          onChange={(v) => setInfo({ ...info, location: v })}
          placeholder="e.g. Remote"
        />
        <Field
          label="LinkedIn URL"
          value={info.linkedinUrl ?? ''}
          onChange={(v) => setInfo({ ...info, linkedinUrl: v })}
        />
        <Field
          label="GitHub URL"
          value={info.githubUrl ?? ''}
          onChange={(v) => setInfo({ ...info, githubUrl: v })}
        />
        <Field
          label="Portfolio URL"
          value={info.portfolioUrl ?? ''}
          onChange={(v) => setInfo({ ...info, portfolioUrl: v })}
        />
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-brand-blue-hover hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save personal info'}
        </button>
      </div>
    </form>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-text-muted tracking-wider">
        {label.toUpperCase()}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-text-main placeholder:text-text-muted focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition"
      />
    </label>
  )
}
