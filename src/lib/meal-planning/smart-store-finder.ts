/**
 * Smart Store Finder Service
 * Integrates ingredient classification with Google Places API to find appropriate stores
 */

import { googlePlacesService } from '@/lib/external-apis/google-places-service';
import { ingredientClassifierService } from './ingredient-classifier';

export interface SmartStoreRecommendation {
  ingredient: string;
  stores: Array<{
    name: string;
    address: string;
    placeId: string;
    storeType: 'regular' | 'ethnic' | 'specialty';
    culturalFocus?: string;
    distance?: number;
    rating?: number;
    priceLevel?: number;
    website?: string;
    phone?: string;
    isSpecialtyMatch: boolean; // True if store specializes in this ingredient type
    estimatedPrice: number;
    availability: 'high' | 'medium' | 'low';
  }>;
  alternatives?: string[]; // Common alternatives if ingredient is hard to find
  classification: any; // Full ingredient classification
}

export interface StoreFinderRequest {
  ingredients: string[];
  userLocation: string;
  maxDistance?: number; // in meters, default 10000 (10km)
  includeAlternatives?: boolean;
  preferredStoreTypes?: string[];
}

class SmartStoreFinderService {
  private readonly DEFAULT_MAX_DISTANCE = 10000; // 10km
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private storeCache = new Map<string, any>();

  /**
   * Find optimal stores for a list of ingredients
   */
  async findStoresForIngredients(request: StoreFinderRequest): Promise<SmartStoreRecommendation[]> {
    const {
      ingredients,
      userLocation,
      maxDistance = this.DEFAULT_MAX_DISTANCE,
      includeAlternatives = true,
      preferredStoreTypes = []
    } = request;

    console.log('🔍 Finding stores for ingredients:', ingredients);

    const recommendations: SmartStoreRecommendation[] = [];

    // Process each ingredient
    for (const ingredient of ingredients) {
      try {
        const recommendation = await this.findStoresForSingleIngredient(
          ingredient,
          userLocation,
          maxDistance,
          includeAlternatives,
          preferredStoreTypes
        );
        recommendations.push(recommendation);
      } catch (error) {
        console.error(`❌ Failed to find stores for ${ingredient}:`, error);
        
        // Add fallback recommendation
        recommendations.push({
          ingredient,
          stores: [],
          classification: ingredientClassifierService.classifyIngredient(ingredient),
          alternatives: includeAlternatives ? ingredientClassifierService.getCommonAlternatives(ingredient) : undefined
        });
      }
    }

    console.log(`✅ Found store recommendations for ${recommendations.length}/${ingredients.length} ingredients`);
    return recommendations;
  }

  /**
   * Find stores for a single ingredient
   */
  private async findStoresForSingleIngredient(
    ingredient: string,
    userLocation: string,
    maxDistance: number,
    includeAlternatives: boolean,
    preferredStoreTypes: string[]
  ): Promise<SmartStoreRecommendation> {
    
    // Classify the ingredient
    const classification = ingredientClassifierService.classifyIngredient(ingredient);
    console.log(`📊 Classified "${ingredient}":`, classification);

    // Get store recommendations based on classification
    const storeRecommendations = ingredientClassifierService.getStoreRecommendations(ingredient, userLocation);
    
    const allStores: any[] = [];

    // Search for each recommended store type
    for (const storeRec of storeRecommendations) {
      // Skip if user has preferred store types and this isn't one of them
      if (preferredStoreTypes.length > 0 && !preferredStoreTypes.includes(storeRec.storeType)) {
        continue;
      }

      for (const searchTerm of storeRec.searchTerms.slice(0, 2)) { // Limit to 2 search terms per type
        try {
          const cacheKey = `${searchTerm}-${userLocation}`;
          let stores = this.storeCache.get(cacheKey);

          if (!stores || Date.now() - stores.timestamp > this.CACHE_TTL) {
            console.log(`🔍 Searching Google Places: "${searchTerm} near ${userLocation}"`);
            stores = {
              data: await googlePlacesService.searchStores(searchTerm, userLocation, maxDistance),
              timestamp: Date.now()
            };
            this.storeCache.set(cacheKey, stores);
          }

          // Process and score stores
          const processedStores = stores.data.map((store: any) => this.processStore(
            store,
            storeRec,
            classification,
            ingredient
          ));

          allStores.push(...processedStores);
        } catch (error) {
          console.warn(`⚠️ Failed to search for "${searchTerm}":`, error);
        }
      }
    }

    // Remove duplicates and sort by relevance
    const uniqueStores = this.deduplicateStores(allStores);
    const sortedStores = this.sortStoresByRelevance(uniqueStores, classification);

    return {
      ingredient,
      stores: sortedStores.slice(0, 5), // Top 5 stores
      classification,
      alternatives: includeAlternatives ? ingredientClassifierService.getCommonAlternatives(ingredient) : undefined
    };
  }

