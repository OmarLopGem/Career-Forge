import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import CVAssistantStepper from '../../components/CVAssistantStepper.jsx'
import { CV_STEPS } from '@/lib/cv-assistant/ui-steps.js'

describe('CVAssistantStepper', () => {
  it('renders all five steps', () => {
    render(<CVAssistantStepper current="profiles" />)
    for (const step of CV_STEPS) {
      expect(screen.getByText(step.label)).toBeInTheDocument()
    }
  })

  it('marks the current step with the active style', () => {
    render(<CVAssistantStepper current="review" />)
    const stepLabel = screen.getByText('Review Profile')
    expect(stepLabel).toBeInTheDocument()
  })

  it('marks completed steps with the success style', () => {
    render(<CVAssistantStepper current="review" completed={['profiles']} />)
    expect(screen.getByText('Upload & Profiles')).toBeInTheDocument()
  })
})
