'use client'

export default function ProfileList({ profiles, selectedId, onSelect }) {
  if (profiles.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-surface p-8 text-center">
        <p className="text-sm text-text-muted">
          You have no saved profiles yet. Upload a CV to create your first one.
        </p>
      </div>
    )
  }

  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {profiles.map((profile) => {
        const isActive = profile._id === selectedId
        return (
          <li key={profile._id}>
            <button
              type="button"
              onClick={() => onSelect(profile._id)}
              className={[
                'w-full text-left rounded-2xl border p-5 transition-all duration-300',
                isActive
                  ? 'border-brand-blue bg-blue-soft shadow-sm -translate-y-0.5'
                  : 'border-border bg-surface hover:border-brand-blue/60 hover:-translate-y-0.5 hover:shadow-sm',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-base font-bold text-navy">{profile.title}</h4>
                {profile.isDefault ? (
                  <span className="rounded-full bg-cyan-soft px-3 py-1 text-xs font-semibold text-success-green">
                    Default
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-text-muted">
                {profile.targetRole ?? 'No target role set'}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-success-green"
                    style={{ width: `${Math.min(100, profile.completionScore)}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-success-green">
                  {profile.completionScore}%
                </span>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
