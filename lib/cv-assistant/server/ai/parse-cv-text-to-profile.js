/**
 * Real CV text parser powered by the configured AI provider
 * (defaults to MiniMax via the OpenAI-compatible SDK).
 *
 * A deterministic regex-based fallback (the original mock) is kept as a
 * safety net in case the provider is unavailable, so the import pipeline
 * never breaks entirely.
 */

import { aiChatJSON, AIServiceError } from '@/lib/services/ai.js'
import {
  extractLinks,
  sanitizeCertifications,
  sanitizeEducation,
  sanitizeExperience,
  sanitizeLanguages,
  sanitizePersonalInfo,
  sanitizeProjects,
  sanitizeSkills,
} from './_sanitize.js'

export class CVParseError extends Error {
  constructor(message, code = 'PARSING_FAILED') {
    super(message)
    this.name = 'CVParseError'
    this.code = code
  }
}

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/
const PHONE_RE = /(\+?\d[\d\s().-]{7,})/
const URL_RE = /\bhttps?:\/\/[\w./%-]+/g

const TECHNICAL_KEYWORDS = [
  'javascript', 'typescript', 'react', 'next.js', 'nextjs', 'node', 'node.js',
  'python', 'java', 'aws', 'docker', 'kubernetes', 'sql', 'mongodb',
  'postgresql', 'redis', 'graphql', 'rest', 'api', 'ci/cd', 'terraform',
  'linux', 'tailwind', 'css', 'html',
]

const LEADERSHIP_KEYWORDS = [
  'lead', 'manager', 'mentor', 'mentored', 'team', 'stakeholder',
  'stakeholders', 'strategy',
]

export async function parseCVTextToProfile(input) {
  const text = (input.text ?? '').trim()

  if (text.length < 40) {
    throw new CVParseError(
      'Extracted text is too short to parse. Upload a richer CV.',
      'PARSING_FAILED',
    )
  }

  const fallback = heuristicParse(text)
  const lower = text.toLowerCase()
  const isTechnical = TECHNICAL_KEYWORDS.some((k) => lower.includes(k))
  const hasLeadership = LEADERSHIP_KEYWORDS.some((k) => lower.includes(k))

  try {
    const ai = await generateDraftFromAI(text)
    return mergeDraft(fallback, ai, isTechnical, hasLeadership)
  } catch (err) {
    if (err instanceof AIServiceError) {
      console.warn('[parseCVTextToProfile] AI provider failed, using fallback:', err.message)
      return fallback
    }
    throw err
  }
}

async function generateDraftFromAI(text) {
  const system = [
    'You extract structured CV data from raw CV text.',
    'You return strict JSON only.',
    'For factual fields (fullName, email, phone, links, dates, highlights, technologies) you copy them verbatim.',
    'For two derived fields you are allowed to write prose based ONLY on what is in the CV, never on outside knowledge:',
    '- "professionalSummary": a 2-3 sentence summary capturing the candidate domain, seniority, leadership, and signature achievements. If the CV has no summary section, write one yourself from the experience and skills.',
    '- "target.desiredRole" and "target.seniority": infer the next natural role based on the candidate latest position, total years of experience, leadership signals, and the skills the CV emphasises. Use empty strings only when the CV gives no signal at all.',
  ].join(' ')

  const user = [
    'Extract a CV profile from the following text and return JSON with exactly this shape:',
    '{',
    '  "personalInfo": { "fullName": string, "email": string, "phone": string, "location": string, "linkedinUrl": string, "githubUrl": string, "portfolioUrl": string, "headline": string },',
    '  "professionalSummary": string,',
    '  "skills": [{ "category": string, "items": string[] }],',
    '  "experience": [{ "company": string, "position": string, "startDate": string, "endDate": string|null, "isCurrent": boolean, "highlights": string[], "technologies": string[] }],',
    '  "education": [{ "institution": string, "degree": string, "fieldOfStudy": string, "endDate": string, "highlights": string[] }],',
    '  "projects": [{ "name": string, "description": string, "url": string, "highlights": string[], "technologies": string[] }],',
    '  "certifications": [{ "name": string, "issuer": string, "date": string }],',
    '  "languages": [{ "name": string, "proficiency": string }],',
    '  "target": { "desiredRole": string, "seniority": "junior"|"mid"|"senior"|"lead" }',
    '}',
    '',
    'Rules:',
    '- Extract URLs exactly as written in the text.',
    '- "isCurrent" must be true only if the role is explicitly ongoing / "present".',
    '- "highlights" are bullet-pointed achievements; preserve the original wording.',
    '- "professionalSummary": if the CV already has a summary section, reuse and lightly polish it; otherwise synthesise one from experience and skills.',
    '- "target.desiredRole": pick a realistic next role a recruiter would consider for this candidate (e.g. "Senior Frontend Engineer", "Tech Lead", "Full Stack Engineer", "Backend Engineer").',
    '- "target.seniority": one of "junior", "mid", "senior", "lead" — derive from total years and any explicit level on the latest position.',
    '- If a non-derived field is genuinely missing in the source, return "" or [], never fabricate.',
    '- Do not include raw text, file paths, or storage references anywhere in the output.',
    '',
    'CV text:',
    text,
  ].join('\n')

  const { data } = await aiChatJSON({ system, user, temperature: 0.3 })
  return data
}

