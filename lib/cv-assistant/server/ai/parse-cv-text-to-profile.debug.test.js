import { describe, it } from 'vitest'
import { parseCVTextToProfile } from './parse-cv-text-to-profile.js'

describe('debug', () => {
  it('debug parser output', async () => {
    const text = `Jane Doe
jane@example.com | https://github.com/jane

Summary
Frontend engineer with 6+ years building React and Next.js applications.

Experience
Senior Frontend Engineer - Acme
- Improved Lighthouse score from 62 to 95.
- Led migration to React Server Components.

Skills
React, Next.js, TypeScript, Node.js, Tailwind CSS

Projects
Open UI Kit - https://open-ui.dev - 1.2k stars
`
    const lines = text.split('\n')
    console.log('Lines:', JSON.stringify(lines.map((l, i) => `${i}: ${JSON.stringify(l)}`)))
    const result = await parseCVTextToProfile({
      text,
      source: { originalFileName: 'jane.pdf', originalFileType: 'application/pdf' },
      userId: 'user-1',
    })
    console.log('Experience:', JSON.stringify(result.experience, null, 2))
    console.log('Test regex:', "Senior Frontend Engineer - Acme".match(/^([^-]+?)\s+-\s+(.+)$/))
    console.log('Skills categories:', result.skills.map((s) => s.category))
    console.log('Summary:', result.professionalSummary)
  })
})
