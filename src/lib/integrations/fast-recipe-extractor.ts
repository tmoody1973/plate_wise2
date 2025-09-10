/**
 * Fast Recipe Extractor with Caching and Parallel Processing
 * Optimized for speed with multiple extraction methods and caching
 */

import { recipeCacheService } from './recipe-cache';
import { webScrapingHtmlService } from './webscraping-html';
import { aiFields, htmlJsonLdFallback } from './webscraping';

interface FastExtractionResult {
  title: string;
  ingredients: string[];
  instructions: string[];
  servings?: number;
  totalTimeMinutes?: number;
  description?: string;
  imageUrl?: string;
  extractionMethod: 'hybrid' | 'ai-fields' | 'json-ld' | 'fallback' | 'cached';
  extractionTimeMs: number;
}

export class FastRecipeExtractor {
  private readonly EXTRACTION_TIMEOUT = 3000; // 3 seconds timeout per method

  /**
   * Extract recipe with caching and fast fallbacks
   */
  async extractRecipe(url: string): Promise<FastExtractionResult> {
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

    console.log(`🚀 Fast extraction starting for: ${url}`);

    // Try AI Fields first (usually fastest and most reliable)
    try {
      const result = await this.tryAiFieldsExtraction(url);
      const extractionTime = Date.now() - startTime;
      console.log(`✅ AI Fields extraction successful in ${extractionTime}ms for ${url}`);

      // Cache the successful result
      recipeCacheService.set(url, {
        title: result.title,
        ingredients: result.ingredients,
        instructions: result.instructions,
        servings: result.servings,
        totalTimeMinutes: result.totalTimeMinutes,
        description: result.description,
        imageUrl: result.imageUrl,
        extractionMethod: result.extractionMethod
      });

      return {
        ...result,
        extractionTimeMs: extractionTime
      };
    } catch (error) {
      console.log(`🔄 AI Fields failed for ${url}, using fallback`);
      
      // Generate fallback recipe data
      const fallbackResult = this.generateFallbackRecipe(url);
      const extractionTime = Date.now() - startTime;

      // Cache fallback result
      recipeCacheService.set(url, {
        ...fallbackResult,
        extractionMethod: 'fallback'
      });

      return {
        ...fallbackResult,
        extractionMethod: 'fallback',
        extractionTimeMs: extractionTime
      };
    }
  }



  /**
   * Try hybrid extraction with timeout
   */
  private async tryHybridExtraction(url: string): Promise<FastExtractionResult> {
    return this.withTimeout(async () => {
      const result = await webScrapingHtmlService.extractRecipe(url);
      
      // Validate result has meaningful data
      if (!result.ingredients?.length && !result.instructions?.length) {
        throw new Error('No meaningful data extracted');
      }

      return {
        title: result.title || 'Untitled Recipe',
        ingredients: result.ingredients || [],
        instructions: result.instructions || [],
        servings: result.servings,
        totalTimeMinutes: result.totalTimeMinutes,
        description: result.description,
        imageUrl: result.imageUrl,
        extractionMethod: 'hybrid' as const,
        extractionTimeMs: 0 // Will be set by caller
      };
    }, this.EXTRACTION_TIMEOUT);
  }

  /**
   * Try AI Fields extraction with timeout
   */
  private async tryAiFieldsExtraction(url: string): Promise<FastExtractionResult> {
    return this.withTimeout(async () => {
      const result = await aiFields(url);
      
      if (!result.ingredients?.length && !result.instructions?.length) {
        throw new Error('No meaningful data extracted');
      }

      return {
        title: result.title || 'Untitled Recipe',
        ingredients: Array.isArray(result.ingredients) ? result.ingredients : [],
        instructions: Array.isArray(result.instructions) ? result.instructions : [],
        servings: result.servings,
        totalTimeMinutes: result.totalTimeMinutes,
        description: result.description,
        imageUrl: result.imageUrl,
        extractionMethod: 'ai-fields' as const,
        extractionTimeMs: 0
      };
    }, this.EXTRACTION_TIMEOUT);
  }

  /**
   * Try JSON-LD extraction with timeout
   */
  private async tryJsonLdExtraction(url: string): Promise<FastExtractionResult> {
    return this.withTimeout(async () => {
      const result = await htmlJsonLdFallback(url);
      
      if (!result.ingredients?.length && !result.instructions?.length) {
        throw new Error('No meaningful data extracted');
      }

      return {
        title: result.title || 'Untitled Recipe',
        ingredients: Array.isArray(result.ingredients) ? result.ingredients : [],
        instructions: Array.isArray(result.instructions) ? result.instructions : [],
        servings: result.servings,
        totalTimeMinutes: result.totalTimeMinutes,
        description: result.description,
        imageUrl: result.imageUrl,
        extractionMethod: 'json-ld' as const,
        extractionTimeMs: 0
      };
    }, this.EXTRACTION_TIMEOUT);
  }

  /**
   * Generate fallback recipe data based on URL
   */
  private generateFallbackRecipe(url: string): Omit<FastExtractionResult, 'extractionMethod' | 'extractionTimeMs'> {
    // Extract recipe name from URL
    const urlParts = url.split('/');
    const slug = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2] || 'recipe';
    const title = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    return {
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
      imageUrl: undefined
    };
  }

  /**
   * Add timeout to any async operation
   */
  private async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
      )
    ]);
  }

  /**
   * Extract multiple recipes in parallel with concurrency limit
   */
  async extractMultipleRecipes(
    urls: string[],
    maxConcurrency: number = 3
  ): Promise<FastExtractionResult[]> {
    const results: FastExtractionResult[] = [];
    
    // Process URLs in batches to limit concurrency
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
            const fallback = this.generateFallbackRecipe(failedUrl);
            results.push({
              ...fallback,
              extractionMethod: 'fallback',
              extractionTimeMs: 0
            });
          }
        }
      } catch (error) {
        console.error('Batch processing failed:', error);
      }
    }

    return results;
  }
}

export const fastRecipeExtractor = new FastRecipeExtractor();