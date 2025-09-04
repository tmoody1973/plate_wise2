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

Cultural context (for naming only): ${culturalContext}
Preferred default store (if present): ${defaultStoreName}
Preferred stores (priority order if available): ${preferredStores.join(', ')}

STRICT STORE POLICY:
- ONLY use these major chains (and only if they have locations in ${city}): ${majorChains.join(', ')}
- Do NOT use independent, specialty, or ethnic-only markets. Ignore H Mart, international markets, and small independents.
- Do NOT invent chains or locations. If a chain is not in ${city}, omit it.

PRICING RULES:
- Compute portionCost for the recipe's amount/unit from the packageSize and packagePrice (e.g., tbsp↔ml, lb↔g). Prefer realistic sizes; if adjusting, reflect in productName.
- Label unitPrice clearly (e.g., "$3.99/lb", "$0.59/oz", "$0.15/tbsp").
- ${compactNote}
- All store addresses must be strings appropriate to ${city} (accept known city-level location strings when a precise street is not available).
- If exact brand/size is unavailable, pick a close chain-brand alternative and note it in productName.

OUTPUT FORMAT (JSON ARRAY ONLY — no prose):
[
  {
    "ingredient": "string",
    "storeName": "string",
    "productName": "string",
    "packageSize": "string",
    "packagePrice": 0,
    "unitPrice": "string",
    "portionCost": 0,
    "storeType": "mainstream",
    "storeAddress": "string",
    "sourceUrl": null,
    "options": [
      {
        "storeName": "string",
        "productName": "string",
        "packageSize": "string",
        "packagePrice": 0,
        "unitPrice": "string",
        "portionCost": 0,
        "storeType": "mainstream",
        "storeAddress": "string",
        "sourceUrl": null
      }
    ]
  }
]

CRITICAL:
- Return ONE top-level object per requested ingredient (the best chain option)${opts.compact ? '' : ' plus 2–5 chain alternatives in "options"'}.
- ONLY use major chains present in ${city}. Provide realistic prices and addresses.
- Return ONLY the JSON array. No markdown or extra text.`
}
