#!/usr/bin/env bun
/**
 * Parse RAC files from rac-us and generate JSON for the viewer
 */

import { readdir, readFile, writeFile } from 'fs/promises'
import { join, relative } from 'path'

interface ParsedRAC {
  citation: string
  title: string
  text: string
  code: string
  path: string
}

const RAC_US = '/Users/maxghenis/RulesFoundation/rac-us/statute'
const RAC_CA = '/Users/maxghenis/RulesFoundation/rac-ca/statute'

async function findRacFiles(dir: string): Promise<string[]> {
  const files: string[] = []

  async function walk(currentDir: string) {
    try {
      const entries = await readdir(currentDir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name)
        if (entry.isDirectory()) {
          await walk(fullPath)
        } else if (entry.name.endsWith('.rac')) {
          files.push(fullPath)
        }
      }
    } catch (e) {
      // Skip directories we can't read
    }
  }

  await walk(dir)
  return files
}

function parseRAC(content: string, filePath: string): ParsedRAC | null {
  // Extract citation from first comment line
  const citationMatch = content.match(/^#\s*(\d+\s+USC\s+(?:Section\s+)?\d+[a-z]*(?:\([a-z0-9]+\))*)/im)
    || content.match(/^#\s*(.+?)(?:\n|$)/m)

  // Extract title from first comment or filename
  const titleMatch = content.match(/^#[^#\n]*?-\s*(.+?)(?:\n|$)/m)

  // Extract text block
  const textMatch = content.match(/text:\s*"""([\s\S]*?)"""/m)
    || content.match(/text:\s*\|([\s\S]*?)(?=\n\w+:|$)/m)

  // The code is everything after the text block (variables, formulas)
  const codeStart = content.indexOf('variable ')
  const code = codeStart > 0 ? content.slice(codeStart) : content

  // Build citation from path if not found
  const pathParts = filePath.split('/')
  const statuteIdx = pathParts.indexOf('statute')
  let citation = citationMatch?.[1] || ''

  if (!citation && statuteIdx > 0) {
    const parts = pathParts.slice(statuteIdx + 1)
    const title = parts[0]
    const section = parts.slice(1).join('/').replace(/\.rac$/, '')
    citation = `${title} USC ${section}`
  }

  return {
    citation: citation.trim(),
    title: titleMatch?.[1]?.trim() || citation,
    text: textMatch?.[1]?.trim() || '',
    code: code.trim(),
    path: relative('/Users/maxghenis/RulesFoundation', filePath),
  }
}

async function main() {
  console.log('Scanning for RAC files...')

  const usFiles = await findRacFiles(RAC_US)
  const caFiles = await findRacFiles(RAC_CA)

  console.log(`Found ${usFiles.length} US RAC files`)
  console.log(`Found ${caFiles.length} CA RAC files`)

  const documents: ParsedRAC[] = []

  for (const file of [...usFiles, ...caFiles]) {
    try {
      const content = await readFile(file, 'utf-8')
      const parsed = parseRAC(content, file)
      if (parsed && parsed.code) {
        documents.push(parsed)
      }
    } catch (e) {
      console.error(`Error parsing ${file}:`, e)
    }
  }

  console.log(`Parsed ${documents.length} documents`)

  // Write to JSON
  const output = {
    generated: new Date().toISOString(),
    count: documents.length,
    documents: documents.sort((a, b) => a.citation.localeCompare(b.citation)),
  }

  await writeFile(
    join(import.meta.dir, '../src/data/racs.json'),
    JSON.stringify(output, null, 2)
  )

  console.log('Written to src/data/racs.json')

  // Print sample
  console.log('\nSample documents:')
  for (const doc of documents.slice(0, 5)) {
    console.log(`  - ${doc.citation}: ${doc.title.slice(0, 50)}...`)
  }
}

main()
