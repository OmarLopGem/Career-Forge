import { AIServiceError } from '@/lib/services/ai.js'
import {
  detectMimeTypeFromName,
  extractTextFromFile,
  MAX_PDF_SIZE_BYTES,
} from '../extract-text-from-file.js'
import { ImportCVError } from '../import-cv.js'
import { parseCVTextToProfile, CVParseError } from './parse-cv-text-to-profile.js'

function validateInput({ buffer, fileName }) {
  if (!fileName || typeof fileName !== 'string') {
    throw new ImportCVError('Invalid file name.', 'UNSUPPORTED_FILE_TYPE')
  }
  if (!fileName.toLowerCase().endsWith('.pdf')) {
    throw new ImportCVError('Only PDF files are supported.', 'UNSUPPORTED_FILE_TYPE')
  }
  if (!buffer || buffer.byteLength === 0) {
    throw new ImportCVError('File is empty.', 'FILE_EMPTY')
  }
  if (buffer.byteLength > MAX_PDF_SIZE_BYTES) {
    throw new ImportCVError(
      `File is too large. Maximum ${Math.floor(MAX_PDF_SIZE_BYTES / (1024 * 1024))} MB.`,
      'FILE_TOO_LARGE',
    )
  }
}

function mapExtractionError(err) {
  const message = err instanceof Error ? err.message : 'Could not read PDF.'
  if (message.startsWith('SCANNED_PDF_NO_TEXT')) {
    return new ImportCVError(
      'This PDF appears to be a scanned image without selectable text. Please upload a PDF with selectable text.',
      'PARSING_FAILED',
      400,
    )
  }
  if (message.includes('Could not read PDF')) {
    return new ImportCVError(message, 'PARSING_FAILED', 400)
  }
  return new ImportCVError(message, 'PARSING_FAILED', 400)
}

export async function parseCVFileToProfile(input, dependencies = {}) {
  const parseText = dependencies.parseCVText ?? parseCVTextToProfile
  const extract = dependencies.extractText ?? extractTextFromFile
  const buffer = input.buffer instanceof Uint8Array ? input.buffer : new Uint8Array(input.buffer)

  validateInput({ buffer, fileName: input.fileName })

  const mimeType = input.mimeType || detectMimeTypeFromName(input.fileName)
  if (mimeType !== 'application/pdf') {
    throw new ImportCVError('Only PDF files are supported.', 'UNSUPPORTED_FILE_TYPE')
  }

  let text
  try {
    text = await extract(buffer, input.fileName)
  } catch (err) {
    throw mapExtractionError(err)
  }

  if (typeof text !== 'string' || text.length < 40) {
    throw new ImportCVError(
      'Extracted PDF text is too short. Please upload a richer CV.',
      'PARSING_FAILED',
      400,
    )
  }

  try {
    return await parseText({
      text,
      source: { originalFileName: input.fileName, originalFileType: mimeType },
      userId: input.userId,
    })
  } catch (err) {
    if (err instanceof CVParseError) {
      throw new ImportCVError(err.message, 'PARSING_FAILED', 400)
    }
    if (err instanceof AIServiceError) throw err
    if (err instanceof ImportCVError) throw err
    throw new ImportCVError('AI processing failed.', 'PARSING_FAILED', 400)
  }
}
