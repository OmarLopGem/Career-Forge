'use client'

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { nextStep, previousStep } from '../ui-steps.js'

/**
 * useCVAssistantStep
 * Owns the current step and the set of completed steps.
 * Exposes navigation helpers that also mark the previous step as completed.
 */
export function useCVAssistantStep(initialStep = 'profiles') {
  const [step, setStep] = useState(initialStep)
  const [completed, setCompleted] = useState([])

  const markCompleted = useCallback((key) => {
    setCompleted((prev) => (prev.includes(key) ? prev : [...prev, key]))
  }, [])

  const goTo = useCallback(
    (key) => {
      if (key === step) return
      markCompleted(step)
      setStep(key)
    },
    [step, markCompleted],
  )

  const next = useCallback(async () => {
    const target = nextStep(step)
    if (target) {
      markCompleted(step)
      setStep(target.key)
      return target
    }
    return null
  }, [step, markCompleted])

  const previous = useCallback(async () => {
    const target = previousStep(step)
    if (target) {
      setStep(target.key)
      return target
    }
    return null
  }, [step])

  const isStepCompleted = useCallback(
    (key) => completed.includes(key),
    [completed],
  )

  const canNavigateTo = useCallback(
    (key) => key === step || completed.includes(key),
    [step, completed],
  )

  const jumpTo = useCallback(
    (key) => {
      if (canNavigateTo(key)) {
        setStep(key)
      }
    },
    [canNavigateTo],
  )

  return {
    step,
    completed,
    setStep,
    markCompleted,
    goTo,
    next,
    previous: previous,
    isStepCompleted,
    canNavigateTo,
    jumpTo,
  }
}

/**
 * useProfileAutoSelect
 * Auto-selects the first profile when the list loads,
 * and syncs the selected id when the loaded profile's _id changes.
 */
export function useProfileAutoSelect(profiles, currentProfile) {
  const [selectedProfileId, setSelectedProfileId] = useState(null)

  useEffect(() => {
    if (selectedProfileId) return
    const first = profiles?.[0]
    if (first) setSelectedProfileId(first._id)
  }, [profiles, selectedProfileId])

  useEffect(() => {
    const id = currentProfile?._id
    if (id && id !== selectedProfileId) {
      setSelectedProfileId(id)
    }
  }, [currentProfile?._id, selectedProfileId])

  return { selectedProfileId, setSelectedProfileId }
}

/**
 * useStepCompletionTracker
 * Marks the 'review' step as completed when the profile meets the
 * minimum requirements, while the user is on the review step.
 */
export function useStepCompletionTracker(step, profile, markCompleted) {
  const isProfileComplete = profile?.completion?.isMinimumComplete ?? false
  useEffect(() => {
    if (!profile) return
    if (step === 'review' && isProfileComplete) {
      markCompleted('review')
    }
  }, [step, isProfileComplete, profile, markCompleted])
  return { isProfileComplete }
}

/**
 * useTemplateSelection
 * Owns the currently selected template key + a derived template definition
 * from the templates list.
 */
export function useTemplateSelection(templates, initialKey = null) {
  const [selectedTemplateKey, setSelectedTemplateKey] = useState(initialKey)

  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateKey) return null
    const match = (templates ?? []).find((t) => t.template.key === selectedTemplateKey)
    return match?.template ?? null
  }, [selectedTemplateKey, templates])

  const handleSelectTemplate = useCallback((key) => {
    setSelectedTemplateKey(key)
    return key
  }, [])

  const resetTemplate = useCallback(() => setSelectedTemplateKey(null), [])

  return {
    selectedTemplateKey,
    selectedTemplate,
    setSelectedTemplateKey,
    handleSelectTemplate,
    resetTemplate,
  }
}

/**
 * useCVAssistantUpload
 * Handles the full upload flow: POST file, refresh profiles, select the
 * new profile, and mark the 'profiles' step as completed. Errors are
 * surfaced through a returned error state instead of being thrown.
 */
export function useCVAssistantUpload({ profiles, setSelectedProfileId, markCompleted, onStep }) {
  const [importError, setImportError] = useState(null)
  const [uploading, setUploading] = useState(false)

  const handleUpload = useCallback(
    async (file) => {
      setImportError(null)
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)
      try {
        const res = await fetch('/api/cv/profiles/import', {
          method: 'POST',
          body: formData,
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error?.message ?? 'Upload failed.')
        }
        const data = await res.json()
        await profiles.refresh()
        setSelectedProfileId(data.profile._id)
        markCompleted('profiles')
        onStep?.('review')
        return data.profile
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Upload failed.')
        throw err
      } finally {
        setUploading(false)
      }
    },
    [profiles, setSelectedProfileId, markCompleted, onStep],
  )

  return { handleUpload, importError, setImportError, uploading }
}
