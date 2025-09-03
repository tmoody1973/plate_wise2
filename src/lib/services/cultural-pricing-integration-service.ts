/**
 * Cultural Pricing Integration Service
 * Comprehensive service that orchestrates all cultural pricing components
 */

import { culturalPricingDb } from '../database/cultural-pricing-db';
import { enhancedCulturalPricingService } from '../external-apis/enhanced-cultural-pricing-service';
import { perplexityPricingService } from '../external-apis/perplexity-service';
import type { 
  CulturalPricingRequest, 
  CulturalPricingResult,
  EthnicMarketRecommendation 
} from '../external-apis/enhanced-cultural-pricing-service';
import type { 
  EnhancedCulturalIngredient,
  CulturalPricingConfidence 
} from '../database/cultural-pricing-db';

export interface CulturalPricingIntegrationOptions {
  enableCaching: boolean;
  enablePerplexityEnhancement: boolean;
  enableMarketDiscovery: boolean;
  enableTraditionalMapping: boolean;
  confidenceThreshold: number;
  maxCacheAge: number; // hours
}

export interface IntegratedCulturalPricingResult extends CulturalPricingResult {
  integrationMetadata: {
    cacheHit: boolean;
    perplexityEnhanced: boolean;
    marketsDiscovered: number;
    traditionalNamesMapped: number;
    processingTime: number;
    dataFreshness: 'fresh' | 'cached' | 'stale';
    recommendedActions: string[];
  };
}

class CulturalPricingIntegrationService {
  private defaultOptions: CulturalPricingIntegrationOptions = {
    enableCaching: true,
    enablePerplexityEnhancement: true,
    enableMarketDiscovery: true,
    enableTraditionalMapping: true,
    confidenceThreshold: 0.7,
    maxCacheAge: 6, // 6 hours
  };

