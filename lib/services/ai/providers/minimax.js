import OpenAI from 'openai'
import { BaseAIProvider } from './base.js'

export class MiniMaxProvider extends BaseAIProvider {
  constructor(config) {
    super(config)
    this.name = 'minimax'
    this.apiKey = process.env[config.apiKeyEnv]
    this.baseUrl =
      process.env[config.baseUrlEnv] || 'https://api.minimax.io/v1'
    this.model =
      process.env[config.modelEnv] || config.defaultModel || 'MiniMax-M2.7'
    this._client = null
  }

  getClient() {
    if (!this.apiKey) {
      const err = new Error('MiniMax API key is not configured.')
      err.code = 'MISSING_API_KEY'
      throw err
    }
    if (!this._client) {
      this._client = new OpenAI({
        apiKey: this.apiKey,
        baseURL: this.baseUrl,
      })
    }
    return this._client
  }

  async chat(messages, options = {}) {
    return this.withRetry(async () => {
      const client = this.getClient()
      const params = {
        model: this.model,
        messages,
      }
      if (options.responseFormat) params.response_format = options.responseFormat
      if (typeof options.temperature === 'number') {
        params.temperature = options.temperature
      }

      const response = await client.chat.completions.create(params)
      const choice = response.choices?.[0]

      return {
        content: choice?.message?.content ?? '',
        tokenUsage: {
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
          totalTokens: response.usage?.total_tokens ?? 0,
        },
        finishReason: choice?.finish_reason,
        raw: response,
      }
    })
  }

  async analyzeFile({ buffer, mimeType, fileName, system, user, temperature = 0.2 }) {
    return this.withRetry(async () => {
      const client = this.getClient()
      const fileData = `data:${mimeType};base64,${Buffer.from(buffer).toString('base64')}`
      const params = {
        model: this.model,
        instructions: system,
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_file', filename: fileName, file_data: fileData },
              { type: 'input_text', text: user },
            ],
          },
        ],
      }
      if (typeof temperature === 'number') {
        params.temperature = temperature
      }

      const response = await client.responses.create(params)

      return {
        content: response.output_text ?? '',
        tokenUsage: {
          inputTokens: response.usage?.input_tokens ?? 0,
          outputTokens: response.usage?.output_tokens ?? 0,
          totalTokens: response.usage?.total_tokens ?? 0,
        },
        finishReason: response.output?.[0]?.finish_reason,
        raw: response,
      }
    })
  }
}
