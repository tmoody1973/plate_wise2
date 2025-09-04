// OpenAI Responses API web search for recipes with Structured Outputs
// Provides searchRecipes and searchMoreRecipes

import OpenAI from 'openai'
import { z } from 'zod'
import {
  RecipesResponse,
  type RecipesResponseT,
  type RecipeSearchFilters,
  recipesJsonSchema,
  type RecipeT,
} from './schema'
import { parseRecipeFromHtml } from '@/lib/recipes/html-recipe-parser'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_RESPONSES_TIMEOUT_MS || 45000)
const OPENAI_RESPONSES_MODEL = process.env.OPENAI_RESPONSES_MODEL || 'gpt-5-nano'
const OPENAI_RESPONSES_MODEL_FAST = process.env.OPENAI_RESPONSES_MODEL_FAST || 'gpt-5-nano'

function getClient(): OpenAI {
  if (!OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY in environment')
  }
  // Provide a default timeout to avoid hanging requests
  return new OpenAI({ apiKey: OPENAI_API_KEY, timeout: OPENAI_TIMEOUT_MS } as any)
}

function normalizeFilters(filters: RecipeSearchFilters) {
  const max = Math.min(10, Math.max(5, filters.maxResults ?? 5))
  return {
    ...filters,
    country: (filters.country && filters.country.trim()) ? filters.country : 'United States',
    maxResults: max,
    includeIngredients: filters.includeIngredients?.filter(Boolean),
    excludeIngredients: filters.excludeIngredients?.filter(Boolean),
    excludeSources: filters.excludeSources?.filter(Boolean),
  }
}

function buildInstruction(useWebSearch: boolean, detailed: boolean): string {
  const jsonOnly = 'Output strictly as a single valid JSON object that matches the provided schema. Do not include any markdown code fences, comments, or extra text before or after the JSON.'
  if (useWebSearch) {
    return [
      'Use web_search to find authentic, non-paywalled recipe pages with clear ingredients and step-by-step instructions.',
      'Apply provided filters when present (country, includeIngredients, excludeIngredients, maxResults). If any are missing, proceed with sensible defaults and do not ask for more details.',
      'Return 5–10 unique recipes, include canonical source URL and representative image when available.',
      'All URLs must be absolute and valid (begin with https://).',
      'Include difficulty for each recipe as one of: easy, medium, hard.',
      'Exclude any URL that appears in excludeSources. Use canonical URLs when possible.',
      detailed
        ? 'Write detailed instructions: 2–4 sentences per step with heat levels, timing, pan size, texture cues, and doneness signals.'
        : 'Provide concise, clear instructions.',
      'For each recipe, ensure at least 1 ingredient and 1 instruction. Provide reasonable nutrition if present.',
      'Set meta.has_more to true if additional distinct sources likely exist beyond returned results.',
      jsonOnly,
    ].join(' ')
  }
  return [
    'Generate concise, high-quality recipe cards directly without browsing the web.',
    'Apply provided filters when present: country, includeIngredients, excludeIngredients, maxResults. If not provided, choose sensible defaults and proceed without asking for more details.',
    'Return 5–10 recipes. Include a plausible image URL when available; omit otherwise.',
    'All URLs must be absolute and valid (begin with https://).',
    'Include difficulty for each recipe as one of: easy, medium, hard.',
    detailed
      ? 'Write detailed instructions: 2–4 sentences per step with heat levels, timing, pan size, texture cues, and doneness signals.'
      : 'Provide concise, clear instructions.',
    'If any field is unknown, omit it rather than guessing.',
    'Ensure each recipe has at least 1 ingredient and 1 instruction.',
    'Use a safe default canonical source if not applicable (omit; server may provide).',
    jsonOnly,
  ].join(' ')
}

