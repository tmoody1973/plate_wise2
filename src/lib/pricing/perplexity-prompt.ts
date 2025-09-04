export type BuildPerplexityPromptOptions = {
  ingredient?: string // For single ingredient (legacy)
  ingredients?: Array<{name: string; amount: number; unit: string}> // For multiple ingredients
  zip: string
  context?: string
  amount?: number
  unit?: string
  city?: string
  defaultStore?: string
  preferredStores?: string[]
  compact?: boolean // If true, return only best option per ingredient (and at most 1 alternative)
}

// Builds the Perplexity pricing prompt with explicit grocery chains and requirements
export function buildPerplexityPrompt(opts: BuildPerplexityPromptOptions): string {
  const location = opts.zip
  const culturalContext = opts.context ?? 'general'
  const city = opts.city ?? ''
  const defaultStoreName = opts.defaultStore ?? ''
  const preferredStores = Array.isArray(opts.preferredStores) ? opts.preferredStores.filter(Boolean) : []

  // Handle multiple ingredients or single ingredient (batch preferred)
  let ingredientSection = ''
  if (opts.ingredients && opts.ingredients.length > 0) {
    ingredientSection = `Find current grocery prices for these ingredients in ZIP ${location} (city: ${city}). Use ONLY MAJOR GROCERY CHAINS that actually operate in ${city}:

${opts.ingredients.map((ing, i) => `- { "name": "${ing.name}", "amount": ${ing.amount}, "unit": "${ing.unit}" }`).join('\n')}`
  } else if (opts.ingredient) {
    const amount = opts.amount ?? 1
    const unit = opts.unit ?? 'unit'
    ingredientSection = `Find current grocery prices for "${opts.ingredient}" (amount: ${amount} ${unit}) in ZIP ${location} (city: ${city}). Use ONLY MAJOR GROCERY CHAINS that actually operate in ${city}.`
  }

  // Major chains restriction list
  const majorChains = [
    "Walmart","Target","Kroger","Publix","Safeway","Albertsons","Aldi","Costco","Sam's Club",
    "Whole Foods Market","Trader Joe's","Meijer","H‑E‑B","Food Lion","Giant","Stop & Shop",
    "Winn‑Dixie","Ralphs","Vons","Fred Meyer","Harris Teeter","Hy‑Vee","Wegmans"
  ]

  const compactNote = opts.compact
    ? 'Return only the BEST chain option per ingredient. If absolutely necessary, include at most 1 alternative in "options".'
    : 'The top-level entry per ingredient should be the BEST option (lowest portionCost). Provide 2–5 additional chain choices in "options", sorted by portionCost.'

  return `${ingredientSection}

Find current grocery prices at major chains in ${city}.

Return JSON array with one object per ingredient:
[{
  "ingredient": "exact ingredient name",
  "storeName": "major chain name", 
  "productName": "specific product",
  "packageSize": "size with unit",
  "packagePrice": 0.00,
  "portionCost": 0.00,
  "storeType": "mainstream"
}]

Requirements:
- Use major chains only (Walmart, Target, Kroger, Publix, etc.)
- Different productName for each ingredient
- Calculate portionCost from packagePrice and recipe amount
- Return ONLY JSON array, no other text`
}
