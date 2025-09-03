export interface StoreInfo {
  name: string
  type: 'mainstream' | 'ethnic' | 'specialty'
  address: string
  distance?: number
  estimatedShoppingTime: number
  specialties: string[] // e.g., ['asian', 'organic', 'bulk']
}

export interface StoreAssignment {
  ingredient: string
  assignedStore: string
  storeType: string
  storeAddress: string
  packagePrice: number
  portionCost: number
  productName: string
  packageSize: string
  confidence: 'high' | 'medium' | 'low'
  alternatives?: StoreAssignment[]
}

export interface OptimizedShoppingPlan {
  primaryStore: StoreInfo
  secondaryStores: StoreInfo[]
  ingredientDistribution: Record<string, StoreAssignment>
  efficiency: number // % of ingredients at primary store
  totalStores: number
  estimatedTime: number
  totalCost: number
  costSavings?: number // compared to single-store approach
}

export interface IngredientAvailability {
  ingredient: string
  stores: Array<{
    store: string
    available: boolean
    price?: number
    confidence: number
  }>
}

import { fallbackGeocodingService } from '@/lib/external-apis/fallback-geocoding'

// Dynamic store database builder
function buildStoreDatabase(cityName: string): Record<string, StoreInfo> {
  const locationData = fallbackGeocodingService.getCityData(cityName)
  
  if (!locationData) {
    // Default to Atlanta stores if location not found
    return buildAtlantaStores()
  }
  
  const stores: Record<string, StoreInfo> = {}
  
  // Build dynamic store info based on common stores for the city
  locationData.commonStores.forEach((storeName, index) => {
    const storeType = getStoreType(storeName)
    stores[storeName] = {
      name: storeName,
      type: storeType.type,
      address: `${storeName} - ${locationData.city}, ${locationData.state} ${locationData.zipCode}`,
      estimatedShoppingTime: storeType.estimatedTime,
      specialties: storeType.specialties
    }
  })
  
  return stores
}

// Helper to determine store type and characteristics
function getStoreType(storeName: string): {
  type: 'mainstream' | 'ethnic' | 'specialty',
  estimatedTime: number,
  specialties: string[]
} {
  const name = storeName.toLowerCase()
  
  if (name.includes('asian') || name.includes('international') || name.includes('ethnic')) {
    return {
      type: 'ethnic',
      estimatedTime: 15,
      specialties: ['asian', 'dashi', 'miso', 'specialty-sauces', 'noodles', 'international']
    }
  }
  
  if (name.includes('whole foods') || name.includes('trader joe')) {
    return {
      type: 'specialty',
      estimatedTime: 20,
      specialties: ['organic', 'premium', 'prepared', 'health']
    }
  }
  
  if (name.includes('aldi')) {
    return {
      type: 'mainstream',
      estimatedTime: 18,
      specialties: ['budget', 'pantry', 'basic']
    }
  }
  
  if (name.includes('walmart')) {
    return {
      type: 'mainstream',
      estimatedTime: 35,
      specialties: ['bulk', 'pantry', 'general', 'budget']
    }
  }
  
  if (name.includes('kroger') || name.includes('publix')) {
    return {
      type: 'mainstream',
      estimatedTime: 25,
      specialties: ['general', 'pantry', 'fresh', 'dairy']
    }
  }
  
  // Default mainstream store
  return {
    type: 'mainstream',
    estimatedTime: 25,
    specialties: ['general', 'pantry', 'fresh', 'dairy']
  }
}

// Fallback Atlanta stores for when location data is unavailable
function buildAtlantaStores(): Record<string, StoreInfo> {
  return {
    "Kroger": {
      name: "Kroger",
      type: 'mainstream',
      address: 'Kroger - Atlanta, GA 30309',
      estimatedShoppingTime: 25,
      specialties: ['general', 'pantry', 'fresh', 'dairy']
    },
    "Publix": {
      name: "Publix",
      type: 'mainstream',
      address: 'Publix - Atlanta, GA 30309',
      estimatedShoppingTime: 22,
      specialties: ['fresh', 'prepared', 'premium', 'pharmacy']
    },
    "Whole Foods Market": {
      name: "Whole Foods Market",
      type: 'specialty',
      address: 'Whole Foods Market - Atlanta, GA 30309',
      estimatedShoppingTime: 20,
      specialties: ['organic', 'premium', 'prepared', 'health']
    },
    "Aldi": {
      name: "Aldi",
      type: 'mainstream',
      address: 'Aldi - Atlanta, GA 30309',
      estimatedShoppingTime: 18,
      specialties: ['budget', 'pantry', 'basic']
    },
    "Walmart": {
      name: "Walmart",
      type: 'mainstream',
      address: 'Walmart - Atlanta, GA 30309',
      estimatedShoppingTime: 35,
      specialties: ['bulk', 'pantry', 'general', 'budget']
    },
    "Target": {
      name: "Target",
      type: 'mainstream',
      address: 'Target - Atlanta, GA 30309',
      estimatedShoppingTime: 28,
      specialties: ['general', 'pantry', 'fresh', 'household']
    }
  }
}

