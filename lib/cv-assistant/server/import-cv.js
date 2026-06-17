import {
  detectMimeTypeFromName,
  extractTextFromFile,
  MAX_FILE_SIZE_BYTES,
  validateUpload,
} from './extract-text-from-file.js'
import { parseCVTextToProfile, CVParseError } from './ai/parse-cv-text-to-profile.js'
import { normalizeProfile } from './normalize-cv-profile.js'
import { createProfile } from './cv-profile.repository.js'

export class ImportCVError extends Error {
  constructor(message, code) {
    super(message)
    this.code = code
  }
}

/**
 * End-to-end import pipeline:
 *   uploaded file -> text -> draft -> normalized profile -> saved
 *
 * The file buffer and extracted text are never persisted. Only structured
 * data is stored.
 */
export async function importCVFromBuffer(input, userId) {
  const mimeType = input.mimeType || detectMimeTypeFromName(input.fileName)
  const validation = validateUpload(input.fileName, mimeType, input.buffer.byteLength)
  if (!validation.ok) {
    const code = validation.reason?.match(/large/i)
      ? 'FILE_TOO_LARGE'
      : validation.reason?.match(/extension|type/i)
      ? 'UNSUPPORTED_FILE_TYPE'
      : 'PARSING_FAILED'
    throw new ImportCVError(validation.reason ?? 'Invalid file.', code)
  }

  let text
  try {
    text = await extractTextFromFile(input.buffer, input.fileName)
  } catch (err) {
    throw new ImportCVError(
      err instanceof Error ? err.message : 'Could not extract text from file.',
      'PARSING_FAILED',
    )
  }

  let draft
  try {
    draft = await parseCVTextToProfile({
      text,
      source: { originalFileName: input.fileName, originalFileType: mimeType },
      userId,
    })
  } catch (err) {
    if (err instanceof CVParseError) {
      throw new ImportCVError(err.message, 'PARSING_FAILED')
    }
    throw new ImportCVError('Parser failed.', 'PARSING_FAILED')
  }

  if (input.target) {
    draft = { ...draft, target: input.target }
  }

  const source = {
    type: 'uploaded_cv',
    originalFileName: input.fileName,
    originalFileType: mimeType,
    parsedAt: new Date().toISOString(),
    parserVersion: 'mock-1',
  }

  const baseProfile = normalizeProfile({
    draft,
    source,
    userId,
    title: input.title,
    isDefault: true,
  })

  const profile = await createProfile(baseProfile)
  return { profile }
}

export { MAX_FILE_SIZE_BYTES }
