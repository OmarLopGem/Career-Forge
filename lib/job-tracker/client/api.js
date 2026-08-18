async function parseError(response) {
  const body = await response.json().catch(() => ({}))
  const error = new Error(body?.error?.message ?? 'Request failed.')
  error.status = response.status
  error.code = body?.error?.code ?? null
  throw error
}

function createNetworkError(error) {
  const networkError = new Error(
    error instanceof Error && error.message ? error.message : 'Network request failed.',
  )
  networkError.status = null
  networkError.code = 'NETWORK_ERROR'
  networkError.cause = error instanceof Error ? error : undefined
  throw networkError
}

export async function requestJson(url, options = {}) {
  let response
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'content-type': 'application/json',
        ...(options.headers ?? {}),
      },
    })
  } catch (error) {
    createNetworkError(error)
  }

  if (!response.ok) {
    await parseError(response)
  }

  return response.json()
}

export async function requestJsonWithoutBody(url, options = {}) {
  let response
  try {
    response = await fetch(url, options)
  } catch (error) {
    createNetworkError(error)
  }

  if (!response.ok) {
    await parseError(response)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}
