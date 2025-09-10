/**
 * Kroger API Integration for Real Grocery Pricing
 * Provides accurate grocery prices from Kroger stores
 */

interface KrogerProduct {
  productId: string;
  upc: string;
  name: string;
  description: string;
  brand: string;
  categories: string[];
  price: {
    regular: number;
    promo?: number;
    sale?: number;
  };
  size: string;
  unit: string;
  availability: 'InStock' | 'OutOfStock' | 'Limited';
  images?: Array<{
    perspective: string;
    size: string;
    url: string;
  }>;
}

interface KrogerLocation {
  locationId: string;
  name: string;
  address: {
    addressLine1: string;
    city: string;
    state: string;
    zipCode: string;
  };
  geolocation: {
    latitude: number;
    longitude: number;
  };
  phone: string;
}

interface IngredientPriceResult {
  ingredient: string;
  searchQuery: string;
  bestMatch?: KrogerProduct;
  alternatives: KrogerProduct[];
  averagePrice?: number;
  priceRange?: { min: number; max: number };
  confidence: 'high' | 'medium' | 'low';
  location?: KrogerLocation;
  lastUpdated: Date;
}

export class KrogerPricingService {
  private clientId: string;
  private apiKey: string;
  private baseURL = 'https://api.kroger.com/v1';
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private cache = new Map<string, IngredientPriceResult>();
  private readonly CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours

  constructor() {
    this.clientId = process.env.KROGER_CLIENT_ID || '';
    this.apiKey = process.env.KROGER_API_KEY || '';
  }

