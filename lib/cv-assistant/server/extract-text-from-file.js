import { extractText, getDocumentProxy } from 'unpdf'

const SCANNED_MIN_LENGTH = 50

export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export const SUPPORTED_EXTENSIONS = ['.pdf', '.docx']

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

export const MAX_PDF_SIZE_BYTES = (() => {
  const fromEnv = Number.parseInt(process.env.MAX_PDF_SIZE_BYTES ?? '', 10)
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv
  return MAX_FILE_SIZE_BYTES
})()

export function validateUpload(fileName, mimeType, size) {
  if (size <= 0) {
    return { ok: false, reason: 'File is empty.' }
  }
  if (size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, reason: 'File is too large.' }
  }
  const lowerName = fileName.toLowerCase()
  const ext = SUPPORTED_EXTENSIONS.find((e) => lowerName.endsWith(e))
  if (!ext) {
    return { ok: false, reason: 'Unsupported file extension. Use PDF or DOCX.' }
  }
  if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
    return { ok: false, reason: 'Unsupported file type.' }
  }
  return { ok: true, mimeType, extension: ext }
}

export function detectMimeTypeFromName(fileName) {
  const lowerName = fileName.toLowerCase()
  if (lowerName.endsWith('.pdf')) return 'application/pdf'
  if (lowerName.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  return 'application/octet-stream'
}

function ensureUint8(buffer) {
  if (buffer instanceof Uint8Array) return buffer
  if (ArrayBuffer.isView(buffer)) return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  return new Uint8Array(buffer)
}

async function extractPdfText(buffer) {
  const data = ensureUint8(buffer)
  const pdf = await getDocumentProxy(data)
  const result = await extractText(pdf, { mergePages: true })
  return (result.text ?? '').replace(/\s+/g, ' ').trim()
}

export async function extractTextFromFile(buffer, fileName) {
  const lowerName = (fileName ?? '').toLowerCase()
  const isDocx = lowerName.endsWith('.docx')
  const isPdf = lowerName.endsWith('.pdf')

  if (!isDocx && !isPdf) {
    throw new Error('Unsupported file type. Use PDF or DOCX.')
  }

  if (!buffer || buffer.byteLength === 0) {
    throw new Error('File is empty.')
  }

  if (isPdf) {
    let text
    try {
      text = await extractPdfText(buffer)
    } catch (err) {
      throw new Error(
        err instanceof Error
          ? `Could not read PDF: ${err.message}`
          : 'Could not read PDF.',
      )
    }
    if (text.length < SCANNED_MIN_LENGTH) {
      throw new Error(
        'SCANNED_PDF_NO_TEXT: This PDF appears to be a scanned image without selectable text. Please upload a PDF with selectable text.',
      )
    }
    return text
  }

  throw new Error('DOCX support is not yet available. Please upload a PDF.')
}
