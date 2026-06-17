import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import DownloadPanel from '../../components/DownloadPanel.jsx'

const template = {
  key: 'ats-simple',
  name: 'ATS Simple',
  description: 'Clear and parse-friendly.',
  category: 'ats',
  bestFor: ['Job portals'],
  requiredFields: [],
  recommendedFields: [],
  supportedFormats: ['pdf'],
}

describe('DownloadPanel', () => {
  it('disables the button when no template is selected', () => {
    render(
      <DownloadPanel
        template={null}
        generating={false}
        error={null}
        onGenerate={() => {}}
        canGenerate={false}
      />,
    )
    expect(screen.getByText(/No template selected yet/i)).toBeInTheDocument()
    const button = screen.getByRole('button', { name: /Generate and download/i })
    expect(button).toBeDisabled()
  })

  it('shows the selected template and enables download', () => {
    render(
      <DownloadPanel
        template={template}
        generating={false}
        error={null}
        onGenerate={() => {}}
        canGenerate={true}
      />,
    )
    expect(screen.getByText('ATS Simple')).toBeInTheDocument()
    const button = screen.getByRole('button', { name: /Generate and download/i })
    expect(button).toBeEnabled()
  })
})
