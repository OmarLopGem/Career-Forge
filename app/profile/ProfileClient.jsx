'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { requestJson } from '@/lib/job-tracker/client/api.js'

function createFormState(account, currentUser) {
  return {
    firstName: account?.firstName ?? currentUser?.firstName ?? '',
    lastName: account?.lastName ?? currentUser?.lastName ?? '',
    email: account?.email ?? currentUser?.email ?? '',
    dateOfBirth: account?.dateOfBirth ?? '',
    headline: account?.headline ?? '',
    phone: account?.phone ?? '',
    location: account?.location ?? '',
    linkedinUrl: account?.linkedinUrl ?? '',
    githubUrl: account?.githubUrl ?? '',
    portfolioUrl: account?.portfolioUrl ?? '',
  }
}

function buildPayload(form) {
  return {
    firstName: form.firstName,
    lastName: form.lastName,
    dateOfBirth: form.dateOfBirth,
    headline: form.headline,
    phone: form.phone,
    location: form.location,
    linkedinUrl: form.linkedinUrl,
    githubUrl: form.githubUrl,
    portfolioUrl: form.portfolioUrl,
  }
}

function formatDate(value) {
  if (!value) return 'Never'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString()
}

function getCompletionTone(score) {
  if (score >= 80) return 'text-success-green'
  if (score >= 50) return 'text-brand-blue'
  return 'text-forge-orange'
}

