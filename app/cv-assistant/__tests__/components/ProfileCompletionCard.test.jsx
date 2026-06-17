import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProfileCompletionCard from '../../components/ProfileCompletionCard.jsx'

const completeCompletion = {
  isMinimumComplete: true,
  score: 80,
  missingRequiredFields: [],
  missingRecommendedFields: [],
  sectionScores: {},
  lastCheckedAt: new Date().toISOString(),
}

const incompleteCompletion = {
  isMinimumComplete: false,
  score: 30,
  missingRequiredFields: ['Full name', 'At least one contact method', 'At least 3 skills'],
  missingRecommendedFields: ['Professional summary'],
  sectionScores: {},
  lastCheckedAt: new Date().toISOString(),
}

describe('ProfileCompletionCard', () => {
  it('shows ready state when complete', () => {
    render(<ProfileCompletionCard completion={completeCompletion} />)
    expect(screen.getByText(/Ready to generate/i)).toBeInTheDocument()
  })

  it('shows specific missing fields when incomplete', () => {
    render(<ProfileCompletionCard completion={incompleteCompletion} />)
    expect(screen.getByText(/Full name/i)).toBeInTheDocument()
    expect(screen.getByText(/At least one contact method/i)).toBeInTheDocument()
    expect(screen.getByText(/At least 3 skills/i)).toBeInTheDocument()
  })
})
