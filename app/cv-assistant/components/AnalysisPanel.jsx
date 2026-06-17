'use client'

export default function AnalysisPanel({ analysis, loading, error, onRun, canRun }) {
  if (loading) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-8 text-center text-sm text-text-muted">
        Running AI analysis…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-forge-orange/40 bg-orange-soft p-6 text-sm text-forge-orange">
        {error}
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-8 text-center">
        <h3 className="text-lg font-bold text-navy">Run your AI analysis</h3>
        <p className="mt-2 text-sm text-text-muted">
          We will detect your professional niche, summarize strengths and weaknesses, and
          suggest roles and keywords.
        </p>
        <button
          type="button"
          onClick={onRun}
          disabled={!canRun}
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-brand-blue-hover hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60"
        >
          Run analysis
        </button>
        {!canRun ? (
          <p className="mt-3 text-xs text-text-muted">
            Complete missing required profile fields first.
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-brand-blue/30 bg-blue-soft p-6">
        <p className="text-xs font-semibold tracking-widest text-brand-blue">
          DETECTED NICHE
        </p>
        <h3 className="mt-2 text-2xl font-bold text-navy">
          {analysis.detectedNiche}
        </h3>
        {analysis.nicheReasoning ? (
          <p className="mt-2 text-sm leading-6 text-text-muted">
            {analysis.nicheReasoning}
          </p>
        ) : null}
        <button
          type="button"
          onClick={onRun}
          className="mt-4 inline-flex items-center justify-center rounded-xl border border-brand-blue bg-surface px-4 py-2 text-sm font-semibold text-brand-blue transition-all duration-300 hover:bg-blue-soft"
        >
          Re-run analysis
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <AnalysisColumn
          title="Strengths"
          tone="success"
          items={analysis.strengths}
        />
        <AnalysisColumn
          title="Areas to improve"
          tone="warning"
          items={analysis.improvementSuggestions}
        />
        <AnalysisColumn
          title="Weaknesses"
          tone="danger"
          items={analysis.weaknesses}
        />
        <AnalysisCard
          title="ATS feedback"
          tone="info"
          headerRight={
            <span className="text-2xl font-bold text-brand-blue">
              {analysis.atsFeedback.score ?? '—'}
            </span>
          }
        >
          {analysis.atsFeedback.comments.length > 0 ? (
            <ul className="space-y-1.5 text-sm text-text-main">
              {analysis.atsFeedback.comments.map((c, i) => (
                <li key={i}>• {c}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-muted">No general ATS comments.</p>
          )}
          {analysis.atsFeedback.formattingWarnings.length > 0 ? (
            <div className="mt-3 rounded-xl border border-forge-orange/40 bg-orange-soft p-3 text-sm text-forge-orange">
              <p className="text-xs font-semibold tracking-wider">FORMATTING WARNINGS</p>
              <ul className="mt-2 space-y-1">
                {analysis.atsFeedback.formattingWarnings.map((w, i) => (
                  <li key={i}>• {w}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </AnalysisCard>
        <AnalysisCard title="Suggested roles" tone="info">
          <ul className="space-y-2">
            {analysis.suggestedRoles.map((role, i) => (
              <li
                key={i}
                className="rounded-xl border border-border bg-background px-3 py-2"
              >
                <p className="text-sm font-semibold text-navy">{role.title}</p>
                {role.reasoning ? (
                  <p className="text-xs text-text-muted">{role.reasoning}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </AnalysisCard>
        <AnalysisCard title="Keyword gaps" tone="info">
          {analysis.keywordGaps.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {analysis.keywordGaps.map((kw) => (
                <span
                  key={kw}
                  className="rounded-full bg-blue-soft px-3 py-1 text-xs font-semibold text-brand-blue"
                >
                  {kw}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">No major keyword gaps detected.</p>
          )}
        </AnalysisCard>
      </div>
    </div>
  )
}

const TONE_COLORS = {
  success: 'border-success-green/40 bg-cyan-soft text-success-green',
  warning: 'border-forge-orange/40 bg-orange-soft text-forge-orange',
  danger: 'border-forge-orange/40 bg-orange-soft text-forge-orange',
  info: 'border-brand-blue/30 bg-blue-soft text-brand-blue',
}

const TONE_TITLE_COLORS = {
  success: 'text-success-green',
  warning: 'text-forge-orange',
  danger: 'text-forge-orange',
  info: 'text-brand-blue',
}

function AnalysisColumn({ title, tone, items }) {
  return (
    <AnalysisCard title={title} tone={tone}>
      {items.length === 0 ? (
        <p className="text-sm text-text-muted">Nothing detected.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li
              key={i}
              className="rounded-xl border border-border bg-background p-3"
            >
              <p className="text-sm font-semibold text-navy">{item.title}</p>
              <p className="text-xs text-text-muted">{item.description}</p>
              {item.section ? (
                <span
                  className={[
                    'mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                    TONE_COLORS[tone],
                  ].join(' ')}
                >
                  {item.section}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </AnalysisCard>
  )
}

function AnalysisCard({ title, tone, headerRight, children }) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h4
          className={[
            'text-xs font-semibold tracking-widest',
            TONE_TITLE_COLORS[tone],
          ].join(' ')}
        >
          {title.toUpperCase()}
        </h4>
        {headerRight}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  )
}
