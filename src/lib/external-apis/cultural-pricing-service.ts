/**
 * Cultural Price Intelligence Service
 * Provides culturally-aware pricing that understands specialty ingredients,
 * ethnic markets, and community shopping patterns
 */

import { enhancedPricingService } from './enhanced-pricing-service';
import { googlePlacesService } from './google-places-service';
// import { bedrockService } from '@/lib/ai/bedrock-service'; // DISABLED
import type { Ingredient, UserProfile } from '@/types';

export interface CulturalIngredientContext {
  ingredient: string;
  culturalOrigin: string[];
  traditionalName?: string;
  culturalSignificance: 'essential' | 'important' | 'common' | 'optional';
  seasonality?: {
    peak: string[];
    available: string[];
    scarce: string[];
  };
  alternativeNames: string[];
  commonSubstitutes: string[];
}

export interface CulturalStore {
  id: string;
  name: string;
  type: 'ethnic_market' | 'specialty_store' | 'halal' | 'kosher' | 'asian' | 'mexican' | 'middle_eastern' | 'african' | 'indian' | 'mainstream';
  culturalSpecialties: string[];
  address: string;
  distance: number;
  priceReliability: number; // 0-1 how often they have cultural ingredients
  qualityRating: number; // 0-5 community rating for authenticity/quality
  avgPriceDifference: number; // % difference from mainstream stores
  languages: string[];
  googlePlaceId?: string;
  hours?: any;
  phone?: string;
}

export interface CulturalPriceResult {
  ingredient: string;
  culturalContext: CulturalIngredientContext;
  pricingOptions: CulturalPricingOption[];
  recommendations: CulturalRecommendation[];
  totalEstimatedCost: number;
  bestOption: CulturalPricingOption;
  culturalNotes: string[];
}

export interface CulturalPricingOption {
  store: CulturalStore;
  price: number;
  unit: string;
  availability: 'in_stock' | 'likely' | 'seasonal' | 'call_ahead' | 'unknown';
  quality: 'premium' | 'standard' | 'basic';
  authenticity: 'traditional' | 'adapted' | 'substitute';
  confidence: number;
  notes: string[];
  estimatedSavings?: number;
  bulkOptions?: {
    quantity: number;
    price: number;
    savings: number;
  };
}

export interface CulturalRecommendation {
  type: 'store_choice' | 'timing' | 'quantity' | 'substitute' | 'cultural_tip';
  message: string;
  impact: 'cost' | 'quality' | 'authenticity' | 'convenience';
  priority: 'high' | 'medium' | 'low';
  culturalContext?: string;
}

export interface CulturalPricingRequest {
  ingredients: Ingredient[];
  culturalOrigin: string[];
  userLocation: string;
  userProfile: Pick<UserProfile, 'preferences' | 'budget' | 'savedStores'>;
  recipeContext?: {
    recipeName: string;
    occasion: 'everyday' | 'special' | 'holiday' | 'ceremonial';
    authenticity: 'traditional' | 'adapted' | 'fusion';
  };
}

export interface CulturalPricingResponse {
  results: CulturalPriceResult[];
  storeRecommendations: CulturalStore[];
  totalEstimatedCost: number;
  potentialSavings: number;
  culturalInsights: string[];
  shoppingStrategy: {
    primaryStore: CulturalStore;
    secondaryStores: CulturalStore[];
    shoppingOrder: string[];
    estimatedTime: number;
    totalDistance: number;
  };
}

class CulturalPricingService {
  private culturalStoreCache = new Map<string, CulturalStore[]>();
  private ingredientContextCache = new Map<string, CulturalIngredientContext>();

  /**
   * Get culturally-aware pricing for recipe ingredients
   */
  async getCulturalPricing(request: CulturalPricingRequest): Promise<CulturalPricingResponse> {
    console.log(`Getting cultural pricing for ${request.ingredients.length} ingredients from ${request.culturalOrigin.join(', ')} cuisine`);

    // 1. Analyze ingredients for cultural context
    const ingredientContexts = await this.analyzeIngredientCulturalContext(
      request.ingredients,
      request.culturalOrigin,
      request.recipeContext
    );

    // 2. Find relevant cultural stores
    const culturalStores = await this.findCulturalStores(
      request.userLocation,
      request.culturalOrigin,
      request.userProfile.savedStores
    );

    // 3. Get pricing from multiple sources
    const pricingResults = await this.getPricingFromCulturalSources(
      ingredientContexts,
      culturalStores,
      request.userLocation
    );

    // 4. Generate cultural recommendations
    const recommendations = await this.generateCulturalRecommendations(
      pricingResults,
      culturalStores,
      request.recipeContext
    );

    // 5. Create optimal shopping strategy
    const shoppingStrategy = this.createShoppingStrategy(pricingResults, culturalStores);

    const totalEstimatedCost = pricingResults.reduce((sum, result) => sum + result.totalEstimatedCost, 0);
    const potentialSavings = this.calculatePotentialSavings(pricingResults);

    return {
      results: pricingResults,
      storeRecommendations: culturalStores,
      totalEstimatedCost,
      potentialSavings,
      culturalInsights: this.generateCulturalInsights(pricingResults, request.culturalOrigin),
      shoppingStrategy,
    };
  }

