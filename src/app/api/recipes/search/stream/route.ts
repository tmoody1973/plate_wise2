import { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { recipesJsonSchema } from '@/lib/recipes/schema'
import { upsertRecipes } from '@/lib/recipes/db'
import { enrichMissingImages as enrichImagesInternal } from '@/lib/recipes/search'
import { parseRecipeFromHtml } from '@/lib/recipes/html-recipe-parser'
import { searchRecipesFast } from '@/lib/recipes/search'

function toCSV(arr?: string[] | null) {
  return (arr || []).filter(Boolean).join(',')
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('query') || undefined
  const country = (searchParams.get('country') || '').trim() || 'United States'
  const includeCSV = searchParams.get('include') || ''
  const excludeCSV = searchParams.get('exclude') || ''
  const maxResults = searchParams.get('max') ? Number(searchParams.get('max')) : 5
  const excludeSourcesCSV = searchParams.get('excludeSources') || ''
  const mode = (searchParams.get('mode') || 'web').toLowerCase()
  const detailed = (searchParams.get('detailed') || '').toLowerCase() === '1' || (searchParams.get('detailed') || '').toLowerCase() === 'true'
  const repair = (searchParams.get('repair') || '1') === '1' || (searchParams.get('repair') || '').toLowerCase() === 'true'

  const includeIngredients = includeCSV
    ? includeCSV.split(',').map(s => s.trim()).filter(Boolean)
    : undefined
  const excludeIngredients = excludeCSV
    ? excludeCSV.split(',').map(s => s.trim()).filter(Boolean)
    : undefined
  const excludeSources = excludeSourcesCSV
    ? excludeSourcesCSV.split(',').map(s => s.trim()).filter(Boolean)
    : undefined

  const filters = {
    query,
    country,
    includeIngredients,
    excludeIngredients,
    maxResults,
    excludeSources,
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  const MODEL_WEB = process.env.OPENAI_RESPONSES_MODEL || 'gpt-5-nano'
  const MODEL_FAST = process.env.OPENAI_RESPONSES_MODEL_FAST || 'gpt-5-nano'
  if (!OPENAI_API_KEY) {
    return new Response(`event: error\ndata: {"message":"Missing OPENAI_API_KEY"}\n\n`, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
      status: 500,
    })
  }

  const client = new OpenAI({ apiKey: OPENAI_API_KEY })

  const useWeb = mode !== 'fast'
  const instructions = useWeb
    ? [
        'Use web_search to find authentic, non-paywalled recipe pages with clear ingredients and step-by-step instructions.',
        'Apply provided filters when present (country, includeIngredients, excludeIngredients, maxResults). If any are missing, proceed with sensible defaults and do not ask for more details.',
        'Return 5–10 unique recipes, include canonical source URL and representative image when available.',
        'Exclude any URL that appears in excludeSources. Use canonical URLs when possible.',
        detailed
          ? 'Write detailed instructions: 2–4 sentences per step with heat levels, timing, pan size, texture cues, and doneness signals.'
          : 'Provide concise, clear instructions.',
        'For each recipe, ensure at least 1 ingredient and 1 instruction. Provide reasonable nutrition if present.',
        'Set meta.has_more to true if additional distinct sources likely exist beyond returned results.',
      ].join(' ')
    : [
        'Generate concise, high-quality recipe cards directly without browsing the web.',
        'Apply provided filters when present: country, includeIngredients, excludeIngredients, maxResults. If not provided, choose sensible defaults and proceed without asking for more details.',
        'Return 5–10 recipes. Include a plausible image URL when available; omit otherwise.',
        detailed
          ? 'Write detailed instructions: 2–4 sentences per step with heat levels, timing, pan size, texture cues, and doneness signals.'
          : 'Provide concise, clear instructions.',
        'If any field is unknown, omit it rather than guessing.',
        'Ensure each recipe has at least 1 ingredient and 1 instruction.',
        'Use a safe default canonical source if not applicable (omit; server may provide).',
      ].join(' ')

  const input = JSON.stringify({
    query: filters.query || undefined,
    country: filters.country || undefined,
    includeIngredients: filters.includeIngredients?.length ? filters.includeIngredients : undefined,
    excludeIngredients: filters.excludeIngredients?.length ? filters.excludeIngredients : undefined,
    maxResults: Math.min(10, Math.max(5, filters.maxResults ?? 5)),
    excludeSources: filters.excludeSources?.length ? filters.excludeSources : undefined,
  })

  const stream = new ReadableStream({
    start: async controller => {
      const enc = new TextEncoder()
      function send(obj: any) {
        controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`))
      }
      function sendEvent(event: string, obj: any) {
        controller.enqueue(enc.encode(`event: ${event}\n`))
        controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`))
      }

      let full = ''
      const maxMs = 45000
      let ended = false
      async function finishWith(obj: any) {
        if (ended) return
        ended = true
        try { sendEvent('done', obj) } catch {}
        try { controller.close() } catch {}
      }
      const endTimer = setTimeout(async () => {
        // Fallback on timeout: run non-stream search and return results
        try {
          const { searchRecipes } = await import('@/lib/recipes/search')
          const data = await searchRecipes({ ...filters, detailedInstructions: detailed })
          const { rows } = await upsertRecipes(data.recipes || [])
          await finishWith({ ok: true, results: data, rows, reason: 'timeout_fallback' })
        } catch (e: any) {
          await finishWith({ ok: false, reason: 'timeout', error: e?.message })
        }
      }, maxMs)

      try {
        // Create OpenAI streaming response
        const rs = await (client.responses as any).stream({
          model: useWeb ? MODEL_WEB : MODEL_FAST,
          tools: useWeb ? [{ type: 'web_search' }] : undefined,
          text: {
            format: {
              type: 'json_schema',
              name: (recipesJsonSchema as any).name,
              schema: (recipesJsonSchema as any).schema,
              strict: (recipesJsonSchema as any).strict,
            },
            verbosity: 'low',
          },
          instructions,
          input,
          reasoning: { effort: 'low' },
          parallel_tool_calls: false,
          max_output_tokens: useWeb ? (detailed ? 4200 : 3000) : (detailed ? 2600 : 1800),
        })

        // Handle stream events
        rs.on('event', (event: any) => {
          try {
            if (event.type === 'response.output_text.delta') {
              const delta = event.delta as string
              full += delta
              send({ delta })
            } else if (event.type === 'response.error') {
              sendEvent('error', { message: event.error?.message || 'openai_error' })
            }
          } catch (e: any) {
            sendEvent('error', { message: e?.message || 'stream_handler_error' })
          }
        })

        function stripCodeFences(s: string) {
          let t = s.trim()
          // remove ```json ... ``` fences
          t = t.replace(/^```json\s*/i, '')
          t = t.replace(/^```\s*/i, '')
          t = t.replace(/\s*```\s*$/i, '')
          return t
        }

        function tryExtractJsonObject(s: string): any | null {
          // Attempt to find a top-level JSON object by bracket matching
          const text = s
          const len = text.length
          let start = -1
          // find first '{'
          for (let i = 0; i < len; i++) {
            if (text[i] === '{') { start = i; break }
          }
          if (start === -1) return null
          let depth = 0
          let inStr = false
          let esc = false
          for (let i = start; i < len; i++) {
            const ch = text[i]
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
                  const candidate = text.slice(start, i + 1)
                  try { return JSON.parse(candidate) } catch { /* try continue */ }
                }
              }
            }
          }
          return null
        }

        function wrapToResponse(raw: any) {
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
          return raw
        }

        function tryExtractRecipesArray(s: string): any[] | null {
          const keyIdx = s.indexOf('"recipes"')
          if (keyIdx === -1) return null
          const arrStart = s.indexOf('[', keyIdx)
          if (arrStart === -1) return null
          let i = arrStart + 1
          const items: any[] = []
          while (i < s.length) {
            while (i < s.length && /[\s,]/.test(s[i]!)) i++
            if (i >= s.length || s[i] === ']') break
            if (s[i] !== '{') break
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
                    try { items.push(JSON.parse(objStr)) } catch {}
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

        rs.on('end', async () => {
          try {
            let results: any = null
            try {
              const stripped = stripCodeFences(full)
              // Always send the final raw text for client-side inspection
              try { sendEvent('final_text', { length: full.length, text: full }) } catch {}
              try {
                results = JSON.parse(stripped)
              } catch {
                results = tryExtractJsonObject(stripped)
                if (!results) {
                  const arr = tryExtractRecipesArray(stripped)
                  if (arr) results = { recipes: arr }
                }
              }
            } catch (e) {
              // Not valid JSON; emit final text only
              await finishWith({ ok: false, reason: 'invalid_json', text: full })
              return
            }
            results = wrapToResponse(results)
            if (!results || !Array.isArray(results.recipes) || results.recipes.length === 0) {
              // Fallback: run non-stream structured search with same filters
              try {
                const { searchRecipes } = await import('@/lib/recipes/search')
                const data = await searchRecipes({ ...filters, detailedInstructions: detailed })
                const { rows } = await upsertRecipes(data.recipes || [])
                await finishWith({ ok: true, results: data, rows })
              } catch (e: any) {
                await finishWith({ ok: false, reason: 'no_results', text: full, error: e?.message })
              }
              return
            }
            // Optional schema repair and normalization
            if (results && Array.isArray(results.recipes)) {
              results.recipes = results.recipes.map((r: any) => {
                if (r && typeof r === 'object') {
                  if (repair && r.ingredients && !Array.isArray(r.ingredients) && typeof r.ingredients === 'object') {
                    const entries = Object.entries(r.ingredients as Record<string, any>)
                    r.ingredients = entries.map(([name, qty]) => ({
                      item: String(name),
                      quantity: typeof qty === 'number' ? qty : (typeof qty === 'string' ? qty : undefined),
                    }))
                  }
                  if (repair && Array.isArray(r.instructions) && r.instructions.length > 0 && typeof r.instructions[0] === 'string') {
                    r.instructions = (r.instructions as string[]).map((t, i) => ({ step: i + 1, text: t }))
                  }
                  if (typeof r.image === 'string') {
                    const img = r.image.trim()
                    try {
                      if (!img) throw new Error('empty')
                      new URL(img)
                      r.image = img
                    } catch {
                      delete r.image
                    }
                  }
                  if (typeof r.source === 'string') {
                    const src = r.source.trim()
                    try {
                      new URL(src)
                      r.source = src
                    } catch {
                      if (useWeb) {
                        // Drop recipes that lack a valid source when using web mode
                        return null
                      } else {
                        const slug = typeof r.title === 'string' ? r.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : 'ai-generated'
                        r.source = `https://platewise.app/ai/${slug}`
                      }
                    }
                  } else if (repair) {
                    if (useWeb) {
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
            // Ensure meta exists for follow-up operations (e.g., Search more)
            if (!results.meta) {
              const sources = (results.recipes || []).map((r: any) => ({ url: r.source })).filter((s: any) => {
                try { new URL(s.url); return true } catch { return false }
              })
              results.meta = {
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
              }
            }

            // Fallback image enrichment if missing
            try {
              const missing = (results.recipes || []).some((r: any) => !r?.image)
              if (missing) {
                const map = await (enrichImagesInternal as any)(results.recipes)
                if (map && typeof map === 'object') {
                  results.recipes = results.recipes.map((r: any) => (r.image ? r : { ...r, image: map[r.source] || r.image }))
                }
              }
            } catch {}

            // Filter invalid recipes to prevent DB errors
            const validRecipes = (results.recipes || []).filter((r: any) => {
              try {
                if (!r || typeof r !== 'object') return false
                if (typeof r.title !== 'string' || !r.title.trim()) return false
                if (typeof r.source !== 'string' || !r.source.trim()) return false
                if (!Array.isArray(r.ingredients) || r.ingredients.length === 0) return false
                if (!Array.isArray(r.instructions) || r.instructions.length === 0) return false
                return true
              } catch { return false }
            })

            if (!validRecipes.length) {
              // 1) Try to hydrate from discovered source URLs on the streamed result
              try {
                const urls: string[] = (results?.meta?.sources || []).map((s: any) => s?.url).filter(Boolean)
                const picked = urls.slice(0, Math.min(10, Math.max(1, Number(filters.maxResults || 5))))
                const ua = 'PlateWise-Importer/1.0'
                const hydrated: any[] = []
                for (const url of picked) {
                  try {
                    const res = await fetch(url, { headers: { 'User-Agent': ua } as any })
                    if (!res.ok) continue
                    const html = await res.text()
                    const { recipe } = parseRecipeFromHtml(url, html)
                    if (!recipe) continue
                    const mapped = {
                      title: recipe.title,
                      description: recipe.description || '',
                      cuisine: recipe.cuisine || 'international',
                      source: url,
                      image: undefined as string | undefined,
                      servings: recipe.metadata?.servings || undefined,
                      total_time_minutes: recipe.metadata?.totalTime || undefined,
                      difficulty: (recipe.metadata?.difficulty as any) || undefined,
                      ingredients: (recipe.ingredients || []).map((ing: any) => ({ item: ing.name, quantity: ing.amount, unit: ing.unit })),
                      instructions: (recipe.instructions || []).map((st: any) => ({ step: st.step || 1, text: st.description || '' })),
                      nutrition: undefined,
                    }
                    if (mapped.ingredients.length && mapped.instructions.length && mapped.title) hydrated.push(mapped)
                  } catch {}
                }
                if (hydrated.length) {
                  const { rows } = await upsertRecipes(hydrated as any)
                  await finishWith({ ok: true, results: { recipes: hydrated, meta: results.meta }, rows })
                  return
                }
              } catch {}

              // 2) As a last resort, synthesize valid cards with the fast model
              try {
                const data = await searchRecipesFast({ ...filters, maxResults: 5 })
                const { rows } = await upsertRecipes(data.recipes || [])
                await finishWith({ ok: true, results: data, rows })
              } catch (e: any) {
                await finishWith({ ok: false, reason: 'no_valid_recipes_after_filter', error: e?.message })
              }
              return
            }

            // Upsert to Supabase
            const { rows } = await upsertRecipes(validRecipes)
            await finishWith({ ok: true, results: { ...results, recipes: validRecipes }, rows })
          } catch (e: any) {
            try { sendEvent('error', { message: e?.message || 'finalize_error' }) } catch {}
          } finally {
            clearTimeout(endTimer)
          }
        })

        rs.on('abort', () => {
          try { sendEvent('error', { message: 'aborted' }) } catch {}
          clearTimeout(endTimer)
          try { controller.close() } catch {}
        })
      } catch (e: any) {
        try { sendEvent('error', { message: e?.message || 'create_stream_failed' }) } catch {}
        clearTimeout(endTimer)
        try { controller.close() } catch {}
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
