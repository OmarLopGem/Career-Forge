import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { MiniMaxProvider } from './ai/providers/minimax.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let tokenUsage = {
  totalCalls: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalErrors: 0
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

function getProvider() {
  if (!providerInstance) {
    throw new Error('AI provider not initialized. Call createAIProvider() first.')
  }
  return providerInstance
}

export async function aiChat(messages, options = {}) {
  const provider = getProvider()

  try {
    const response = await provider.chat(messages)

    tokenUsage.totalCalls++
    tokenUsage.totalInputTokens += response.tokenUsage.inputTokens
    tokenUsage.totalOutputTokens += response.tokenUsage.outputTokens

    return response
  } catch (error) {
    tokenUsage.totalErrors++

    if (error instanceof AIServiceError) {
      throw error
    }

    const status = error.status || 500
    const code = status >= 500 ? 'PROVIDER_ERROR' : 'CLIENT_ERROR'

    throw new AIServiceError(
      error.message || 'AI service error',
      code,
      status,
      error.details || { originalError: error.message }
    )
  }
}

export function getTokenUsage() {
  return { ...tokenUsage }
}

export function resetTokenUsage() {
  tokenUsage = {
    totalCalls: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalErrors: 0
  }
}

let providerPromise = null

export async function initAIProvider() {
  if (!providerPromise) {
    providerPromise = createAIProvider()
  }
  return providerPromise
}

initAIProvider()