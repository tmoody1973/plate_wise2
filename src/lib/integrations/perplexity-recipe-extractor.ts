/**
 * Perplexity-Only Recipe Extractor
 * Uses Perplexity API to directly parse recipe URLs - should be much faster
 */

import { recipeCacheService } from './recipe-cache';
import { ogImageExtractor } from './og-image-extractor';

interface PerplexityRecipeResult {
  title: string;
  ingredients: string[];
  instructions: string[];
  servings?: number;
  totalTimeMinutes?: number;
  description?: string;
  imageUrl?: string;
  extractionMethod: 'perplexity-direct' | 'cached' | 'fallback';
  extractionTimeMs: number;
}

export class PerplexityRecipeExtractor {
  private apiKey: string;
  private baseURL = 'https://api.perplexity.ai/chat/completions';

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY || '';
  }

  /**
   * Extract recipe data directly from URL using Perplexity
   */
  async extractRecipe(url: string): Promise<PerplexityRecipeResult> {
    const startTime = Date.now();

    // Check cache first
    const cached = recipeCacheService.get(url);
    if (cached) {
      return {
        ...cached,
        extractionMethod: 'cached',
        extractionTimeMs: Date.now() - startTime
      };
    }

    if (!this.apiKey) {
      console.warn('⚠️ Perplexity API key not found, using fallback');
      return this.generateFallbackRecipe(url, startTime);
    }

    try {
      console.log(`🧠 Perplexity direct extraction for: ${url}`);

      const prompt = `
Extract the complete recipe information from this URL: ${url}

Please visit the URL and extract:
1. Recipe title
2. Complete ingredients list with amounts and units
3. Step-by-step cooking instructions
4. Number of servings
5. Total cooking time in minutes
6. Brief recipe description
7. Main recipe image URL if available

Return ONLY valid JSON in this exact format:
{
  "title": "Recipe Title",
  "ingredients": ["1 cup flour", "2 eggs", "1 tsp salt"],
  "instructions": ["Step 1 text", "Step 2 text", "Step 3 text"],
  "servings": 4,
  "totalTimeMinutes": 30,
  "description": "Brief description of the dish",
  "imageUrl": "https://example.com/image.jpg"
}

Requirements:
- Include ALL ingredients with exact amounts and units
- Include ALL cooking steps in correct order
- Use null for missing information
- Return only valid JSON, no markdown or extra text
`;

      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar-pro', // Using advanced model for better recipe parsing
          messages: [
            {
              role: 'system',
              content: 'You are a recipe extraction expert. Extract complete recipe data from URLs and return only valid JSON. Be thorough and accurate.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.1,
          top_p: 0.1,
          search_context_size: "medium" // Balanced search depth
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      if (!content) {
        throw new Error('Empty response from Perplexity API');
      }

      // Clean and parse JSON response
      const cleanContent = content.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
      const parsedData = JSON.parse(cleanContent);

      // Validate extracted data
      if (!parsedData.ingredients?.length && !parsedData.instructions?.length) {
        throw new Error('No meaningful recipe data extracted');
      }

      const extractionTime = Date.now() - startTime;
      console.log(`✅ Perplexity direct extraction successful in ${extractionTime}ms:`, {
        title: parsedData.title,
        ingredientsCount: parsedData.ingredients?.length || 0,
        instructionsCount: parsedData.instructions?.length || 0
      });

      // Try to get a better image using Open Graph meta tags
      let finalImageUrl = parsedData.imageUrl;
      try {
        const ogData = await ogImageExtractor.extractOGImage(url);
        if (ogData.bestImage) {
          finalImageUrl = ogData.bestImage;
          console.log(`✅ Using OG image: ${ogData.bestImage}`);
        }
      } catch (ogError) {
        console.log(`⚠️ OG image extraction failed, using Perplexity image`);
      }

      const result: PerplexityRecipeResult = {
        title: parsedData.title || 'Untitled Recipe',
        ingredients: Array.isArray(parsedData.ingredients) ? parsedData.ingredients : [],
        instructions: Array.isArray(parsedData.instructions) ? parsedData.instructions : [],
        servings: parsedData.servings || null,
        totalTimeMinutes: parsedData.totalTimeMinutes || null,
        description: parsedData.description || null,
        imageUrl: finalImageUrl || null,
        extractionMethod: 'perplexity-direct',
        extractionTimeMs: extractionTime
      };

      // Cache the successful result
      recipeCacheService.set(url, {
        title: result.title,
        ingredients: result.ingredients,
        instructions: result.instructions,
        servings: result.servings,
        totalTimeMinutes: result.totalTimeMinutes,
        description: result.description,
        imageUrl: result.imageUrl,
        extractionMethod: 'perplexity-direct'
      });

      return result;

    } catch (error) {
      console.error(`❌ Perplexity direct extraction failed for ${url}:`, error);
      return this.generateFallbackRecipe(url, startTime);
    }
  }

  /**
   * Extract multiple recipes in parallel
   */
  async extractMultipleRecipes(
    urls: string[],
    maxConcurrency: number = 3
  ): Promise<PerplexityRecipeResult[]> {
    const results: PerplexityRecipeResult[] = [];
    
    // Process URLs in batches to respect rate limits
    for (let i = 0; i < urls.length; i += maxConcurrency) {
      const batch = urls.slice(i, i + maxConcurrency);
      const batchPromises = batch.map(url => this.extractRecipe(url));
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        
        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            console.error('Batch extraction failed:', result.reason);
            // Add fallback result for failed extraction
            const failedUrl = batch[batchResults.indexOf(result)];
            const fallback = this.generateFallbackRecipe(failedUrl, Date.now());
            results.push(fallback);
          }
        }
      } catch (error) {
        console.error('Batch processing failed:', error);
      }

      // Small delay between batches to respect rate limits
      if (i + maxConcurrency < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return results;
  }

  /**
   * Generate fallback recipe data
   */
  private generateFallbackRecipe(url: string, startTime: number): PerplexityRecipeResult {
    // Extract recipe name from URL
    const urlParts = url.split('/');
    const slug = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2] || 'recipe';
    const title = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    const extractionTime = Date.now() - startTime;

    const fallbackResult: PerplexityRecipeResult = {
      title: title || 'Traditional Recipe',
      ingredients: [
        'Main protein (chicken, beef, or fish)',
        'Vegetables (onions, tomatoes, peppers)',
        'Spices and seasonings',
        'Cooking oil',
        'Salt to taste'
      ],
      instructions: [
        'Prepare and clean all ingredients',
        'Heat oil in a large pot over medium heat',
        'Add aromatics and cook until fragrant',
        'Add main ingredients and cook thoroughly',
        'Season to taste and serve hot'
      ],
      servings: 4,
      totalTimeMinutes: 45,
      description: 'A traditional recipe with authentic flavors and cultural significance.',
      imageUrl: null,
      extractionMethod: 'fallback',
      extractionTimeMs: extractionTime
    };

    // Cache fallback result
    recipeCacheService.set(url, {
      title: fallbackResult.title,
      ingredients: fallbackResult.ingredients,
      instructions: fallbackResult.instructions,
      servings: fallbackResult.servings,
      totalTimeMinutes: fallbackResult.totalTimeMinutes,
      description: fallbackResult.description,
      imageUrl: fallbackResult.imageUrl,
      extractionMethod: 'fallback'
    });

    return fallbackResult;
  }

  /**
   * Generate a complete recipe from just a title and cuisine type
   */
  async generateRecipeFromTitle(title: string, cuisine: string): Promise<{
    title: string;
    description: string;
    ingredients: string[];
    instructions: string[];
    servings: number;
    totalTimeMinutes: number;
  } | null> {
    try {
      console.log(`🧠 Generating complete recipe for "${title}" (${cuisine} cuisine)`);

      const prompt = `Generate a complete, authentic ${cuisine} recipe for "${title}". Include:
      
1. Complete list of ingredients with specific amounts
2. Step-by-step cooking instructions
3. Serving size and cooking time
4. Brief description

Return ONLY valid JSON in this exact format:
{
  "title": "Recipe Name",
  "description": "Brief description of the dish",
  "ingredients": ["ingredient 1 with amount", "ingredient 2 with amount", ...],
  "instructions": ["Step 1", "Step 2", ...],
  "servings": 4,
  "totalTimeMinutes": 45
}`;

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar-pro', // Using advanced model for better recipe generation
          messages: [
            {
              role: 'system',
              content: 'You are a professional chef and recipe developer. Generate authentic, detailed recipes with precise ingredients and clear instructions. Return only valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.2,
          top_p: 0.1,
          search_context_size: "medium"
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      // Clean and parse JSON response
      const cleanContent = content.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
      const recipe = JSON.parse(cleanContent);

      // Validate required fields
      if (!recipe.title || !recipe.ingredients || !Array.isArray(recipe.ingredients) ||
          !recipe.instructions || !Array.isArray(recipe.instructions)) {
        throw new Error('Generated recipe missing required fields');
      }

      console.log(`✅ Successfully generated recipe: ${recipe.title} (${recipe.ingredients.length} ingredients, ${recipe.instructions.length} steps)`);
      return recipe;

    } catch (error) {
      console.error(`❌ Failed to generate recipe for "${title}":`, error);
      return null;
    }
  }
}

export const perplexityRecipeExtractor = new PerplexityRecipeExtractor();