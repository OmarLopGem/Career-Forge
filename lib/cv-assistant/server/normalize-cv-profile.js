import { computeCompletion } from '../validation.js'

export function normalizeProfile(input) {
  const now = new Date().toISOString()
  const title = input.title?.trim() || deriveTitle(input.draft)
  const draft = input.draft
  const cleanedSkills = (draft.skills ?? [])
    .map((g) => ({
      category: g.category?.trim() || 'Skills',
      items: (g.items ?? []).map((s) => s.trim()).filter(Boolean),
    }))
    .filter((g) => g.items.length > 0)

  const cleanedExperience = (draft.experience ?? []).map((e) => ({
    company: e.company?.trim() || 'Unknown Company',
    position: e.position?.trim() || 'Unknown Position',
    location: e.location?.trim() || undefined,
    employmentType: e.employmentType,
    startDate: e.startDate?.trim() || undefined,
    endDate: e.endDate ?? undefined,
    isCurrent: e.isCurrent ?? false,
    summary: e.summary?.trim() || undefined,
    highlights: (e.highlights ?? []).map((h) => h.trim()).filter(Boolean),
    technologies: (e.technologies ?? []).map((t) => t.trim()).filter(Boolean),
  }))

  const cleanedProjects = (draft.projects ?? []).map((p) => ({
    name: p.name?.trim() || 'Untitled Project',
    role: p.role?.trim() || undefined,
    description: p.description?.trim() || undefined,
    highlights: (p.highlights ?? []).map((h) => h.trim()).filter(Boolean),
    technologies: (p.technologies ?? []).map((t) => t.trim()).filter(Boolean),
    url: p.url?.trim() || undefined,
    repositoryUrl: p.repositoryUrl?.trim() || undefined,
    startDate: p.startDate?.trim() || undefined,
    endDate: p.endDate ?? undefined,
  }))

  const cleanedEducation = (draft.education ?? []).map((e) => ({
    institution: e.institution?.trim() || 'Unknown Institution',
    degree: e.degree?.trim() || undefined,
    fieldOfStudy: e.fieldOfStudy?.trim() || undefined,
    location: e.location?.trim() || undefined,
    startDate: e.startDate?.trim() || undefined,
    endDate: e.endDate ?? undefined,
    isCurrent: e.isCurrent ?? false,
    highlights: (e.highlights ?? []).map((h) => h.trim()).filter(Boolean),
  }))

  const cleanedCertifications = (draft.certifications ?? []).map((c) => ({
    name: c.name?.trim() || 'Certification',
    issuer: c.issuer?.trim() || undefined,
    issueDate: c.issueDate?.trim() || undefined,
    expirationDate: c.expirationDate ?? undefined,
    credentialUrl: c.credentialUrl?.trim() || undefined,
  }))

  const cleanedLanguages = (draft.languages ?? [])
    .map((l) => ({
      name: l.name?.trim(),
      proficiency: l.proficiency,
    }))
    .filter((l) => l.name)

  const cleanedLinks = (draft.links ?? [])
    .map((l) => ({
      label: l.label?.trim() || 'Link',
      url: l.url?.trim(),
      type: l.type,
    }))
    .filter((l) => l.url)

  const profile = {
    userId: input.userId,
    title,
    isDefault: input.isDefault ?? true,
    source: input.source,
    personalInfo: {
      fullName: draft.personalInfo?.fullName?.trim() || '',
      headline: draft.personalInfo?.headline?.trim() || undefined,
      email: draft.personalInfo?.email?.trim() || undefined,
      phone: draft.personalInfo?.phone?.trim() || undefined,
      location: draft.personalInfo?.location?.trim() || undefined,
      linkedinUrl: draft.personalInfo?.linkedinUrl?.trim() || undefined,
      portfolioUrl: draft.personalInfo?.portfolioUrl?.trim() || undefined,
      githubUrl: draft.personalInfo?.githubUrl?.trim() || undefined,
      websiteUrl: draft.personalInfo?.websiteUrl?.trim() || undefined,
    },
    target: draft.target,
    professionalSummary: draft.professionalSummary?.trim() || undefined,
    professionalNiche: undefined,
    experience: cleanedExperience,
    education: cleanedEducation,
    skills: cleanedSkills,
    projects: cleanedProjects,
    certifications: cleanedCertifications,
    languages: cleanedLanguages,
    links: cleanedLinks,
    completion: {
      isMinimumComplete: false,
      score: 0,
      missingRequiredFields: [],
      missingRecommendedFields: [],
      sectionScores: {},
      lastCheckedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  }

  profile.completion = computeCompletion(profile)
  return profile
}

function deriveTitle(draft) {
  const name = draft.personalInfo?.fullName?.trim()
  if (name) return `${name} Profile`
  return 'Imported Profile'
}
