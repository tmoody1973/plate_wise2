/**
 * Optimized Two-Stage Recipe Search
 * 
 * Fixed version with aggressive timeout handling and fallbacks
 * Stage 1: Tavily (works perfectly) - 5s timeout
 * Stage 2: Perplexity (simplified prompts) - 10s timeout per recipe
 */

import { TavilyService } from '../integrations/tavily-service';
import type { EnhancedRecipe, EnhancedRecipeSearchRequest } from '../integrations/recipe-types';

interface OptimizedSearchOptions {
  maxConcurrent?: number;
  tavilyTimeoutMs?: number;
  perplexityTimeoutMs?: number;
  maxRetries?: number;
}

interface SearchResult {
  recipes: EnhancedRecipe[];
  totalFound: number;
  searchTime: number;
  source: string;
  errors: string[];
  stage1Time: number;
  stage2Time: number;
}

export class OptimizedTwoStageSearch {
  private tavilyService: TavilyService;

  constructor() {
    this.tavilyService = new TavilyService();
  }

  /**
   * Main optimized two-stage search with aggressive timeouts
   */
  async searchRecipes(
    request: EnhancedRecipeSearchRequest,
    options: OptimizedSearchOptions = {}
  ): Promise<SearchResult> {
    const {
      maxConcurrent = 2, // Reduced for better reliability
      tavilyTimeoutMs = 5000, // 5 seconds for Tavily
      perplexityTimeoutMs = 10000, // 10 seconds per recipe
      maxRetries = 1 // Reduced retries
    } = options;

    const startTime = Date.now();
    const errors: string[] = [];
    let stage1Time = 0;
    let stage2Time = 0;

    try {
      // Stage 1: Tavily URL Discovery (we know this works)
      console.log('🔍 Stage 1: Tavily URL discovery...');
      const stage1Start = Date.now();
      
      const urls = await this.withTimeout(
        this.discoverUrls(request),
        tavilyTimeoutMs,
        'Tavily URL discovery timeout'
      );
      
      stage1Time = Date.now() - stage1Start;
      console.log(`✅ Stage 1 completed in ${stage1Time}ms. Found ${urls.length} URLs`);

      if (urls.length === 0) {
        return {
          recipes: [],
          totalFound: 0,
          searchTime: Date.now() - startTime,
          source: 'optimized-two-stage',
          errors: ['No URLs found'],
          stage1Time,
          stage2Time: 0
        };
      }

      // Stage 2: Simplified Perplexity parsing
      console.log(`🤖 Stage 2: Parsing ${Math.min(urls.length, request.maxResults || 3)} recipes...`);
      const stage2Start = Date.now();
      
      const targetUrls = urls.slice(0, request.maxResults || 3);
      const recipes = await this.parseRecipesOptimized(
        targetUrls,
        request,
        maxConcurrent,
        perplexityTimeoutMs,
        maxRetries
      );
      
      stage2Time = Date.now() - stage2Start;
      console.log(`✅ Stage 2 completed in ${stage2Time}ms. Parsed ${recipes.length} recipes`);

      return {
        recipes,
        totalFound: recipes.length,
        searchTime: Date.now() - startTime,
        source: 'optimized-two-stage',
        errors,
        stage1Time,
        stage2Time
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Optimized search failed:', errorMsg);
      errors.push(errorMsg);

      return {
        recipes: [],
        totalFound: 0,
        searchTime: Date.now() - startTime,
        source: 'optimized-two-stage',
        errors,
        stage1Time,
        stage2Time
      };
    }
  }

  /**
   * Stage 1: Use Tavily to find URLs (we know this works)
   */
  private async discoverUrls(request: EnhancedRecipeSearchRequest): Promise<string[]> {
    const searchQuery = this.buildTavilyQuery(request);
    console.log(`Tavily query: "${searchQuery}"`);
    
    return await this.tavilyService.findRecipeUrls(searchQuery, {
      maxResults: (request.maxResults || 3) * 2, // Get extra URLs
      searchDepth: 'basic',
      includeImages: true,
      mealTypes: request.mealTypes
    });
  }

  /**
   * Build optimized Tavily query
   */
  private buildTavilyQuery(request: EnhancedRecipeSearchRequest): string {
    const parts: string[] = [];
    
    if (request.query) parts.push(request.query);
    if (request.culturalCuisine) parts.push(`${request.culturalCuisine} cuisine`);
    if (request.dietaryRestrictions?.length) {
      parts.push(...request.dietaryRestrictions.slice(0, 2)); // Limit to 2 restrictions
    }
    
    // Add time constraint hint
    if (request.maxTimeMinutes && request.maxTimeMinutes <= 30) {
      parts.push('quick easy');
    }
    
    parts.push('recipe');
    return parts.join(' ');
  }

  /**
   * Stage 2: Parse recipes with optimized Perplexity calls
   */
  private async parseRecipesOptimized(
    urls: string[],
    request: EnhancedRecipeSearchRequest,
    maxConcurrent: number,
    timeoutMs: number,
    maxRetries: number
  ): Promise<EnhancedRecipe[]> {
    const recipes: EnhancedRecipe[] = [];
    
    // Process URLs in small batches to avoid overwhelming the API
    for (let i = 0; i < urls.length; i += maxConcurrent) {
      const batch = urls.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(url => 
        this.parseRecipeSimplified(url, request, timeoutMs, maxRetries)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value) {
          recipes.push(result.value);
        } else if (result.status === 'rejected') {
          console.warn('Recipe parsing failed:', result.reason);
        }
      }
    }
    
    return recipes;
  }

