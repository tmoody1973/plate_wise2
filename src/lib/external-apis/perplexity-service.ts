/**
 * Perplexity API Service for Grocery Price Fallback
 * Used when Kroger API is unavailable or doesn't have pricing data
 */

interface PerplexityPriceRequest {
  ingredients: string[];
  location: string; // zip code or city, state
  storePreference?: string; // e.g., "Walmart", "Target", "local grocery stores"
}

interface PerplexityPriceResponse {
  ingredient: string;
  traditionalName?: string;
  estimatedPrice: number;
  unit: string;
  store: string;
  storeType?: string; // 'ethnic_market' | 'mainstream' | 'specialty'
  culturalRelevance?: string; // 'high' | 'medium' | 'low'
  confidence: number; // 0-1 scale
  source: string;
  lastUpdated: string;
  notes?: string;
  alternativeNames?: string[];
  seasonalAvailability?: string;
  culturalSignificance?: 'essential' | 'important' | 'common' | 'optional';
  authenticityLevel?: 'traditional' | 'adapted' | 'substitute';
  bulkOptions?: {
    available: boolean;
    minQuantity: string;
    bulkPrice: number;
    savings: string;
  } | null;
  alternativeStores?: Array<{
    store: string;
    price: number;
    storeType: string;
    distance?: string;
  }>;
  culturalNotes?: string[];
  sourcingTips?: string[];
}

interface PerplexityAPIResponse {
  data: PerplexityPriceResponse[];
  success: boolean;
  error?: string;
  fallbackUsed: boolean;
  culturalInsights?: {
    totalEstimatedCost: number;
    ethnicMarketsFound: string[];
    seasonalConsiderations: string[];
    culturalShoppingStrategy: string;
    authenticityScore: number; // 1-10 scale
    costVsAuthenticityAnalysis: string;
  };
}

