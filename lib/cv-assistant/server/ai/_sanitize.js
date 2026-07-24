export function sanitizePersonalInfo(info) {
  return {
    fullName: info.fullName ?? '',
    email: info.email || undefined,
    phone: info.phone || undefined,
    location: info.location || undefined,
    linkedinUrl: info.linkedinUrl || undefined,
    githubUrl: info.githubUrl || undefined,
    portfolioUrl: info.portfolioUrl || undefined,
    headline: info.headline || undefined,
  }
}

export function sanitizeSkills(skills) {
  if (!Array.isArray(skills)) return undefined
  const cleaned = skills
    .filter((g) => g && typeof g.category === 'string')
    .map((g) => ({
      category: g.category.trim(),
      items: Array.isArray(g.items)
        ? g.items.filter((i) => typeof i === 'string' && i.trim().length > 0)
        : [],
    }))
    .filter((g) => g.items.length > 0)
  return cleaned.length > 0 ? cleaned : undefined
}

export function sanitizeExperience(experience) {
  if (!Array.isArray(experience)) return undefined
  const cleaned = experience
    .filter((e) => e && (e.company || e.position))
    .map((e) => ({
      company: e.company ?? '',
      position: e.position ?? '',
      startDate: e.startDate || undefined,
      endDate: e.endDate ?? null,
      isCurrent: Boolean(e.isCurrent),
      highlights: Array.isArray(e.highlights) ? e.highlights : [],
      technologies: Array.isArray(e.technologies) ? e.technologies : [],
    }))
  return cleaned.length > 0 ? cleaned : undefined
}

export function sanitizeEducation(education) {
  if (!Array.isArray(education)) return undefined
  const cleaned = education
    .filter((e) => e && (e.institution || e.degree))
    .map((e) => ({
      institution: e.institution ?? '',
      degree: e.degree || undefined,
      fieldOfStudy: e.fieldOfStudy || undefined,
      endDate: e.endDate || undefined,
      highlights: Array.isArray(e.highlights) ? e.highlights : [],
    }))
  return cleaned.length > 0 ? cleaned : undefined
}

export function sanitizeProjects(projects) {
  if (!Array.isArray(projects)) return undefined
  const cleaned = projects
    .filter((p) => p && p.name)
    .map((p) => ({
      name: p.name,
      description: p.description || undefined,
      url: p.url || undefined,
      highlights: Array.isArray(p.highlights) ? p.highlights : [],
      technologies: Array.isArray(p.technologies) ? p.technologies : [],
    }))
  return cleaned.length > 0 ? cleaned : undefined
}

export function sanitizeCertifications(certs) {
  if (!Array.isArray(certs)) return []
  return certs
    .filter((c) => c && c.name)
    .map((c) => ({
      name: c.name,
      issuer: c.issuer || undefined,
      date: c.date || undefined,
    }))
}

export function sanitizeLanguages(languages) {
  if (!Array.isArray(languages)) return undefined
  const cleaned = languages
    .filter((l) => l && l.name)
    .map((l) => ({
      name: l.name,
      proficiency: l.proficiency || undefined,
    }))
  return cleaned.length > 0 ? cleaned : undefined
}

export function extractLinks(info) {
  const links = []
  if (info.linkedinUrl) {
    links.push({ label: 'LinkedIn', url: info.linkedinUrl, type: 'linkedin' })
  }
  if (info.githubUrl) {
    links.push({ label: 'GitHub', url: info.githubUrl, type: 'github' })
  }
  if (info.portfolioUrl) {
    links.push({ label: 'Portfolio', url: info.portfolioUrl, type: 'portfolio' })
  }
  return links
}