  /**
   * Analyze ingredients for cultural context and significance
   */
  private async analyzeIngredientCulturalContext(
    ingredients: Ingredient[],
    culturalOrigin: string[],
    recipeContext?: any
  ): Promise<CulturalIngredientContext[]> {
    const contexts: CulturalIngredientContext[] = [];

    for (const ingredient of ingredients) {
      const cacheKey = `${ingredient.name}-${culturalOrigin.join(',')}`;
      let context = this.ingredientContextCache.get(cacheKey);

      if (!context) {
        context = await this.analyzeIngredientWithAI(ingredient, culturalOrigin, recipeContext);
        this.ingredientContextCache.set(cacheKey, context);
      }

      contexts.push(context);
    }

    return contexts;
  }

  /**
   * Use AI to analyze ingredient cultural context
   */
  private async analyzeIngredientWithAI(
    ingredient: Ingredient,
    culturalOrigin: string[],
    recipeContext?: any
  ): Promise<CulturalIngredientContext> {
    try {
      const prompt = `
Analyze this ingredient in the context of ${culturalOrigin.join(' and ')} cuisine:

Ingredient: ${ingredient.name}
Amount: ${ingredient.amount} ${ingredient.unit}
Cultural Name: ${ingredient.culturalName || 'not specified'}
Recipe Context: ${recipeContext?.recipeName || 'general cooking'}

Provide analysis in this JSON format:
{
  "ingredient": "${ingredient.name}",
  "culturalOrigin": ${JSON.stringify(culturalOrigin)},
  "traditionalName": "traditional name if different",
  "culturalSignificance": "essential|important|common|optional",
  "seasonality": {
    "peak": ["month1", "month2"],
    "available": ["month1", "month2", "month3"],
    "scarce": ["month1", "month2"]
  },
  "alternativeNames": ["name1", "name2"],
  "commonSubstitutes": ["substitute1", "substitute2"],
  "culturalNotes": "Important cultural context about this ingredient"
}

Consider:
- Is this ingredient essential for authenticity?
- What are traditional names in different languages?
- When is it typically in season?
- What are culturally appropriate substitutes?
- Where is it typically purchased (specialty stores vs mainstream)?
`;

      // Bedrock AI disabled - using fallback cultural context
      console.log('Using fallback cultural analysis (Bedrock AI disabled)');
      const response = this.getFallbackCulturalContext(ingredient, culturalOrigins);
      
      try {
        const parsed = JSON.parse(response);
        return {
          ingredient: ingredient.name,
          culturalOrigin,
          traditionalName: parsed.traditionalName,
          culturalSignificance: parsed.culturalSignificance || 'common',
          seasonality: parsed.seasonality,
          alternativeNames: parsed.alternativeNames || [],
          commonSubstitutes: parsed.commonSubstitutes || [],
        };
      } catch (parseError) {
        console.warn('Failed to parse AI response for ingredient analysis:', parseError);
        return this.getDefaultIngredientContext(ingredient, culturalOrigin);
      }
    } catch (error) {
      console.error('Failed to analyze ingredient with AI:', error);
      return this.getDefaultIngredientContext(ingredient, culturalOrigin);
    }
  }

  /**
   * Find cultural stores relevant to the cuisine and location
   */
  private async findCulturalStores(
    location: string,
    culturalOrigin: string[],
    savedStores: any[]
  ): Promise<CulturalStore[]> {
    const cacheKey = `${location}-${culturalOrigin.join(',')}`;
    let stores = this.culturalStoreCache.get(cacheKey);

    if (!stores) {
      stores = await this.searchCulturalStores(location, culturalOrigin);
      
      // Add user's saved stores that match cultural context
      const relevantSavedStores = savedStores
        .filter(store => this.isStoreRelevantToCulture(store, culturalOrigin))
        .map(store => this.convertSavedStoreToCulturalStore(store));
      
      stores.push(...relevantSavedStores);
      
      // Remove duplicates and sort by relevance
      stores = this.deduplicateAndSortStores(stores, culturalOrigin);
      
      this.culturalStoreCache.set(cacheKey, stores);
    }

    return stores;
  }

