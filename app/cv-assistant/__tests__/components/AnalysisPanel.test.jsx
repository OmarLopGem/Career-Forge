import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import AnalysisPanel from '../../components/AnalysisPanel.jsx'

const sample = {
  _id: 'a1',
  userId: 'u1',
  profileId: 'p1',
  detectedNiche: 'Frontend Engineer specialized in React/Next.js',
  nicheReasoning: 'React, Next.js detected.',
  strengths: [{ title: 'Strong frontend stack', description: 'React, Next.js' }],
  weaknesses: [{ title: 'Weak skills', description: 'Add more skills' }],
  improvementSuggestions: [
    { title: 'Add metrics', description: 'Quantify achievements' },
  ],
  atsFeedback: {
    score: 80,
    comments: ['Good baseline'],
    formattingWarnings: [],
    keywordSuggestions: ['TypeScript'],
  },
  suggestedRoles: [{ title: 'Senior Frontend Engineer', fitScore: 0.9 }],
  keywordGaps: ['CI/CD'],
  createdAt: new Date().toISOString(),
}

describe('AnalysisPanel', () => {
  it('shows the empty state when no analysis', () => {
    render(
      <AnalysisPanel
        analysis={null}
        loading={false}
        error={null}
        onRun={() => {}}
        canRun={true}
      />,
    )
    expect(screen.getByText(/Run your AI analysis/i)).toBeInTheDocument()
  })

  it('renders the niche and feedback when analysis is present', () => {
    render(
      <AnalysisPanel
        analysis={sample}
        loading={false}
        error={null}
        onRun={() => {}}
        canRun={true}
      />,
    )
    expect(screen.getByText(/Frontend Engineer specialized/i)).toBeInTheDocument()
    expect(screen.getByText(/Strong frontend stack/i)).toBeInTheDocument()
    expect(screen.getByText(/Add metrics/i)).toBeInTheDocument()
    expect(screen.getByText(/CI\/CD/i)).toBeInTheDocument()
  })

  it('shows error when present', () => {
    render(
      <AnalysisPanel
        analysis={null}
        loading={false}
        error="Could not run analysis."
        onRun={() => {}}
        canRun={true}
      />,
    )
    expect(screen.getByText(/Could not run analysis/i)).toBeInTheDocument()
  })
})
