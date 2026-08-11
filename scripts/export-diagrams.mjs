#!/usr/bin/env node
// Exporta todos los diagramas Mermaid de /docs a SVG y PNG en
// /docs/assets/diagrams/, para incrustar en PowerPoint / Keynote.
//
// Uso:
//   1) Instalar la dependencia (una sola vez):
//        npm install --save-dev @mermaid-js/mermaid-cli
//   2) Ejecutar:
//        npm run docs:export
//
// El script:
//   - Recorre recursivamente /docs/**/*.md
//   - Extrae cada bloque `mermaid ...`
//   - Genera <stem>.svg y <stem>.png dentro de /docs/assets/diagrams/
//   - Nombra los archivos como <ruta-relative-a-docs>__<indice>.<ext>
//
// Si Mermaid CLI no esta instalado, imprime instrucciones y termina con
// exit code 0 (no falla el workflow).
import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises'
import { join, relative, dirname, basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '..')
const DOCS_DIR = join(ROOT, 'docs')
const ASSETS_DIR = join(DOCS_DIR, 'assets', 'diagrams')

const MERMAID_FENCE = /```mermaid\n([\s\S]*?)```/g

async function pathExists(p) {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

async function walk(dir) {
  const out = []
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'assets') continue
      out.push(...(await walk(full)))
    } else if (entry.isFile() && extname(entry.name) === '.md') {
      out.push(full)
    }
  }
  return out
}

async function extractDiagrams(mdPath) {
  const content = await readFile(mdPath, 'utf-8')
  const diagrams = []
  let match
  let index = 0
  while ((match = MERMAID_FENCE.exec(content)) !== null) {
    index += 1
    diagrams.push({ index, source: match[1].trim() })
  }
  return diagrams
}

async function ensureMmdc() {
  try {
    await execFileAsync('npx', ['--no-install', 'mmdc', '--version'])
    return 'npx mmdc'
  } catch {
    return null
  }
}

async function renderOne(mmdcCommand, mmdPath, svgPath, pngPath) {
  // SVG (vector, ideal para slides)
  await execFileAsync(mmdcCommand.split(' ')[0], [
    ...mmdcCommand.split(' ').slice(1),
    '-i', mmdPath,
    '-o', svgPath,
    '-b', 'transparent',
    '--quiet',
  ])
  // PNG (raster fallback)
  await execFileAsync(mmdcCommand.split(' ')[0], [
    ...mmdcCommand.split(' ').slice(1),
    '-i', mmdPath,
    '-o', pngPath,
    '-b', 'white',
    '--quiet',
    '-w', '1600',
  ])
}

async function main() {
  await mkdir(ASSETS_DIR, { recursive: true })
  const mmdcCommand = await ensureMmdc()
  if (!mmdcCommand) {
    console.log('Mermaid CLI no está instalado.')
    console.log('Para exportar diagramas a SVG/PNG:')
    console.log('  npm install --save-dev @mermaid-js/mermaid-cli')
    console.log('  npm run docs:export')
    return
  }

  const mdFiles = await walk(DOCS_DIR)
  let totalDiagrams = 0
  for (const mdPath of mdFiles) {
    const diagrams = await extractDiagrams(mdPath)
    if (diagrams.length === 0) continue

    const rel = relative(DOCS_DIR, mdPath)
    const stem = rel.replace(/\.md$/, '').replaceAll('/', '__')

    for (const d of diagrams) {
      const id = `${stem}__${String(d.index).padStart(2, '0')}`
      const mmdPath = join(ASSETS_DIR, `${id}.mmd`)
      const svgPath = join(ASSETS_DIR, `${id}.svg`)
      const pngPath = join(ASSETS_DIR, `${id}.png`)

      await writeFile(mmdPath, d.source, 'utf-8')
      await renderOne(mmdcCommand, mmdPath, svgPath, pngPath)
      totalDiagrams += 1
      console.log(`  ${rel} [${d.index}] -> ${id}.svg, ${id}.png`)
    }
  }

  console.log(`\nExportados ${totalDiagrams} diagramas a ${ASSETS_DIR}`)
}

main().catch((err) => {
  console.error('docs:export failed:', err)
  process.exit(1)
})