  /**
   * Parse single recipe with simplified Perplexity prompt and aggressive timeout
   */
  private async parseRecipeSimplified(
    url: string,
    request: EnhancedRecipeSearchRequest,
    timeoutMs: number,
    maxRetries: number
  ): Promise<EnhancedRecipe | null> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Parsing ${url} (attempt ${attempt + 1})`);
        
        const recipe = await this.withTimeout(
          this.callPerplexitySimplified(url, request),
          timeoutMs,
          `Perplexity parsing timeout for ${url}`
        );
        
        if (recipe) {
          console.log(`✅ Successfully parsed: ${recipe.title}`);
          return recipe;
        }
        
      } catch (error) {
        console.warn(`Attempt ${attempt + 1} failed for ${url}:`, error.message);
        
        if (attempt < maxRetries) {
          // Short delay before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    return null;
  }

  /**
   * Simplified Perplexity API call with minimal prompt
   */
  private async callPerplexitySimplified(
    url: string,
    request: EnhancedRecipeSearchRequest
  ): Promise<EnhancedRecipe | null> {
    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
      throw new Error('Perplexity API key not found');
    }

    // Simplified prompt - just get the basics
    const prompt = `Extract recipe from ${url}. Return JSON with:
{
  "title": "recipe name",
  "description": "brief description",
  "ingredients": ["ingredient 1", "ingredient 2"],
  "instructions": ["step 1", "step 2"],
  "servings": 4,
  "totalTimeMinutes": 30,
  "cuisine": "${request.culturalCuisine || 'international'}"
}`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar', // Use faster, cheaper model
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000, // Reduced tokens
        temperature: 0.1, // Lower temperature for consistency
        search_mode: 'web',
        search_domain_filter: [
          'allrecipes.com',
          'foodnetwork.com',
          'seriouseats.com'
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in Perplexity response');
    }

    return this.parseSimplifiedResponse(content, url);
  }

  /**
   * Parse simplified Perplexity response
   */
  private parseSimplifiedResponse(content: string, sourceUrl: string): EnhancedRecipe | null {
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('No JSON found in response');
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!parsed.title || !parsed.ingredients || !parsed.instructions) {
        console.warn('Missing required fields in parsed recipe');
        return null;
      }

      // Convert to EnhancedRecipe format
      const recipe: EnhancedRecipe = {
        title: parsed.title,
        description: parsed.description || '',
        culturalOrigin: [parsed.cuisine || 'international'],
        cuisine: parsed.cuisine || 'international',
        sourceUrl,
        imageUrl: '', // Will be populated later if needed
        totalTimeMinutes: parsed.totalTimeMinutes || 30,
        servings: parsed.servings || 4,
        yieldText: `Serves ${parsed.servings || 4}`,
        ingredients: this.parseIngredients(parsed.ingredients),
        instructions: this.parseInstructions(parsed.instructions),
        nutritionalInfo: undefined,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return recipe;

    } catch (error) {
      console.error('Failed to parse simplified response:', error);
      return null;
    }
  }

  /**
   * Parse ingredients from simple array
   */
  private parseIngredients(ingredients: any[]): Array<{name: string; amount: number; unit: string}> {
    if (!Array.isArray(ingredients)) return [];
    
    return ingredients.map((ing, index) => {
      if (typeof ing === 'string') {
        return {
          name: ing,
          amount: 1,
          unit: 'piece'
        };
      }
      
      return {
        name: ing.name || `Ingredient ${index + 1}`,
        amount: ing.amount || 1,
        unit: ing.unit || 'piece'
      };
    });
  }

  /**
   * Parse instructions from simple array
   */
  private parseInstructions(instructions: any[]): Array<{step: number; text: string}> {
    if (!Array.isArray(instructions)) return [];
    
    return instructions.map((inst, index) => ({
      step: index + 1,
      text: typeof inst === 'string' ? inst : (inst.text || `Step ${index + 1}`)
    }));
  }

  /**
   * Utility: Add timeout to any promise
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }
}