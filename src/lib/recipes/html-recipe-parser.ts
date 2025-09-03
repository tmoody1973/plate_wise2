// Lightweight HTML recipe parser with JSON-LD first, then heuristics
// No external DOM libs; uses string scanning and regexes

import type { CreateRecipeInput } from '@/lib/recipes/recipe-database-service'

function extractJsonLdBlocks(html: string): any[] {
  const blocks: any[] = []
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const raw = (m[1] || '').trim()
    try {
      const json = JSON.parse(raw)
      blocks.push(json)
    } catch {}
  }
  return blocks
}

function findRecipeJson(json: any): any | null {
  const isRecipe = (obj: any) => {
    const t = obj && (obj['@type'] || obj.type)
    if (!t) return false
    if (Array.isArray(t)) return t.map(String).some(v => v.toLowerCase() === 'recipe')
    return String(t).toLowerCase() === 'recipe'
  }
  if (!json) return null
  if (Array.isArray(json)) {
    for (const j of json) {
      const r = findRecipeJson(j)
      if (r) return r
    }
  } else if (isRecipe(json)) {
    return json
  } else if (json['@graph'] && Array.isArray(json['@graph'])) {
    for (const j of json['@graph']) {
      const r = findRecipeJson(j)
      if (r) return r
    }
  }
  return null
}

function parseIsoDurationToMinutes(iso?: string): number {
  if (!iso || typeof iso !== 'string') return 0
  // Very simple PT#H#M pattern parser
  const m = iso.match(/P(T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/i)
  if (!m) return 0
  const h = m[2] ? parseInt(m[2]!, 10) : 0
  const mm = m[3] ? parseInt(m[3]!, 10) : 0
  return h * 60 + mm
}

function normalizeText(s?: string): string {
  return (s || '').replace(/\s+/g, ' ').trim()
}

function parseIngredientLine(line: string): { amount: number; unit: string; name: string } {
  const txt = normalizeText(line).replace(/^[-•\*]\s*/, '')
  // capture leading quantity (supports fractions like 1/2 or unicode ½)
  const fracMap: Record<string,string> = { '½':'1/2','¼':'1/4','¾':'3/4','⅓':'1/3','⅔':'2/3','⅛':'1/8' }
  const replaced = txt.replace(/[½¼¾⅓⅔⅛]/g, (ch) => fracMap[ch] || ch)
  const m = replaced.match(/^((\d+\s+\d+\/\d+)|(\d+\/\d+)|(\d+))(\s+([a-zA-Z\.]+))?\s+(.*)$/)
  if (m) {
    const qtyStr = m[2] || m[3] || m[4] || '1'
    let qty = 0
    if (qtyStr.includes('/')) {
      const [a,b] = qtyStr.trim().split(' ')
      if (b && b.includes('/')) {
        const [n,d] = b.split('/')
        qty = parseInt(a || '0',10) + (parseFloat(n || '0')/parseFloat(d || '1'))
      } else {
        const [n,d] = qtyStr.split('/')
        qty = parseFloat(n || '0')/parseFloat(d || '1')
      }
    } else {
      qty = parseFloat(qtyStr)
    }
    const unit = String(m[6] || '').toLowerCase()
    const name = normalizeText(String(m[7] || ''))
    return { amount: isFinite(qty) ? qty : 1, unit: unit || 'each', name }
  }
  return { amount: 1, unit: 'each', name: txt }
}

function pickTitle(html: string): string {
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (t) return normalizeText(t[1] || '')
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  if (h1) return normalizeText(h1[1] || '')
  return 'Imported Recipe'
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, ' ')
}

