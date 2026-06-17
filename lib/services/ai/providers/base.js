export class BaseAIProvider {
  constructor(config) {
    this.config = config
    this.name = null
  }

  async chat(messages) {
    throw new Error('chat() must be implemented by subclass')
  }

  getConfig(key, defaultValue = null) {
    return process.env[key] || this.config[key] || defaultValue
  }

  async withRetry(fn) {
    const attempts = this.config.retryAttempts || 3
    const delay = this.config.retryDelay || 1000

    for (let i = 0; i < attempts; i++) {
      try {
        return await fn()
      } catch (error) {
        if (i === attempts - 1) throw error
        if (this.isRetryableError(error)) {
          await this.sleep(delay * (i + 1))
          continue
        }
        throw error
      }
    }
  }

  isRetryableError(error) {
    return error.status === 429 || error.status >= 500
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}