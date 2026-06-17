import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { startMongo, stopMongo, clearMongo } from '../test/mongo-helpers.js'
import {
  createAnalysisFromDraft,
  getLatestAnalysis,
  listAnalysesByProfile,
} from './cv-analysis.repository.js'
import { createProfile } from './cv-profile.repository.js'
import { frontendProfile } from '../test/fixtures.js'

beforeAll(async () => {
  await startMongo()
}, 60000)

afterAll(async () => {
  await stopMongo()
})

beforeEach(async () => {
  await clearMongo()
})

const sampleDraft = () => ({
  detectedNiche: 'Frontend Engineer specialized in React/Next.js',
  nicheConfidence: 0.9,
  nicheReasoning: 'Detected React, Next.js, TypeScript skills.',
  strengths: [
    { title: 'Strong frontend stack', description: 'React, Next.js, TypeScript' },
  ],
  weaknesses: [],
  improvementSuggestions: [
    { title: 'Add metrics to highlights', description: 'Add measurable outcomes.' },
  ],
  atsFeedback: {
    score: 80,
    comments: ['Good use of standard sections.'],
    formattingWarnings: [],
    keywordSuggestions: ['TypeScript', 'CI/CD'],
  },
  suggestedRoles: [
    { title: 'Senior Frontend Engineer', fitScore: 0.9, reasoning: 'Strong React/Next.js' },
  ],
  keywordGaps: ['GraphQL'],
})

describe('cv-analysis repository', () => {
  it('creates an analysis for a profile/user', async () => {
    const profile = await createProfile({ ...frontendProfile, userId: 'user-A' })
    const a = await createAnalysisFromDraft('user-A', profile._id, sampleDraft())
    expect(a._id).toBeDefined()
    expect(a.userId).toBe('user-A')
    expect(a.detectedNiche).toContain('Frontend Engineer')
  })

  it('returns latest analysis for a profile', async () => {
    const profile = await createProfile({ ...frontendProfile, userId: 'user-A' })
    await createAnalysisFromDraft('user-A', profile._id, { ...sampleDraft(), detectedNiche: 'Older niche' })
    await new Promise((r) => setTimeout(r, 5))
    await createAnalysisFromDraft('user-A', profile._id, { ...sampleDraft(), detectedNiche: 'Newest niche' })
    const latest = await getLatestAnalysis('user-A', profile._id)
    expect(latest?.detectedNiche).toBe('Newest niche')
  })

  it('does not return another user\'s analysis', async () => {
    const profile = await createProfile({ ...frontendProfile, userId: 'user-A' })
    await createAnalysisFromDraft('user-A', profile._id, sampleDraft())
    const latest = await getLatestAnalysis('user-B', profile._id)
    expect(latest).toBeNull()
  })

  it('lists analyses for a profile', async () => {
    const profile = await createProfile({ ...frontendProfile, userId: 'user-A' })
    await createAnalysisFromDraft('user-A', profile._id, sampleDraft())
    await createAnalysisFromDraft('user-A', profile._id, sampleDraft())
    const list = await listAnalysesByProfile('user-A', profile._id)
    expect(list.length).toBe(2)
  })
})