  /**
   * Search for cultural stores using Google Places API
   */
  private async searchCulturalStores(location: string, culturalOrigin: string[]): Promise<CulturalStore[]> {
    const stores: CulturalStore[] = [];

    // Define search terms for different cultural cuisines
    const searchTerms = this.getCulturalSearchTerms(culturalOrigin);

    for (const term of searchTerms) {
      try {
        const places = await googlePlacesService.searchStores(term, undefined, 10000); // 10km radius - location parsing not implemented
        
        for (const place of places) {
          const culturalStore = await this.convertPlaceToCulturalStore(place, culturalOrigin);
          if (culturalStore) {
            stores.push(culturalStore);
          }
        }
      } catch (error) {
        console.warn(`Failed to search for ${term}:`, error);
      }
    }

    return stores;
  }

  /**
   * Get pricing from cultural sources (Perplexity + database + stores)
   */
  private async getPricingFromCulturalSources(
    ingredientContexts: CulturalIngredientContext[],
    culturalStores: CulturalStore[],
    location: string
  ): Promise<CulturalPriceResult[]> {
    const results: CulturalPriceResult[] = [];

    // First, check database cache
    const { culturalPricingDb } = await import('@/lib/database/cultural-pricing-db');
    const ingredientNames = ingredientContexts.map(ctx => ctx.ingredient);
    const culturalContext = ingredientContexts[0]?.culturalOrigin[0];
    
    const cachedPrices = await culturalPricingDb.getCachedPricing(
      ingredientNames,
      location,
      culturalContext
    );

    // Get fresh pricing from Perplexity for ingredients not in cache or with low confidence
    const needsFreshPricing = ingredientContexts.filter(context => {
      const cached = cachedPrices.find(p => 
        p.normalized_name === context.ingredient.toLowerCase().trim()
      );
      return !cached || cached.confidence < 0.6 || new Date(cached.expires_at) < new Date();
    });

    let perplexityResults: any[] = [];
    if (needsFreshPricing.length > 0) {
      try {
        console.log(`Getting fresh Perplexity pricing for ${needsFreshPricing.length} ingredients`);
        
        const { perplexityPricingService } = await import('./perplexity-service');
        const perplexityResponse = await perplexityPricingService.getCulturalIngredientPrices({
          ingredients: needsFreshPricing.map(ctx => ctx.ingredient),
          location,
          culturalContext
        });

        if (perplexityResponse.success && perplexityResponse.data.length > 0) {
          perplexityResults = perplexityResponse.data;
          
          // Store fresh results in database
          await culturalPricingDb.storePricingData(
            needsFreshPricing.map(ctx => ctx.ingredient),
            perplexityResults,
            location,
            culturalContext,
            'perplexity'
          );
        }
      } catch (error) {
        console.error('Failed to get Perplexity pricing:', error);
      }
    }

    // Process each ingredient
    for (const context of ingredientContexts) {
      try {
        // Get pricing options from multiple sources
        const pricingOptions = await this.getPricingOptionsForIngredient(
          context,
          culturalStores,
          location,
          cachedPrices,
          perplexityResults
        );

        // Generate recommendations for this ingredient - method not implemented
        // const recommendations = await this.generateIngredientRecommendations(
        //   context,
        //   pricingOptions
        // );

        // Find best option
        const bestOption = this.selectBestPricingOption(pricingOptions, context);
        
        results.push({
          ingredient: context.ingredient,
          culturalContext: context,
          pricingOptions,
          recommendations: [], // Empty array since method is not implemented
          totalEstimatedCost: bestOption?.price || 0,
          bestOption: bestOption || pricingOptions[0] || {
            store: { 
              id: 'unknown',
              name: 'Unknown', 
              type: 'mainstream', 
              address: '',
              culturalSpecialties: [],
              distance: 0,
              priceReliability: 0,
              qualityRating: 0,
              avgPriceDifference: 0,
              languages: []
            },
            price: 0,
            unit: 'each',
            availability: 'unknown' as const,
            quality: 'basic' as const,
            authenticity: 'substitute' as const,
            confidence: 0,
            notes: ['No pricing data available']
          },
          culturalNotes: this.generateCulturalNotes(context, pricingOptions),
        });
      } catch (error) {
        console.error(`Failed to get pricing for ${context.ingredient}:`, error);
        
        // Fallback to basic pricing
        const fallbackResult = await this.getFallbackPricing(context, location);
        results.push(fallbackResult);
      }
    }

    return results;
  }

