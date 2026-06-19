import fs from 'node:fs'
import path from 'node:path'

function parseEnvLine(line) {
  const trimmed = line.trim()

  if (!trimmed || trimmed.startsWith('#')) {
    return null
  }

  const separatorIndex = trimmed.indexOf('=')

  if (separatorIndex === -1) {
    return null
  }

  const key = trimmed.slice(0, separatorIndex).trim()
  let value = trimmed.slice(separatorIndex + 1).trim()

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1)
  }

  return { key, value }
}

function loadProjectEnv() {
  const rootDir = process.cwd()
  const candidates = ['.env.download', '.env.local', '.env']

  for (const fileName of candidates) {
    const filePath = path.join(rootDir, fileName)

    if (!fs.existsSync(filePath)) continue

    const contents = fs.readFileSync(filePath, 'utf8')
    const lines = contents.split(/\r?\n/)

    for (const line of lines) {
      const parsed = parseEnvLine(line)
      if (!parsed) continue

      if (process.env[parsed.key] === undefined) {
        process.env[parsed.key] = parsed.value
      }
    }
  }
}

loadProjectEnv()

/** @type {import('next').NextConfig} */
const nextConfig = {}

export default nextConfig;
