'use client'

export default function ProfileCompletionCard({ completion }) {
  const score = Math.round(completion.score)
  const missingRequired = completion.missingRequiredFields
  const isComplete = completion.isMinimumComplete

  return (
    <div className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-navy">Profile completion</h3>
        <span
          className={[
            'rounded-full px-3 py-1 text-xs font-semibold',
            isComplete
              ? 'bg-cyan-soft text-success-green'
              : 'bg-orange-soft text-forge-orange',
          ].join(' ')}
        >
          {isComplete ? 'Ready to generate' : 'Needs more data'}
        </span>
      </div>

      <div className="mt-5 flex items-center gap-4">
        <div className="relative h-20 w-20 shrink-0">
          <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
            <circle
              cx="18"
              cy="18"
              r="15.9155"
              fill="none"
              stroke="rgb(203 213 225)"
              strokeWidth="3"
            />
            <circle
              cx="18"
              cy="18"
              r="15.9155"
              fill="none"
              stroke={isComplete ? 'rgb(16 101 47)' : 'rgb(158 52 10)'}
              strokeWidth="3"
              strokeDasharray={`${score} ${100 - score}`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-navy">
            {score}%
          </span>
        </div>
        <div className="flex-1">
          <p className="text-sm text-text-muted">
            {isComplete
              ? 'Your profile meets the minimum requirements. You can generate a resume.'
              : 'Complete the missing required fields before generating a resume.'}
          </p>
        </div>
      </div>

      {missingRequired.length > 0 ? (
        <div className="mt-5 rounded-2xl border border-border bg-background p-4">
          <p className="text-xs font-semibold tracking-widest text-text-muted">
            MISSING REQUIRED FIELDS
          </p>
          <ul className="mt-3 space-y-2 text-sm text-navy">
            {missingRequired.map((field) => (
              <li key={field} className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-1 h-1.5 w-1.5 rounded-full bg-forge-orange"
                />
                <span>{field}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {completion.missingRecommendedFields.length > 0 ? (
        <div className="mt-3 rounded-2xl border border-border bg-background p-4">
          <p className="text-xs font-semibold tracking-widest text-text-muted">
            RECOMMENDED
          </p>
          <ul className="mt-3 space-y-2 text-sm text-text-muted">
            {completion.missingRecommendedFields.map((field) => (
              <li key={field} className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-blue"
                />
                <span>{field}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