function buildInput(filters: RecipeSearchFilters): string {
  const compact = {
    query: filters.query || undefined,
    country: filters.country || undefined,
    includeIngredients: filters.includeIngredients?.length ? filters.includeIngredients : undefined,
    excludeIngredients: filters.excludeIngredients?.length ? filters.excludeIngredients : undefined,
    maxResults: Math.min(10, Math.max(5, filters.maxResults ?? 5)),
    excludeSources: filters.excludeSources?.length ? filters.excludeSources : undefined,
    instructionDetail: filters.detailedInstructions ? 'detailed' : 'concise',
  }
  return JSON.stringify(compact)
}

function withTimeout<T>(p: Promise<T>, ms: number, label = 'operation'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    p.then(v => {
      clearTimeout(t)
      resolve(v)
    }).catch(e => {
      clearTimeout(t)
      reject(e)
    })
  })
}

type CallOverrides = { maxOutputTokens?: number; useWebSearch?: boolean }

async function callOpenAIStructured(
  filters: RecipeSearchFilters,
  overrides?: CallOverrides
): Promise<unknown> {
  const client = getClient()
  const useWebSearch = overrides?.useWebSearch !== false
  const detailed = !!filters.detailedInstructions
  const instructions = buildInstruction(useWebSearch, detailed)
  const input = buildInput(filters)

  const model = useWebSearch ? OPENAI_RESPONSES_MODEL : OPENAI_RESPONSES_MODEL_FAST
  const maxTokens = overrides?.maxOutputTokens ?? (useWebSearch ? (detailed ? 4200 : 3000) : (detailed ? 2600 : 1800))
  const resp = await withTimeout(client.responses.create({
    model,
    tools: useWebSearch ? [{ type: 'web_search' }] : undefined,
    // Structured Outputs for Responses API now live under text.format
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
    input,
    reasoning: { effort: 'low' } as any,
    parallel_tool_calls: false,
    max_output_tokens: maxTokens,
  } as any), OPENAI_TIMEOUT_MS, 'OpenAI search')

  const text = (resp as any).output_text
  if (!text || typeof text !== 'string') {
    throw new Error('OpenAI response missing output_text')
  }
  function stripCodeFences(s: string) {
    let t = s.trim()
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
      if (text[i] === '{' || text[i] === '[') { start = i; break }
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

  function tryExtractRecipesArray(s: string): any[] | null {
    // Locate recipes key and attempt to parse items one-by-one even if the array is not fully closed
    const keyIdx = s.indexOf('"recipes"')
    if (keyIdx === -1) return null
    const arrStart = s.indexOf('[', keyIdx)
    if (arrStart === -1) return null
    let i = arrStart + 1
    const items: any[] = []
    while (i < s.length) {
      // skip whitespace and commas
      while (i < s.length && /[\s,]/.test(s[i]!)) i++
      if (i >= s.length || s[i] === ']') break
      if (s[i] !== '{') break
      // parse a balanced object
      let depth = 0
      let inStr = false
      let esc = false
      const objStart = i
      for (; i < s.length; i++) {
        const ch = s[i]
        if (inStr) {
          if (esc) { esc = false; continue }
          if (ch === '\\') { esc = true; continue }
          if (ch === '"') inStr = false
          continue
        } else {
          if (ch === '"') { inStr = true; continue }
          if (ch === '{') depth++
          else if (ch === '}') {
            depth--
            if (depth === 0) {
              const objStr = s.slice(objStart, i + 1)
              try {
                const obj = JSON.parse(objStr)
                items.push(obj)
              } catch { /* ignore malformed object */ }
              i++
              break
            }
          }
        }
      }
      if (depth !== 0) break
    }
    return items.length ? items : null
  }

  let raw: any
  const cleaned = stripCodeFences(text)
  try {
    raw = JSON.parse(cleaned)
  } catch {
    raw = tryExtractJsonObject(cleaned)
    if (raw == null) {
      const arr = tryExtractRecipesArray(cleaned)
      if (arr) raw = { recipes: arr }
    }
  }
  if (raw == null) {
    throw new Error('Failed to parse structured output JSON')
  }
  raw = wrapToResponse(raw, filters)
  return scrubStructuredOutput(raw, useWebSearch)
}

function validateOutput(json: unknown): RecipesResponseT {
  // Pre-sanitize meta.sources to avoid schema failures on bad URLs
  try {
    if (json && typeof json === 'object' && (json as any).meta) {
      const meta = (json as any).meta
      if (!Array.isArray(meta.sources)) {
        meta.sources = []
      } else {
        meta.sources = meta.sources
          .filter((s: any) => s && typeof s === 'object' && typeof s.url === 'string')
          .map((s: any) => ({ url: String(s.url).trim(), title: s.title }))
          .filter((s: any) => isValidUrl(s.url))
      }
    }
  } catch {}
  const parsed = RecipesResponse.safeParse(json)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 5)
      .map(i => `${i.path.join('.')}: ${i.message}`)
      .join('; ')
    throw new Error(`Structured output schema mismatch: ${issues}`)
  }
  return parsed.data
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

