/**
 * Instacart API Integration for Real Ingredient Pricing
 * Provides accurate grocery prices for budget optimization
 */

interface InstacartItem {
  id: string;
  name: string;
  price: number;
  unit: string;
  size: string;
  brand?: string;
  availability: 'available' | 'out_of_stock' | 'limited';
  store_name?: string;
  image_url?: string;
}

interface IngredientPriceResult {
  ingredient: string;
  searchQuery: string;
  bestMatch?: InstacartItem;
  alternatives: InstacartItem[];
  averagePrice?: number;
  priceRange?: { min: number; max: number };
  confidence: 'high' | 'medium' | 'low';
  lastUpdated: Date;
}

export class InstacartPricingService {
  private apiKey: string;
  private baseURL = 'https://api.instacart.com/v1';
  private cache = new Map<string, IngredientPriceResult>();
  private readonly CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours for pricing data

  constructor() {
    this.apiKey = process.env.INSTACART_API_KEY || '';
  }

  /**
   * Get pricing for a single ingredient
   */
  async getIngredientPrice(ingredient: string, zipCode?: string): Promise<IngredientPriceResult> {
    const cacheKey = `${ingredient}-${zipCode || 'default'}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.lastUpdated.getTime() < this.CACHE_TTL) {
      return cached;
    }

    if (!this.apiKey) {
      console.warn('⚠️ Instacart API key not found, using estimated pricing');
      return this.generateEstimatedPrice(ingredient);
    }

    try {
      console.log(`💰 Fetching Instacart price for: ${ingredient}`);

      // Clean and prepare search query
      const searchQuery = this.prepareSearchQuery(ingredient);
      
      const response = await fetch(`${this.baseURL}/catalog/items`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'PlateWise-MealPlanner/1.0'
        },
        body: JSON.stringify({
          query: searchQuery,
          limit: 10,
          ...(zipCode && { delivery_address: { zip_code: zipCode } })
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Instacart API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const result = this.processInstacartResponse(ingredient, searchQuery, data);
      
      // Cache the result
      this.cache.set(cacheKey, result);
      
      console.log(`✅ Instacart pricing found for ${ingredient}:`, {
        bestMatch: result.bestMatch?.name,
        price: result.bestMatch?.price,
        confidence: result.confidence
      });

      return result;

    } catch (error) {
      console.error(`❌ Instacart pricing failed for ${ingredient}:`, error);
      return this.generateEstimatedPrice(ingredient);
    }
  }

  /**
   * Get pricing for multiple ingredients in parallel
   */
  async getMultipleIngredientPrices(
    ingredients: string[], 
    zipCode?: string
  ): Promise<Map<string, IngredientPriceResult>> {
    const results = new Map<string, IngredientPriceResult>();
    
    // Process ingredients in batches to respect rate limits
    const batchSize = 5;
    for (let i = 0; i < ingredients.length; i += batchSize) {
      const batch = ingredients.slice(i, i + batchSize);
      const batchPromises = batch.map(ingredient => 
        this.getIngredientPrice(ingredient, zipCode)
      );

      const batchResults = await Promise.allSettled(batchPromises);
      
      for (let j = 0; j < batch.length; j++) {
        const result = batchResults[j];
        if (result.status === 'fulfilled') {
          results.set(batch[j], result.value);
        } else {
          // Add fallback pricing for failed requests
          results.set(batch[j], this.generateEstimatedPrice(batch[j]));
        }
      }

      // Rate limiting delay between batches
      if (i + batchSize < ingredients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Calculate total recipe cost with real pricing
   */
  async calculateRecipeCost(
    ingredients: Array<{ name: string; amount?: number; unit?: string }>,
    zipCode?: string
  ): Promise<{
    totalCost: number;
    costPerServing: number;
    servings: number;
    ingredientCosts: Array<{
      ingredient: string;
      unitPrice: number;
      quantity: number;
      totalCost: number;
      confidence: string;
    }>;
    savings?: {
      estimatedSavings: number;
      budgetOptimizationTips: string[];
    };
  }> {
    const ingredientNames = ingredients.map(ing => ing.name);
    const pricingResults = await this.getMultipleIngredientPrices(ingredientNames, zipCode);
    
    let totalCost = 0;
    const ingredientCosts = [];
    const budgetTips = [];

    for (const ingredient of ingredients) {
      const pricing = pricingResults.get(ingredient.name);
      if (pricing?.bestMatch) {
        const quantity = ingredient.amount || 1;
        const unitPrice = pricing.bestMatch.price;
        const itemCost = unitPrice * quantity;
        
        totalCost += itemCost;
        ingredientCosts.push({
          ingredient: ingredient.name,
          unitPrice,
          quantity,
          totalCost: itemCost,
          confidence: pricing.confidence
        });

        // Generate budget optimization tips
        if (pricing.alternatives.length > 1) {
          const cheapestAlt = pricing.alternatives.sort((a, b) => a.price - b.price)[0];
          if (cheapestAlt.price < unitPrice * 0.8) {
            budgetTips.push(`Save on ${ingredient.name}: ${cheapestAlt.brand} costs ${((unitPrice - cheapestAlt.price) / unitPrice * 100).toFixed(0)}% less`);
          }
        }
      }
    }

    const servings = 4; // Default, could be extracted from recipe
    const costPerServing = totalCost / servings;

    return {
      totalCost,
      costPerServing,
      servings,
      ingredientCosts,
      savings: {
        estimatedSavings: budgetTips.length * 2.5, // Rough estimate
        budgetOptimizationTips: budgetTips.slice(0, 3) // Top 3 tips
      }
    };
  }

  /**
   * Prepare search query for Instacart API
   */
  private prepareSearchQuery(ingredient: string): string {
    // Remove measurements and clean up ingredient name
    let cleaned = ingredient
      .replace(/^\d+(\.\d+)?\s*(cups?|tbsp|tsp|lbs?|oz|pounds?|ounces?|cloves?|pieces?)\s*/i, '')
      .replace(/\([^)]*\)/g, '') // Remove parentheses content
      .replace(/,.*$/, '') // Remove everything after comma
      .trim();

    // Handle common ingredient variations
    const substitutions = {
      'scotch bonnet pepper': 'hot pepper',
      'plum tomatoes': 'tomatoes',
      'long-grain rice': 'rice',
      'sunflower oil': 'cooking oil',
      'vegetable stock': 'vegetable broth'
    };

    for (const [original, replacement] of Object.entries(substitutions)) {
      if (cleaned.toLowerCase().includes(original)) {
        cleaned = replacement;
        break;
      }
    }

    return cleaned;
  }

  /**
   * Process Instacart API response
   */
  private processInstacartResponse(
    originalIngredient: string,
    searchQuery: string,
    data: any
  ): IngredientPriceResult {
    const items: InstacartItem[] = (data.items || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      price: item.price || 0,
      unit: item.unit || 'each',
      size: item.size || '',
      brand: item.brand,
      availability: item.availability || 'available',
      store_name: item.store_name,
      image_url: item.image_url
    }));

    // Find best match based on name similarity and availability
    const availableItems = items.filter(item => item.availability === 'available');
    const bestMatch = availableItems.length > 0 ? availableItems[0] : items[0];

    // Calculate confidence based on name similarity and availability
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (bestMatch) {
      const nameSimilarity = this.calculateSimilarity(searchQuery.toLowerCase(), bestMatch.name.toLowerCase());
      if (nameSimilarity > 0.7 && bestMatch.availability === 'available') {
        confidence = 'high';
      } else if (nameSimilarity > 0.4) {
        confidence = 'medium';
      }
    }

    // Calculate price statistics
    const prices = availableItems.map(item => item.price).filter(price => price > 0);
    const averagePrice = prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) / prices.length : undefined;
    const priceRange = prices.length > 0 ? { min: Math.min(...prices), max: Math.max(...prices) } : undefined;

    return {
      ingredient: originalIngredient,
      searchQuery,
      bestMatch,
      alternatives: items.slice(1, 6), // Top 5 alternatives
      averagePrice,
      priceRange,
      confidence,
      lastUpdated: new Date()
    };
  }

  /**
   * Generate estimated pricing when API is unavailable
   */
  private generateEstimatedPrice(ingredient: string): IngredientPriceResult {
    // Basic price estimation based on ingredient type
    const priceEstimates: { [key: string]: number } = {
      'meat': 8.0, 'chicken': 6.0, 'beef': 10.0, 'fish': 9.0,
      'vegetable': 2.0, 'tomato': 3.0, 'onion': 1.5, 'pepper': 2.5,
      'spice': 1.0, 'oil': 3.0, 'rice': 2.0, 'salt': 0.5
    };

    let estimatedPrice = 3.0; // Default
    for (const [type, price] of Object.entries(priceEstimates)) {
      if (ingredient.toLowerCase().includes(type)) {
        estimatedPrice = price;
        break;
      }
    }

    return {
      ingredient,
      searchQuery: ingredient,
      bestMatch: {
        id: 'estimated',
        name: `${ingredient} (estimated)`,
        price: estimatedPrice,
        unit: 'each',
        size: 'standard',
        availability: 'available' as const
      },
      alternatives: [],
      confidence: 'low' as const,
      lastUpdated: new Date()
    };
  }

  /**
   * Calculate string similarity for matching
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

export const instacartPricingService = new InstacartPricingService();