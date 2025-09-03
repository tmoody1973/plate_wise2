import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { RecipesResponse } from '@/lib/recipes/schema'
import { recipesJsonSchema } from '@/lib/recipes/schema'
import { upsertRecipes } from '@/lib/recipes/db'

function stripCodeFences(s: string) {
  let t = (s || '').trim()
  t = t.replace(/^```json\s*/i, '')
  t = t.replace(/^```\s*/i, '')
  t = t.replace(/\s*```\s*$/i, '')
  return t
}

function tryExtractJsonObject(s: string): any | null {
  const text = s
  const len = text.length
  let start = -1
  for (let i = 0; i < len; i++) {
    const ch = text[i]
    if (ch === '{' || ch === '[') { start = i; break }
  }
  if (start === -1) return null
  let depth = 0
  let inStr = false
  let esc = false
  const open = text[start]
  const close = open === '{' ? '}' : ']'
  for (let i = start; i < len; i++) {
    const ch = text[i]
    if (inStr) {
      if (esc) { esc = false; continue }
      if (ch === '\\') { esc = true; continue }
      if (ch === '"') inStr = false
      continue
    } else {
      if (ch === '"') { inStr = true; continue }
      if (ch === open) depth++
      else if (ch === close) {
        depth--
        if (depth === 0) {
          const candidate = text.slice(start, i + 1)
          try { return JSON.parse(candidate) } catch { /* continue */ }
        }
      }
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const raw: string = body?.raw || ''
    if (!raw || typeof raw !== 'string') {
      return NextResponse.json({ error: 'raw text required' }, { status: 400 })
    }

    // First, try to parse/repair locally
    const text = stripCodeFences(raw)
    let json: any = null
    try { json = JSON.parse(text) } catch { json = tryExtractJsonObject(text) }

    // If still not valid, ask OpenAI to repair into our schema
    if (json == null) {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 })
      const client = new OpenAI({ apiKey })
      const instructions = 'Repair and return a single, strictly valid JSON object that conforms to the provided schema. Do not include any extra text.'
      const resp = await client.responses.create({
        model: process.env.OPENAI_RESPONSES_MODEL || 'gpt-5-nano',
        text: {
          format: {
            type: 'json_schema',
            name: (recipesJsonSchema as any).name,
            schema: (recipesJsonSchema as any).schema,
            strict: (recipesJsonSchema as any).strict,
          } as any,
          verbosity: 'low' as any,
        } as any,
        instructions,
        input: text,
        reasoning: { effort: 'low' } as any,
        parallel_tool_calls: false,
        max_output_tokens: 2200,
      } as any)
      const out = (resp as any).output_text
      if (!out) return NextResponse.json({ error: 'repair_failed' }, { status: 500 })
      try { json = JSON.parse(out) } catch { json = tryExtractJsonObject(out) }
      if (json == null) return NextResponse.json({ error: 'repair_unparseable' }, { status: 500 })
    }

    // Normalize/repair common mismatches before strict validation
    function isValidUrl(u: string): boolean { try { new URL(u); return true } catch { return false } }
    function coerce(obj: any): any {
      if (!obj || typeof obj !== 'object') return obj
      const out: any = { ...obj }
      const recs: any[] = Array.isArray(out.recipes) ? out.recipes : (Array.isArray(out.items) ? out.items : [])
      if (Array.isArray(recs)) {
        out.recipes = recs.map((r: any) => {
          if (!r || typeof r !== 'object') return r
          const rec: any = { ...r }
          // source
          if (typeof rec.source !== 'string' || !isValidUrl(rec.source)) {
            if (typeof rec.url === 'string' && isValidUrl(rec.url)) rec.source = rec.url
            else {
              const slug = typeof rec.title === 'string' ? rec.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : 'ai-generated'
              rec.source = `https://platewise.app/ai/${slug}`
            }
          }
          // ingredients
          if (Array.isArray(rec.ingredients)) {
            rec.ingredients = rec.ingredients.map((it: any) => {
              if (!it) return null
              if (typeof it === 'string') return { item: it }
              if (typeof it === 'object') {
                if (typeof it.item === 'string') return it
                if (typeof it.name === 'string') return { item: it.name, quantity: it.amount ?? it.quantity, unit: it.unit }
              }
              return null
            }).filter(Boolean)
          } else if (Array.isArray(rec.recipeIngredient)) {
            rec.ingredients = rec.recipeIngredient.map((s: any) => ({ item: String(s) }))
          }
          // instructions
          if (Array.isArray(rec.instructions)) {
            if (rec.instructions.length && typeof rec.instructions[0] === 'string') {
              rec.instructions = rec.instructions.map((t: string, i: number) => ({ step: i + 1, text: t }))
            }
          } else if (Array.isArray(rec.recipeInstructions)) {
            const arr = rec.recipeInstructions
            rec.instructions = arr.map((it: any, i: number) => {
              if (typeof it === 'string') return { step: i + 1, text: it }
              const text = it?.text || it?.name || it?.description || ''
              return { step: i + 1, text: String(text) }
            }).filter((s: any) => s.text && String(s.text).trim())
          }
          if (!Array.isArray(rec.instructions) || rec.instructions.length === 0) {
            // last resort: add a minimal single step so schema passes
            rec.instructions = [{ step: 1, text: 'See source for instructions.' }]
          }
          return rec
        })
      }
      // meta shape
      if (!out.meta || typeof out.meta !== 'object') out.meta = {} as any
      if (typeof (out.meta as any).has_more !== 'boolean') (out.meta as any).has_more = false
      const srcs = (out.meta as any).sources
      if (Array.isArray(srcs)) {
        (out.meta as any).sources = srcs.map((s: any) => {
          if (typeof s === 'string') return { url: s }
          if (s && typeof s === 'object') {
            if (typeof s.url === 'string') return { url: s.url, title: s.title }
          }
          return null
        }).filter(Boolean)
      } else {
        // derive from recipes
        const derived = (out.recipes || []).map((r: any) => (r?.source ? { url: r.source } : null)).filter(Boolean)
        ;(out.meta as any).sources = derived
      }
      if (!(out.meta as any).used_filters || typeof (out.meta as any).used_filters !== 'object') {
        (out.meta as any).used_filters = {}
      }
      return out
    }
    const normalized = coerce(json)

    // Validate against Zod
    const parsed = RecipesResponse.safeParse(normalized)
    if (!parsed.success) {
      const issues = parsed.error.issues.slice(0, 5).map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
      return NextResponse.json({ error: `schema_mismatch: ${issues}` }, { status: 422 })
    }
    const data = parsed.data

    // Upsert and return
    const { rows } = await upsertRecipes(data.recipes as any)
    return NextResponse.json({ ok: true, rows, results: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'failed' }, { status: 500 })
  }
}
