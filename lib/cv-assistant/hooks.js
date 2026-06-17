'use client'

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useRef, useState } from 'react'

async function readJson(res) {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

async function callApi(input, init, signal) {
  const res = await fetch(input, { ...init, signal })
  if (!res.ok) {
    const body = await readJson(res)
    const message = body?.error?.message ?? `Request failed (${res.status})`
    const error = new Error(message)
    error.code = body?.error?.code
    error.status = res.status
    throw error
  }
  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return await res.json()
  }
  return await res.blob()
}

export function useCVProfiles() {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  const refresh = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError(null)
    try {
      const data = await callApi('/api/cv/profiles', undefined, controller.signal)
      if (controller.signal.aborted) return
      setProfiles(data.profiles ?? [])
    } catch (err) {
      if (err?.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Failed to load profiles')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
    return () => abortRef.current?.abort()
  }, [refresh])

  return { profiles, loading, error, refresh }
}

export function useCVProfile(profileId) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  const refresh = useCallback(async () => {
    abortRef.current?.abort()
    if (!profileId) {
      setProfile(null)
      return
    }
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError(null)
    try {
      const data = await callApi(`/api/cv/profiles/${profileId}`, undefined, controller.signal)
      if (controller.signal.aborted) return
      setProfile(data.profile ?? null)
    } catch (err) {
      if (err?.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [profileId])

  useEffect(() => {
    void refresh()
    return () => abortRef.current?.abort()
  }, [refresh])

  return { profile, loading, error, refresh, setProfile }
}

export function useCVAnalysis(profileId) {
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  const refresh = useCallback(async () => {
    abortRef.current?.abort()
    if (!profileId) {
      setAnalysis(null)
      return
    }
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError(null)
    try {
      const data = await callApi(
        `/api/cv/profiles/${profileId}/analysis/latest`,
        undefined,
        controller.signal,
      )
      if (controller.signal.aborted) return
      setAnalysis(data.analysis ?? null)
    } catch (err) {
      if (err?.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Failed to load analysis')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [profileId])

  useEffect(() => {
    void refresh()
    return () => abortRef.current?.abort()
  }, [refresh])

  const runAnalysis = useCallback(async () => {
    if (!profileId) return
    const controller = new AbortController()
    abortRef.current?.abort()
    abortRef.current = controller
    setLoading(true)
    setError(null)
    try {
      const data = await callApi(
        `/api/cv/profiles/${profileId}/analyze`,
        { method: 'POST' },
        controller.signal,
      )
      if (controller.signal.aborted) return
      setAnalysis(data.analysis ?? null)
    } catch (err) {
      if (err?.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Failed to run analysis')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [profileId])

  return { analysis, loading, error, refresh, runAnalysis }
}

export function useTemplateEvaluations(profileId) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  const refresh = useCallback(async () => {
    abortRef.current?.abort()
    if (!profileId) {
      setTemplates([])
      return
    }
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError(null)
    try {
      const data = await callApi(
        `/api/cv/profiles/${profileId}/templates`,
        undefined,
        controller.signal,
      )
      if (controller.signal.aborted) return
      setTemplates(data.templates ?? [])
    } catch (err) {
      if (err?.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [profileId])

  useEffect(() => {
    void refresh()
    return () => abortRef.current?.abort()
  }, [refresh])

  return { templates, loading, error, refresh }
}

export function useResumeGeneration(profileId) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)

  const generate = useCallback(
    async (templateKey) => {
      if (!profileId) return
      setGenerating(true)
      setError(null)
      try {
        const res = await fetch(`/api/cv/profiles/${profileId}/generate`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ templateKey, format: 'pdf' }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error?.message ?? `Request failed (${res.status})`)
        }
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const disposition = res.headers.get('content-disposition') ?? ''
        const match = disposition.match(/filename="?([^";]+)"?/)
        a.download = match?.[1] ?? `resume-${templateKey}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate PDF')
      } finally {
        setGenerating(false)
      }
    },
    [profileId],
  )

  return { generate, generating, error }
}
