'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  useCVAnalysis,
  useCVProfile,
  useCVProfiles,
  useResumeGeneration,
  useTemplateEvaluations,
  useCVAssistantStep,
  useProfileAutoSelect,
  useStepCompletionTracker,
  useTemplateSelection,
  useCVAssistantUpload,
} from '@/lib/cv-assistant/hooks/index.js'
import { CV_STEPS, nextStep, previousStep } from '@/lib/cv-assistant/ui-steps.js'

import CVAssistantStepper from './components/CVAssistantStepper.jsx'
import CVUploadDropzone from './components/CVUploadDropzone.jsx'
import ProfileList from './components/ProfileList.jsx'
import ProfileCompletionCard from './components/ProfileCompletionCard.jsx'
import PersonalInfoForm from './components/PersonalInfoForm.jsx'
import TargetRoleForm from './components/TargetRoleForm.jsx'
import AnalysisPanel from './components/AnalysisPanel.jsx'
import TemplateGrid from './components/TemplateGrid.jsx'
import DownloadPanel from './components/DownloadPanel.jsx'

export default function CVAssistantClient() {
  const router = useRouter()

  const profiles = useCVProfiles()
  const stepState = useCVAssistantStep('profiles')
  const { step, completed, setStep, markCompleted, jumpTo } = stepState

  const { selectedProfileId, setSelectedProfileId } = useProfileAutoSelect(
    profiles.profiles,
    null,
  )
  const profileHook = useCVProfile(selectedProfileId)
  const analysis = useCVAnalysis(selectedProfileId)
  const templates = useTemplateEvaluations(selectedProfileId)
  const generation = useResumeGeneration(selectedProfileId)

  const templateSelection = useTemplateSelection(templates.templates)

  const { isProfileComplete } = useStepCompletionTracker(
    step,
    profileHook.profile,
    markCompleted,
  )

  const { handleUpload, importError } = useCVAssistantUpload({
    profiles,
    setSelectedProfileId,
    markCompleted,
    onStep: setStep,
  })

  const handleSelectProfile = useCallback(
    (id) => {
      setSelectedProfileId(id)
      markCompleted('profiles')
      setStep('review')
    },
    [setSelectedProfileId, markCompleted, setStep],
  )

  const handleSavePersonalInfo = useCallback(
    async (personalInfo) => {
      if (!selectedProfileId) return
      const res = await fetch(`/api/cv/profiles/${selectedProfileId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ personalInfo }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error?.message ?? 'Save failed.')
      }
      await profileHook.refresh()
    },
    [selectedProfileId, profileHook],
  )

  const handleSaveTarget = useCallback(
    async (target) => {
      if (!selectedProfileId) return
      const res = await fetch(`/api/cv/profiles/${selectedProfileId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ target }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error?.message ?? 'Save failed.')
      }
      await profileHook.refresh()
    },
    [selectedProfileId, profileHook],
  )

  const handleRunAnalysis = useCallback(async () => {
    if (!selectedProfileId) return
    await analysis.runAnalysis()
    markCompleted('review')
    setStep('analysis')
  }, [selectedProfileId, analysis, markCompleted, setStep])

  const handleSelectTemplate = useCallback(
    (key) => {
      templateSelection.handleSelectTemplate(key)
      markCompleted('templates')
      setStep('download')
    },
    [templateSelection, markCompleted, setStep],
  )

  const handleGenerate = useCallback(async () => {
    if (!templateSelection.selectedTemplateKey) return
    await generation.generate(templateSelection.selectedTemplateKey)
  }, [generation, templateSelection.selectedTemplateKey])

  const profile = profileHook.profile
  const next = nextStep(step)
  const previous = previousStep(step)

  return (
    <div className="bg-background min-h-screen">
      <section className="max-w-6xl mx-auto px-5 sm:px-6 pt-10 pb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <span className="inline-flex rounded-full bg-blue-soft px-3 py-1 text-xs font-semibold text-brand-blue">
              CV Assistant
            </span>
            <h1 className="mt-3 text-3xl md:text-4xl font-bold text-navy tracking-tight">
              Forge a stronger resume in five steps.
            </h1>
            <p className="mt-2 text-sm md:text-base text-text-muted max-w-2xl">
              Upload your CV, review the parsed profile, run an AI analysis, pick a
              template, and download a polished PDF. Your files are never stored.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-navy transition-all duration-300 hover:border-brand-blue hover:text-brand-blue"
          >
            Back to home
          </button>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 sm:px-6 pb-6">
        <CVAssistantStepper
          current={step}
          completed={completed}
          onJump={jumpTo}
        />
      </section>

      <section className="max-w-6xl mx-auto px-5 sm:px-6 pb-16 space-y-6">
        {step === 'profiles' ? (
          <div className="space-y-6">
            {profiles.profiles.length > 0 ? (
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-navy">Your saved profiles</h2>
                <ProfileList
                  profiles={profiles.profiles}
                  selectedId={selectedProfileId}
                  onSelect={handleSelectProfile}
                />
              </div>
            ) : null}
            <CVUploadDropzone onFile={handleUpload} />
            {importError ? (
              <p
                role="alert"
                className="rounded-xl border border-forge-orange/40 bg-orange-soft px-4 py-2 text-sm text-forge-orange"
              >
                {importError}
              </p>
            ) : null}
            <div className="rounded-3xl border border-border bg-surface p-6">
              <h2 className="text-lg font-bold text-navy">How it works</h2>
              <ol className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-3">
                {CV_STEPS.map((s) => (
                  <li
                    key={s.key}
                    className="rounded-2xl border border-border bg-background p-4"
                  >
                    <p className="text-xs font-semibold tracking-widest text-text-muted">
                      STEP {s.number}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-navy">{s.label}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : null}

        {step === 'review' && profile ? (
          <div className="space-y-6">
            <ProfileCompletionCard completion={profile.completion} />
            <PersonalInfoForm
              profile={profile}
              onSave={handleSavePersonalInfo}
            />
            <TargetRoleForm profile={profile} onSave={handleSaveTarget} />
            <StepActions
              previous={previous}
              next={
                isProfileComplete
                  ? { key: 'analysis', label: 'Run analysis' }
                  : null
              }
              onPrevious={() => previous && setStep(previous.key)}
              onNext={() => {
                if (isProfileComplete) {
                  void handleRunAnalysis()
                }
              }}
            />
          </div>
        ) : null}

        {step === 'analysis' && profile ? (
          <div className="space-y-6">
            <AnalysisPanel
              analysis={analysis.analysis}
              loading={analysis.loading}
              error={analysis.error}
              onRun={handleRunAnalysis}
              canRun={isProfileComplete}
            />
            <StepActions
              previous={previous}
              next={
                analysis.analysis
                  ? { key: 'templates', label: 'Browse templates' }
                  : null
              }
              onPrevious={() => previous && setStep(previous.key)}
              onNext={() => analysis.analysis && setStep('templates')}
            />
          </div>
        ) : null}

        {step === 'templates' && profile ? (
          <div className="space-y-6">
            <TemplateGrid
              templates={templates.templates}
              onSelect={handleSelectTemplate}
              selectedKey={templateSelection.selectedTemplateKey ?? undefined}
            />
            <StepActions
              previous={previous}
              next={null}
              onPrevious={() => previous && setStep(previous.key)}
              onNext={() => undefined}
            />
          </div>
        ) : null}

        {step === 'download' && profile ? (
          <div className="space-y-6">
            <DownloadPanel
              template={templateSelection.selectedTemplate}
              generating={generation.generating}
              error={generation.error}
              onGenerate={handleGenerate}
              canGenerate={Boolean(templateSelection.selectedTemplateKey)}
            />
            <StepActions
              previous={previous}
              next={null}
              onPrevious={() => previous && setStep(previous.key)}
              onNext={() => undefined}
            />
          </div>
        ) : null}
      </section>
    </div>
  )
}

function StepActions({ previous, next, onPrevious, onNext }) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      <button
        type="button"
        onClick={onPrevious}
        disabled={!previous}
        className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-navy transition-all duration-300 hover:border-brand-blue hover:text-brand-blue disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {previous ? `← ${previous.label}` : 'No previous step'}
      </button>
      {next ? (
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center justify-center rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-brand-blue-hover hover:-translate-y-0.5 hover:shadow-md"
        >
          {next.label} →
        </button>
      ) : null}
    </div>
  )
}
