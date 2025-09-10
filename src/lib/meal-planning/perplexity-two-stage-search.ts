/**
 * Perplexity Two-Stage Recipe Search Service
 * Stage 1: Use Perplexity to find recipe URLs
 * Stage 2: Use Perplexity to parse each URL into structured recipe data
 */

import { EnhancedRecipe } from '@/types';

export interface TwoStageRecipeSearchRequest {
  query: string;
  culturalCuisine?: string;
  dietaryRestrictions?: string[];
  maxResults?: number;
}

export interface TwoStageRecipeSearchResponse {
  recipes: EnhancedRecipe[];
}

class PerplexityTwoStageSearchService {
  private apiKey: string;
  private baseURL = 'https://api.perplexity.ai/chat/completions';

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY || '';
  }

  /**
   * Main two-stage search method
   */
  async searchRecipes(request: TwoStageRecipeSearchRequest): Promise<TwoStageRecipeSearchResponse> {
    if (!this.apiKey) {
      throw new Error('Perplexity API key not configured');
    }

    console.log('🔍 Starting two-stage Perplexity recipe search...');

    try {
      // Stage 1: Find recipe URLs
      const urls = await this.stage1FindRecipeUrls(request);
      console.log(`📝 Stage 1 complete: Found ${urls.length} URLs`);

      if (urls.length === 0) {
        throw new Error('No recipe URLs found in Stage 1');
      }

      // Stage 2: Parse each URL into structured recipe data
      const recipes = await this.stage2ParseRecipeUrls(urls, request);
      console.log(`📝 Stage 2 complete: Parsed ${recipes.length} recipes`);

      return { recipes };

    } catch (error) {
      console.error('❌ Two-stage recipe search failed:', error);
      throw new Error(`Two-stage recipe search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stage 1: Use Perplexity to find individual recipe URLs
   */
  private async stage1FindRecipeUrls(request: TwoStageRecipeSearchRequest): Promise<string[]> {
    const maxResults = Math.min(request.maxResults || 3, 5); // Limit to 5 for better quality
    const cuisineText = request.culturalCuisine || 'international';
    const dietaryText = request.dietaryRestrictions?.join(' and ') || '';

    const prompt = `Find exactly ${maxResults} individual recipe page URLs for ${cuisineText} recipes${dietaryText ? ` that are ${dietaryText}` : ''}.

CRITICAL REQUIREMENTS:
- Return ONLY individual recipe page URLs (not collection pages, category pages, or search results)
- Each URL must go directly to a single recipe with complete cooking instructions
- Use established recipe websites: AllRecipes, Food Network, Serious Eats, Bon Appétit, Simply Recipes, Epicurious
- Avoid YouTube, TikTok, Pinterest, or video content
- Avoid collection pages with URLs containing: /collection/, /category/, /recipes/, /menu/, /roundup/

GOOD URL examples:
- https://www.allrecipes.com/recipe/123456/chicken-enchiladas/
- https://www.foodnetwork.com/recipes/individual-recipe-name
- https://www.seriouseats.com/specific-recipe-title

BAD URL examples to AVOID:
- https://www.delish.com/mexican-party-menu-recipes/
- https://www.foodnetwork.com/recipes/photos/mexican-recipes
- Any URL with "collection", "category", "menu", or "recipes" (plural)

Return only the URLs, one per line, no additional text.`;

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
            content: 'You are a recipe URL finder. Return only individual recipe page URLs, one per line. No additional text or formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.1,
        search_mode: 'web',
        disable_search: false,
        search_domain_filter: [
          'allrecipes.com',
          'foodnetwork.com',
          'bonappetit.com',
          'seriouseats.com',
          'simplyrecipes.com',
          'epicurious.com'
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Stage 1 API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Extract URLs from response
    const urls = this.extractUrlsFromContent(content);
    console.log('📝 Stage 1 URLs found:', urls);

    return urls;
  }

  /**
   * Stage 2: Use Perplexity to parse each URL into structured recipe data
   */
  private async stage2ParseRecipeUrls(urls: string[], request: TwoStageRecipeSearchRequest): Promise<any[]> {
    const recipes: any[] = [];

    // Process URLs in parallel (but limit concurrency)
    const concurrencyLimit = 3;
    for (let i = 0; i < urls.length; i += concurrencyLimit) {
      const batch = urls.slice(i, i + concurrencyLimit);
      const batchPromises = batch.map(url => this.parseRecipeFromUrl(url, request));
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          recipes.push(result.value);
        } else {
          console.log(`⚠️ Failed to parse URL: ${batch[index]} - ${result.status === 'rejected' ? result.reason : 'No data'}`);
        }
      });
    }

    return recipes;
  }

  /**
   * Parse a single recipe URL using Perplexity
   */
  private async parseRecipeFromUrl(url: string, request: TwoStageRecipeSearchRequest): Promise<any | null> {
    const prompt = `Extract recipe information from this URL: ${url}

Return a JSON object with this exact structure:
{
  "title": "Recipe name",
  "description": "Brief cultural/culinary description",
  "ingredients": ["ingredient 1", "ingredient 2", "..."],
  "instructions": ["step 1", "step 2", "..."],
  "cookTime": "cooking time in minutes (number)",
  "servings": "number of servings (number)",
  "imageUrl": "main recipe image URL if available"
}

Requirements:
- Extract the actual recipe title, ingredients, and step-by-step instructions from the webpage
- Include cultural context in the description
- Format ingredients with measurements (e.g., "2 cups flour", "1 tsp salt")
- Format instructions as clear, actionable steps
- Return only valid JSON, no additional text`;

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
              role: 'system',
              content: 'You are a recipe parser. Extract recipe data from web pages and return only valid JSON with no additional text.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.1,
          search_mode: 'web',
          disable_search: false
        })
      });

      if (!response.ok) {
        console.log(`⚠️ Stage 2 API error for ${url}: ${response.status}`);
        return null;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      // Try to parse JSON from response
      const jsonData = this.extractJsonFromContent(content);
      if (!jsonData) {
        console.log(`⚠️ No valid JSON found for ${url}`);
        return null;
      }

      // Convert to our internal format
      return {
        title: jsonData.title || 'Unknown Recipe',
        description: jsonData.description || 'A delicious recipe',
        cuisine: request.culturalCuisine || 'international',
        culturalOrigin: [request.culturalCuisine || 'international'],
        sourceUrl: url,
        imageUrl: jsonData.imageUrl || null,
        totalTimeMinutes: jsonData.cookTime || 30,
        servings: jsonData.servings || 4,
        yieldText: `Serves ${jsonData.servings || 4}`,
        ingredients: Array.isArray(jsonData.ingredients) 
          ? jsonData.ingredients.map((ing: string) => ({ name: ing, amount: 1, unit: 'item' }))
          : [],
        instructions: Array.isArray(jsonData.instructions)
          ? jsonData.instructions.map((inst: string, i: number) => ({ step: i + 1, text: inst }))
          : [],
        nutritionalInfo: { calories: 300, protein_g: 10, fat_g: 5, carbs_g: 40 },
        tags: this.generateTags(jsonData.title || '', request.culturalCuisine)
      };

    } catch (error) {
      console.log(`⚠️ Error parsing ${url}:`, error);
      return null;
    }
  }

  /**
   * Extract URLs from content text
   */
  private extractUrlsFromContent(content: string): string[] {
    const urlRegex = /https?:\/\/[^\s\n\r]+/g;
    const urls = content.match(urlRegex) || [];
    
    // Filter out bad URLs
    return urls.filter(url => {
      const lowerUrl = url.toLowerCase();
      
      // Remove collection/category pages
      const badPatterns = [
        '/collection/', '/category/', '/tag/', '/search/', '/results/',
        '/recipes/', '/menu/', '/roundup/', 'youtube.com', 'tiktok.com'
      ];
      
      return !badPatterns.some(pattern => lowerUrl.includes(pattern));
    }).slice(0, 5); // Limit to 5 URLs max
  }

  /**
   * Extract JSON from content text
   */
  private extractJsonFromContent(content: string): any | null {
    try {
      // Look for JSON object in the content
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.log('JSON parse error:', error);
      return null;
    }
  }

  /**
   * Generate tags for recipe
   */
  private generateTags(title: string, cuisine?: string): string[] {
    const tags = ['dinner'];
    if (cuisine) tags.push(cuisine.toLowerCase());
    if (title.toLowerCase().includes('easy') || title.toLowerCase().includes('simple')) {
      tags.push('easy');
    }
    if (title.toLowerCase().includes('vegan')) tags.push('vegan');
    if (title.toLowerCase().includes('vegetarian')) tags.push('vegetarian');
    return tags;
  }
}

// Export singleton instance
export const perplexityTwoStageSearchService = new PerplexityTwoStageSearchService();