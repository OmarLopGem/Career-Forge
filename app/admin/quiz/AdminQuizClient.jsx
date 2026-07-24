'use client'

import { useMemo, useState, useTransition } from 'react'
import { requestJson } from '@/lib/job-tracker/client/api.js'

const initialForm = {
  jobType: '',
  type: 'mcq',
  difficulty: 'Beginner',
  question: '',
  options: '',
  answer: '',
  marks: '0.5',
  source: 'manual',
}

const initialAIForm = {
  jobType: '',
  topic: '',
  difficulty: 'Beginner',
  type: 'mixed',
  count: '5',
}

function difficultyStyle(difficulty) {
  if (difficulty === 'Advanced') return 'bg-blue-soft text-brand-blue'
  if (difficulty === 'Intermediate') return 'bg-orange-soft text-forge-orange'
  return 'bg-cyan-soft text-success-green'
}

function typeLabel(type) {
  if (type === 'mcq') return 'Multiple choice'
  if (type === 'blank') return 'Fill in the blank'
  return 'Short answer'
}

export default function AdminQuizClient({ initialQuestions }) {
  const [questions, setQuestions] = useState(initialQuestions)
  const [form, setForm] = useState(initialForm)
  const [aiForm, setAIForm] = useState(initialAIForm)
  const [aiDrafts, setAIDrafts] = useState([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [aiMessage, setAIMessage] = useState('')
  const [aiError, setAIError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPending, startTransition] = useTransition()

  const summary = useMemo(() => {
    const byDifficulty = questions.reduce(
      (counts, question) => ({
        ...counts,
        [question.difficulty]: (counts[question.difficulty] ?? 0) + 1,
      }),
      {},
    )
    return {
      total: questions.length,
      Beginner: byDifficulty.Beginner ?? 0,
      Intermediate: byDifficulty.Intermediate ?? 0,
      Advanced: byDifficulty.Advanced ?? 0,
    }
  }, [questions])

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))
  }

  const updateAIField = (name, value) => {
    setAIForm((current) => ({ ...current, [name]: value }))
  }

  const handleAIGenerate = async (event) => {
    event.preventDefault()
    setAIMessage('')
    setAIError('')
    setIsGenerating(true)

    try {
      const result = await requestJson('/api/admin/quiz/generate', {
        method: 'POST',
        body: JSON.stringify(aiForm),
      })
      setAIDrafts(result.drafts ?? [])
      setAIMessage(
        `Generated ${result.count} draft${result.count === 1 ? '' : 's'}. Review a draft before saving it.`,
      )
    } catch (err) {
      setAIDrafts([])
      setAIError(err instanceof Error ? err.message : 'Unable to generate quiz questions.')
    } finally {
      setIsGenerating(false)
    }
  }

  const selectAIDraft = (draft) => {
    setForm({
      jobType: draft.jobType,
      type: draft.type,
      difficulty: draft.difficulty,
      question: draft.question,
      options: draft.options.join('\n'),
      answer: draft.answer,
      marks: String(draft.marks),
      source: 'ai',
    })
    setMessage('AI draft loaded. Review or edit it, then add it to the question bank.')
    setError('')
    document.getElementById('manual-question-form')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setMessage('')
    setError('')

    startTransition(async () => {
      try {
        const { question } = await requestJson('/api/admin/quiz', {
          method: 'POST',
          body: JSON.stringify({
            ...form,
            options: form.type === 'mcq' ? form.options.split(/\n|,/).map((option) => option.trim()) : [],
          }),
        })
        setQuestions((current) => [question, ...current])
        setForm(initialForm)
        setMessage('Quiz question added and ready for users to practice.')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to add quiz question.')
      }
    })
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-[2rem] border border-border bg-surface p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-blue">Quiz library</p>
          <h1 className="mt-3 text-4xl font-bold text-navy">Create practice questions</h1>
          <p className="mt-3 max-w-3xl text-text-muted">
            Build focused interview practice by job type and difficulty. New questions become available to users immediately.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-4">
            <Stat label="All questions" value={summary.total} tone="bg-blue-soft text-brand-blue" />
            <Stat label="Beginner" value={summary.Beginner} tone="bg-cyan-soft text-success-green" />
            <Stat label="Intermediate" value={summary.Intermediate} tone="bg-orange-soft text-forge-orange" />
            <Stat label="Advanced" value={summary.Advanced} tone="bg-navy text-white" />
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[2rem] bg-navy p-8 text-white shadow-xl">
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-20 h-56 w-56 rounded-full border-[32px] border-forge-orange/20"
          />
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-forge-orange via-blue-soft to-transparent"
          />

          <div className="relative">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-200">
                  AI question studio
                </p>
                <h2 className="mt-3 text-3xl font-bold">Generate a review-ready quiz set</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                  Choose the role, topic, level, and format. AI creates drafts only;
                  you decide which questions enter the live question bank.
                </p>
              </div>
              <span className="inline-flex w-fit rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-slate-200">
                Human review required
              </span>
            </div>

            <form onSubmit={handleAIGenerate} className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
              <label className="block xl:col-span-2">
                <span className="text-sm font-semibold text-white">Job type</span>
                <input
                  required
                  maxLength={100}
                  value={aiForm.jobType}
                  onChange={(event) => updateAIField('jobType', event.target.value)}
                  placeholder="e.g., Backend Developer"
                  className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-orange-300"
                />
              </label>

              <label className="block xl:col-span-3">
                <span className="text-sm font-semibold text-white">Topic or skill</span>
                <input
                  maxLength={200}
                  value={aiForm.topic}
                  onChange={(event) => updateAIField('topic', event.target.value)}
                  placeholder="e.g., REST APIs, React hooks, SQL joins"
                  className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-orange-300"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-white">Difficulty</span>
                <select
                  value={aiForm.difficulty}
                  onChange={(event) => updateAIField('difficulty', event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/20 bg-navy px-4 py-3 text-sm text-white outline-none transition focus:border-orange-300"
                >
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </label>

              <label className="block xl:col-span-2">
                <span className="text-sm font-semibold text-white">Question format</span>
                <select
                  value={aiForm.type}
                  onChange={(event) => updateAIField('type', event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/20 bg-navy px-4 py-3 text-sm text-white outline-none transition focus:border-orange-300"
                >
                  <option value="mixed">Mixed set</option>
                  <option value="mcq">Multiple choice</option>
                  <option value="blank">Fill in the blank</option>
                  <option value="short">Short answer</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-white">Draft count</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={aiForm.count}
                  onChange={(event) => updateAIField('count', event.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none transition focus:border-orange-300"
                />
              </label>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full rounded-xl bg-forge-orange px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGenerating ? 'Generating drafts...' : 'Generate with AI'}
                </button>
              </div>
            </form>

            {aiMessage ? (
              <p className="mt-5 rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">
                {aiMessage}
              </p>
            ) : null}
            {aiError ? (
              <p className="mt-5 rounded-xl border border-red-300/30 bg-red-300/10 px-4 py-3 text-sm text-red-100">
                {aiError}
              </p>
            ) : null}

            {aiDrafts.length > 0 ? (
              <div className="mt-7 grid gap-4 lg:grid-cols-2">
                {aiDrafts.map((draft, index) => (
                  <article
                    key={`${draft.question}-${index}`}
                    className="rounded-2xl border border-white/15 bg-white/[0.07] p-5 backdrop-blur-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                        Draft {index + 1}
                      </span>
                      <span className="rounded-full bg-orange-300/15 px-3 py-1 text-xs font-semibold text-orange-100">
                        {draft.difficulty}
                      </span>
                      <span className="rounded-full bg-blue-300/15 px-3 py-1 text-xs font-semibold text-blue-100">
                        {typeLabel(draft.type)}
                      </span>
                    </div>
                    <h3 className="mt-4 font-semibold leading-6 text-white">{draft.question}</h3>
                    {draft.options.length > 0 ? (
                      <ol className="mt-3 grid gap-1 text-sm text-slate-300 sm:grid-cols-2">
                        {draft.options.map((option) => (
                          <li key={option}>• {option}</li>
                        ))}
                      </ol>
                    ) : null}
                    <p className="mt-4 text-sm text-slate-300">
                      <span className="font-semibold text-white">Answer:</span> {draft.answer}
                    </p>
                    <button
                      type="button"
                      onClick={() => selectAIDraft(draft)}
                      className="mt-5 rounded-xl border border-orange-200/40 bg-orange-200/10 px-4 py-2.5 text-sm font-semibold text-orange-100 transition hover:bg-orange-200/20"
                    >
                      Review this draft
                    </button>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-[2rem] border border-border bg-surface p-8 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-navy">New question</h2>
            <p className="mt-2 text-sm text-text-muted">Use a precise question and answer so scoring stays reliable.</p>
          </div>

          <form
            id="manual-question-form"
            onSubmit={handleSubmit}
            className="mt-7 scroll-mt-28 grid gap-5 md:grid-cols-2"
          >
            <Field label="Job type" id="jobType">
              <input
                id="jobType"
                required
                maxLength={100}
                value={form.jobType}
                onChange={(event) => updateField('jobType', event.target.value)}
                placeholder="e.g., Frontend Developer"
                className="field"
              />
            </Field>

            <Field label="Difficulty" id="difficulty">
              <select
                id="difficulty"
                value={form.difficulty}
                onChange={(event) => updateField('difficulty', event.target.value)}
                className="field"
              >
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
              </select>
            </Field>

            <Field label="Question type" id="type">
              <select
                id="type"
                value={form.type}
                onChange={(event) => updateField('type', event.target.value)}
                className="field"
              >
                <option value="mcq">Multiple choice</option>
                <option value="blank">Fill in the blank</option>
                <option value="short">Short answer</option>
              </select>
            </Field>

            <Field label="Marks" id="marks">
              <input
                id="marks"
                type="number"
                required
                min="0.1"
                max="10"
                step="0.1"
                value={form.marks}
                onChange={(event) => updateField('marks', event.target.value)}
                className="field"
              />
            </Field>

            <Field label="Question" id="question" className="md:col-span-2">
              <textarea
                id="question"
                required
                maxLength={1000}
                value={form.question}
                onChange={(event) => updateField('question', event.target.value)}
                placeholder="Ask one clear interview question."
                className="field min-h-28"
              />
            </Field>

            {form.type === 'mcq' ? (
              <Field label="Options" id="options" hint="One option per line or separated by commas." className="md:col-span-2">
                <textarea
                  id="options"
                  required
                  value={form.options}
                  onChange={(event) => updateField('options', event.target.value)}
                  placeholder={'useState\nuseEffect\nuseMemo'}
                  className="field min-h-28"
                />
              </Field>
            ) : null}

            <Field
              label={form.type === 'mcq' ? 'Correct option' : 'Expected answer'}
              id="answer"
              className="md:col-span-2"
            >
              <input
                id="answer"
                required
                maxLength={500}
                value={form.answer}
                onChange={(event) => updateField('answer', event.target.value)}
                placeholder={form.type === 'mcq' ? 'Must exactly match one option.' : 'Provide the answer used for scoring.'}
                className="field"
              />
            </Field>

            {message ? <p className="rounded-xl bg-cyan-soft px-4 py-3 text-sm font-medium text-success-green md:col-span-2">{message}</p> : null}
            {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 md:col-span-2">{error}</p> : null}

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-brand-blue px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-blue-hover disabled:opacity-60"
              >
                {isPending ? 'Adding question...' : 'Add question'}
              </button>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-border bg-surface shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border px-6 py-5">
            <div>
              <h2 className="text-xl font-bold text-navy">Current question bank</h2>
              <p className="mt-1 text-sm text-text-muted">Newest questions appear first.</p>
            </div>
            <span className="rounded-full bg-blue-soft px-3 py-1 text-sm font-semibold text-brand-blue">{questions.length} questions</span>
          </div>

          {questions.length === 0 ? (
            <p className="p-8 text-center text-sm text-text-muted">No questions have been created yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {questions.map((question) => (
                <article key={question._id} className="p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${difficultyStyle(question.difficulty)}`}>
                          {question.difficulty}
                        </span>
                        <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-text-muted">
                          {typeLabel(question.type)}
                        </span>
                        {question.source === 'ai' ? (
                          <span className="rounded-full bg-navy px-3 py-1 text-xs font-semibold text-white">
                            AI reviewed
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-3 font-bold text-navy">{question.question}</h3>
                      <p className="mt-2 text-sm text-text-muted">{question.jobType} · {question.marks} mark{question.marks === 1 ? '' : 's'}</p>
                    </div>
                    <div className="rounded-xl bg-background px-4 py-3 text-sm">
                      <p className="font-semibold text-navy">Answer</p>
                      <p className="mt-1 text-text-muted">{question.answer}</p>
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

function Field({ label, id, hint, className = '', children }) {
  return (
    <label htmlFor={id} className={`block ${className}`}>
      <span className="text-sm font-semibold text-navy">{label}</span>
      {hint ? <span className="ml-2 text-xs text-text-muted">{hint}</span> : null}
      <div className="mt-2">{children}</div>
    </label>
  )
}

function Stat({ label, value, tone }) {
  return (
    <div className={`rounded-2xl p-4 ${tone}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.15em]">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  )
}
