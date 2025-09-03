import type { Ingredient } from '@/types'

export type NormalizeOptions = {
  preferFreshProduce?: boolean
}

const containerWords = ['can', 'cans', 'jar', 'jars', 'bottle', 'bottles', 'pkg', 'package', 'packages', 'bag', 'bags']

function removeContainerWords(s: string): string {
  let out = s
  // remove patterns like "can of", "jar of"
  out = out.replace(/\b(can|cans|jar|jars|bottle|bottles|pkg|package|packages|bag|bags)\s+of\s+/gi, '')
  // remove trailing container word when it appears as noise
  out = out.replace(new RegExp(`\b(${containerWords.join('|')})\b`, 'gi'), '').replace(/\s{2,}/g, ' ')
  return out.trim()
}

function normalizeNameBase(name: string, opts: NormalizeOptions): string {
  let n = name.trim()
  n = removeContainerWords(n)

  // Fix common misreads
  n = n.replace(/\bmash\s+potatoes\b/gi, 'mashed potatoes')

  // Prefer fresh: convert phrasing to fresh intent without changing quantity semantics
  if (opts.preferFreshProduce) {
    n = n.replace(/\bfresh\s*lemon\s*juice\b/gi, 'lemon juice')
    n = n.replace(/\bfresh\s*lime\s*juice\b/gi, 'lime juice')
  }

  // If the name starts with a prep word (minced, mashed, chopped), move it to end-style
  n = n.replace(/^(minced|mashed|chopped|diced)\s+/i, (_m, p1) => '')
  return n.trim()
}

export function normalizeIngredient(ing: Ingredient, opts: NormalizeOptions = {}): Ingredient {
  const preferFresh = opts.preferFreshProduce ?? true
  const unit = ing.unit && containerWords.includes(ing.unit.toLowerCase()) ? '' : (ing.unit || '')
  const name = normalizeNameBase(ing.name || '', { preferFreshProduce: preferFresh })

  // Basic yield/weight heuristics for common produce
  const base = name.toLowerCase()
  let weightGrams: number | undefined
  let wholeEquivalent: string | undefined

  const cups = /\bcups?\b/.test(unit) ? ing.amount : undefined
  const tbsp = /\b(tbsp|tablespoon|tablespoons)\b/.test(unit) ? ing.amount : undefined
  const tsp = /\b(tsp|teaspoon|teaspoons)\b/.test(unit) ? ing.amount : undefined
  const count = (!unit || /^(small|medium|large|clove|cloves|sprig|sprigs|each)$/i.test(unit)) ? ing.amount : undefined

  const round = (n: number) => Math.round(n * 10) / 10
  const plural = (n: number, w: string, s: string = w + 's') => `${n === 1 ? '1' : Math.round(n)} ${n === 1 ? w : s}`

  // Tables for a few frequent items
  const gramPerCup: Record<string, number> = {
    onion: 160, // chopped
    carrot: 128, // chopped
    tomato: 180, // chopped
    celery: 101, // chopped
    'bell pepper': 150, // chopped
    potato: 210, // diced
  }
  const itemsPerCup: Record<string, number> = {
    onion: 1,
    carrot: 3,
    tomato: 2,
    celery: 2, // stalks
    'bell pepper': 1,
    potato: 1.5,
  }
  const gramsPerEach: Record<string, number> = {
    onion: 150,
    carrot: 60,
    tomato: 120,
    'bell pepper': 120,
    potato: 170,
    garlic: 3, // per clove
    lemon: 90,
    lime: 70,
  }

  const match = (keys: string[]) => keys.find(k => base.includes(k))
  const key = match(Object.keys(gramPerCup).concat(Object.keys(gramsPerEach)))

  if (key && typeof ing.amount === 'number') {
    if (cups && gramPerCup[key] != null) {
      weightGrams = round(cups * gramPerCup[key])
      if (itemsPerCup[key]) {
        const items = cups * itemsPerCup[key]
        wholeEquivalent = `≈ ${plural(items, key === 'celery' ? 'stalk' : 'medium ' + key)}`
      }
    } else if (count && gramsPerEach[key] != null) {
      weightGrams = round(count * gramsPerEach[key])
    }
  }

  // Lemon/lime juice: estimate whole fruit equivalents
  if ((base.includes('lemon juice') || base === 'lemon') && (tbsp || cups)) {
    const totalTbsp = (tbsp || 0) + (cups || 0) * 16 + (tsp || 0) / 3
    if (totalTbsp > 0) {
      const lemons = totalTbsp / 2 // ≈2 tbsp juice per lemon
      wholeEquivalent = `≈ ${plural(lemons, 'lemon')}`
      weightGrams = round(lemons * (gramsPerEach.lemon || 90))
    }
  }
  if ((base.includes('lime juice') || base === 'lime') && (tbsp || cups)) {
    const totalTbsp = (tbsp || 0) + (cups || 0) * 16 + (tsp || 0) / 3
    if (totalTbsp > 0) {
      const limes = totalTbsp / 2.5 // ≈2.5 tbsp per lime
      wholeEquivalent = `≈ ${plural(limes, 'lime')}`
      weightGrams = round(limes * (gramsPerEach.lime || 70))
    }
  }

  return {
    ...ing,
    name,
    unit,
    weightGrams: weightGrams ?? ing.weightGrams,
    wholeEquivalent: wholeEquivalent ?? ing.wholeEquivalent,
  }
}

export function normalizeIngredients(ings: Ingredient[], opts: NormalizeOptions = {}): Ingredient[] {
  return ings.map(i => normalizeIngredient(i, opts))
}