function mergeDraft(fallback, ai, isTechnical, hasLeadership) {
  const personalInfo = sanitizePersonalInfo({ ...fallback.personalInfo, ...(ai.personalInfo ?? {}) })
  const links = extractLinks(personalInfo)

  const experience = sanitizeExperience(ai.experience) ?? fallback.experience
  const skills = sanitizeSkills(ai.skills) ?? fallback.skills
  const aiSummary = (ai.professionalSummary ?? '').trim()
  const summaryFromExperience = synthesizeSummaryFromExperience({
    experience,
    skills,
    fullName: personalInfo.fullName,
    isTechnical,
    hasLeadership,
  })

  return {
    personalInfo,
    target: ai.target?.desiredRole
      ? {
          desiredRole: String(ai.target.desiredRole),
          seniority: ai.target.seniority ?? fallback.target.seniority,
        }
      : synthesizeTargetFromExperience(experience, fallback.target),
    professionalSummary: aiSummary || summaryFromExperience || fallback.professionalSummary || '',
    experience,
    education: sanitizeEducation(ai.education) ?? fallback.education,
    skills,
    projects: sanitizeProjects(ai.projects) ?? fallback.projects,
    certifications: sanitizeCertifications(ai.certifications),
    languages: sanitizeLanguages(ai.languages) ?? fallback.languages,
    links,
  }
}

function heuristicParse(text) {
  const lower = text.toLowerCase()
  const isTechnical = TECHNICAL_KEYWORDS.some((k) => lower.includes(k))
  const hasLeadership = LEADERSHIP_KEYWORDS.some((k) => lower.includes(k))

  const personalInfo = extractPersonalInfo(text)
  const skills = extractSkills(text, isTechnical)
  const experience = extractExperience(text)
  const education = extractEducation(text)
  const projects = extractProjects(text)
  const summary = buildSummary(text, isTechnical, hasLeadership)
  const target = buildTarget(text, isTechnical, hasLeadership)
  const links = extractLinks(personalInfo)

  return {
    personalInfo,
    target,
    professionalSummary: summary,
    experience,
    education,
    skills,
    projects,
    certifications: [],
    languages: extractLanguages(text),
    links,
  }
}

function extractPersonalInfo(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  let fullName
  for (const line of lines.slice(0, 8)) {
    const candidate = sanitizeName(line)
    if (candidate) {
      fullName = candidate
      break
    }
  }
  const emailMatch = text.match(EMAIL_RE)
  const phoneMatch = text.match(PHONE_RE)
  const urls = text.match(URL_RE) ?? []

  const linkedinUrl = urls.find((u) => u.toLowerCase().includes('linkedin.com')) ?? undefined
  const githubUrl = urls.find((u) => u.toLowerCase().includes('github.com')) ?? undefined
  const portfolioUrl =
    urls.find(
      (u) =>
        !u.toLowerCase().includes('linkedin.com') &&
        !u.toLowerCase().includes('github.com'),
    ) ?? undefined

  const location = extractLocation(text)

  return {
    fullName: fullName ?? '',
    email: emailMatch?.[0],
    phone: phoneMatch?.[0]?.trim(),
    location,
    linkedinUrl,
    githubUrl,
    portfolioUrl,
    headline: inferHeadline(text),
  }
}

