/**
 * Perplexity Recipe Search Service
 * Unified recipe search using Perplexity API for better consistency with pricing
 */

export interface PerplexityRecipeSearchRequest {
  query: string;
  country?: string;
  includeIngredients?: string[];
  excludeIngredients?: string[];
  maxResults?: number;
  culturalCuisine?: string;
  dietaryRestrictions?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface RecipeIngredient {
  name: string; // Using 'name' for consistency with pricing API
  amount: number;
  unit: string;
  notes?: string;
}

export interface RecipeInstruction {
  step: number;
  title?: string;                    // Short description: "Prepare vegetables"
  text: string;                     // Detailed instruction
  timing?: {
    duration: number;               // Time in minutes
    isActive: boolean;              // Active vs. passive time
    description?: string;           // "Let simmer", "Prep while cooking"
  };
  temperature?: {
    value: number;                  // Temperature value
    unit: 'F' | 'C';               // Fahrenheit or Celsius
    type: 'oven' | 'stovetop' | 'oil' | 'water'; // Where to apply temperature
  };
  equipment?: string[];             // Required tools for this step
  visualCues?: string[];            // What to look for: "golden brown", "bubbling"
  tips?: string[];                  // Beginner tips and troubleshooting
  techniques?: {                    // Cooking techniques explained
    name: string;                   // "sauté", "fold", "whisk"
    description: string;            // How to perform the technique
  }[];
  warnings?: string[];              // Safety warnings or common mistakes
  ingredients?: string[];           // Ingredients used in this step
  servingNote?: string;             // Notes specific to this step
}

export interface PerplexityRecipe {
  title: string;
  description: string;
  cuisine: string;
  culturalOrigin: string[];
  ingredients: RecipeIngredient[];
  instructions: RecipeInstruction[];
  nutritionalInfo?: {
    calories: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
  };
  metadata: {
    sourceUrl: string;
    servings: number;
    totalTimeMinutes: number;
    difficulty: 'easy' | 'medium' | 'hard';
  };
  tags: string[];
}

export interface PerplexityRecipeSearchResponse {
  recipes: PerplexityRecipe[];
  success: boolean;
  error?: string;
  sources: string[];
}

class PerplexityRecipeSearchService {
  private apiKey: string;
  private baseURL = 'https://api.perplexity.ai/chat/completions';

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Perplexity API key not found. Recipe search will be unavailable.');
    }
  }

  /**
   * Search for recipes using Perplexity AI
   */
  async searchRecipes(request: PerplexityRecipeSearchRequest): Promise<PerplexityRecipeSearchResponse> {
    if (!this.apiKey) {
      return {
        recipes: [],
        success: false,
        error: 'Perplexity API key not configured',
        sources: []
      };
    }

    try {
      const prompt = this.buildRecipeSearchPrompt(request);
      
      // Create timeout controller for 25 seconds (5 seconds buffer before Vercel timeout)
      const controller = new AbortController();
      const timeoutMs = process.env.NODE_ENV === 'development' ? 60000 : 25000; // 60s for dev, 25s for production
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
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
              content: 'You are a recipe search assistant. Always return ONLY valid JSON in the exact format requested. Do not include any explanatory text, reasoning, or commentary outside the JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1500, // Optimized for faster response
          temperature: 0.1,
          return_citations: true,
          search_domain_filter: [
            'allrecipes.com', 'food.com', 'epicurious.com', 'simplyrecipes.com',
            'seriouseats.com', 'bonappetit.com', 'foodnetwork.com', 'tasteofhome.com',
            'delish.com', 'foodandwine.com'
          ]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }

      const result = await response.json();
      const content = result.choices[0]?.message?.content;
      
      console.log('🤖 Perplexity recipe search response length:', content?.length || 0);
      console.log('🤖 Raw API response:', content);
      console.log('🤖 First 500 chars:', content?.substring(0, 500));
      
      if (!content) {
        throw new Error('No content received from Perplexity API');
      }

      // Parse the JSON response
      const recipes = this.parseRecipeSearchResponse(content);
      console.log('📊 Parsed recipes count:', recipes.length);
      
      return {
        recipes,
        success: true,
        sources: result.citations || []
      };

    } catch (error) {
      console.error('Perplexity recipe search error:', error);
      
      // Handle timeout specifically
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          recipes: [],
          success: false,
          error: 'Recipe search timed out. Please try with a simpler query or try again.',
          sources: []
        };
      }
      
      return {
        recipes: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        sources: []
      };
    }
  }

  /**
   * Build a structured prompt for recipe search
   */
  private buildRecipeSearchPrompt(request: PerplexityRecipeSearchRequest): string {
    const { query, country, includeIngredients, excludeIngredients, maxResults, culturalCuisine, dietaryRestrictions, difficulty } = request;
    
    let searchCriteria = `Search for "${query}" recipes`;
    
    if (culturalCuisine) {
      searchCriteria += ` from ${culturalCuisine} cuisine`;
    }
    
    if (country && country !== 'United States') {
      searchCriteria += ` popular in ${country}`;
    }

    let filters = '';
    if (includeIngredients && includeIngredients.length > 0) {
      filters += `\n- MUST include: ${includeIngredients.join(', ')}`;
    }
    if (excludeIngredients && excludeIngredients.length > 0) {
      filters += `\n- MUST NOT include: ${excludeIngredients.join(', ')}`;
    }
    if (dietaryRestrictions && dietaryRestrictions.length > 0) {
      filters += `\n- Dietary restrictions: ${dietaryRestrictions.join(', ')}`;
    }
    if (difficulty) {
      filters += `\n- Difficulty level: ${difficulty}`;
    }

    return `${searchCriteria}

Find exactly ${maxResults || 1} recipe(s).${filters}

For each instruction step, include ALL details in the text field:
- Exact timing (e.g., "cook for 5 minutes", "let rest for 10 minutes")  
- Temperatures (e.g., "heat oil to 350°F", "preheat oven to 400°F")
- Visual cues (e.g., "until golden brown", "until bubbling")
- Techniques (e.g., "fold gently", "whisk vigorously")
- Tips for beginners

Return ONLY this exact JSON structure:
{"recipes":[{"title":"string","description":"string","cuisine":"string","culturalOrigin":["string"],"ingredients":[{"name":"string","amount":number,"unit":"string"}],"instructions":[{"step":number,"text":"detailed instruction with all timing, temperature, and technique details"}],"nutritionalInfo":{"calories":number,"protein_g":number,"fat_g":number,"carbs_g":number},"metadata":{"sourceUrl":"string","servings":number,"totalTimeMinutes":number,"difficulty":"easy|medium|hard"},"tags":["string"]}]}`;
  }

  /**
   * Parse Perplexity's recipe search response with robust error handling
   */
  private parseRecipeSearchResponse(content: string): PerplexityRecipe[] {
    try {
      // Clean the content
      let cleanedContent = content.trim();
      
      console.log('🔍 Original content to parse:', cleanedContent.substring(0, 200));
      
      // Remove any code fences
      cleanedContent = cleanedContent
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '');

      // Try to fix common JSON issues
      cleanedContent = this.fixCommonJSONIssues(cleanedContent);
      
      console.log('🔧 After cleaning:', cleanedContent.substring(0, 200));

      const parsed = JSON.parse(cleanedContent);
      
      console.log('✅ Successfully parsed JSON, structure:', Object.keys(parsed));
      
      if (parsed.recipes && Array.isArray(parsed.recipes)) {
        console.log(`📦 Found ${parsed.recipes.length} recipes in standard format`);
        return parsed.recipes.map((recipe: any) => this.normalizeRecipe(recipe));
      }
      
      // Check if the response IS the recipes array directly
      if (Array.isArray(parsed)) {
        console.log(`📦 Response is direct array of ${parsed.length} recipes`);
        return parsed.map((recipe: any) => this.normalizeRecipe(recipe));
      }
      
      // Check for a single recipe object
      if (parsed.title && parsed.ingredients) {
        console.log('📦 Response is a single recipe object');
        return [this.normalizeRecipe(parsed)];
      }

      console.error('❌ Unexpected JSON structure:', parsed);
      throw new Error('Invalid recipe response structure - no recipes array found');
    } catch (error) {
      console.error('❌ Error parsing recipe search response:', error);
      console.log('🔍 Raw content length:', content.length);
      console.log('🔍 First 500 chars:', content.substring(0, 500));
      console.log('🔍 Last 500 chars:', content.substring(Math.max(0, content.length - 500)));
      
      // Try alternative parsing approaches
      return this.attemptFallbackParsing(content);
    }
  }

  /**
   * Fix common JSON formatting issues from AI responses
   */
  private fixCommonJSONIssues(jsonString: string): string {
    let fixed = jsonString;
    
    // Fix trailing commas in objects and arrays
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
    
    // Fix missing commas between array elements
    fixed = fixed.replace(/}(\s*){/g, '},\n$1{');
    
    // Fix missing commas between object properties (enhanced patterns)
    fixed = fixed.replace(/"\s*\n\s*"/g, '",\n  "');
    fixed = fixed.replace(/(\w+|"[^"]*")\s*\n\s*"([^"]*)":/g, '$1,\n  "$2":');
    fixed = fixed.replace(/"\s*\n\s*(["\w])/g, '",\n  $1');
    
    // Fix missing commas after property values when followed by newline and next property
    fixed = fixed.replace(/("(?:[^"\\]|\\.)*"|\d+|true|false|null)\s*\n\s*"/g, '$1,\n  "');
    fixed = fixed.replace(/(}\s*)\n(\s*")/g, '$1,\n$2');
    fixed = fixed.replace(/(\]\s*)\n(\s*")/g, '$1,\n$2');
    
    // Fix unescaped quotes in string values
    fixed = fixed.replace(/: "([^"]*)"([^",}\]\s])/g, ': "$1\\"$2');
    
    // Fix missing commas in arrays
    fixed = fixed.replace(/(\])\s*\n\s*(\[)/g, '$1,\n  $2');
    fixed = fixed.replace(/(\})\s*\n\s*(\{)/g, '$1,\n  $2');
    
    // Fix broken object structures
    fixed = fixed.replace(/"\s*:\s*\n\s*"/g, '": "');
    
    return fixed;
  }

  /**
   * Attempt fallback parsing when main parsing fails
   */
  private attemptFallbackParsing(content: string): PerplexityRecipe[] {
    console.log('🔄 Attempting fallback parsing methods...');
    
    // Try multiple fallback approaches
    const fallbackMethods = [
      () => this.tryExtractRecipesArray(content),
      () => this.tryFixAndParseComplete(content),
      () => this.tryLenientParsing(content),
    ];
    
    for (let i = 0; i < fallbackMethods.length; i++) {
      try {
        console.log(`🔄 Trying fallback method ${i + 1}...`);
        const result = fallbackMethods[i]();
        if (result && result.length > 0) {
          console.log(`✅ Fallback method ${i + 1} succeeded with ${result.length} recipes`);
          return result;
        }
      } catch (error) {
        console.log(`❌ Fallback method ${i + 1} failed:`, error instanceof Error ? error.message : error);
      }
    }
    
    console.warn('⚠️ All fallback parsing methods failed, returning empty array');
    return [];
  }
  
  private tryExtractRecipesArray(content: string): PerplexityRecipe[] {
    // Try to extract just the recipes array if the outer structure is broken
    const recipesMatch = content.match(/"recipes"\s*:\s*\[(.*?)\]/s);
    if (recipesMatch) {
      const recipesArrayContent = `[${recipesMatch[1]}]`;
      const fixedArray = this.fixCommonJSONIssues(recipesArrayContent);
      const recipes = JSON.parse(fixedArray);
      return recipes.map((recipe: any) => this.normalizeRecipe(recipe));
    }
    return [];
  }
  
  private tryFixAndParseComplete(content: string): PerplexityRecipe[] {
    // Try more aggressive JSON fixing
    let fixed = content;
    
    // Remove any trailing text after closing brace
    const lastBraceIndex = fixed.lastIndexOf('}');
    if (lastBraceIndex > 0) {
      fixed = fixed.substring(0, lastBraceIndex + 1);
    }
    
    // Apply all fixes
    fixed = this.fixCommonJSONIssues(fixed);
    
    // Try additional fixes for common patterns
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
    fixed = fixed.replace(/([}\]])\s*,\s*$/g, '$1'); // Remove trailing comma at end
    
    const parsed = JSON.parse(fixed);
    if (parsed.recipes && Array.isArray(parsed.recipes)) {
      return parsed.recipes.map((recipe: any) => this.normalizeRecipe(recipe));
    }
    return [];
  }
  
  private tryLenientParsing(content: string): PerplexityRecipe[] {
    // Try to manually extract recipe objects even if JSON is completely broken
    const recipeMatches = content.match(/\{[^{}]*"title"\s*:\s*"[^"]*"[^{}]*\}/g);
    if (recipeMatches && recipeMatches.length > 0) {
      const recipes: any[] = [];
      
      for (const match of recipeMatches) {
        try {
          const fixed = this.fixCommonJSONIssues(match);
          const recipe = JSON.parse(fixed);
          recipes.push(this.normalizeRecipe(recipe));
        } catch (err) {
          console.log('Failed to parse individual recipe object:', err);
        }
      }
      
      return recipes;
    }
    return [];
  }

  /**
   * Normalize recipe data to ensure consistency
   */
  private normalizeRecipe(recipe: any): PerplexityRecipe {
    const ingredients = (recipe.ingredients || []).map((ing: any, index: number) => {
      // Handle both 'amount' and 'quantity' fields from API response
      const amountValue = ing.amount || ing.quantity || 1;
      const parsedAmount = typeof amountValue === 'number' ? amountValue : (parseFloat(amountValue) || 1);
      
      // Handle both 'name' and 'item' fields - prefer 'name' but fall back to 'item'
      const ingredientName = ing.name || ing.item || `Unknown ingredient ${index + 1}`;
      
      return {
        name: ingredientName,
        amount: parsedAmount,
        unit: ing.unit || 'unit',
        notes: ing.notes || ''
      };
    });
    
    return {
      title: recipe.title || 'Untitled Recipe',
      description: recipe.description || '',
      cuisine: recipe.cuisine || 'International',
      culturalOrigin: Array.isArray(recipe.culturalOrigin) ? recipe.culturalOrigin : [recipe.cuisine || 'International'],
      ingredients,
      instructions: (recipe.instructions || []).map((inst: any, index: number) => {
        const instruction: RecipeInstruction = {
          step: inst.step || (index + 1),
          text: inst.text || inst.instruction || ''
        };

        // Add enhanced properties if available
        if (inst.title) instruction.title = inst.title;
        
        if (inst.timing) {
          instruction.timing = {
            duration: inst.timing.duration || 0,
            isActive: inst.timing.isActive !== false, // Default to true if not specified
            description: inst.timing.description
          };
        }
        
        if (inst.temperature) {
          instruction.temperature = {
            value: inst.temperature.value || 0,
            unit: inst.temperature.unit || 'F',
            type: inst.temperature.type || 'stovetop'
          };
        }
        
        if (inst.equipment && Array.isArray(inst.equipment)) {
          instruction.equipment = inst.equipment;
        }
        
        if (inst.visualCues && Array.isArray(inst.visualCues)) {
          instruction.visualCues = inst.visualCues;
        }
        
        if (inst.tips && Array.isArray(inst.tips)) {
          instruction.tips = inst.tips;
        }
        
        if (inst.techniques && Array.isArray(inst.techniques)) {
          instruction.techniques = inst.techniques.map((tech: any) => ({
            name: tech.name || '',
            description: tech.description || ''
          }));
        }
        
        if (inst.warnings && Array.isArray(inst.warnings)) {
          instruction.warnings = inst.warnings;
        }
        
        if (inst.ingredients && Array.isArray(inst.ingredients)) {
          instruction.ingredients = inst.ingredients;
        }
        
        if (inst.servingNote) {
          instruction.servingNote = inst.servingNote;
        }

        return instruction;
      }),
      nutritionalInfo: (() => {
        // Check for both 'nutritionalInfo' and 'nutrition' fields
        const nutritionData = recipe.nutritionalInfo || recipe.nutrition;
        
        if (!nutritionData) return undefined;
        
        // Helper to safely parse numeric values
        const parseNumeric = (value: any): number => {
          if (value === null || value === undefined) return 0;
          if (typeof value === 'number') return value;
          const parsed = parseFloat(value);
          return isNaN(parsed) ? 0 : parsed;
        };
        
        return {
          calories: parseNumeric(nutritionData.calories),
          protein_g: parseNumeric(nutritionData.protein_g),
          fat_g: parseNumeric(nutritionData.fat_g),
          carbs_g: parseNumeric(nutritionData.carbs_g)
        };
      })(),
      metadata: {
        sourceUrl: recipe.metadata?.sourceUrl || recipe.source || '',
        servings: typeof (recipe.metadata?.servings || recipe.servings) === 'number' 
          ? (recipe.metadata?.servings || recipe.servings) 
          : parseInt(recipe.metadata?.servings || recipe.servings) || 4,
        totalTimeMinutes: typeof (recipe.metadata?.totalTimeMinutes || recipe.total_time_minutes) === 'number' 
          ? (recipe.metadata?.totalTimeMinutes || recipe.total_time_minutes) 
          : parseInt(recipe.metadata?.totalTimeMinutes || recipe.total_time_minutes) || 30,
        difficulty: recipe.metadata?.difficulty || recipe.difficulty || 'medium'
      },
      tags: Array.isArray(recipe.tags) ? recipe.tags : []
    };
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

export const perplexityRecipeSearchService = new PerplexityRecipeSearchService();