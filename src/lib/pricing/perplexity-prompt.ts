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
}

// Builds the Perplexity pricing prompt with explicit grocery chains and requirements
export function buildPerplexityPrompt(opts: BuildPerplexityPromptOptions): string {
  const location = opts.zip
  const culturalContext = opts.context ?? 'general'
  const city = opts.city ?? ''
  const defaultStoreName = opts.defaultStore ?? ''
  const preferredStores = Array.isArray(opts.preferredStores) ? opts.preferredStores.filter(Boolean) : []

  // Handle multiple ingredients or single ingredient
  let ingredientSection = ''
  if (opts.ingredients && opts.ingredients.length > 0) {
    ingredientSection = `Find current grocery store prices for these ingredients in ZIP code ${location}:

${opts.ingredients.map((ing, i) => `${i + 1}. ${ing.name} - Amount needed: ${ing.amount} ${ing.unit}`).join('\n')}`
  } else if (opts.ingredient) {
    const amount = opts.amount ?? 1
    const unit = opts.unit ?? 'unit'
    ingredientSection = `Find current grocery store prices for "${opts.ingredient}" in ZIP code ${location}.
Amount needed: ${amount} ${unit}`
  }

  return `${ingredientSection}

Cultural context: ${culturalContext}
User city: ${city}
Preferred default store (if present): ${defaultStoreName}
Preferred stores (in priority order, if available): ${preferredStores.join(', ')}

CRITICAL LOCATION REQUIREMENTS:
- ONLY use stores that ACTUALLY EXIST in ${city} or ZIP ${location}
- VERIFY store addresses are real and accurate for the specified location
- Do NOT suggest stores that don't have locations in the specified area
- For Milwaukee/Wisconsin: Use Pick 'n Save, Metro Market, Woodman's, Walmart, Target, Aldi, Meijer, Festival Foods
- Do NOT use H-Mart in Wisconsin (no locations exist there)
- Do NOT use H‑E‑B in Wisconsin (Texas chain only)
- Do NOT use Publix in Wisconsin (Southeast US only)
- Do NOT use Safeway in Wisconsin (not in this market)

Common stores by region:
- Milwaukee/Wisconsin: Pick 'n Save, Metro Market, Woodman's, Festival Foods, Walmart, Target, Aldi, Costco, Sam's Club, Whole Foods, Meijer, Fresh Thyme
- For ethnic ingredients in Milwaukee: Use Cermak Fresh Market, El Rey, Asian International Market, Mo's Irish Pub
- California: Ralphs, Vons, Safeway, Trader Joe's, Whole Foods, Target, Walmart
- Texas: H‑E‑B, Kroger, Walmart, Target
- Southeast: Publix, Kroger, Walmart, Target

For EACH ingredient, find stores that ACTUALLY EXIST at the specified location.

For each ingredient, provide:
1. Store name (MUST exist in ${city})
2. Exact product name
3. Package size and full pack price
4. Price per unit (per pound, per ounce, etc.)
5. Estimated cost for the recipe portion needed
6. REAL store address in ${city} (must be verifiable)
7. Product page URL or authoritative source URL
8. Label the store as storeType: mainstream, ethnic, or specialty

Format output as a JSON ARRAY with one object per ingredient:
[
  {
    "ingredient": "ingredient name from request",
    "storeName": "",
    "productName": "",
    "packageSize": "",
    "packagePrice": 0,
    "unitPrice": "",
    "portionCost": 0,
    "storeType": "mainstream",
    "storeAddress": "",
    "sourceUrl": ""
  }
]

CRITICAL: 
- Return exactly one result per ingredient requested
- ONLY use stores that actually exist in ${city}
- Provide REAL, VERIFIABLE addresses
- If ${defaultStoreName} exists in the area and carries the item, prefer it when costs are similar`
}
