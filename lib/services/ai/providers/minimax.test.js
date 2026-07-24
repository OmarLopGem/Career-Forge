import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from 'vitest'

process.env.AI_PROVIDER = 'minimax'
process.env.MINIMAX_API_KEY = 'test-api-key'
process.env.MINIMAX_BASE_URL = 'https://api.minimax.io/v1'
process.env.MINIMAX_MODEL = 'MiniMax-M2.7'

const { MiniMaxProvider } = await import('./minimax.js')

function makeFakeClient(responses) {
  return {
    chat: { completions: { create: vi.fn() } },
    responses: { create: vi.fn() },
  }
}

describe('MiniMaxProvider.analyzeFile', () => {
  let provider
  let fakeClient

  beforeEach(() => {
    provider = new MiniMaxProvider({
      apiKeyEnv: 'MINIMAX_API_KEY',
      baseUrlEnv: 'MINIMAX_BASE_URL',
      defaultModel: 'MiniMax-M2.7',
      modelEnv: 'MINIMAX_MODEL',
      retryAttempts: 3,
      retryDelay: 10,
    })
    fakeClient = makeFakeClient()
    provider._client = fakeClient
  })

  it('sends a multimodal input_file with base64 content', async () => {
    fakeClient.responses.create.mockResolvedValue({
      output_text: '{"ok":true}',
      usage: { input_tokens: 12, output_tokens: 4, total_tokens: 16 },
    })

    const buffer = new Uint8Array(Buffer.from('PDF-BYTES'))
    const response = await provider.analyzeFile({
      buffer,
      mimeType: 'application/pdf',
      fileName: 'cv.pdf',
      system: 'Extract JSON.',
      user: 'Send JSON.',
      temperature: 0.2,
    })

    expect(fakeClient.responses.create).toHaveBeenCalledTimes(1)
    const params = fakeClient.responses.create.mock.calls[0][0]
    expect(params.model).toBe('MiniMax-M2.7')
    expect(params.instructions).toBe('Extract JSON.')
    expect(params.temperature).toBe(0.2)
    expect(params.input).toHaveLength(1)
    const content = params.input[0].content
    expect(content[0].type).toBe('input_file')
    expect(content[0].filename).toBe('cv.pdf')
    expect(content[0].file_data).toMatch(/^data:application\/pdf;base64,/)
    expect(content[1]).toEqual({ type: 'input_text', text: 'Send JSON.' })

    expect(response.content).toBe('{"ok":true}')
    expect(response.tokenUsage).toEqual({
      inputTokens: 12,
      outputTokens: 4,
      totalTokens: 16,
    })
  })

  it('retries on 429 and eventually succeeds', async () => {
    const error = new Error('rate limit')
    error.status = 429
    fakeClient.responses.create
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({ output_text: '{}', usage: {} })

    const response = await provider.analyzeFile({
      buffer: new Uint8Array([1]),
      mimeType: 'application/pdf',
      fileName: 'cv.pdf',
      system: 's',
      user: 'u',
    })
    expect(fakeClient.responses.create).toHaveBeenCalledTimes(2)
    expect(response.content).toBe('{}')
  })

  it('does not retry on 4xx (except 429)', async () => {
    const error = new Error('bad request')
    error.status = 400
    fakeClient.responses.create.mockRejectedValueOnce(error)

    await expect(
      provider.analyzeFile({
        buffer: new Uint8Array([1]),
        mimeType: 'application/pdf',
        fileName: 'cv.pdf',
        system: 's',
        user: 'u',
      }),
    ).rejects.toMatchObject({ message: 'bad request' })
    expect(fakeClient.responses.create).toHaveBeenCalledTimes(1)
  })

  it('falls back to default 0.2 when temperature is undefined', async () => {
    fakeClient.responses.create.mockResolvedValue({ output_text: 'x', usage: {} })
    await provider.analyzeFile({
      buffer: new Uint8Array([1]),
      mimeType: 'application/pdf',
      fileName: 'cv.pdf',
      system: 's',
      user: 'u',
    })
    const params = fakeClient.responses.create.mock.calls[0][0]
    expect(params.temperature).toBe(0.2)
  })
})
