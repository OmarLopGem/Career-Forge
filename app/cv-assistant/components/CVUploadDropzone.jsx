'use client'

import { useCallback, useId, useRef, useState } from 'react'

const ACCEPT = '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const MAX_SIZE = 5 * 1024 * 1024

export default function CVUploadDropzone({ onFile, disabled }) {
  const inputRef = useRef(null)
  const inputId = useId()
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState(null)
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)

  const handleFile = useCallback(
    async (file) => {
      setError(null)
      if (file.size <= 0) {
        setError('File is empty.')
        return
      }
      if (file.size > MAX_SIZE) {
        setError('File is too large. Maximum 5 MB.')
        return
      }
      const lower = file.name.toLowerCase()
      if (!(lower.endsWith('.pdf') || lower.endsWith('.docx'))) {
        setError('Unsupported file type. Use PDF or DOCX.')
        return
      }
      setBusy(true)
      try {
        await onFile(file)
        setTitle('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed.')
      } finally {
        setBusy(false)
      }
    },
    [onFile],
  )

  return (
    <div className="rounded-3xl border border-border bg-surface p-6 md:p-8 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-soft text-brand-blue">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <path d="M12 3v12" />
            <path d="m7 8 5-5 5 5" />
            <path d="M5 21h14" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-navy">Upload your current CV</h3>
          <p className="mt-1 text-sm leading-6 text-text-muted">
            We will parse your PDF or DOCX, extract your professional data, and discard the
            file. Only your structured profile is stored.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="md:col-span-1 block">
          <span className="text-xs font-semibold text-text-muted tracking-wider">
            PROFILE NAME
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Frontend Engineer Profile"
            className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-text-main placeholder:text-text-muted focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 transition"
            disabled={busy || disabled}
          />
        </label>

        <div
          className={[
            'md:col-span-2 relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition-colors duration-300',
            isDragging
              ? 'border-brand-blue bg-blue-soft'
              : 'border-border bg-background hover:border-brand-blue/60',
            busy || disabled ? 'opacity-60' : '',
          ].join(' ')}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            const file = e.dataTransfer.files?.[0]
            if (file) void handleFile(file)
          }}
        >
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleFile(file)
              if (inputRef.current) inputRef.current.value = ''
            }}
            disabled={busy || disabled}
          />
          <p className="text-sm font-semibold text-navy">
            Drag and drop your CV here
          </p>
          <p className="text-xs text-text-muted">PDF or DOCX, up to 5 MB</p>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy || disabled}
            className="mt-2 inline-flex items-center justify-center rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-brand-blue-hover hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy ? 'Parsing…' : 'Browse files'}
          </button>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-forge-orange/40 bg-orange-soft px-4 py-2 text-sm text-forge-orange"
        >
          {error}
        </p>
      ) : null}

      <p className="mt-4 text-xs leading-5 text-text-muted">
        Your file is used only for parsing and is not stored after processing. We never keep
        the original document, raw extracted text, or generated PDF on our servers.
      </p>
    </div>
  )
}
