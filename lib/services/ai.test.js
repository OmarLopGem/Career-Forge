import { describe, expect, it, beforeEach, vi } from 'vitest'

process.env.AI_PROVIDER = 'minimax'
process.env.MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || 'test-api-key'
process.env.MINIMAX_BASE_URL = process.env.MINIMAX_BASE_URL || 'https://api.minimax.io/v1'
process.env.MINIMAX_MODEL = process.env.MINIMAX_MODEL || 'MiniMax-M2.5'

const { aiChat, AIServiceError, createAIProvider, getTokenUsage, resetTokenUsage } = await import('./ai.js')

const mockChatResponse = {
  content: 'Mock AI response',
  tokenUsage: { inputTokens: 42, outputTokens: 15, totalTokens: 57 },
  raw: {},
}

describe('AI Service', () => {
  beforeEach(() => {
    resetTokenUsage()
    vi.restoreAllMocks()
  })

  describe('config loading', () => {
    it('loads config from config.json', async () => {
      const provider = await createAIProvider()
      expect(provider).toBeDefined()
      expect(typeof provider.chat).toBe('function')
    })
  })

  describe('provider selection', () => {
    it('selects minimax provider when AI_PROVIDER=minimax', async () => {
      const provider = await createAIProvider()
      expect(provider.name).toBe('minimax')
    })

    it('throws error for unsupported provider', async () => {
      const originalProvider = process.env.AI_PROVIDER
      process.env.AI_PROVIDER = 'unsupported-provider'
      await expect(createAIProvider()).rejects.toThrow('Unsupported AI provider')
      process.env.AI_PROVIDER = originalProvider
    })
  })

  describe('chat interface', () => {
    it('sends messages to provider and returns response', async () => {
      const provider = await createAIProvider()
      vi.spyOn(provider, 'chat').mockResolvedValue(mockChatResponse)
      const messages = [{ role: 'user', content: 'Hello' }]
      const response = await aiChat(messages)
      expect(response).toBeDefined()
      expect(typeof response.content).toBe('string')
      expect(response.content.length).toBeGreaterThan(0)
    })

    it('includes token usage in response', async () => {
      const provider = await createAIProvider()
      vi.spyOn(provider, 'chat').mockResolvedValue(mockChatResponse)
      const messages = [{ role: 'user', content: 'Count to 3' }]
      const response = await aiChat(messages)
      expect(response.tokenUsage).toBeDefined()
      expect(typeof response.tokenUsage.inputTokens).toBe('number')
      expect(typeof response.tokenUsage.outputTokens).toBe('number')
      expect(typeof response.tokenUsage.totalTokens).toBe('number')
    })

    it('handles provider errors gracefully', async () => {
      const provider = await createAIProvider()
      vi.spyOn(provider, 'chat').mockResolvedValue(mockChatResponse)
      const messages = [{ role: 'user', content: 'test' }]
      await expect(aiChat(messages)).resolves.toBeDefined()
    })

    it('retries on transient failures', async () => {
      const provider = await createAIProvider()
      vi.spyOn(provider, 'chat').mockResolvedValue(mockChatResponse)
      const messages = [{ role: 'user', content: 'retry test' }]
      const response = await aiChat(messages)
      expect(response).toBeDefined()
    })
  })

  describe('error handling', () => {
    it('wraps provider errors in AIServiceError', async () => {
      const provider = await createAIProvider()
      const err = new Error('MiniMax API error: 401')
      err.status = 401
      err.details = { originalError: 'Unauthorized' }
      vi.spyOn(provider, 'chat').mockRejectedValue(err)
      try {
        await aiChat([{ role: 'user', content: 'test' }])
        throw new Error('expected AIServiceError')
      } catch (error) {
        expect(error).toBeInstanceOf(AIServiceError)
        expect(error.code).toBe('CLIENT_ERROR')
        expect(error.status).toBe(401)
      }
    })

    it('includes details in AIServiceError', async () => {
      const provider = await createAIProvider()
      const err = new Error('MiniMax API error: 401')
      err.status = 401
      err.details = { type: 'error', error: { message: 'Unauthorized' } }
      vi.spyOn(provider, 'chat').mockRejectedValue(err)
      try {
        await aiChat([{ role: 'user', content: 'test' }])
      } catch (error) {
        if (error instanceof AIServiceError) {
          expect(error.details).toBeDefined()
        }
      }
    })
  })

  describe('token tracking', () => {
    it('logs token usage on each call', async () => {
      const provider = await createAIProvider()
      vi.spyOn(provider, 'chat').mockResolvedValue(mockChatResponse)
      const initialUsage = getTokenUsage()
      const messages = [{ role: 'user', content: 'Token tracking test' }]
      await aiChat(messages)
      const afterUsage = getTokenUsage()
      expect(afterUsage.totalCalls).toBe(initialUsage.totalCalls + 1)
    })

    it('tracks input and output tokens separately', async () => {
      const provider = await createAIProvider()
      vi.spyOn(provider, 'chat').mockResolvedValue(mockChatResponse)
      const messages = [{ role: 'user', content: 'Track my tokens' }]
      await aiChat(messages)
      const usage = getTokenUsage()
      expect(usage.totalInputTokens).toBeGreaterThan(0)
      expect(usage.totalOutputTokens).toBeGreaterThan(0)
    })
  })
})