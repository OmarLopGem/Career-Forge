import { describe, expect, it } from 'vitest'
import {
  generateResumePDF,
  PDFGenerationError,
} from './generate-resume-pdf.js'
import { frontendProfile, minimalValidProfile, incompleteProfile } from '../test/fixtures.js'

const TEMPLATES = [
  'harvard-classic',
  'ats-simple',
  'reverse-chronological-professional',
  'technical-projects',
  'hybrid-combination',
]

describe('generateResumePDF', () => {
  it('generates a valid PDF for each template with a complete profile', async () => {
    for (const key of TEMPLATES) {
      const result = await generateResumePDF({
        profile: frontendProfile,
        templateKey: key,
      })
      expect(result.pdfBytes.byteLength).toBeGreaterThan(1000)
      expect(String.fromCharCode(...result.pdfBytes.subarray(0, 4))).toBe('%PDF')
      expect(result.fileName).toContain(key)
    }
  })

  it('throws PROFILE_INCOMPLETE for incomplete profile', async () => {
    await expect(
      generateResumePDF({
        profile: incompleteProfile,
        templateKey: 'ats-simple',
      }),
    ).rejects.toBeInstanceOf(PDFGenerationError)
  })

  it('throws TEMPLATE_REQUIREMENTS_NOT_MET when template needs more info', async () => {
    const noExperience = {
      ...minimalValidProfile,
      experience: [],
      education: [],
      projects: [{ name: 'A project', highlights: ['x'] }],
    }
    await expect(
      generateResumePDF({
        profile: noExperience,
        templateKey: 'reverse-chronological-professional',
      }),
    ).rejects.toThrow(/TEMPLATE_REQUIREMENTS_NOT_MET|requirements/i)
  })

  it('produces a non-empty PDF for hybrid template with minimal profile', async () => {
    const result = await generateResumePDF({
      profile: minimalValidProfile,
      templateKey: 'hybrid-combination',
    })
    expect(result.pdfBytes.byteLength).toBeGreaterThan(1000)
  })
})
