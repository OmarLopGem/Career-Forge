'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { requestJson } from '@/lib/job-tracker/client/api.js'

// Client-side validation is only for fast feedback; the server still enforces
// the real auth rules and session creation.
const copyByMode = {
  login: {
    badge: 'Secure Login',
    title: 'Return to your career workspace.',
    description:
      'Sign in to keep your applications, reminders, job listings, and resume progress in sync.',
    submit: 'Login',
    alternateText: "Don't have an account yet?",
    alternateHref: '/register',
    alternateLabel: 'Create account',
  },
  register: {
    badge: 'Create Account',
    title: 'Start building your job search system.',
    description:
      'Create your Mongo-backed Career Forge account to track listings, applications, reminders, and progress in one place. Employers can register too — accounts are reviewed by an administrator before they can publish jobs.',
    submit: 'Register',
    alternateText: 'Already have an account?',
    alternateHref: '/login',
    alternateLabel: 'Sign in',
  },
}

export default function AuthFormClient({ mode, redirectTo = '/calendar', notice = '' }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    requestedRole: 'user',
    companyName: '',
    companyWebsite: '',
    companyIndustry: '',
    companySize: '',
  })

  const copy = useMemo(() => copyByMode[mode], [mode])

  const handleChange = (field) => (event) => {
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setError('')
    const email = form.email.trim()
    const password = form.password

    if (mode === 'register') {
      if (!form.firstName.trim() || !form.lastName.trim() || !email || !password) {
        setError('Please complete all required fields before continuing.')
        return
      }
    } else if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }

    if (mode === 'register' && form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (mode === 'register' && form.requestedRole === 'employer' && !form.companyName.trim()) {
      setError('Company name is required to register as an employer.')
      return
    }

    if (password && password.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }

    startTransition(async () => {
      try {
        const payload = mode === 'register'
          ? {
              firstName: form.firstName.trim(),
              lastName: form.lastName.trim(),
              email,
              password,
              requestedRole: form.requestedRole,
              companyName: form.companyName.trim(),
              companyWebsite: form.companyWebsite.trim(),
              companyIndustry: form.companyIndustry.trim(),
              companySize: form.companySize.trim(),
            }
          : {
              email,
              password,
            }

        await requestJson(`/api/auth/${mode}`, {
          method: 'POST',
          body: JSON.stringify(payload),
        })

        router.push(redirectTo || '/calendar')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    })
  }

  return (
    <div className="bg-background min-h-screen">
      <section className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-border bg-navy p-8 text-white md:p-10">
            <span className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-blue-100">
              {copy.badge}
            </span>

            <h1 className="mt-6 max-w-xl text-4xl font-bold tracking-tight md:text-5xl">
              {copy.title}
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
              {copy.description}
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                ['Global listings', 'Shared job catalog ready for tracking.'],
                ['Private calendar', 'Interviews, follow-ups, and reminders tied to your account.'],
                ['Mongo sessions', 'Authentication stays inside the project stack.'],
              ].map(([title, description]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-surface p-8 shadow-sm md:p-10">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-navy">
                  {mode === 'login' ? 'Welcome back' : 'Create your account'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-text-muted">
                  Your account will be used across the calendar, job listings, CV tools,
                  and future progress tracking modules.
                </p>
              </div>

              {mode === 'register' ? (
                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    id="firstName"
                    label="First Name"
                    value={form.firstName}
                    onChange={handleChange('firstName')}
                  />
                  <Field
                    id="lastName"
                    label="Last Name"
                    value={form.lastName}
                    onChange={handleChange('lastName')}
                  />
                </div>
              ) : null}

              {mode === 'register' ? (
                <div>
                  <span className="text-sm font-semibold text-navy">I am registering as a</span>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    {[
                      { value: 'user', label: 'Job Seeker', description: 'Build a CV and apply to jobs.' },
                      { value: 'employer', label: 'Employer', description: 'Post jobs and review applicants (approval required).' },
                    ].map((option) => {
                      const isActive = form.requestedRole === option.value
                      return (
                        <label
                          key={option.value}
                          className={`flex cursor-pointer flex-col rounded-xl border p-3 text-sm transition ${
                            isActive
                              ? 'border-brand-blue bg-blue-soft text-navy'
                              : 'border-border bg-background text-text-muted hover:border-brand-blue/60'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="requestedRole"
                              value={option.value}
                              checked={isActive}
                              onChange={handleChange('requestedRole')}
                              className="accent-brand-blue"
                            />
                            <span className="font-semibold">{option.label}</span>
                          </span>
                          <span className="mt-1 text-xs">{option.description}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              {mode === 'register' && form.requestedRole === 'employer' ? (
                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    id="companyName"
                    label="Company Name"
                    value={form.companyName}
                    onChange={handleChange('companyName')}
                  />
                  <Field
                    id="companyWebsite"
                    label="Company Website"
                    value={form.companyWebsite}
                    onChange={handleChange('companyWebsite')}
                  />
                  <Field
                    id="companyIndustry"
                    label="Industry"
                    value={form.companyIndustry}
                    onChange={handleChange('companyIndustry')}
                  />
                  <Field
                    id="companySize"
                    label="Company Size"
                    value={form.companySize}
                    onChange={handleChange('companySize')}
                  />
                </div>
              ) : null}

              <Field
                id="email"
                label="Email"
                type="email"
                value={form.email}
                onChange={handleChange('email')}
              />

              <Field
                id="password"
                label="Password"
                type="password"
                value={form.password}
                onChange={handleChange('password')}
              />

              {mode === 'register' ? (
                <Field
                  id="confirmPassword"
                  label="Confirm Password"
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleChange('confirmPassword')}
                />
              ) : null}

              {error ? (
                <p
                  role="alert"
                  className="rounded-2xl border border-forge-orange/30 bg-orange-soft px-4 py-3 text-sm text-forge-orange"
                >
                  {error}
                </p>
              ) : null}

              {!error && notice ? (
                <p
                  role="status"
                  className="rounded-2xl border border-forge-orange/30 bg-orange-soft px-4 py-3 text-sm text-forge-orange"
                >
                  {notice}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-xl bg-brand-blue px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-brand-blue-hover disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending ? 'Please wait...' : copy.submit}
              </button>

              <p className="text-sm text-text-muted">
                {copy.alternateText}{' '}
                <Link href={copy.alternateHref} className="font-semibold text-brand-blue hover:underline">
                  {copy.alternateLabel}
                </Link>
              </p>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}

function Field({ id, label, type = 'text', value, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-navy">{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-text-main outline-none transition-colors focus:border-brand-blue"
      />
    </label>
  )
}