function sanitizeName(line) {
  if (!line) return undefined
  if (line.length > 80) return undefined
  if (line.toLowerCase().includes('curriculum')) return undefined
  if (line.toLowerCase().includes('resume')) return undefined
  if (line.toLowerCase().includes('filename:')) return undefined
  const cleaned = line.replace(/[^A-Za-zÀ-ÿ' -]/g, '').trim()
  if (cleaned.split(/\s+/).length < 2) return undefined
  return cleaned
}

function extractLocation(text) {
  const match = text.match(/\b(Remote|Hybrid|On-site)\b/i)
  return match?.[0]
}

function inferHeadline(text) {
  const lower = text.toLowerCase()
  if (lower.includes('frontend')) return 'Frontend Engineer'
  if (lower.includes('full stack') || lower.includes('fullstack')) return 'Full Stack Engineer'
  if (lower.includes('backend')) return 'Backend Engineer'
  if (lower.includes('data engineer')) return 'Data Engineer'
  if (lower.includes('product')) return 'Product Engineer'
  if (lower.includes('devops')) return 'DevOps Engineer'
  return undefined
}

function extractSkills(text, isTechnical) {
  const lines = text.split(/\r?\n/)
  const groups = []
  let current = null
  let inSection = false

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const line = raw.trim()
    if (!line) {
      if (inSection && current) {
        groups.push(current)
        current = null
      }
      continue
    }
    if (/^skills$/i.test(line)) {
      if (current) {
        groups.push(current)
        current = null
      }
      inSection = true
      continue
    }
    if (inSection && isSectionHeader(line)) {
      inSection = false
      if (current) {
        groups.push(current)
        current = null
      }
      continue
    }
    if (!inSection) continue

    const groupMatch = line.match(/^([A-Za-z][A-Za-z/& ]{1,30}):\s*(.+)$/)
    if (groupMatch) {
      if (current) groups.push(current)
      const category = groupMatch[1].trim()
      const items = groupMatch[2]
        .split(/,|\sand\s/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.length < 40)
      current = { category, items }
      continue
    }
    const inlineListMatch = line.match(/^([A-Z][A-Za-z/& ]{1,30})\s+(.+)$/)
    if (inlineListMatch && i + 1 < lines.length) {
      const next = lines[i + 1].trim()
      if (next && !next.includes(':') && !isSectionHeader(next) && !next.startsWith('-')) {
        if (current) groups.push(current)
        const items = next
          .split(/,|\sand\s/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && s.length < 40)
        current = { category: inlineListMatch[1].trim(), items }
        i++
        continue
      }
    }
    if (current) {
      const extras = line
        .split(/,|\sand\s/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.length < 40)
      current.items.push(...extras)
    } else if (line.includes(',') || /\s+(?:and\s+)/.test(line)) {
      const items = line
        .split(/,|\sand\s/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.length < 40)
      if (items.length > 0) {
        current = { category: 'Skills', items }
      }
    }
  }
  if (current) groups.push(current)

  const flat = groups.flatMap((g) => g.items)
  if (flat.length === 0) {
    if (isTechnical) {
      groups.push({ category: 'Tools', items: inferKeywords(text, TECHNICAL_KEYWORDS) })
    } else {
      groups.push({ category: 'Soft Skills', items: inferKeywords(text, LEADERSHIP_KEYWORDS) })
    }
  }

  return groups.filter((g) => g.items.length > 0)
}

function inferKeywords(text, keywords) {
  const lower = text.toLowerCase()
  const found = new Set()
  for (const k of keywords) {
    if (lower.includes(k)) found.add(titleCase(k))
  }
  return Array.from(found)
}

function titleCase(word) {
  if (word.includes('.') || word.includes('/')) return word.toUpperCase()
  return word
    .split(/\s+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}

function extractExperience(text) {
  const lines = text.split(/\r?\n/)
  const items = []
  let current = null
  let inSection = false

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const line = raw.trim()
    if (!line) continue

    if (/^experience$/i.test(line)) {
      inSection = true
      current = null
      continue
    }
    if (inSection && isSectionHeader(line)) {
      if (current) items.push(current)
      inSection = false
      current = null
      continue
    }
    if (!inSection) continue

    const isBullet = line.startsWith('-') || line.startsWith('•')
    if (isBullet && current) {
      current.highlights.push(line.replace(/^[-•]\s*/, ''))
      continue
    }
    if (/^\d{4}/.test(line) && line.length < 80) {
      const [start, end] = line.split(/\s*-\s*/)
      if (start && /^\d{4}/.test(start)) {
        if (current) {
          current.startDate = start
          current.endDate = end && !/present/i.test(end) ? end : null
          current.isCurrent = Boolean(end) && /present/i.test(end)
        }
        continue
      }
    }
    const roleMatch = line.match(/^([^-]+?)\s+-\s+(.+)$/)
    if (roleMatch && !/^\d{4}/.test(line)) {
      if (current) items.push(current)
      const left = roleMatch[1].trim()
      const right = roleMatch[2].trim()
      const looksLikeRole =
        left.length <= 60 &&
        right.length <= 80 &&
        !/^[A-Z][A-Z\s]{2,40}$/.test(left) &&
        !/^\d{4}/.test(left)
      if (!looksLikeRole) {
        current = null
        continue
      }
      current = {
        position: left,
        company: right,
        highlights: [],
      }
    }
  }
  if (current) items.push(current)
  return items
}

function isSectionHeader(line) {
  return /^(summary|profile|education|skills|projects|certifications|languages|links|contact|interests|awards|publications|references)$/i.test(
    line.trim(),
  )
}

function extractEducation(text) {
  const lines = text.split(/\r?\n/)
  const items = []
  let inSection = false
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    if (/^education$/i.test(line)) {
      inSection = true
      continue
    }
    if (inSection && isSectionHeader(line)) {
      inSection = false
    }
    if (!inSection) continue
    const match = line.match(
      /^(.+?)\s+-\s+(B\.[A-Za-z.]+|M\.[A-Za-z.]+|PhD|Doctorate|Master|Bachelor|Associate|Diploma).*$/i,
    )
    if (match) {
      items.push({
        institution: match[1].trim(),
        degree: match[2].trim(),
        highlights: [],
      })
    }
  }
  return items
}