  /**
   * Process and score a store for an ingredient
   */
  private processStore(store: any, storeRec: any, classification: any, ingredient: string): any {
    // Determine if this store is a specialty match
    const isSpecialtyMatch = this.isSpecialtyMatch(store, storeRec, classification);
    
    // Estimate price based on store type and ingredient
    const estimatedPrice = this.estimatePrice(ingredient, store, isSpecialtyMatch);
    
    // Determine availability confidence
    const availability = this.determineAvailability(classification, storeRec, isSpecialtyMatch);

    return {
      name: store.name,
      address: store.address,
      placeId: store.id,
      storeType: storeRec.storeType,
      culturalFocus: storeRec.culturalFocus,
      distance: store.distance,
      rating: store.rating,
      priceLevel: store.priceLevel,
      website: store.website,
      phone: store.phone,
      isSpecialtyMatch,
      estimatedPrice,
      availability,
      relevanceScore: this.calculateRelevanceScore(store, storeRec, classification, isSpecialtyMatch)
    };
  }

  /**
   * Determine if a store is a specialty match for an ingredient
   */
  private isSpecialtyMatch(store: any, storeRec: any, classification: any): boolean {
    const storeName = store.name.toLowerCase();
    const storeTypes = store.types || [];
    
    // Check if store name contains cultural keywords
    if (storeRec.culturalFocus) {
      const culturalKeywords = [
        storeRec.culturalFocus,
        classification.culturalOrigin,
        ...this.getCulturalKeywords(storeRec.culturalFocus)
      ].filter(Boolean);

      if (culturalKeywords.some(keyword => storeName.includes(keyword.toLowerCase()))) {
        return true;
      }
    }

    // Check store types for specialty indicators
    const specialtyTypes = ['grocery_or_supermarket', 'food', 'store'];
    const hasSpecialtyType = storeTypes.some((type: string) => specialtyTypes.includes(type));
    
    return hasSpecialtyType && storeRec.storeType === 'ethnic';
  }

  /**
   * Get cultural keywords for better matching
   */
  private getCulturalKeywords(culturalFocus: string): string[] {
    const keywordMap: { [key: string]: string[] } = {
      'asian': ['asian', 'chinese', 'japanese', 'korean', 'thai', 'vietnamese', 'oriental'],
      'korean': ['korean', 'h mart', 'hmart'],
      'japanese': ['japanese', 'mitsuwa', 'nijiya'],
      'thai': ['thai', 'southeast asian'],
      'vietnamese': ['vietnamese', 'southeast asian'],
      'mexican': ['mexican', 'latino', 'hispanic', 'latin'],
      'latin': ['latino', 'hispanic', 'latin american'],
      'south-american': ['south american', 'latino', 'latin american', 'peruvian', 'brazilian', 'colombian'],
      'peruvian': ['peruvian', 'south american', 'latino'],
      'brazilian': ['brazilian', 'south american', 'latino'],
      'argentinian': ['argentinian', 'south american', 'latino'],
      'colombian': ['colombian', 'south american', 'latino'],
      'venezuelan': ['venezuelan', 'south american', 'latino'],
      'chilean': ['chilean', 'south american', 'latino'],
      'middle-eastern': ['middle eastern', 'mediterranean', 'halal', 'arabic'],
      'indian': ['indian', 'south asian', 'patel', 'spice bazaar'],
      'african': ['african', 'ethiopian', 'west african', 'nigerian', 'ghanaian'],
      'ethiopian': ['ethiopian', 'african'],
      'west-african': ['west african', 'nigerian', 'ghanaian', 'african'],
      'caribbean': ['caribbean', 'jamaican', 'west indian', 'haitian', 'trinidad'],
      'jamaican': ['jamaican', 'caribbean', 'west indian'],
      'haitian': ['haitian', 'caribbean'],
      'trinidadian': ['trinidad', 'trinidadian', 'caribbean', 'west indian']
    };

    return keywordMap[culturalFocus] || [];
  }

