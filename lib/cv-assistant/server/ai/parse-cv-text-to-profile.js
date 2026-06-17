/**
 * Mock CV parser.
 *
 * Real AI will replace this. The contract is stable: given extracted text
 * and a small bit of source metadata, return a CVProfileDraft that
 * follows the CVProfile schema.
 */

export class CVParseError extends Error {
  constructor(message, code = 'PARSING_FAILED') {
    super(message)
    this.code = code
  }
}

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/
const PHONE_RE = /(\+?\d[\d\s().-]{7,})/
const URL_RE = /\bhttps?:\/\/[\w./%-]+/g

const TECHNICAL_KEYWORDS = [
  'javascript',
  'typescript',
  'react',
  'next.js',
  'nextjs',
  'node',
  'node.js',
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
  'tailwind',
  'css',
  'html',
]

const LEADERSHIP_KEYWORDS = [
  'lead',
  'manager',
  'mentor',
  'mentored',
  'team',
  'stakeholder',
  'stakeholders',
  'strategy',
]

export async function parseCVTextToProfile(input) {
  const text = (input.text ?? '').trim()

  if (text.length < 40) {
    throw new CVParseError(
      'Extracted text is too short to parse. Upload a richer CV.',
      'PARSING_FAILED',
    )
  }

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

function extractLinks(info) {
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
