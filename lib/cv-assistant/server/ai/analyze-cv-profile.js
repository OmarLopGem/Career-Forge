/**
 * Mock CV profile analysis service.
 *
 * Real AI will replace this. The contract is stable: given a CVProfile,
 * return a CVAnalysisDraft. The draft is then persisted to cv_analyses.
 */

import { countTotalSkills, isTechnicalProfile } from '../../validation.js'

const REACT_NEXT_KEYWORDS = ['react', 'next.js', 'nextjs']
const BACKEND_KEYWORDS = ['node', 'node.js', 'python', 'java', 'go']
const DATA_KEYWORDS = ['sql', 'mongodb', 'postgresql', 'data', 'analytics']
const DEVOPS_KEYWORDS = ['aws', 'docker', 'kubernetes', 'ci/cd', 'terraform']
const LEADERSHIP_KEYWORDS = ['lead', 'mentor', 'team', 'stakeholder', 'manage']

export async function analyzeCVProfile(input) {
  const { profile } = input
  const draft = {
    detectedNiche: detectNiche(profile),
    nicheConfidence: 0.85,
    nicheReasoning: buildNicheReasoning(profile),
    strengths: detectStrengths(profile),
    weaknesses: detectWeaknesses(profile),
    improvementSuggestions: buildSuggestions(profile),
    atsFeedback: buildAtsFeedback(profile),
    suggestedRoles: suggestRoles(profile),
    keywordGaps: detectKeywordGaps(profile),
  }
  return draft
}

function detectNiche(profile) {
  const lower = skillsToLowerText(profile.skills)
  const hasReact = REACT_NEXT_KEYWORDS.some((k) => lower.includes(k))
  const hasBackend = BACKEND_KEYWORDS.some((k) => lower.includes(k))
  const hasData = DATA_KEYWORDS.some((k) => lower.includes(k))
  const hasDevops = DEVOPS_KEYWORDS.some((k) => lower.includes(k))

  if (hasReact && hasBackend) {
    return 'Full Stack Engineer (React/Next.js + backend)'
  }
  if (hasReact) {
    return 'Frontend Engineer specialized in React/Next.js'
  }
  if (hasBackend && hasData) {
    return 'Backend Engineer with data experience'
  }
  if (hasDevops) {
    return 'DevOps / Cloud Engineer'
  }
  if (isTechnicalProfile(profile)) {
    return profile.professionalNiche?.label ?? 'Software Engineer'
  }
  return 'General Professional'
}

function buildNicheReasoning(profile) {
  const tech = profile.skills
    .flatMap((g) => g.items)
    .filter((s) => /react|next|node|python|aws|sql/i.test(s))
    .slice(0, 6)
  if (tech.length === 0) return 'No clear technical signals detected.'
  return `Detected ${tech.join(', ')} across the profile.`
}

function detectStrengths(profile) {
  const out = []
  const lower = skillsToLowerText(profile.skills)
  if (REACT_NEXT_KEYWORDS.some((k) => lower.includes(k))) {
    out.push({
      title: 'Strong frontend stack',
      description: 'Profile shows React and Next.js experience with measurable impact.',
      section: 'skills',
      priority: 'high',
    })
  }
  if (
    profile.experience.some((e) => (e.highlights ?? []).some((h) => /\d/.test(h)))
  ) {
    out.push({
      title: 'Results-oriented experience',
      description: 'Highlights include measurable outcomes.',
      section: 'experience',
      priority: 'high',
    })
  }
  if (
    profile.experience.some((e) => (e.technologies ?? []).length > 0)
  ) {
    out.push({
      title: 'Clear technology context',
      description: 'Experience items list specific technologies used.',
      section: 'experience',
      priority: 'medium',
    })
  }
  if (profile.projects.length > 0) {
    out.push({
      title: 'Demonstrated side projects',
      description: 'Projects section shows applied work outside the job.',
      section: 'projects',
      priority: 'medium',
    })
  }
  if (
    profile.experience.some((e) =>
      (e.highlights ?? []).some((h) =>
        LEADERSHIP_KEYWORDS.some((k) => h.toLowerCase().includes(k)),
      ),
    )
  ) {
    out.push({
      title: 'Leadership signals',
      description: 'Highlights mention leading, mentoring, or stakeholder work.',
      section: 'experience',
      priority: 'medium',
    })
  }
  return out
}

function detectWeaknesses(profile) {
  const out = []
  const totalSkills = countTotalSkills(profile.skills)
  if (totalSkills < 3) {
    out.push({
      title: 'Skills section is too thin',
      description: `Add at least 3 skills (currently ${totalSkills}).`,
      section: 'skills',
      priority: 'high',
    })
  }
  if (!profile.professionalSummary || profile.professionalSummary.length < 50) {
    out.push({
      title: 'Missing or weak professional summary',
      description: 'Add a 2-3 sentence summary to set context for recruiters.',
      section: 'personalInfo',
      priority: 'medium',
    })
  }
  if (profile.experience.length > 0) {
    const noMetrics = profile.experience.every(
      (e) => !(e.highlights ?? []).some((h) => /\d/.test(h)),
    )
    if (noMetrics) {
      out.push({
        title: 'No measurable achievements',
        description: 'None of the experience highlights include numbers or impact metrics.',
        section: 'experience',
        priority: 'high',
      })
    }
  }
  if (profile.links.length === 0) {
    out.push({
      title: 'No professional links',
      description: 'Add LinkedIn, GitHub, or portfolio links so recruiters can verify your work.',
      section: 'links',
      priority: 'medium',
    })
  }
  return out
}

