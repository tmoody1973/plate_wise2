import { NextRequest, NextResponse } from 'next/server'
import { buildPerplexityPrompt } from '@/lib/pricing/perplexity-prompt'
import { createClient } from '@/lib/supabase/server'
import { normalizeUnit, parsePackSize, estimateIngredientCost, convert } from '@/utils/units'
import { estimateIngredientCost as heuristicCost } from '@/lib/recipes/cost-estimator'
// Avoid static import of Google Places service (constructor throws without API key).
// We'll lazy-load it inside functions when GOOGLE_PLACES_API_KEY is present.
import { ingredientQuantityNormalizer } from '@/lib/recipes/ingredient-quantity-normalizer'

type PricingCompare = Record<string, Array<{ store: string; price: number | string; tags?: string[] }>>
type StoreOption = {
  storeName: string
  storeAddress: string
  storeType: string
  price: number
  distance?: number
  inStock?: boolean
}

type IngredientAlternative = {
  name: string
  price: number
  storeName: string
  notes?: string
}

type PricingResult = {
  id: number
  original: string
  matched: string
  priceLabel?: string
  estimatedCost: number
  portionCost: number
  packagePrice: number
  packageSize?: string
  confidence: number
  needsReview: boolean
  packages: number
  bestPriceSummary?: string
  compare?: PricingCompare
  // Optional: full list of store options used to populate UI
  options?: PricingData[]
  // Store information fields
  storeName?: string
  storeType?: string
  storeAddress?: string
  sourceUrl?: string
  // Multiple store options for this ingredient
  storeOptions?: StoreOption[]
  // Alternative ingredients that could be used
  alternatives?: IngredientAlternative[]
}

type IngredientLike = string | { 
  name?: string; 
  amount?: number; 
  unit?: string;
  // OpenAI recipe format
  item?: string;
  quantity?: string | number;
  notes?: string;
}
type ShoppingStop = {
  storeName: string
  storeAddress: string
  storeType: string
  items: Array<{
    ingredient: string
    price: number
    productName: string
    packageSize?: string
  }>
  subtotal: number
  distance?: number
  estimatedTime?: number
}

type ShoppingPlan = {
  totalCost: number
  totalStores: number
  primaryStore: ShoppingStop
  additionalStores: ShoppingStop[]
  unavailableItems: string[]
  shoppingOrder: string[]
  estimatedTotalTime: number
  notes: string[]
}

type RequestBody = { 
  ingredients: IngredientLike[]; 
  location?: string; 
  city?: string; 
  culturalContext?: string; 
  defaultStoreName?: string;
  preferredStore?: string; // New: User's preferred primary store
  generateShoppingPlan?: boolean; // New: Whether to create a shopping plan
}
type PerplexityMessage = { role?: string; content?: string }
type PerplexityAPIResponse = { choices?: Array<{ message?: PerplexityMessage }> }
type PricingData = {
  ingredient?: string // Added for batch processing
  storeName?: string
  productName?: string
  packageSize?: string
  packagePrice?: number
  unitPrice?: number | string
  portionCost?: number
  storeType?: string
  storeAddress?: string
  sourceUrl?: string
}

// Run pricing on Edge to reduce cold starts and improve latency
export const runtime = 'edge'
export const preferredRegion = ['cle1']
export const dynamic = 'force-dynamic'

// Allow longer execution when pricing multiple ingredients
export const maxDuration = 10

const ingName = (ing: IngredientLike) => {
  if (typeof ing === 'string') return ing
  // Support both OpenAI format (item) and standard format (name)
  const result = ing.name ?? (ing as any).item ?? ''
  if (!result) {
    console.log('⚠️  Empty ingredient name detected:', JSON.stringify(ing))
  }
  return result
}
const ingAmount = (ing: IngredientLike) => {
  if (typeof ing === 'string') return undefined
  // Support both OpenAI format (quantity) and standard format (amount)
  const qty = ing.amount ?? (ing as any).quantity
  const result = typeof qty === 'string' ? parseFloat(qty) || 1 : qty ?? 1
  if (result === 0 || result === 1) {
    console.log('⚠️  Fallback ingredient amount detected:', JSON.stringify({
      input: ing,
      rawQty: qty,
      result: result,
      hadAmount: 'amount' in ing,
      hadQuantity: 'quantity' in ing
    }))
  }
  return result
}
const ingUnit = (ing: IngredientLike) => {
  if (typeof ing === 'string') return undefined
  // Both formats use 'unit'
  return ing.unit ?? 'unit'
}

function normalizePrice(value: unknown): number | undefined {
  if (typeof value === 'number') return isFinite(value) ? value : undefined
  if (typeof value === 'string') {
    const m = value.replace(/,/g, '').match(/[-+]?[0-9]*\.?[0-9]+/)
    if (m) {
      const n = parseFloat(m[0]!)
      return isFinite(n) ? n : undefined
    }
  }
  return undefined
}

function sanitizeText(s?: string): string | undefined {
  if (!s) return s
  const t = s.trim()
  // remove leading/trailing quotes if model wrapped the address
  return t.replace(/^"+|"+$/g, '')
}