function wrapToResponse(raw: any, filters: RecipeSearchFilters): any {
  // If model returned a bare array, wrap it into the expected shape
  if (Array.isArray(raw)) {
    const recipes = raw
    const sources = recipes
      .map((r: any) => (r && typeof r.source === 'string' ? r.source : null))
      .filter(Boolean)
      .map((u: any) => ({ url: String(u) }))
    return {
      recipes,
      meta: {
        has_more: false,
        sources,
        used_filters: {
          query: filters.query,
          country: filters.country,
          includeIngredients: filters.includeIngredients,
          excludeIngredients: filters.excludeIngredients,
          maxResults: filters.maxResults,
          excludeSources: filters.excludeSources,
        },
      },
    }
  }

  // If model returned an object, ensure meta and used_filters are present
  if (raw && typeof raw === 'object') {
    if (!raw.meta || typeof raw.meta !== 'object') {
      raw.meta = {}
    }
    // Ensure has_more
    if (typeof raw.meta.has_more !== 'boolean') {
      raw.meta.has_more = false
    }
    // Ensure sources
    if (!Array.isArray(raw.meta.sources)) {
      const derived = Array.isArray(raw.recipes)
        ? raw.recipes
            .map((r: any) => (r && typeof r.source === 'string' ? r.source : null))
            .filter(Boolean)
            .map((u: any) => ({ url: String(u) }))
        : []
      raw.meta.sources = derived
    }
    // Ensure used_filters
    if (!raw.meta.used_filters || typeof raw.meta.used_filters !== 'object') {
      raw.meta.used_filters = {
        query: filters.query,
        country: filters.country,
        includeIngredients: filters.includeIngredients,
        excludeIngredients: filters.excludeIngredients,
        maxResults: filters.maxResults,
        excludeSources: filters.excludeSources,
      }
    }
  }
  return raw
}

