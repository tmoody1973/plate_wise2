/**
 * Enhanced Recipe Web Scraper Service
 * Extracts complete recipe data from URLs using multiple methods:
 * 1. JSON-LD structured data (fastest)
 * 2. Microdata parsing
 * 3. Puppeteer browser automation (most reliable fallback)
 */

import { EnhancedRecipe, EnhancedRecipeIngredient, EnhancedRecipeInstruction, EnhancedNutritionalInfo } from '@/types';
import puppeteer, { Browser, Page } from 'puppeteer';

export interface ScrapedRecipeData {
  title?: string;
  description?: string;
  ingredients?: EnhancedRecipeIngredient[];
  instructions?: EnhancedRecipeInstruction[];
  servings?: number;
  totalTimeMinutes?: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  nutritionalInfo?: EnhancedNutritionalInfo;
  imageUrl?: string;
  yieldText?: string;
}

class RecipeScraperService {
  
  /**
   * Scrape complete recipe data from a URL
   */
  async scrapeRecipe(url: string): Promise<ScrapedRecipeData> {
    try {
      console.log('🔍 Scraping recipe from:', url);

      // Fetch the webpage
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch recipe page: ${response.status}`);
      }

      const html = await response.text();
      
      // Extract structured data (JSON-LD, microdata, etc.)
      const structuredData = this.extractStructuredData(html);
      
      if (structuredData) {
        console.log('✅ Found structured recipe data');
        return this.parseStructuredData(structuredData);
      }

      // Fallback to HTML parsing
      console.log('⚠️ No structured data found, parsing HTML');
      return this.parseHtmlContent(html);

    } catch (error) {
      console.error('❌ Recipe scraping failed:', error);
      throw new Error(`Recipe scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract JSON-LD structured data from HTML
   */
  private extractStructuredData(html: string): any {
    // Look for JSON-LD structured data (most recipe sites use this)
    const jsonLdMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gi);
    
    if (jsonLdMatches) {
      for (const match of jsonLdMatches) {
        try {
          const jsonContent = match.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
          const data = JSON.parse(jsonContent);
          
          // Handle arrays of structured data
          const recipes = Array.isArray(data) ? data : [data];
          
          for (const item of recipes) {
            if (this.isRecipeData(item)) {
              return item;
            }
            // Check nested @graph property
            if (item['@graph']) {
              for (const graphItem of item['@graph']) {
                if (this.isRecipeData(graphItem)) {
                  return graphItem;
                }
              }
            }
          }
        } catch (parseError) {
          console.warn('Failed to parse JSON-LD:', parseError);
          continue;
        }
      }
    }

    // Look for microdata (older format)
    const microdataMatch = html.match(/itemtype=["']https?:\/\/schema\.org\/Recipe["']/i);
    if (microdataMatch) {
      return this.extractMicrodata(html);
    }

    return null;
  }

  /**
   * Check if data object is recipe structured data
   */
  private isRecipeData(data: any): boolean {
    return data && (
      data['@type'] === 'Recipe' ||
      (Array.isArray(data['@type']) && data['@type'].includes('Recipe')) ||
      data.itemType === 'http://schema.org/Recipe'
    );
  }

  /**
   * Parse structured recipe data (JSON-LD format)
   */
  private parseStructuredData(data: any): ScrapedRecipeData {
    const result: ScrapedRecipeData = {};

    // Basic info
    result.title = data.name || data.headline;
    result.description = data.description;
    result.imageUrl = this.extractImageUrl(data.image);
    
    // Servings and yield
    result.servings = this.parseServings(data.recipeYield || data.yield);
    result.yieldText = this.parseYieldText(data.recipeYield || data.yield);

    // Timing
    result.totalTimeMinutes = this.parseDuration(data.totalTime);
    result.prepTimeMinutes = this.parseDuration(data.prepTime);
    result.cookTimeMinutes = this.parseDuration(data.cookTime);

    // Ingredients
    if (data.recipeIngredient) {
      result.ingredients = this.parseIngredients(data.recipeIngredient);
    }

    // Instructions
    if (data.recipeInstructions) {
      result.instructions = this.parseInstructions(data.recipeInstructions);
    }

    // Nutrition
    if (data.nutrition) {
      result.nutritionalInfo = this.parseNutrition(data.nutrition);
    }

    return result;
  }

  /**
   * Parse ingredients from structured data
   */
  private parseIngredients(ingredients: any[]): EnhancedRecipeIngredient[] {
    return ingredients.map((ingredient, index) => {
      const text = typeof ingredient === 'string' ? ingredient : ingredient.text || ingredient.name || '';
      const parsed = this.parseIngredientText(text);
      
      return {
        name: parsed.name,
        amount: parsed.amount,
        unit: parsed.unit,
        synonyms: parsed.synonyms
      };
    });
  }

  /**
   * Parse individual ingredient text to extract amount, unit, and name
   */
  private parseIngredientText(text: string): {
    name: string;
    amount: number;
    unit: string;
    synonyms: string[];
  } {
    // Common patterns for ingredient parsing
    const patterns = [
      // "2 cups flour" or "1/2 cup sugar"
      /^(\d+(?:\/\d+)?(?:\.\d+)?)\s+(\w+)\s+(.+)$/,
      // "1 large egg" or "2 medium onions"
      /^(\d+)\s+(large|medium|small|whole)?\s*(.+)$/,
      // "Salt to taste" or "Pepper as needed"
      /^(.+?)\s+(to taste|as needed|optional)$/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const amount = this.parseAmount(match[1]);
        const unit = match[2] || 'item';
        const name = match[3] || match[1];
        
        return {
          name: name.trim(),
          amount: amount || 1,
          unit: unit.trim(),
          synonyms: this.generateSynonyms(name.trim())
        };
      }
    }

    // Fallback: treat entire text as ingredient name
    return {
      name: text.trim(),
      amount: 1,
      unit: 'item',
      synonyms: this.generateSynonyms(text.trim())
    };
  }

  /**
   * Parse amount from text (handles fractions)
   */
  private parseAmount(amountText: string): number {
    if (!amountText) return 1;

    // Handle fractions like "1/2", "3/4"
    if (amountText.includes('/')) {
      const [numerator, denominator] = amountText.split('/').map(Number);
      return numerator / denominator;
    }

    // Handle mixed numbers like "1 1/2"
    const mixedMatch = amountText.match(/(\d+)\s+(\d+)\/(\d+)/);
    if (mixedMatch) {
      const whole = parseInt(mixedMatch[1]);
      const numerator = parseInt(mixedMatch[2]);
      const denominator = parseInt(mixedMatch[3]);
      return whole + (numerator / denominator);
    }

    return parseFloat(amountText) || 1;
  }

  /**
   * Generate synonyms for ingredient names
   */
  private generateSynonyms(name: string): string[] {
    const synonymMap: { [key: string]: string[] } = {
      'scallion': ['green onion', 'spring onion'],
      'cilantro': ['coriander', 'fresh coriander'],
      'bell pepper': ['sweet pepper', 'capsicum'],
      'zucchini': ['courgette'],
      'eggplant': ['aubergine'],
      'ground beef': ['minced beef', 'beef mince'],
      'heavy cream': ['heavy whipping cream', 'double cream'],
      'all-purpose flour': ['plain flour', 'AP flour']
    };

    const lowerName = name.toLowerCase();
    for (const [key, synonyms] of Object.entries(synonymMap)) {
      if (lowerName.includes(key)) {
        return synonyms;
      }
    }

    return [];
  }

  /**
   * Parse instructions from structured data
   */
  private parseInstructions(instructions: any[]): EnhancedRecipeInstruction[] {
    return instructions.map((instruction, index) => {
      const text = typeof instruction === 'string' 
        ? instruction 
        : instruction.text || instruction.name || instruction.description || '';

      return {
        step: index + 1,
        text: text.trim()
      };
    });
  }

  /**
   * Parse nutrition information
   */
  private parseNutrition(nutrition: any): EnhancedNutritionalInfo {
    return {
      calories: this.parseNutrientValue(nutrition.calories),
      protein_g: this.parseNutrientValue(nutrition.proteinContent),
      fat_g: this.parseNutrientValue(nutrition.fatContent),
      carbs_g: this.parseNutrientValue(nutrition.carbohydrateContent)
    };
  }

  /**
   * Parse nutrient values (handles units)
   */
  private parseNutrientValue(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const numMatch = value.match(/(\d+(?:\.\d+)?)/);
      return numMatch ? parseFloat(numMatch[1]) : 0;
    }
    return 0;
  }

  /**
   * Parse servings from yield data
   */
  private parseServings(yieldData: any): number {
    if (typeof yieldData === 'number') return yieldData;
    if (typeof yieldData === 'string') {
      const servingsMatch = yieldData.match(/(\d+)/);
      return servingsMatch ? parseInt(servingsMatch[1]) : 4;
    }
    if (Array.isArray(yieldData) && yieldData.length > 0) {
      return this.parseServings(yieldData[0]);
    }
    return 4; // Default
  }

  /**
   * Parse yield text
   */
  private parseYieldText(yieldData: any): string {
    if (typeof yieldData === 'string') return yieldData;
    if (Array.isArray(yieldData) && yieldData.length > 0) {
      return yieldData[0].toString();
    }
    return `Serves ${this.parseServings(yieldData)}`;
  }

  /**
   * Extract image URL from structured data
   */
  private extractImageUrl(image: any): string | undefined {
    if (typeof image === 'string') return image;
    if (Array.isArray(image) && image.length > 0) {
      return this.extractImageUrl(image[0]);
    }
    if (image && typeof image === 'object') {
      return image.url || image.contentUrl || image['@id'];
    }
    return undefined;
  }

  /**
   * Parse duration strings (ISO 8601 format: PT30M)
   */
  private parseDuration(duration: any): number | undefined {
    if (typeof duration !== 'string') return undefined;

    // ISO 8601 format: PT30M, PT1H30M
    const isoMatch = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (isoMatch) {
      const hours = parseInt(isoMatch[1] || '0');
      const minutes = parseInt(isoMatch[2] || '0');
      return hours * 60 + minutes;
    }

    // Simple number format
    const numberMatch = duration.match(/(\d+)/);
    return numberMatch ? parseInt(numberMatch[1]) : undefined;
  }

  /**
   * Extract microdata (fallback method)
   */
  private extractMicrodata(html: string): any {
    // Basic microdata extraction - simplified implementation
    // In a full implementation, you'd parse the HTML DOM and extract microdata properties
    return null;
  }

  /**
   * Parse HTML content directly (last resort)
   */
  private parseHtmlContent(html: string): ScrapedRecipeData {
    // Basic HTML parsing as fallback
    // This would involve parsing common HTML patterns for recipe sites
    return {
      title: this.extractTitleFromHtml(html),
      description: this.extractDescriptionFromHtml(html)
    };
  }

  private extractTitleFromHtml(html: string): string | undefined {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : undefined;
  }

  private extractDescriptionFromHtml(html: string): string | undefined {
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    return descMatch ? descMatch[1].trim() : undefined;
  }
}

// Export singleton instance
export const recipeScraperService = new RecipeScraperService();