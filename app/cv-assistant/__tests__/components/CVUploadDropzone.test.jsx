import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CVUploadDropzone from '../../components/CVUploadDropzone.jsx'

describe('CVUploadDropzone', () => {
  it('renders the upload prompt and browse button', () => {
    render(<CVUploadDropzone onFile={vi.fn()} />)
    expect(screen.getByText(/Drag and drop your CV here/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Browse files/i })).toBeInTheDocument()
  })

  it('shows an error for unsupported file types', async () => {
    const onFile = vi.fn()
    const user = userEvent.setup()
    render(<CVUploadDropzone onFile={onFile} />)
    const fileInput = document.querySelector('input[type="file"]')
    const file = new File(['hello'], 'cv.txt', { type: 'text/plain' })
    await user.upload(fileInput, file)
    expect(onFile).not.toHaveBeenCalled()
  })

  it('shows an error for empty files', async () => {
    const onFile = vi.fn()
    const user = userEvent.setup()
    render(<CVUploadDropzone onFile={onFile} />)
    const fileInput = document.querySelector('input[type="file"]')
    const file = new File([], 'cv.pdf', { type: 'application/pdf' })
    await user.upload(fileInput, file)
    expect(onFile).not.toHaveBeenCalled()
  })
})
