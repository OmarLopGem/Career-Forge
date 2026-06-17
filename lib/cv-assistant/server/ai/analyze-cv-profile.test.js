import { describe, expect, it } from 'vitest'
import { analyzeCVProfile } from './analyze-cv-profile.js'
import { frontendProfile, minimalValidProfile, incompleteProfile } from '../../test/fixtures.js'

describe('analyzeCVProfile', () => {
  it('detects frontend niche from React/Next.js skills', async () => {
    const draft = await analyzeCVProfile({ profile: frontendProfile, userId: 'user-1' })
    expect(draft.detectedNiche.toLowerCase()).toMatch(/frontend|full stack/)
    expect(draft.nicheReasoning?.toLowerCase()).toMatch(/react|next/)
  })

  it('suggests frontend-related roles for technical frontend profile', async () => {
    const draft = await analyzeCVProfile({ profile: frontendProfile, userId: 'user-1' })
    expect(draft.suggestedRoles.length).toBeGreaterThan(0)
    const titles = draft.suggestedRoles.map((r) => r.title.toLowerCase())
    expect(titles.some((t) => t.includes('frontend') || t.includes('react'))).toBe(true)
  })

  it('adds improvement suggestion when achievements lack metrics', async () => {
    const p = {
      ...minimalValidProfile,
      experience: [
        {
          company: 'X',
          position: 'Engineer',
          highlights: ['Worked on the dashboard', 'Talked to customers'],
        },
      ],
    }
    const draft = await analyzeCVProfile({ profile: p, userId: 'user-1' })
    expect(
      draft.improvementSuggestions.some((s) => /measurable|metrics/i.test(s.title)),
    ).toBe(true)
  })

  it('adds weakness when skills are fewer than 3', async () => {
    const p = {
      ...minimalValidProfile,
      skills: [{ category: 'Tools', items: ['Git'] }],
    }
    const draft = await analyzeCVProfile({ profile: p, userId: 'user-1' })
    expect(draft.weaknesses.some((w) => /skills/i.test(w.title))).toBe(true)
  })

  it('includes ATS feedback', async () => {
    const draft = await analyzeCVProfile({ profile: frontendProfile, userId: 'user-1' })
    expect(draft.atsFeedback).toBeDefined()
    expect(typeof draft.atsFeedback.score).toBe('number')
    expect(Array.isArray(draft.atsFeedback.comments)).toBe(true)
  })

  it('returns deterministic output for the same profile', async () => {
    const a = await analyzeCVProfile({ profile: frontendProfile, userId: 'user-1' })
    const b = await analyzeCVProfile({ profile: frontendProfile, userId: 'user-1' })
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('does not mutate the input CVProfile', async () => {
    const snapshot = JSON.stringify(frontendProfile)
    await analyzeCVProfile({ profile: frontendProfile, userId: 'user-1' })
    expect(JSON.stringify(frontendProfile)).toBe(snapshot)
  })

  it('falls back gracefully for incomplete profile', async () => {
    const draft = await analyzeCVProfile({
      profile: incompleteProfile,
      userId: 'user-1',
    })
    expect(draft.detectedNiche).toBeTruthy()
  })
})
