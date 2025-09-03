#!/usr/bin/env node
// CLI to search for recipes on the public web via OpenAI Responses API and upsert into Supabase.
// Usage (with tsx or ts-node):
//   node --env-file=.env ./.output or: npx tsx src/scripts/recipes-search.ts --query "jollof rice" --country Nigeria --include "long-grain rice,tomato" --exclude goat --max 8

import { findAndStoreRecipes } from '../lib/recipes/import'

type Argv = Record<string, string | boolean | undefined>

function parseArgs(argv: string[]): Argv {
  const out: Argv = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a || !a.startsWith('--')) continue
    const key = a.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      out[key] = true
    } else {
      out[key] = next
      i++
    }
  }
  return out
}

function csv(v?: string | boolean): string[] | undefined {
  if (!v || typeof v !== 'string') return undefined
  return v
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const filters = {
    query: (args.query as string) || undefined,
    country: (args.country as string) || undefined,
    includeIngredients: csv(args.include),
    excludeIngredients: csv(args.exclude),
    maxResults: args.max ? Number(args.max) : undefined,
    excludeSources: csv(args['exclude-sources']),
  }

  const start = Date.now()
  const { found, rows } = await findAndStoreRecipes(filters)

  // Compact table output
  console.log(`Found: ${found} recipes. Inserted/Upserted rows: ${rows.length}`)
  rows.slice(0, 20).forEach((r: any, idx: number) => {
    const title = r.title?.slice(0, 60) || 'Untitled'
    console.log(`${String(idx + 1).padStart(2, ' ')} · ${title} · ${r.source_url || r.source || ''}`)
  })
  const ids = rows.map((r: any) => r.id).filter(Boolean)
  if (ids.length) console.log('Row IDs:', ids.join(','))
  console.log(`Done in ${Math.round((Date.now() - start) / 1000)}s`)
}

main().catch(err => {
  console.error('Error:', err?.message || err)
  process.exit(1)
})
