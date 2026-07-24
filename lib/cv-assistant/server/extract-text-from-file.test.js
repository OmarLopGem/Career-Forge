import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  detectMimeTypeFromName,
  extractTextFromFile,
  validateUpload,
} from './extract-text-from-file.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const FIXTURE_DIR = join(HERE, '..', 'test', 'fixtures-binary')

function fixture(name) {
  return new Uint8Array(readFileSync(join(FIXTURE_DIR, name)))
}

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

  it('accepts valid PDF', () => {
    expect(validateUpload('cv.pdf', 'application/pdf', 1000).ok).toBe(true)
  })
})

describe('detectMimeTypeFromName', () => {
  it('detects PDF mime from .pdf', () => {
    expect(detectMimeTypeFromName('cv.pdf')).toBe('application/pdf')
  })
  it('falls back to octet-stream for unknown extensions', () => {
    expect(detectMimeTypeFromName('cv.xyz')).toBe('application/octet-stream')
  })
})

describe('extractTextFromFile', () => {
  it('extracts text from a real PDF fixture', async () => {
    const text = await extractTextFromFile(fixture('cv-sample.pdf'), 'cv-sample.pdf')
    expect(text).toContain('Jane Doe')
    expect(text).toContain('jane@example.com')
    expect(text).toContain('Acme')
  })

  it('throws SCANNED_PDF_NO_TEXT for an empty PDF', async () => {
    await expect(extractTextFromFile(fixture('cv-blank.pdf'), 'cv-blank.pdf')).rejects.toThrow(
      /SCANNED_PDF_NO_TEXT/,
    )
  })

  it('throws for empty buffer', async () => {
    await expect(extractTextFromFile(new Uint8Array([]), 'cv.pdf')).rejects.toThrow(/empty/i)
  })

  it('throws for unsupported extension', async () => {
    await expect(extractTextFromFile(new Uint8Array([1]), 'cv.txt')).rejects.toThrow(/unsupported/i)
  })

  it('does not return rawText or buffers in result', async () => {
    const text = await extractTextFromFile(fixture('cv-sample.pdf'), 'cv-sample.pdf')
    expect(text).not.toMatch(/fileBuffer/)
    expect(text).not.toMatch(/fileUrl/)
    expect(text).not.toMatch(/rawText/)
  })
})
