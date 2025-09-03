/**
 * Cultural Pricing Database Service
 * Manages storage and retrieval of pricing data from various sources
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface StoredStore {
  id: string;
  name: string;
  store_type: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  google_place_id?: string;
  cultural_specialties: string[];
  languages: string[];
  quality_rating: number;
  price_reliability: number;
  avg_price_difference: number;
  coordinates?: { lat: number; lng: number };
  hours?: any;
  created_at: string;
  updated_at: string;
}

export interface StoredIngredientPrice {
  id: string;
  ingredient_name: string;
  normalized_name: string;
  traditional_names: string[];
  store_id?: string;
  store_name: string;
  store_type: string;
  price: number;
  unit: string;
  cultural_relevance: string;
  cultural_context?: string;
  confidence: number;
  source: string;
  source_url?: string;
  seasonal_availability: string;
  bulk_options?: any;
  notes?: string;
  location_zip: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface StoredCulturalIngredient {
  id: string;
  ingredient_name: string;
  normalized_name: string;
  cultural_origins: string[];
  traditional_names: Record<string, string>;
  cultural_significance: string;
  seasonality?: any;
  common_substitutes: string[];
  preparation_notes?: string;
  cultural_context?: string;
  created_at: string;
  updated_at: string;
}

export interface EnhancedCulturalIngredient {
  id: string;
  ingredient_name: string;
  normalized_name: string;
  traditional_names: Record<string, string>;
  cultural_origins: string[];
  cultural_significance: 'essential' | 'important' | 'common' | 'optional';
  seasonal_availability?: any;
  bulk_buying_notes?: string;
  authenticity_importance: number; // 1-10 scale
  sourcing_tips: string[];
  price_sensitivity: 'high' | 'medium' | 'low';
  perplexity_enhanced: boolean;
  last_perplexity_update?: string;
  created_at: string;
  updated_at: string;
}

export interface PerplexityCulturalResponse {
  id: string;
  cache_key: string;
  ingredients: string[];
  location_zip: string;
  cultural_context?: string;
  raw_perplexity_response: string;
  parsed_results: any;
  ethnic_markets_discovered: string[];
  cultural_insights: string[];
  shopping_strategy?: string;
  total_estimated_cost: number;
  confidence_score: number;
  expires_at: string;
  created_at: string;
}

export interface PerplexityDiscoveredMarket {
  id: string;
  market_name: string;
  address?: string;
  location_zip?: string;
  cultural_specialties: string[];
  store_type: string;
  mentioned_in_responses: number;
  quality_indicators: string[];
  price_competitiveness: 'excellent' | 'good' | 'average' | 'unknown';
  community_verified: boolean;
  first_discovered: string;
  last_mentioned: string;
}

export interface CulturalPricingConfidence {
  overall: number;
  source_reliability: number;
  cultural_authenticity: number;
  price_accuracy: number;
  market_coverage: number;
}

export interface UserPriceReport {
  id: string;
  user_id: string;
  ingredient_name: string;
  store_name: string;
  reported_price: number;
  unit: string;
  store_type?: string;
  cultural_context?: string;
  location_zip: string;
  confidence: string;
  notes?: string;
  photo_url?: string;
  verified_by_community: boolean;
  verification_count: number;
  created_at: string;
}

export interface PricingCacheEntry {
  id: string;
  cache_key: string;
  ingredients: string[];
  location_zip: string;
  cultural_context?: string;
  pricing_data: any;
  total_estimated_cost: number;
  potential_savings: number;
  primary_store_recommendation?: string;
  expires_at: string;
  created_at: string;
}

class CulturalPricingDatabase {
  /**
   * Store enhanced Perplexity cultural response
   */
  async storePerplexityCulturalResponse(
    ingredients: string[],
    location: string,
    culturalContext: string | undefined,
    rawResponse: string,
    parsedResults: any,
    ethnicMarkets: string[],
    culturalInsights: string[],
    shoppingStrategy: string,
    totalCost: number,
    confidenceScore: number
  ): Promise<boolean> {
    try {
      const cacheKey = this.generateCacheKey(ingredients, location, culturalContext);
      
      const response = {
        cache_key: cacheKey,
        ingredients,
        location_zip: location,
        cultural_context: culturalContext,
        raw_perplexity_response: rawResponse,
        parsed_results: parsedResults,
        ethnic_markets_discovered: ethnicMarkets,
        cultural_insights: culturalInsights,
        shopping_strategy: shoppingStrategy,
        total_estimated_cost: totalCost,
        confidence_score: confidenceScore,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      };

      const { error } = await supabase
        .from('perplexity_cultural_responses')
        .upsert(response, { onConflict: 'cache_key' });

      if (error) {
        console.error('Failed to store Perplexity cultural response:', error);
        return false;
      }

      // Store discovered ethnic markets
      await this.storeDiscoveredMarkets(ethnicMarkets, location, culturalContext);

      return true;
    } catch (error) {
      console.error('Error storing Perplexity cultural response:', error);
      return false;
    }
  }

  /**
   * Get cached Perplexity cultural response
   */
  async getCachedPerplexityResponse(
    ingredients: string[],
    location: string,
    culturalContext?: string
  ): Promise<PerplexityCulturalResponse | null> {
    try {
      const cacheKey = this.generateCacheKey(ingredients, location, culturalContext);

      const { data, error } = await supabase
        .from('perplexity_cultural_responses')
        .select('*')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to get cached Perplexity response:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting cached Perplexity response:', error);
      return null;
    }
  }

  /**
   * Store discovered ethnic markets
   */
  async storeDiscoveredMarkets(
    marketNames: string[],
    location: string,
    culturalContext?: string
  ): Promise<void> {
    try {
      const marketRecords = marketNames.map(name => ({
        market_name: name,
        location_zip: location,
        cultural_specialties: culturalContext ? [culturalContext] : [],
        store_type: 'ethnic_market',
        mentioned_in_responses: 1,
        quality_indicators: [],
        price_competitiveness: 'unknown' as const,
        community_verified: false,
      }));

      // Use upsert to increment mention count for existing markets
      for (const market of marketRecords) {
        const { data: existing } = await supabase
          .from('perplexity_discovered_markets')
          .select('*')
          .eq('market_name', market.market_name)
          .eq('location_zip', location)
          .single();

        if (existing) {
          // Update existing market
          await supabase
            .from('perplexity_discovered_markets')
            .update({
              mentioned_in_responses: existing.mentioned_in_responses + 1,
              last_mentioned: new Date().toISOString(),
              cultural_specialties: Array.from(new Set([
                ...existing.cultural_specialties,
                ...market.cultural_specialties
              ]))
            })
            .eq('id', existing.id);
        } else {
          // Insert new market
          await supabase
            .from('perplexity_discovered_markets')
            .insert(market);
        }
      }
    } catch (error) {
      console.error('Error storing discovered markets:', error);
    }
  }

  /**
   * Get discovered ethnic markets by location and cultural context
   */
  async getDiscoveredMarkets(
    location: string,
    culturalContext?: string
  ): Promise<PerplexityDiscoveredMarket[]> {
    try {
      let query = supabase
        .from('perplexity_discovered_markets')
        .select('*')
        .eq('location_zip', location)
        .order('mentioned_in_responses', { ascending: false });

      if (culturalContext) {
        query = query.contains('cultural_specialties', [culturalContext]);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to get discovered markets:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting discovered markets:', error);
      return [];
    }
  }

  /**
   * Store or update enhanced cultural ingredient information
   */
  async upsertEnhancedCulturalIngredient(
    ingredientData: Partial<EnhancedCulturalIngredient>
  ): Promise<boolean> {
    try {
      const normalizedName = ingredientData.ingredient_name?.toLowerCase().trim().replace(/[^a-z0-9\s]/g, ' ');
      
      const enhancedData = {
        ...ingredientData,
        normalized_name: normalizedName,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('enhanced_cultural_ingredients')
        .upsert(enhancedData, { 
          onConflict: 'normalized_name',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Failed to upsert enhanced cultural ingredient:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error upserting enhanced cultural ingredient:', error);
      return false;
    }
  }

  /**
   * Get enhanced cultural ingredient information
   */
  async getEnhancedCulturalIngredient(
    ingredientName: string
  ): Promise<EnhancedCulturalIngredient | null> {
    try {
      const normalizedName = ingredientName.toLowerCase().trim().replace(/[^a-z0-9\s]/g, ' ');

      const { data, error } = await supabase
        .from('enhanced_cultural_ingredients')
        .select('*')
        .eq('normalized_name', normalizedName)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to get enhanced cultural ingredient:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting enhanced cultural ingredient:', error);
      return null;
    }
  }

  /**
   * Get cultural ingredients by origin
   */
  async getCulturalIngredientsByOrigin(
    culturalOrigin: string
  ): Promise<EnhancedCulturalIngredient[]> {
    try {
      const { data, error } = await supabase
        .from('enhanced_cultural_ingredients')
        .select('*')
        .contains('cultural_origins', [culturalOrigin])
        .order('authenticity_importance', { ascending: false });

      if (error) {
        console.error('Failed to get cultural ingredients by origin:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting cultural ingredients by origin:', error);
      return [];
    }
  }

  /**
   * Calculate cultural pricing confidence score
   */
  async calculateCulturalPricingConfidence(
    ingredients: string[],
    location: string,
    culturalContext?: string
  ): Promise<CulturalPricingConfidence> {
    try {
      // Get cached pricing data for ingredients
      const cachedPricing = await this.getCachedPricing(ingredients, location, culturalContext);
      
      // Get enhanced cultural ingredient data
      const culturalIngredients = await Promise.all(
        ingredients.map(ing => this.getEnhancedCulturalIngredient(ing))
      );

      // Get discovered markets for the location
      const discoveredMarkets = await this.getDiscoveredMarkets(location, culturalContext);

      // Calculate confidence metrics
      const sourceReliability = this.calculateSourceReliability(cachedPricing);
      const culturalAuthenticity = this.calculateCulturalAuthenticity(culturalIngredients, culturalContext);
      const priceAccuracy = this.calculatePriceAccuracy(cachedPricing);
      const marketCoverage = this.calculateMarketCoverage(discoveredMarkets, culturalContext);

      const overall = (sourceReliability + culturalAuthenticity + priceAccuracy + marketCoverage) / 4;

      return {
        overall,
        source_reliability: sourceReliability,
        cultural_authenticity: culturalAuthenticity,
        price_accuracy: priceAccuracy,
        market_coverage: marketCoverage,
      };
    } catch (error) {
      console.error('Error calculating cultural pricing confidence:', error);
      return {
        overall: 0.5,
        source_reliability: 0.5,
        cultural_authenticity: 0.5,
        price_accuracy: 0.5,
        market_coverage: 0.5,
      };
    }
  }

  /**
   * Map traditional ingredient names to modern names
   */
  async mapTraditionalIngredientName(
    traditionalName: string,
    culturalContext: string
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('enhanced_cultural_ingredients')
        .select('ingredient_name, traditional_names')
        .contains('cultural_origins', [culturalContext]);

      if (error) {
        console.error('Failed to map traditional ingredient name:', error);
        return null;
      }

      // Search through traditional names
      for (const ingredient of data || []) {
        const traditionalNames = ingredient.traditional_names as Record<string, string>;
        for (const [culture, name] of Object.entries(traditionalNames)) {
          if (name.toLowerCase().includes(traditionalName.toLowerCase()) ||
              traditionalName.toLowerCase().includes(name.toLowerCase())) {
            return ingredient.ingredient_name;
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error mapping traditional ingredient name:', error);
      return null;
    }
  }

  /**
   * Store pricing data from Perplexity or other sources
   */
  async storePricingData(
    ingredients: string[],
    pricingResults: any[],
    location: string,
    culturalContext?: string,
    source: string = 'perplexity'
  ): Promise<boolean> {
    try {
      const priceRecords = pricingResults.map(result => ({
        ingredient_name: result.ingredient,
        store_name: result.store,
        store_type: result.storeType || 'mainstream',
        price: result.estimatedPrice,
        unit: result.unit,
        cultural_relevance: result.culturalRelevance || 'medium',
        cultural_context: culturalContext,
        confidence: result.confidence,
        source,
        source_url: result.source,
        seasonal_availability: result.seasonalAvailability || 'year-round',
        bulk_options: result.bulkOptions,
        notes: result.notes,
        location_zip: location,
        expires_at: this.calculateExpirationTime(source, result.confidence),
      }));

      const { error } = await supabase
        .from('ingredient_prices')
        .insert(priceRecords);

      if (error) {
        console.error('Failed to store pricing data:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error storing pricing data:', error);
      return false;
    }
  }

  /**
   * Get cached pricing data for ingredients
   */
  async getCachedPricing(
    ingredients: string[],
    location: string,
    culturalContext?: string
  ): Promise<StoredIngredientPrice[]> {
    try {
      const normalizedIngredients = ingredients.map(ing => 
        ing.toLowerCase().trim().replace(/[^a-z0-9\s]/g, ' ')
      );

      let query = supabase
        .from('ingredient_prices')
        .select('*')
        .in('normalized_name', normalizedIngredients)
        .eq('location_zip', location)
        .gt('expires_at', new Date().toISOString())
        .order('confidence', { ascending: false })
        .order('created_at', { ascending: false });

      if (culturalContext) {
        query = query.eq('cultural_context', culturalContext);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to get cached pricing:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting cached pricing:', error);
      return [];
    }
  }

  /**
   * Store or update store information
   */
  async upsertStore(storeData: Partial<StoredStore>): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('stores')
        .upsert(storeData, { 
          onConflict: 'google_place_id',
          ignoreDuplicates: false 
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to upsert store:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error upserting store:', error);
      return null;
    }
  }

  /**
   * Get stores by location and cultural specialties
   */
  async getStoresByLocation(
    zipCode: string,
    culturalContext?: string,
    radius: number = 10
  ): Promise<StoredStore[]> {
    try {
      let query = supabase
        .from('stores')
        .select('*')
        .eq('zip_code', zipCode)
        .order('quality_rating', { ascending: false });

      if (culturalContext) {
        query = query.contains('cultural_specialties', [culturalContext]);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to get stores:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting stores:', error);
      return [];
    }
  }

  /**
   * Get cultural ingredient information
   */
  async getCulturalIngredientInfo(ingredientName: string): Promise<StoredCulturalIngredient | null> {
    try {
      const normalizedName = ingredientName.toLowerCase().trim().replace(/[^a-z0-9\s]/g, ' ');

      const { data, error } = await supabase
        .from('cultural_ingredients')
        .select('*')
        .eq('normalized_name', normalizedName)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Failed to get cultural ingredient info:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting cultural ingredient info:', error);
      return null;
    }
  }

  /**
   * Store user price report
   */
  async storeUserPriceReport(
    userId: string,
    report: Omit<UserPriceReport, 'id' | 'user_id' | 'created_at' | 'verified_by_community' | 'verification_count'>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_price_reports')
        .insert({
          user_id: userId,
          ...report,
        });

      if (error) {
        console.error('Failed to store user price report:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error storing user price report:', error);
      return false;
    }
  }

  /**
   * Cache pricing response for future use
   */
  async cachePricingResponse(
    ingredients: string[],
    location: string,
    culturalContext: string | undefined,
    pricingData: any,
    totalCost: number,
    potentialSavings: number,
    primaryStore?: string
  ): Promise<boolean> {
    try {
      const cacheKey = this.generateCacheKey(ingredients, location, culturalContext);
      
      const cacheEntry = {
        cache_key: cacheKey,
        ingredients,
        location_zip: location,
        cultural_context: culturalContext,
        pricing_data: pricingData,
        total_estimated_cost: totalCost,
        potential_savings: potentialSavings,
        primary_store_recommendation: primaryStore,
        expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours
      };

      const { error } = await supabase
        .from('pricing_cache')
        .upsert(cacheEntry, { onConflict: 'cache_key' });

      if (error) {
        console.error('Failed to cache pricing response:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error caching pricing response:', error);
      return false;
    }
  }

  /**
   * Get cached pricing response
   */
  async getCachedPricingResponse(
    ingredients: string[],
    location: string,
    culturalContext?: string
  ): Promise<PricingCacheEntry | null> {
    try {
      const cacheKey = this.generateCacheKey(ingredients, location, culturalContext);

      const { data, error } = await supabase
        .from('pricing_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to get cached pricing response:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting cached pricing response:', error);
      return null;
    }
  }

  /**
   * Clean expired data
   */
  async cleanExpiredData(): Promise<void> {
    try {
      const now = new Date().toISOString();

      // Clean expired ingredient prices
      await supabase
        .from('ingredient_prices')
        .delete()
        .lt('expires_at', now);

      // Clean expired cache entries
      await supabase
        .from('pricing_cache')
        .delete()
        .lt('expires_at', now);

      console.log('Cleaned expired pricing data');
    } catch (error) {
      console.error('Error cleaning expired data:', error);
    }
  }

  /**
   * Get pricing statistics for analytics
   */
  async getPricingStatistics(location: string, culturalContext?: string): Promise<any> {
    try {
      let query = supabase
        .from('ingredient_prices')
        .select('store_type, cultural_relevance, confidence, price')
        .eq('location_zip', location)
        .gt('expires_at', new Date().toISOString());

      if (culturalContext) {
        query = query.eq('cultural_context', culturalContext);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to get pricing statistics:', error);
        return null;
      }

      // Calculate statistics
      const stats = {
        totalPrices: data.length,
        ethnicMarketPrices: data.filter(p => p.store_type === 'ethnic_market').length,
        mainstreamPrices: data.filter(p => p.store_type === 'mainstream').length,
        averageConfidence: data.reduce((sum, p) => sum + p.confidence, 0) / data.length,
        highCulturalRelevance: data.filter(p => p.cultural_relevance === 'high').length,
        averagePrice: data.reduce((sum, p) => sum + p.price, 0) / data.length,
      };

      return stats;
    } catch (error) {
      console.error('Error getting pricing statistics:', error);
      return null;
    }
  }

  /**
   * Helper methods for confidence calculation
   */
  private calculateSourceReliability(cachedPricing: StoredIngredientPrice[]): number {
    if (cachedPricing.length === 0) return 0.3;

    const avgConfidence = cachedPricing.reduce((sum, price) => sum + price.confidence, 0) / cachedPricing.length;
    const sourceVariety = new Set(cachedPricing.map(p => p.source)).size;
    const recentData = cachedPricing.filter(p => 
      new Date(p.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length;

    return Math.min(1.0, (avgConfidence * 0.5) + (sourceVariety * 0.1) + (recentData * 0.05));
  }

  private calculateCulturalAuthenticity(
    culturalIngredients: (EnhancedCulturalIngredient | null)[],
    culturalContext?: string
  ): number {
    if (!culturalContext) return 0.5;

    const validIngredients = culturalIngredients.filter(Boolean) as EnhancedCulturalIngredient[];
    if (validIngredients.length === 0) return 0.3;

    const culturallyRelevant = validIngredients.filter(ing => 
      ing.cultural_origins.includes(culturalContext)
    );

    const authenticityScore = culturallyRelevant.reduce((sum, ing) => 
      sum + (ing.authenticity_importance / 10), 0
    ) / validIngredients.length;

    return Math.min(1.0, authenticityScore);
  }

  private calculatePriceAccuracy(cachedPricing: StoredIngredientPrice[]): number {
    if (cachedPricing.length === 0) return 0.3;

    const recentPrices = cachedPricing.filter(p => 
      new Date(p.expires_at) > new Date()
    );

    const ethnicMarketPrices = recentPrices.filter(p => p.store_type === 'ethnic_market');
    const mainstreamPrices = recentPrices.filter(p => p.store_type === 'mainstream');

    // Higher score if we have both ethnic and mainstream pricing
    const diversityScore = (ethnicMarketPrices.length > 0 && mainstreamPrices.length > 0) ? 0.3 : 0.1;
    const freshnessScore = recentPrices.length / cachedPricing.length * 0.4;
    const confidenceScore = recentPrices.reduce((sum, p) => sum + p.confidence, 0) / recentPrices.length * 0.3;

    return Math.min(1.0, diversityScore + freshnessScore + confidenceScore);
  }

  private calculateMarketCoverage(
    discoveredMarkets: PerplexityDiscoveredMarket[],
    culturalContext?: string
  ): number {
    if (discoveredMarkets.length === 0) return 0.2;

    const culturallyRelevant = culturalContext 
      ? discoveredMarkets.filter(m => m.cultural_specialties.includes(culturalContext))
      : discoveredMarkets;

    const verifiedMarkets = culturallyRelevant.filter(m => m.community_verified);
    const frequentlyMentioned = culturallyRelevant.filter(m => m.mentioned_in_responses > 2);

    const coverageScore = Math.min(1.0, culturallyRelevant.length * 0.2);
    const verificationScore = verifiedMarkets.length / Math.max(1, culturallyRelevant.length) * 0.3;
    const reliabilityScore = frequentlyMentioned.length / Math.max(1, culturallyRelevant.length) * 0.2;

    return Math.min(1.0, coverageScore + verificationScore + reliabilityScore + 0.3);
  }

  /**
   * Helper methods
   */
  private calculateExpirationTime(source: string, confidence: number): string {
    // Higher confidence data lasts longer
    let hoursToExpire = 6; // Default 6 hours

    if (source === 'user_report') {
      hoursToExpire = 24 * 7; // User reports last 1 week
    } else if (confidence > 0.8) {
      hoursToExpire = 12; // High confidence lasts 12 hours
    } else if (confidence > 0.6) {
      hoursToExpire = 8; // Medium confidence lasts 8 hours
    } else {
      hoursToExpire = 4; // Low confidence lasts 4 hours
    }

    return new Date(Date.now() + hoursToExpire * 60 * 60 * 1000).toISOString();
  }

  private generateCacheKey(ingredients: string[], location: string, culturalContext?: string): string {
    const sortedIngredients = [...ingredients].sort().join(',');
    const keyString = `${sortedIngredients}|${location}|${culturalContext || 'none'}`;
    
    // Simple hash function (in production, use a proper hash library)
    let hash = 0;
    for (let i = 0; i < keyString.length; i++) {
      const char = keyString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `pricing_${Math.abs(hash)}`;
  }
}

export const culturalPricingDb = new CulturalPricingDatabase();