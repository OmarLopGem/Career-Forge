/**
 * Mock text extraction from uploaded PDF/DOCX.
 */

export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export const SUPPORTED_EXTENSIONS = ['.pdf', '.docx']

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

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

/**
 * TODO: replace with real PDF/DOCX text extraction (e.g. pdf-parse, mammoth)
 * once the AI service is integrated. For now we return a deterministic
 * sample text so the rest of the pipeline can be exercised end-to-end.
 */
export async function extractTextFromFile(buffer, fileName) {
  const lowerName = fileName.toLowerCase()
  const isDocx = lowerName.endsWith('.docx')
  const isPdf = lowerName.endsWith('.pdf')

  if (!isDocx && !isPdf) {
    throw new Error('Unsupported file type. Use PDF or DOCX.')
  }

  if (buffer.length === 0) {
    throw new Error('File is empty.')
  }

  return SAMPLE_EXTRACTION.replaceAll('{filename}', fileName)
}

const SAMPLE_EXTRACTION = `Curriculum Vitae
Filename: {filename}

Jane Doe
jane@example.com | +1 555 1234 | linkedin.com/in/jane | github.com/jane

Summary
Frontend engineer with 6+ years building production React and Next.js
applications. Specialized in TypeScript, performance, and design systems.

Experience
Senior Frontend Engineer - Acme
2022-01 - present
- Improved Lighthouse score from 62 to 95 across the marketing site.
- Led the migration of the dashboard to React Server Components, reducing
  client bundle size by 38 percent.
- Mentored 4 engineers, ran weekly frontend guild sessions.

Frontend Engineer - Globex
2019-06 - 2021-12
- Built the design system used by 6 product teams.
- Shipped the customer portal in React and Next.js, growing weekly active
  users from 12k to 48k.

Education
State University - B.Sc. Computer Science
2014 - 2018

Skills
Frontend: React, Next.js, TypeScript, Tailwind CSS
Backend: Node.js, GraphQL
Data: PostgreSQL, Redis
Cloud: AWS, Vercel
Tools: Git, Docker, GitHub Actions

Projects
Open UI Kit - https://open-ui.dev
1.2k stars on GitHub. Component library for the open source community.

Certifications
AWS Certified Developer - Associate, 2023

Languages
English (native), Spanish (professional)`
