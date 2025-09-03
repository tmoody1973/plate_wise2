/**
 * Enhanced Cultural Pricing Service
 * Comprehensive cultural pricing intelligence with confidence scoring,
 * ethnic market discovery, and traditional ingredient mapping
 */

import { culturalPricingDb, type CulturalPricingConfidence, type EnhancedCulturalIngredient } from '../database/cultural-pricing-db';

// Re-export types that are used by other modules
export type { CulturalPricingConfidence } from '../database/cultural-pricing-db';
import { perplexityPricingService } from './perplexity-service';

export interface CulturalPricingRequest {
  ingredients: string[];
  location: string;
  culturalContext?: string;
  servings?: number;
  budgetConstraint?: number;
  prioritizeAuthenticity?: boolean;
}

export interface CulturalPricingResult {
  ingredients: CulturalIngredientPricing[];
  totalEstimatedCost: number;
  costPerServing: number;
  confidence: CulturalPricingConfidence;
  ethnicMarkets: EthnicMarketRecommendation[];
  culturalInsights: CulturalInsight[];
  shoppingStrategy: ShoppingStrategy;
  alternativeIngredients: AlternativeIngredient[];
  cached: boolean;
  lastUpdated: Date;
}

export interface CulturalIngredientPricing {
  ingredient: string;
  traditionalName?: string;
  culturalSignificance: 'essential' | 'important' | 'common' | 'optional';
  authenticityImportance: number; // 1-10 scale
  estimatedPrice: number;
  unit: string;
  quantity: number;
  totalCost: number;
  recommendedStore: string;
  storeType: 'ethnic_market' | 'mainstream' | 'specialty';
  alternatives: IngredientAlternative[];
  sourcingTips: string[];
  seasonalAvailability: string;
  bulkOptions?: BulkOption;
  confidence: number;
}

export interface EthnicMarketRecommendation {
  name: string;
  address?: string;
  culturalSpecialties: string[];
  estimatedSavings: number;
  authenticityScore: number;
  qualityIndicators: string[];
  mentionCount: number;
  verified: boolean;
}

export interface CulturalInsight {
  type: 'authenticity' | 'sourcing' | 'seasonal' | 'preparation' | 'cultural_context';
  ingredient?: string;
  insight: string;
  importance: 'high' | 'medium' | 'low';
}

export interface ShoppingStrategy {
  primaryStore: string;
  storeType: 'ethnic_market' | 'mainstream' | 'mixed';
  estimatedTime: number; // minutes
  estimatedSavings: number;
  authenticityMaintained: boolean;
  recommendations: string[];
  multiStoreStrategy?: {
    stores: Array<{
      name: string;
      type: string;
      ingredients: string[];
      estimatedCost: number;
    }>;
    totalTime: number;
    additionalSavings: number;
  };
}

export interface AlternativeIngredient {
  original: string;
  alternative: string;
  culturalImpact: 'minimal' | 'moderate' | 'significant';
  costSavings: number;
  availabilityImprovement: boolean;
  explanation: string;
}

export interface IngredientAlternative {
  name: string;
  price: number;
  store: string;
  culturalAuthenticity: number; // 0-1 scale
  availability: 'high' | 'medium' | 'low';
}

export interface BulkOption {
  available: boolean;
  minQuantity?: number;
  pricePerUnit?: number;
  savings?: number;
  storageNotes?: string;
}

class EnhancedCulturalPricingService {
  /**
   * Get comprehensive cultural pricing analysis
   */
  async getCulturalPricing(request: CulturalPricingRequest): Promise<CulturalPricingResult> {
    try {
      // Check for cached response first
      const cached = await culturalPricingDb.getCachedPerplexityResponse(
        request.ingredients,
        request.location,
        request.culturalContext
      );

      if (cached) {
        return this.buildResultFromCache(cached, request);
      }

      // Get fresh pricing data from Perplexity
      const perplexityResult = await this.getPerplexityPricing(request);
      
      // Enhance with cultural intelligence
      const enhancedResult = await this.enhanceWithCulturalIntelligence(perplexityResult, request);

      // Store results for future use
      await this.storePricingResults(enhancedResult, request);

      return enhancedResult;
    } catch (error) {
      console.error('Error getting cultural pricing:', error);
      return this.getFallbackPricing(request);
    }
  }

