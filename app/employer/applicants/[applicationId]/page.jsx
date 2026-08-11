import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUserFromRequest } from '@/lib/server/auth/current-user.js'
import {
  __resetEmployerApplicantProfileDedupForTests,
  serviceGetEmployerApplicantProfile,
} from '@/lib/job-tracker/server/employer-applicant.service.js'

export const dynamic = 'force-dynamic'

if (process.env.NODE_ENV === 'test') {
  // Exposed for integration tests so the in-memory dedup set does not leak
  // state between cases.
  globalThis.__resetEmployerApplicantProfileDedupForTests = __resetEmployerApplicantProfileDedupForTests
}

export default async function EmployerApplicantDetailPage({ params }) {
  const { applicationId } = await params
  const user = await getCurrentUserFromRequest()

  if (!user) {
    redirect(`/login?redirectTo=/employer/applicants/${applicationId}`)
  }

  if (user.role !== 'employer') {
    redirect('/')
  }

  let payload
  try {
    payload = await serviceGetEmployerApplicantProfile(applicationId)
  } catch (err) {
    const status = err?.status ?? 404
    if (status === 404) {
      redirect('/employer/applicants')
    }
    throw err
  }

  return (
    <main className="min-h-screen bg-background text-foreground px-5 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          href="/employer/applicants"
          className="inline-flex items-center gap-2 text-sm font-semibold text-text-muted transition hover:text-brand-blue"
        >
          ← Back to applicants
        </Link>

        <header className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-navy">
                {payload.candidate
                  ? `${payload.candidate.firstName} ${payload.candidate.lastName}`.trim()
                  : 'Unknown candidate'}
              </h1>
              <p className="text-text-muted">
                {payload.candidate?.headline || 'No headline'}
              </p>
              <p className="mt-1 text-sm text-text-muted">
                {payload.candidate?.location || 'Location not specified'}
              </p>
              <p className="mt-3 text-xs uppercase tracking-wide text-text-muted">
                Applied to: {payload.application.jobSnapshot?.title} ·{' '}
                {payload.application.jobSnapshot?.company}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Status: {payload.application.status}
              </p>
            </div>

            <a
              href={`mailto:${payload.candidate?.email ?? ''}`}
              className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-hover"
            >
              Contact
            </a>
          </div>
        </header>

        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-navy">CV submitted</h2>

          {payload.profile ? (
            <div className="mt-4 space-y-6">
              {payload.profile.target?.desiredRole || payload.profile.target?.seniority ? (
                <div>
                  <h3 className="text-sm font-semibold text-navy">Target role</h3>
                  <p className="text-text-muted">
                    {payload.profile.target?.desiredRole || '—'}
                    {payload.profile.target?.seniority
                      ? ` · ${payload.profile.target.seniority}`
                      : ''}
                  </p>
                </div>
              ) : null}

              {payload.profile.professionalSummary || payload.profile.summary ? (
                <div>
                  <h3 className="text-sm font-semibold text-navy">Professional summary</h3>
                  <p className="text-text-muted">
                    {payload.profile.professionalSummary ||
                      (typeof payload.profile.summary === 'string'
                        ? payload.profile.summary
                        : '')}
                  </p>
                </div>
              ) : null}

              {payload.profile.personalInfo &&
              Object.keys(payload.profile.personalInfo).length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold text-navy">Personal info</h3>
                  <ul className="grid gap-2 text-sm text-text-muted sm:grid-cols-2">
                    {payload.profile.personalInfo.fullName ? (
                      <li>
                        <span className="font-semibold text-navy">Name:</span>{' '}
                        {payload.profile.personalInfo.fullName}
                      </li>
                    ) : null}
                    {payload.profile.personalInfo.email ? (
                      <li>
                        <span className="font-semibold text-navy">Email:</span>{' '}
                        {payload.profile.personalInfo.email}
                      </li>
                    ) : null}
                    {payload.profile.personalInfo.location ? (
                      <li>
                        <span className="font-semibold text-navy">Location:</span>{' '}
                        {payload.profile.personalInfo.location}
                      </li>
                    ) : null}
                    {payload.profile.personalInfo.linkedinUrl ? (
                      <li>
                        <span className="font-semibold text-navy">LinkedIn:</span>{' '}
                        <a
                          href={payload.profile.personalInfo.linkedinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-blue hover:underline"
                        >
                          {payload.profile.personalInfo.linkedinUrl}
                        </a>
                      </li>
                    ) : null}
                    {payload.profile.personalInfo.githubUrl ? (
                      <li>
                        <span className="font-semibold text-navy">GitHub:</span>{' '}
                        <a
                          href={payload.profile.personalInfo.githubUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-blue hover:underline"
                        >
                          {payload.profile.personalInfo.githubUrl}
                        </a>
                      </li>
                    ) : null}
                    {payload.profile.personalInfo.portfolioUrl ? (
                      <li>
                        <span className="font-semibold text-navy">Portfolio:</span>{' '}
                        <a
                          href={payload.profile.personalInfo.portfolioUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-blue hover:underline"
                        >
                          {payload.profile.personalInfo.portfolioUrl}
                        </a>
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : null}

              {Array.isArray(payload.profile.skills) && payload.profile.skills.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold text-navy">Skills</h3>
                  <ul className="grid gap-3">
                    {payload.profile.skills.map((group, index) => (
                      <li
                        key={`${group?.category ?? 'skills'}-${index}`}
                        className="rounded-xl border border-border bg-background/70 p-3 text-sm"
                      >
                        <p className="font-semibold text-navy">
                          {group?.category || 'Skills'}
                        </p>
                        <p className="text-text-muted">
                          {Array.isArray(group?.items) ? group.items.join(', ') : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {Array.isArray(payload.profile.experience) &&
              payload.profile.experience.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold text-navy">Work experience</h3>
                  <ul className="grid gap-3">
                    {payload.profile.experience.map((role, index) => (
                      <li
                        key={`${role?.company ?? 'role'}-${index}`}
                        className="rounded-xl border border-border bg-background/70 p-4 text-sm"
                      >
                        <p className="font-semibold text-navy">
                          {role?.position || 'Role'}
                        </p>
                        <p className="text-text-muted">
                          {role?.company || 'Company'}
                          {role?.startDate || role?.endDate
                            ? ` · ${role?.startDate ?? '?'} – ${role?.endDate ?? 'Present'}`
                            : ''}
                        </p>
                        {Array.isArray(role?.highlights) && role.highlights.length > 0 ? (
                          <ul className="mt-2 list-disc pl-5 text-text-muted">
                            {role.highlights.map((highlight, hi) => (
                              <li key={hi}>{highlight}</li>
                            ))}
                          </ul>
                        ) : null}
                        {Array.isArray(role?.technologies) &&
                        role.technologies.length > 0 ? (
                          <p className="mt-2 text-xs text-text-muted">
                            Tech: {role.technologies.join(', ')}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {Array.isArray(payload.profile.education) &&
              payload.profile.education.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold text-navy">Education</h3>
                  <ul className="grid gap-3">
                    {payload.profile.education.map((item, index) => (
                      <li
                        key={`${item?.institution ?? 'edu'}-${index}`}
                        className="rounded-xl border border-border bg-background/70 p-3 text-sm"
                      >
                        <p className="font-semibold text-navy">
                          {item?.degree || 'Degree'}
                          {item?.fieldOfStudy ? ` · ${item.fieldOfStudy}` : ''}
                        </p>
                        <p className="text-text-muted">
                          {item?.institution || 'Institution'}
                          {item?.endDate ? ` · ${item.endDate}` : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {Array.isArray(payload.profile.projects) &&
              payload.profile.projects.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold text-navy">Projects</h3>
                  <ul className="grid gap-3">
                    {payload.profile.projects.map((project, index) => (
                      <li
                        key={`${project?.name ?? 'project'}-${index}`}
                        className="rounded-xl border border-border bg-background/70 p-4 text-sm"
                      >
                        <p className="font-semibold text-navy">
                          {project?.name || 'Project'}
                        </p>
                        {project?.description ? (
                          <p className="text-text-muted">{project.description}</p>
                        ) : null}
                        {Array.isArray(project?.highlights) &&
                        project.highlights.length > 0 ? (
                          <ul className="mt-2 list-disc pl-5 text-text-muted">
                            {project.highlights.map((highlight, hi) => (
                              <li key={hi}>{highlight}</li>
                            ))}
                          </ul>
                        ) : null}
                        {project?.url ? (
                          <a
                            href={project.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-block text-brand-blue hover:underline"
                          >
                            {project.url}
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {Array.isArray(payload.profile.certifications) &&
              payload.profile.certifications.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold text-navy">Certifications</h3>
                  <ul className="grid gap-2 text-sm text-text-muted">
                    {payload.profile.certifications.map((cert, index) => (
                      <li
                        key={`${cert?.name ?? 'cert'}-${index}`}
                        className="rounded-xl border border-border bg-background/70 p-3"
                      >
                        <p className="font-semibold text-navy">{cert?.name}</p>
                        {cert?.issuer ? <p>{cert.issuer}</p> : null}
                        {cert?.date ? (
                          <p className="text-xs">{cert.date}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {Array.isArray(payload.profile.languages) &&
              payload.profile.languages.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold text-navy">Languages</h3>
                  <ul className="grid gap-2 text-sm text-text-muted sm:grid-cols-2">
                    {payload.profile.languages.map((lang, index) => (
                      <li key={`${lang?.name ?? 'lang'}-${index}`}>
                        {lang?.name}
                        {lang?.proficiency ? ` · ${lang.proficiency}` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {Array.isArray(payload.profile.links) &&
              payload.profile.links.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold text-navy">Links</h3>
                  <ul className="grid gap-2 text-sm">
                    {payload.profile.links.map((link, index) => (
                      <li key={`${link?.url ?? 'link'}-${index}`}>
                        <a
                          href={link?.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-blue hover:underline"
                        >
                          {link?.label || link?.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-text-muted">
              This applicant did not attach a CV profile to this postulation, or it was deleted.
            </p>
          )}
        </section>
      </div>
    </main>
  )
}