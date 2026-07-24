/**
 * Live integration test: requires a real MINIMAX_API_KEY.
 * Skipped automatically when the env var is missing.
 */
import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest'
import { serviceAnalyzeProfile } from './cv-service.js'
import { startMongo, stopMongo, clearMongo } from '../test/mongo-helpers.js'
import { parseCVTextToProfile } from './ai/parse-cv-text-to-profile.js'
import { createProfile } from './cv-profile.repository.js'
import { MOCK_USER_ID } from './auth/get-current-user-id.js'

const HAS_KEY = Boolean(process.env.MINIMAX_API_KEY)
const describeIf = HAS_KEY ? describe : describe.skip
const USER_ID = MOCK_USER_ID

const SAMPLE_CV = `Jane Doe
jane@example.com | https://github.com/jane

Summary
Senior Frontend Engineer with 6+ years building production React and Next.js applications.

Experience
Senior Frontend Engineer - Acme
2022-01 - present
- Improved Lighthouse score from 62 to 95.
- Mentored 2 junior engineers.

Skills
React, Next.js, TypeScript, Node.js, AWS
`

describeIf('cv-service live AI (requires MINIMAX_API_KEY)', () => {
  beforeAll(async () => {
    await startMongo()
  }, 60000)

  afterAll(async () => {
    await stopMongo()
  })

  beforeEach(async () => {
    await clearMongo()
  })

  it('parses CV text with real AI and returns a structured draft', async () => {
    const draft = await parseCVTextToProfile({
      text: SAMPLE_CV,
      source: { originalFileName: 'jane.txt', originalFileType: 'text/plain' },
      userId: USER_ID,
    })

    expect(draft.personalInfo.fullName).toBe('Jane Doe')
    expect(draft.personalInfo.email).toBe('jane@example.com')
    expect(draft.experience.length).toBeGreaterThan(0)
    expect(draft.skills.flatMap((g) => g.items).length).toBeGreaterThan(0)
  }, 120000)

  it('analyzes a profile with real AI and persists the result', async () => {
    const draft = await parseCVTextToProfile({
      text: SAMPLE_CV,
      source: { originalFileName: 'jane.txt', originalFileType: 'text/plain' },
      userId: USER_ID,
    })

    const profileDoc = {
      userId: USER_ID,
      title: 'Live test profile',
      isDefault: true,
      source: { type: 'live-test' },
      personalInfo: draft.personalInfo,
      target: draft.target,
      professionalSummary: draft.professionalSummary,
      experience: draft.experience,
      education: draft.education,
      skills: draft.skills,
      projects: draft.projects,
      certifications: draft.certifications,
      languages: draft.languages,
      links: draft.links,
      completion: 0,
    }

    const created = await createProfile(profileDoc)

    const { analysis } = await serviceAnalyzeProfile(created._id)
    expect(analysis.detectedNiche).toBeTruthy()
    expect(analysis.strengths.length).toBeGreaterThan(0)
    expect(analysis.atsFeedback.score).toBeGreaterThan(0)
  }, 120000)
})