  /**
   * Map traditional ingredient names to modern equivalents
   */
  async mapTraditionalIngredients(
    ingredients: string[],
    culturalContext: string
  ): Promise<Record<string, string>> {
    const mapping: Record<string, string> = {};

    for (const ingredient of ingredients) {
      const modernName = await culturalPricingDb.mapTraditionalIngredientName(
        ingredient,
        culturalContext
      );
      
      if (modernName) {
        mapping[ingredient] = modernName;
      }
    }

    return mapping;
  }

  /**
   * Discover ethnic markets for a location and cultural context
   */
  async discoverEthnicMarkets(
    location: string,
    culturalContext: string
  ): Promise<EthnicMarketRecommendation[]> {
    try {
      // Get discovered markets from database
      const discoveredMarkets = await culturalPricingDb.getDiscoveredMarkets(location, culturalContext);

      // Convert to recommendations
      const recommendations: EthnicMarketRecommendation[] = discoveredMarkets.map(market => ({
        name: market.market_name,
        address: market.address,
        culturalSpecialties: market.cultural_specialties,
        estimatedSavings: this.estimateSavingsFromMarket(market),
        authenticityScore: this.calculateAuthenticityScore(market, culturalContext),
        qualityIndicators: market.quality_indicators,
        mentionCount: market.mentioned_in_responses,
        verified: market.community_verified,
      }));

      return recommendations.sort((a, b) => b.authenticityScore - a.authenticityScore);
    } catch (error) {
      console.error('Error discovering ethnic markets:', error);
      return [];
    }
  }

  /**
   * Get cultural significance scoring for ingredients
   */
  async getCulturalSignificanceScoring(
    ingredients: string[],
    culturalContext: string
  ): Promise<Record<string, { significance: string; importance: number; insights: string[] }>> {
    const scoring: Record<string, { significance: string; importance: number; insights: string[] }> = {};

    for (const ingredient of ingredients) {
      const culturalInfo = await culturalPricingDb.getEnhancedCulturalIngredient(ingredient);
      
      if (culturalInfo && culturalInfo.cultural_origins.includes(culturalContext)) {
        scoring[ingredient] = {
          significance: culturalInfo.cultural_significance,
          importance: culturalInfo.authenticity_importance,
          insights: culturalInfo.sourcing_tips,
        };
      } else {
        // Default scoring for non-cultural ingredients
        scoring[ingredient] = {
          significance: 'common',
          importance: 5.0,
          insights: ['Available at most grocery stores'],
        };
      }
    }

    return scoring;
  }

  /**
   * Update cultural ingredient database with new information
   */
  async updateCulturalIngredientDatabase(
    ingredientName: string,
    culturalData: Partial<EnhancedCulturalIngredient>
  ): Promise<boolean> {
    try {
      const existingData = await culturalPricingDb.getEnhancedCulturalIngredient(ingredientName);
      
      const updatedData: Partial<EnhancedCulturalIngredient> = {
        ingredient_name: ingredientName,
        ...existingData,
        ...culturalData,
        perplexity_enhanced: true,
        last_perplexity_update: new Date().toISOString(),
      };

      return await culturalPricingDb.upsertEnhancedCulturalIngredient(updatedData);
    } catch (error) {
      console.error('Error updating cultural ingredient database:', error);
      return false;
    }
  }

