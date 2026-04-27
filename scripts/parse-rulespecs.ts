#!/usr/bin/env bun
/**
 * Parse RuleSpec files from rules-us and generate JSON for the viewer
 */

import { readdir, readFile, writeFile } from 'fs/promises'
import { join, relative } from 'path'

interface ParsedRuleSpec {
  citation: string
  title: string
  text: string
  code: string
  path: string
}

const RULES_US = '/Users/maxghenis/TheAxiomFoundation/rules-us/statute'
const RULES_CA = '/Users/maxghenis/TheAxiomFoundation/rules-ca/statute'

async function findRuleSpecFiles(dir: string): Promise<string[]> {
  const files: string[] = []

  async function walk(currentDir: string) {
    try {
      const entries = await readdir(currentDir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name)
        if (entry.isDirectory()) {
          await walk(fullPath)
        } else if (entry.name.endsWith('.yaml')) {
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

function parseRuleSpec(content: string, filePath: string): ParsedRuleSpec | null {
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
    const section = parts.slice(1).join('/').replace(/\.yaml$/, '')
    citation = `${title} USC ${section}`
  }

  return {
    citation: citation.trim(),
    title: titleMatch?.[1]?.trim() || citation,
    text: textMatch?.[1]?.trim() || '',
    code: code.trim(),
    path: relative('/Users/maxghenis/TheAxiomFoundation', filePath),
  }
}

async function main() {
  console.log('Scanning for RuleSpec files...')

  const usFiles = await findRuleSpecFiles(RULES_US)
  const caFiles = await findRuleSpecFiles(RULES_CA)

  console.log(`Found ${usFiles.length} US RuleSpec files`)
  console.log(`Found ${caFiles.length} CA RuleSpec files`)

  const documents: ParsedRuleSpec[] = []

  for (const file of [...usFiles, ...caFiles]) {
    try {
      const content = await readFile(file, 'utf-8')
      const parsed = parseRuleSpec(content, file)
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
    join(import.meta.dir, '../src/data/rulespecs.json'),
    JSON.stringify(output, null, 2)
  )

  console.log('Written to src/data/rulespecs.json')

  // Print sample
  console.log('\nSample documents:')
  for (const doc of documents.slice(0, 5)) {
    console.log(`  - ${doc.citation}: ${doc.title.slice(0, 50)}...`)
  }
}

main()
