import type { Ingredient } from '@/types'

type PriceMap = {
  perKg?: Record<string, number>
  perEach?: Record<string, number>
  perLiter?: Record<string, number>
}

const PRICE_MAP: PriceMap = {
  perKg: {
    onion: 2.2,
    carrot: 2.0,
    tomato: 3.5,
    celery: 2.8,
    'bell pepper': 4.0,
    'pepper': 4.0,
    potato: 1.8,
    garlic: 8.0,
    'garlic, minced': 8.0,
    'minced garlic': 8.0,
    lemon: 3.0,
    lime: 3.5,
    chicken: 6.5,
    'whole chicken': 4.5,
    'chicken breast': 8.0,
    'chicken thighs': 5.5,
    beef: 12.0,
    'ground beef': 8.0,
    pork: 6.0,
    rice: 2.5,
    'cooked rice': 3.5,
    'white rice': 2.5,
    'brown rice': 3.0,
    beans: 2.5,
    flour: 1.5,
    sugar: 1.2,
    butter: 8.0,
    cheese: 9.0,
    salt: 0.8,
    oil: 6.0,
    'vegetable oil': 5.5,
    'olive oil': 12.0,
    'cooking oil': 5.5,
    ketchup: 3.5,
    'tomato ketchup': 3.5,
    mustard: 3.0,
    mayonnaise: 4.5,
  },
  perEach: {
    egg: 0.3,
    lemon: 0.6,
    lime: 0.5,
    onion: 0.5,
    'bell pepper': 1.5,
    tomato: 0.8,
    potato: 0.4,
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

  // Fallback: generic produce rate $3.5/kg for better estimates
  if (grams != null) return (grams / 1000) * 3.5
  
  // Final fallback based on common amounts - better estimates
  if (ing.amount <= 2) return ing.amount * 3.5 // Small quantities like 2 onions = $7
  if (ing.amount <= 5) return ing.amount * 2.5 // Medium quantities  
  return ing.amount * 1.8 // Large quantities
}

export function estimateRecipeCost(ingredients: Ingredient[], servings: number): { totalCost: number; costPerServing: number } {
  const total = ingredients.reduce((sum, ing) => sum + estimateIngredientCost(ing), 0)
  const per = servings > 0 ? total / servings : total
  return { totalCost: round2(total), costPerServing: round2(per) }
}

function round2(n: number): number { return Math.round(n * 100) / 100 }

