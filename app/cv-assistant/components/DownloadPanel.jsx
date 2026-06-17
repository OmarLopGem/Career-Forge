'use client'

export default function DownloadPanel({ template, generating, error, onGenerate, canGenerate }) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-6 md:p-8 shadow-sm">
      <h3 className="text-lg font-bold text-navy">Download your resume</h3>
      <p className="mt-1 text-sm text-text-muted">
        The PDF is generated on demand and is not stored on our servers.
      </p>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-border bg-background p-5">
          <p className="text-xs font-semibold tracking-widest text-text-muted">
            SELECTED TEMPLATE
          </p>
          {template ? (
            <>
              <p className="mt-2 text-base font-semibold text-navy">{template.name}</p>
              <p className="mt-1 text-sm text-text-muted">{template.description}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-text-muted">No template selected yet.</p>
          )}
        </div>

        <div className="rounded-2xl border border-dashed border-border bg-background p-5 flex flex-col items-center justify-center text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-10 w-10 text-text-muted"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M9 13h6" />
            <path d="M9 17h6" />
          </svg>
          <p className="mt-3 text-sm font-semibold text-navy">PDF preview</p>
          <p className="mt-1 text-xs text-text-muted">
            Preview is generated when you click download.
          </p>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-forge-orange/40 bg-orange-soft px-4 py-2 text-sm text-forge-orange"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate || generating}
          className="inline-flex flex-1 sm:flex-none items-center justify-center rounded-xl bg-brand-blue px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-brand-blue-hover hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {generating ? 'Generating PDF…' : 'Generate and download PDF'}
        </button>
        <p className="text-xs text-text-muted">
          Files are generated on demand and not stored.
        </p>
      </div>
    </div>
  )
}
