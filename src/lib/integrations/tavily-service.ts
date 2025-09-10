/**
 * Tavily URL Discovery Service
 * 
 * Implements intelligent recipe URL discovery using Tavily Search API with:
 * - Smart query construction based on user preferences
 * - Meal type filtering with OR logic
 * - Cultural authenticity optimization
 * - Quality filtering and validation
 */

import { TavilyClient, TavilySearchOptions } from './tavily-client';
import { TavilyPerplexityConfigManager } from './tavily-perplexity-config';
import { EnhancedRecipeSearchRequest, RecipeSearchError, RecipeSearchErrorType } from './recipe-types';

export interface TavilySearchContext {
  culturalCuisine?: string;
  country?: string;
  dietaryRestrictions?: string[];
  mealTypes?: string[];
  maxTimeMinutes?: number;
  difficulty?: 'easy' | 'moderate' | 'advanced';
  includeIngredients?: string[];
  excludeIngredients?: string[];
}

export interface TavilyUrlDiscoveryResult {
  urls: string[];
  searchQuery: string;
  searchTime: number;
  qualityScore: number;
  source: 'tavily';
  cached: boolean;
}

export class TavilyService {
  private client: TavilyClient;
  private config: TavilyPerplexityConfigManager;

  constructor() {
    this.config = TavilyPerplexityConfigManager.getInstance();
    this.client = new TavilyClient(this.config.getTavilyConfig());
  }