function extractProjects(text) {
  const lines = text.split(/\r?\n/)
  const items = []
  let current = null
  let inProjects = false
  for (const raw of lines) {
    const line = raw.trim()
    if (/^projects$/i.test(line)) {
      inProjects = true
      continue
    }
    if (inProjects && isSectionHeader(line)) {
      inProjects = false
      if (current) {
        items.push(current)
        current = null
      }
      continue
    }
    if (!inProjects) continue
    if (line === '') {
      if (current) {
        items.push(current)
        current = null
      }
      continue
    }
    if (line.startsWith('-') || line.startsWith('•')) {
      if (current) {
        current.highlights.push(line.replace(/^[-•]\s*/, ''))
      }
      continue
    }
    if (current) items.push(current)
    const urlMatch = line.match(/(https?:\/\/\S+)/)
    current = {
      name: line.split(' - ')[0].trim(),
      url: urlMatch?.[0],
      highlights: [],
    }
  }
  if (current) items.push(current)
  return items
}

function extractLanguages(text) {
  const match = text.match(/Languages?\s*\n([^\n]+)/i)
  if (!match) return []
  const raw = match[1]
  return raw
    .split(/,/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((entry) => {
      const [name, levelRaw] = entry.split(/\s*\(/)
      const proficiency = levelRaw
        ?.replace(/\)$/, '')
        .trim()
        .toLowerCase()
      return {
        name: (name ?? entry).trim(),
        proficiency,
      }
    })
}

function buildSummary(text, isTechnical, hasLeadership) {
  const lines = text.split(/\r?\n/)
  const sectionLines = []
  let inSummary = false
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      if (inSummary && sectionLines.length > 0) break
      continue
    }
    if (/^summary$/i.test(line)) {
      inSummary = true
      continue
    }
    if (inSummary && isSectionHeader(line)) {
      break
    }
    if (inSummary) {
      sectionLines.push(line)
    }
  }
  const joined = sectionLines.join(' ').replace(/\s+/g, ' ').trim()
  if (joined.length > 50) {
    return joined.slice(0, 320)
  }
  if (isTechnical && hasLeadership) {
    return 'Engineer with experience leading teams and shipping production software.'
  }
  if (isTechnical) {
    return 'Engineer with experience shipping production software.'
  }
  return 'Professional with cross-functional experience.'
}

