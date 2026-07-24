import { describe, expect, it } from 'vitest'
import { parseCVFileToProfile } from './parse-cv-file-to-profile.js'
import { AIServiceError } from '@/lib/services/ai.js'
import { ImportCVError } from '../import-cv.js'

function buffer(content = 'PDF_BYTES') {
  return new Uint8Array(Buffer.from(content))
}

const SAMPLE_TEXT = `Jane Doe
jane@example.com | +1 555 1234 | linkedin.com/in/jane | github.com/jane

Summary
Frontend engineer with 6+ years building production React and Next.js applications.

Experience
Senior Frontend Engineer - Acme
2022-01 - present
- Improved Lighthouse score from 62 to 95.
- Mentored 4 engineers.

Skills
React, Next.js, TypeScript, Node.js
`

function fakeDraft() {
  return {
    personalInfo: {
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+1 555 1234',
      linkedinUrl: 'https://linkedin.com/in/jane',
      githubUrl: 'https://github.com/jane',
    },
    target: { desiredRole: 'Frontend Engineer', seniority: 'senior' },
    professionalSummary: 'Frontend engineer with 6+ years building React and Next.js.',
    experience: [
      {
        company: 'Acme',
        position: 'Senior Frontend Engineer',
        startDate: '2022-01',
        endDate: null,
        isCurrent: true,
        highlights: ['Improved Lighthouse score.'],
        technologies: ['React'],
      },
    ],
    education: [],
    skills: [{ category: 'Frontend', items: ['React', 'Next.js'] }],
    projects: [],
    certifications: [],
    languages: [],
    links: [
      { label: 'GitHub', url: 'https://github.com/jane', type: 'github' },
    ],
  }
}

describe('parseCVFileToProfile (PDF -> local extraction + text parser)', () => {
  it('extracts text from the PDF and delegates to the text parser', async () => {
    const draft = await parseCVFileToProfile(
      {
        buffer: buffer(SAMPLE_TEXT),
        mimeType: 'application/pdf',
        fileName: 'cv.pdf',
      },
      {
        extractText: async () => SAMPLE_TEXT,
        parseCVText: async () => fakeDraft(),
      },
    )

    expect(draft.personalInfo.fullName).toBe('Jane Doe')
    expect(draft.experience[0].company).toBe('Acme')
    expect(draft.skills.flatMap((g) => g.items)).toContain('Next.js')
  })

  it('rejects non-PDF file extensions', async () => {
    await expect(
      parseCVFileToProfile(
        { buffer: buffer(), fileName: 'cv.docx' },
        {
          extractText: async () => '',
          parseCVText: async () => fakeDraft(),
        },
      ),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_FILE_TYPE' })
  })

  it('rejects empty buffers', async () => {
    await expect(
      parseCVFileToProfile(
        { buffer: new Uint8Array(0), fileName: 'empty.pdf' },
        {
          extractText: async () => '',
          parseCVText: async () => fakeDraft(),
        },
      ),
    ).rejects.toMatchObject({ code: 'FILE_EMPTY' })
  })

  it('rejects buffers over MAX_PDF_SIZE_BYTES', async () => {
    const big = new Uint8Array(6 * 1024 * 1024)
    await expect(
      parseCVFileToProfile(
        { buffer: big, fileName: 'huge.pdf' },
        {
          extractText: async () => '',
          parseCVText: async () => fakeDraft(),
        },
      ),
    ).rejects.toBeInstanceOf(ImportCVError)
  })

  it('maps scanned PDFs (no extractable text) to PARSING_FAILED', async () => {
    const extractText = async () => {
      throw new Error('SCANNED_PDF_NO_TEXT: no selectable text')
    }
    await expect(
      parseCVFileToProfile(
        { buffer: buffer(), mimeType: 'application/pdf', fileName: 'scan.pdf' },
        { extractText, parseCVText: async () => fakeDraft() },
      ),
    ).rejects.toMatchObject({ code: 'PARSING_FAILED' })
  })

  it('maps too-short extracted text to PARSING_FAILED', async () => {
    await expect(
      parseCVFileToProfile(
        { buffer: buffer(), mimeType: 'application/pdf', fileName: 'short.pdf' },
        { extractText: async () => 'short', parseCVText: async () => fakeDraft() },
      ),
    ).rejects.toMatchObject({ code: 'PARSING_FAILED' })
  })

  it('propagates AIServiceError from the text parser', async () => {
    const parseCVText = async () => {
      throw new AIServiceError('MiniMax API key is not configured.', 'MISSING_API_KEY', 500)
    }
    await expect(
      parseCVFileToProfile(
        { buffer: buffer(SAMPLE_TEXT), mimeType: 'application/pdf', fileName: 'cv.pdf' },
        { extractText: async () => SAMPLE_TEXT, parseCVText },
      ),
    ).rejects.toMatchObject({ code: 'MISSING_API_KEY', status: 500 })
  })
})
