import fs from 'node:fs'
import path from 'node:path'

let envLoaded = false

// Keep env loading centralized so scripts, tests, and Next runtime all resolve
// the same Mongo configuration, with `.env.download` taking priority.
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

export function loadProjectEnv() {
  if (envLoaded) return
  envLoaded = true

  const cwd = process.cwd()
  const candidates = [
    // The project team stores shared Mongo credentials here during development.
    path.join(cwd, '.env.download'),
    path.join(cwd, '.env.local'),
    path.join(cwd, '.env'),
  ]

  for (const filePath of candidates) {
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