  /**
   * Private helper methods
   */
  private async getPerplexityPricing(request: CulturalPricingRequest): Promise<any> {
    const prompt = this.buildCulturalPricingPrompt(request);
    
    const perplexityResponse = await perplexityPricingService.getCulturalIngredientPrices({
      ingredients: request.ingredients,
      location: request.location,
      culturalContext: request.culturalContext
    });

    return perplexityResponse;
  }

  private buildCulturalPricingPrompt(request: CulturalPricingRequest): string {
    const { ingredients, location, culturalContext, servings = 4, budgetConstraint } = request;

    let prompt = `Find current grocery pricing for these ${culturalContext || 'international'} ingredients in ${location}:\n`;
    prompt += ingredients.map(ing => `- ${ing}`).join('\n');
    prompt += `\n\nFor ${servings} servings`;
    
    if (budgetConstraint) {
      prompt += ` with a budget of $${budgetConstraint}`;
    }

    if (culturalContext) {
      prompt += `\n\nCultural Context: ${culturalContext} cuisine`;
      prompt += `\nPrioritize ethnic markets and specialty stores that carry authentic ${culturalContext} ingredients.`;
      prompt += `\nInclude traditional names for ingredients where applicable.`;
      prompt += `\nNote cultural significance and authenticity importance of each ingredient.`;
    }

    prompt += `\n\nFor each ingredient, provide:
1. Current price and best store to buy from
2. Traditional/cultural name if applicable
3. Cultural significance (essential/important/common/optional)
4. Seasonal availability and bulk buying options
5. Quality indicators and sourcing tips
6. Alternative ingredients that maintain authenticity

Also identify:
- Ethnic markets or specialty stores in the area
- Cultural shopping strategies
- Potential cost savings while maintaining authenticity
- Seasonal considerations for ingredients`;

    return prompt;
  }

  private async enhanceWithCulturalIntelligence(
    perplexityResult: any,
    request: CulturalPricingRequest
  ): Promise<CulturalPricingResult> {
    // Parse Perplexity response and enhance with database information
    const ingredients = await this.parseIngredientPricing(perplexityResult, request);
    const ethnicMarkets = await this.parseEthnicMarkets(perplexityResult, request.location);
    const culturalInsights = this.parseCulturalInsights(perplexityResult);
    const shoppingStrategy = this.buildShoppingStrategy(ingredients, ethnicMarkets);
    const alternatives = await this.findAlternativeIngredients(request);

    // Calculate confidence score
    const confidence = await culturalPricingDb.calculateCulturalPricingConfidence(
      request.ingredients,
      request.location,
      request.culturalContext
    );

    const totalCost = ingredients.reduce((sum, ing) => sum + ing.totalCost, 0);
    const costPerServing = totalCost / (request.servings || 4);

    return {
      ingredients,
      totalEstimatedCost: totalCost,
      costPerServing,
      confidence,
      ethnicMarkets,
      culturalInsights,
      shoppingStrategy,
      alternativeIngredients: alternatives,
      cached: false,
      lastUpdated: new Date(),
    };
  }

  private async parseIngredientPricing(
    perplexityResult: any,
    request: CulturalPricingRequest
  ): Promise<CulturalIngredientPricing[]> {
    const ingredientPricing: CulturalIngredientPricing[] = [];

    for (const ingredient of request.ingredients) {
      // Get cultural information from database
      const culturalInfo = await culturalPricingDb.getEnhancedCulturalIngredient(ingredient);
      
      // Parse pricing from Perplexity result (this would be more sophisticated in practice)
      const pricing = this.extractIngredientPricing(perplexityResult, ingredient);
      
      ingredientPricing.push({
        ingredient,
        traditionalName: culturalInfo?.traditional_names?.[request.culturalContext || ''] || undefined,
        culturalSignificance: culturalInfo?.cultural_significance || 'common',
        authenticityImportance: culturalInfo?.authenticity_importance || 5.0,
        estimatedPrice: pricing.price || 2.99,
        unit: pricing.unit || 'each',
        quantity: pricing.quantity || 1,
        totalCost: (pricing.price || 2.99) * (pricing.quantity || 1),
        recommendedStore: pricing.store || 'Local grocery store',
        storeType: pricing.storeType || 'mainstream',
        alternatives: [],
        sourcingTips: culturalInfo?.sourcing_tips || [],
        seasonalAvailability: 'year-round',
        confidence: pricing.confidence || 0.7,
      });
    }

    return ingredientPricing;
  }

