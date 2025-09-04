import type { Ingredient } from '@/types'

type PriceMap = {
  perKg?: Record<string, number>
  perEach?: Record<string, number>
  perLiter?: Record<string, number>
}

const PRICE_MAP: PriceMap = {
  perKg: {
    onion: 4.4,
    carrot: 3.8,
    tomato: 6.6,
    celery: 5.5,
    'bell pepper': 8.8,
    'pepper': 8.8,
    potato: 3.3,
    garlic: 15.4,
    'garlic, minced': 15.4,
    'minced garlic': 15.4,
    lemon: 6.6,
    lime: 7.7,
    chicken: 15.4,
    'whole chicken': 8.8,
    'chicken breast': 19.8,
    'chicken thighs': 13.2,
    beef: 28.6,
    'ground beef': 17.6,
    pork: 13.2,
    rice: 4.4,
    'cooked rice': 6.6,
    'white rice': 4.4,
    'brown rice': 5.5,
    beans: 4.4,
    flour: 2.2,
    sugar: 2.2,
    butter: 17.6,
    cheese: 22.0,
    salt: 1.1,
    oil: 11.0,
    'vegetable oil': 8.8,
    'olive oil': 26.4,
    'cooking oil': 8.8,
    ketchup: 6.6,
    'tomato ketchup': 6.6,
    mustard: 5.5,
    mayonnaise: 8.8,
    // Add more common ingredients
    'anchovy fillets': 44.0,
    'anchovies': 44.0,
    'lemon juice': 11.0,
    'fresh garlic': 15.4,
    'parmesan cheese': 33.0,
    'olive oil extra virgin': 30.0,
  },
  perEach: {
    egg: 0.5,
    'egg yolk': 0.25, // Half the cost of a whole egg since you use half
    'egg white': 0.25, // Same logic
    lemon: 1.2,
    lime: 0.8,
    onion: 0.8,
    'bell pepper': 2.5,
    tomato: 1.5,
    potato: 0.6,
    'garlic clove': 0.1,
    'garlic': 0.1,
    'anchovy fillet': 0.8,
    'lemon juice': 0.1, // Small portion of a whole lemon
  },
  perLiter: {
    milk: 1.0,
    oil: 6.0,
    'vegetable oil': 5.5,
    'olive oil': 12.0,
    'cooking oil': 5.5,
    water: 0,
  },
}

const GRAMS_PER_EACH: Record<string, number> = {
  onion: 150,
  carrot: 60,
  tomato: 120,
  'bell pepper': 120,
  potato: 170,
  garlic: 3, // clove
  egg: 50,
  lemon: 90,
  lime: 70,
}

const GRAMS_PER_CUP: Record<string, number> = {
  onion: 160,
  carrot: 128,
  tomato: 180,
  celery: 101,
  'bell pepper': 150,
  potato: 210,
  rice: 185, // uncooked
  flour: 120,
  sugar: 200,
  butter: 227, // 1 cup ≈ 227g
  cheese: 113, // shredded
  oil: 218, // ≈218g
  beans: 175, // cooked
}

function matchKey(name: string, dict: Record<string, any>): string | undefined {
  const lower = name.toLowerCase().trim()
  
  // First try exact match
  if (dict[lower]) return lower
  
  // Handle common variations and plurals for eggs
  if (lower.includes('egg yolk') || lower === 'yolk' || lower === 'yolks') {
    if (dict['egg yolk']) return 'egg yolk'
  }
  if (lower.includes('egg white') || lower === 'white' || lower === 'whites') {
    if (dict['egg white']) return 'egg white'
  }
  
  // Handle lemon/lime juice - people buy whole lemons/limes
  if (lower.includes('lemon juice') || lower === 'lemon juice') {
    if (dict['lemon juice']) return 'lemon juice'
    if (dict['lemon']) return 'lemon' // fallback to whole lemon
  }
  if (lower.includes('lime juice') || lower === 'lime juice') {
    if (dict['lime juice']) return 'lime juice'  
    if (dict['lime']) return 'lime' // fallback to whole lime
  }
  
  // Handle garlic derivatives
  if (lower.includes('garlic clove') || lower.includes('clove of garlic')) {
    if (dict['garlic clove']) return 'garlic clove'
  }
  if (lower.includes('minced garlic') || lower.includes('garlic, minced')) {
    if (dict['garlic']) return 'garlic'
  }
  
  // Then try to find if any key is contained in the name
  const found = Object.keys(dict).find(k => lower.includes(k))
  if (found) return found
  
  // Try to find if the name contains any key
  return Object.keys(dict).find(k => k.includes(lower.split(' ')[0]))
}

