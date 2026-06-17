export const CV_STEPS = [
  { key: 'profiles', label: 'Upload & Profiles', number: '01' },
  { key: 'review', label: 'Review Profile', number: '02' },
  { key: 'analysis', label: 'AI Analysis', number: '03' },
  { key: 'templates', label: 'Templates', number: '04' },
  { key: 'download', label: 'Download', number: '05' },
]

const STEPS_BY_TEMPLATE = {
  'harvard-classic': '02',
  'ats-simple': '04',
  'reverse-chronological-professional': '04',
  'technical-projects': '04',
  'hybrid-combination': '05',
}

export function stepIndex(key) {
  return CV_STEPS.findIndex((s) => s.key === key)
}

export function nextStep(key) {
  const i = stepIndex(key)
  if (i < 0 || i === CV_STEPS.length - 1) return null
  return CV_STEPS[i + 1]
}

export function previousStep(key) {
  const i = stepIndex(key)
  if (i <= 0) return null
  return CV_STEPS[i - 1]
}

export function stepForTemplate(templateKey) {
  return STEPS_BY_TEMPLATE[templateKey] ?? '04'
}