function buildTarget(_text, isTechnical, hasLeadership) {
  if (isTechnical && hasLeadership) {
    return { desiredRole: 'Senior Frontend Engineer / Tech Lead', seniority: 'senior' }
  }
  if (isTechnical) {
    return { desiredRole: 'Frontend Engineer', seniority: 'mid' }
  }
  return { desiredRole: 'Operations Manager', seniority: 'mid' }
}

const ROLE_DOMAIN_KEYWORDS = [
  { slug: 'frontend', label: 'Frontend', match: ['react', 'next.js', 'nextjs', 'vue', 'svelte', 'typescript', 'javascript', 'tailwind', 'css', 'html', 'redux'] },
  { slug: 'backend', label: 'Backend', match: ['node', 'node.js', 'python', 'java', 'go', 'rust', 'c#', 'c++', 'django', 'flask', 'spring', 'express', 'graphql', 'rest api', 'api'] },
  { slug: 'fullstack', label: 'Full Stack', match: ['full stack', 'fullstack'] },
  { slug: 'mobile', label: 'Mobile', match: ['ios', 'android', 'swift', 'kotlin', 'react native', 'flutter'] },
  { slug: 'data', label: 'Data', match: ['sql', 'nosql', 'mongodb', 'postgresql', 'mysql', 'redis', 'bigquery', 'snowflake', 'spark', 'pandas', 'airflow', 'data engineering'] },
  { slug: 'devops', label: 'DevOps', match: ['docker', 'kubernetes', 'aws', 'gcp', 'azure', 'terraform', 'ansible', 'ci/cd', 'jenkins', 'github actions'] },
  { slug: 'qa', label: 'QA', match: ['qa', 'quality assurance', 'selenium', 'cypress', 'playwright', 'test automation'] },
  { slug: 'design', label: 'Design', match: ['figma', 'sketch', 'ux', 'ui design', 'design system'] },
]

const LEADERSHIP_TERMS = ['lead', 'mentor', 'manager', 'head of', 'staff', 'principal']