// Ingredient categorization for store matching
const INGREDIENT_CATEGORIES: Record<string, string[]> = {
  'asian': ['dashi', 'miso', 'okonomiyaki', 'soy sauce', 'rice vinegar', 'mirin', 'sake', 'nori', 'wasabi'],
  'fresh': ['cabbage', 'lettuce', 'tomatoes', 'onions', 'garlic', 'herbs'],
  'pantry': ['flour', 'sugar', 'salt', 'oil', 'vinegar', 'spices'],
  'dairy': ['milk', 'cheese', 'yogurt', 'butter', 'eggs'],
  'meat': ['bacon', 'chicken', 'beef', 'pork', 'fish'],
  'specialty-sauces': ['okonomiyaki sauce', 'teriyaki', 'hot sauce']
}

export class ShoppingOptimizer {
  
  /**
   * Optimizes ingredient sourcing to prioritize one primary store
   * Falls back to secondary stores for specialty items
   */
  async optimizeForOneStore(
    ingredients: Array<{name: string, amount: number, unit: string}>,
    preferredStoreName: string = "Kroger",
    location: string = '30309',
    pricingData?: Array<any>
  ): Promise<OptimizedShoppingPlan> {
    
    console.log(`🎯 Starting one-store optimization for ${preferredStoreName}`)
    console.log(`📝 Ingredients to optimize:`, ingredients.map(i => i.name))
    
    // Get dynamic stores based on location
    const cityName = this.getCityFromLocation(location)
    const availableStores = buildStoreDatabase(cityName)
    const primaryStore = availableStores[preferredStoreName] || Object.values(availableStores)[0]
    
    // If we already have pricing data, use it; otherwise return with warning
    let allPricingOptions: Array<any> = []
    
    if (pricingData && pricingData.length > 0) {
      allPricingOptions = pricingData
      console.log(`📊 Using existing pricing data for ${pricingData.length} items`)
    } else {
      console.log(`⚠️ No pricing data provided. Please get pricing data first via Perplexity API.`)
      // Return empty plan when no pricing data available
      return {
        primaryStore,
        secondaryStores: [],
        ingredientDistribution: {},
        efficiency: 0,
        totalStores: 0,
        estimatedTime: 0,
        totalCost: 0
      }
    }
    
    // Group ingredients by best store match
    const storeAssignments = this.assignIngredientsToStores(
      ingredients,
      allPricingOptions,
      preferredStoreName,
      availableStores
    )
    
    // Calculate efficiency and costs
    const primaryStoreIngredients = Object.values(storeAssignments)
      .filter(assignment => assignment.assignedStore === preferredStoreName)
    
    const efficiency = Math.round(
      (primaryStoreIngredients.length / ingredients.length) * 100
    )
    
    const usedStores = [...new Set(Object.values(storeAssignments).map(a => a.assignedStore))]
    const secondaryStores = usedStores
      .filter(storeName => storeName !== preferredStoreName)
      .map(storeName => availableStores[storeName])
      .filter(Boolean)
    
    const totalCost = Object.values(storeAssignments)
      .reduce((sum, assignment) => sum + assignment.packagePrice, 0)
    
    const estimatedTime = this.calculateShoppingTime(usedStores, availableStores)
    
    console.log(`✅ Optimization complete:`)
    console.log(`   Primary store: ${preferredStoreName} (${efficiency}% efficiency)`)
    console.log(`   Total stores: ${usedStores.length}`)
    console.log(`   Total cost: $${totalCost.toFixed(2)}`)
    console.log(`   Estimated time: ${estimatedTime} minutes`)
    
    return {
      primaryStore,
      secondaryStores,
      ingredientDistribution: storeAssignments,
      efficiency,
      totalStores: usedStores.length,
      estimatedTime,
      totalCost
    }
  }
  
