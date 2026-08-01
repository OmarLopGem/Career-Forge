import { AppServiceError } from '@/lib/server/api-error.js'
import { loadProjectEnv } from '@/lib/server/load-env-file.mjs'

const DEFAULT_RESULTS_PER_PAGE = 20
const MAX_RESULTS_PER_PAGE = 50

function sanitizeText(value, maxLength = 120) {
  return String(value ?? '').trim().slice(0, maxLength)
}

function sanitizePositiveInteger(value, fallback, max) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback
  }
  return max ? Math.min(parsed, max) : parsed
}

function toNullableNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function combineEmploymentType(job) {
  const parts = [job?.contract_type, job?.contract_time]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)

  return parts.length > 0 ? parts.join(', ') : null
}

function normalizeAdzunaListing(job) {
  const externalId = String(job?.id ?? '').trim()

  if (!externalId) {
    return null
  }

  return {
    source: 'Adzuna',
    externalId,
    title: sanitizeText(job?.title, 200),
    company: sanitizeText(job?.company?.display_name, 160) || 'Unknown company',
    location: sanitizeText(job?.location?.display_name, 200),
    description: sanitizeText(job?.description, 5000),
    salaryMin: toNullableNumber(job?.salary_min),
    salaryMax: toNullableNumber(job?.salary_max),
    url: sanitizeText(job?.redirect_url, 1000) || null,
    requiredSkills: [],
    category: sanitizeText(job?.category?.label, 160),
    employmentType: combineEmploymentType(job),
    postedAt: sanitizeText(job?.created, 64) || null,
    isActive: true,
  }
}

function getAdzunaConfig() {
  loadProjectEnv()

  const appId = sanitizeText(process.env.ADZUNA_APP_ID, 80)
  const appKey = sanitizeText(process.env.ADZUNA_APP_KEY, 120)
  const country = sanitizeText(process.env.ADZUNA_COUNTRY || 'gb', 12).toLowerCase()
  const resultsPerPage = sanitizePositiveInteger(
    process.env.ADZUNA_RESULTS_PER_PAGE,
    DEFAULT_RESULTS_PER_PAGE,
    MAX_RESULTS_PER_PAGE,
  )

  if (!appId || !appKey) {
    return null
  }

  return {
    appId,
    appKey,
    country,
    resultsPerPage,
  }
}

export function isAdzunaConfigured() {
  return Boolean(getAdzunaConfig())
}

export function sanitizeAdzunaSearchInput(input = {}) {
  const config = getAdzunaConfig()

  return {
    what: sanitizeText(input.what, 120),
    where: sanitizeText(input.where, 120),
    page: sanitizePositiveInteger(input.page, 1),
    resultsPerPage: sanitizePositiveInteger(
      input.resultsPerPage,
      config?.resultsPerPage ?? DEFAULT_RESULTS_PER_PAGE,
      MAX_RESULTS_PER_PAGE,
    ),
  }
}

export async function searchAdzunaJobListings(input = {}) {
  const config = getAdzunaConfig()

  if (!config) {
    throw new AppServiceError(
      'Adzuna credentials are not configured on the server.',
      'ADZUNA_NOT_CONFIGURED',
      500,
    )
  }

  const search = sanitizeAdzunaSearchInput(input)
  const url = new URL(`https://api.adzuna.com/v1/api/jobs/${config.country}/search/${search.page}`)

  url.searchParams.set('app_id', config.appId)
  url.searchParams.set('app_key', config.appKey)
  url.searchParams.set('results_per_page', String(search.resultsPerPage))
  url.searchParams.set('content-type', 'application/json')

  if (search.what) {
    url.searchParams.set('what', search.what)
  }

  if (search.where) {
    url.searchParams.set('where', search.where)
  }

  let response
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    })
  } catch (err) {
    throw new AppServiceError(
      err instanceof Error ? err.message : 'Unable to reach Adzuna.',
      'ADZUNA_FETCH_FAILED',
      502,
    )
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new AppServiceError(
      body || `Adzuna request failed with status ${response.status}.`,
      'ADZUNA_FETCH_FAILED',
      502,
    )
  }

  const payload = await response.json()
  const jobListings = Array.isArray(payload?.results)
    ? payload.results.map(normalizeAdzunaListing).filter(Boolean)
    : []

  return {
    jobListings,
    sourceMeta: {
      provider: 'adzuna',
      mode: 'live',
      fallbackUsed: false,
      country: config.country,
      page: search.page,
      resultsPerPage: search.resultsPerPage,
      totalResults: Number(payload?.count ?? 0) || 0,
      fetchedAt: new Date().toISOString(),
    },
    search,
  }
}
