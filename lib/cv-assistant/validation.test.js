import { describe, expect, it } from 'vitest'
import {
  hasContactMethod,
  countTotalSkills,
  validateGlobalMinimum,
  isTechnicalProfile,
  evaluateTemplate,
  computeCompletion,
} from './validation.js'
import { CV_TEMPLATE_CATALOG, getTemplate } from './template-catalog.js'
import { minimalValidProfile, incompleteProfile, frontendProfile } from './test/fixtures.js'

describe('hasContactMethod', () => {
  it('detects email', () => {
    const info = { fullName: 'Jane', email: 'jane@example.com' }
    expect(hasContactMethod(info)).toBe(true)
  })
  it('detects phone', () => {
    expect(hasContactMethod({ fullName: 'Jane', phone: '+1 555 1234' })).toBe(true)
  })
  it('detects linkedin / website / github', () => {
    expect(hasContactMethod({ fullName: 'Jane', linkedinUrl: 'https://linkedin.com/in/jane' })).toBe(true)
    expect(hasContactMethod({ fullName: 'Jane', websiteUrl: 'https://jane.dev' })).toBe(true)
    expect(hasContactMethod({ fullName: 'Jane', githubUrl: 'https://github.com/jane' })).toBe(true)
    expect(hasContactMethod({ fullName: 'Jane', portfolioUrl: 'https://jane.dev' })).toBe(true)
  })
  it('returns false when no contact method', () => {
    expect(hasContactMethod({ fullName: 'Jane' })).toBe(false)
    expect(hasContactMethod(undefined)).toBe(false)
    expect(hasContactMethod(null)).toBe(false)
  })
})

describe('countTotalSkills', () => {
  it('counts skills across groups', () => {
    expect(
      countTotalSkills([
        { category: 'Frontend', items: ['React', 'Next.js'] },
        { category: 'Backend', items: ['Node.js'] },
      ]),
    ).toBe(3)
  })
  it('ignores empty groups and empty items', () => {
    expect(
      countTotalSkills([
        { category: 'Frontend', items: ['React', ''] },
        { category: 'Empty', items: [] },
      ]),
    ).toBe(1)
  })
  it('handles missing input', () => {
    expect(countTotalSkills(undefined)).toBe(0)
    expect(countTotalSkills(null)).toBe(0)
  })
})

describe('validateGlobalMinimum', () => {
  it('fails when fullName is missing', () => {
    const p = { ...minimalValidProfile, personalInfo: { ...minimalValidProfile.personalInfo, fullName: '' } }
    const r = validateGlobalMinimum(p)
    expect(r.isValid).toBe(false)
    expect(r.missingRequiredFields).toContain('Full name')
  })
  it('fails when no contact method exists', () => {
    const p = { ...minimalValidProfile, personalInfo: { fullName: 'Jane Doe' } }
    const r = validateGlobalMinimum(p)
    expect(r.missingRequiredFields).toContain('At least one contact method')
  })
  it('fails when no experience, education, or project exists', () => {
    const p = {
      ...minimalValidProfile,
      experience: [],
      education: [],
      projects: [],
    }
    const r = validateGlobalMinimum(p)
    expect(r.missingRequiredFields).toContain('Work experience, education, or projects')
  })
  it('fails when total skills are fewer than 3', () => {
    const p = {
      ...minimalValidProfile,
      skills: [{ category: 'Frontend', items: ['React'] }],
    }
    const r = validateGlobalMinimum(p)
    expect(r.missingRequiredFields.some((m) => m.includes('3 skills'))).toBe(true)
  })
  it('passes for a valid minimal profile', () => {
    const r = validateGlobalMinimum(minimalValidProfile)
    expect(r.isValid).toBe(true)
    expect(r.missingRequiredFields).toEqual([])
  })
})

describe('isTechnicalProfile', () => {
  it('detects technical profile by category', () => {
    expect(isTechnicalProfile(frontendProfile)).toBe(true)
  })
  it('returns false for non-technical profile', () => {
    const p = { ...incompleteProfile, skills: [{ category: 'Languages', items: ['Spanish'] }] }
    expect(isTechnicalProfile(p)).toBe(false)
  })
})

describe('evaluateTemplate', () => {
  it('evaluates Harvard template requirements', () => {
    const result = evaluateTemplate(frontendProfile, getTemplate('harvard-classic'))
    expect(['available', 'recommended']).toContain(result.status)
    expect(result.missingRequiredFields).toEqual([])
  })
  it('evaluates ATS template requirements', () => {
    const result = evaluateTemplate(minimalValidProfile, getTemplate('ats-simple'))
    expect(result.missingRequiredFields).toEqual([])
  })
  it('evaluates reverse chronological template requirements', () => {
    const result = evaluateTemplate(minimalValidProfile, getTemplate('reverse-chronological-professional'))
    expect(result.missingRequiredFields).toEqual([])
  })
  it('marks reverse chronological as needs more information without experience', () => {
    const p = { ...minimalValidProfile, experience: [] }
    const result = evaluateTemplate(p, getTemplate('reverse-chronological-professional'))
    expect(result.status).toBe('needs_more_information')
    expect(result.missingRequiredFields.length).toBeGreaterThan(0)
  })
  it('evaluates technical template requirements', () => {
    const result = evaluateTemplate(frontendProfile, getTemplate('technical-projects'))
    expect(result.status).toBe('recommended')
  })
  it('marks technical template as needs more information for non-technical profile', () => {
    const p = {
      ...minimalValidProfile,
      skills: [{ category: 'Languages', items: ['English', 'Spanish', 'French'] }],
    }
    const result = evaluateTemplate(p, getTemplate('technical-projects'))
    expect(result.status).toBe('needs_more_information')
    expect(result.missingRequiredFields).toContain('Technical skills')
  })
  it('evaluates hybrid template requirements', () => {
    const result = evaluateTemplate(frontendProfile, getTemplate('hybrid-combination'))
    expect(['available', 'recommended']).toContain(result.status)
  })
  it('returns missing fields for unavailable templates', () => {
    const p = incompleteProfile
    for (const t of CV_TEMPLATE_CATALOG) {
      const result = evaluateTemplate(p, t)
      expect(result.status).toBe('needs_more_information')
      expect(result.missingRequiredFields.length).toBeGreaterThan(0)
    }
  })
  it('recommends technical template when profile has technical skills and projects', () => {
    const result = evaluateTemplate(frontendProfile, getTemplate('technical-projects'))
    expect(result.status).toBe('recommended')
  })
})

describe('computeCompletion', () => {
  it('returns score 0 for empty profile', () => {
    const empty = {
      ...incompleteProfile,
      personalInfo: { fullName: '' },
      skills: [],
    }
    const c = computeCompletion(empty)
    expect(c.score).toBe(0)
    expect(c.isMinimumComplete).toBe(false)
  })
  it('returns higher score for full profile', () => {
    const c = computeCompletion(frontendProfile)
    expect(c.score).toBeGreaterThan(50)
    expect(c.isMinimumComplete).toBe(true)
  })
})
