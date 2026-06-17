import { describe, expect, it } from 'vitest'
import { parseCVTextToProfile, CVParseError } from './parse-cv-text-to-profile.js'
import { mockTechnicalCVText, mockEmptyCVText } from '../../test/fixtures.js'

describe('parseCVTextToProfile', () => {
  it('returns a valid CVProfileDraft for technical sample text', async () => {
    const draft = await parseCVTextToProfile({
      text: mockTechnicalCVText,
      source: { originalFileName: 'jane.pdf', originalFileType: 'application/pdf' },
      userId: 'user-1',
    })
    expect(draft.personalInfo.fullName).toContain('Jane')
    expect(draft.personalInfo.email).toBe('jane@example.com')
    expect(draft.personalInfo.githubUrl).toContain('github.com')
    expect(draft.skills.length).toBeGreaterThan(0)
    expect(draft.experience.length).toBeGreaterThan(0)
    expect(draft.personalInfo.fullName.length).toBeGreaterThan(0)
    expect(draft.links.some((l) => l.type === 'github')).toBe(true)
  })

  it('marks missing fields when sample text lacks contact info', async () => {
    const draft = await parseCVTextToProfile({
      text: 'John Doe\nA short profile without any contact details or skills or experience.\nMore text to pass the minimum length requirement of the parser.',
      source: { originalFileName: 'jane.pdf', originalFileType: 'application/pdf' },
      userId: 'user-1',
    })
    expect(draft.personalInfo.email).toBeUndefined()
    expect(draft.personalInfo.phone).toBeUndefined()
  })

  it('throws CVParseError for empty or too-short text', async () => {
    await expect(
      parseCVTextToProfile({
        text: mockEmptyCVText,
        source: { originalFileName: 'jane.pdf', originalFileType: 'application/pdf' },
        userId: 'user-1',
      }),
    ).rejects.toBeInstanceOf(CVParseError)
  })

  it('does not include rawText, fileBuffer, fileUrl, or storage references', async () => {
    const draft = await parseCVTextToProfile({
      text: mockTechnicalCVText,
      source: { originalFileName: 'jane.pdf', originalFileType: 'application/pdf' },
      userId: 'user-1',
    })
    const raw = JSON.stringify(draft)
    expect(raw).not.toMatch(/rawText/)
    expect(raw).not.toMatch(/fileBuffer/)
    expect(raw).not.toMatch(/fileUrl/)
    expect(raw).not.toMatch(/uploadedDocument/i)
  })

  it('produces deterministic output for the same input', async () => {
    const a = await parseCVTextToProfile({
      text: mockTechnicalCVText,
      source: { originalFileName: 'jane.pdf', originalFileType: 'application/pdf' },
      userId: 'user-1',
    })
    const b = await parseCVTextToProfile({
      text: mockTechnicalCVText,
      source: { originalFileName: 'jane.pdf', originalFileType: 'application/pdf' },
      userId: 'user-1',
    })
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})
