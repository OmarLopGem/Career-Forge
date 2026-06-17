'use client'

import { CV_STEPS } from '@/lib/cv-assistant/ui-steps.js'

export default function CVAssistantStepper({ current, onJump, completed = [] }) {
  return (
    <ol className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {CV_STEPS.map((step) => {
        const isActive = step.key === current
        const isDone = completed.includes(step.key)
        const isClickable = Boolean(onJump) && (isDone || isActive)
        return (
          <li key={step.key}>
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onJump?.(step.key)}
              className={[
                'w-full text-left rounded-2xl border p-4 transition-all duration-300',
                isActive
                  ? 'border-brand-blue bg-blue-soft shadow-sm'
                  : isDone
                    ? 'border-success-green/40 bg-cyan-soft hover:border-brand-blue'
                    : 'border-border bg-surface',
                isClickable ? 'cursor-pointer hover:-translate-y-0.5' : 'cursor-default',
              ].join(' ')}
            >
              <div className="flex items-center justify-between">
                <span
                  className={[
                    'text-xs font-semibold tracking-widest',
                    isActive
                      ? 'text-brand-blue'
                      : isDone
                        ? 'text-success-green'
                        : 'text-text-muted',
                  ].join(' ')}
                >
                  STEP {step.number}
                </span>
                {isDone && !isActive ? (
                  <span className="h-2 w-2 rounded-full bg-success-green" aria-hidden="true" />
                ) : null}
              </div>
              <p
                className={[
                  'mt-2 text-sm font-semibold',
                  isActive ? 'text-navy' : 'text-text-main',
                ].join(' ')}
              >
                {step.label}
              </p>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
