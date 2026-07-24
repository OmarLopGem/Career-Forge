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

  it('marks the profile-name field as required', () => {
    render(<CVUploadDropzone onFile={vi.fn()} />)
    const nameInput = screen.getByPlaceholderText(/Frontend Engineer Profile/i)
    expect(nameInput).toHaveAttribute('aria-required', 'true')
  })

  it('disables browse button until profile name is valid', async () => {
    const user = userEvent.setup()
    render(<CVUploadDropzone onFile={vi.fn()} />)
    const button = screen.getByRole('button', { name: /Browse files/i })
    expect(button).toBeDisabled()
    await user.type(screen.getByPlaceholderText(/Frontend Engineer Profile/i), 'My CV')
    expect(button).toBeEnabled()
  })

  it('shows an error for unsupported file types', async () => {
    const onFile = vi.fn()
    const user = userEvent.setup()
    render(<CVUploadDropzone onFile={onFile} />)
    await user.type(screen.getByPlaceholderText(/Frontend Engineer Profile/i), 'My CV')
    const fileInput = document.querySelector('input[type="file"]')
    const file = new File(['hello'], 'cv.txt', { type: 'text/plain' })
    await user.upload(fileInput, file)
    expect(onFile).not.toHaveBeenCalled()
  })

  it('shows an error for empty files', async () => {
    const onFile = vi.fn()
    const user = userEvent.setup()
    render(<CVUploadDropzone onFile={onFile} />)
    await user.type(screen.getByPlaceholderText(/Frontend Engineer Profile/i), 'My CV')
    const fileInput = document.querySelector('input[type="file"]')
    const file = new File([], 'cv.pdf', { type: 'application/pdf' })
    await user.upload(fileInput, file)
    expect(onFile).not.toHaveBeenCalled()
  })

  it('refuses to upload without a profile name', async () => {
    const onFile = vi.fn()
    const user = userEvent.setup()
    render(<CVUploadDropzone onFile={onFile} />)
    const fileInput = document.querySelector('input[type="file"]')
    const file = new File(['data'], 'cv.pdf', { type: 'application/pdf' })
    await user.upload(fileInput, file)
    expect(onFile).not.toHaveBeenCalled()
    expect(await screen.findByRole('alert')).toHaveTextContent(/profile name/i)
  })

  it('passes the trimmed profile name to onFile when upload is valid', async () => {
    const onFile = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<CVUploadDropzone onFile={onFile} />)
    await user.type(screen.getByPlaceholderText(/Frontend Engineer Profile/i), '  Senior FE CV  ')
    const fileInput = document.querySelector('input[type="file"]')
    const file = new File(['data'], 'cv.pdf', { type: 'application/pdf' })
    await user.upload(fileInput, file)
    expect(onFile).toHaveBeenCalledTimes(1)
    expect(onFile.mock.calls[0][1]).toBe('Senior FE CV')
  })
})