function buildSuggestions(profile) {
  const out = []
  if (profile.experience.length > 0) {
    const noMetrics = profile.experience.every(
      (e) => !(e.highlights ?? []).some((h) => /\d/.test(h)),
    )
    if (noMetrics) {
      out.push({
        title: 'Add measurable achievements',
        description: 'Convert at least 3 highlights into measurable outcomes (%, $, time saved).',
        section: 'experience',
        priority: 'high',
      })
    }
  }
  if (countTotalSkills(profile.skills) < 6) {
    out.push({
      title: 'Expand skills coverage',
      description: 'Aim for 6-12 skills grouped by category (Frontend, Backend, Tools).',
      section: 'skills',
      priority: 'medium',
    })
  }
  if (profile.projects.length === 0) {
    out.push({
      title: 'Add 1-2 projects',
      description: 'Projects help technical profiles stand out. Include links and a short description.',
      section: 'projects',
      priority: 'medium',
    })
  }
  if (!profile.target?.desiredRole) {
    out.push({
      title: 'Define a target role',
      description: 'Adding a desired role helps the AI tailor the rest of the analysis.',
      section: 'target',
      priority: 'low',
    })
  }
  return out
}

function buildAtsFeedback(profile) {
  const comments = []
  const warnings = []
  const suggestions = []

  if (!profile.personalInfo.email) {
    warnings.push('Missing email address.')
  }
  if (profile.experience.length === 0) {
    warnings.push('No work experience listed.')
  }
  if (countTotalSkills(profile.skills) < 3) {
    warnings.push('Fewer than 3 skills may hurt ATS ranking.')
  }
  if (!profile.professionalSummary) {
    comments.push('Add a professional summary to give ATS keyword context.')
  }
  if (profile.experience.length > 0) {
    const noDates = profile.experience.some((e) => !e.startDate)
    if (noDates) warnings.push('Some experience items have no start date.')
  }
  if (isTechnicalProfile(profile)) {
    suggestions.push('TypeScript')
    suggestions.push('CI/CD')
    suggestions.push('Testing')
  }

  const sectionCount =
    (profile.experience.length > 0 ? 1 : 0) +
    (profile.education.length > 0 ? 1 : 0) +
    (profile.skills.length > 0 ? 1 : 0) +
    (profile.projects.length > 0 ? 1 : 0) +
    (profile.certifications.length > 0 ? 1 : 0)

  const score = Math.max(
    30,
    Math.min(
      100,
      50 + sectionCount * 8 + (countTotalSkills(profile.skills) >= 3 ? 10 : 0),
    ),
  )

  return {
    score,
    comments,
    formattingWarnings: warnings,
    keywordSuggestions: suggestions,
  }
}

function suggestRoles(profile) {
  const lower = skillsToLowerText(profile.skills)
  const roles = []
  const isSenior = profile.experience.length >= 3

  if (REACT_NEXT_KEYWORDS.some((k) => lower.includes(k))) {
    roles.push({
      title: isSenior ? 'Senior Frontend Engineer' : 'Frontend Engineer',
      fitScore: 0.9,
      reasoning: 'React/Next.js skills match this role.',
    })
    roles.push({
      title: 'React Developer',
      fitScore: 0.8,
      reasoning: 'Strong frontend stack.',
    })
  }
  if (BACKEND_KEYWORDS.some((k) => lower.includes(k))) {
    roles.push({
      title: 'Backend Engineer',
      fitScore: 0.75,
      reasoning: 'Backend languages detected.',
    })
  }
  if (DEVOPS_KEYWORDS.some((k) => lower.includes(k))) {
    roles.push({
      title: 'DevOps Engineer',
      fitScore: 0.7,
      reasoning: 'Cloud and infra keywords detected.',
    })
  }
  if (roles.length === 0) {
    roles.push({
      title: profile.target?.desiredRole ?? 'General Professional',
      fitScore: 0.5,
      reasoning: 'Default suggestion based on profile target.',
    })
  }
  return roles
}

function detectKeywordGaps(profile) {
  const lower = skillsToLowerText(profile.skills)
  const gaps = []
  if (!lower.includes('test')) gaps.push('Testing')
  if (!lower.includes('ci') && !lower.includes('ci/cd')) gaps.push('CI/CD')
  if (!lower.includes('typescript')) gaps.push('TypeScript')
  if (!lower.includes('docker')) gaps.push('Docker')
  if (!lower.includes('aws') && !lower.includes('cloud')) gaps.push('Cloud')
  return gaps
}

function skillsToLowerText(skills) {
  return skills
    .flatMap((g) => g.items)
    .join(' ')
    .toLowerCase()
}

export const __test__ = { detectNiche, detectKeywordGaps, buildAtsFeedback }