  /**
   * Estimate price for an ingredient at a specific store
   */
  private estimatePrice(ingredient: string, store: any, isSpecialtyMatch: boolean): number {
    // Base price estimation
    let basePrice = 3.0; // Default $3.00

    // Adjust based on ingredient type
    const classification = ingredientClassifierService.classifyIngredient(ingredient);
    
    if (classification.availability === 'specialty') {
      basePrice *= 1.5; // Specialty ingredients cost more
    }

    // Adjust based on store type
    if (isSpecialtyMatch) {
      basePrice *= 0.8; // 20% discount at specialty stores
    } else if (classification.availability === 'specialty') {
      basePrice *= 1.3; // 30% markup at regular stores for specialty items
    }

    // Adjust based on store price level
    if (store.priceLevel) {
      const priceMultipliers = [0.7, 0.85, 1.0, 1.2, 1.5]; // 0-4 price levels
      basePrice *= priceMultipliers[store.priceLevel] || 1.0;
    }

    return Math.round(basePrice * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Determine availability confidence
   */
  private determineAvailability(classification: any, storeRec: any, isSpecialtyMatch: boolean): 'high' | 'medium' | 'low' {
    if (classification.availability === 'regular') {
      return 'high';
    }

    if (classification.availability === 'both') {
      return isSpecialtyMatch ? 'high' : 'medium';
    }

    if (classification.availability === 'specialty') {
      return isSpecialtyMatch ? 'high' : 'low';
    }

    return 'medium';
  }

  /**
   * Calculate relevance score for sorting
   */
  private calculateRelevanceScore(store: any, storeRec: any, classification: any, isSpecialtyMatch: boolean): number {
    let score = 0;

    // Specialty match bonus
    if (isSpecialtyMatch) {
      score += 50;
    }

    // Store rating bonus
    if (store.rating) {
      score += store.rating * 10; // 0-50 points
    }

    // Distance penalty (closer is better)
    if (store.distance) {
      score -= Math.min(store.distance / 1000, 20); // Max 20 point penalty
    }

    // Store type preference
    if (storeRec.priority === 1) {
      score += 20; // Regular stores get priority for common items
    } else if (classification.availability === 'specialty') {
      score += 30; // Specialty stores get priority for specialty items
    }

    return score;
  }

  /**
   * Remove duplicate stores based on place ID
   */
  private deduplicateStores(stores: any[]): any[] {
    const seen = new Set();
    return stores.filter(store => {
      if (seen.has(store.placeId)) {
        return false;
      }
      seen.add(store.placeId);
      return true;
    });
  }

  /**
   * Sort stores by relevance score
   */
  private sortStoresByRelevance(stores: any[], classification: any): any[] {
    return stores.sort((a, b) => {
      // Primary sort: relevance score
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }

      // Secondary sort: availability
      const availabilityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      if (availabilityOrder[b.availability] !== availabilityOrder[a.availability]) {
        return availabilityOrder[b.availability] - availabilityOrder[a.availability];
      }

      // Tertiary sort: distance (closer is better)
      return (a.distance || 0) - (b.distance || 0);
    });
  }

  /**
   * Get store recommendations optimized for a shopping list
   */
  async getOptimizedShoppingRoute(
    ingredients: string[],
    userLocation: string,
    maxStores: number = 3
  ): Promise<{
    recommendedStores: any[];
    ingredientMapping: { [storeId: string]: string[] };
    totalEstimatedCost: number;
    estimatedSavings: number;
  }> {
    
    const storeRecommendations = await this.findStoresForIngredients({
      ingredients,
      userLocation
    });

    // Group ingredients by optimal store
    const storeGroups = new Map<string, {
      store: any;
      ingredients: string[];
      totalCost: number;
    }>();

    storeRecommendations.forEach(rec => {
      if (rec.stores.length > 0) {
        const bestStore = rec.stores[0]; // Top-ranked store
        const storeKey = bestStore.placeId;

        if (!storeGroups.has(storeKey)) {
          storeGroups.set(storeKey, {
            store: bestStore,
            ingredients: [],
            totalCost: 0
          });
        }

        const group = storeGroups.get(storeKey)!;
        group.ingredients.push(rec.ingredient);
        group.totalCost += bestStore.estimatedPrice;
      }
    });

    // Select optimal stores (balance between cost and convenience)
    const sortedStores = Array.from(storeGroups.values())
      .sort((a, b) => {
        // Prioritize stores with more ingredients
        if (b.ingredients.length !== a.ingredients.length) {
          return b.ingredients.length - a.ingredients.length;
        }
        // Then by total cost (lower is better)
        return a.totalCost - b.totalCost;
      })
      .slice(0, maxStores);

    const recommendedStores = sortedStores.map(group => group.store);
    const ingredientMapping: { [storeId: string]: string[] } = {};
    let totalEstimatedCost = 0;

    sortedStores.forEach(group => {
      ingredientMapping[group.store.placeId] = group.ingredients;
      totalEstimatedCost += group.totalCost;
    });

    // Calculate estimated savings (compared to shopping at one regular store)
    const regularStoreCost = ingredients.length * 3.5; // Assume $3.50 per ingredient at regular store
    const estimatedSavings = Math.max(0, regularStoreCost - totalEstimatedCost);

    return {
      recommendedStores,
      ingredientMapping,
      totalEstimatedCost,
      estimatedSavings
    };
  }
}

export const smartStoreFinderService = new SmartStoreFinderService();