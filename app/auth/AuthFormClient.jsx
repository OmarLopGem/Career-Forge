'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { requestJson } from '@/lib/job-tracker/client/api.js'

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
      'Create your Mongo-backed Career Forge account to track listings, applications, reminders, and progress in one place.',
    submit: 'Register',
    alternateText: 'Already have an account?',
    alternateHref: '/login',
    alternateLabel: 'Sign in',
  },
}

export default function AuthFormClient({ mode, redirectTo = '/calendar' }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
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

    if (mode === 'register' && form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    startTransition(async () => {
      try {
        const payload = mode === 'register'
          ? {
              firstName: form.firstName,
              lastName: form.lastName,
              email: form.email,
              password: form.password,
            }
          : {
              email: form.email,
              password: form.password,
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
        required
      />
    </label>
  )
}
