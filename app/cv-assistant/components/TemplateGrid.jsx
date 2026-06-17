'use client'

const STATUS_LABEL = {
  recommended: 'Recommended',
  available: 'Available',
  needs_more_information: 'Needs more data',
  not_recommended: 'Not recommended',
}

const STATUS_STYLES = {
  recommended: 'bg-cyan-soft text-success-green',
  available: 'bg-blue-soft text-brand-blue',
  needs_more_information: 'bg-orange-soft text-forge-orange',
  not_recommended: 'bg-orange-soft text-forge-orange',
}

export default function TemplateGrid({ templates, onSelect, selectedKey }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {templates.map(({ template, evaluation }) => {
        const isSelected = selectedKey === template.key
        const canSelect =
          evaluation.status !== 'needs_more_information' &&
          evaluation.status !== 'not_recommended'
        return (
          <article
            key={template.key}
            className={[
              'group relative flex flex-col rounded-3xl border p-6 transition-all duration-300',
              isSelected
                ? 'border-brand-blue bg-blue-soft shadow-md -translate-y-0.5'
                : 'border-border bg-surface hover:-translate-y-0.5 hover:shadow-md hover:border-brand-blue/60',
            ].join(' ')}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-blue-soft px-3 py-1 text-xs font-semibold text-brand-blue capitalize">
                {template.category}
              </span>
              <span
                className={[
                  'rounded-full px-3 py-1 text-xs font-semibold',
                  STATUS_STYLES[evaluation.status],
                ].join(' ')}
              >
                {STATUS_LABEL[evaluation.status]}
              </span>
            </div>

            <h3 className="mt-4 text-lg font-bold text-navy">{template.name}</h3>
            <p className="mt-2 text-sm leading-6 text-text-muted">{template.description}</p>

            <div className="mt-4 rounded-2xl border border-border bg-background p-3">
              <p className="text-xs font-semibold tracking-widest text-text-muted">
                BEST FOR
              </p>
              <p className="mt-1 text-sm text-text-main">
                {template.bestFor.slice(0, 4).join(', ')}
                {template.bestFor.length > 4 ? '…' : ''}
              </p>
            </div>

            {evaluation.missingRequiredFields.length > 0 ? (
              <div className="mt-4 rounded-2xl border border-forge-orange/30 bg-orange-soft p-3 text-sm text-forge-orange">
                <p className="text-xs font-semibold tracking-wider">MISSING REQUIRED</p>
                <ul className="mt-1 space-y-1">
                  {evaluation.missingRequiredFields.map((m) => (
                    <li key={m}>• {m}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {evaluation.missingRecommendedFields.length > 0 ? (
              <details className="mt-3 text-xs text-text-muted">
                <summary className="cursor-pointer text-xs font-semibold text-text-muted">
                  Recommended additions ({evaluation.missingRecommendedFields.length})
                </summary>
                <ul className="mt-2 space-y-1 pl-3">
                  {evaluation.missingRecommendedFields.map((m) => (
                    <li key={m}>• {m}</li>
                  ))}
                </ul>
              </details>
            ) : null}

            <button
              type="button"
              disabled={!canSelect}
              onClick={() => canSelect && onSelect(template.key)}
              className={[
                'mt-5 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300',
                canSelect
                  ? isSelected
                    ? 'bg-brand-blue text-white'
                    : 'border border-brand-blue text-brand-blue hover:bg-blue-soft'
                  : 'cursor-not-allowed border border-border bg-background text-text-muted',
              ].join(' ')}
            >
              {isSelected ? 'Selected' : canSelect ? 'Select template' : 'Unavailable'}
            </button>
          </article>
        )
      })}
    </div>
  )
}
