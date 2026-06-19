async function parseError(response) {
  const body = await response.json().catch(() => ({}))
  throw new Error(body?.error?.message ?? 'Request failed.')
}

export async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers ?? {}),
    },
  })

  if (!response.ok) {
    await parseError(response)
  }

  return response.json()
}

export async function requestJsonWithoutBody(url, options = {}) {
  const response = await fetch(url, options)

  if (!response.ok) {
    await parseError(response)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}