function detectExperienceDomains(experience, skills) {
  const counts = new Map()
  const bump = (slug) => counts.set(slug, (counts.get(slug) ?? 0) + 1)

  for (const item of experience ?? []) {
    const position = String(item.position ?? '').toLowerCase()
    const highlights = (item.highlights ?? []).map((h) => String(h).toLowerCase()).join(' ')
    const technologies = (item.technologies ?? []).map((t) => String(t).toLowerCase()).join(' ')
    const blob = `${position} ${highlights} ${technologies}`
    for (const domain of ROLE_DOMAIN_KEYWORDS) {
      if (domain.match.some((k) => blob.includes(k))) bump(domain.slug)
    }
  }

  for (const group of skills ?? []) {
    const items = (group.items ?? []).map((i) => String(i).toLowerCase()).join(' ')
    for (const domain of ROLE_DOMAIN_KEYWORDS) {
      if (domain.match.some((k) => items.includes(k))) bump(domain.slug)
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([slug]) => ROLE_DOMAIN_KEYWORDS.find((d) => d.slug === slug))
    .filter(Boolean)
}

function estimateYearsOfExperience(experience) {
  const items = experience ?? []
  if (items.length === 0) return 0
  let earliestYear = null
  let latestYear = null
  const currentYear = new Date().getUTCFullYear()

  for (const item of items) {
    const start = String(item.startDate ?? '').match(/(\d{4})/)
    const endRaw = String(item.endDate ?? '').match(/(\d{4})/)
    const isCurrent = item.isCurrent === true
    const startYear = start ? Number.parseInt(start[1], 10) : null
    const endYear = isCurrent ? currentYear : endRaw ? Number.parseInt(endRaw[1], 10) : null
    if (startYear) {
      if (earliestYear === null || startYear < earliestYear) earliestYear = startYear
    }
    if (endYear) {
      if (latestYear === null || endYear > latestYear) latestYear = endYear
    }
  }

  if (earliestYear === null) return 0
  const effectiveEnd = latestYear ?? currentYear
  return Math.max(0, effectiveEnd - earliestYear)
}

function detectLatestTitle(experience) {
  const items = experience ?? []
  const current = items.find((i) => i.isCurrent === true)
  if (current?.position) return String(current.position)
  if (items[0]?.position) return String(items[0].position)
  return ''
}

function detectLeadershipSignals(experience) {
  for (const item of experience ?? []) {
    const blob = `${item.position ?? ''} ${(item.highlights ?? []).join(' ')}`.toLowerCase()
    if (LEADERSHIP_TERMS.some((term) => blob.includes(term))) return true
  }
  return false
}

function synthesizeSummaryFromExperience({ experience, skills, fullName, isTechnical, hasLeadership }) {
  const domains = detectExperienceDomains(experience, skills)
  const primaryDomain = domains[0]
  const secondaryDomain = domains[1]
  const years = estimateYearsOfExperience(experience)
  const title = detectLatestTitle(experience)
  const leadership = hasLeadership || detectLeadershipSignals(experience)

  const domainLabel = primaryDomain?.label ?? (isTechnical ? 'Software' : 'Cross-functional')
  const scopeLabel = years >= 5 ? 'senior' : years >= 2 ? 'mid-level' : years > 0 ? 'early-career' : ''
  const titleFragment = title ? `${title}` : `${domainLabel} professional`
  const yearsFragment = years >= 1 ? ` with ${years}+ years of experience` : ''
  const scopeFragment = scopeLabel ? ` (${scopeLabel})` : ''
  const secondaryFragment =
    primaryDomain && secondaryDomain && secondaryDomain.slug !== primaryDomain.slug
      ? `, also working across ${secondaryDomain.label.toLowerCase()}`
      : ''
  const leadershipFragment = leadership ? ', leading teams and shipping production outcomes' : ''
  const nameFragment = fullName ? `${fullName} is a` : 'A'

  const summary = `${nameFragment} ${titleFragment}${yearsFragment}${scopeFragment}${secondaryFragment}${leadershipFragment}.`
  return summary.replace(/\s+/g, ' ').trim().replace(/\s+,/g, ',').replace(/\s+\./g, '.').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')')
}

function synthesizeTargetFromExperience(experience, fallbackTarget) {
  const domains = detectExperienceDomains(experience, [])
  const title = detectLatestTitle(experience)
  const years = estimateYearsOfExperience(experience)
  const leadership = detectLeadershipSignals(experience)

  if (title) {
    const seniority =
      years >= 7 || /staff|principal|head|director/i.test(title)
        ? 'lead'
        : years >= 4 || /senior/i.test(title)
          ? 'senior'
          : years >= 2
            ? 'mid'
            : 'junior'
    const { _source: _s, ...clean } = { desiredRole: title, seniority, _source: 'synthesized' }
    return clean
  }

  if (domains.length > 0) {
    const primary = domains[0]
    const secondary = domains[1]
    const roleBase = leadership ? `Senior ${primary.label} Engineer / Tech Lead` : `${primary.label} Engineer`
    const seniority = leadership ? 'senior' : years >= 4 ? 'senior' : years >= 2 ? 'mid' : 'junior'
    const desiredRole =
      primary.slug === 'fullstack' || (primary.slug === 'frontend' && secondary?.slug === 'backend')
        ? 'Full Stack Engineer'
        : roleBase
    const { _source: _s, ...clean } = { desiredRole, seniority, _source: 'synthesized' }
    return clean
  }

  return fallbackTarget ?? { desiredRole: '', seniority: '' }
}