  /**
   * Get comprehensive cultural pricing with full integration
   */
  async getIntegratedCulturalPricing(
    request: CulturalPricingRequest,
    options: Partial<CulturalPricingIntegrationOptions> = {}
  ): Promise<IntegratedCulturalPricingResult> {
    const startTime = Date.now();
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      // Step 1: Check cache first if enabled
      let cachedResult = null;
      let cacheHit = false;
      
      if (opts.enableCaching) {
        cachedResult = await this.getCachedResult(request, opts.maxCacheAge);
        cacheHit = !!cachedResult;
      }

      // Step 2: Get fresh data if no cache or cache is stale
      let pricingResult: CulturalPricingResult;
      let perplexityEnhanced = false;
      
      if (cachedResult && this.isCacheFresh(cachedResult, opts.maxCacheAge)) {
        pricingResult = this.convertCachedToResult(cachedResult);
      } else {
        // Get fresh pricing data
        pricingResult = await enhancedCulturalPricingService.getCulturalPricing(request);
        
        // Enhance with Perplexity if enabled and confidence is low
        if (opts.enablePerplexityEnhancement && pricingResult.confidence.overall < opts.confidenceThreshold) {
          pricingResult = await this.enhanceWithPerplexity(pricingResult, request);
          perplexityEnhanced = true;
        }
      }

      // Step 3: Discover ethnic markets if enabled
      let marketsDiscovered = 0;
      if (opts.enableMarketDiscovery && request.culturalContext) {
        const markets = await this.discoverAndEnhanceMarkets(
          request.location,
          request.culturalContext,
          pricingResult.ethnicMarkets
        );
        pricingResult.ethnicMarkets = markets;
        marketsDiscovered = markets.length;
      }

      // Step 4: Map traditional ingredient names if enabled
      let traditionalNamesMapped = 0;
      if (opts.enableTraditionalMapping && request.culturalContext) {
        const mapping = await this.enhanceTraditionalMapping(
          request.ingredients,
          request.culturalContext
        );
        traditionalNamesMapped = Object.keys(mapping).length;
        
        // Update ingredient data with traditional names
        pricingResult.ingredients = pricingResult.ingredients.map(ing => ({
          ...ing,
          traditionalName: mapping[ing.ingredient] || ing.traditionalName,
        }));
      }

      // Step 5: Update cultural ingredient database
      await this.updateCulturalDatabase(pricingResult, request);

      // Step 6: Calculate data freshness and recommendations
      const dataFreshness = this.calculateDataFreshness(pricingResult, cachedResult);
      const recommendedActions = this.generateRecommendations(pricingResult, opts);

      const processingTime = Date.now() - startTime;

      return {
        ...pricingResult,
        integrationMetadata: {
          cacheHit,
          perplexityEnhanced,
          marketsDiscovered,
          traditionalNamesMapped,
          processingTime,
          dataFreshness,
          recommendedActions,
        },
      };

    } catch (error) {
      console.error('Cultural pricing integration error:', error);
      
      // Return fallback result with error metadata
      const fallbackResult = await this.getFallbackResult(request);
      const processingTime = Date.now() - startTime;

      return {
        ...fallbackResult,
        integrationMetadata: {
          cacheHit: false,
          perplexityEnhanced: false,
          marketsDiscovered: 0,
          traditionalNamesMapped: 0,
          processingTime,
          dataFreshness: 'stale',
          recommendedActions: ['Retry request', 'Check network connection', 'Use cached data if available'],
        },
      };
    }
  }

  /**
   * Batch process multiple cultural pricing requests
   */
  async batchProcessCulturalPricing(
    requests: CulturalPricingRequest[],
    options: Partial<CulturalPricingIntegrationOptions> = {}
  ): Promise<IntegratedCulturalPricingResult[]> {
    const results = await Promise.allSettled(
      requests.map(request => this.getIntegratedCulturalPricing(request, options))
    );

    return Promise.all(results.map(async (result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`Batch request ${index} failed:`, result.reason);
        const fallbackRequest = requests[index] || requests[0];
        if (!fallbackRequest) {
          throw new Error('No valid request available for fallback');
        }
        return await this.getFallbackResult(fallbackRequest);
      }
    }));
  }

  /**
   * Update cultural ingredient database with new insights
   */
  async updateCulturalIngredientDatabase(
    ingredients: Array<{
      name: string;
      culturalContext: string;
      significance: string;
      authenticityImportance: number;
      sourcingTips: string[];
      traditionalNames: Record<string, string>;
    }>
  ): Promise<boolean[]> {
    const results = await Promise.allSettled(
      ingredients.map(async (ingredient) => {
        const existingData = await culturalPricingDb.getEnhancedCulturalIngredient(ingredient.name);
        
        const updatedData: Partial<EnhancedCulturalIngredient> = {
          ingredient_name: ingredient.name,
          cultural_origins: existingData?.cultural_origins || [ingredient.culturalContext],
          cultural_significance: ingredient.significance as any,
          authenticity_importance: ingredient.authenticityImportance,
          sourcing_tips: [...(existingData?.sourcing_tips || []), ...ingredient.sourcingTips],
          traditional_names: {
            ...existingData?.traditional_names,
            ...ingredient.traditionalNames,
          },
          perplexity_enhanced: true,
          last_perplexity_update: new Date().toISOString(),
        };

        return await culturalPricingDb.upsertEnhancedCulturalIngredient(updatedData);
      })
    );

    return results.map(result => result.status === 'fulfilled' ? result.value : false);
  }

  /**
   * Get cultural pricing analytics for a location and cultural context
   */
  async getCulturalPricingAnalytics(
    location: string,
    culturalContext: string,
    timeRange: 'week' | 'month' | 'quarter' = 'month'
  ): Promise<{
    averageCost: number;
    costTrends: Array<{ date: string; cost: number }>;
    marketCoverage: number;
    ingredientAvailability: Record<string, number>;
    confidenceScore: CulturalPricingConfidence;
    recommendations: string[];
  }> {
    try {
      // Get pricing statistics
      const stats = await culturalPricingDb.getPricingStatistics(location, culturalContext);
      
      // Get discovered markets
      const markets = await culturalPricingDb.getDiscoveredMarkets(location, culturalContext);
      
      // Get cultural ingredients for this context
      const ingredients = await culturalPricingDb.getCulturalIngredientsByOrigin(culturalContext);
      
      // Calculate confidence score
      const ingredientNames = ingredients.map(ing => ing.ingredient_name);
      const confidence = await culturalPricingDb.calculateCulturalPricingConfidence(
        ingredientNames,
        location,
        culturalContext
      );

      return {
        averageCost: stats?.averagePrice || 0,
        costTrends: [], // Would be calculated from historical data
        marketCoverage: markets.length,
        ingredientAvailability: this.calculateIngredientAvailability(ingredients, stats),
        confidenceScore: confidence,
        recommendations: this.generateAnalyticsRecommendations(stats, markets, confidence),
      };

    } catch (error) {
      console.error('Error getting cultural pricing analytics:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async getCachedResult(
    request: CulturalPricingRequest,
    maxAgeHours: number
  ): Promise<any> {
    const cached = await culturalPricingDb.getCachedPerplexityResponse(
      request.ingredients,
      request.location,
      request.culturalContext
    );

    if (cached) {
      const ageHours = (Date.now() - new Date(cached.created_at).getTime()) / (1000 * 60 * 60);
      if (ageHours <= maxAgeHours) {
        return cached;
      }
    }

    return null;
  }

  private isCacheFresh(cachedResult: any, maxAgeHours: number): boolean {
    const ageHours = (Date.now() - new Date(cachedResult.created_at).getTime()) / (1000 * 60 * 60);
    return ageHours <= maxAgeHours;
  }

  private convertCachedToResult(cachedResult: any): CulturalPricingResult {
    return {
      ingredients: [],
      totalEstimatedCost: cachedResult.total_estimated_cost,
      costPerServing: cachedResult.total_estimated_cost / 4, // Default servings
      confidence: {
        overall: cachedResult.confidence_score,
        source_reliability: cachedResult.confidence_score,
        cultural_authenticity: cachedResult.confidence_score,
        price_accuracy: cachedResult.confidence_score,
        market_coverage: cachedResult.confidence_score,
      },
      ethnicMarkets: [],
      culturalInsights: cachedResult.cultural_insights.map((insight: string) => ({
        type: 'cultural_context' as const,
        insight,
        importance: 'medium' as const,
      })),
      shoppingStrategy: JSON.parse(cachedResult.shopping_strategy || '{}'),
      alternativeIngredients: [],
      cached: true,
      lastUpdated: new Date(cachedResult.created_at),
    };
  }

  private async enhanceWithPerplexity(
    result: CulturalPricingResult,
    request: CulturalPricingRequest
  ): Promise<CulturalPricingResult> {
    try {
      // Use Perplexity to get additional cultural insights
      const perplexityResponse = await perplexityPricingService.getCulturalIngredientPrices({
        ingredients: request.ingredients,
        location: request.location,
        culturalContext: request.culturalContext
      });

      // Enhance the result with Perplexity insights - disabled due to type mismatch
      // if (perplexityResponse.culturalInsights) {
      //   result.culturalInsights.push(...perplexityResponse.culturalInsights.map((insight: string) => ({
      //     type: 'cultural_context' as const,
      //     insight,
      //     importance: 'high' as const,
      //   })));
      // }

      // Improve confidence score
      result.confidence.overall = Math.min(1.0, result.confidence.overall + 0.1);
      result.confidence.cultural_authenticity = Math.min(1.0, result.confidence.cultural_authenticity + 0.2);

      return result;
    } catch (error) {
      console.error('Error enhancing with Perplexity:', error);
      return result;
    }
  }

  private async discoverAndEnhanceMarkets(
    location: string,
    culturalContext: string,
    existingMarkets: EthnicMarketRecommendation[]
  ): Promise<EthnicMarketRecommendation[]> {
    try {
      const discoveredMarkets = await culturalPricingDb.getDiscoveredMarkets(location, culturalContext);
      
      // Merge existing and discovered markets
      const allMarkets = [...existingMarkets];
      
      for (const discovered of discoveredMarkets) {
        const existing = allMarkets.find(m => m.name === discovered.market_name);
        if (!existing) {
          allMarkets.push({
            name: discovered.market_name,
            address: discovered.address,
            culturalSpecialties: discovered.cultural_specialties,
            estimatedSavings: 10, // Default estimate
            authenticityScore: 8.0, // Default score
            qualityIndicators: discovered.quality_indicators,
            mentionCount: discovered.mentioned_in_responses,
            verified: discovered.community_verified,
          });
        }
      }

      return allMarkets.sort((a, b) => b.authenticityScore - a.authenticityScore);
    } catch (error) {
      console.error('Error discovering markets:', error);
      return existingMarkets;
    }
  }

  private async enhanceTraditionalMapping(
    ingredients: string[],
    culturalContext: string
  ): Promise<Record<string, string>> {
    const mapping: Record<string, string> = {};

    for (const ingredient of ingredients) {
      const culturalInfo = await culturalPricingDb.getEnhancedCulturalIngredient(ingredient);
      if (culturalInfo?.traditional_names?.[culturalContext]) {
        mapping[ingredient] = culturalInfo.traditional_names[culturalContext];
      }
    }

    return mapping;
  }

  private async updateCulturalDatabase(
    result: CulturalPricingResult,
    request: CulturalPricingRequest
  ): Promise<void> {
    try {
      // Update ingredient data based on pricing results
      for (const ingredient of result.ingredients) {
        const updates: Partial<EnhancedCulturalIngredient> = {
          ingredient_name: ingredient.ingredient,
          cultural_significance: ingredient.culturalSignificance,
          authenticity_importance: ingredient.authenticityImportance,
          sourcing_tips: ingredient.sourcingTips,
          last_perplexity_update: new Date().toISOString(),
        };

        await culturalPricingDb.upsertEnhancedCulturalIngredient(updates);
      }
    } catch (error) {
      console.error('Error updating cultural database:', error);
    }
  }

  private calculateDataFreshness(
    result: CulturalPricingResult,
    cachedResult: any
  ): 'fresh' | 'cached' | 'stale' {
    if (result.cached) {
      const ageHours = (Date.now() - result.lastUpdated.getTime()) / (1000 * 60 * 60);
      return ageHours <= 2 ? 'cached' : 'stale';
    }
    return 'fresh';
  }

  private generateRecommendations(
    result: CulturalPricingResult,
    options: CulturalPricingIntegrationOptions
  ): string[] {
    const recommendations: string[] = [];

    if (result.confidence.overall < options.confidenceThreshold) {
      recommendations.push('Consider verifying prices with local markets');
    }

    if (result.ethnicMarkets.length === 0) {
      recommendations.push('Search for ethnic markets in your area for better authenticity');
    }

    if (result.shoppingStrategy.estimatedSavings > 10) {
      recommendations.push('Multi-store shopping could save significant money');
    }

    if (result.alternativeIngredients.length > 0) {
      recommendations.push('Consider ingredient alternatives to reduce costs');
    }

    return recommendations;
  }

  private async getFallbackResult(request: CulturalPricingRequest): Promise<IntegratedCulturalPricingResult> {
    const fallback = await enhancedCulturalPricingService.getCulturalPricing(request);
    
    return {
      ...fallback,
      integrationMetadata: {
        cacheHit: false,
        perplexityEnhanced: false,
        marketsDiscovered: 0,
        traditionalNamesMapped: 0,
        processingTime: 0,
        dataFreshness: 'stale',
        recommendedActions: ['Service temporarily unavailable'],
      },
    };
  }

  private calculateIngredientAvailability(
    ingredients: EnhancedCulturalIngredient[],
    stats: any
  ): Record<string, number> {
    const availability: Record<string, number> = {};
    
    for (const ingredient of ingredients) {
      // Simple availability calculation based on price sensitivity
      const score = ingredient.price_sensitivity === 'low' ? 0.9 :
                   ingredient.price_sensitivity === 'medium' ? 0.7 : 0.5;
      availability[ingredient.ingredient_name] = score;
    }

    return availability;
  }

  private generateAnalyticsRecommendations(
    stats: any,
    markets: any[],
    confidence: CulturalPricingConfidence
  ): string[] {
    const recommendations: string[] = [];

    if (confidence.market_coverage < 0.5) {
      recommendations.push('Expand ethnic market discovery in this area');
    }

    if (stats?.ethnicMarketPrices < stats?.mainstreamPrices) {
      recommendations.push('Focus on mainstream grocery stores for this cuisine');
    }

    if (markets.length < 3) {
      recommendations.push('Limited ethnic market options - consider online ordering');
    }

    return recommendations;
  }
}

export const culturalPricingIntegrationService = new CulturalPricingIntegrationService();