function scrubStructuredOutput(raw: any, webMode: boolean): any {
  if (!raw || typeof raw !== 'object') return raw
  if (Array.isArray(raw.recipes)) {
    raw.recipes = raw.recipes.map((r: any) => {
      // Skip non-object entries (strings, nulls, etc.) that the AI sometimes returns
      if (!r || typeof r !== 'object') return null
      if (r && typeof r === 'object') {
        // Coerce basic optional fields to valid types or remove
        if (r.description != null && typeof r.description !== 'string') delete r.description
        if (r.cuisine != null && typeof r.cuisine !== 'string') delete r.cuisine
        if (r.difficulty != null && !['easy','medium','hard'].includes(String(r.difficulty))) delete r.difficulty
        if (r.servings != null && typeof r.servings !== 'number') delete r.servings
        if (r.total_time_minutes != null && typeof r.total_time_minutes !== 'number') delete r.total_time_minutes

        // Accept alternate ingredients shape and normalize
        if (r.ingredients && !Array.isArray(r.ingredients) && typeof r.ingredients === 'object') {
          const entries = Object.entries(r.ingredients as Record<string, any>)
          r.ingredients = entries.map(([name, qty]) => ({
            item: String(name),
            quantity: typeof qty === 'number' ? qty : (typeof qty === 'string' ? qty : undefined),
          }))
        }
        // Normalize ingredient entries: handle {name, amount, unit, notes} -> {item, quantity, unit, notes}
        if (Array.isArray(r.ingredients)) {
          r.ingredients = r.ingredients
            .map((ing: any) => {
              if (!ing || typeof ing !== 'object') return null
              const item = (ing.item ?? ing.name ?? ing.ingredient ?? '').toString().trim()
              if (!item) return null
              let quantity: any = ing.quantity ?? ing.amount ?? ing.qty
              if (quantity === null || quantity === undefined || quantity === '') {
                quantity = undefined
              } else if (typeof quantity === 'string') {
                const q = quantity.trim()
                quantity = q.length ? q : undefined
              } else if (typeof quantity !== 'number') {
                // Unknown type, drop it
                quantity = undefined
              }
              let unit: any = ing.unit ?? ing.units
              if (unit === null || unit === undefined || unit === '') unit = undefined
              else unit = String(unit)
              let notes: any = ing.notes ?? ing.note
              if (notes === null || notes === undefined || notes === '') notes = undefined
              else notes = String(notes)
              const out: any = { item }
              if (quantity !== undefined) out.quantity = quantity
              if (unit !== undefined) out.unit = unit
              if (notes !== undefined) out.notes = notes
              return out
            })
            .filter(Boolean)
        }
        // Ensure instructions is an array of {step,text}
        if (Array.isArray(r.instructions) && r.instructions.length > 0 && typeof r.instructions[0] === 'string') {
          r.instructions = (r.instructions as string[]).map((t, i) => ({ step: i + 1, text: t }))
        }
        if (Array.isArray(r.instructions)) {
          r.instructions = r.instructions.map((st: any, i: number) => {
            const step = typeof st?.step === 'number' && isFinite(st.step) ? st.step : (i + 1)
            let text = st?.text
            if (text == null || typeof text !== 'string' || !text.trim()) text = `Step ${step}`
            return { step, text }
          })
          if (!r.instructions.length) {
            r.instructions = [{ step: 1, text: 'See source for steps' }]
          }
        } else {
          // Ensure at least one instruction to satisfy schema
          r.instructions = [{ step: 1, text: 'See source for steps' }]
        }
        // Sanitize nutrition numbers or remove invalid fields
        if (r.nutrition && typeof r.nutrition === 'object') {
          const n: any = {}
          const putNum = (k: string, v: any, int = false) => {
            if (v == null) return
            const num = typeof v === 'number' ? v : parseFloat(String(v))
            if (!isFinite(num)) return
            n[k] = int ? Math.round(num) : num
          }
          putNum('calories', r.nutrition.calories, true)
          putNum('protein_g', r.nutrition.protein_g)
          putNum('fat_g', r.nutrition.fat_g)
          putNum('carbs_g', r.nutrition.carbs_g)
          if (Object.keys(n).length) r.nutrition = n
          else delete r.nutrition
        }
        if (typeof r.image === 'string') {
          const img = r.image.trim()
          // Accept any valid absolute URL; rendering layer will proxy and validate content-type.
          if (!img || !isValidUrl(img)) {
            delete r.image
          } else {
            r.image = img
          }
        }
        if (typeof r.source === 'string') {
          r.source = r.source.trim()
          if (!isValidUrl(r.source)) {
            if (webMode) {
              return null
            } else {
              const slug = typeof r.title === 'string' ? r.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : 'ai-generated'
              r.source = `https://platewise.app/ai/${slug}`
            }
          }
        } else {
          if (webMode) {
            return null
          } else {
            const slug = typeof r.title === 'string' ? r.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : 'ai-generated'
            r.source = `https://platewise.app/ai/${slug}`
          }
        }
      }
      return r
    }).filter(Boolean)
  }
  // Sanitize meta.sources to contain only valid absolute URLs
  try {
    if (raw.meta && Array.isArray(raw.meta.sources)) {
      raw.meta.sources = raw.meta.sources
        .filter((s: any) => s && typeof s === 'object' && typeof s.url === 'string')
        .map((s: any) => ({ url: s.url.trim(), title: s.title }))
        .filter((s: any) => isValidUrl(s.url))
    }
  } catch {}
  return raw
}

