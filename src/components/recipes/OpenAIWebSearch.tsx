"use client"

import React, { useMemo, useState } from 'react'
import { useRecipeSearch, useRecipeSearchMore } from '@/hooks/useRecipeWebSearch'
import { useToast } from '@/components/ui/toast'
import { useAuthContext } from '@/contexts/AuthContext'
import { recipeDatabaseService } from '@/lib/recipes/recipe-database-service'
import { recipeService, type CreateRecipeInput } from '@/lib/recipes'
import { createUniqueRecipeSlug } from '@/lib/utils/slug'
import { useProfileSetup } from '@/hooks/useProfileSetup'
import { normalizeIngredients } from '@/lib/recipes/ingredient-normalizer'

type Props = {
  className?: string
}

export function OpenAIWebSearch({ className }: Props) {
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState('')
  const [include, setInclude] = useState('')
  const [exclude, setExclude] = useState('')
  const [max, setMax] = useState<number>(5)
  const [mode, setMode] = useState<'web' | 'fast'>('web')
  const [repair, setRepair] = useState(true)
  const [detailed, setDetailed] = useState(true)

  const [previousResults, setPreviousResults] = useState<any | null>(null)

  const search = useRecipeSearch()
  const searchMore = useRecipeSearchMore()
  const { addToast } = useToast()
  const { user } = useAuthContext()
  const { profile } = useProfileSetup()

  const filters = useMemo(() => {
    return {
      query: query || undefined,
      country: country || undefined,
      includeIngredients: include
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
      excludeIngredients: exclude
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
      maxResults: max,
      mode,
      detailedInstructions: detailed,
    }
  }, [query, country, include, exclude, max, mode, detailed])

  const handleSearch = async () => {
    setPreviousResults(null)
    try {
      const res = await search.mutateAsync(filters)
      setPreviousResults(res.results)
      repairMissingInResults(res.results)
      const ids = (res.rows || []).map((r: any) => r.id).filter(Boolean)
      addToast({
        type: 'success',
        title: `Upserted ${res.rows?.length ?? 0} recipes`,
        message: ids.length ? `Row IDs: ${ids.slice(0, 8).join(', ')}${ids.length > 8 ? '…' : ''}` : undefined,
      })
      setLastRows(res.rows || [])
    } catch (e: any) {
      addToast({ type: 'error', title: 'Search failed', message: e?.message })
      throw e
    }
  }

  const handleMore = async () => {
    if (!previousResults) return
    try {
      const res = await searchMore.mutateAsync({ previous: previousResults, ...filters })
      setPreviousResults(res.results)
      repairMissingInResults(res.results)
      const ids = (res.rows || []).map((r: any) => r.id).filter(Boolean)
      addToast({
        type: 'success',
        title: `Upserted ${res.rows?.length ?? 0} recipes`,
        message: ids.length ? `Row IDs: ${ids.slice(0, 8).join(', ')}${ids.length > 8 ? '…' : ''}` : undefined,
      })
      setLastRows(res.rows || [])
    } catch (e: any) {
      addToast({ type: 'error', title: 'Search more failed', message: e?.message })
      throw e
    }
  }

  const isBusy = search.isPending || searchMore.isPending
  const [lastRows, setLastRows] = useState<any[]>([])
  const [collName, setCollName] = useState('')
  const [collDesc, setCollDesc] = useState('')
  const [collPublic, setCollPublic] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [lastCollectionId, setLastCollectionId] = useState<string | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [rawOut, setRawOut] = useState<string>('')
  const [showRaw, setShowRaw] = useState(false)
  const [lastDoneReason, setLastDoneReason] = useState<string>('')
  const [showExport, setShowExport] = useState(false)
  const repairAttemptedRef = React.useRef<Set<string>>(new Set())

  function RecipeThumb({ r, idx }: { r: any; idx: number }) {
    const raw = r?.metadata?.image_set?.card || r?.metadata?.image_url || r.image || r.image_url || r.img_url
    const src = raw ? `/api/image?url=${encodeURIComponent(raw)}` : ''
    const placeholder = r?.metadata?.lqip || ''
    const bg = (r?.metadata?.palette && Array.isArray(r.metadata.palette) && r.metadata.palette[0]) || '#f3f4f6'
    const [loaded, setLoaded] = React.useState(false)
    return (
      <div className="w-14 h-14 rounded overflow-hidden border relative" style={{ backgroundColor: bg }}>
        {!loaded && placeholder ? (
          <img src={placeholder} alt="" className="absolute inset-0 w-full h-full object-cover blur-sm" />
        ) : null}
        {src ? (
          <img
            src={src}
            alt={r.title}
            className={`w-full h-full object-cover ${loaded ? '' : 'opacity-0'}`}
            onLoad={() => setLoaded(true)}
            onError={async (e) => {
              const imgEl = e.currentTarget as HTMLImageElement | null
              if (imgEl) imgEl.onerror = null
              const key = r.source || String(idx)
              if (repairAttemptedRef.current.has(key)) return
              const fixed = await repairImageFor(r.source, r.title)
              if (fixed && imgEl) {
                repairAttemptedRef.current.add(key)
                imgEl.src = `/api/image?url=${encodeURIComponent(fixed)}`
                setPreviousResults((prev: any) => {
                  if (!prev) return prev
                  const copy = { ...prev, recipes: [...prev.recipes] }
                  copy.recipes[idx] = { ...copy.recipes[idx], image: fixed, metadata: { ...(copy.recipes[idx].metadata || {}), image_url: fixed } }
                  return copy
                })
              } else if (imgEl) {
                imgEl.style.display = 'none'
              }
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">No image</div>
        )}
      </div>
    )
  }

  async function repairImageFor(source: string, title: string): Promise<string | null> {
    try {
      const res = await fetch('/api/recipes/repair-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, title }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'repair_failed')
      return j.image_url || null
    } catch {
      return null
    }
  }

  // Attempt to repair/store images for any results that have no image URL
  async function repairMissingInResults(results: any, limit: number = 6) {
    try {
      const list: Array<{ idx: number; r: any }> = (results?.recipes || [])
        .map((r: any, idx: number) => ({ idx, r }))
        .filter(({ r }: { r: any }) => !(
          r?.metadata?.image_url || r?.image || r?.image_url || r?.img_url
        ))
        .slice(0, limit)
      if (!list.length) return
      await Promise.all(list.map(async ({ idx, r }) => {
        const key = r.source || String(idx)
        if (repairAttemptedRef.current.has(key)) return
        const fixed = await repairImageFor(r.source, r.title)
        if (fixed) {
          repairAttemptedRef.current.add(key)
          setPreviousResults((prev: any) => {
            if (!prev) return prev
            const copy = { ...prev, recipes: [...prev.recipes] }
            const cur = { ...copy.recipes[idx] }
            cur.image = fixed
            cur.metadata = { ...(cur.metadata || {}), image_url: fixed }
            copy.recipes[idx] = cur
            return copy
          })
        }
      }))
    } catch {}
  }

  function buildSupabasePayload() {
    const recs = (previousResults?.recipes || []) as any[]
    const payload = recs.map(r => ({
      title: r.title,
      description: r.description ?? null,
      cultural_origin: [],
      cuisine: r.cuisine || 'international',
      ingredients: r.ingredients,
      instructions: r.instructions,
      nutritional_info: r.nutrition ?? null,
      cost_analysis: null,
      metadata: {
        source_url: r.source,
        image_url: r.image ?? null,
        servings: r.servings ?? null,
        total_time_minutes: r.total_time_minutes ?? null,
        difficulty: r.difficulty ?? r?.metadata?.difficulty ?? null,
      },
      tags: [],
      source: 'community',
      is_public: true,
    }))
    return JSON.stringify(payload, null, 2)
  }

  async function saveOneToMyRecipes(r: any) {
    try {
      if (!user?.id) {
        addToast({ type: 'warning', title: 'Sign in required', message: 'Please sign in to save recipes.' })
        return
      }
      const fracToNumber = (s: string): number => {
        // supports "1/2", "1 1/2", "2", "2.5"
        const parts = s.trim().split(/\s+/)
        const p0 = parts[0] || ''
        const p1 = parts[1] || ''
        if (parts.length === 2 && /\d+[\/\d]+/.test(p1) && /^\d+$/.test(p0)) {
          const whole = parseFloat(p0)
          const [a, b] = p1.split('/')
          const frac = parseFloat(a || '0') / parseFloat(b || '1')
          return whole + (isFinite(frac) ? frac : 0)
        }
        if (/\d+\/\d+/.test(s)) {
          const [a, b] = s.split('/')
          const frac = parseFloat(a || '0') / parseFloat(b || '1')
          return isFinite(frac) ? frac : 0
        }
        const n = parseFloat(s)
        return Number.isFinite(n) ? n : 0
      }
      const parseQty = (q: unknown): number => {
        if (q == null) return 0
        if (typeof q === 'number') return q
        if (typeof q === 'string') {
          const m = q.match(/(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)/)
          return m ? fracToNumber(m[1]!) : 0
        }
        return 0
      }
      const knownUnits = ['cup','cups','tablespoon','tablespoons','tbsp','teaspoon','teaspoons','tsp','oz','ounce','ounces','lb','pound','pounds','g','gram','grams','kg','ml','l','liter','liters','clove','cloves','sprig','sprigs','can','cans']
      const extractUnit = (q: unknown, item: string, unit?: string): string => {
        if (unit && String(unit).trim()) return String(unit).trim()
        const texts = [typeof q === 'string' ? q : '', item]
        for (const t of texts) {
          const m = (t || '').toLowerCase().match(new RegExp(`\\b(${knownUnits.join('|')})\\b`))
          if (m) return m[1]!
        }
        return ''
      }
      const stripLeadingQtyUnit = (item: string, qty: number, unit: string): string => {
        let s = item.trim()
        if (!s) return s
        // Remove patterns like "2 cups" or "1 1/2 cup" at start
        s = s.replace(/^\s*\d+\s+\d+\/\d+\s+\w+\s+/i, '')
        s = s.replace(/^\s*\d+\/\d+\s+\w+\s+/i, '')
        s = s.replace(/^\s*\d+(?:\.\d+)?\s+\w+\s+/i, '')
        s = s.replace(/^\s*\d+(?:\.\d+)?\s+/, '')
        return s.trim()
      }
      let baseIngredients = Array.isArray(r.ingredients) ? r.ingredients : []
      // If many units are missing but we have a source URL, try server-side HTML import for richer structure
      try {
        const missingUnits = baseIngredients.filter((ing: any) => !ing?.unit).length
        if (r?.source && baseIngredients.length && missingUnits / baseIngredients.length >= 0.4) {
          const res = await fetch('/api/recipes/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: r.source }),
          })
          if (res.ok) {
            const j = await res.json()
            if (j?.data?.recipe?.ingredients?.length) {
              baseIngredients = j.data.recipe.ingredients
            }
          }
        }
      } catch {}

      const ingredients = baseIngredients.map((ing: any, i: number) => {
        const qty = parseQty(ing.quantity)
        const unit = extractUnit(ing.quantity, String(ing.item || ''), ing.unit)
        const nameRaw = String(ing.item || '').trim()
        const name = stripLeadingQtyUnit(nameRaw, qty, unit) || nameRaw || `Ingredient ${i + 1}`
        return {
          id: `ing_${i + 1}`,
          name,
          amount: qty,
          unit,
          culturalName: undefined,
          substitutes: [],
          costPerUnit: 0,
          availability: [],
        }
      })

      const preferFresh = Boolean((profile as any)?.preferences?.preferFreshProduce ?? true)
      const normalizedIngredients = normalizeIngredients(ingredients, { preferFreshProduce: preferFresh })
      const instructions = (Array.isArray(r.instructions) ? r.instructions : []).map((it: any, i: number) => ({
        step: typeof it.step === 'number' && it.step > 0 ? it.step : i + 1,
        description: String(it.text || '').trim() || `Step ${i + 1}`,
      }))

      const input: CreateRecipeInput = {
        title: String(r.title || 'Untitled Recipe'),
        description: String(r.description || ''),
        culturalOrigin: [],
        cuisine: String(r.cuisine || 'international'),
        ingredients: normalizedIngredients,
        instructions,
        metadata: {
          servings: typeof r.servings === 'number' && r.servings > 0 ? r.servings : 4,
          prepTime: 0,
          cookTime: 0,
          totalTime: typeof r.total_time_minutes === 'number' ? r.total_time_minutes : 0,
          difficulty: (r.difficulty === 'easy' || r.difficulty === 'medium' || r.difficulty === 'hard') ? r.difficulty : 'medium',
          culturalAuthenticity: 0,
          imageUrl: (r?.metadata?.image_url || r.image || r.image_url || r.img_url) || undefined,
          sourceUrl: r?.source || undefined,
        },
        tags: [],
        source: 'user',
      }

      const saved = await recipeService.createRecipe(input, user.id)
      if (!saved) throw new Error('Failed to save recipe')
      const slug = createUniqueRecipeSlug(saved.title, saved.id)
      addToast({ type: 'success', title: 'Saved to My Recipes', message: saved.title })
      // Optimistically record the new row id for quick visibility
      setLastRows(prev => [{ id: saved.id }, ...prev])
      // Offer quick navigation
      try {
        // Small, unobtrusive redirect link via window.open in a new tab
        // Commented out to avoid unexpected navigation; keep toast only
        // window.open(`/recipes/${slug}`, '_blank')
      } catch {}
    } catch (e: any) {
      addToast({ type: 'error', title: 'Save failed', message: e?.message || 'Could not save recipe' })
    }
  }

  return (
    <div className={className}>
      <div className="rounded-lg border border-gray-200 p-4 bg-white">
        <h2 className="text-xl font-semibold mb-3">AI Web Search (OpenAI)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <input
            className="border rounded px-3 py-2"
            placeholder="Query (e.g., jollof rice)"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Country (e.g., Nigeria)"
            value={country}
            onChange={e => setCountry(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Include ingredients (CSV)"
            value={include}
            onChange={e => setInclude(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Exclude ingredients (CSV)"
            value={exclude}
            onChange={e => setExclude(e.target.value)}
          />
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Max Results</label>
            <input
              type="number"
              min={5}
              max={10}
              className="border rounded px-3 py-2 w-24"
              value={max}
              onChange={e => setMax(Number(e.target.value))}
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={mode === 'fast'}
              onChange={(e) => setMode(e.target.checked ? 'fast' : 'web')}
            />
            <span className="text-sm text-gray-700">Fast mode (no web search)</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={repair}
              onChange={(e) => setRepair(e.target.checked)}
            />
            <span className="text-sm text-gray-700">Prefer schema repair</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={detailed}
              onChange={(e) => setDetailed(e.target.checked)}
            />
            <span className="text-sm text-gray-700">Detailed instructions</span>
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSearch}
            disabled={isBusy}
            className={`px-4 py-2 rounded text-white ${isBusy ? 'bg-gray-400' : 'bg-gray-900 hover:bg-black'}`}
          >
            {search.isPending ? 'Searching…' : 'Search'}
          </button>
          <button
            onClick={handleMore}
            disabled={isBusy || !previousResults}
            className={`px-4 py-2 rounded border ${isBusy || !previousResults ? 'opacity-60' : 'hover:bg-gray-50'}`}
          >
            {searchMore.isPending ? 'Searching more…' : 'Search more'}
          </button>
          <button
            onClick={() => {
              try {
                // Clear previous results so UI doesn't show stale items during a new stream
                setPreviousResults(null)
                setLastRows([])
                setShowExport(false)
                const params = new URLSearchParams()
                if (filters.query) params.set('query', filters.query)
                if (filters.country) params.set('country', filters.country)
                if (filters.includeIngredients?.length) params.set('include', filters.includeIngredients.join(','))
                if (filters.excludeIngredients?.length) params.set('exclude', filters.excludeIngredients.join(','))
                if (filters.maxResults) params.set('max', String(filters.maxResults))
                params.set('mode', mode)
                params.set('repair', repair ? '1' : '0')
                params.set('detailed', detailed ? '1' : '0')
                setStreamingText('')
                setIsStreaming(true)
                const es = new EventSource(`/api/recipes/search/stream?${params.toString()}`)
                es.onmessage = (ev) => {
                  try {
                    const payload = JSON.parse(ev.data)
                    if (payload?.delta) {
                      setStreamingText(prev => prev + payload.delta)
                    }
                    if (payload?.ok) {
                      // done event sent without explicit event name
                      setIsStreaming(false)
                    }
                  } catch {}
                }
                es.addEventListener('final_text', (ev: MessageEvent) => {
                  try {
                    const payload = JSON.parse(ev.data)
                    if (typeof payload?.text === 'string') {
                      setRawOut(payload.text)
                    }
                  } catch {}
                })
                es.addEventListener('done', (ev: MessageEvent) => {
                  try {
                    const payload = JSON.parse(ev.data)
                    if (payload.ok && payload.results) {
                      setPreviousResults(payload.results)
                      repairMissingInResults(payload.results)
                      setLastRows(payload.rows || [])
                      const ids = (payload.rows || []).map((r: any) => r.id).filter(Boolean)
                      addToast({ type: 'success', title: `Upserted ${payload.rows?.length ?? 0} recipes`, message: ids.slice(0,8).join(', ') })
                      setRawOut('')
                      setLastDoneReason('')
                    } else {
                      const reason = payload?.reason || 'N/A'
                      addToast({ type: 'warning', title: 'Stream finished without results', message: reason })
                      // Ensure stale results are not shown if the stream produced no parseable results
                      setPreviousResults(null)
                      setLastRows([])
                      setLastDoneReason(reason)
                      if (typeof payload?.text === 'string') setRawOut(payload.text)
                      setShowRaw(true)
                    }
                  } catch (e: any) {
                    addToast({ type: 'error', title: 'Stream finalize error', message: e?.message })
                  } finally {
                    es.close()
                    setIsStreaming(false)
                  }
                })
                es.addEventListener('error', (ev: MessageEvent) => {
                  try {
                    const payload = JSON.parse((ev as any).data || '{}')
                    addToast({ type: 'error', title: 'Stream error', message: payload?.message || 'Unknown' })
                  } catch {
                    addToast({ type: 'error', title: 'Stream error' })
                  } finally {
                    es.close()
                    setIsStreaming(false)
                  }
                })
              } catch (e: any) {
                addToast({ type: 'error', title: 'Failed to start stream', message: e?.message })
                setIsStreaming(false)
              }
            }}
            disabled={isBusy || isStreaming}
            className={`px-4 py-2 rounded border ${isBusy || isStreaming ? 'opacity-60' : 'hover:bg-gray-50'}`}
          >
            {isStreaming ? 'Streaming…' : 'Stream'}
          </button>
        </div>

        {(search.error || searchMore.error) && (
          <p className="text-sm text-red-600 mt-3">{(search.error || searchMore.error)?.message}</p>
        )}

        {/* Streaming preview */}
        {isStreaming && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Streaming preview</h3>
            <pre className="p-3 border rounded bg-gray-50 whitespace-pre-wrap text-xs max-h-64 overflow-auto">{streamingText}</pre>
          </div>
        )}

        {/* Raw output (debug) */}
        {rawOut && !isStreaming && (
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Raw output (parse failed: {lastDoneReason || 'unknown'})</h3>
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1 rounded border hover:bg-gray-100"
                  onClick={async () => {
                    try { await navigator.clipboard.writeText(rawOut); addToast({ type: 'success', title: 'Copied raw output' }) } catch {}
                  }}
                >Copy</button>
                <button
                  className="px-3 py-1 rounded border hover:bg-gray-100"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/recipes/repair', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ raw: rawOut }),
                      })
                      const j = await res.json()
                      if (!res.ok) throw new Error(j?.error || 'repair_failed')
                      setPreviousResults(j.results)
                      setLastRows(j.rows || [])
                      setShowRaw(false)
                      setLastDoneReason('')
                      addToast({ type: 'success', title: 'Repaired and imported', message: `${(j.results?.recipes || []).length} recipes` })
                    } catch (e: any) {
                      addToast({ type: 'error', title: 'Repair failed', message: e?.message })
                    }
                  }}
                >Repair and import</button>
                <button
                  className="px-3 py-1 rounded border hover:bg-gray-100"
                  onClick={() => setShowRaw(v => !v)}
                >{showRaw ? 'Hide' : 'Show'}</button>
              </div>
            </div>
            {showRaw && (
              <pre className="p-3 border rounded bg-gray-50 whitespace-pre-wrap text-xs max-h-80 overflow-auto mt-2">{rawOut}</pre>
            )}
          </div>
        )}

        {/* Summary output */}
        {previousResults?.recipes && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Results</h3>
            <div className="mb-2 flex gap-2">
              <button
                className="px-3 py-1 rounded border hover:bg-gray-100"
                onClick={() => previousResults && repairMissingInResults(previousResults, 12)}
              >
                Repair images
              </button>
              <button
                className="px-3 py-1 rounded border hover:bg-gray-100"
                onClick={async () => {
                  try {
                    const items = (previousResults?.recipes || []).filter((r: any) => !(
                      r?.metadata?.image_url || r?.image || r?.image_url || r?.img_url
                    )).map((r: any) => ({ source: r.source, title: r.title }))
                    if (!items.length) { addToast({ type: 'info', title: 'No missing images' }); return }
                    const res = await fetch('/api/recipes/images/repair-bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) })
                    const j = await res.json()
                    if (!res.ok) throw new Error(j?.error || 'bulk_failed')
                    addToast({ type: 'success', title: `Bulk repaired ${j.repaired}/${j.total}` })
                    // Merge any found URLs into the UI
                    const map: Record<string, string> = {}
                    for (const r of (j.results || [])) if (r.ok && r.image_url) map[r.source] = r.image_url
                    setPreviousResults((prev: any) => {
                      if (!prev) return prev
                      const copy = { ...prev, recipes: [...prev.recipes] }
                      copy.recipes = copy.recipes.map((r: any) => (map[r.source] ? { ...r, image: map[r.source], metadata: { ...(r.metadata || {}), image_url: map[r.source] } } : r))
                      return copy
                    })
                  } catch (e: any) {
                    addToast({ type: 'error', title: 'Bulk repair failed', message: e?.message })
                  }
                }}
              >
                Repair all (background)
              </button>
            </div>
            <ul className="divide-y divide-gray-200 border rounded">
              {previousResults.recipes.map((r: any, idx: number) => {
                const rawImageUrl = r?.metadata?.image_set?.card || r?.metadata?.image_url || r.image || r.image_url || r.img_url
                const imageUrl = rawImageUrl ? `/api/image?url=${encodeURIComponent(rawImageUrl)}` : ''
                const time = r.total_time_minutes
                const difficulty = r.difficulty || r?.metadata?.difficulty
                return (
                  <li key={r.source + idx} className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <RecipeThumb r={r} idx={idx} />
                      <div>
                        <div className="font-medium">{r.title}</div>
                        <a href={r.source} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
                          {r.source}
                        </a>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-gray-600 whitespace-nowrap">
                        {typeof time === 'number' ? `${time} min` : 'Time: —'}
                        {` · `}
                        {difficulty ? `Difficulty: ${String(difficulty)}` : 'Difficulty: —'}
                      </div>
                      <button
                        className="px-3 py-1 rounded border hover:bg-gray-100 text-sm"
                        onClick={() => saveOneToMyRecipes(r)}
                        disabled={!user || isBusy}
                        title={!user ? 'Sign in to save' : 'Save to My Recipes'}
                      >
                        Save to My Recipes
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
            <p className="text-sm text-gray-600 mt-2">
              Sources returned: {previousResults.meta?.sources?.length || 0} · Has more: {String(previousResults.meta?.has_more)}
            </p>

            {/* Export to Supabase JSON */}
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Export (Supabase recipes table format)</div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-3 py-1 rounded border hover:bg-gray-100"
                    onClick={() => setShowExport(v => !v)}
                  >{showExport ? 'Hide' : 'Show'}</button>
                  <button
                    className="px-3 py-1 rounded border hover:bg-gray-100"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(buildSupabasePayload())
                        addToast({ type: 'success', title: 'Copied export JSON' })
                      } catch {}
                    }}
                  >Copy JSON</button>
                  <button
                    className="px-3 py-1 rounded border hover:bg-gray-100"
                    onClick={() => {
                      const data = buildSupabasePayload()
                      const blob = new Blob([data], { type: 'application/json' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = 'recipes_supabase.json'
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                  >Download</button>
                </div>
              </div>
              {showExport && (
                <pre className="p-3 border rounded bg-gray-50 whitespace-pre-wrap text-xs max-h-80 overflow-auto mt-2">{buildSupabasePayload()}</pre>
              )}
            </div>

            {lastRows?.length ? (
              <div className="mt-3 text-sm text-gray-700">
                <div className="font-medium">Upserted Rows</div>
                <div className="mt-1 bg-gray-50 border rounded p-2 break-all">
                  IDs: {lastRows.map((r: any) => r.id).filter(Boolean).join(', ')}
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    className="px-3 py-1 rounded border hover:bg-gray-100"
                    onClick={async () => {
                      try {
                        const ids = lastRows.map((r: any) => r.id).filter(Boolean)
                        await navigator.clipboard.writeText(ids.join(','))
                        addToast({ type: 'success', title: 'Copied row IDs' })
                      } catch (e: any) {
                        addToast({ type: 'error', title: 'Copy failed', message: e?.message })
                      }
                    }}
                  >
                    Copy IDs
                  </button>
                </div>
                <div className="mt-3">
                  <div className="text-sm font-medium mb-1">Save as Collection</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                      className="border rounded px-3 py-2"
                      placeholder="Collection name"
                      value={collName}
                      onChange={e => setCollName(e.target.value)}
                    />
                    <input
                      className="border rounded px-3 py-2 md:col-span-2"
                      placeholder="Description (optional)"
                      value={collDesc}
                      onChange={e => setCollDesc(e.target.value)}
                    />
                  </div>
                  <div className="mt-2">
                    <button
                      className="px-4 py-2 rounded text-white bg-gray-900 hover:bg-black disabled:opacity-60"
                      disabled={!user || !collName || isBusy}
                      onClick={() => setShowModal(true)}
                    >
                      Save Collection
                    </button>
                    {!user && (
                      <p className="text-xs text-gray-500 mt-1">Sign in to save collections.</p>
                    )}
                  </div>
                  {lastCollectionId && (
                    <div className="mt-2 text-sm">
                      <a className="text-blue-600 hover:underline" href={`/recipes/collections/${lastCollectionId}`}>View collection</a>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
      {/* Mini modal for Public/Private selection */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
            <h4 className="text-lg font-semibold mb-2">Collection Visibility</h4>
            <p className="text-sm text-gray-600 mb-3">Choose whether this collection is public or private.</p>
            <div className="flex items-center gap-3 mb-4">
              <label className="flex items-center gap-2">
                <input type="radio" name="vis" checked={!collPublic} onChange={() => setCollPublic(false)} />
                <span>Private</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="vis" checked={collPublic} onChange={() => setCollPublic(true)} />
                <span>Public</span>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-2 border rounded" onClick={() => setShowModal(false)}>Cancel</button>
              <button
                className="px-4 py-2 rounded text-white bg-gray-900 hover:bg-black disabled:opacity-60"
                disabled={!user || isBusy}
                onClick={async () => {
                  try {
                    if (!user) {
                      addToast({ type: 'warning', title: 'Sign in required', message: 'Please sign in to save a collection.' })
                      return
                    }
                    const ids = lastRows.map((r: any) => r.id).filter(Boolean)
                    const collection = await recipeDatabaseService.createCollection(
                      { name: collName, description: collDesc, recipeIds: ids, isPublic: collPublic },
                      user.id
                    )
                    if (!collection) throw new Error('Failed to create collection')
                    addToast({ type: 'success', title: 'Collection saved', message: `#${collection.id} (${collPublic ? 'Public' : 'Private'})` })
                    setShowModal(false)
                    setCollName('')
                    setCollDesc('')
                    setLastCollectionId(collection.id)
                  } catch (e: any) {
                    addToast({ type: 'error', title: 'Save failed', message: e?.message })
                  }
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
