// Lightweight ingredient normalization, query building, and product scoring for Kroger API

export type IngredientInput = { name: string; amount: number; unit: string }

const STOPWORDS = new Set([
  'fresh','chopped','diced','minced','organic','large','small','medium','skinless','boneless','low','sodium','unsalted','salted','ground','whole','can','canned','pack','package','jar','cup','cups','tbsp','tablespoon','tsp','teaspoon','of'
])

const SYNONYMS: Record<string, string[]> = {
  cilantro: ['coriander', 'fresh cilantro'],
  coriander: ['cilantro', 'fresh coriander'], 
  'coriander leaves': ['cilantro', 'fresh cilantro', 'fresh coriander'],
  scallion: ['green onion','spring onion'],
  scallions: ['green onions','spring onions'],
  chickpeas: ['garbanzo beans','garbanzo'],
  zucchini: ['courgette'],
  eggplant: ['aubergine'],
  bell: ['capsicum'],
  chili: ['chilli','chile'],
  onion: ['yellow onion', 'white onion'],
  'red onion': ['red onions'],
  'white onion': ['white onions'],
  'yellow onion': ['yellow onions'],
  // Nuts & seeds common synonyms / alt spellings
  'pine': ['pignoli','pignolia','pine nut','pine nuts','pignolia nuts','pignoli nuts'],
  'pine nut': ['pignoli','pignolia','pine nuts'],
  'pine nuts': ['pignoli','pignolia','pine nut'],
  'sunflower seeds': ['sunflower seed'],
  'pumpkin seeds': ['pepitas','pumpkin seed'],
  'sesame seeds': ['sesame seed','tahini seeds'],
  almonds: ['almond'],
  cashews: ['cashew'],
  walnuts: ['walnut'],
}

const FORM_HINTS = ['canned','low sodium','unsalted','boneless','skinless','ground','whole']

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t && !STOPWORDS.has(t))
    .join(' ')
}

export function extractHints(original: string) {
  const lower = original.toLowerCase()
  const hints: string[] = []
  for (const hint of FORM_HINTS) {
    if (lower.includes(hint)) hints.push(hint)
  }
  return hints
}

export function expandSynonyms(tokens: string[]): string[] {
  const expanded = new Set<string>(tokens)
  for (const t of tokens) {
    const list = SYNONYMS[t]
    if (list) list.forEach(s => expanded.add(s))
  }
  return Array.from(expanded)
}

export function classifyCategory(ingredient: string): 'produce'|'pantry'|'dairy'|'meat'|'bakery'|'frozen'|'other' {
  const s = ingredient.toLowerCase()
  if (/(tomato|onion|garlic|pepper|lettuce|spinach|cilantro|basil|apple|banana|lemon|lime|carrot|cucumber)/.test(s)) return 'produce'
  if (/(flour|rice|pasta|beans|chickpea|garbanzo|oil|vinegar|spice|salt|sugar|canned)/.test(s)) return 'pantry'
  if (/(milk|cheese|yogurt|butter|cream)/.test(s)) return 'dairy'
  if (/(chicken|beef|pork|turkey|fish|salmon)/.test(s)) return 'meat'
  if (/(bread|bun|roll|bagel|tortilla)/.test(s)) return 'bakery'
  if (/(frozen)/.test(s)) return 'frozen'
  return 'other'
}

export function buildSearchTerms(ingredient: IngredientInput): string[] {
  const normalized = normalize(ingredient.name)
  const tokens = normalized.split(' ').filter(Boolean)
  const hints = extractHints(ingredient.name)
  const expanded = expandSynonyms(tokens)

  const primary = [...expanded, ...hints].join(' ').trim()
  const generic = expanded.join(' ').trim()

  // Deduplicate and prefer longer first
  return Array.from(new Set([primary, generic])).sort((a,b)=>b.length-a.length).slice(0,3)
}

export function tokenSetSimilarity(a: string, b: string): number {
  const A = new Set(normalize(a).split(' ').filter(Boolean))
  const B = new Set(normalize(b).split(' ').filter(Boolean))
  if (A.size === 0 || B.size === 0) return 0
  let inter = 0
  for (const t of A) if (B.has(t)) inter++
  const union = new Set<string>([...A, ...B]).size
  return inter / union
}

