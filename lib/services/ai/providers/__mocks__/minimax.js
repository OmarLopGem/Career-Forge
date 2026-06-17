export class MiniMaxProvider {
  constructor(config) {
    this.name = 'minimax'
    this.apiKey = process.env[config.apiKeyEnv]
    this.baseUrl = process.env[config.baseUrlEnv] || 'https://api.minimax.io/v1'
    this.model = process.env[config.modelEnv] || config.defaultModel || 'MiniMax-M2.5'
    this.config = config
  }

  async chat(messages) {
    if (this.apiKey === 'invalid-key') {
      const err = new Error('MiniMax API error: 401')
      err.status = 401
      err.details = { type: 'error', error: { message: 'Unauthorized' } }
      throw err
    }

    const content = `Mock AI response to: ${messages[messages.length - 1]?.content ?? ''}`

    return {
      content,
      tokenUsage: {
        inputTokens: 42,
        outputTokens: 15,
        totalTokens: 57,
      },
      raw: {},
    }
  }

  async withRetry(fn) {
    return fn()
  }
}
