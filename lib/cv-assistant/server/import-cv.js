import {
  detectMimeTypeFromName,
  validateUpload,
} from './extract-text-from-file.js'
import { parseCVFileToProfile } from './ai/parse-cv-file-to-profile.js'
import { AIServiceError } from '@/lib/services/ai.js'
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
 *   uploaded PDF -> multimodal AI -> normalized profile -> saved
 *
 * The file buffer is never persisted. Only structured data is stored.
 */
export async function importCVFromBuffer(input, userId, dependencies = {}) {
  const parseCVFile = dependencies.parseCVFile ?? parseCVFileToProfile

  const mimeType = input.mimeType || detectMimeTypeFromName(input.fileName)
  const validation = validateUpload(input.fileName, mimeType, input.buffer.byteLength)
  if (!validation.ok) {
    const code = validation.reason?.match(/large/i)
      ? 'FILE_TOO_LARGE'
      : validation.reason?.match(/empty/i)
      ? 'FILE_EMPTY'
      : validation.reason?.match(/extension|type/i)
      ? 'UNSUPPORTED_FILE_TYPE'
      : 'PARSING_FAILED'
    throw new ImportCVError(validation.reason ?? 'Invalid file.', code)
  }

  const lowerName = input.fileName.toLowerCase()
  if (!lowerName.endsWith('.pdf')) {
    throw new ImportCVError(
      'Only PDF files are supported. Please upload a PDF.',
      'UNSUPPORTED_FILE_TYPE',
    )
  }

  const title = typeof input.title === 'string' ? input.title.trim() : ''
  if (title.length < 3 || title.length > 80) {
    throw new ImportCVError(
      'A profile name between 3 and 80 characters is required.',
      'INVALID_TITLE',
      400,
    )
  }

  let draft
  try {
    draft = await parseCVFile({
      buffer: input.buffer,
      mimeType,
      fileName: input.fileName,
      userId,
    })
  } catch (err) {
    if (err instanceof AIServiceError) {
      throw new ImportCVError(err.message, err.code ?? 'PARSING_FAILED', err.status)
    }
    if (err instanceof ImportCVError) throw err
    throw new ImportCVError('AI processing failed.', 'PARSING_FAILED')
  }

  if (input.target) {
    draft = { ...draft, target: input.target }
  }

  const source = {
    type: 'uploaded_cv',
    originalFileName: input.fileName,
    originalFileType: mimeType,
    parsedAt: new Date().toISOString(),
    parserVersion: 'multimodal-1',
  }

  const baseProfile = normalizeProfile({
    draft,
    source,
    userId,
    title,
    isDefault: true,
  })

  const profile = await createProfile(baseProfile)
  return { profile }
}

export { MAX_FILE_SIZE_BYTES } from './extract-text-from-file.js'