  /**
   * Find recipe URLs using intelligent query construction with fallback logic
   */
  async findRecipeUrls(
    baseQuery: string, 
    options: Partial<TavilySearchOptions> = {}
  ): Promise<string[]> {
    try {
      // Construct optimized search query
      const optimizedQuery = this.constructIntelligentQuery(baseQuery, options);
      
      // Configure search options
      const searchOptions: TavilySearchOptions = {
        maxResults: 10,
        searchDepth: 'basic',
        includeImages: true,
        qualityFilter: {
          excludeVideoSites: true,
          excludeCollectionPages: true,
          minContentLength: 200,
          requireIngredients: true
        },
        ...options
      };

      console.log(`🔍 Searching Tavily with query: "${optimizedQuery}"`);
      
      // Use fallback logic to ensure we get sufficient results
      const minResults = Math.min(3, searchOptions.maxResults);
      const urls = await this.client.findRecipeUrlsWithFallback(
        optimizedQuery, 
        searchOptions, 
        minResults
      );
      
      console.log(`✅ Found ${urls.length} recipe URLs from Tavily`);
      return urls;
      
    } catch (error) {
      console.error('Tavily URL discovery failed:', error);
      throw new Error(`Tavily URL discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find recipe URLs with detailed results including quality scores
   */
  async findRecipeUrlsWithDetails(
    baseQuery: string, 
    context: TavilySearchContext,
    options: Partial<TavilySearchOptions> = {}
  ): Promise<TavilyUrlDiscoveryResult> {
    const startTime = Date.now();
    
    try {
      const urls = await this.findRecipeUrls(baseQuery, context, options);
      const searchTime = Date.now() - startTime;
      
      // Calculate average quality score (simplified)
      const qualityScore = urls.length > 0 ? 0.8 : 0.0; // Placeholder scoring
      
      return {
        urls,
        searchQuery: this.constructIntelligentQuery(baseQuery, context),
        searchTime,
        qualityScore,
        source: 'tavily',
        cached: false // TODO: Implement caching
      };
    } catch (error) {
      const searchTime = Date.now() - startTime;
      console.error('Tavily URL discovery with details failed:', error);
      
      return {
        urls: [],
        searchQuery: this.constructIntelligentQuery(baseQuery, context),
        searchTime,
        qualityScore: 0.0,
        source: 'tavily',
        cached: false
      };
    }
  }

  /**
   * Construct intelligent search query from user preferences
   * Uses proven pattern: "easy [dish] recipe [time] [cooking terms] instructions"
   */
  private constructIntelligentQuery(baseQuery: string, options: Partial<TavilySearchOptions>): string {
    // Start with the base query and ensure it includes "recipe"
    let mainQuery = baseQuery;
    if (!mainQuery.toLowerCase().includes('recipe')) {
      mainQuery = `${mainQuery} recipe`;
    }

    let queryParts: string[] = [];

    // Add the main query
    queryParts.push(mainQuery);

    // Add meal type filters if specified
    if (options.mealTypes && options.mealTypes.length > 0) {
      const mealTypeTerms = options.mealTypes.join(' OR ');
      queryParts.push(`(${mealTypeTerms})`);
    }

    // Add essential recipe terms that help find individual recipes
    queryParts.push('ingredients instructions');

    // Exclude collection terms
    queryParts.push('-gallery -collection -roundup -"best recipes" -"top recipes"');

    return queryParts.join(' ').trim();
  }

  /**
   * Get cultural cuisine-specific query terms for authenticity
   */
  private getCulturalQueryTerms(cuisine: string): string {
    const cuisineTerms: Record<string, string> = {
      'mexican': 'authentic traditional mexican cocina mexicana',
      'italian': 'authentic traditional italian cucina italiana',
      'chinese': 'authentic traditional chinese zhongguo cai',
      'indian': 'authentic traditional indian bharatiya khana',
      'japanese': 'authentic traditional japanese washoku',
      'thai': 'authentic traditional thai ahaan thai',
      'french': 'authentic traditional french cuisine française',
      'mediterranean': 'authentic traditional mediterranean',
      'middle-eastern': 'authentic traditional middle eastern',
      'korean': 'authentic traditional korean hansik',
      'vietnamese': 'authentic traditional vietnamese',
      'greek': 'authentic traditional greek elliniki kouzina',
      'spanish': 'authentic traditional spanish cocina española',
      'moroccan': 'authentic traditional moroccan',
      'lebanese': 'authentic traditional lebanese',
      'turkish': 'authentic traditional turkish',
      'ethiopian': 'authentic traditional ethiopian',
      'caribbean': 'authentic traditional caribbean',
      'brazilian': 'authentic traditional brazilian',
      'peruvian': 'authentic traditional peruvian',
      'argentinian': 'authentic traditional argentinian'
    };

    return cuisineTerms[cuisine.toLowerCase()] || `authentic traditional ${cuisine}`;
  }

  /**
   * Get country-specific terms for regional authenticity
   */
  private getCountrySpecificTerms(country: string): string {
    const countryTerms: Record<string, string> = {
      'mexico': 'mexico mexican cocina regional',
      'italy': 'italy italian regionale',
      'china': 'china chinese regional',
      'india': 'india indian regional',
      'japan': 'japan japanese regional',
      'thailand': 'thailand thai regional',
      'france': 'france french regional',
      'greece': 'greece greek regional',
      'spain': 'spain spanish regional',
      'morocco': 'morocco moroccan regional',
      'lebanon': 'lebanon lebanese regional',
      'turkey': 'turkey turkish regional',
      'ethiopia': 'ethiopia ethiopian regional',
      'brazil': 'brazil brazilian regional',
      'peru': 'peru peruvian regional',
      'argentina': 'argentina argentinian regional'
    };

    return countryTerms[country.toLowerCase()] || `${country} regional`;
  }

  /**
   * Get dietary restriction terms for search optimization
   */
  private getDietaryRestrictionTerms(restrictions: string[]): string {
    const dietaryMap: Record<string, string> = {
      'vegetarian': 'vegetarian plant-based no meat',
      'vegan': 'vegan plant-based no animal products',
      'gluten-free': 'gluten-free celiac safe wheat-free',
      'dairy-free': 'dairy-free lactose-free no milk',
      'nut-free': 'nut-free allergy-safe no nuts',
      'halal': 'halal islamic permissible',
      'kosher': 'kosher jewish dietary laws',
      'keto': 'keto ketogenic low-carb high-fat',
      'paleo': 'paleo paleolithic whole foods',
      'low-sodium': 'low-sodium heart-healthy',
      'diabetic': 'diabetic-friendly low-sugar',
      'low-fat': 'low-fat heart-healthy'
    };

    const terms = restrictions.map(restriction => 
      dietaryMap[restriction.toLowerCase()] || restriction
    );

    return terms.join(' ');
  }

  /**
   * Construct meal type query with OR logic for multiple selections
   */
  private constructMealTypeQuery(mealTypes: string[]): string {
    const mealTypeTerms = mealTypes.map(type => {
      switch(type.toLowerCase()) {
        case 'breakfast':
          return 'breakfast brunch morning meal desayuno';
        case 'lunch':
          return 'lunch midday light meal almuerzo';
        case 'dinner':
          return 'dinner evening main course cena';
        case 'snack':
          return 'snack appetizer finger food aperitivo';
        case 'dessert':
          return 'dessert sweet treat postre';
        case 'appetizer':
          return 'appetizer starter hors d\'oeuvres';
        case 'side-dish':
          return 'side dish accompaniment';
        case 'soup':
          return 'soup broth sopa';
        case 'salad':
          return 'salad ensalada fresh';
        case 'beverage':
          return 'beverage drink bebida';
        default:
          return type;
      }
    });

    return mealTypeTerms.join(' OR ');
  }

  /**
   * Get time constraint terms for cooking time optimization
   * Uses natural language patterns that work well with Tavily
   */
  private getTimeConstraintTerms(maxTimeMinutes: number): string {
    if (maxTimeMinutes <= 15) {
      return '15 minutes quick fast';
    } else if (maxTimeMinutes <= 30) {
      return '30 minutes quick easy';
    } else if (maxTimeMinutes <= 45) {
      return '45 minutes easy weeknight';
    } else if (maxTimeMinutes <= 60) {
      return '1 hour moderate';
    } else {
      return 'slow cooked long cooking';
    }
  }

  /**
   * Get difficulty level terms for skill-appropriate recipes
   * Uses simple, natural terms that work well with Tavily
   */
  private getDifficultyTerms(difficulty: string): string {
    const difficultyMap: Record<string, string> = {
      'easy': 'easy simple',
      'moderate': 'easy moderate',
      'advanced': 'advanced gourmet'
    };

    return difficultyMap[difficulty.toLowerCase()] || 'easy';
  }

  /**
   * Create search request from enhanced recipe search request
   */
  createSearchContext(request: EnhancedRecipeSearchRequest): TavilySearchContext {
    return {
      culturalCuisine: request.culturalCuisine,
      country: request.country,
      dietaryRestrictions: request.dietaryRestrictions,
      mealTypes: request.mealTypes,
      maxTimeMinutes: request.maxTimeMinutes,
      difficulty: request.difficulty,
      includeIngredients: request.includeIngredients,
      excludeIngredients: request.excludeIngredients
    };
  }

  /**
   * Get service health status
   */
  getHealthStatus() {
    return {
      ...this.client.getHealthStatus(),
      configStatus: this.config.getConfigStatus()
    };
  }
}