// Fast path: model-only generation (no web_search) for lower latency
export async function searchRecipesFast(
  rawFilters: RecipeSearchFilters
): Promise<RecipesResponseT> {
  const filters = normalizeFilters({ ...rawFilters, maxResults: Math.min(5, rawFilters.maxResults ?? 5) })
  const json = await callOpenAIStructured(filters, { useWebSearch: false, maxOutputTokens: 1800 })
  const data = validateOutput(json)
  const enriched = await maybeEnrichMissingImages(data, filters)
  return enriched
}

export async function searchRecipes(
  rawFilters: RecipeSearchFilters
): Promise<RecipesResponseT> {
  const filters = normalizeFilters(rawFilters)
  try {
    const json = await callOpenAIStructured(filters)
    let data = validateOutput(json)
    // If web mode returned only meta with sources but no recipes, attempt to hydrate by parsing those sources
    if ((data.recipes?.length ?? 0) === 0 && (data.meta?.sources?.length ?? 0) > 0) {
      const hydrated = await hydrateFromSources(data, filters)
      if (hydrated) data = hydrated
    }
    const enriched = await maybeEnrichMissingImages(data, filters)
    return enriched
  } catch (err) {
    const msg = String((err as any)?.message || '')
    // On timeout, retry once with fast settings
    if (msg.toLowerCase().includes('timed out') || msg.toLowerCase().includes('timeout')) {
      const fastFilters = { ...filters, maxResults: 5 }
      const json = await callOpenAIStructured(fastFilters, { maxOutputTokens: 2000, useWebSearch: true })
      let data = validateOutput(json)
      if ((data.recipes?.length ?? 0) === 0 && (data.meta?.sources?.length ?? 0) > 0) {
        const hydrated = await hydrateFromSources(data, filters)
        if (hydrated) data = hydrated
      }
      return maybeEnrichMissingImages(data, filters)
    }
    // If model returned empty recipes (schema minItems violation), retry with fast model-only generation
    if (msg.includes('must contain at least 1 element')) {
      const fastFilters = { ...filters, maxResults: 5 }
      const json = await callOpenAIStructured(fastFilters, { maxOutputTokens: 1800, useWebSearch: false })
      const data = validateOutput(json)
      return maybeEnrichMissingImages(data, filters)
    }
    // On parse fail, retry once with fast model-only generation
    if (msg.toLowerCase().includes('failed to parse structured output json') || msg.toLowerCase().includes('unterminated string') || msg.toLowerCase().includes('json at position')) {
      const fastFilters = { ...filters, maxResults: 5 }
      const json = await callOpenAIStructured(fastFilters, { maxOutputTokens: 2000, useWebSearch: false })
      return validateOutput(json)
    }
    // Retry once with slightly reduced maxResults if schema mismatch or parse error
    const currentMax = Math.min(10, Math.max(5, filters.maxResults ?? 5))
    const retryMax = Math.max(5, Math.min(10, currentMax - 1))
    if (retryMax === currentMax) throw err
    const retryFilters = { ...filters, maxResults: retryMax }
    const json = await callOpenAIStructured(retryFilters)
    let data = validateOutput(json)
    if ((data.recipes?.length ?? 0) === 0 && (data.meta?.sources?.length ?? 0) > 0) {
      const hydrated = await hydrateFromSources(data, filters)
      if (hydrated) data = hydrated
    }
    return maybeEnrichMissingImages(data, filters)
  }
}

