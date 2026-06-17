import { MIN_SKILL_TOTAL } from './types.js'

/**
 * Returns true if at least one contact method is present.
 */
export function hasContactMethod(info) {
  if (!info) return false
  return Boolean(
    nonEmpty(info.email) ||
      nonEmpty(info.phone) ||
      nonEmpty(info.linkedinUrl) ||
      nonEmpty(info.portfolioUrl) ||
      nonEmpty(info.githubUrl) ||
      nonEmpty(info.websiteUrl),
  )
}

export function countTotalSkills(skills) {
  if (!skills || skills.length === 0) return 0
  return skills.reduce((total, group) => {
    if (!group || !Array.isArray(group.items)) return total
    return total + group.items.filter((item) => nonEmpty(item)).length
  }, 0)
}

/**
 * Global minimum profile requirements. Generation is blocked until all pass.
 */
export function validateGlobalMinimum(profile) {
  const missing = []
  if (!profile) {
    return {
      isValid: false,
      missingRequiredFields: ['profile'],
    }
  }
  if (!nonEmpty(profile.personalInfo?.fullName)) {
    missing.push('Full name')
  }
  if (!hasContactMethod(profile.personalInfo)) {
    missing.push('At least one contact method')
  }
  const hasContent =
    (profile.experience?.length ?? 0) > 0 ||
    (profile.education?.length ?? 0) > 0 ||
    (profile.projects?.length ?? 0) > 0
  if (!hasContent) {
    missing.push('Work experience, education, or projects')
  }
  if (countTotalSkills(profile.skills) < MIN_SKILL_TOTAL) {
    missing.push(`At least ${MIN_SKILL_TOTAL} skills`)
  }
  return {
    isValid: missing.length === 0,
    missingRequiredFields: missing,
  }
}

/**
 * Check if a profile has any clearly technical skill groups.
 * Simple category-name heuristic as suggested in the spec.
 */