class PerplexityPricingService {
  private apiKey: string;
  private baseURL = 'https://api.perplexity.ai/chat/completions';

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Perplexity API key not found. Fallback pricing will be unavailable.');
    }
  }

  /**
   * Get grocery prices for ingredients using Perplexity AI
   */
  async getIngredientPrices(request: PerplexityPriceRequest): Promise<PerplexityAPIResponse> {
    if (!this.apiKey) {
      return {
        data: [],
        success: false,
        error: 'Perplexity API key not configured',
        fallbackUsed: true
      };
    }

    try {
      const prompt = this.buildPricingPrompt(request);
      
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: 'You are a grocery pricing expert. Always return valid JSON with current grocery prices.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.1,
          return_citations: true,
          search_domain_filter: ['walmart.com', 'target.com', 'kroger.com', 'safeway.com', 'instacart.com']
        })
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }

      const result = await response.json();
      const content = result.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content received from Perplexity API');
      }

      // Parse the JSON response from Perplexity
      const priceData = this.parsePerplexityResponse(content);
      
      return {
        data: priceData,
        success: true,
        fallbackUsed: true
      };

    } catch (error) {
      console.error('Perplexity pricing service error:', error);
      
      // Return estimated prices as last resort
      return {
        data: this.getEstimatedPrices(request.ingredients),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        fallbackUsed: true
      };
    }
  }

  /**
   * Build a structured prompt for Perplexity to get grocery prices
   */
  private buildPricingPrompt(request: PerplexityPriceRequest): string {
    const { ingredients, location, storePreference } = request;
    
    return `
Find current grocery prices for the following ingredients in ${location}:

Ingredients: ${ingredients.join(', ')}
${storePreference ? `Preferred stores: ${storePreference}` : 'Any major grocery stores (Walmart, Target, Kroger, Safeway, etc.)'}

Please return the results in this exact JSON format:
{
  "prices": [
    {
      "ingredient": "ingredient name",
      "estimatedPrice": 0.00,
      "unit": "per lb/per item/per oz",
      "store": "store name",
      "confidence": 0.8,
      "source": "website or source",
      "lastUpdated": "2025-01-30",
      "notes": "any relevant notes about the price or product"
    }
  ]
}

Requirements:
- Use current 2025 prices
- Include confidence score (0-1) based on how recent/reliable the price is
- Specify the unit (per pound, per item, per ounce, etc.)
- Include store name where price was found
- Add notes for any assumptions or variations
- Focus on common grocery stores in the ${location} area
- Return only valid JSON, no additional text
`;
  }

  /**
   * Build advanced culturally-aware pricing prompt for ethnic ingredients
   */
  private buildCulturalPricingPrompt(ingredients: string[], location: string, culturalContext?: string): string {
    return `
Find current grocery prices for these ${culturalContext || ''} ingredients in ${location}:

${ingredients.map((ing, i) => `${i + 1}. ${ing}`).join('\n')}

CRITICAL REQUIREMENTS:
1. Search BOTH mainstream stores (Kroger, Walmart, Safeway) AND ethnic markets
2. For cultural ingredients, prioritize ethnic markets where they're fresher/cheaper
3. Include traditional names (e.g., "za'faran" for saffron, "masa harina" for corn flour)
4. Note seasonal availability and price variations
5. Identify bulk pricing for staples (rice, spices, etc.)
6. Rate cultural significance: essential/important/common/optional
7. Assess authenticity level: traditional/adapted/substitute

${culturalContext ? `
CULTURAL CONTEXT: These ingredients are for ${culturalContext} cooking.
- Prioritize stores specializing in ${culturalContext} ingredients
- Include cultural shopping tips and seasonal recommendations
- Note authenticity levels and cultural significance
- Suggest ethnic markets known for quality ${culturalContext} ingredients
- Consider traditional preparation methods that affect ingredient choice
` : ''}

FORMAT RESPONSE AS JSON:
{
  "prices": [
    {
      "ingredient": "ingredient name",
      "traditionalName": "traditional name if different",
      "estimatedPrice": 0.00,
      "unit": "per lb/per item/per oz",
      "store": "store name",
      "storeType": "ethnic_market|mainstream|specialty",
      "culturalRelevance": "high|medium|low",
      "culturalSignificance": "essential|important|common|optional",
      "authenticityLevel": "traditional|adapted|substitute",
      "confidence": 0.8,
      "source": "website or source",
      "lastUpdated": "2025-01-30",
      "notes": "cultural context and price notes",
      "alternativeNames": ["traditional name 1", "traditional name 2"],
      "seasonalAvailability": "year-round|seasonal|limited",
      "culturalNotes": ["authenticity info", "cultural significance"],
      "sourcingTips": ["where to buy", "what to look for"],
      "bulkOptions": {
        "available": true,
        "minQuantity": "5 lbs",
        "bulkPrice": 0.00,
        "savings": "15%"
      },
      "alternativeStores": [
        {
          "store": "alternative store name",
          "price": 0.00,
          "storeType": "ethnic_market|mainstream",
          "distance": "2.5 miles"
        }
      ]
    }
  ],
  "culturalInsights": {
    "totalEstimatedCost": 0.00,
    "ethnicMarketsFound": ["market 1", "market 2"],
    "seasonalConsiderations": ["seasonal note 1", "seasonal note 2"],
    "culturalShoppingStrategy": "overall shopping strategy recommendation",
    "authenticityScore": 8.5,
    "costVsAuthenticityAnalysis": "analysis of cost vs authenticity trade-offs"
  }
}

REQUIREMENTS:
- Use current 2025 prices
- Prioritize ethnic markets for cultural ingredients
- Include traditional/cultural names when known
- Note seasonal availability and bulk options
- Explain cultural significance and authenticity
- Provide practical shopping tips
- Return ONLY valid JSON, no additional text
`;
  }

  /**
   * Get culturally-aware pricing for ingredients
   */
  async getCulturalIngredientPrices(request: PerplexityPriceRequest & { culturalContext?: string }): Promise<PerplexityAPIResponse> {
    if (!this.apiKey) {
      return {
        data: [],
        success: false,
        error: 'Perplexity API key not configured',
        fallbackUsed: true
      };
    }

    try {
      const prompt = this.buildCulturalPricingPrompt(request.ingredients, request.location, request.culturalContext);
      
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'system',
              content: 'You are a cultural grocery pricing expert. Always return valid JSON with current prices from both ethnic markets and mainstream stores.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 3000,
          temperature: 0.1,
          return_citations: true,
          search_domain_filter: ['walmart.com', 'target.com', 'kroger.com', 'safeway.com', 'instacart.com', 'yelp.com']
        })
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }

      const result = await response.json();
      const content = result.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content received from Perplexity API');
      }

      // Parse the JSON response from Perplexity
      const { prices, culturalInsights } = this.parseCulturalPerplexityResponse(content);
      
      return {
        data: prices,
        success: true,
        fallbackUsed: false,
        culturalInsights
      };

    } catch (error) {
      console.error('Perplexity cultural pricing service error:', error);
      
      // Return estimated prices as last resort
      return {
        data: this.getCulturalEstimatedPrices(request.ingredients, request.culturalContext),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        fallbackUsed: true
      };
    }
  }

  /**
   * Parse Perplexity's enhanced cultural pricing response
   */
  private parseCulturalPerplexityResponse(content: string): { prices: PerplexityPriceResponse[]; culturalInsights?: any } {
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Perplexity response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (parsed.prices && Array.isArray(parsed.prices)) {
        const prices = parsed.prices.map((price: any) => ({
          ingredient: price.ingredient || '',
          traditionalName: price.traditionalName || undefined,
          estimatedPrice: parseFloat(price.estimatedPrice) || 0,
          unit: price.unit || 'each',
          store: price.store || 'Unknown',
          storeType: price.storeType || 'mainstream',
          culturalRelevance: price.culturalRelevance || 'medium',
          culturalSignificance: price.culturalSignificance || 'common',
          authenticityLevel: price.authenticityLevel || 'traditional',
          confidence: parseFloat(price.confidence) || 0.5,
          source: price.source || 'Perplexity Search',
          lastUpdated: price.lastUpdated || new Date().toISOString().split('T')[0],
          notes: price.notes || '',
          alternativeNames: price.alternativeNames || [],
          seasonalAvailability: price.seasonalAvailability || 'year-round',
          culturalNotes: price.culturalNotes || [],
          sourcingTips: price.sourcingTips || [],
          bulkOptions: price.bulkOptions || null,
          alternativeStores: price.alternativeStores || []
        }));

        return {
          prices,
          culturalInsights: parsed.culturalInsights || null
        };
      }

      throw new Error('Invalid price data structure');
    } catch (error) {
      console.error('Error parsing cultural Perplexity response:', error);
      return { prices: [] };
    }
  }

  /**
   * Identify cultural ingredients and their significance
   */
  private identifyCulturalIngredients(ingredients: string[], culturalContext?: string): Array<{
    ingredient: string;
    culturalSignificance: 'essential' | 'important' | 'common' | 'optional';
    traditionalNames: string[];
    sourcingTips: string[];
  }> {
    const culturalIngredientMap: Record<string, any> = {
      // Persian/Middle Eastern
      'saffron': {
        culturalSignificance: 'essential',
        traditionalNames: ['za\'faran', 'kesar'],
        sourcingTips: ['Buy from Persian/Middle Eastern markets', 'Look for Category I grade', 'Store in cool, dark place']
      },
      'sumac': {
        culturalSignificance: 'important',
        traditionalNames: ['somagh', 'summaq'],
        sourcingTips: ['Middle Eastern markets have better quality', 'Should be deep red color', 'Avoid if brownish']
      },
      'pomegranate molasses': {
        culturalSignificance: 'important',
        traditionalNames: ['dibs rumman', 'rob-e anar'],
        sourcingTips: ['Available at Middle Eastern stores', 'Check for pure pomegranate content', 'Can substitute with reduced pomegranate juice']
      },
      'rose water': {
        culturalSignificance: 'important',
        traditionalNames: ['golab', 'ma ward'],
        sourcingTips: ['Persian/Middle Eastern markets', 'Food-grade only', 'Small bottles stay fresh longer']
      },
      
      // Mexican
      'masa harina': {
        culturalSignificance: 'essential',
        traditionalNames: ['masa harina', 'harina de maíz'],
        sourcingTips: ['Mexican markets often have fresher stock', 'Maseca brand widely available', 'Check expiration date carefully']
      },
      'dried chiles guajillo': {
        culturalSignificance: 'essential',
        traditionalNames: ['chile guajillo seco'],
        sourcingTips: ['Mexican markets have better variety', 'Should be pliable, not brittle', 'Store in airtight containers']
      },
      'mexican crema': {
        culturalSignificance: 'important',
        traditionalNames: ['crema mexicana', 'crema fresca'],
        sourcingTips: ['Fresh from Mexican markets', 'Can substitute with sour cream + lime', 'Check expiration date']
      },
      'queso fresco': {
        culturalSignificance: 'important',
        traditionalNames: ['queso fresco'],
        sourcingTips: ['Fresh from Mexican markets', 'Should be soft and mild', 'Use within few days of purchase']
      },
      
      // Indian/South Asian
      'ghee': {
        culturalSignificance: 'important',
        traditionalNames: ['ghee', 'ghrita'],
        sourcingTips: ['Indian markets have variety of brands', 'Homemade often available', 'Organic options at health stores']
      },
      'paneer': {
        culturalSignificance: 'important',
        traditionalNames: ['paneer'],
        sourcingTips: ['Fresh paneer from Indian markets', 'Check softness and freshness', 'Can be made at home']
      },
      'curry leaves': {
        culturalSignificance: 'essential',
        traditionalNames: ['kadi patta', 'meetha neem'],
        sourcingTips: ['Fresh from Indian markets only', 'Frozen is acceptable substitute', 'Dried loses most flavor']
      },
      'garam masala': {
        culturalSignificance: 'important',
        traditionalNames: ['garam masala'],
        sourcingTips: ['Indian markets have authentic blends', 'Whole spices ground fresh are best', 'Store in airtight containers']
      }
    };

    return ingredients.map(ingredient => {
      const normalizedIngredient = ingredient.toLowerCase().trim();
      const culturalData = culturalIngredientMap[normalizedIngredient];
      
      if (culturalData) {
        return {
          ingredient,
          culturalSignificance: culturalData.culturalSignificance,
          traditionalNames: culturalData.traditionalNames,
          sourcingTips: culturalData.sourcingTips
        };
      }

      // Default for unknown ingredients
      return {
        ingredient,
        culturalSignificance: 'common' as const,
        traditionalNames: [],
        sourcingTips: ['Available at most grocery stores']
      };
    });
  }

  /**
   * Enhanced fallback cultural estimates when API fails
   */
  private getCulturalEstimatedPrices(ingredients: string[], culturalContext?: string): PerplexityPriceResponse[] {
    // Get cultural ingredient data
    const culturalIngredients = this.identifyCulturalIngredients(ingredients, culturalContext);
    
    // Enhanced cultural price estimates with more detailed information
    const culturalPriceEstimates: Record<string, { 
      price: number; 
      unit: string; 
      storeType: string; 
      culturalRelevance: string;
      traditionalName?: string;
      authenticityLevel: string;
      bulkOptions?: any;
      alternativeStores?: any[];
    }> = {
      // Persian/Middle Eastern
      'saffron': { 
        price: 8.99, 
        unit: 'per gram', 
        storeType: 'ethnic_market', 
        culturalRelevance: 'high',
        traditionalName: 'za\'faran',
        authenticityLevel: 'traditional',
        bulkOptions: { available: true, minQuantity: '5g', bulkPrice: 39.99, savings: '10%' },
        alternativeStores: [
          { store: 'Whole Foods', price: 12.99, storeType: 'specialty' },
          { store: 'Persian Market', price: 7.99, storeType: 'ethnic_market' }
        ]
      },
      'sumac': { 
        price: 3.99, 
        unit: 'per 4oz', 
        storeType: 'ethnic_market', 
        culturalRelevance: 'high',
        traditionalName: 'somagh',
        authenticityLevel: 'traditional'
      },
      'pomegranate molasses': { 
        price: 4.99, 
        unit: 'per 10oz', 
        storeType: 'ethnic_market', 
        culturalRelevance: 'high',
        traditionalName: 'dibs rumman',
        authenticityLevel: 'traditional'
      },
      
      // Mexican
      'masa harina': { 
        price: 2.49, 
        unit: 'per 4lb bag', 
        storeType: 'ethnic_market', 
        culturalRelevance: 'high',
        authenticityLevel: 'traditional',
        bulkOptions: { available: true, minQuantity: '10lb', bulkPrice: 4.99, savings: '20%' }
      },
      'dried chiles guajillo': { 
        price: 3.99, 
        unit: 'per 3oz', 
        storeType: 'ethnic_market', 
        culturalRelevance: 'high',
        authenticityLevel: 'traditional'
      },
      
      // Indian/South Asian
      'ghee': { 
        price: 7.99, 
        unit: 'per 14oz', 
        storeType: 'ethnic_market', 
        culturalRelevance: 'high',
        authenticityLevel: 'traditional',
        alternativeStores: [
          { store: 'Indian Grocery', price: 6.99, storeType: 'ethnic_market' },
          { store: 'Whole Foods', price: 9.99, storeType: 'specialty' }
        ]
      },
      'paneer': { 
        price: 4.99, 
        unit: 'per 14oz', 
        storeType: 'ethnic_market', 
        culturalRelevance: 'high',
        authenticityLevel: 'traditional'
      },
      'curry leaves': { 
        price: 1.99, 
        unit: 'per pack', 
        storeType: 'ethnic_market', 
        culturalRelevance: 'high',
        traditionalName: 'kadi patta',
        authenticityLevel: 'traditional'
      },
      
      // Common ingredients
      'onion': { price: 1.99, unit: 'per lb', storeType: 'mainstream', culturalRelevance: 'low', authenticityLevel: 'traditional' },
      'garlic': { price: 2.99, unit: 'per lb', storeType: 'mainstream', culturalRelevance: 'low', authenticityLevel: 'traditional' },
      'tomato': { price: 2.99, unit: 'per lb', storeType: 'mainstream', culturalRelevance: 'low', authenticityLevel: 'traditional' },
    };

    return culturalIngredients.map(({ ingredient, culturalSignificance, traditionalNames, sourcingTips }) => {
      const normalizedIngredient = ingredient.toLowerCase().trim();
      const estimate = culturalPriceEstimates[normalizedIngredient] || { 
        price: 2.99, 
        unit: 'estimated', 
        storeType: 'mainstream', 
        culturalRelevance: 'low',
        authenticityLevel: 'traditional'
      };
      
      const result: PerplexityPriceResponse = {
        ingredient,
        estimatedPrice: estimate.price,
        unit: estimate.unit,
        store: estimate.storeType === 'ethnic_market' ? 'Local Ethnic Market' : 'Estimated Average',
        confidence: 0.3, // Low confidence for estimates
        source: 'PlateWise Cultural Estimates',
        lastUpdated: new Date().toISOString().split('T')[0] || new Date().toISOString().substring(0, 10),
        traditionalName: estimate.traditionalName,
        storeType: estimate.storeType,
        culturalRelevance: estimate.culturalRelevance,
        notes: `Estimated price for ${culturalContext || 'general'} cooking - actual prices may vary`,
        alternativeNames: traditionalNames,
        seasonalAvailability: 'year-round',
        culturalSignificance,
        authenticityLevel: estimate.authenticityLevel as any
      };
      return result;
    });
  }

  /**
   * Parse Perplexity's response and extract price data
   */
  private parsePerplexityResponse(content: string): PerplexityPriceResponse[] {
    try {
      // Extract JSON from the response (Perplexity might include extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Perplexity response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (parsed.prices && Array.isArray(parsed.prices)) {
        return parsed.prices.map((price: any) => ({
          ingredient: price.ingredient || '',
          estimatedPrice: parseFloat(price.estimatedPrice) || 0,
          unit: price.unit || 'each',
          store: price.store || 'Unknown',
          confidence: parseFloat(price.confidence) || 0.5,
          source: price.source || 'Perplexity Search',
          lastUpdated: price.lastUpdated || new Date().toISOString().split('T')[0],
          notes: price.notes || ''
        }));
      }

      throw new Error('Invalid price data structure');
    } catch (error) {
      console.error('Error parsing Perplexity response:', error);
      return [];
    }
  }

  /**
   * Fallback estimated prices when all else fails
   */
  private getEstimatedPrices(ingredients: string[]): PerplexityPriceResponse[] {
    // Basic price estimates based on common grocery items
    const priceEstimates: Record<string, { price: number; unit: string }> = {
      // Proteins
      'chicken breast': { price: 6.99, unit: 'per lb' },
      'ground beef': { price: 5.99, unit: 'per lb' },
      'salmon': { price: 12.99, unit: 'per lb' },
      'eggs': { price: 3.49, unit: 'per dozen' },
      
      // Vegetables
      'onion': { price: 1.99, unit: 'per lb' },
      'tomato': { price: 2.99, unit: 'per lb' },
      'carrot': { price: 1.49, unit: 'per lb' },
      'potato': { price: 2.99, unit: 'per 5lb bag' },
      'bell pepper': { price: 1.99, unit: 'each' },
      
      // Pantry items
      'rice': { price: 2.99, unit: 'per 2lb bag' },
      'flour': { price: 3.49, unit: 'per 5lb bag' },
      'olive oil': { price: 7.99, unit: 'per 16oz bottle' },
      'salt': { price: 1.99, unit: 'per container' },
      'sugar': { price: 3.99, unit: 'per 4lb bag' }
    };

    return ingredients.map(ingredient => {
      const normalizedIngredient = ingredient.toLowerCase().trim();
      const estimate = priceEstimates[normalizedIngredient] || { price: 2.99, unit: 'estimated' };
      
      return {
        ingredient,
        estimatedPrice: estimate.price,
        unit: estimate.unit,
        store: 'Estimated Average',
        confidence: 0.3, // Low confidence for estimates
        source: 'PlateWise Estimates',
        lastUpdated: new Date().toISOString().split('T')[0] || new Date().toISOString().substring(0, 10),
        notes: 'Estimated price - actual prices may vary'
      };
    });
  }

  /**
   * Get comprehensive cultural pricing analysis with enhanced intelligence
   */
  async getAdvancedCulturalPricing(request: {
    ingredients: string[];
    location: string;
    culturalContext?: string;
    budgetLimit?: number;
    prioritizeAuthenticity?: boolean;
  }): Promise<PerplexityAPIResponse> {
    // First identify cultural ingredients
    const culturalIngredients = this.identifyCulturalIngredients(request.ingredients, request.culturalContext);
    
    // Separate essential/important cultural ingredients for priority processing
    const priorityIngredients = culturalIngredients
      .filter(ci => ci.culturalSignificance === 'essential' || ci.culturalSignificance === 'important')
      .map(ci => ci.ingredient);
    
    const commonIngredients = culturalIngredients
      .filter(ci => ci.culturalSignificance === 'common' || ci.culturalSignificance === 'optional')
      .map(ci => ci.ingredient);

    try {
      // Get pricing for priority cultural ingredients with enhanced prompt
      let priorityResults: PerplexityAPIResponse = { data: [], success: true, fallbackUsed: false };
      if (priorityIngredients.length > 0) {
        priorityResults = await this.getCulturalIngredientPrices({
          ...request,
          ingredients: priorityIngredients
        });
      }

      // Get pricing for common ingredients with standard prompt
      let commonResults: PerplexityAPIResponse = { data: [], success: true, fallbackUsed: false };
      if (commonIngredients.length > 0) {
        commonResults = await this.getIngredientPrices({
          ingredients: commonIngredients,
          location: request.location
        });
      }

      // Combine and analyze results
      const allResults = [...priorityResults.data, ...commonResults.data];
      const culturalInsights = this.analyzeCulturalPricingResults(allResults, request);

      return {
        data: allResults,
        success: priorityResults.success && commonResults.success,
        fallbackUsed: priorityResults.fallbackUsed || commonResults.fallbackUsed,
        culturalInsights
      };

    } catch (error) {
      console.error('Advanced cultural pricing error:', error);
      
      // Fallback to enhanced estimates
      const fallbackData = this.getCulturalEstimatedPrices(request.ingredients, request.culturalContext);
      const culturalInsights = this.analyzeCulturalPricingResults(fallbackData, request);
      
      return {
        data: fallbackData,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        fallbackUsed: true,
        culturalInsights
      };
    }
  }

  /**
   * Analyze cultural pricing results and provide insights
   */
  private analyzeCulturalPricingResults(
    results: PerplexityPriceResponse[], 
    request: { culturalContext?: string; budgetLimit?: number; prioritizeAuthenticity?: boolean }
  ): any {
    const totalCost = results.reduce((sum, item) => sum + item.estimatedPrice, 0);
    const ethnicMarkets = [...new Set(results
      .filter(item => item.storeType === 'ethnic_market')
      .map(item => item.store)
    )];
    
    const essentialItems = results.filter(item => item.culturalSignificance === 'essential');
    const authenticityScore = this.calculateAuthenticityScore(results);
    
    const seasonalItems = results.filter(item => 
      item.seasonalAvailability && item.seasonalAvailability !== 'year-round'
    );

    const bulkOpportunities = results.filter(item => 
      item.bulkOptions && item.bulkOptions.available
    );

    let shoppingStrategy = 'Mix of ethnic markets and mainstream stores for optimal cost and authenticity.';
    if (request.prioritizeAuthenticity) {
      shoppingStrategy = 'Prioritize ethnic markets for cultural ingredients, even at higher cost for authenticity.';
    } else if (request.budgetLimit && totalCost > request.budgetLimit) {
      shoppingStrategy = 'Focus on mainstream stores and consider ingredient substitutions to meet budget.';
    }

    let costVsAuthenticityAnalysis = 'Balanced approach between cost savings and cultural authenticity.';
    if (ethnicMarkets.length > 0) {
      const ethnicMarketSavings = results
        .filter(item => item.storeType === 'ethnic_market')
        .reduce((sum, item) => {
          const mainstreamPrice = item.alternativeStores?.find(alt => alt.storeType === 'mainstream')?.price || item.estimatedPrice * 1.3;
          return sum + (mainstreamPrice - item.estimatedPrice);
        }, 0);
      
      if (ethnicMarketSavings > 0) {
        costVsAuthenticityAnalysis = `Ethnic markets provide $${ethnicMarketSavings.toFixed(2)} savings while maintaining authenticity.`;
      }
    }

    return {
      totalEstimatedCost: totalCost,
      ethnicMarketsFound: ethnicMarkets,
      seasonalConsiderations: seasonalItems.map(item => 
        `${item.ingredient}: ${item.seasonalAvailability}`
      ),
      culturalShoppingStrategy: shoppingStrategy,
      authenticityScore,
      costVsAuthenticityAnalysis,
      bulkBuyingOpportunities: bulkOpportunities.length,
      essentialIngredientsCount: essentialItems.length,
      budgetStatus: request.budgetLimit ? 
        (totalCost <= request.budgetLimit ? 'within_budget' : 'over_budget') : 
        'no_budget_set'
    };
  }

  /**
   * Calculate authenticity score based on ingredient sources and types
   */
  private calculateAuthenticityScore(results: PerplexityPriceResponse[]): number {
    if (results.length === 0) return 5.0;

    let totalScore = 0;
    let scoredItems = 0;

    results.forEach(item => {
      let itemScore = 5.0; // Base score

      // Boost for ethnic market sourcing
      if (item.storeType === 'ethnic_market') {
        itemScore += 2.0;
      }

      // Boost for traditional authenticity level
      if (item.authenticityLevel === 'traditional') {
        itemScore += 1.5;
      } else if (item.authenticityLevel === 'adapted') {
        itemScore += 0.5;
      } else if (item.authenticityLevel === 'substitute') {
        itemScore -= 1.0;
      }

      // Boost for cultural significance
      if (item.culturalSignificance === 'essential') {
        itemScore += 1.0;
      } else if (item.culturalSignificance === 'important') {
        itemScore += 0.5;
      }

      // Cap at 10.0
      itemScore = Math.min(itemScore, 10.0);
      totalScore += itemScore;
      scoredItems++;
    });

    return scoredItems > 0 ? totalScore / scoredItems : 5.0;
  }

  /**
   * Health check for Perplexity API
   */
  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [
            {
              role: 'user',
              content: 'Hello, this is a health check. Please respond with "OK".'
            }
          ],
          max_tokens: 10
        })
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}

export const perplexityPricingService = new PerplexityPricingService();
export type { PerplexityPriceRequest, PerplexityPriceResponse, PerplexityAPIResponse };

// Additional types for enhanced cultural pricing
export interface AdvancedCulturalPricingRequest {
  ingredients: string[];
  location: string;
  culturalContext?: string;
  budgetLimit?: number;
  prioritizeAuthenticity?: boolean;
}

export interface CulturalIngredientInfo {
  ingredient: string;
  culturalSignificance: 'essential' | 'important' | 'common' | 'optional';
  traditionalNames: string[];
  sourcingTips: string[];
}