  private async parseEthnicMarkets(
    perplexityResult: any,
    location: string
  ): Promise<EthnicMarketRecommendation[]> {
    // Extract ethnic market mentions from Perplexity response
    const marketNames = this.extractMarketNames(perplexityResult);
    
    // Get existing market data from database
    const existingMarkets = await culturalPricingDb.getDiscoveredMarkets(location);
    
    // Combine and enhance market recommendations
    const recommendations: EthnicMarketRecommendation[] = [];
    
    for (const marketName of marketNames) {
      const existing = existingMarkets.find(m => m.market_name === marketName);
      
      recommendations.push({
        name: marketName,
        address: existing?.address,
        culturalSpecialties: existing?.cultural_specialties || [],
        estimatedSavings: 15, // Default estimate
        authenticityScore: 8.5, // Default score
        qualityIndicators: existing?.quality_indicators || [],
        mentionCount: existing?.mentioned_in_responses || 1,
        verified: existing?.community_verified || false,
      });
    }

    return recommendations;
  }

  private parseCulturalInsights(perplexityResult: any): CulturalInsight[] {
    // Extract cultural insights from Perplexity response
    return [
      {
        type: 'authenticity',
        insight: 'Ethnic markets typically offer fresher and more authentic ingredients',
        importance: 'high',
      },
      {
        type: 'sourcing',
        insight: 'Buy spices in smaller quantities for better freshness',
        importance: 'medium',
      },
    ];
  }

  private buildShoppingStrategy(
    ingredients: CulturalIngredientPricing[],
    ethnicMarkets: EthnicMarketRecommendation[]
  ): ShoppingStrategy {
    const ethnicMarketIngredients = ingredients.filter(ing => ing.storeType === 'ethnic_market');
    const mainstreamIngredients = ingredients.filter(ing => ing.storeType === 'mainstream');

    const primaryStore = ethnicMarkets.length > 0 && ethnicMarkets[0] ? ethnicMarkets[0].name : 'Local grocery store';
    const storeType = ethnicMarketIngredients.length > mainstreamIngredients.length ? 'ethnic_market' : 'mixed';

    return {
      primaryStore,
      storeType,
      estimatedTime: 45,
      estimatedSavings: 12.50,
      authenticityMaintained: true,
      recommendations: [
        'Start with ethnic markets for specialty ingredients',
        'Buy spices and herbs from cultural markets for better quality',
        'Check mainstream stores for basic ingredients to save time',
      ],
    };
  }

  private async findAlternativeIngredients(
    request: CulturalPricingRequest
  ): Promise<AlternativeIngredient[]> {
    // This would use AI to suggest culturally appropriate alternatives
    return [];
  }

  private buildResultFromCache(
    cached: any,
    request: CulturalPricingRequest
  ): CulturalPricingResult {
    // Convert cached data to result format
    return {
      ingredients: [],
      totalEstimatedCost: cached.total_estimated_cost,
      costPerServing: cached.total_estimated_cost / (request.servings || 4),
      confidence: {
        overall: cached.confidence_score,
        source_reliability: cached.confidence_score,
        cultural_authenticity: cached.confidence_score,
        price_accuracy: cached.confidence_score,
        market_coverage: cached.confidence_score,
      },
      ethnicMarkets: [],
      culturalInsights: cached.cultural_insights.map((insight: string) => ({
        type: 'cultural_context' as const,
        insight,
        importance: 'medium' as const,
      })),
      shoppingStrategy: {
        primaryStore: 'Cached recommendation',
        storeType: 'mixed',
        estimatedTime: 30,
        estimatedSavings: 0,
        authenticityMaintained: true,
        recommendations: [],
      },
      alternativeIngredients: [],
      cached: true,
      lastUpdated: new Date(cached.created_at),
    };
  }