  /**
   * Get pricing options for a specific ingredient from multiple sources
   */
  private async getPricingOptionsForIngredient(
    context: CulturalIngredientContext,
    culturalStores: CulturalStore[],
    location: string,
    cachedPrices: any[] = [],
    perplexityResults: any[] = []
  ): Promise<CulturalPricingOption[]> {
    const options: CulturalPricingOption[] = [];

    // 1. Use cached database prices first
    const cachedForIngredient = cachedPrices.filter(p => 
      p.normalized_name === context.ingredient.toLowerCase().trim()
    );
    
    for (const cached of cachedForIngredient) {
      options.push({
        store: {
          id: cached.store_id || 'cached',
          name: cached.store_name,
          type: cached.store_type as any,
          culturalSpecialties: [],
          address: 'Cached location',
          distance: 0,
          priceReliability: cached.confidence,
          qualityRating: 4,
          avgPriceDifference: cached.store_type === 'ethnic_market' ? -15 : 0,
          languages: ['English']
        },
        price: cached.price,
        unit: cached.unit,
        availability: 'likely',
        quality: cached.cultural_relevance === 'high' ? 'premium' : 'standard',
        authenticity: cached.cultural_relevance === 'high' ? 'traditional' : 'adapted',
        confidence: cached.confidence,
        notes: cached.notes ? [cached.notes] : [],
      });
    }

    // 2. Use fresh Perplexity results
    const perplexityForIngredient = perplexityResults.filter(p => 
      p.ingredient.toLowerCase() === context.ingredient.toLowerCase()
    );
    
    for (const perplexity of perplexityForIngredient) {
      options.push({
        store: {
          id: 'perplexity',
          name: perplexity.store,
          type: perplexity.storeType || 'mainstream',
          culturalSpecialties: perplexity.storeType === 'ethnic_market' && context.culturalOrigin[0] ? [context.culturalOrigin[0]] : [],
          address: 'Live search result',
          distance: 0,
          priceReliability: perplexity.confidence,
          qualityRating: perplexity.culturalRelevance === 'high' ? 4.5 : 3.5,
          avgPriceDifference: perplexity.storeType === 'ethnic_market' ? -15 : 0,
          languages: ['English']
        },
        price: perplexity.estimatedPrice,
        unit: perplexity.unit,
        availability: perplexity.seasonalAvailability === 'seasonal' ? 'seasonal' : 'likely',
        quality: perplexity.culturalRelevance === 'high' ? 'premium' : 'standard',
        authenticity: perplexity.culturalRelevance === 'high' ? 'traditional' : 'adapted',
        confidence: perplexity.confidence,
        notes: perplexity.notes ? [perplexity.notes] : [],
        bulkOptions: perplexity.bulkOptions ? {
          quantity: parseInt(perplexity.bulkOptions.minQuantity) || 5,
          price: perplexity.bulkOptions.bulkPrice || perplexity.estimatedPrice * 0.85,
          savings: parseFloat(perplexity.bulkOptions.savings) || 15
        } : undefined
      });
    }

    // 3. Fallback to existing cultural store estimation if no other data
    if (options.length === 0) {
      const culturalStorePricing = await this.getCulturalStorePricing(context, culturalStores);
      options.push(...culturalStorePricing);

      // 4. Get mainstream store pricing as comparison
      const mainstreamPricing = await this.getMainstreamStorePricing(context, location);
      options.push(...mainstreamPricing);
    }

    // 5. Sort by best value (considering price, quality, authenticity)
    return options.sort((a, b) => this.calculateOptionScore(b, context) - this.calculateOptionScore(a, context));
  }

  /**
   * Get pricing from cultural/ethnic stores using AI
   */
  private async getCulturalStorePricing(
    context: CulturalIngredientContext,
    culturalStores: CulturalStore[]
  ): Promise<CulturalPricingOption[]> {
    const options: CulturalPricingOption[] = [];

    // Filter stores relevant to this ingredient
    const relevantStores = culturalStores.filter(store => 
      this.isStoreRelevantToIngredient(store, context)
    );

    for (const store of relevantStores.slice(0, 5)) { // Limit to top 5 stores
      try {
        const pricing = await this.estimateStorePricing(context, store);
        if (pricing) {
          options.push(pricing);
        }
      } catch (error) {
        console.warn(`Failed to get pricing from ${store.name}:`, error);
      }
    }

    return options;
  }

