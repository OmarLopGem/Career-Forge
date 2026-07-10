export function sanitizeRedirectTo(value, fallback = '/calendar') {
  if (typeof value !== 'string') {
    return fallback
  }

  const trimmed = value.trim()

  if (!trimmed.startsWith('/')) {
    return fallback
  }

  if (trimmed.startsWith('//') || trimmed.includes('://')) {
    return fallback
  }

  return trimmed
}
