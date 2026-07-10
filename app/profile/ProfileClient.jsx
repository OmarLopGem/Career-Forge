'use client'

import { useState, useTransition } from 'react'
import { requestJson } from '@/lib/job-tracker/client/api.js'

// The profile editor keeps a form-specific shape so the UI can work with free-form
// skills text and repeatable experience rows before normalizing for the API.
function createDefaultExperienceItem() {
  return {
    company: '',
    title: '',
    startDate: '',
    endDate: '',
    description: '',
  }
}

function createFormState(profile) {
  return {
    photoUrl: profile?.photoUrl ?? '',
    headline: profile?.headline ?? '',
    description: profile?.description ?? '',
    skillsText: Array.isArray(profile?.skills) ? profile.skills.join(', ') : '',
    experience: Array.isArray(profile?.experience) && profile.experience.length
      ? profile.experience
      : [createDefaultExperienceItem()],
  }
}

function buildPayload(form) {
  return {
    photoUrl: form.photoUrl,
    headline: form.headline,
    description: form.description,
    skills: form.skillsText
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean),
    experience: form.experience,
  }
}

export default function ProfileClient({ currentUser, initialProfile }) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState(createFormState(initialProfile))

  const updateExperience = (index, field, value) => {
    setForm((current) => ({
      ...current,
      experience: current.experience.map((item, currentIndex) => (
        currentIndex === index
          ? { ...item, [field]: value }
          : item
      )),
    }))
  }

  const addExperience = () => {
    setForm((current) => ({
      ...current,
      experience: [...current.experience, createDefaultExperienceItem()],
    }))
  }

  const removeExperience = (index) => {
    setForm((current) => ({
      ...current,
      experience: current.experience.filter((_, currentIndex) => currentIndex !== index),
    }))
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

        setForm(createFormState(result.profile))
        setMessage('Profile updated successfully.')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10">
      <div className="mx-auto max-w-5xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--brand-blue)]">
            Career Profile
          </p>
          <h1 className="text-4xl font-bold text-[var(--navy)]">
            {currentUser.firstName} {currentUser.lastName}
          </h1>
          <p className="text-[var(--text-muted)]">{currentUser.email}</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          <div className="grid gap-5 md:grid-cols-2">
            <Field
              id="photoUrl"
              label="Photo URL"
              value={form.photoUrl}
              onChange={(value) => setForm((current) => ({ ...current, photoUrl: value }))}
            />
            <Field
              id="headline"
              label="Professional Headline"
              value={form.headline}
              onChange={(value) => setForm((current) => ({ ...current, headline: value }))}
            />
          </div>

          <TextAreaField
            id="description"
            label="Description"
            rows={5}
            value={form.description}
            onChange={(value) => setForm((current) => ({ ...current, description: value }))}
          />

          <TextAreaField
            id="skills"
            label="Skills"
            rows={3}
            hint="Separate each skill with a comma."
            value={form.skillsText}
            onChange={(value) => setForm((current) => ({ ...current, skillsText: value }))}
          />

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[var(--navy)]">Experience</h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Add the roles you want to highlight in your profile.
                </p>
              </div>

              <button
                type="button"
                onClick={addExperience}
                className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--navy)] hover:bg-[var(--blue-soft)]"
              >
                Add experience
              </button>
            </div>

            {form.experience.map((item, index) => (
              <div
                key={`${item.company}-${index}`}
                className="rounded-2xl border border-[var(--border)] bg-white p-5"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    id={`company-${index}`}
                    label="Company"
                    value={item.company}
                    onChange={(value) => updateExperience(index, 'company', value)}
                  />
                  <Field
                    id={`title-${index}`}
                    label="Job Title"
                    value={item.title}
                    onChange={(value) => updateExperience(index, 'title', value)}
                  />
                  <Field
                    id={`startDate-${index}`}
                    label="Start Date"
                    type="month"
                    value={item.startDate}
                    onChange={(value) => updateExperience(index, 'startDate', value)}
                  />
                  <Field
                    id={`endDate-${index}`}
                    label="End Date"
                    type="month"
                    value={item.endDate}
                    onChange={(value) => updateExperience(index, 'endDate', value)}
                  />
                </div>

                <div className="mt-4">
                  <TextAreaField
                    id={`description-${index}`}
                    label="Role Description"
                    rows={4}
                    value={item.description}
                    onChange={(value) => updateExperience(index, 'description', value)}
                  />
                </div>

                {form.experience.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeExperience(index)}
                    className="mt-4 text-sm font-semibold text-red-600 hover:underline"
                  >
                    Remove experience
                  </button>
                ) : null}
              </div>
            ))}
          </section>

          {message ? (
            <p className="rounded-xl bg-[var(--blue-soft)] px-4 py-3 text-sm font-medium text-[var(--brand-blue)]">
              {message}
            </p>
          ) : null}

          {error ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl bg-[var(--brand-blue)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--brand-blue-hover)] disabled:opacity-70"
          >
            {isPending ? 'Saving...' : 'Save profile'}
          </button>
        </form>
      </div>
    </main>
  )
}

function Field({ id, label, type = 'text', value, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[var(--navy)]">{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--brand-blue)]"
      />
    </label>
  )
}

function TextAreaField({ id, label, value, onChange, rows, hint }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[var(--navy)]">{label}</span>
      {hint ? (
        <p className="mt-1 text-sm text-[var(--text-muted)]">{hint}</p>
      ) : null}
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--brand-blue)]"
      />
    </label>
  )
}