function extractSectionList(html: string, headingRegex: RegExp): string[] | null {
  const idx = html.search(headingRegex)
  if (idx === -1) return null
  const sub = html.slice(idx)
  // prefer ul/ol
  const list = sub.match(/<(ul|ol)[^>]*>([\s\S]*?)<\/\1>/i)
  if (list) {
    const items: string[] = []
    const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi
    const listHtml = String(list[2] || '')
    let m: RegExpExecArray | null
    while ((m = liRe.exec(listHtml)) !== null) {
      const mm = m as RegExpExecArray
      items.push(normalizeText(stripTags(String(mm[1] || ''))))
    }
    if (items.length) return items
  }
  // fallback: capture paragraphs until next heading
  const para = sub.match(/<p[^>]*>([\s\S]*?)<\/p>/gi)
  if (para && para.length) return para.map(p => normalizeText(stripTags(p)))
  return null
}

export function parseRecipeFromHtml(url: string, html: string): { recipe?: CreateRecipeInput; reason?: string } {
  try {
    const blocks = extractJsonLdBlocks(html)
    for (const b of blocks) {
      const r = findRecipeJson(b)
      if (r) {
        const name = normalizeText(r.name || r.headline || pickTitle(html))
        const description = normalizeText(r.description || '')
        const ingredientsRaw: string[] = Array.isArray(r.recipeIngredient) ? r.recipeIngredient : []
        const instructionsRaw: any = r.recipeInstructions || []
        const ingredients = ingredientsRaw.map((line: string, i: number) => {
          const parsed = parseIngredientLine(line)
          return {
            id: `ing_${i+1}`,
            name: parsed.name,
            amount: parsed.amount,
            unit: parsed.unit,
            culturalName: undefined,
            substitutes: [],
            costPerUnit: 0,
            availability: [],
          }
        })
        const instructions = (() => {
          if (Array.isArray(instructionsRaw)) {
            return instructionsRaw.map((it: any, i: number) => ({
              step: (i+1),
              description: normalizeText(it?.text || it?.name || String(it)),
            }))
          }
          return []
        })()
        const prepTime = parseIsoDurationToMinutes(r.prepTime)
        const cookTime = parseIsoDurationToMinutes(r.cookTime)
        const totalTime = parseIsoDurationToMinutes(r.totalTime) || (prepTime + cookTime)
        const servings = (() => {
          const y = normalizeText(r.recipeYield || '')
          const m = y.match(/(\d+)/)
          return m ? parseInt(m[1]!, 10) : 4
        })()

        const recipe: CreateRecipeInput = {
          title: name,
          description,
          culturalOrigin: [],
          cuisine: 'international',
          ingredients,
          instructions,
          metadata: {
            servings,
            prepTime,
            cookTime,
            totalTime,
            difficulty: 'medium',
            culturalAuthenticity: 0,
          },
          tags: [],
          source: 'user',
        }
        return { recipe }
      }
    }

    // Heuristic fallback
    const title = pickTitle(html)
    const ingredientsList = extractSectionList(html, /ingredients?/i) || []
    const instructionsList = extractSectionList(html, /(instructions?|directions?|method)/i) || []

    if (ingredientsList.length && instructionsList.length) {
      const ingredients = ingredientsList.map((line, i) => {
        const parsed = parseIngredientLine(line)
        return {
          id: `ing_${i+1}`,
          name: parsed.name,
          amount: parsed.amount,
          unit: parsed.unit,
          culturalName: undefined,
          substitutes: [],
          costPerUnit: 0,
          availability: [],
        }
      })
      const instructions = instructionsList.map((d, i) => ({ step: i+1, description: d }))

      const recipe: CreateRecipeInput = {
        title,
        description: '',
        culturalOrigin: [],
        cuisine: 'international',
        ingredients,
        instructions,
        metadata: {
          servings: 4,
          prepTime: 0,
          cookTime: 0,
          totalTime: 0,
          difficulty: 'medium',
          culturalAuthenticity: 0,
        },
        tags: [],
        source: 'user',
      }
      return { recipe }
    }

    return { reason: 'no-structured-data-and-heuristics-failed' }
  } catch (e: any) {
    return { reason: e?.message || 'parse-error' }
  }
}
