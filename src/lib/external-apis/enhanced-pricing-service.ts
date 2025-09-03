/**
 * Enhanced Pricing Service with Perplexity Fallback
 * Combines Kroger API with Perplexity API for comprehensive pricing
 */

import { krogerService } from './kroger-service';
import { perplexityPricingService, PerplexityPriceResponse } from './perplexity-service';

interface PricingRequest {
  ingredients: string[];
  location: string;
  storeId?: string;
  userProfile?: {
    location: {
      zipCode: string;
      city: string;
      state: string;
    };
    preferences?: {
      culturalCuisines?: string[];
      savedStores?: any[];
    };
  };
}

interface EnhancedPriceResult {
  ingredient: string;
  estimatedCost: number;
  unit: string;
  store: string;
  confidence: number;
  source: 'kroger' | 'perplexity' | 'estimate';
  product?: any;
  alternatives?: any[];
  notes?: string;
  fallbackUsed: boolean;
}

interface EnhancedPricingResponse {
  results: EnhancedPriceResult[];
  totalEstimatedCost: number;
  averageConfidence: number;
  primarySource: string;
  fallbacksUsed: number;
  errors: string[];
}

class EnhancedPricingService {
  async getIngredientPricing(request: PricingRequest): Promise<EnhancedPricingResponse> {
    const { ingredients, location, storeId, userProfile } = request;
    const results: EnhancedPriceResult[] = [];
    const errors: string[] = [];
    let fallbacksUsed = 0;

    // Use user profile location if available, fallback to provided location
    const effectiveLocation = userProfile?.location?.zipCode || location;
    const userCity = userProfile?.location?.city || '';
    const userState = userProfile?.location?.state || '';

    console.log(`Getting pricing for ${ingredients.length} ingredients in ${effectiveLocation} (${userCity}, ${userState}) using Perplexity as primary`);

    // First, try Perplexity API for all ingredients with enhanced location context
    const perplexityResults = await this.tryPerplexityPricing(ingredients, effectiveLocation, userCity, userState, userProfile?.preferences?.culturalCuisines);
    
    // Identify ingredients that need fallback pricing
    const needsFallback: string[] = [];
    const perplexitySuccessful: EnhancedPriceResult[] = [];

    ingredients.forEach((ingredient, index) => {
      const perplexityResult = perplexityResults[index];
      
      if (perplexityResult && perplexityResult.confidence > 0.4) {
        perplexitySuccessful.push({
          ingredient,
          estimatedCost: perplexityResult.estimatedCost,
          unit: perplexityResult.unit || 'each',
          store: perplexityResult.store || 'Various Stores',
          confidence: perplexityResult.confidence,
          source: 'perplexity',
          notes: perplexityResult.notes,
          fallbackUsed: false
        });
      } else {
        needsFallback.push(ingredient);
      }
    });

    results.push(...perplexitySuccessful);

    // Use Kroger fallback for remaining ingredients
    if (needsFallback.length > 0) {
      console.log(`Using Kroger fallback for ${needsFallback.length} ingredients`);
      
      try {
        const krogerResults = await this.tryKrogerPricing(needsFallback, effectiveLocation, storeId, userProfile);
        
        needsFallback.forEach((ingredient, index) => {
          const krogerResult = krogerResults[index];
          
          if (krogerResult && krogerResult.confidence > 0.3) {
            results.push({
              ingredient,
              estimatedCost: krogerResult.estimatedCost,
              unit: krogerResult.unit || 'each',
              store: krogerResult.store || 'Kroger',
              confidence: krogerResult.confidence,
              source: 'kroger',
              product: krogerResult.product,
              alternatives: krogerResult.alternatives,
              fallbackUsed: true
            });
            fallbacksUsed++;
          } else {
            // Last resort: basic estimates
            const estimate = this.getBasicEstimates([ingredient])[0];
            if (estimate) {
              results.push(estimate);
            }
            fallbacksUsed++;
          }
        });
        
      } catch (error) {
        console.error('Kroger fallback failed:', error);
        errors.push(`Kroger fallback failed: ${error}`);
        
        const estimates = this.getBasicEstimates(needsFallback);
        results.push(...estimates);
        fallbacksUsed += estimates.length;
      }
    }

    const totalEstimatedCost = results.reduce((sum, result) => sum + result.estimatedCost, 0);
    const averageConfidence = results.reduce((sum, result) => sum + result.confidence, 0) / results.length;
    const primarySource = fallbacksUsed > results.length / 2 ? 'Kroger + Estimates' : 'Perplexity';

    return {
      results,
      totalEstimatedCost,
      averageConfidence,
      primarySource,
      fallbacksUsed,
      errors
    };
  }