export function isTechnicalProfile(profile) {
  if (!profile) return false
  const technicalCategories = new Set([
    'frontend',
    'backend',
    'full stack',
    'full-stack',
    'programming languages',
    'frameworks',
    'databases',
    'cloud',
    'devops',
    'data',
    'cybersecurity',
    'security',
    'tools',
    'engineering',
  ])

  for (const group of profile.skills ?? []) {
    if (!group) continue
    if (technicalCategories.has(group.category.trim().toLowerCase())) {
      if (group.items.some((item) => nonEmpty(item))) return true
    }
  }

  const techKeywords = [
    'javascript',
    'typescript',
    'react',
    'next.js',
    'node',
    'python',
    'java',
    'aws',
    'docker',
    'kubernetes',
    'sql',
    'mongodb',
    'postgresql',
    'redis',
    'graphql',
    'rest',
    'api',
    'ci/cd',
    'terraform',
    'linux',
  ]
  for (const group of profile.skills ?? []) {
    if (!group) continue
    for (const item of group.items ?? []) {
      if (!nonEmpty(item)) continue
      const lower = item.toLowerCase()
      if (techKeywords.some((k) => lower.includes(k))) return true
    }
  }
  return false
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function getAtPath(obj, path) {
  if (!obj) return undefined
  const parts = path.split('.')
  let current = obj
  for (const part of parts) {
    if (current == null) return undefined
    current = current[part]
  }
  return current
}

function pathIsNonEmpty(profile, path) {
  const value = getAtPath(profile, path)
  if (value == null) return false
  if (typeof value === 'string') return nonEmpty(value)
  if (Array.isArray(value)) return value.length > 0
  return true
}

function evaluateRequirement(profile, requirement) {
  switch (requirement.kind) {
    case 'field': {
      const allOk = (requirement.paths ?? []).some((p) => pathIsNonEmpty(profile, p))
      return { passes: allOk, label: requirement.label }
    }
    case 'contact_method': {
      return { passes: hasContactMethod(profile.personalInfo), label: requirement.label }
    }
    case 'min_count': {
      const count = countAtPath(profile, requirement.paths?.[0] ?? '')
      const min = requirement.minCount ?? 1
      return { passes: count >= min, label: requirement.label }
    }
    case 'one_of': {
      const allOk = (requirement.paths ?? []).some((p) => pathIsNonEmpty(profile, p))
      return { passes: allOk, label: requirement.label }
    }
    case 'custom': {
      if (requirement.key === 'technical_skills') {
        return { passes: isTechnicalProfile(profile), label: requirement.label }
      }
      return { passes: true, label: requirement.label }
    }
  }
}

function countAtPath(profile, path) {
  if (path === 'skills') {
    return countTotalSkills(profile.skills)
  }
  const value = getAtPath(profile, path)
  if (Array.isArray(value)) {
    return value.filter((v) => v != null).length
  }
  if (typeof value === 'string' && nonEmpty(value)) return 1
  return 0
}

export function evaluateTemplate(profile, template) {
  const global = validateGlobalMinimum(profile)
  if (!global.isValid) {
    return {
      templateKey: template.key,
      status: 'needs_more_information',
      missingRequiredFields: global.missingRequiredFields,
      missingRecommendedFields: [],
      reason: 'Profile is missing global minimum requirements.',
    }
  }

  const missingRequired = []
  for (const req of template.requiredFields) {
    const { passes, label } = evaluateRequirement(profile, req)
    if (!passes) missingRequired.push(label)
  }

  const missingRecommended = []
  for (const req of template.recommendedFields) {
    const { passes, label } = evaluateRequirement(profile, req)
    if (!passes) missingRecommended.push(label)
  }

  if (missingRequired.length > 0) {
    return {
      templateKey: template.key,
      status: 'needs_more_information',
      missingRequiredFields: missingRequired,
      missingRecommendedFields: missingRecommended,
      reason: 'This template needs additional profile data to be generated.',
    }
  }

  const score = computeRecommendationScore(profile, template, missingRecommended)
  const status = pickStatus(profile, template, score)

  return {
    templateKey: template.key,
    status,
    missingRequiredFields: [],
    missingRecommendedFields: missingRecommended,
    reason: buildReason(status, score, missingRecommended),
    recommendationScore: score,
  }
}

function computeRecommendationScore(profile, template, missingRecommended) {
  let score = 100
  score -= missingRecommended.length * 8

  if (template.category === 'technical') {
    if (isTechnicalProfile(profile)) score += 15
    if ((profile.projects?.length ?? 0) > 0) score += 5
  }

  if (template.key === 'reverse-chronological-professional') {
    if ((profile.experience?.length ?? 0) >= 2) score += 5
  }

  if (template.key === 'hybrid-combination') {
    if ((profile.projects?.length ?? 0) > 0) score += 5
  }

  if (template.key === 'ats-simple') {
    if (nonEmpty(profile.professionalSummary)) score += 5
  }

  return Math.max(0, Math.min(100, score))
}

function pickStatus(profile, template, score) {
  if (
    template.key === 'reverse-chronological-professional' &&
    (profile.experience?.length ?? 0) === 0
  ) {
    return 'needs_more_information'
  }
  if (score >= 80) return 'recommended'
  if (score >= 60) return 'available'
  if (score >= 40) return 'available'
  return 'available'
}

function buildReason(status, score, missingRecommended) {
  if (status === 'recommended') {
    return `Strong match for this profile (score ${score}).`
  }
  if (status === 'needs_more_information') {
    return missingRecommended.length > 0
      ? `Almost ready: ${missingRecommended.slice(0, 2).join(', ')}.`
      : 'Almost ready.'
  }
  return `Available (score ${score}).`
}

/**
 * Compute a full CompletionStatus for the profile. Used for the
 * completion card in the review step.
 */
export function computeCompletion(profile) {
  const sectionScores = computeSectionScores(profile)
  const overall = Math.round(
    (sectionScores.personalInfo +
      sectionScores.experience +
      sectionScores.education +
      sectionScores.skills +
      sectionScores.projects +
      sectionScores.certifications +
      sectionScores.languages) / 7,
  )
  const global = validateGlobalMinimum(profile)
  return {
    isMinimumComplete: global.isValid,
    score: overall,
    missingRequiredFields: global.missingRequiredFields,
    missingRecommendedFields: collectMissingRecommended(profile),
    sectionScores,
    lastCheckedAt: new Date().toISOString(),
  }
}

function computeSectionScores(profile) {
  return {
    personalInfo: sectionScoreForPersonalInfo(profile.personalInfo),
    experience: sectionScoreForArray(
      profile.experience,
      (item) => nonEmpty(item.company) && nonEmpty(item.position),
    ),
    education: sectionScoreForArray(profile.education, (item) => nonEmpty(item.institution)),
    skills: Math.min(
      100,
      Math.round((countTotalSkills(profile.skills) / Math.max(MIN_SKILL_TOTAL, 6)) * 100),
    ),
    projects: sectionScoreForArray(profile.projects, (item) => nonEmpty(item.name)),
    certifications: sectionScoreForArray(profile.certifications, (item) => nonEmpty(item.name)),
    languages: sectionScoreForArray(profile.languages, (item) => nonEmpty(item.name)),
  }
}

function sectionScoreForPersonalInfo(info) {
  if (!info) return 0
  let score = 0
  if (nonEmpty(info.fullName)) score += 40
  if (hasContactMethod(info)) score += 40
  if (nonEmpty(info.location)) score += 10
  if (nonEmpty(info.headline)) score += 10
  return Math.min(100, score)
}

function sectionScoreForArray(items, isValid) {
  if (!items || items.length === 0) return 0
  const valid = items.filter(isValid).length
  if (valid === 0) return 0
  return Math.min(100, Math.round((valid / items.length) * 100))
}

function collectMissingRecommended(profile) {
  const out = []
  if (!nonEmpty(profile.professionalSummary)) out.push('Professional summary')
  if ((profile.experience?.length ?? 0) > 0) {
    const hasMetrics = profile.experience.some((e) =>
      (e.highlights ?? []).some((h) => /\d/.test(h)),
    )
    if (!hasMetrics) out.push('Measurable achievements in experience')
  }
  if ((profile.links?.length ?? 0) === 0) out.push('Professional links')
  return out
}