export function sizeProximity(requestQty: number, requestUnit: string, product: any): number {
  // Try to parse size from kroger product item size field: e.g., "15 oz", "500 g"
  const size: string | undefined = product?.items?.[0]?.size || product?.size
  if (!size) return 0.2
  const m = size.match(/([\d.]+)\s*(oz|ounce|ounces|lb|pound|g|gram|kg|kilogram|ml|milliliter|l|liter|ct|count)/i)
  if (!m) return 0.2
  const qty = parseFloat(m[1]!)
  const unit = String(m[2]).toLowerCase()
  const toG = (q: number, u: string) => {
    switch (u) {
      case 'g': case 'gram': return q
      case 'kg': case 'kilogram': return q*1000
      case 'oz': case 'ounce': case 'ounces': return q*28.3495
      case 'lb': case 'pound': return q*453.592
      default: return NaN
    }
  }
  const toMl = (q: number, u: string) => {
    switch (u) {
      case 'ml': case 'milliliter': return q
      case 'l': case 'liter': return q*1000
      // treat oz as fluid oz for rough proximity
      case 'oz': return q*29.5735
      default: return NaN
    }
  }
  const reqUnit = requestUnit.toLowerCase()
  let ratio = 1
  if (/(g|gram|kg|kilogram)/.test(reqUnit) && !isNaN(toG(qty, unit))) {
    const reqG = toG(requestQty, reqUnit)
    const prodG = toG(qty, unit)
    if (reqG && prodG) ratio = reqG / prodG
  } else if (/(ml|milliliter|l|liter)/.test(reqUnit) && !isNaN(toMl(qty, unit))) {
    const reqMl = toMl(requestQty, reqUnit)
    const prodMl = toMl(qty, unit)
    if (reqMl && prodMl) ratio = reqMl / prodMl
  } else {
    // unknown units: approximate each
    return 0.2
  }
  // closeness around 1.0 is best
  const closeness = Math.max(0, Math.min(1, 1 / (1 + Math.abs(Math.log(ratio)))))
  return closeness
}

export interface ScoreBreakdown {
  titleSim: number
  sizeProximity: number
  categoryMatched: boolean
  categoryHint?: string
  availability: string
  promo: boolean
  soupPenaltyApplied: boolean
  price: number
  score: number
}

export function scoreProduct(ingredient: IngredientInput, product: any, categoryHint?: string): number {
  const title = product?.description || product?.items?.[0]?.description || ''
  const sim = tokenSetSimilarity(ingredient.name, title)
  const price = product?.items?.[0]?.price?.promo ?? product?.items?.[0]?.price?.regular ?? 0
  const availability = product?.items?.[0]?.inventory?.stockLevel || 'unknown'
  const promo = product?.items?.[0]?.price?.promo ? 1 : 0
  const sizeScore = sizeProximity(ingredient.amount, ingredient.unit, product)
  const availabilityPenalty = availability.toLowerCase().includes('out') ? -0.2 : 0
  const catBoost = categoryHint && product?.categories?.some?.((c: string) => c.toLowerCase().includes(categoryHint)) ? 0.2 : 0
  const priceWeight = price > 0 ? 0.05 : 0
  const wrongSoupPenalty = categoryHint === 'produce' && /soup/i.test(title) ? -0.5 : 0
  // composite score
  return 0.5*sim + 0.2*sizeScore + catBoost + availabilityPenalty + priceWeight + 0.05*promo + wrongSoupPenalty
}

function calculateWrongTypePenalty(ingredientName: string, productTitle: string): number {
  const ingredient = normalize(ingredientName).toLowerCase()
  const title = productTitle.toLowerCase()
  
  // Define ingredient type groups that shouldn't match each other
  const HERB_KEYWORDS = ['cilantro', 'coriander', 'parsley', 'basil', 'oregano', 'thyme', 'rosemary', 'sage', 'mint']
  const ONION_KEYWORDS = ['onion', 'red onion', 'white onion', 'yellow onion', 'sweet onion', 'shallot']
  const VEGETABLE_KEYWORDS = ['carrot', 'celery', 'bell pepper', 'tomato', 'cucumber', 'lettuce']
  
  // Check if ingredient is herb but product is onion (major mismatch)
  const isHerbIngredient = HERB_KEYWORDS.some(herb => ingredient.includes(herb))
  const isOnionProduct = ONION_KEYWORDS.some(onion => title.includes(onion))
  
  if (isHerbIngredient && isOnionProduct) {
    return -0.8 // Heavy penalty for herbs matching onions
  }
  
  // Check if ingredient is onion but product is herb
  const isOnionIngredient = ONION_KEYWORDS.some(onion => ingredient.includes(onion))
  const isHerbProduct = HERB_KEYWORDS.some(herb => title.includes(herb))
  
  if (isOnionIngredient && isHerbProduct) {
    return -0.8 // Heavy penalty for onions matching herbs
  }
  
  return 0
}