  private async tryPerplexityPricing(
    ingredients: string[], 
    location: string, 
    city?: string, 
    state?: string, 
    culturalCuisines?: string[]
  ): Promise<any[]> {
    try {
      console.log(`Trying Perplexity pricing for ${ingredients.length} ingredients in ${location} (${city}, ${state})`);
      
      // Build store preference based on location and cultural preferences
      let storePreference = 'Kroger, Walmart, Target, Safeway, local grocery stores';
      if (culturalCuisines && culturalCuisines.length > 0) {
        const culturalStores = culturalCuisines.includes('mexican') ? 'Mexican markets, carnicerías' :
                               culturalCuisines.includes('chinese') || culturalCuisines.includes('asian') ? 'Asian markets, Chinese grocery stores' :
                               culturalCuisines.includes('indian') ? 'Indian grocery stores, spice markets' :
                               'ethnic markets';
        storePreference = `${culturalStores}, ${storePreference}`;
      }
      
      const perplexityResponse = await perplexityPricingService.getIngredientPrices({
        ingredients,
        location: city && state ? `${city}, ${state} ${location}` : location,
        storePreference
      });

      if (perplexityResponse.success && perplexityResponse.data.length > 0) {
        return ingredients.map(ingredient => {
          const match = perplexityResponse.data.find(item => 
            item.ingredient.toLowerCase().includes(ingredient.toLowerCase()) ||
            ingredient.toLowerCase().includes(item.ingredient.toLowerCase())
          );
          
          if (match) {
            return {
              ingredient,
              estimatedCost: match.estimatedPrice,
              unit: match.unit,
              store: match.store,
              confidence: match.confidence,
              notes: match.notes
            };
          }
          return null;
        });
      }
      
      return ingredients.map(() => null);
    } catch (error) {
      console.error('Perplexity pricing batch failed:', error);
      return ingredients.map(() => null);
    }
  }

  private async tryKrogerPricing(
    ingredients: string[], 
    location: string, 
    storeId?: string, 
    userProfile?: any
  ): Promise<any[]> {
    try {
      const results = await Promise.all(
        ingredients.map(async (ingredient) => {
          try {
            const searchResults = await krogerService.searchProducts({ query: ingredient });
            
            if (searchResults && searchResults.length > 0) {
              const bestMatch = searchResults[0];
              if (bestMatch) {
                return {
                  ingredient,
                  estimatedCost: bestMatch.price || 0,
                  unit: bestMatch.unit || 'each',
                  store: 'Kroger',
                  confidence: 0.8,
                  product: bestMatch,
                  alternatives: searchResults.slice(1, 4)
                };
              }
            }
            return null;
          } catch (error) {
            console.error(`Kroger search failed for ${ingredient}:`, error);
            return null;
          }
        })
      );

      return results;
    } catch (error) {
      console.error('Kroger pricing batch failed:', error);
      return ingredients.map(() => null);
    }
  }

  private getBasicEstimates(ingredients: string[]): EnhancedPriceResult[] {
    const basicPrices: Record<string, number> = {
      'chicken': 6.99, 'beef': 8.99, 'pork': 5.99, 'fish': 9.99,
      'onion': 1.99, 'garlic': 2.99, 'tomato': 2.99, 'potato': 2.49,
      'rice': 2.99, 'pasta': 1.99, 'bread': 2.49, 'milk': 3.99,
      'cheese': 4.99, 'butter': 4.49, 'oil': 3.99, 'salt': 1.99,
      'pepper': 2.99, 'flour': 2.99, 'sugar': 3.49, 'eggs': 3.49
    };

    return ingredients.map(ingredient => {
      const normalizedName = ingredient.toLowerCase().trim();
      let estimatedPrice = 2.99;

      for (const [key, price] of Object.entries(basicPrices)) {
        if (normalizedName.includes(key)) {
          estimatedPrice = price;
          break;
        }
      }

      return {
        ingredient,
        estimatedCost: estimatedPrice,
        unit: 'estimated',
        store: 'Average Estimate',
        confidence: 0.2,
        source: 'estimate' as const,
        notes: 'Basic price estimate - actual prices may vary significantly',
        fallbackUsed: true
      };
    });
  }

  async healthCheck(): Promise<{ perplexity: boolean; kroger: boolean; overall: boolean; }> {
    const [perplexityHealth, krogerHealth] = await Promise.all([
      perplexityPricingService.healthCheck(),
      this.checkKrogerHealth()
    ]);

    return {
      perplexity: perplexityHealth,
      kroger: krogerHealth,
      overall: perplexityHealth || krogerHealth
    };
  }

  private async checkKrogerHealth(): Promise<boolean> {
    try {
      return typeof krogerService !== 'undefined';
    } catch {
      return false;
    }
  }
}

export const enhancedPricingService = new EnhancedPricingService();
export type { PricingRequest, EnhancedPriceResult, EnhancedPricingResponse };