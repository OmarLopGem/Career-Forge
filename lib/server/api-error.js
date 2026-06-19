export class AppServiceError extends Error {
  constructor(message, code, status = 400, details) {
    super(message)
    this.code = code
    this.status = status
    this.details = details
  }
}

export function toApiErrorResponse(err) {
  if (err instanceof AppServiceError) {
    return {
      body: {
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      },
      status: err.status,
    }
  }

  return {
    body: {
      error: {
        code: 'INTERNAL_ERROR',
        message: err instanceof Error ? err.message : 'Unexpected error',
      },
    },
    status: 500,
  }
}