export default function ProfileClient({
  currentUser,
  initialAccount,
  initialProfiles,
  initialWarnings = [],
}) {
  const [isPending, startTransition] = useTransition()
  const [deletingProfileId, setDeletingProfileId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [account, setAccount] = useState(initialAccount)
  const [profiles, setProfiles] = useState(initialProfiles)
  const [warnings] = useState(initialWarnings)
  const [form, setForm] = useState(() => createFormState(initialAccount, currentUser))

  const defaultProfile = useMemo(
    () => profiles.find((profile) => profile.isDefault) ?? profiles[0] ?? null,
    [profiles],
  )

  const handleDeleteProfile = (profile) => {
    if (!window.confirm(`Delete "${profile.title}"? This will also remove its saved CV analyses.`)) {
      return
    }

    setMessage('')
    setError('')
    setDeletingProfileId(profile._id)

    startTransition(async () => {
      try {
        await requestJson(`/api/cv/profiles/${profile._id}`, {
          method: 'DELETE',
        })

        setProfiles((current) => {
          const remaining = current.filter((entry) => entry._id !== profile._id)
          if (remaining.length === 0) {
            return []
          }

          if (remaining.some((entry) => entry.isDefault)) {
            return remaining
          }

          return remaining.map((entry, index) => ({
            ...entry,
            isDefault: index === 0,
          }))
        })
        setMessage(`"${profile.title}" was deleted successfully.`)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to delete this profile.')
      } finally {
        setDeletingProfileId('')
      }
    })
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setMessage('')
    setError('')

    startTransition(async () => {
      try {
        const result = await requestJson('/api/profile/me', {
          method: 'PATCH',
          body: JSON.stringify(buildPayload(form)),
        })

        setAccount(result.account)
        setForm(createFormState(result.account, result.user))
        setMessage('Account details updated successfully.')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        {warnings.length > 0 ? (
          <section
            aria-label="Account notices"
            className="rounded-[2rem] border border-forge-orange bg-orange-soft p-6 shadow-sm"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-forge-orange">
              Account notices
            </p>
            <h2 className="mt-2 text-2xl font-bold text-navy">Action may be required</h2>
            <div className="mt-5 space-y-3">
              {warnings.map((warning) => (
                <article key={warning._id} className="rounded-2xl border border-forge-orange/30 bg-surface p-4">
                  <p className="text-sm leading-6 text-text-main">{warning.message}</p>
                  <p className="mt-2 text-xs font-medium text-text-muted">
                    Sent {formatDate(warning.createdAt)}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-[2rem] border border-border bg-surface p-5 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-blue">
                Profile Hub
              </p>
              <h1 className="mt-3 text-4xl font-bold text-navy">
                {account.firstName} {account.lastName}
              </h1>
              <p className="mt-2 text-text-muted">{account.email}</p>
              <p className="mt-3 max-w-2xl text-sm text-text-muted">
                This page combines account-level identity details with the professional CV
                profiles you use throughout the app.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <QuickStat label="Professional Profiles" value={profiles.length} />
              <QuickStat
                label="Default Profile"
                value={defaultProfile?.title ?? 'Not set'}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-8">
            <div className="rounded-[1.75rem] border border-border bg-background/80 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-navy">Account details</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
                    These details stay consistent across your professional CV profiles and help
                    keep your workspace organized.
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-text-muted">
                  <p className="font-semibold text-navy">Shared identity layer</p>
                  <p className="mt-1">Used across profile, progress, job tracking, and support.</p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-6">
                <FormSection
                  eyebrow="Identity"
                  title="Basic account information"
                  description="Your core personal details and the email tied to this Career Forge account."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      id="firstName"
                      label="First Name"
                      value={form.firstName}
                      onChange={(value) => setForm((current) => ({ ...current, firstName: value }))}
                    />
                    <Field
                      id="lastName"
                      label="Last Name"
                      value={form.lastName}
                      onChange={(value) => setForm((current) => ({ ...current, lastName: value }))}
                    />
                    <Field
                      id="email"
                      label="Email"
                      type="email"
                      value={form.email}
                      disabled
                      hint="This is managed by your account and cannot be edited here."
                    />
                    <Field
                      id="dateOfBirth"
                      label="Date of Birth"
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(value) => setForm((current) => ({ ...current, dateOfBirth: value }))}
                    />
                  </div>
                </FormSection>

                <FormSection
                  eyebrow="Professional"
                  title="Career-facing summary"
                  description="A short headline and location that help describe your professional direction."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field
                      id="headline"
                      label="Professional Headline"
                      value={form.headline}
                      onChange={(value) => setForm((current) => ({ ...current, headline: value }))}
                      placeholder="Frontend developer focused on React and UX"
                      className="md:col-span-2"
                    />
                    <Field
                      id="location"
                      label="Location"
                      value={form.location}
                      onChange={(value) => setForm((current) => ({ ...current, location: value }))}
                      placeholder="Toronto, ON"
                    />
                    <Field
                      id="phone"
                      label="Phone"
                      value={form.phone}
                      onChange={(value) => setForm((current) => ({ ...current, phone: value }))}
                      placeholder="+1 555 0100"
                    />
                  </div>
                </FormSection>
              </div>

              <div className="space-y-6">
                <FormSection
                  eyebrow="Links"
                  title="Professional presence"
                  description="Add the links you actually use so your account stays relevant and clean."
                >
                  <div className="space-y-4">
                    <Field
                      id="linkedinUrl"
                      label="LinkedIn URL"
                      value={form.linkedinUrl}
                      onChange={(value) => setForm((current) => ({ ...current, linkedinUrl: value }))}
                      placeholder="https://linkedin.com/in/your-name"
                    />
                    <Field
                      id="githubUrl"
                      label="GitHub URL"
                      value={form.githubUrl}
                      onChange={(value) => setForm((current) => ({ ...current, githubUrl: value }))}
                      placeholder="https://github.com/your-name"
                    />
                    <Field
                      id="portfolioUrl"
                      label="Portfolio URL"
                      value={form.portfolioUrl}
                      onChange={(value) => setForm((current) => ({ ...current, portfolioUrl: value }))}
                      placeholder="https://yourportfolio.dev"
                    />
                  </div>
                </FormSection>

                <div className="rounded-[1.75rem] border border-border bg-navy p-6 text-white shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-soft">
                    Profile note
                  </p>
                  <h3 className="mt-3 text-xl font-bold">Keep this section concise</h3>
                  <p className="mt-3 text-sm leading-6 text-blue-soft">
                    This account form is for your stable information. More tailored resume content
                    belongs in your CV profiles inside CV Assistant.
                  </p>
                </div>
              </div>
            </div>

            {message ? (
              <p className="rounded-xl bg-blue-soft px-4 py-3 text-sm font-medium text-brand-blue">
                {message}
              </p>
            ) : null}

            {error ? (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {error}
              </p>
            ) : null}

            <div className="flex flex-col gap-4 rounded-[1.75rem] border border-border bg-background/80 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-navy">Ready to save your account details?</p>
                <p className="mt-1 text-sm text-text-muted">
                  Last updated on {formatDate(account.updatedAt)}.
                </p>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center justify-center rounded-xl bg-brand-blue px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-hover disabled:opacity-70"
              >
                {isPending ? 'Saving...' : 'Save account details'}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-[2rem] border border-border bg-surface p-5 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-blue">
                Professional Profiles
              </p>
              <h2 className="mt-3 text-2xl font-bold text-navy">Your CV workspaces</h2>
              <p className="mt-2 max-w-2xl text-sm text-text-muted">
                These are the professional profiles you use in CV Assistant, job tracking,
                and resume generation.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/cv-assistant"
                className="rounded-xl bg-brand-blue px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-hover"
              >
                Open CV Assistant
              </Link>
              <Link
                href="/jobs"
                className="rounded-xl border border-border px-5 py-3 text-sm font-semibold text-text-muted transition-colors hover:border-brand-blue hover:text-brand-blue"
              >
                Go to Job Listings
              </Link>
            </div>
          </div>

          {profiles.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-border bg-background p-8 text-center">
              <p className="text-sm text-text-muted">
                You do not have any professional profiles yet. Import a CV in the assistant to create your first one.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {profiles.map((profile) => (
                <article
                  key={profile._id}
                  className="rounded-3xl border border-border bg-background p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-navy">{profile.title}</h3>
                      <p className="mt-1 text-sm text-text-muted">
                        {profile.targetRole ?? profile.professionalNiche ?? 'No target role set yet'}
                      </p>
                    </div>
                    {profile.isDefault ? (
                      <span className="rounded-full bg-cyan-soft px-3 py-1 text-xs font-semibold text-success-green">
                        Default
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-5 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full rounded-full bg-success-green"
                        style={{ width: `${Math.min(100, profile.completionScore)}%` }}
                      />
                    </div>
                    <span className={`text-sm font-semibold ${getCompletionTone(profile.completionScore)}`}>
                      {profile.completionScore}%
                    </span>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3 text-sm text-text-muted">
                    <span>Updated {formatDate(profile.updatedAt)}</span>
                    <div className="flex items-center gap-3">
                      <Link
                        href="/cv-assistant"
                        className="font-semibold text-brand-blue hover:underline"
                      >
                        Manage profile
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeleteProfile(profile)}
                        disabled={isPending || deletingProfileId === profile._id}
                        className="font-semibold text-red-600 transition-colors hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingProfileId === profile._id ? 'Deleting...' : 'Delete profile'}
                      </button>
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

function FormSection({ eyebrow, title, description, children }) {
  return (
    <section className="rounded-[1.75rem] border border-border bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">{eyebrow}</p>
      <h3 className="mt-3 text-xl font-bold text-navy">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-text-muted">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  )
}

function Field({
  id,
  label,
  type = 'text',
  value,
  onChange,
  disabled = false,
  placeholder = '',
  hint = '',
  className = '',
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange?.(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-border bg-background/90 px-4 py-3.5 text-sm text-text-main outline-none transition focus:border-brand-blue focus:bg-white disabled:cursor-not-allowed disabled:border-border/70 disabled:bg-slate-100 disabled:text-text-muted"
      />
      {hint ? <p className="mt-2 text-xs text-text-muted">{hint}</p> : null}
    </label>
  )
}

function QuickStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-background px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className="mt-2 text-lg font-bold text-navy">{value}</p>
    </div>
  )
}
