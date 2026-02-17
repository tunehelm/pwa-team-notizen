#!/usr/bin/env node
/**
 * Safe read-only Drift Check: compares registry calculator types vs docs.
 * Writes only docs/DRIFT_REPORT.md. Does not modify any other docs.
 */

import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_ROOT = join(__dirname, '..')
const REPO_ROOT = join(APP_ROOT, '..')
const DOCS_DIR = join(REPO_ROOT, 'docs')
const REGISTRY_PATH = join(APP_ROOT, 'src', 'components', 'calculators', 'registry.ts')
const CALCULATORS_MD = join(DOCS_DIR, 'CALCULATORS.md')
const REPORT_PATH = join(DOCS_DIR, 'DRIFT_REPORT.md')

function extractRegistryTypes(content) {
  const types = new Set()
  const arrayMatch = content.match(/CALCULATOR_TYPES:\s*CalculatorType\[\]\s*=\s*\[([\s\S]*?)\n\]/m)
  if (arrayMatch) {
    const block = arrayMatch[1]
    const matches = block.matchAll(/\s*['"]([a-z0-9-]+)['"]\s*,?/g)
    for (const m of matches) types.add(m[1])
  }
  return [...types].sort()
}

function extractDocTypes(content) {
  const types = new Set()
  const matches = content.matchAll(/\|\s*`([a-z0-9-]+)`\s*\|/g)
  for (const m of matches) types.add(m[1])
  return [...types].sort()
}

function main() {
  const registryContent = readFileSync(REGISTRY_PATH, 'utf-8')
  const registryTypes = extractRegistryTypes(registryContent)

  let docTypes = []
  try {
    const docContent = readFileSync(CALCULATORS_MD, 'utf-8')
    docTypes = extractDocTypes(docContent)
  } catch (e) {
    const report = `# Drift Report (read-only check)

**Generated:** ${new Date().toISOString()}

## Error

Could not read \`docs/CALCULATORS.md\`: ${e.message}

No drift comparison performed.
`
    writeFileSync(REPORT_PATH, report, 'utf-8')
    console.log('Wrote docs/DRIFT_REPORT.md (error)')
    process.exit(1)
  }

  const inRegistry = new Set(registryTypes)
  const inDocs = new Set(docTypes)
  const missingInDocs = registryTypes.filter((t) => !inDocs.has(t))
  const obsoleteInDocs = docTypes.filter((t) => !inRegistry.has(t))

  const hasDrift = missingInDocs.length > 0 || obsoleteInDocs.length > 0
  const lines = [
    '# Drift Report (read-only check)',
    '',
    `**Generated:** ${new Date().toISOString()}`,
    '',
    '## Registry vs docs/CALCULATORS.md',
    '',
    `- **Registry types:** ${registryTypes.length} (${registryTypes.join(', ')})`,
    `- **Doc table types:** ${docTypes.length} (${docTypes.join(', ')})`,
    '',
  ]

  if (missingInDocs.length > 0) {
    lines.push('### In registry but not in doc table', '')
    missingInDocs.forEach((t) => lines.push(`- \`${t}\``))
    lines.push('')
  }
  if (obsoleteInDocs.length > 0) {
    lines.push('### In doc table but not in registry (obsolete?)', '')
    obsoleteInDocs.forEach((t) => lines.push(`- \`${t}\``))
    lines.push('')
  }
  if (!hasDrift) {
    lines.push('**No drift detected.** Registry and doc table are in sync.', '')
  }

  writeFileSync(REPORT_PATH, lines.join('\n'), 'utf-8')
  console.log(hasDrift ? 'Drift detected. See docs/DRIFT_REPORT.md' : 'No drift. Wrote docs/DRIFT_REPORT.md')
  process.exit(hasDrift ? 1 : 0)
}

main()
