import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockTechnicalCVText } from '../../test/fixtures.js'

const CV_WITHOUT_SUMMARY = `Jane Doe
jane@example.com | https://github.com/jane

Experience
Senior Frontend Engineer - Acme
2022-01 - present
- Improved Lighthouse score from 62 to 95.
- Mentored 4 engineers.

Frontend Engineer - Globex
2019-06 - 2021-12
- Built the design system used by 6 product teams.

Skills
React, Next.js, TypeScript, Node.js
`

describe('summary + target synthesizers (IA path)', () => {
  beforeEach(() => {
    process.env.MINIMAX_API_KEY = 'test-api-key'
    process.env.AI_PROVIDER = 'minimax'
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('trusts the IA-provided summary when present', async () => {
    const aiChatJSON = vi.fn().mockResolvedValue({
      data: {
        personalInfo: { fullName: 'Jane Doe', email: 'jane@example.com' },
        professionalSummary: 'IA-authored summary that the IA wrote.',
        skills: [{ category: 'Frontend', items: ['React', 'Next.js'] }],
        experience: [
          {
            company: 'Acme',
            position: 'Senior Frontend Engineer',
            startDate: '2022-01',
            endDate: null,
            isCurrent: true,
            highlights: ['Lighthouse 62 to 95.'],
            technologies: ['React'],
          },
        ],
        target: { desiredRole: 'Staff Frontend Engineer', seniority: 'lead' },
      },
      tokenUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    })

    vi.doMock('@/lib/services/ai.js', async () => {
      const actual = await vi.importActual('@/lib/services/ai.js')
      return { ...actual, aiChatJSON }
    })

    const { parseCVTextToProfile } = await import('./parse-cv-text-to-profile.js')
    const draft = await parseCVTextToProfile({ text: CV_WITHOUT_SUMMARY, source: {}, userId: 'u' })

    expect(draft.professionalSummary).toBe('IA-authored summary that the IA wrote.')
    expect(draft.target.desiredRole).toBe('Staff Frontend Engineer')
    expect(draft.target.seniority).toBe('lead')
    expect(aiChatJSON).toHaveBeenCalledTimes(1)
  })

  it('falls back to local synthesis when IA returns empty summary', async () => {
    const aiChatJSON = vi.fn().mockResolvedValue({
      data: {
        personalInfo: { fullName: 'Jane Doe', email: 'jane@example.com' },
        professionalSummary: '',
        skills: [{ category: 'Frontend', items: ['React', 'Next.js', 'TypeScript'] }],
        experience: [
          {
            company: 'Acme',
            position: 'Senior Frontend Engineer',
            startDate: '2022-01',
            endDate: null,
            isCurrent: true,
            highlights: ['Lighthouse 62 to 95.'],
            technologies: ['React'],
          },
          {
            company: 'Globex',
            position: 'Frontend Engineer',
            startDate: '2019-06',
            endDate: '2021-12',
            highlights: ['Design system.'],
            technologies: ['React'],
          },
        ],
        target: { desiredRole: '', seniority: '' },
      },
      tokenUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    })

    vi.doMock('@/lib/services/ai.js', async () => {
      const actual = await vi.importActual('@/lib/services/ai.js')
      return { ...actual, aiChatJSON }
    })

    const { parseCVTextToProfile } = await import('./parse-cv-text-to-profile.js')
    const draft = await parseCVTextToProfile({ text: CV_WITHOUT_SUMMARY, source: {}, userId: 'u' })

    expect(draft.professionalSummary.length).toBeGreaterThan(20)
    expect(draft.professionalSummary.toLowerCase()).toContain('jane doe')
    expect(draft.target.desiredRole.toLowerCase()).toMatch(/senior frontend/)
    expect(['senior', 'lead']).toContain(draft.target.seniority)
  })

  it('instructs the IA to author summary and target from the CV', async () => {
    const aiChatJSON = vi.fn().mockResolvedValue({
      data: { personalInfo: { fullName: 'Jane Doe' }, professionalSummary: 'ok', experience: [], skills: [], target: {} },
      tokenUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    })

    vi.doMock('@/lib/services/ai.js', async () => {
      const actual = await vi.importActual('@/lib/services/ai.js')
      return { ...actual, aiChatJSON }
    })

    const { parseCVTextToProfile } = await import('./parse-cv-text-to-profile.js')
    await parseCVTextToProfile({ text: mockTechnicalCVText, source: {}, userId: 'u' })

    const call = aiChatJSON.mock.calls[0][0]
    expect(call.system.toLowerCase()).toContain('summary')
    expect(call.system.toLowerCase()).toContain('target')
    expect(call.temperature).toBeGreaterThanOrEqual(0.2)
  })
})