  /**
   * Estimate pricing for ingredient at specific cultural store using AI
   */
  private async estimateStorePricing(
    context: CulturalIngredientContext,
    store: CulturalStore
  ): Promise<CulturalPricingOption | null> {
    try {
      const prompt = `
Estimate pricing for this ingredient at this cultural store:

Ingredient: ${context.ingredient}
Traditional Name: ${context.traditionalName || 'N/A'}
Cultural Significance: ${context.culturalSignificance}
Alternative Names: ${context.alternativeNames.join(', ')}

Store: ${store.name}
Store Type: ${store.type}
Cultural Specialties: ${store.culturalSpecialties.join(', ')}
Average Price Difference: ${store.avgPriceDifference}% vs mainstream

Provide estimate in this JSON format:
{
  "price": 0.00,
  "unit": "per lb/per oz/per item",
  "availability": "in_stock|likely|seasonal|call_ahead|unknown",
  "quality": "premium|standard|basic",
  "authenticity": "traditional|adapted|substitute",
  "confidence": 0.8,
  "notes": ["note1", "note2"],
  "bulkOptions": {
    "quantity": 5,
    "price": 0.00,
    "savings": 0.00
  }
}

Consider:
- Cultural stores often have better prices for specialty ingredients
- Quality is typically higher for culturally relevant items
- Seasonal availability affects pricing
- Bulk options are common for staple ingredients
`;

      // Bedrock AI disabled - using fallback cultural context
      console.log('Using fallback cultural analysis (Bedrock AI disabled)');
      const response = this.getFallbackCulturalContext(ingredient, culturalOrigins);
      const parsed = JSON.parse(response);

      return {
        store,
        price: parsed.price || 0,
        unit: parsed.unit || 'each',
        availability: parsed.availability || 'unknown',
        quality: parsed.quality || 'standard',
        authenticity: parsed.authenticity || 'traditional',
        confidence: parsed.confidence || 0.6,
        notes: parsed.notes || [],
        bulkOptions: parsed.bulkOptions,
      };
    } catch (error) {
      console.warn(`Failed to estimate pricing for ${context.ingredient} at ${store.name}:`, error);
      return null;
    }
  }

  /**
   * Get mainstream store pricing using existing service
   */
  private async getMainstreamStorePricing(
    context: CulturalIngredientContext,
    location: string
  ): Promise<CulturalPricingOption[]> {
    try {
      // Use existing enhanced pricing service
      const pricingResponse = await enhancedPricingService.getIngredientPricing({
        ingredients: [context.ingredient, ...context.alternativeNames].slice(0, 3),
        location,
      });

      return pricingResponse.results.map(result => ({
        store: {
          id: 'mainstream',
          name: result.store,
          type: 'mainstream' as const,
          culturalSpecialties: [],
          address: 'Various locations',
          distance: 5, // Estimated
          priceReliability: result.confidence,
          qualityRating: 3,
          avgPriceDifference: 0,
          languages: ['English'],
        },
        price: result.estimatedCost,
        unit: result.unit,
        availability: result.confidence > 0.7 ? 'in_stock' : 'unknown',
        quality: 'standard' as const,
        authenticity: 'substitute' as const,
        confidence: result.confidence,
        notes: result.notes ? [result.notes] : [],
      }));
    } catch (error) {
      console.warn('Failed to get mainstream pricing:', error);
      return [];
    }
  }

  /**
   * Helper methods
   */

  private getCulturalSearchTerms(culturalOrigin: string[]): string[] {
    const termMap: Record<string, string[]> = {
      'middle_eastern': ['middle eastern market', 'persian grocery', 'halal market', 'arabic store'],
      'persian': ['persian market', 'iranian grocery', 'middle eastern store'],
      'indian': ['indian grocery', 'south asian market', 'bollywood market'],
      'chinese': ['chinese grocery', 'asian market', 'chinese supermarket'],
      'mexican': ['mexican market', 'mercado', 'latin american grocery'],
      'korean': ['korean market', 'korean grocery', 'h mart'],
      'japanese': ['japanese market', 'asian grocery'],
      'thai': ['thai market', 'southeast asian grocery'],
      'vietnamese': ['vietnamese market', 'asian grocery'],
      'african': ['african market', 'ethiopian grocery', 'west african store'],
      'jewish': ['kosher market', 'jewish grocery'],
      'halal': ['halal market', 'islamic grocery'],
    };

    const terms: string[] = [];
    for (const origin of culturalOrigin) {
      const originTerms = termMap[origin.toLowerCase()] || [`${origin} market`, `${origin} grocery`];
      terms.push(...originTerms);
    }

    // Add generic terms
    terms.push('ethnic grocery', 'international market', 'specialty food store');

    return [...new Set(terms)]; // Remove duplicates
  }