export async function searchMoreRecipes(
  previous: RecipesResponseT,
  filters: RecipeSearchFilters
): Promise<RecipesResponseT> {
  const exclude = new Set<string>()
  try {
    previous?.meta?.sources?.forEach(s => s?.url && exclude.add(s.url))
  } catch {}
  try {
    previous?.recipes?.forEach(r => r?.source && exclude.add(r.source))
  } catch {}
  filters.excludeSources?.forEach(u => exclude.add(u))

  const nextFilters: RecipeSearchFilters = {
    ...filters,
    excludeSources: Array.from(exclude),
  }

  return searchRecipes(nextFilters)
}

// --- Image enrichment (fallback) ---
const imagesSchema = {
  name: 'recipe_images',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      images: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            source: { type: 'string' },
            image: { type: 'string' },
          },
          required: ['source', 'image'],
        },
      },
    },
    required: ['images'],
  },
  strict: true,
} as const

function likelyImage(url: string): boolean {
  try {
    const u = new URL(url)
    return /(\.jpg|\.jpeg|\.png|\.webp|\.gif)$/i.test(u.pathname)
  } catch { return false }
}

export async function enrichMissingImages(recipes: RecipeT[]): Promise<Record<string, string>> {
  const missing = recipes.filter(r => !r.image).map(r => ({ source: r.source, title: r.title }))
  if (missing.length === 0) return {}

  const client = getClient()
  const instructions = [
    'For each recipe, find a direct image URL representing the dish.',
    'Prefer images from the same domain as the source or reputable cooking sites.',
    'Return a single direct image file URL per item (.jpg, .jpeg, .png, .webp, .gif).',
    'Do not return HTML pages, relative URLs, data: URIs, or tracking links.',
  ].join(' ')

  const input = JSON.stringify({ items: missing })
  const resp = await client.responses.create({
    model: OPENAI_RESPONSES_MODEL,
    tools: [{ type: 'web_search' }],
    text: {
      format: {
        type: 'json_schema',
        name: (imagesSchema as any).name,
        schema: (imagesSchema as any).schema,
        strict: (imagesSchema as any).strict,
      } as any,
      verbosity: 'low' as any,
    } as any,
    instructions,
    input,
    reasoning: { effort: 'low' } as any,
    parallel_tool_calls: false,
    max_output_tokens: 800,
  } as any)

  const text = (resp as any).output_text
  if (!text) return {}
  let data: any
  try { data = JSON.parse(String(text)) } catch { return {} }
  const out: Record<string, string> = {}
  if (data && Array.isArray(data.images)) {
    for (const it of data.images) {
      if (it && typeof it.source === 'string' && typeof it.image === 'string') {
        const url = it.image.trim()
        if (isValidUrl(url) && likelyImage(url)) {
          out[it.source] = url
        }
      }
    }
  }
  return out
}

