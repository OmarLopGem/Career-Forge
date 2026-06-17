import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import TemplateGrid from '../../components/TemplateGrid.jsx'

const templates = [
  {
    template: {
      key: 'ats-simple',
      name: 'ATS Simple',
      description: 'Clear and parse-friendly.',
      category: 'ats',
      bestFor: ['Job portals'],
      requiredFields: [],
      recommendedFields: [],
      supportedFormats: ['pdf'],
    },
    evaluation: {
      templateKey: 'ats-simple',
      status: 'recommended',
      missingRequiredFields: [],
      missingRecommendedFields: [],
      recommendationScore: 90,
    },
  },
  {
    template: {
      key: 'reverse-chronological-professional',
      name: 'Reverse Chronological',
      description: 'Standard recruiter-friendly format.',
      category: 'professional',
      bestFor: ['Mid-level candidates'],
      requiredFields: [],
      recommendedFields: [],
      supportedFormats: ['pdf'],
    },
    evaluation: {
      templateKey: 'reverse-chronological-professional',
      status: 'needs_more_information',
      missingRequiredFields: ['At least one work experience item'],
      missingRecommendedFields: [],
    },
  },
]

describe('TemplateGrid', () => {
  it('renders templates with statuses', () => {
    render(<TemplateGrid templates={templates} onSelect={() => {}} />)
    expect(screen.getByText('ATS Simple')).toBeInTheDocument()
    expect(screen.getByText('Reverse Chronological')).toBeInTheDocument()
    expect(screen.getByText('Recommended')).toBeInTheDocument()
    expect(screen.getByText('Needs more data')).toBeInTheDocument()
  })

  it('disables buttons for templates needing more data', () => {
    render(<TemplateGrid templates={templates} onSelect={() => {}} />)
    const buttons = screen.getAllByRole('button')
    const unavailable = buttons.find((b) => b.textContent?.includes('Unavailable'))
    expect(unavailable).toBeDefined()
  })

  it('shows missing required fields when present', () => {
    render(<TemplateGrid templates={templates} onSelect={() => {}} />)
    expect(
      screen.getByText(/At least one work experience item/i),
    ).toBeInTheDocument()
  })
})
