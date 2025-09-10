/**
 * WebScraping.AI Recipe Scraper Service
 * Uses AI-powered field extraction to get recipe data from any URL
 * Much faster and more reliable than Puppeteer
 */

import { EnhancedRecipe, EnhancedIngredient, EnhancedInstruction, EnhancedNutritionalInfo } from '@/types';

export interface ScrapedRecipeData {
  title?: string;
  description?: string;
  ingredients?: EnhancedIngredient[];
  instructions?: EnhancedInstruction[];
  totalTimeMinutes?: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  yieldText?: string;
  nutritionalInfo?: EnhancedNutritionalInfo;
  imageUrl?: string;
  cuisine?: string;
  tags?: string[];
}

export interface RecipeScrapingResult {
  success: boolean;
  data?: ScrapedRecipeData;
  error?: string;
  scrapingMethod?: string;
}

class WebScrapingAIRecipeScraperService {
  private apiKey: string;
  private baseURL = 'https://api.webscraping.ai';
  
  constructor() {
    this.apiKey = process.env.WEBSCRAPING_AI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ WebScraping.AI API key not found in environment variables');
    }
  }
  
  /**
   * Scrape recipe data from a URL using WebScraping.AI
   */
  async scrapeRecipe(url: string): Promise<RecipeScrapingResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'WebScraping.AI API key not configured'
      };
    }
    
    try {
      console.log('🤖 Scraping recipe with WebScraping.AI:', url);
      
      // Method 1: Try AI Fields Extraction (most reliable)
      const aiFieldsResult = await this.scrapeWithAIFields(url);
      if (aiFieldsResult.success) {
        console.log('✅ Successfully scraped using AI Fields');
        return aiFieldsResult;
      }
      
      // Method 2: Fallback to AI Question approach
      console.log('🔄 Falling back to AI Question method...');
      const aiQuestionResult = await this.scrapeWithAIQuestion(url);
      if (aiQuestionResult.success) {
        console.log('✅ Successfully scraped using AI Question');
        return aiQuestionResult;
      }
      
      return {
        success: false,
        error: 'Could not extract recipe data using WebScraping.AI methods'
      };
      
    } catch (error) {
      console.error('❌ WebScraping.AI recipe scraping failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown scraping error'
      };
    }
  }
  
  /**
   * Scrape using AI Fields Extraction (most structured approach)
   */
  private async scrapeWithAIFields(url: string): Promise<RecipeScrapingResult> {
    try {
      const params = new URLSearchParams({
        api_key: this.apiKey,
        url: url,
        timeout: '10000',
        js: 'true',
        js_timeout: '2000',
        fields: JSON.stringify({
          ingredients: 'ingredients',
          'image-url': 'image url',
          instructions: 'full recipe instructions or directions',
          servings: 'number of servings for the recipe',
          title: 'recipe title',
          description: 'recipe description',
          'prep-time': 'preparation time',
          'cook-time': 'cooking time',
          'total-time': 'total time',
          cuisine: 'cuisine type'
        }),
        format: 'json'
      });
      
      const response = await fetch(`${this.baseURL}/ai/fields?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`WebScraping.AI API error: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('🔍 WebScraping.AI fields response:', data);
      
      // Parse the extracted fields into our format
      const scrapedData = this.parseAIFieldsResponse(data, url);
      
      return {
        success: true,
        data: scrapedData,
        scrapingMethod: 'WebScraping.AI Fields'
      };
      
    } catch (error) {
      console.error('❌ AI Fields extraction failed:', error);
      return {
        success: false,
        error: `AI Fields extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Scrape using AI Question approach (fallback)
   */
  private async scrapeWithAIQuestion(url: string): Promise<RecipeScrapingResult> {
    try {
      const question = `Extract the following recipe information in JSON format:
      {
        \"title\": \"recipe name\",
        \"description\": \"recipe description\",
        \"ingredients\": [\"ingredient 1 with amount\", \"ingredient 2 with amount\"],
        \"instructions\": [\"step 1\", \"step 2\"],
        \"prep_time\": \"prep time in minutes\",
        \"cook_time\": \"cook time in minutes\",
        \"total_time\": \"total time in minutes\",
        \"servings\": \"number of servings\",
        \"image_url\": \"main image URL\",
        \"cuisine\": \"cuisine type\"
      }`;
      
      const params = new URLSearchParams({
        url: url,
        question: question,
        api_key: this.apiKey
      });
      
      const response = await fetch(`${this.baseURL}/ai/question?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`WebScraping.AI API error: ${response.status} - ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('🔍 WebScraping.AI question response:', data);
      
      // Parse the AI response (should be JSON)
      const scrapedData = this.parseAIQuestionResponse(data.answer);
      
      return {
        success: true,
        data: scrapedData,
        scrapingMethod: 'WebScraping.AI Question'
      };
      
    } catch (error) {
      console.error('❌ AI Question extraction failed:', error);
      return {
        success: false,
        error: `AI Question extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Parse AI Fields response into our recipe format
   */
  private parseAIFieldsResponse(data: any, url?: string): ScrapedRecipeData {
    const result: ScrapedRecipeData = {};
    
    // Basic info - with better fallback for title
    result.title = data.title || this.extractTitleFromUrl(url) || 'Delicious Recipe';
    result.description = data.description;
    result.imageUrl = data['image-url'];
    result.cuisine = data.cuisine;
    
    // Timing
    result.prepTimeMinutes = this.parseTimeValue(data['prep-time']);
    result.cookTimeMinutes = this.parseTimeValue(data['cook-time']);
    result.totalTimeMinutes = this.parseTimeValue(data['total-time']) || 
                             (result.prepTimeMinutes || 0) + (result.cookTimeMinutes || 0);
    
    // Servings
    result.servings = this.parseServingsValue(data.servings);
    result.yieldText = data.servings;
    
    // Ingredients
    if (data.ingredients) {
      result.ingredients = this.parseIngredientsFromText(data.ingredients);
    }
    
    // Instructions
    if (data.instructions) {
      result.instructions = this.parseInstructionsFromText(data.instructions);
    }
    
    // Basic nutrition if available
    result.nutritionalInfo = {
      calories: 0,
      protein_g: 0,
      fat_g: 0,
      carbs_g: 0
    };
    
    return result;
  }
  
  /**
   * Parse AI Question response (JSON format)
   */
  private parseAIQuestionResponse(answer: string): ScrapedRecipeData {
    try {
      // Try to extract JSON from the answer
      const jsonMatch = answer.match(/\\{[\\s\\S]*\\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      const result: ScrapedRecipeData = {
        title: parsed.title || 'Recipe',
        description: parsed.description,
        imageUrl: parsed.image_url,
        cuisine: parsed.cuisine,
        prepTimeMinutes: this.parseTimeValue(parsed.prep_time),
        cookTimeMinutes: this.parseTimeValue(parsed.cook_time),
        totalTimeMinutes: this.parseTimeValue(parsed.total_time),
        servings: this.parseServingsValue(parsed.servings),
        yieldText: parsed.servings
      };
      
      // Parse ingredients
      if (parsed.ingredients && Array.isArray(parsed.ingredients)) {
        result.ingredients = parsed.ingredients.map((ingredient: string) => 
          this.parseIngredientText(ingredient)
        );
      }
      
      // Parse instructions
      if (parsed.instructions && Array.isArray(parsed.instructions)) {
        result.instructions = parsed.instructions.map((instruction: string, index: number) => ({
          step: index + 1,
          text: instruction
        }));
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Failed to parse AI question response:', error);
      // Return basic fallback data
      return {
        title: 'Recipe',
        ingredients: [],
        instructions: [{ step: 1, text: 'See source website for instructions' }],
        servings: 4,
        totalTimeMinutes: 30
      };
    }
  }
  
  /**
   * Helper methods
   */
  
  private parseTimeValue(timeStr: string | number | undefined): number | undefined {
    if (!timeStr) return undefined;
    
    // Handle numeric input
    if (typeof timeStr === 'number') return timeStr;
    
    // Handle string input
    if (typeof timeStr === 'string') {
      // Extract numbers from time string
      const match = timeStr.match(/(\d+)/);
      return match ? parseInt(match[1]) : undefined;
    }
    
    return undefined;
  }
  
  private parseServingsValue(servingsStr: string | number | undefined): number | undefined {
    if (!servingsStr) return undefined;
    
    // Handle numeric input
    if (typeof servingsStr === 'number') return servingsStr;
    
    // Handle string input
    if (typeof servingsStr === 'string') {
      const match = servingsStr.match(/(\d+)/);
      return match ? parseInt(match[1]) : undefined;
    }
    
    return undefined;
  }
  
  private parseNumericValue(value: string | undefined): number {
    if (!value) return 0;
    
    const match = value.match(/([\\d\\.]+)/);
    return match ? parseFloat(match[1]) : 0;
  }
  
  private parseIngredientsFromText(ingredientsText: string): EnhancedIngredient[] {
    // Split ingredients by common delimiters
    const ingredientLines = ingredientsText
      .split(/\\n|\\r\\n|;|\\*|•|-/)
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    return ingredientLines.map(ingredient => this.parseIngredientText(ingredient));
  }
  
  private parseInstructionsFromText(instructionsText: string): EnhancedInstruction[] {
    // Split instructions by common delimiters
    const instructionLines = instructionsText
      .split(/\\n|\\r\\n|\\d+\\.|Step \\d+/)
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    return instructionLines.map((instruction, index) => ({
      step: index + 1,
      text: instruction
    }));
  }
  
  private parseIngredientText(text: string): EnhancedIngredient {
    // Simple ingredient parsing
    const match = text.match(/^([\\d\\/\\.\\s]+)\\s*([a-zA-Z]+)?\\s+(.+)$/);
    
    if (match) {
      const [, amountStr, unit, name] = match;
      const amount = this.parseAmount(amountStr.trim());
      return {
        name: name.trim(),
        amount,
        unit: unit || 'piece',
        synonyms: []
      };
    }
    
    return {
      name: text.trim(),
      amount: 1,
      unit: 'piece',
      synonyms: []
    };
  }
  
  private parseAmount(amountStr: string): number {
    // Handle fractions like \"1/2\", \"1 1/2\"
    if (amountStr.includes('/')) {
      const parts = amountStr.split(' ');
      let total = 0;
      
      for (const part of parts) {
        if (part.includes('/')) {
          const [num, den] = part.split('/');
          total += parseInt(num) / parseInt(den);
        } else {
          total += parseFloat(part);
        }
      }
      
      return total;
    }
    
    return parseFloat(amountStr) || 1;
  }
  
  private extractTitleFromUrl(url: string): string | undefined {
    if (!url) return undefined;
    
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Extract the last part of the path and clean it up
      const parts = pathname.split('/').filter(Boolean);
      const lastPart = parts[parts.length - 1];
      
      if (lastPart) {
        // Convert URL slug to readable title
        return lastPart
          .replace(/[-_]/g, ' ')
          .replace(/\.(html|php|aspx?)$/i, '')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      }
    } catch (error) {
      console.warn('Failed to extract title from URL:', error);
    }
    
    return undefined;
  }
}

// Export singleton instance
export const webScrapingAIRecipeScraperService = new WebScrapingAIRecipeScraperService();