// Extract a likely image from meta tags (og:image, twitter:image, image_src)
function extractOgImage(html: string, baseUrl: string): string | null {
  const metas = [] as string[]
  const push = (re: RegExp) => {
    const m = html.match(re)
    if (m && m[1]) metas.push(m[1])
  }
  // Match content attribute regardless of attribute order
  push(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i)
  push(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["'][^>]*>/i)
  push(/<meta[^>]+name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i)
  push(/<meta[^>]+content=["']([^"']+)["'][^>]*name=["']twitter:image["'][^>]*>/i)
  push(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["'][^>]*>/i)
  for (const raw of metas) {
    try {
      const abs = new URL(raw, baseUrl).toString()
      if (isValidUrl(abs)) return abs
    } catch {}
  }
  return null
}

async function maybeEnrichMissingImages(result: RecipesResponseT, filters: RecipeSearchFilters): Promise<RecipesResponseT> {
  if (filters.imageFallback === false) return result
  const need = result.recipes.some(r => !r.image)
  if (!need) return result
  try {
    // 1) OpenAI enrichment
    let map = await enrichMissingImages(result.recipes)

    // 2) Tavily fallback if still missing
    const stillMissing = result.recipes.filter(r => !r.image && !map[r.source])
    if (stillMissing.length) {
      try {
        const tmap = await enrichMissingImagesWithTavily(stillMissing)
        map = { ...map, ...tmap }
      } catch {}
    }

    if (Object.keys(map).length === 0) return result
    const updated = {
      ...result,
      meta: {
        ...result.meta,
        used_filters: { ...result.meta.used_filters, imageFallback: true, imageFallbackProvider: 'openai+tavily' },
      },
      recipes: result.recipes.map(r => (r.image ? r : { ...r, image: map[r.source] || r.image })),
    }
    return updated
  } catch {
    return result
  }
}

// --- Tavily image fallback ---
async function enrichMissingImagesWithTavily(recipes: Pick<RecipeT, 'source' | 'title'>[]): Promise<Record<string, string>> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return {}
  const out: Record<string, string> = {}
  for (const r of recipes) {
    try {
      const domain = new URL(r.source).hostname.replace(/^www\./, '')
      const query = `${r.title} site:${domain} image`
      const resp = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: 'basic',
          include_images: true,
          max_results: 3,
        }),
      } as RequestInit)
      if (!resp.ok) continue
      const json: any = await resp.json().catch(() => null)
      const candidates: string[] = []
      if (json?.images && Array.isArray(json.images)) candidates.push(...json.images)
      if (Array.isArray(json?.results)) {
        for (const item of json.results) {
          if (Array.isArray(item?.images)) candidates.push(...item.images)
        }
      }
      // prefer same-domain or well-known CDNs
      const pick = (
        candidates
          .map((u) => { try { return new URL(u).toString() } catch { return null } })
          .filter(Boolean) as unknown as string[]
      ).filter(u => u.startsWith('http'))
      const chosen = pick.find(u => new URL(u).hostname.includes(domain)) || pick.find(u => /(\.jpg|\.jpeg|\.png|\.webp|\.gif)(\?|#|$)/i.test(u)) || pick[0]
      if (chosen) out[r.source] = chosen
    } catch {}
  }
  return out
}

async function hydrateFromSources(result: RecipesResponseT, filters: RecipeSearchFilters): Promise<RecipesResponseT | null> {
  try {
    const sources = (result.meta?.sources || []).map(s => s.url).filter(Boolean)
    if (!sources.length) return null
    const max = Math.min(10, Math.max(1, filters.maxResults ?? 5))
    const picked = sources.slice(0, max)
    const ua = 'PlateWise-Importer/1.0'
    const collected: RecipeT[] = []
    for (const url of picked) {
      try {
        const res = await fetch(url, { headers: { 'User-Agent': ua } as any })
        if (!res.ok) continue
        const html = await res.text()
        const { recipe } = parseRecipeFromHtml(url, html)
        if (!recipe) continue
        // Map CreateRecipeInput -> RecipeT (feature schema)
        const mapped: RecipeT = {
          title: recipe.title,
          description: recipe.description || '',
          cuisine: recipe.cuisine || 'international',
          source: url,
          image: extractOgImage(html, url) || undefined,
          servings: recipe.metadata?.servings || undefined,
          total_time_minutes: recipe.metadata?.totalTime || undefined,
          difficulty: (recipe.metadata?.difficulty as any) || undefined,
          ingredients: (recipe.ingredients || []).map((ing: any) => ({
            item: ing.name,
            quantity: ing.amount,
            unit: ing.unit,
          })),
          instructions: (recipe.instructions || []).map((st: any) => ({
            step: st.step || 1,
            text: st.description || '',
          })),
          nutrition: undefined,
        }
        // basic sanity
        if (mapped.ingredients.length && mapped.instructions.length) {
          collected.push(mapped)
        }
      } catch {}
    }
    if (!collected.length) return null
    return {
      recipes: collected,
      meta: {
        has_more: result.meta?.has_more ?? false,
        sources: (result.meta?.sources || []),
        used_filters: result.meta?.used_filters || {},
      },
    }
  } catch {
    return null
  }
}
