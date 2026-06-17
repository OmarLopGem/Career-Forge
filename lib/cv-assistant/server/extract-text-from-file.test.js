import { describe, expect, it } from 'vitest'
import {
  detectMimeTypeFromName,
  extractTextFromFile,
  validateUpload,
} from './extract-text-from-file.js'

describe('validateUpload', () => {
  it('rejects empty files', () => {
    const r = validateUpload('cv.pdf', 'application/pdf', 0)
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/empty/i)
  })

  it('rejects too large files', () => {
    const r = validateUpload('cv.pdf', 'application/pdf', 6 * 1024 * 1024)
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/large/i)
  })

  it('rejects unsupported file extensions', () => {
    const r = validateUpload('cv.txt', 'text/plain', 100)
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/extension/i)
  })

  it('rejects unsupported mime types', () => {
    const r = validateUpload('cv.pdf', 'text/plain', 100)
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/type/i)
  })

  it('accepts valid PDF and DOCX', () => {
    expect(validateUpload('cv.pdf', 'application/pdf', 1000).ok).toBe(true)
    expect(
      validateUpload(
        'cv.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        1000,
      ).ok,
    ).toBe(true)
  })
})

describe('detectMimeTypeFromName', () => {
  it('detects PDF mime from .pdf', () => {
    expect(detectMimeTypeFromName('cv.pdf')).toBe('application/pdf')
  })
  it('detects DOCX mime from .docx', () => {
    expect(detectMimeTypeFromName('cv.docx')).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    )
  })
  it('falls back to octet-stream', () => {
    expect(detectMimeTypeFromName('cv.xyz')).toBe('application/octet-stream')
  })
})

describe('extractTextFromFile', () => {
  it('returns deterministic text for a valid PDF', async () => {
    const text = await extractTextFromFile(new Uint8Array([1, 2, 3, 4]), 'cv.pdf')
    expect(text).toContain('Curriculum Vitae')
    expect(text).toContain('cv.pdf')
  })

  it('returns deterministic text for a valid DOCX', async () => {
    const text = await extractTextFromFile(new Uint8Array([1, 2, 3, 4]), 'cv.docx')
    expect(text).toContain('Curriculum Vitae')
  })

  it('throws for empty buffer', async () => {
    await expect(extractTextFromFile(new Uint8Array([]), 'cv.pdf')).rejects.toThrow(/empty/i)
  })

  it('throws for unsupported extension', async () => {
    await expect(extractTextFromFile(new Uint8Array([1]), 'cv.txt')).rejects.toThrow(/unsupported/i)
  })

  it('does not return rawText or buffers in result', async () => {
    const text = await extractTextFromFile(new Uint8Array([1, 2, 3]), 'cv.pdf')
    expect(text).not.toMatch(/fileBuffer/)
    expect(text).not.toMatch(/fileUrl/)
  })
})
