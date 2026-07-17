import OpenAI from 'openai'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const idx = l.indexOf('=')
      const key = l.slice(0, idx).trim()
      const value = l.slice(idx + 1).trim().replace(/^"(.*)"$/, '$1')
      return [key, value]
    }),
)

const client = new OpenAI({
  apiKey: env.MINIMAX_API_KEY,
  baseURL: env.MINIMAX_BASE_URL,
})

console.log('Testing MiniMax with model:', env.MINIMAX_MODEL)
console.log('Base URL:', env.MINIMAX_BASE_URL)
console.log('---')

try {
  const response = await client.chat.completions.create({
    model: env.MINIMAX_MODEL,
    messages: [
      { role: 'user', content: '¿Cuál es la secuencia de Fibonacci? Dame los primeros 10 números.' },
    ],
  })
  console.log('Response:', response.choices[0].message.content)
  console.log('---')
  console.log('Usage:', response.usage)
} catch (err) {
  console.error('Error:', err.status, err.message)
  console.error('Details:', err.error || err)
}
