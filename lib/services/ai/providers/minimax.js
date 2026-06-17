import { BaseAIProvider } from './base.js'

export class MiniMaxProvider extends BaseAIProvider {
  constructor(config) {
    super(config)
    this.name = 'minimax'
    this.apiKey = process.env[config.apiKeyEnv]
    this.baseUrl = process.env[config.baseUrlEnv] || 'https://api.minimax.chat/v1'
    this.model = process.env[config.modelEnv] || config.defaultModel || 'abab6.5s'
  }

  async chat(messages) {
    return this.withRetry(async () => {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages
        })
      })

      if (!response.ok) {
        const error = new Error(`MiniMax API error: ${response.status}`)
        error.status = response.status
        error.details = await response.json().catch(() => ({}))
        throw error
      }

      const data = await response.json()

      return {
        content: data.choices?.[0]?.message?.content || '',
        tokenUsage: {
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0
        },
        raw: data
      }
    })
  }
}