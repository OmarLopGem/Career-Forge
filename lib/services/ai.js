import { readFileSync } from 'fs'
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { MiniMaxProvider } from './ai/providers/minimax.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let tokenUsage = {
  totalCalls: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalErrors: 0,
}

let providerInstance = null

export class AIServiceError extends Error {
  constructor(message, code, status, details) {
    super(message)
    this.name = 'AIServiceError'
    this.code = code
    this.status = status
    this.details = details
  }
}

function loadConfig() {
  const configPath = join(__dirname, 'ai', 'config.json')
  if (!existsSync(configPath)) {
    throw new Error(`AI config not found at ${configPath}`)
  }
  return JSON.parse(readFileSync(configPath, 'utf-8'))
}

export async function createAIProvider() {
  const config = loadConfig()
  const providerName = process.env.AI_PROVIDER || 'minimax'

  if (providerName === 'minimax') {
    const providerConfig = config.providers.minimax
    providerInstance = new MiniMaxProvider(providerConfig)
    return providerInstance
  }

  throw new Error(`Unsupported AI provider: ${providerName}`)
}

export function getProvider() {
  if (!providerInstance) {
    providerInstance = null
    return createAIProvider()
  }
  return providerInstance
}

export function resetProvider() {
  providerInstance = null
}

export async function aiChat(messages, options = {}) {
  let response
  try {
    const provider = await getProvider()
    response = await provider.chat(messages, options)
  } catch (error) {
    tokenUsage.totalErrors++

    if (error instanceof AIServiceError) {
      throw error
    }

    if (error.code === 'MISSING_API_KEY') {
      throw new AIServiceError(
        error.message,
        'MISSING_API_KEY',
        500,
      )
    }

    const status = error.status || error?.response?.status || 500
    const code = status >= 500 ? 'PROVIDER_ERROR' : 'CLIENT_ERROR'

    throw new AIServiceError(
      error.message || 'AI service error',
      code,
      status,
      error.details || error?.error || { originalError: error.message },
    )
  }

  tokenUsage.totalCalls++
  tokenUsage.totalInputTokens += response.tokenUsage.inputTokens
  tokenUsage.totalOutputTokens += response.tokenUsage.outputTokens

  return response
}

export async function aiChatJSON({ system, user, temperature = 0.3 }) {
  const messages = []
  if (system) messages.push({ role: 'system', content: system })
  messages.push({ role: 'user', content: user })

  const response = await aiChat(messages, {
    responseFormat: { type: 'json_object' },
    temperature,
  })

  const text = stripThinking(response.content ?? '').trim()
  try {
    return { data: JSON.parse(text), tokenUsage: response.tokenUsage }
  } catch (err) {
    throw new AIServiceError(
      'AI provider returned a non-JSON response.',
      'INVALID_JSON',
      502,
      { raw: response.content },
    )
  }
}

export async function aiAnalyzeFile({ buffer, mimeType, fileName, system, user, temperature = 0.2 }) {
  let response
  try {
    const provider = await getProvider()
    response = await provider.analyzeFile({ buffer, mimeType, fileName, system, user, temperature })
  } catch (error) {
    tokenUsage.totalErrors++

    if (error instanceof AIServiceError) {
      throw error
    }

    if (error.code === 'MISSING_API_KEY') {
      throw new AIServiceError(error.message, 'MISSING_API_KEY', 500)
    }

    const status = error.status || error?.response?.status || 500
    const code = status >= 500 ? 'PROVIDER_ERROR' : 'CLIENT_ERROR'

    throw new AIServiceError(
      error.message || 'AI service error',
      code,
      status,
      error.details || error?.error || { originalError: error.message },
    )
  }

  tokenUsage.totalCalls++
  tokenUsage.totalInputTokens += response.tokenUsage.inputTokens
  tokenUsage.totalOutputTokens += response.tokenUsage.outputTokens

  return {
    data: response.content,
    tokenUsage: response.tokenUsage,
    finishReason: response.finishReason,
  }
}

export function hasProviderConfigured() {
  const key = process.env.MINIMAX_API_KEY
  return Boolean(key && key.toLowerCase() !== 'sample')
}

function stripThinking(content) {
  let out = content
  const thinkEnd = out.indexOf('<think>')
  if (thinkEnd !== -1) {
    out = out.slice(thinkEnd + '<think>'.length)
  }
  const fenceMatch = out.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    out = fenceMatch[1]
  }
  const firstBrace = out.indexOf('{')
  const firstBracket = out.indexOf('[')
  let start = -1
  if (firstBrace !== -1 && firstBracket !== -1) {
    start = Math.min(firstBrace, firstBracket)
  } else if (firstBrace !== -1) {
    start = firstBrace
  } else if (firstBracket !== -1) {
    start = firstBracket
  }
  if (start > 0) out = out.slice(start)
  return out
}

export function getTokenUsage() {
  return { ...tokenUsage }
}

export function resetTokenUsage() {
  tokenUsage = {
    totalCalls: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalErrors: 0,
  }
}