  private async convertPlaceToCulturalStore(place: any, culturalOrigin: string[]): Promise<CulturalStore | null> {
    try {
      // Use AI to analyze if this place is relevant and what type it is
      const analysis = await this.analyzeStoreRelevance(place, culturalOrigin);
      
      if (!analysis.isRelevant) {
        return null;
      }

      return {
        id: place.place_id,
        name: place.name,
        type: analysis.storeType,
        culturalSpecialties: analysis.specialties,
        address: place.formatted_address || place.vicinity,
        distance: 0, // Would calculate based on user location
        priceReliability: analysis.priceReliability,
        qualityRating: place.rating || 3,
        avgPriceDifference: analysis.avgPriceDifference,
        languages: analysis.languages,
        googlePlaceId: place.place_id,
        hours: place.opening_hours,
        phone: place.formatted_phone_number,
      };
    } catch (error) {
      console.warn('Failed to convert place to cultural store:', error);
      return null;
    }
  }

  private async analyzeStoreRelevance(place: any, culturalOrigin: string[]): Promise<any> {
    // Simplified analysis - in production would use AI
    const name = place.name.toLowerCase();
    const types = place.types || [];
    
    let storeType: CulturalStore['type'] = 'mainstream';
    let isRelevant = false;
    let specialties: string[] = [];

    // Simple keyword matching
    if (name.includes('halal') || types.includes('halal')) {
      storeType = 'halal';
      isRelevant = true;
      specialties = ['halal meat', 'middle eastern ingredients'];
    } else if (name.includes('kosher')) {
      storeType = 'kosher';
      isRelevant = true;
      specialties = ['kosher products'];
    } else if (name.includes('asian') || name.includes('chinese') || name.includes('korean')) {
      storeType = 'asian';
      isRelevant = true;
      specialties = ['asian ingredients', 'soy products', 'rice varieties'];
    } else if (name.includes('mexican') || name.includes('mercado')) {
      storeType = 'mexican';
      isRelevant = true;
      specialties = ['mexican ingredients', 'chiles', 'masa'];
    } else if (name.includes('middle eastern') || name.includes('persian') || name.includes('arabic')) {
      storeType = 'middle_eastern';
      isRelevant = true;
      specialties = ['middle eastern spices', 'persian ingredients'];
    }

    return {
      isRelevant,
      storeType,
      specialties,
      priceReliability: 0.7,
      avgPriceDifference: -15, // Typically 15% cheaper for specialty items
      languages: ['English'], // Would detect from reviews/data
    };
  }

  private getDefaultIngredientContext(ingredient: Ingredient, culturalOrigin: string[]): CulturalIngredientContext {
    return {
      ingredient: ingredient.name,
      culturalOrigin,
      culturalSignificance: 'common',
      alternativeNames: [],
      commonSubstitutes: [],
    };
  }

  private isStoreRelevantToCulture(store: any, culturalOrigin: string[]): boolean {
    // Simple check - would be more sophisticated in production
    const storeSpecialties = store.specialties || [];
    return culturalOrigin.some(origin => 
      storeSpecialties.some((specialty: string) => 
        specialty.toLowerCase().includes(origin.toLowerCase())
      )
    );
  }

  private convertSavedStoreToCulturalStore(savedStore: any): CulturalStore {
    return {
      id: savedStore.id,
      name: savedStore.storeName,
      type: savedStore.storeType || 'specialty_store',
      culturalSpecialties: savedStore.specialties || [],
      address: savedStore.address,
      distance: 0,
      priceReliability: 0.8, // User saved it, likely reliable
      qualityRating: savedStore.rating || 4,
      avgPriceDifference: -10,
      languages: ['English'],
      googlePlaceId: savedStore.googlePlaceId,
    };
  }