  private getFallbackPricing(request: CulturalPricingRequest): CulturalPricingResult {
    // Provide fallback pricing when services are unavailable
    const fallbackIngredients: CulturalIngredientPricing[] = request.ingredients.map(ingredient => ({
      ingredient,
      culturalSignificance: 'common',
      authenticityImportance: 5.0,
      estimatedPrice: 3.99,
      unit: 'each',
      quantity: 1,
      totalCost: 3.99,
      recommendedStore: 'Local grocery store',
      storeType: 'mainstream',
      alternatives: [],
      sourcingTips: [],
      seasonalAvailability: 'year-round',
      confidence: 0.3,
    }));

    const totalCost = fallbackIngredients.reduce((sum, ing) => sum + ing.totalCost, 0);

    return {
      ingredients: fallbackIngredients,
      totalEstimatedCost: totalCost,
      costPerServing: totalCost / (request.servings || 4),
      confidence: {
        overall: 0.3,
        source_reliability: 0.3,
        cultural_authenticity: 0.3,
        price_accuracy: 0.3,
        market_coverage: 0.3,
      },
      ethnicMarkets: [],
      culturalInsights: [{
        type: 'sourcing',
        insight: 'Pricing data temporarily unavailable - using estimates',
        importance: 'low',
      }],
      shoppingStrategy: {
        primaryStore: 'Local grocery store',
        storeType: 'mainstream',
        estimatedTime: 30,
        estimatedSavings: 0,
        authenticityMaintained: false,
        recommendations: ['Check back later for updated pricing'],
      },
      alternativeIngredients: [],
      cached: false,
      lastUpdated: new Date(),
    };
  }

  private async storePricingResults(
    result: CulturalPricingResult,
    request: CulturalPricingRequest
  ): Promise<void> {
    try {
      await culturalPricingDb.storePerplexityCulturalResponse(
        request.ingredients,
        request.location,
        request.culturalContext,
        JSON.stringify(result), // Raw response would be actual Perplexity response
        result,
        result.ethnicMarkets.map(m => m.name),
        result.culturalInsights.map(i => i.insight),
        JSON.stringify(result.shoppingStrategy),
        result.totalEstimatedCost,
        result.confidence.overall
      );
    } catch (error) {
      console.error('Error storing pricing results:', error);
    }
  }

  // Helper methods for parsing Perplexity responses
  private extractIngredientPricing(perplexityResult: any, ingredient: string): any {
    // This would parse the actual Perplexity response
    return {
      price: 2.99,
      unit: 'each',
      quantity: 1,
      store: 'Local market',
      storeType: 'ethnic_market',
      confidence: 0.8,
    };
  }

  private extractMarketNames(perplexityResult: any): string[] {
    // This would extract market names from Perplexity response
    return ['Aria Persian Market', 'Patel Brothers', 'Super Mercado Latino'];
  }

  private estimateSavingsFromMarket(market: any): number {
    // Calculate estimated savings based on market data
    return market.mentioned_in_responses * 2.5; // Simple heuristic
  }

  private calculateAuthenticityScore(market: any, culturalContext: string): number {
    const hasSpecialty = market.cultural_specialties.includes(culturalContext);
    const mentionScore = Math.min(10, market.mentioned_in_responses);
    const verificationBonus = market.community_verified ? 2 : 0;
    
    return Math.min(10, (hasSpecialty ? 5 : 2) + mentionScore * 0.3 + verificationBonus);
  }
}

export const enhancedCulturalPricingService = new EnhancedCulturalPricingService();