function calculateCategoryMismatchPenalty(ingredientName: string, productTitle: string, categoryHint?: string): number {
  const ingredient = normalize(ingredientName).toLowerCase()
  const title = productTitle.toLowerCase()
  
  // If we expect produce but get something clearly non-produce
  if (categoryHint === 'produce') {
    if (title.includes('sauce') || title.includes('seasoning') || title.includes('powder')) {
      return -0.4
    }
  }
  
  // Prevent leafy herbs from matching root vegetables
  const LEAFY_HERBS = ['cilantro', 'coriander', 'parsley', 'basil', 'lettuce', 'spinach']
  const ROOT_VEGETABLES = ['onion', 'carrot', 'potato', 'turnip', 'radish']
  
  const isLeafyHerb = LEAFY_HERBS.some(herb => ingredient.includes(herb))
  const isRootVeg = ROOT_VEGETABLES.some(root => title.includes(root))
  
  if (isLeafyHerb && isRootVeg) {
    return -0.6
  }
  
  return 0
}

export function scoreProductDetailed(ingredient: IngredientInput, product: any, categoryHint?: string): ScoreBreakdown {
  const title = product?.description || product?.items?.[0]?.description || ''
  const brand = (product?.brand || '').toLowerCase()
  const sim = tokenSetSimilarity(ingredient.name, title)
  const price = product?.items?.[0]?.price?.promo ?? product?.items?.[0]?.price?.regular ?? 0
  const availability = String(product?.items?.[0]?.inventory?.stockLevel || 'unknown')
  const promo = Boolean(product?.items?.[0]?.price?.promo)
  const size = sizeProximity(ingredient.amount, ingredient.unit, product)
  const categoryMatched = Boolean(categoryHint && product?.categories?.some?.((c: string) => c.toLowerCase().includes(categoryHint)))
  const availabilityPenalty = availability.toLowerCase().includes('out') ? -0.2 : 0
  const catBoost = categoryMatched ? 0.2 : 0
  const priceWeight = price > 0 ? 0.05 : 0
  const soupPenaltyApplied = categoryHint === 'produce' && /soup/i.test(title)
  const wrongSoupPenalty = soupPenaltyApplied ? -0.5 : 0
  // Flavor penalty: avoid flavored variants when ingredient is generic
  const FLAVOR_TOKENS = ['chocolate','oreo','graham','vanilla','pumpkin','ginger','spice','strawberry','lemon']
  const ingredientTokens = new Set(normalize(ingredient.name).split(' '))
  const lowerTitle = title.toLowerCase()
  let flavorPenalty = 0
  for (const tok of FLAVOR_TOKENS) {
    if (lowerTitle.includes(tok) && !ingredientTokens.has(tok)) {
      flavorPenalty -= 0.3
    }
  }
  
  // Wrong ingredient type penalty: prevent major mismatches
  const wrongTypePenalty = calculateWrongTypePenalty(ingredient.name, title)
  
  // Category mismatch penalty: e.g., herbs shouldn't match onions
  const categoryMismatchPenalty = calculateCategoryMismatchPenalty(ingredient.name, title, categoryHint)
  // Brand boost for generics (budget friendly)
  let brandBoost = 0
  if (brand.includes('kroger') || brand.includes('simple truth')) {
    brandBoost += 0.08
  }
  const score = 0.5*sim + 0.2*size + catBoost + availabilityPenalty + priceWeight + (promo ? 0.05 : 0) + wrongSoupPenalty + flavorPenalty + brandBoost + wrongTypePenalty + categoryMismatchPenalty
  return {
    titleSim: sim,
    sizeProximity: size,
    categoryMatched,
    categoryHint,
    availability,
    promo,
    soupPenaltyApplied,
    price,
    score,
  }
}