function toMl(amount: number, unit: string): number | null {
  const u = unit.toLowerCase()
  if (u === 'l' || u === 'liter' || u === 'liters') return amount * 1000
  if (u === 'ml' || u === 'milliliter' || u === 'milliliters') return amount
  if (u === 'cup' || u === 'cups') return amount * 240
  if (u === 'tbsp' || u === 'tablespoon' || u === 'tablespoons') return amount * 15
  if (u === 'tsp' || u === 'teaspoon' || u === 'teaspoons') return amount * 5
  return null
}

function toGrams(ing: Ingredient): number | null {
  if (typeof ing.weightGrams === 'number' && ing.weightGrams > 0) return ing.weightGrams
  const key = matchKey(ing.name, { ...GRAMS_PER_CUP, ...GRAMS_PER_EACH })
  if (!key) {
    // try liquid ml → g
    const ml = toMl(ing.amount, ing.unit)
    if (ml != null) return ml // assume ~1 g/ml
    return null
  }
  if (/cups?/i.test(ing.unit) && GRAMS_PER_CUP[key] != null) return ing.amount * GRAMS_PER_CUP[key]
  if (!ing.unit || /^(each|small|medium|large|clove|cloves|sprig|sprigs)$/i.test(ing.unit)) {
    const gramsEach = GRAMS_PER_EACH[key]
    if (gramsEach != null) return Math.max(1, Math.round(ing.amount)) * gramsEach
  }
  // Last resort: treat as 1 g/ml conversions or 1 cup ≈ 240 ml
  const ml = toMl(ing.amount, ing.unit)
  if (ml != null) return ml
  return null
}

export function estimateIngredientCost(ing: Ingredient): number {
  const grams = toGrams(ing)
  const keyKg = grams != null ? matchKey(ing.name, PRICE_MAP.perKg || {}) : undefined
  const keyEach = (!ing.unit || /^(each|small|medium|large|clove|cloves)$/i.test(ing.unit)) ? matchKey(ing.name, PRICE_MAP.perEach || {}) : undefined
  const keyLiter = toMl(ing.amount, ing.unit) != null ? matchKey(ing.name, PRICE_MAP.perLiter || {}) : undefined

  if (grams != null && keyKg && PRICE_MAP.perKg) {
    return (grams / 1000) * (PRICE_MAP.perKg[keyKg] || 0)
  }
  if (keyLiter && PRICE_MAP.perLiter) {
    const ml = toMl(ing.amount, ing.unit) || 0
    return (ml / 1000) * (PRICE_MAP.perLiter[keyLiter] || 0)
  }
  if (keyEach && PRICE_MAP.perEach) {
    const count = !ing.unit || /^(each|small|medium|large|clove|cloves)$/i.test(ing.unit) ? Math.max(1, Math.round(ing.amount)) : ing.amount
    return (PRICE_MAP.perEach[keyEach] || 0) * count
  }

  // Fallback: realistic produce rate $8/kg (doubled for realistic grocery prices)
  if (grams != null) return (grams / 1000) * 8.0
  
  // Final fallback based on common amounts - realistic grocery prices
  if (ing.amount <= 1) return ing.amount * 2.5 // Single items like 1 onion = $2.50
  if (ing.amount <= 3) return ing.amount * 1.8 // Small quantities like 3 eggs = $5.40
  if (ing.amount <= 10) return ing.amount * 1.2 // Medium quantities  
  return ing.amount * 0.8 // Large quantities with bulk discount
}

export function estimateRecipeCost(ingredients: Ingredient[], servings: number): { totalCost: number; costPerServing: number } {
  const total = ingredients.reduce((sum, ing) => sum + estimateIngredientCost(ing), 0)
  const per = servings > 0 ? total / servings : total
  return { totalCost: round2(total), costPerServing: round2(per) }
}

function round2(n: number): number { return Math.round(n * 100) / 100 }