  private deduplicateAndSortStores(stores: CulturalStore[], culturalOrigin: string[]): CulturalStore[] {
    // Remove duplicates by name/address
    const seen = new Set<string>();
    const unique = stores.filter(store => {
      const key = `${store.name}-${store.address}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by relevance to cultural origin
    return unique.sort((a, b) => {
      const aRelevance = this.calculateStoreRelevance(a, culturalOrigin);
      const bRelevance = this.calculateStoreRelevance(b, culturalOrigin);
      return bRelevance - aRelevance;
    });
  }

  private calculateStoreRelevance(store: CulturalStore, culturalOrigin: string[]): number {
    let score = 0;
    
    // Type relevance
    if (store.type !== 'mainstream') score += 3;
    
    // Specialty match
    const specialtyMatches = store.culturalSpecialties.filter(specialty =>
      culturalOrigin.some(origin => specialty.toLowerCase().includes(origin.toLowerCase()))
    ).length;
    score += specialtyMatches * 2;
    
    // Quality and reliability
    score += store.qualityRating * 0.5;
    score += store.priceReliability * 2;
    
    return score;
  }

  private isStoreRelevantToIngredient(store: CulturalStore, context: CulturalIngredientContext): boolean {
    // Check if store specializes in ingredients from this cultural origin
    return context.culturalOrigin.some(origin =>
      store.culturalSpecialties.some(specialty =>
        specialty.toLowerCase().includes(origin.toLowerCase())
      )
    ) || store.type !== 'mainstream';
  }

  private calculateOptionScore(option: CulturalPricingOption, context: CulturalIngredientContext): number {
    let score = 0;
    
    // Price factor (lower is better)
    score += (1 / (option.price + 1)) * 10;
    
    // Confidence factor
    score += option.confidence * 5;
    
    // Authenticity factor
    const authenticityScore = {
      'traditional': 3,
      'adapted': 2,
      'substitute': 1
    };
    score += authenticityScore[option.authenticity] || 1;
    
    // Cultural significance factor
    if (context.culturalSignificance === 'essential') {
      score += authenticityScore[option.authenticity] * 2;
    }
    
    return score;
  }

  private selectBestPricingOption(
    options: CulturalPricingOption[],
    context: CulturalIngredientContext
  ): CulturalPricingOption | null {
    if (options.length === 0) return null;
    
    return options.reduce((best, current) => 
      this.calculateOptionScore(current, context) > this.calculateOptionScore(best, context) 
        ? current 
        : best
    );
  }

  private generateCulturalNotes(
    context: CulturalIngredientContext,
    options: CulturalPricingOption[]
  ): string[] {
    const notes: string[] = [];
    
    if (context.culturalSignificance === 'essential') {
      notes.push(`${context.ingredient} is essential for authentic ${context.culturalOrigin.join('/')} cuisine`);
    }
    
    if (context.traditionalName && context.traditionalName !== context.ingredient) {
      notes.push(`Also known as "${context.traditionalName}" in traditional recipes`);
    }
    
    const culturalStoreOptions = options.filter(opt => opt.store.type !== 'mainstream');
    if (culturalStoreOptions.length > 0) {
      const avgSavings = culturalStoreOptions.reduce((sum, opt) => sum + (opt.estimatedSavings || 0), 0) / culturalStoreOptions.length;
      if (avgSavings > 0) {
        notes.push(`Cultural markets typically offer ${avgSavings.toFixed(0)}% savings on this ingredient`);
      }
    }
    
    return notes;
  }

  private async generateCulturalRecommendations(
    results: CulturalPriceResult[],
    stores: CulturalStore[],
    recipeContext?: any
  ): Promise<CulturalRecommendation[]> {
    // Generate recommendations based on analysis
    const recommendations: CulturalRecommendation[] = [];
    
    // Store recommendations
    const culturalStores = stores.filter(s => s.type !== 'mainstream');
    if (culturalStores.length > 0 && culturalStores[0]) {
      recommendations.push({
        type: 'store_choice',
        message: `Visit ${culturalStores[0].name} for authentic ingredients at better prices`,
        impact: 'cost',
        priority: 'high',
        culturalContext: `Specializes in ${culturalStores[0].culturalSpecialties.join(', ')}`
      });
    }
    
    // Timing recommendations
    const seasonalIngredients = results.filter(r => r.culturalContext.seasonality);
    if (seasonalIngredients.length > 0) {
      recommendations.push({
        type: 'timing',
        message: 'Some ingredients are seasonal - consider timing for best prices and quality',
        impact: 'cost',
        priority: 'medium'
      });
    }
    
    return recommendations;
  }

  private createShoppingStrategy(
    results: CulturalPriceResult[],
    stores: CulturalStore[]
  ): CulturalPricingResponse['shoppingStrategy'] {
    // Simple strategy - would be more sophisticated in production
    const primaryStore = stores.find(s => s.type !== 'mainstream') || stores[0];
    const secondaryStores = stores.filter(s => s.id !== primaryStore?.id).slice(0, 2);
    
    return {
      primaryStore: primaryStore!,
      secondaryStores,
      shoppingOrder: [primaryStore?.name || '', ...secondaryStores.map(s => s.name)],
      estimatedTime: 45 + (secondaryStores.length * 20),
      totalDistance: 10 + (secondaryStores.length * 5)
    };
  }

  private calculatePotentialSavings(results: CulturalPriceResult[]): number {
    return results.reduce((sum, result) => {
      const savings = result.pricingOptions.reduce((max, option) => 
        Math.max(max, option.estimatedSavings || 0), 0
      );
      return sum + savings;
    }, 0);
  }

  private generateCulturalInsights(results: CulturalPriceResult[], culturalOrigin: string[]): string[] {
    const insights: string[] = [];
    
    const essentialIngredients = results.filter(r => r.culturalContext.culturalSignificance === 'essential');
    if (essentialIngredients.length > 0) {
      insights.push(`${essentialIngredients.length} ingredients are essential for authentic ${culturalOrigin.join('/')} cuisine`);
    }
    
    const culturalStoreCount = results.reduce((count, result) => 
      count + result.pricingOptions.filter(opt => opt.store.type !== 'mainstream').length, 0
    );
    
    if (culturalStoreCount > 0) {
      insights.push(`Cultural markets offer better prices and authenticity for ${culturalStoreCount} ingredient options`);
    }
    
    return insights;
  }

  private async getFallbackPricing(context: CulturalIngredientContext, location: string): Promise<CulturalPriceResult> {
    // Fallback to basic pricing when cultural analysis fails
    const basicPrice = 2.99; // Default estimate
    
    const fallbackOption: CulturalPricingOption = {
      store: {
        id: 'fallback',
        name: 'Estimated Average',
        type: 'mainstream',
        culturalSpecialties: [],
        address: 'Various locations',
        distance: 5,
        priceReliability: 0.3,
        qualityRating: 3,
        avgPriceDifference: 0,
        languages: ['English']
      },
      price: basicPrice,
      unit: 'estimated',
      availability: 'unknown',
      quality: 'standard',
      authenticity: 'substitute',
      confidence: 0.3,
      notes: ['Fallback estimate - actual prices may vary']
    };

    return {
      ingredient: context.ingredient,
      culturalContext: context,
      pricingOptions: [fallbackOption],
      recommendations: [],
      totalEstimatedCost: basicPrice,
      bestOption: fallbackOption,
      culturalNotes: ['Cultural pricing analysis unavailable']
    };
  }

  /**
   * Fallback cultural context when AI is disabled
   */
  private getFallbackCulturalContext(ingredient: string, culturalOrigins: string[]): string {
    const ingredient_lower = ingredient.toLowerCase();
    
    // Basic cultural ingredient knowledge
    if (ingredient_lower.includes('soy sauce') || ingredient_lower.includes('miso') || ingredient_lower.includes('seaweed')) {
      return `${ingredient} is a traditional Asian ingredient commonly found in Asian markets and specialty stores. Consider checking H Mart, 99 Ranch Market, or local Asian grocery stores for authentic varieties.`;
    }
    
    if (ingredient_lower.includes('chorizo') || ingredient_lower.includes('masa') || ingredient_lower.includes('poblano')) {
      return `${ingredient} is a traditional Mexican ingredient. Look for it in Latino markets, Mexican grocery stores, or the international aisle of mainstream supermarkets.`;
    }
    
    if (ingredient_lower.includes('harissa') || ingredient_lower.includes('tahini') || ingredient_lower.includes('sumac')) {
      return `${ingredient} is a Middle Eastern ingredient. Check Middle Eastern markets, Mediterranean stores, or specialty food sections.`;
    }
    
    if (ingredient_lower.includes('curry') || ingredient_lower.includes('masala') || ingredient_lower.includes('cardamom')) {
      return `${ingredient} is common in Indian/South Asian cuisine. Find it in Indian grocery stores, spice shops, or international food aisles.`;
    }
    
    // Default response
    return `${ingredient} can be found in most grocery stores. Check the international aisle or specialty food section for authentic varieties.`;
  }
}

export const culturalPricingService = new CulturalPricingService();