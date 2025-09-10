/**
 * Perplexity Direct Search Service
 * 
 * Alternative to two-stage approach - uses Perplexity's web search to find
 * and parse recipes in a single API call, bypassing Tavily entirely.
 */

import type { 
  EnhancedRecipe, 
  EnhancedRecipeSearchRequest, 
  EnhancedRecipeSearchResponse
} from './recipe-types';

export interface PerplexityDirectSearchOptions {
  model?: 'sonar' | 'sonar-pro';
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  includeCitations?: boolean;
  includeImages?: boolean;
  domainFilter?: string[];
}

export interface PerplexityDirectResult {
  recipes: EnhancedRecipe[];
  citations: Array<{
    url: string;
    title: string;
  }>;
  searchTime: number;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class PerplexityDirectSearchService {
  private apiKey: string;
  private baseUrl: string = 'https://api.perplexity.ai';

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Perplexity API key not found. Set PERPLEXITY_API_KEY environment variable.');
    }
  }

  /**
   * Search for recipes using Perplexity's web search + parsing in one call
   */
  async searchRecipes(
    request: EnhancedRecipeSearchRequest,
    options: PerplexityDirectSearchOptions = {}
  ): Promise<EnhancedRecipeSearchResponse & { totalFound: number; searchTime: number; source: string; errors: string[] }> {
    const {
      model = 'sonar-pro',
      maxTokens = 2500,
      temperature = 0.2,
      timeoutMs = 25000,
      includeCitations = true,
      includeImages = true,
      domainFilter = this.getDefaultDomains()
    } = options;

    const startTime = Date.now();
    
    try {
      console.log(`🔍 Perplexity direct search: "${request.query}"`);
      
      const searchPrompt = this.buildSearchPrompt(request);
      const systemPrompt = this.buildSystemPrompt(request.maxResults || 3);
      
      const requestBody = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: searchPrompt }
        ],
        max_tokens: maxTokens,
        temperature,
        return_citations: true, // Force citations
        return_images: includeImages,
        search_domain_filter: domainFilter,
        search_recency_filter: "month", // Get recent results
        return_related_questions: false // Focus on citations
      };

      console.log(`📡 Making Perplexity API call with model: ${model}`);
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(timeoutMs)
      });

      const searchTime = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const citations = data.citations || [];

      console.log(`📊 Perplexity response: ${content.length} chars, ${citations.length} citations`);

      // Parse the JSON response
      const parsedResult = this.parseRecipeResponse(content, citations);
      
      // Convert to EnhancedRecipe format
      const enhancedRecipes = this.convertToEnhancedRecipes(parsedResult.recipes, citations);

      console.log(`✅ Perplexity direct search completed: ${enhancedRecipes.length} recipes in ${searchTime}ms`);

      return {
        recipes: enhancedRecipes,
        totalFound: enhancedRecipes.length,
        searchTime,
        source: 'perplexity-direct-search',
        errors: parsedResult.errors
      };

    } catch (error) {
      const searchTime = Date.now() - startTime;
      console.error('❌ Perplexity direct search failed:', error);
      
      return {
        recipes: [],
        totalFound: 0,
        searchTime,
        source: 'perplexity-direct-search',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Build the system prompt for recipe extraction
   */
  private buildSystemPrompt(maxResults: number): string {
    return `You are a professional recipe search and extraction expert. Find ${maxResults} high-quality recipes and extract complete recipe information.

CRITICAL: Return ONLY valid JSON in this exact format:
{
  "recipes": [
    {
      "title": "Recipe Name",
      "description": "Brief description of the dish",
      "sourceUrl": "https://example.com/recipe-url",
      "ingredients": [
        {
          "name": "ingredient name",
          "amount": 1,
          "unit": "cup"
        }
      ],
      "instructions": [
        {
          "step": 1,
          "text": "Detailed instruction text"
        }
      ],
      "totalTimeMinutes": 30,
      "servings": 4,
      "cuisine": "cuisine type",
      "tags": ["tag1", "tag2"]
    }
  ]
}

Requirements:
- Find recipes from reputable cooking websites
- Extract complete ingredients with amounts and units
- Provide detailed step-by-step instructions
- Include accurate timing and serving information
- Ensure all URLs are valid and accessible
- Return ONLY the JSON, no additional text`;
  }

  /**
   * Build the search prompt based on user request
   */
  private buildSearchPrompt(request: EnhancedRecipeSearchRequest): string {
    const parts: string[] = [];
    
    // Base query
    parts.push(`Find ${request.maxResults || 3} high-quality recipes for: ${request.query}`);
    
    // Add cultural cuisine filter
    if (request.culturalCuisine) {
      parts.push(`Focus on ${request.culturalCuisine} cuisine.`);
    }
    
    // Add dietary restrictions
    if (request.dietaryRestrictions?.length) {
      parts.push(`Must be ${request.dietaryRestrictions.join(' and ')}.`);
    }
    
    // Add time constraints
    if (request.maxTimeMinutes) {
      parts.push(`Cooking time should be under ${request.maxTimeMinutes} minutes.`);
    }
    
    // Add difficulty level
    if (request.difficulty) {
      parts.push(`Difficulty level: ${request.difficulty}.`);
    }
    
    // Add ingredient preferences
    if (request.includeIngredients?.length) {
      parts.push(`Must include: ${request.includeIngredients.join(', ')}.`);
    }
    
    if (request.excludeIngredients?.length) {
      parts.push(`Must NOT include: ${request.excludeIngredients.join(', ')}.`);
    }
    
    parts.push('Include complete ingredients with measurements and detailed step-by-step instructions.');
    parts.push('Provide the source URL for each recipe.');
    
    return parts.join(' ');
  }

  /**
   * Parse the JSON response from Perplexity
   */
  private parseRecipeResponse(content: string, citations: any[]): { recipes: any[]; errors: string[] } {
    const errors: string[] = [];
    
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        errors.push('No JSON found in response');
        return { recipes: [], errors };
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.recipes || !Array.isArray(parsed.recipes)) {
        errors.push('Invalid recipe format in response');
        return { recipes: [], errors };
      }
      
      return { recipes: parsed.recipes, errors };
      
    } catch (parseError) {
      errors.push(`JSON parse error: ${parseError instanceof Error ? parseError.message : 'Unknown'}`);
      return { recipes: [], errors };
    }
  }

  /**
   * Convert parsed recipes to EnhancedRecipe format
   */
  private convertToEnhancedRecipes(recipes: any[], citations: any[]): EnhancedRecipe[] {
    return recipes.map((recipe, index) => {
      // Find matching citation for this recipe
      const citation = citations.find(c => 
        recipe.sourceUrl && c.url === recipe.sourceUrl
      ) || citations[index];

      return {
        title: recipe.title || 'Untitled Recipe',
        description: recipe.description || '',
        culturalOrigin: recipe.cuisine ? [recipe.cuisine] : ['international'],
        cuisine: recipe.cuisine || 'international',
        sourceUrl: recipe.sourceUrl || citation?.url || '',
        imageUrl: recipe.imageUrl,
        totalTimeMinutes: recipe.totalTimeMinutes || 0,
        servings: recipe.servings || 4,
        yieldText: `${recipe.servings || 4} servings`,
        ingredients: (recipe.ingredients || []).map((ing: any, idx: number) => ({
          name: ing.name || ing.text || `Ingredient ${idx + 1}`,
          amount: ing.amount || 1,
          unit: ing.unit || 'piece'
        })),
        instructions: (recipe.instructions || []).map((inst: any, idx: number) => ({
          step: inst.step || idx + 1,
          text: inst.text || inst.instruction || `Step ${idx + 1}`
        })),
        nutritionalInfo: recipe.nutrition,
        tags: recipe.tags || [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });
  }

  /**
   * Get default trusted recipe domains
   */
  private getDefaultDomains(): string[] {
    return [
      'allrecipes.com',
      'foodnetwork.com',
      'simplyrecipes.com',
      'bonappetit.com',
      'epicurious.com',
      'food.com',
      'delish.com',
      'tasteofhome.com',
      'seriouseats.com',
      'cookinglight.com',
      'foodandwine.com',
      'marthastewart.com'
    ];
  }

  /**
   * Get service health status
   */
  getHealthStatus() {
    return {
      hasApiKey: !!this.apiKey,
      baseUrl: this.baseUrl,
      service: 'perplexity-direct-search'
    };
  }
}