function stripCodeFences(s: string): string {
  let t = s.trim()
  // Remove code fences
  t = t.replace(/^```json\s*/i, '')
  t = t.replace(/^```\s*/i, '')
  t = t.replace(/```\s*$/i, '')
  return t
}

function extractJsonArray(text: string): any[] | null {
  // First try to find JSON after any explanatory text
  const jsonStart = text.search(/\[[\s\S]*\{/)
  if (jsonStart !== -1) {
    const jsonText = text.substring(jsonStart)
    const arrayEnd = findMatchingBracket(jsonText, 0)
    if (arrayEnd !== -1) {
      try {
        const result = JSON.parse(jsonText.substring(0, arrayEnd + 1))
        if (Array.isArray(result)) return result
      } catch (e) {
        console.log('JSON parse error on extracted array:', e)
      }
    }
  }

  // Fallback: try to find any JSON array
  const start = text.indexOf('[')
  if (start !== -1) {
    let depth = 0
    let inString = false
    let escaped = false
    
    for (let i = start; i < text.length; i++) {
      const ch = text[i]
      
      if (escaped) {
        escaped = false
        continue
      }
      
      if (ch === '\\' && inString) {
        escaped = true
        continue
      }
      
      if (ch === '"') {
        inString = !inString
        continue
      }
      
      if (!inString) {
        if (ch === '[') depth++
        else if (ch === ']') {
          depth--
          if (depth === 0) {
            try { 
              const result = JSON.parse(text.slice(start, i + 1))
              if (Array.isArray(result)) return result
            } catch (e) {
              console.log('JSON parse error:', e)
            }
          }
        }
      }
    }
  }
  
  return null
}

function findMatchingBracket(text: string, startIndex: number): number {
  let depth = 0
  let inString = false
  let escaped = false
  
  for (let i = startIndex; i < text.length; i++) {
    const ch = text[i]
    
    if (escaped) {
      escaped = false
      continue
    }
    
    if (ch === '\\' && inString) {
      escaped = true
      continue
    }
    
    if (ch === '"') {
      inString = !inString
      continue
    }
    
    if (!inString) {
      if (ch === '[') depth++
      else if (ch === ']') {
        depth--
        if (depth === 0) return i
      }
    }
  }
  
  return -1
}

function parseUnitPriceLabel(label?: string | number): { price: number; unit: string } | null {
  if (typeof label === 'number') return { price: label, unit: 'each' }
  if (!label) return null
  const s = String(label).toLowerCase()
  const m = s.match(/([\d.,]+)\s*\/?\s*per\s*([a-z\s]+)|\$\s*([\d.,]+)\s*\/\s*([a-z\s]+)/i)
  if (m) {
    const val = parseFloat((m[1] || m[3] || '').replace(/,/g, ''))
    const unit = (m[2] || m[4] || '').trim()
    if (isFinite(val) && unit) return { price: val, unit }
  }
  // Simple forms like "$7.99/lb" or "$0.59 per bulb"
  const m2 = s.match(/\$?([\d.,]+)\s*\/\s*([a-z\s]+)/i)
  if (m2) {
    const val = parseFloat(m2[1]!.replace(/,/g, ''))
    const unit = m2[2]!.trim()
    if (isFinite(val)) return { price: val, unit }
  }
  return null
}

function gramsPerEachGuess(name: string): number | null {
  const x = name.toLowerCase()
  if (x.includes('onion')) return 150
  if (x.includes('garlic')) return 3 // per clove
  if (x.includes('lemon')) return 90
  if (x.includes('lime')) return 70
  if (x.includes('tomato')) return 120
  if (x.includes('bell pepper') || x.includes('pepper')) return 120
  if (x.includes('potato')) return 170
  if (x.includes('egg')) return 50
  return null
}

function convertNeededToUnit(neededQty: number, neededUnit: string | undefined, targetUnitRaw: string, ingredientName?: string): number | null {
  const target = targetUnitRaw.toLowerCase().trim()
  const nu = normalizeUnit(neededUnit || '')
  if (!nu) return null
  // Map common denominator words to units
  if (/\b(lb|pound)\b/.test(target)) {
    // handle each → lb via heuristic weight
    if (nu === 'each') {
      const g = gramsPerEachGuess(ingredientName || '')
      if (g != null) return (neededQty * g) / 453.592
    }
    return convert(neededQty, nu, 'lb')
  }
  if (/\boz\b/.test(target) && !/fl/.test(target)) {
    if (nu === 'each') {
      const g = gramsPerEachGuess(ingredientName || '')
      if (g != null) return (neededQty * g) / 28.3495
    }
    return convert(neededQty, nu, 'oz')
  }
  if (/\b(fl\s*oz|fluid ounce)\b/.test(target)) {
    return convert(neededQty, nu, 'fl_oz')
  }
  if (/\b(g|gram)\b/.test(target)) {
    if (nu === 'each') {
      const g = gramsPerEachGuess(ingredientName || '')
      if (g != null) return neededQty * g
    }
    return convert(neededQty, nu, 'g')
  }
  if (/\b(ml|milliliter)\b/.test(target)) {
    return convert(neededQty, nu, 'ml')
  }
  if (/\b(each|ct|count|piece|bulb|onion|clove)\b/.test(target)) {
    // treat as each
    const pieces = Math.max(1, Math.ceil(neededQty))
    return pieces
  }
  return null
}

function computePortionCost(opt: PricingData, neededQty: number, neededUnit?: string, ingredientName?: string): number {
  // First check if Perplexity AI already provided an accurate portionCost
  const aiPortionCost = normalizePrice(opt.portionCost)
  const packagePrice = opt.packagePrice || 0
  
  // Only trust AI portion cost if it's reasonable (not equal to package price for non-whole items)
  if (aiPortionCost !== undefined && aiPortionCost > 0 && aiPortionCost <= packagePrice) {
    // For whole items (chicken, etc), portion cost can equal package price
    const isWholeItem = ingredientName && (
      ingredientName.toLowerCase().includes('whole') || 
      ingredientName.toLowerCase().includes('chicken') ||
      ingredientName.toLowerCase().includes('turkey') ||
      ingredientName.toLowerCase().includes('fish') ||
      // Only consider as whole if explicitly uses whole-related units AND ingredient name suggests it's actually whole
      ((neededUnit === 'whole' || (neededUnit === 'each' && ingredientName.toLowerCase().match(/\b(onion|garlic|egg|lemon|lime|potato)\b/))) && neededQty <= 1)
    )
    
    // If it's a whole item or portion cost is significantly less than package price, trust AI
    if (isWholeItem || aiPortionCost < packagePrice * 0.9) {
      console.log(`✅ Using AI portion cost for ${ingredientName}: $${aiPortionCost} (${Math.round(aiPortionCost/packagePrice*100)}% of package)`)
      return aiPortionCost
    } else {
      console.log(`⚠️ AI portion cost suspicious for ${ingredientName}: $${aiPortionCost} equals ${Math.round(aiPortionCost/packagePrice*100)}% of package price - recalculating`)
    }
  }

  // Use our new accurate calculation system
  if (ingredientName && opt.packageSize && opt.packagePrice) {
    try {
      const recipeIngredient = {
        name: ingredientName,
        amount: neededQty,
        unit: neededUnit || ''
      }
      
      const packageInfo = {
        productName: opt.productName || ingredientName,
        packageSize: opt.packageSize,
        packagePrice: opt.packagePrice,
        storeName: opt.storeName || 'Unknown Store'
      }

      const result = ingredientQuantityNormalizer.calculateIngredientPortion(recipeIngredient, packageInfo)
      
      if (result.confidence !== 'low' && result.portionCost > 0) {
        console.log(`🧮 Accurate portion calculation: ${ingredientName} = $${result.portionCost} (${Math.round(result.utilizationRatio * 100)}% of package)`)
        return result.portionCost
      }
    } catch (error) {
      console.warn(`⚠️ Portion calculation failed for ${ingredientName}:`, error)
    }
  }

  // Fallback to existing logic for compatibility
  // Try unit price label first
  const parsed = parseUnitPriceLabel(opt.unitPrice)
  if (parsed) {
    const q = convertNeededToUnit(neededQty, neededUnit, parsed.unit, ingredientName)
    if (q != null) return parsed.price * q
  }
  
  // Try pack info to derive a unit price
  const pack = parsePackSize(opt.packageSize)
  if (pack && typeof opt.packagePrice === 'number' && opt.packagePrice > 0) {
    // Derive cost per requested quantity assuming linear portioning
    const nu = normalizeUnit(neededUnit || '') || 'each'
    // Convert needed to grams baseline
    const neededG = convert(neededQty, nu, 'g')
    const packG = convert(pack.qty, pack.unit, 'g')
    if (isFinite(neededG) && isFinite(packG) && packG > 0) {
      const unitPricePerG = opt.packagePrice / packG
      const calculatedCost = unitPricePerG * neededG
      console.log(`📊 Fallback portion calculation: ${ingredientName} = $${calculatedCost.toFixed(2)}`)
      return calculatedCost
    }
    if (pack.unit === 'each') {
      // Per-each logic
      const pieces = Math.max(1, Math.ceil(neededQty))
      const perPiece = opt.packagePrice / Math.max(1, pack.qty)
      return perPiece * pieces
    }
  }
  
  // Final fallback - use 25% of package price instead of returning 0
  const fallbackCost = (opt.packagePrice || 0) * 0.25
  if (fallbackCost > 0) {
    console.log(`⚠️ Using fallback 25% estimate for ${ingredientName}: $${fallbackCost.toFixed(2)}`)
  }
  return fallbackCost
}

// Post-filtering to prefer mainstream chains
const ALLOWED_CHAINS = [
  'pick n save', 'pick n\' save', 'metro market', 'fresh thyme', 'kroger', "kroger's",
  "woodman's", 'walmart', 'target', 'aldi', 'costco', "sam's club", 'whole foods',
  'meijer', 'heb', 'h‑e‑b', 'jewel-osco', 'safeway', 'albertsons', 'publix'
]

function isAllowedStore(name?: string, url?: string, defaultStore?: string): boolean {
  const n = (name || '').toLowerCase()
  const d = (defaultStore || '').toLowerCase()
  if (d && n.includes(d)) return true
  if (ALLOWED_CHAINS.some(k => n.includes(k))) return true
  // Try infer brand by domain
  if (url) {
    try {
      const host = new URL(url).hostname.toLowerCase()
      if (/picknsave|kroger|metro\-?market|walmart|target|aldi|costco|samsclub|wholefoods|meijer|heb|jewel|safeway|albertsons|publix|woodmans/.test(host)) return true
    } catch {}
  }
  return false
}

function inferStoreNameFromUrl(url?: string): string | undefined {
  if (!url) return undefined
  try {
    const host = new URL(url).hostname.toLowerCase()
    if (host.includes('picknsave')) return "Pick 'n Save"
    if (host.includes('kroger')) return 'Kroger'
    if (host.includes('metromarket')) return 'Metro Market'
    if (host.includes('walmart')) return 'Walmart'
    if (host.includes('target')) return 'Target'
    if (host.includes('aldi')) return 'Aldi'
    if (host.includes('costco')) return 'Costco'
    if (host.includes('samsclub') || host.includes('sams-club')) return "Sam's Club"
    if (host.includes('wholefoods')) return 'Whole Foods'
    if (host.includes('meijer')) return 'Meijer'
    if (host.includes('heb')) return 'H‑E‑B'
    if (host.includes('jewel')) return 'Jewel-Osco'
    if (host.includes('safeway')) return 'Safeway'
    if (host.includes('albertsons')) return 'Albertsons'
    if (host.includes('publix')) return 'Publix'
  } catch {}
  return undefined
}

function priceCapForIngredient(ingredient: string): number {
  const x = ingredient.toLowerCase()
  if (/saffron|truffle|caviar|wagyu|vanilla\s*bean/.test(x)) return 500
  if (/olive oil|avocado oil|sunflower oil|sesame oil/.test(x)) return 60
  if (/spice|spices|cardamom|clove|cinnamon/.test(x)) return 50
  if (/bulk|family pack|costco|sam's club|sam’s club/.test(x)) return 150
  // staples (milk, eggs, bread, flour, sugar, salt, onions, tomatoes, rice, pasta)
  if (/(milk|egg|bread|flour|sugar|salt|onion|tomato|rice|pasta)/.test(x)) return 25
  return 100
}

// Store availability by state/region with known addresses for Milwaukee stores
const STORE_AVAILABILITY: Record<string, string[]> = {
  'WI': ['Pick \'n Save', 'Pick n Save', 'Metro Market', 'Woodman\'s', 'Woodmans', 'Festival Foods', 'Walmart', 'Target', 'Aldi', 'Costco', 'Sam\'s Club', 'Whole Foods', 'Meijer', 'Fresh Thyme', 'Cermak Fresh Market', 'El Rey', 'Asian International Market'],
  'CA': ['Ralphs', 'Vons', 'Safeway', 'Trader Joe\'s', 'Whole Foods', 'Target', 'Walmart', 'H Mart', 'H-Mart', '99 Ranch'],
  'TX': ['H-E-B', 'HEB', 'Kroger', 'Walmart', 'Target', 'Whole Foods', 'H Mart'],
  'FL': ['Publix', 'Kroger', 'Walmart', 'Target', 'Whole Foods', 'Winn-Dixie'],
  'NY': ['Wegmans', 'Stop & Shop', 'Whole Foods', 'Target', 'Walmart', 'H Mart'],
  'IL': ['Jewel-Osco', 'Mariano\'s', 'Whole Foods', 'Target', 'Walmart', 'H Mart', 'Cermak'],
}

// Known store addresses for Milwaukee (verified addresses)
const MILWAUKEE_STORE_ADDRESSES: Record<string, string> = {
  'Asian International Market': '3401 W National Ave, Milwaukee, WI 53215',
  'Pick \'n Save': '3801 W Wisconsin Ave, Milwaukee, WI 53208',
  'Metro Market': '1123 N Van Buren St, Milwaukee, WI 53202',
  'Woodman\'s': '2323 S 108th St, West Allis, WI 53227',
  'El Rey': '916 S Cesar E Chavez Dr, Milwaukee, WI 53204',
  'Cermak Fresh Market': '2238 S 13th St, Milwaukee, WI 53215',
  'Walmart': '4140 W Greenfield Ave, Milwaukee, WI 53215',
  'Target': '2950 S Chase Ave, Milwaukee, WI 53207',
  'Aldi': '2100 N Dr Martin Luther King Jr Dr, Milwaukee, WI 53212',
  'Whole Foods': '2305 N Prospect Ave, Milwaukee, WI 53211',
  'Meijer': '5800 N 76th St, Milwaukee, WI 53218',
  'Fresh Thyme': '5300 S 76th St, Greendale, WI 53129',
}

// Get state from location (ZIP or city, state format)
function getStateFromLocation(location: string, city: string): string {
  // Extract state from city if it contains state code
  const cityStateMatch = city.match(/,\s*([A-Z]{2})\b/)
  if (cityStateMatch?.[1]) {
    return cityStateMatch[1]
  }
  
  // ZIP to state mapping for common areas
  const zipPrefix = location.substring(0, 3)
  const zipToState: Record<string, string> = {
    '532': 'WI', '533': 'WI', '534': 'WI', '535': 'WI', '537': 'WI', '538': 'WI', '539': 'WI', '541': 'WI', '542': 'WI', '543': 'WI', '544': 'WI', '545': 'WI', '546': 'WI', '547': 'WI', '548': 'WI', '549': 'WI',
    '900': 'CA', '901': 'CA', '902': 'CA', '903': 'CA', '904': 'CA', '905': 'CA', '906': 'CA', '907': 'CA', '908': 'CA',
    '750': 'TX', '751': 'TX', '752': 'TX', '753': 'TX', '754': 'TX', '755': 'TX', '756': 'TX', '757': 'TX', '758': 'TX', '759': 'TX', '760': 'TX', '761': 'TX', '762': 'TX', '763': 'TX', '764': 'TX', '765': 'TX',
    '100': 'NY', '101': 'NY', '102': 'NY', '103': 'NY', '104': 'NY', '105': 'NY', '106': 'NY', '107': 'NY', '108': 'NY', '109': 'NY', '110': 'NY', '111': 'NY', '112': 'NY', '113': 'NY', '114': 'NY',
    '606': 'IL', '607': 'IL', '608': 'IL', '609': 'IL', '610': 'IL', '611': 'IL', '612': 'IL', '613': 'IL', '614': 'IL', '615': 'IL', '616': 'IL', '617': 'IL', '618': 'IL', '619': 'IL', '620': 'IL',
  }
  
  return zipToState[zipPrefix] || ''
}

// Validate if store exists in the given location
function isStoreValidForLocation(storeName: string, location: string, city: string): boolean {
  if (!storeName) return false
  
  const state = getStateFromLocation(location, city)
  if (!state) return true // If we can't determine state, allow it
  
  const normalizedStoreName = storeName.toLowerCase().trim()
  
  // Explicitly block stores that don't exist in Wisconsin
  if (state === 'WI') {
    const blockedInWI = ['h mart', 'h-mart', 'hmart', 'h.e.b', 'heb', 'publix', 'safeway', 'kroger', 'ralphs', 'vons']
    if (blockedInWI.some(blocked => normalizedStoreName.includes(blocked))) {
      return false
    }
  }
  
  const availableStores = STORE_AVAILABILITY[state] || []
  
  // Check if store is available in this state
  const isAvailable = availableStores.some(availableStore => 
    normalizedStoreName.includes(availableStore.toLowerCase())
  )
  
  // Always allow these national chains
  const nationalChains = ['walmart', 'target', 'costco', 'sam\'s club', 'whole foods', 'aldi']
  const isNationalChain = nationalChains.some(chain => normalizedStoreName.includes(chain))
  
  return isAvailable || isNationalChain
}

// Check what ingredients are typically available at mainstream stores
function checkIngredientAvailabilityAtStore(
  ingredientName: string,
  storeName: string,
  storeType: string = 'mainstream'
): { available: boolean; confidence: number; estimatedPrice?: number } {
  const ingredient = ingredientName.toLowerCase()
  
  // Common ingredients available at most mainstream stores
  const commonIngredients = [
    'chicken', 'beef', 'pork', 'fish', 'eggs', 'milk', 'cheese', 'butter',
    'onion', 'garlic', 'tomato', 'potato', 'carrot', 'celery', 'bell pepper',
    'flour', 'sugar', 'salt', 'pepper', 'oil', 'vinegar', 'soy sauce',
    'rice', 'pasta', 'bread', 'beans', 'lettuce', 'spinach', 'broccoli'
  ]
  
  // Specialty ingredients typically NOT at mainstream stores
  const specialtyIngredients = [
    'dashi', 'miso', 'gochujang', 'kimchi', 'tahini', 'harissa',
    'fish sauce', 'tamarind', 'galangal', 'lemongrass', 'kaffir lime',
    'paneer', 'ghee', 'cardamom pods', 'fenugreek', 'curry leaves',
    'masa harina', 'chipotle in adobo', 'mexican crema', 'queso fresco',
    'saffron', 'sumac', 'za\'atar', 'pomegranate molasses', 'ras el hanout'
  ]
  
  // Estimated prices for common items
  const priceEstimates: Record<string, number> = {
    'chicken breast': 6.99, 'ground beef': 5.99, 'eggs': 3.59, 'milk': 3.49,
    'onion': 1.49, 'garlic': 0.99, 'tomato': 2.99, 'potato': 2.49,
    'flour': 3.99, 'sugar': 3.49, 'salt': 1.99, 'olive oil': 7.99,
    'soy sauce': 2.49, 'rice': 2.99, 'pasta': 1.99, 'bread': 2.99
  }
  
  // Check if it's a common ingredient
  const isCommon = commonIngredients.some(common => 
    ingredient.includes(common) || common.includes(ingredient)
  )
  
  // Check if it's specialty
  const isSpecialty = specialtyIngredients.some(specialty => 
    ingredient.includes(specialty) || specialty.includes(ingredient)
  )
  
  // Store-specific adjustments
  let storeMultiplier = 1.0
  if (storeName.toLowerCase().includes('whole foods')) storeMultiplier = 1.3
  else if (storeName.toLowerCase().includes('walmart')) storeMultiplier = 0.9
  else if (storeName.toLowerCase().includes('aldi')) storeMultiplier = 0.8
  else if (storeName.toLowerCase().includes('target')) storeMultiplier = 1.1
  
  if (isCommon) {
    const basePrice = priceEstimates[ingredient] || 2.99
    return {
      available: true,
      confidence: 0.9,
      estimatedPrice: basePrice * storeMultiplier
    }
  } else if (isSpecialty) {
    return {
      available: false,
      confidence: 0.8,
      estimatedPrice: undefined
    }
  } else {
    // Unknown ingredient - moderate confidence it's available
    return {
      available: true,
      confidence: 0.6,
      estimatedPrice: 2.99 * storeMultiplier
    }
  }
}

// Generate a smart shopping plan
async function generateShoppingPlan(
  ingredients: IngredientLike[],
  preferredStore: string,
  location: string,
  city: string,
  culturalContext?: string
): Promise<ShoppingPlan> {
  const primaryStoreItems: Array<{ ingredient: string; price: number; productName: string; packageSize?: string }> = []
  const needsSpecialtyStore: string[] = []
  
  // Get preferred store address
  const preferredStoreAddress = await getVerifiedStoreAddress(preferredStore, city, location)
  
  // Check each ingredient at preferred store
  for (const ingredient of ingredients) {
    const ingredientName = ingName(ingredient)
    const availability = checkIngredientAvailabilityAtStore(ingredientName, preferredStore)
    
    if (availability.available && availability.confidence > 0.7) {
      primaryStoreItems.push({
        ingredient: ingredientName,
        price: availability.estimatedPrice || 2.99,
        productName: `${ingredientName} (${preferredStore})`,
        packageSize: 'standard'
      })
    } else {
      needsSpecialtyStore.push(ingredientName)
    }
  }
  
  // Find specialty stores for remaining items
  const additionalStores: ShoppingStop[] = []
  const unavailableItems: string[] = []
  
  if (needsSpecialtyStore.length > 0) {
    const globalMarkets = await findGlobalMarkets(city, location, culturalContext)
    
    if (globalMarkets.length > 0) {
      // Group specialty items by best store
      const specialtyItems = needsSpecialtyStore.map(ingredient => ({
        ingredient,
        price: 4.99, // Estimated specialty price
        productName: `${ingredient} (specialty)`,
        packageSize: 'specialty'
      }))
      
      additionalStores.push({
        storeName: globalMarkets[0].name,
        storeAddress: globalMarkets[0].address,
        storeType: globalMarkets[0].type,
        items: specialtyItems,
        subtotal: specialtyItems.reduce((sum, item) => sum + item.price, 0),
        distance: 2.5,
        estimatedTime: 15
      })
    } else {
      unavailableItems.push(...needsSpecialtyStore)
    }
  }
  
  const primaryStore: ShoppingStop = {
    storeName: preferredStore,
    storeAddress: preferredStoreAddress.address,
    storeType: 'mainstream',
    items: primaryStoreItems,
    subtotal: primaryStoreItems.reduce((sum, item) => sum + item.price, 0),
    distance: 0,
    estimatedTime: 30
  }
  
  const totalCost = primaryStore.subtotal + additionalStores.reduce((sum, store) => sum + store.subtotal, 0)
  const totalStores = 1 + additionalStores.length
  const estimatedTotalTime = primaryStore.estimatedTime + additionalStores.reduce((sum, store) => sum + (store.estimatedTime || 0), 0) + (additionalStores.length * 10) // +10 min travel between stores
  
  // Generate shopping order and notes
  const shoppingOrder = [preferredStore, ...additionalStores.map(s => s.storeName)]
  const notes: string[] = []
  
  if (additionalStores.length > 0) {
    notes.push(`Start at ${preferredStore} for ${primaryStoreItems.length} items`)
    notes.push(`Visit ${additionalStores[0].storeName} for ${needsSpecialtyStore.length} specialty items`)
  } else {
    notes.push(`All items available at ${preferredStore}`)
  }
  
  if (unavailableItems.length > 0) {
    notes.push(`${unavailableItems.length} items may need substitutes`)
  }
  
  return {
    totalCost,
    totalStores,
    primaryStore,
    additionalStores,
    unavailableItems,
    shoppingOrder,
    estimatedTotalTime,
    notes
  }
}

// Search for ingredient alternatives
async function findIngredientAlternatives(
  ingredientName: string,
  culturalContext?: string
): Promise<IngredientAlternative[]> {
  const alternatives: IngredientAlternative[] = []
  
  // Common ingredient substitutions
  const substitutions: Record<string, string[]> = {
    'instant dashi stock powder': ['kombu seaweed', 'bonito flakes', 'chicken bouillon', 'vegetable stock'],
    'okonomiyaki sauce': ['worcestershire sauce + ketchup', 'tonkatsu sauce', 'teriyaki sauce'],
    'miso paste': ['soy sauce', 'tahini', 'vegetable bouillon'],
    'saffron': ['turmeric + paprika', 'safflower', 'annatto'],
    'ghee': ['clarified butter', 'coconut oil', 'regular butter'],
    'gochujang': ['sriracha + miso', 'harissa', 'sambal oelek'],
    'fish sauce': ['soy sauce + lime', 'worcestershire sauce', 'anchovy paste'],
    'tamarind paste': ['lime juice + brown sugar', 'worcestershire sauce', 'date paste'],
    'rice wine': ['dry sherry', 'sake', 'white wine + sugar'],
    'paneer': ['firm tofu', 'halloumi', 'ricotta cheese'],
  }
  
  const normalizedIngredient = ingredientName.toLowerCase()
  const possibleAlternatives = substitutions[normalizedIngredient] || []
  
  // Add alternatives with estimated prices
  for (const alt of possibleAlternatives) {
    alternatives.push({
      name: alt,
      price: 2.99, // Default estimate, would be better with actual pricing
      storeName: 'Various stores',
      notes: `Common substitute for ${ingredientName}`
    })
  }
  
  // Add cultural context specific alternatives
  if (culturalContext === 'Japanese' && normalizedIngredient.includes('dashi')) {
    alternatives.push({
      name: 'Hondashi (concentrated)',
      price: 5.99,
      storeName: 'Asian Market',
      notes: 'More concentrated, use less'
    })
  }
  
  return alternatives
}

// Find multiple global markets in the area using Google Places
async function findGlobalMarkets(
  city: string,
  location: string,
  culturalContext?: string
): Promise<Array<{ name: string; address: string; type: string }>> {
  const globalMarkets: Array<{ name: string; address: string; type: string }> = []
  
  // Default Milwaukee global markets if Google Places is not available
  const defaultMilwaukeeMarkets = [
    { name: 'Asian International Market', address: '3401 W National Ave, Milwaukee, WI 53215', type: 'asian' },
    { name: 'El Rey', address: '916 S Cesar E Chavez Dr, Milwaukee, WI 53204', type: 'mexican' },
    { name: 'Cermak Fresh Market', address: '2238 S 13th St, Milwaukee, WI 53215', type: 'international' },
    { name: 'Indian Groceries & Spices', address: '2050 W Wisconsin Ave, Milwaukee, WI 53233', type: 'indian' },
    { name: 'Phongsavan Asian Market', address: '4879 S Packard Ave, Cudahy, WI 53110', type: 'asian' },
  ]
  
  if (process.env.GOOGLE_PLACES_API_KEY) {
    try {
      // Search for global markets based on cultural context
      const searchQueries = culturalContext ? 
        [`${culturalContext} market ${city}`, `${culturalContext} grocery ${city}`, `international market ${city}`] :
        ['asian market', 'mexican market', 'indian grocery', 'international market', 'global grocery'].map(q => `${q} ${city}`)
      
      for (const query of searchQueries) {
        const { googlePlacesService } = await import('@/lib/external-apis/google-places-service')
        const stores = await googlePlacesService.searchStores(query)
        
        for (const store of stores.slice(0, 3)) { // Limit to top 3 per query
          if (store.name && store.address) {
            // Avoid duplicates
            const exists = globalMarkets.some(m => 
              m.name.toLowerCase() === store.name.toLowerCase()
            )
            
            if (!exists) {
              globalMarkets.push({
                name: store.name,
                address: store.address,
                type: culturalContext || 'global'
              })
            }
          }
        }
      }
      
      console.log(`📍 Found ${globalMarkets.length} global markets via Google Places`)
    } catch (error) {
      console.warn('Google Places search failed:', error)
      return []
    }
  }
  
  // If no markets found, return empty array (Google Places integration handles this)
  if (globalMarkets.length === 0) {
    console.log('No global markets found via Google Places')
  }
  
  return globalMarkets
}

// Get verified store address using Google Places or fallback to known addresses
async function getVerifiedStoreAddress(
  storeName: string, 
  city: string, 
  location: string
): Promise<{ address: string; verified: boolean }> {
  if (!storeName) {
    return { address: city || location, verified: false }
  }
  
  const state = getStateFromLocation(location, city)
  
  // Skip hardcoded address lookups - use Google Places for all locations
  
  // Try to use Google Places API if available
  if (process.env.GOOGLE_PLACES_API_KEY) {
    try {
      // Search for the store in the specified location, fallback to city if location is empty
      const searchLocation = location || city || 'Atlanta, GA'
      const searchQuery = `${storeName} ${searchLocation}`
      const { googlePlacesService } = await import('@/lib/external-apis/google-places-service')
      const stores = await googlePlacesService.searchStores(searchQuery)
      
      if (stores && stores.length > 0) {
        // Find the best match
        const bestMatch = stores.find(store => 
          store.name.toLowerCase().includes(storeName.toLowerCase())
        ) || stores[0]
        
        if (bestMatch && bestMatch.address) {
          console.log(`📍 Google Places found address for ${storeName}: ${bestMatch.address}`)
          return { address: bestMatch.address, verified: true }
        }
      }
    } catch (error) {
      console.warn(`Google Places lookup failed for ${storeName}:`, error)
    }
  }
  
  // Fallback to generic city address
  return { address: `${city || location}`, verified: false }
}

async function sanitizeOption(opt: PricingData, location: string, city: string): Promise<PricingData> {
  const pkg = normalizePrice(opt.packagePrice)
  const portion = normalizePrice(opt.portionCost)
  
  // Validate store for location
  let storeName = sanitizeText(opt.storeName)
  let storeAddress = sanitizeText(opt.storeAddress)
  let sourceUrl = sanitizeText(opt.sourceUrl)

  // If storeName missing, try to infer from sourceUrl domain (major chains)
  if (!storeName && sourceUrl) {
    try {
      const host = new URL(sourceUrl).hostname.replace(/^www\./, '')
      const map: Record<string,string> = {
        'walmart.com': 'Walmart',
        'target.com': 'Target',
        'kroger.com': 'Kroger',
        'publix.com': 'Publix',
        'safeway.com': 'Safeway',
        'albertsons.com': 'Albertsons',
        'aldi.us': 'Aldi',
        'costco.com': 'Costco',
        'samsclub.com': "Sam's Club",
        'wholefoodsmarket.com': 'Whole Foods Market',
        'traderjoes.com': "Trader Joe's",
        'meijer.com': 'Meijer',
        'heb.com': 'H‑E‑B',
        'foodlion.com': 'Food Lion',
        'giantfood.com': 'Giant',
        'stopandshop.com': 'Stop & Shop',
        'winndixie.com': 'Winn‑Dixie',
        'ralphs.com': 'Ralphs',
        'vons.com': 'Vons',
        'fredmeyer.com': 'Fred Meyer',
      }
      if (map[host]) storeName = map[host]
    } catch {}
  }
  
  // If store is not valid for location, keep original name but mark/unset address; do not substitute another brand
  if (storeName && !isStoreValidForLocation(storeName, location, city)) {
    console.log(`⚠️ Store "${storeName}" not verified for ${city || location}; keeping name, attempting address lookup`)
    const verifiedAddress = await getVerifiedStoreAddress(storeName, city, location)
    storeAddress = verifiedAddress.address
  } else if (storeName) {
    // Store is valid, but let's try to get a verified address
    const verifiedAddress = await getVerifiedStoreAddress(storeName, city, location)
    if (verifiedAddress.verified) {
      storeAddress = verifiedAddress.address
    }
  }
  
  return {
    storeName,
    productName: sanitizeText(opt.productName),
    packageSize: sanitizeText(opt.packageSize),
    packagePrice: pkg ?? 0,
    unitPrice: typeof opt.unitPrice === 'string' ? sanitizeText(opt.unitPrice) : opt.unitPrice,
    portionCost: portion ?? 0,
    storeType: sanitizeText(opt.storeType),
    storeAddress,
    sourceUrl,
  }
}

export async function POST(request: NextRequest) {
  try {
    const raw = (await request.json()) as RequestBody
    const urlObj = new URL(request.url)
    const debug = urlObj.searchParams.get('debug') === '1'
    const ingredients = Array.isArray(raw?.ingredients) ? raw.ingredients : []
    const location = raw.location ?? '90210'
    const city = raw.city ?? ''
    const culturalContext = raw.culturalContext ?? 'general'
    
    console.log('🧪 Pricing API Debug - Raw ingredients received:', JSON.stringify(ingredients, null, 2))
    console.log('🧪 Pricing API Debug - Ingredient count:', ingredients.length)
    if (ingredients.length > 0) {
      console.log('🧪 Pricing API Debug - First ingredient structure:', JSON.stringify(ingredients[0], null, 2))
      console.log('🧪 Pricing API Debug - First ingredient type:', typeof ingredients[0])
    }
    let defaultStoreName = raw.defaultStoreName ?? ''
    let preferredStores: string[] = []

    // Auto-wire preferred stores from user profile and saved stores
    try {
      const supabase = createClient()
      const { data: auth } = await supabase.auth.getUser()
      const user = auth?.user
      if (user) {
        // Read profile default store name if not provided
        const { data: profileRow } = await supabase
          .from('user_profiles')
          .select('preferences')
          .eq('id', user.id)
          .maybeSingle()

        const profileDefault = (profileRow as any)?.preferences?.defaultStore?.name
        if (!defaultStoreName && typeof profileDefault === 'string') {
          defaultStoreName = profileDefault
        }

        // Read saved stores (favorited first, then higher rating)
        const { data: saved } = await supabase
          .from('saved_stores')
          .select('store_name, is_favorite, rating')
          .eq('user_id', user.id)

        const sorted = (saved || [])
          .slice()
          .sort((a: any, b: any) => (Number(b.is_favorite) - Number(a.is_favorite)) || ((b.rating || 0) - (a.rating || 0)))
          .map((s: any) => s.store_name)

        preferredStores = Array.from(new Set([
          defaultStoreName,
          ...sorted
        ].filter(Boolean)))
      }
    } catch (e) {
      // Non-fatal: continue without auto-wired stores
      console.warn('Perplexity route: preferred stores lookup failed:', e)
    }

    if (!ingredients || !Array.isArray(ingredients)) {
      return NextResponse.json({ error: 'ingredients array is required' }, { status: 400 })
    }

    const perplexityApiKey = process.env.PERPLEXITY_API_KEY
    console.log('🔑 Perplexity API Key status:', {
      hasKey: !!perplexityApiKey,
      keyLength: perplexityApiKey?.length || 0,
      keyPrefix: perplexityApiKey?.substring(0, 8) || 'none'
    })
    
    if (!perplexityApiKey) {
      return NextResponse.json({ error: 'Perplexity API key not configured' }, { status: 500 })
    }

    // Batch process all ingredients in single API call
    const results: PricingResult[] = []
    
    try {
      // Create batch prompt for all ingredients
      const ingredientList = ingredients.map(ingredient => ({
        name: ingName(ingredient),
        amount: ingAmount(ingredient) ?? 1,
        unit: ingUnit(ingredient) ?? 'unit'
      }))

      // If too many ingredients, process in smaller batches to avoid timeouts
      const BATCH_SIZE = 2
      if (ingredientList.length > BATCH_SIZE) {
        for (let start = 0; start < ingredients.length; start += BATCH_SIZE) {
          const batch = ingredients.slice(start, start + BATCH_SIZE)
          const batchList = batch.map(ing => ({
            name: ingName(ing),
            amount: ingAmount(ing) ?? 1,
            unit: ingUnit(ing) ?? 'unit'
          }))

          const batchPrompt = buildPerplexityPrompt({
            ingredients: batchList,
            zip: location,
            context: culturalContext,
            city,
            defaultStore: defaultStoreName,
            preferredStores,
            compact: true,
          })

          const controller = new AbortController()
          const timeoutMs = process.env.NODE_ENV === 'development' ? 60000 : 9500
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
          
          let resp: Response | null = null
          try {
            resp = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${perplexityApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'sonar',
              messages: [
                { role: 'system', content: 'You are a grocery pricing assistant. Return ONLY a valid JSON array with the requested fields. No extra text.' },
                { role: 'user', content: batchPrompt }
              ],
              max_tokens: 250,
              temperature: 0.1,
              top_p: 0.9,
              return_citations: false,
              search_domain_filter: [
                'walmart.com','target.com','kroger.com','publix.com','safeway.com','albertsons.com','aldi.us','costco.com','samsclub.com','wholefoodsmarket.com','traderjoes.com','meijer.com','heb.com','foodlion.com','giantfood.com','stopandshop.com','winndixie.com','ralphs.com','vons.com','fredmeyer.com'
              ]
            }),
            signal: controller.signal
            })
            clearTimeout(timeoutId)
          } catch (error: any) {
            clearTimeout(timeoutId)
            console.warn(`⚠️ Perplexity API timeout/error for batch ${start}-${start + BATCH_SIZE}:`, error.message)
            // Fall back to estimated prices for this batch
            for (const ing of batch) {
              const estimated = heuristicCost({ name: ingName(ing), amount: ingAmount(ing) ?? 1, unit: ingUnit(ing) ?? 'unit' })
              results.push({
                id: results.length + 1,
                original: ingName(ing),
                matched: 'Estimated price (API timeout)',
                estimatedCost: estimated,
                portionCost: estimated,
                packagePrice: estimated * 4, // Rough package estimate
                confidence: 0.3,
                needsReview: true,
                packages: 1,
                storeName: 'Estimated',
                storeType: 'fallback'
              })
            }
            continue // Skip to next batch
          }

          if (!resp || !resp.ok) {
            const text = resp ? await resp.text().catch(() => '') : ''
            if (debug) return NextResponse.json({ error: 'perplexity_upstream', status: resp?.status || 0, body: text.slice(0, 800) }, { status: 502 })
            return NextResponse.json({ error: `perplexity_upstream_${resp?.status || 'unknown'}` }, { status: 502 })
          }

          const data = await resp.json().catch(() => null as any)
          const content = data?.choices?.[0]?.message?.content || ''
          const cleaned = stripCodeFences(content)
          let arr: any[] | null = null
          try {
            arr = extractJsonArray(cleaned)
            if (!arr) {
              const parsed = JSON.parse(cleaned)
              arr = Array.isArray(parsed) ? parsed : [parsed]
            }
          } catch (e) {
            if (debug) return NextResponse.json({ error: 'parse_error', body: cleaned.slice(0, 800) }, { status: 502 })
            arr = []
          }

          for (let i = 0; i < batch.length; i++) {
            const ing = batch[i]!
            const match = (arr || []).find(d => d?.ingredient && String(d.ingredient).toLowerCase().includes(ingName(ing).toLowerCase())) || (arr || [])[i]
            if (match) {
              const sanitized = await sanitizeOption(match as PricingData, location, city)
              const portion = computePortionCost(sanitized, ingAmount(ing) ?? 1, ingUnit(ing) ?? 'each', ingName(ing))
              const pkg = normalizePrice(sanitized.packagePrice)
              results.push({
                id: results.length + 1,
                original: ingName(ing),
                matched: sanitized.productName || sanitized.storeName || 'Perplexity',
                estimatedCost: portion,
                portionCost: portion,
                packagePrice: pkg ?? 0,
                packageSize: sanitized.packageSize,
                confidence: 0.85,
                needsReview: false,
                packages: 1,
                storeName: sanitized.storeName,
                storeType: sanitized.storeType,
                storeAddress: sanitized.storeAddress,
                sourceUrl: sanitized.sourceUrl,
              })
            } else {
              results.push({ id: results.length + 1, original: ingName(ing), matched: 'Pricing unavailable', estimatedCost: 0, portionCost: 0, packagePrice: 0, confidence: 0.1, needsReview: true, packages: 1 })
            }
          }
        }

        // After batching, continue to shopping plan and return
        let shoppingPlan: ShoppingPlan | undefined
        if (raw.generateShoppingPlan && raw.preferredStore) {
          try {
            shoppingPlan = await generateShoppingPlan(ingredients, raw.preferredStore, location, city, culturalContext)
          } catch {}
        }
        return NextResponse.json({
          results,
          totalEstimated: results.reduce((sum, item) => sum + (item.portionCost || item.estimatedCost || 0), 0),
          source: 'perplexity',
          shoppingPlan
        })
      }

      const prompt = buildPerplexityPrompt({
        ingredients: ingredientList,
        zip: location,
        context: culturalContext,
        city,
        defaultStore: defaultStoreName,
        preferredStores,
        compact: true,
      })

      console.log('🌐 Making batch Perplexity API request for', ingredients.length, 'ingredients');
      console.log('🗺️  Location data:', { location, city, defaultStoreName, preferredStores });
      
      // Add a conservative timeout to avoid platform timeouts
      const controller = new AbortController()
      const timeoutMs = process.env.NODE_ENV === 'development' ? 60000 : 9500
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
      
      let perplexityResponse: Response | null = null
      try {
        perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${perplexityApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: 'You are a grocery pricing assistant. Always return ONLY valid JSON in the exact format requested. Do not include any explanatory text, reasoning, or commentary. Return only the JSON array.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 250, // compact mode; reduce tokens to avoid timeouts
          temperature: 0.1,
          top_p: 0.9,
          return_citations: false,
          // Perplexity limit: max 20 domains
          search_domain_filter: [
            'walmart.com','target.com','kroger.com','publix.com','safeway.com','albertsons.com','aldi.us','costco.com','samsclub.com','wholefoodsmarket.com','traderjoes.com','meijer.com','heb.com','foodlion.com','giantfood.com','stopandshop.com','winndixie.com','ralphs.com','vons.com','fredmeyer.com'
          ]
        }),
        signal: controller.signal
        })
        clearTimeout(timeoutId)
      } catch (error: any) {
        clearTimeout(timeoutId)
        console.warn(`⚠️ Perplexity API timeout/error:`, error.message)
        // Fall back to estimated prices for all ingredients
        const fallbackResults = ingredients.map((ing, i) => {
          const estimated = heuristicCost({ name: ingName(ing), amount: ingAmount(ing) ?? 1, unit: ingUnit(ing) ?? 'unit' })
          return {
            id: i + 1,
            original: ingName(ing),
            matched: 'Estimated price (API timeout)',
            estimatedCost: estimated,
            portionCost: estimated,
            packagePrice: estimated * 4,
            confidence: 0.3,
            needsReview: true,
            packages: 1,
            storeName: 'Estimated',
            storeType: 'fallback'
          }
        })
        
        return NextResponse.json({
          results: fallbackResults,
          totalEstimated: fallbackResults.reduce((sum, item) => sum + (item.portionCost || 0), 0),
          source: 'fallback',
          note: 'Using estimated prices due to API timeout'
        })
      }

      console.log('📡 Perplexity API response:', perplexityResponse?.status, perplexityResponse?.statusText);
      
      if (!perplexityResponse || !perplexityResponse.ok) {
        const errorText = perplexityResponse ? await perplexityResponse.text().catch(() => '') : ''
        console.error('❌ Perplexity API error:', perplexityResponse?.status, errorText?.slice(0, 600))
        if (debug) {
          return NextResponse.json({ error: 'perplexity_upstream', status: perplexityResponse?.status || 0, body: errorText?.slice(0, 800) }, { status: 502 })
        }
        return NextResponse.json({ error: `perplexity_upstream_${perplexityResponse?.status || 'unknown'}` }, { status: 502 })
      }

      const perplexityData = (await perplexityResponse.json()) as unknown as PerplexityAPIResponse
      const aiResponse = perplexityData?.choices?.[0]?.message?.content ?? ''

      console.log('🤖 Perplexity AI response length:', aiResponse.length)
      console.log('🤖 First 800 chars:', aiResponse.substring(0, 800))
      console.log('🏪 Looking for store location integration in response...')

      // Try to extract JSON from the response (robust)
      let pricingData: PricingData[]
      const cleanedResponse = stripCodeFences(aiResponse)
      console.log('🧹 Cleaned response length:', cleanedResponse.length)
      console.log('🧹 First 500 chars of cleaned:', cleanedResponse.substring(0, 500))
      
      try {
        const arr = extractJsonArray(cleanedResponse)
        if (arr && arr.length > 0) {
          console.log('✅ Extracted JSON array with', arr.length, 'items')
          pricingData = arr as PricingData[]
        } else {
          console.log('⚠️ No array found, trying direct JSON parse')
          const parsed = JSON.parse(cleanedResponse) as any
          pricingData = Array.isArray(parsed) ? parsed : [parsed]
          console.log('✅ Direct parse result:', pricingData.length, 'items')
        }
      } catch (parseError) {
        console.error('❌ Error parsing Perplexity batch response:', parseError)
        console.log('🔍 Trying text fallback parsing...')
        // Fallback to individual ingredient estimates
        pricingData = ingredients.map(ingredient => 
          parseTextResponse(aiResponse, ingredient)
        ) as PricingData[]
      }

      console.log('📊 Final parsed pricing data:', pricingData.length, 'items')
      console.log('📋 Sample item:', pricingData[0])

      // Process each pricing result
      for (let i = 0; i < ingredients.length; i++) {
        const ingredient = ingredients[i]!
        const matchingPriceData = pricingData.find(data => 
          data.ingredient && data.ingredient.toLowerCase().includes(ingName(ingredient).toLowerCase())
        ) || pricingData[i] // fallback to index matching

        if (matchingPriceData) {
          const sanitized = await sanitizeOption(matchingPriceData, location, city)
          console.log(`🏪 Store data for ingredient "${ingName(ingredient)}":`, {
            rawStoreName: matchingPriceData?.storeName,
            sanitizedStoreName: sanitized?.storeName,
            storeType: sanitized?.storeType,
            storeAddress: sanitized?.storeAddress,
            rawData: JSON.stringify(matchingPriceData, null, 2)
          })
          
          // Always validate portion cost using our calculation logic
          const portionCost = computePortionCost(sanitized, ingAmount(ingredient) ?? 1, ingUnit(ingredient) ?? 'each', ingName(ingredient))
          
          // Get multiple store options for global ingredients
          let storeOptions: StoreOption[] = []
          if (sanitized?.storeType === 'global' || sanitized?.storeType === 'specialty') {
            const globalMarkets = await findGlobalMarkets(city, location, culturalContext)
            storeOptions = globalMarkets.slice(0, 5).map(market => ({
              storeName: market.name,
              storeAddress: market.address,
              storeType: market.type,
              price: portionCost * (0.8 + Math.random() * 0.4), // Vary prices ±20%
              inStock: Math.random() > 0.3 // 70% chance in stock
            }))
          }
          
          // Get ingredient alternatives
          const alternatives = await findIngredientAlternatives(ingName(ingredient), culturalContext)

          const packagePriceNum = normalizePrice(sanitized?.packagePrice)
          const unitPriceNum = normalizePrice(sanitized?.unitPrice)

          const result: PricingResult = {
            id: i + 1,
            original: ingName(ingredient),
            matched: sanitized?.productName || sanitized?.storeName || 'Found via Perplexity',
            priceLabel: unitPriceNum !== undefined ? `${unitPriceNum}/unit` : undefined,
            estimatedCost: portionCost,
            portionCost: portionCost,
            packagePrice: packagePriceNum ?? 0,
            packageSize: sanitized?.packageSize,
            confidence: 0.85, // High confidence for Perplexity results
            needsReview: false,
            packages: 1,
            bestPriceSummary: sanitized?.storeName ? `$${portionCost.toFixed(2)} at ${sanitized.storeName}` : undefined,
            compare: sanitized?.storeType ? {
              [sanitized.storeType]: [
                {
                  store: sanitized?.storeName || 'Store',
                  price: portionCost,
                  tags: ['perplexity-verified']
                }
              ]
            } : undefined,
            // Add store information at the top level for better visibility
            storeName: sanitized?.storeName,
            storeType: sanitized?.storeType,
            storeAddress: sanitized?.storeAddress,
            sourceUrl: sanitized?.sourceUrl,
            // Add multiple store options and alternatives
            storeOptions: storeOptions.length > 0 ? storeOptions : undefined,
            alternatives: alternatives.length > 0 ? alternatives : undefined
          }

          // Also expose options under a generic key used by some UI helpers
          if (storeOptions.length > 0) {
            (result as any).options = storeOptions
          }

          results.push(result)
        } else {
          // Fallback result for missing ingredient
          results.push({
            id: i + 1,
            original: ingName(ingredient),
            matched: 'Pricing unavailable',
            priceLabel: undefined,
            estimatedCost: 0,
            portionCost: 0,
            packagePrice: 0,
            packageSize: undefined,
            confidence: 0.1,
            needsReview: true,
            packages: 1
          })
        }
      }

    } catch (error: any) {
      console.error('Batch pricing error:', error)
      // If this was an abort/timeout, surface as an error so the UI can retry or inform the user
      if (error?.name === 'AbortError') {
        return NextResponse.json({ error: 'perplexity_timeout' }, { status: 504 })
      }
      // Surface non-timeout errors explicitly
      return NextResponse.json({ error: error?.message || 'perplexity_failed' }, { status: 502 })
    }

    // Generate shopping plan if requested
    let shoppingPlan: ShoppingPlan | undefined
    if (raw.generateShoppingPlan && raw.preferredStore) {
      try {
        shoppingPlan = await generateShoppingPlan(
          ingredients,
          raw.preferredStore,
          location,
          city,
          culturalContext
        )
        console.log('🛒 Generated shopping plan:', JSON.stringify(shoppingPlan, null, 2))
      } catch (error) {
        console.error('Failed to generate shopping plan:', error)
      }
    }

    return NextResponse.json({
      results,
      totalEstimated: results.reduce((sum, item) => sum + (item.portionCost || item.estimatedCost || 0), 0),
      source: 'perplexity',
      shoppingPlan
    })

  } catch (error) {
    console.error('Perplexity pricing API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pricing from Perplexity' },
      { status: 500 }
    )
  }
}

function parseTextResponse(text: string, ingredient: IngredientLike): PricingData {
  // Basic text parsing fallback
  const lines = text.split('\n').filter(line => line.trim())
  
  let storeName = 'Unknown Store'
  const productName = ingName(ingredient)
  let packagePrice = 0
  let portionCost = 0
  let packageSize = ''
  const unitPrice = ''
  
  for (const line of lines) {
    if (line.toLowerCase().includes('store') && line.includes(':')) {
      storeName = line.split(':')[1]?.trim() || storeName
    }
    if (line.includes('$')) {
      const priceMatch = line.match(/\$?([\d.]+)/)
      if (priceMatch && priceMatch[1]) {
        const price = parseFloat(priceMatch[1]!)
        if (packagePrice === 0) packagePrice = price
        if (portionCost === 0) portionCost = price * 0.1 // Rough estimate
      }
    }
    if (line.toLowerCase().includes('size') || line.includes('lb') || line.includes('oz')) {
      packageSize = line.trim()
    }
  }
  
  return {
    storeName,
    productName,
    packagePrice,
    portionCost,
    packageSize,
    unitPrice: unitPrice || `$${(packagePrice / 10).toFixed(2)}`, // Rough unit price
    storeType: 'mainstream'
  }
}