  /**
   * Assigns each ingredient to the best store based on availability and pricing
   * Prioritizes primary store, falls back to specialty stores when needed
   */
  private assignIngredientsToStores(
    ingredients: Array<{name: string, amount: number, unit: string}>,
    pricingOptions: Array<any>,
    preferredStoreName: string,
    availableStores: Record<string, StoreInfo>
  ): Record<string, StoreAssignment> {
    
    const assignments: Record<string, StoreAssignment> = {}
    
    for (const ingredient of ingredients) {
      const ingredientOptions = pricingOptions.filter(
        option => option.ingredient?.toLowerCase() === ingredient.name.toLowerCase()
      )
      
      if (ingredientOptions.length === 0) {
        console.warn(`⚠️ No pricing found for ingredient: ${ingredient.name}`)
        continue
      }
      
      // Try to find the ingredient at preferred store first
      let bestOption = ingredientOptions.find(
        option => option.storeName === preferredStoreName
      )
      
      // If not available at preferred store, find best alternative
      if (!bestOption) {
        // Prioritize specialty stores for specialty ingredients
        const isSpecialtyIngredient = this.isSpecialtyIngredient(ingredient.name)
        
        if (isSpecialtyIngredient) {
          bestOption = ingredientOptions.find(option => 
            availableStores[option.storeName]?.type === 'ethnic'
          )
        }
        
        // Fall back to best price if no specialty match
        if (!bestOption) {
          bestOption = ingredientOptions.reduce((best, current) => 
            (current.packagePrice || 999) < (best.packagePrice || 999) ? current : best
          )
        }
      }
      
      if (bestOption) {
        assignments[ingredient.name] = {
          ingredient: ingredient.name,
          assignedStore: bestOption.storeName || 'Unknown Store',
          storeType: bestOption.storeType || 'mainstream',
          storeAddress: this.getVerifiedAddress(bestOption.storeName, availableStores) || bestOption.storeAddress || '',
          packagePrice: bestOption.packagePrice || 0,
          portionCost: bestOption.portionCost || 0,
          productName: bestOption.productName || ingredient.name,
          packageSize: bestOption.packageSize || '',
          confidence: this.calculateConfidence(bestOption),
          alternatives: ingredientOptions
            .filter(opt => opt.storeName !== bestOption?.storeName)
            .slice(0, 3)
            .map(alt => ({
              ingredient: ingredient.name,
              assignedStore: alt.storeName || 'Unknown Store',
              storeType: alt.storeType || 'mainstream', 
              storeAddress: this.getVerifiedAddress(alt.storeName, availableStores) || alt.storeAddress || '',
              packagePrice: alt.packagePrice || 0,
              portionCost: alt.portionCost || 0,
              productName: alt.productName || ingredient.name,
              packageSize: alt.packageSize || '',
              confidence: this.calculateConfidence(alt)
            }))
        }
      }
    }
    
    return assignments
  }
  
  /**
   * Determines if an ingredient is specialty and should prioritize ethnic/specialty stores
   */
  private isSpecialtyIngredient(ingredientName: string): boolean {
    const name = ingredientName.toLowerCase()
    
    // Check Asian specialty ingredients
    return INGREDIENT_CATEGORIES.asian.some(item => name.includes(item)) ||
           INGREDIENT_CATEGORIES['specialty-sauces'].some(item => name.includes(item))
  }
  
  /**
   * Get verified store addresses from dynamic store database
   */
  private getVerifiedAddress(storeName: string, availableStores: Record<string, StoreInfo>): string | undefined {
    return availableStores[storeName]?.address
  }
  
  /**
   * Calculate confidence score based on data quality
   */
  private calculateConfidence(pricingOption: any): 'high' | 'medium' | 'low' {
    let score = 0
    
    if (pricingOption.packagePrice && pricingOption.packagePrice > 0) score += 3
    if (pricingOption.productName && pricingOption.productName !== 'Unknown') score += 2
    if (pricingOption.storeAddress) score += 2
    if (pricingOption.packageSize) score += 1
    if (pricingOption.sourceUrl) score += 1
    
    if (score >= 7) return 'high'
    if (score >= 4) return 'medium'
    return 'low'
  }
  
  /**
   * Calculate total estimated shopping time based on stores visited
   */
  private calculateShoppingTime(storeNames: string[], availableStores: Record<string, StoreInfo>): number {
    const baseTime = storeNames.reduce((total, storeName) => {
      const store = availableStores[storeName]
      return total + (store?.estimatedShoppingTime || 20)
    }, 0)
    
    // Add travel time between stores (10 min per additional store)
    const travelTime = Math.max(0, storeNames.length - 1) * 10
    
    return baseTime + travelTime
  }
  
  /**
   * Helper to get city name from location (zip code or city name)
   */
  private getCityFromLocation(location: string): string {
    // If location is already a city name format, return it
    if (location.includes(',') && location.includes(' ')) {
      return location
    }
    
    // Try to find city by zip code in fallback geocoding
    // For now, we'll use a simple approach and default to Atlanta since
    // the fallback service uses city names, not zip codes as keys
    const cityData = fallbackGeocodingService.getCityData(location)
    
    if (cityData) {
      return `${cityData.city}, ${cityData.state}`
    }
    
    // Default to Atlanta if not found
    return 'Atlanta, GA'
  }
  
  // Note: Pricing data should be passed in from the client-side
  // Server-side fetch calls to relative URLs don't work in Next.js API routes
  
  /**
   * Suggests the most efficient shopping strategy
   */
  suggestOptimalStrategy(
    ingredients: Array<{name: string, amount: number, unit: string}>,
    location: string
  ): Array<{
    strategy: string
    description: string
    estimatedTime: number
    estimatedStores: number
    efficiency: number
  }> {
    
    return [
      {
        strategy: 'One-Store First',
        description: 'Shop primarily at your preferred store, visit specialty stores only when needed',
        estimatedTime: 45,
        estimatedStores: 2,
        efficiency: 85
      },
      {
        strategy: 'Best Price',
        description: 'Get the lowest price for each ingredient regardless of store',
        estimatedTime: 75,
        estimatedStores: 4,
        efficiency: 60
      },
      {
        strategy: 'Convenience',
        description: 'Shop at the single closest store even if some items cost more',
        estimatedTime: 25,
        estimatedStores: 1,
        efficiency: 65
      }
    ]
  }
}

// Export singleton instance
export const shoppingOptimizer = new ShoppingOptimizer()