  /**
   * Get OAuth access token for Kroger API
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.clientId || !this.apiKey) {
      throw new Error('Kroger API credentials not configured');
    }

    try {
      console.log('🔑 Getting Kroger API access token...');

      const credentials = Buffer.from(`${this.clientId}:${this.apiKey}`).toString('base64');
      
      const response = await fetch(`${this.baseURL}/connect/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials&scope=product.compact'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Kroger OAuth error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer

      console.log('✅ Kroger access token obtained');
      return this.accessToken;

    } catch (error) {
      console.error('❌ Failed to get Kroger access token:', error);
      throw error;
    }
  }

  /**
   * Find Kroger locations near a zip code
   */
  async findLocations(zipCode: string, radius: number = 10): Promise<KrogerLocation[]> {
    try {
      const token = await this.getAccessToken();
      
      const response = await fetch(
        `${this.baseURL}/locations?filter.zipCode.near=${zipCode}&filter.radiusInMiles=${radius}&filter.limit=5`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Kroger locations API error: ${response.status}`);
      }

      const data = await response.json();
      return (data.data || []).map((location: any) => ({
        locationId: location.locationId,
        name: location.name,
        address: location.address,
        geolocation: location.geolocation,
        phone: location.phone
      }));

    } catch (error) {
      console.error('❌ Failed to find Kroger locations:', error);
      return [];
    }
  }

  /**
   * Search for products at a specific Kroger location
   */
  async searchProducts(
    query: string, 
    locationId: string, 
    limit: number = 10
  ): Promise<KrogerProduct[]> {
    try {
      const token = await this.getAccessToken();
      
      const searchParams = new URLSearchParams({
        'filter.term': query,
        'filter.locationId': locationId,
        'filter.limit': limit.toString()
      });

      const response = await fetch(`${this.baseURL}/products?${searchParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Kroger products API error: ${response.status}`);
      }

      const data = await response.json();
      return (data.data || []).map((product: any) => ({
        productId: product.productId,
        upc: product.upc,
        name: product.description || product.name,
        description: product.description,
        brand: product.brand,
        categories: product.categories || [],
        price: {
          regular: product.items?.[0]?.price?.regular || 0,
          promo: product.items?.[0]?.price?.promo,
          sale: product.items?.[0]?.price?.sale
        },
        size: product.items?.[0]?.size || '',
        unit: product.items?.[0]?.soldBy || 'each',
        availability: product.items?.[0]?.inventory?.stockLevel || 'InStock',
        images: product.images
      }));

    } catch (error) {
      console.error('❌ Failed to search Kroger products:', error);
      return [];
    }
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

    try {
      console.log(`🛒 Getting Kroger price for: ${ingredient}`);

      // Find nearby Kroger locations
      const locations = zipCode ? await this.findLocations(zipCode) : [];
      const location = locations[0]; // Use closest location

      if (!location) {
        console.warn(`⚠️ No Kroger locations found for ${zipCode || 'default area'}`);
        return this.generateEstimatedPrice(ingredient);
      }

      // Search for products
      const searchQuery = this.prepareSearchQuery(ingredient);
      const products = await this.searchProducts(searchQuery, location.locationId);

      if (products.length === 0) {
        console.warn(`⚠️ No Kroger products found for: ${ingredient}`);
        return this.generateEstimatedPrice(ingredient);
      }

      // Process results
      const result = this.processKrogerResults(ingredient, searchQuery, products, location);
      
      // Cache the result
      this.cache.set(cacheKey, result);
      
      console.log(`✅ Kroger pricing found for ${ingredient}:`, {
        bestMatch: result.bestMatch?.name,
        price: result.bestMatch?.price.regular,
        confidence: result.confidence,
        location: location.name
      });

      return result;

    } catch (error) {
      console.error(`❌ Kroger pricing failed for ${ingredient}:`, error);
      return this.generateEstimatedPrice(ingredient);
    }
  }

  /**
   * Get pricing for multiple ingredients
   */
  async getMultipleIngredientPrices(
    ingredients: string[], 
    zipCode?: string
  ): Promise<Map<string, IngredientPriceResult>> {
    const results = new Map<string, IngredientPriceResult>();
    
    // Process ingredients in batches to respect rate limits
    const batchSize = 3; // Conservative for Kroger API
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
          results.set(batch[j], this.generateEstimatedPrice(batch[j]));
        }
      }

      // Rate limiting delay between batches
      if (i + batchSize < ingredients.length) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }
    }

    return results;
  }

  /**
   * Calculate total recipe cost with Kroger pricing
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
      krogerLocation?: string;
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
        const unitPrice = pricing.bestMatch.price.regular;
        const itemCost = unitPrice * quantity;
        
        totalCost += itemCost;
        ingredientCosts.push({
          ingredient: ingredient.name,
          unitPrice,
          quantity,
          totalCost: itemCost,
          confidence: pricing.confidence,
          krogerLocation: pricing.location?.name
        });

        // Generate budget optimization tips
        if (pricing.bestMatch.price.sale && pricing.bestMatch.price.sale < unitPrice) {
          const savings = ((unitPrice - pricing.bestMatch.price.sale) / unitPrice * 100);
          budgetTips.push(`${ingredient.name} is on sale: Save ${savings.toFixed(0)}% at ${pricing.location?.name}`);
        }

        if (pricing.alternatives.length > 0) {
          const cheaperAlts = pricing.alternatives.filter(alt => alt.price.regular < unitPrice * 0.9);
          if (cheaperAlts.length > 0) {
            budgetTips.push(`Consider ${cheaperAlts[0].brand} ${ingredient.name} for additional savings`);
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
        estimatedSavings: budgetTips.length * 1.5,
        budgetOptimizationTips: budgetTips.slice(0, 3)
      }
    };
  }

  /**
   * Prepare search query for Kroger API
   */
  private prepareSearchQuery(ingredient: string): string {
    // Remove measurements and clean up ingredient name
    let cleaned = ingredient
      .replace(/^\d+(\.\d+)?\s*(cups?|tbsp|tsp|lbs?|oz|pounds?|ounces?|cloves?|pieces?)\s*/i, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/,.*$/, '')
      .trim();

    // Handle common ingredient variations for Kroger
    const substitutions = {
      'scotch bonnet pepper': 'hot pepper',
      'plum tomatoes': 'roma tomatoes',
      'long-grain rice': 'white rice',
      'sunflower oil': 'vegetable oil',
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
   * Process Kroger API results
   */
  private processKrogerResults(
    originalIngredient: string,
    searchQuery: string,
    products: KrogerProduct[],
    location: KrogerLocation
  ): IngredientPriceResult {
    // Filter available products
    const availableProducts = products.filter(p => p.availability === 'InStock');
    const bestMatch = availableProducts.length > 0 ? availableProducts[0] : products[0];

    // Calculate confidence based on name similarity and availability
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (bestMatch) {
      const nameSimilarity = this.calculateSimilarity(
        searchQuery.toLowerCase(), 
        bestMatch.name.toLowerCase()
      );
      if (nameSimilarity > 0.6 && bestMatch.availability === 'InStock') {
        confidence = 'high';
      } else if (nameSimilarity > 0.3) {
        confidence = 'medium';
      }
    }

    // Calculate price statistics
    const prices = availableProducts.map(p => p.price.regular).filter(price => price > 0);
    const averagePrice = prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) / prices.length : undefined;
    const priceRange = prices.length > 0 ? { min: Math.min(...prices), max: Math.max(...prices) } : undefined;

    return {
      ingredient: originalIngredient,
      searchQuery,
      bestMatch,
      alternatives: products.slice(1, 6),
      averagePrice,
      priceRange,
      confidence,
      location,
      lastUpdated: new Date()
    };
  }

  /**
   * Generate estimated pricing when API is unavailable
   */
  private generateEstimatedPrice(ingredient: string): IngredientPriceResult {
    const priceEstimates: { [key: string]: number } = {
      'meat': 8.0, 'chicken': 6.0, 'beef': 10.0, 'fish': 9.0,
      'vegetable': 2.0, 'tomato': 3.0, 'onion': 1.5, 'pepper': 2.5,
      'spice': 1.0, 'oil': 3.0, 'rice': 2.0, 'salt': 0.5
    };

    let estimatedPrice = 3.0;
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
        productId: 'estimated',
        upc: '',
        name: `${ingredient} (estimated)`,
        description: `Estimated price for ${ingredient}`,
        brand: 'Generic',
        categories: [],
        price: { regular: estimatedPrice },
        size: 'standard',
        unit: 'each',
        availability: 'InStock' as const
      },
      alternatives: [],
      confidence: 'low' as const,
      lastUpdated: new Date()
    };
  }

  /**
   * Calculate string similarity
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
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

  /**
   * Get store by ZIP code (alias for findLocations)
   */
  async getStoreByZipCode(zipCode: string): Promise<KrogerLocation | null> {
    const locations = await this.findLocations(zipCode);
    return locations.length > 0 ? locations[0] : null;
  }

  /**
   * Search ingredient (simplified interface for API compatibility)
   */
  async searchIngredient(ingredient: string, locationId: string): Promise<{
    success: boolean;
    products: Array<{
      productId: string;
      description: string;
      price: number;
      brand?: string;
      size?: string;
      onSale?: boolean;
      salePrice?: number;
    }>;
  }> {
    try {
      const products = await this.searchProducts(ingredient, locationId);
      
      return {
        success: true,
        products: products.map(product => ({
          productId: product.productId,
          description: product.description,
          price: product.price.regular,
          brand: product.brand,
          size: product.size,
          onSale: !!(product.price.sale && product.price.sale < product.price.regular),
          salePrice: product.price.sale
        }))
      };
    } catch (error) {
      console.error('Search ingredient failed:', error);
      return {
        success: false,
        products: []
      };
    }
  }
}

export const krogerPricingService = new KrogerPricingService();