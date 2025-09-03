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
          max_tokens: 3000,
          temperature: 0.1,
          return_citations: true,
          search_domain_filter: [
            'allrecipes.com', 'food.com', 'epicurious.com', 'simplyrecipes.com',
            'seriouseats.com', 'bonappetit.com', 'foodnetwork.com', 'tasteofhome.com',
            'delish.com', 'foodandwine.com'
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }

      const result = await response.json();
      const content = result.choices[0]?.message?.content;
      
      console.log('🤖 Perplexity recipe search response length:', content?.length || 0);
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

Find ${maxResults || 3} high-quality recipes from reputable cooking websites.${filters}

For each recipe, provide:
1. Complete ingredient list with specific amounts and units
2. DETAILED step-by-step instructions with beginner-friendly guidance
3. Nutritional information (if available)
4. Cultural origin and cuisine type
5. Cooking time and difficulty
6. Source URL

CRITICAL REQUIREMENTS FOR INGREDIENTS:
- Use "name" field for ingredients (not "item")
- Include precise amounts as numbers (e.g., 2, not "2" as string)
- Include proper units (cups, tablespoons, pounds, etc.)
- Ensure all ingredients have amounts specified
- If amount is unclear, estimate reasonably (e.g., "1 onion" = 1 each)

CRITICAL REQUIREMENTS FOR INSTRUCTIONS:
- Provide detailed, beginner-friendly instructions
- Include timing for each step (active cooking time)
- Specify temperatures for cooking steps
- List required equipment for each step
- Include visual cues to know when step is complete
- Add helpful tips and common mistake warnings
- Explain cooking techniques (sauté, fold, whisk, etc.)
- Mention which ingredients are used in each step

Format response as JSON:
{
  "recipes": [
    {
      "title": "Recipe Name",
      "description": "Brief description of the dish",
      "cuisine": "Cuisine type",
      "culturalOrigin": ["Culture 1", "Culture 2"],
      "ingredients": [
        {
          "name": "ingredient name",
          "amount": 2.5,
          "unit": "cups",
          "notes": "optional preparation notes"
        }
      ],
      "instructions": [
        {
          "step": 1,
          "title": "Prepare ingredients",
          "text": "Heat 2 tablespoons olive oil in a large skillet over medium heat. Add diced onions and cook, stirring occasionally, until translucent and lightly golden.",
          "timing": {
            "duration": 5,
            "isActive": true,
            "description": "Stir occasionally while cooking"
          },
          "temperature": {
            "value": 350,
            "unit": "F",
            "type": "stovetop"
          },
          "equipment": ["large skillet", "wooden spoon"],
          "visualCues": ["translucent onions", "lightly golden edges", "sizzling sound"],
          "tips": ["Don't rush - proper sautéing takes time", "If onions brown too quickly, lower the heat"],
          "techniques": [{
            "name": "sauté",
            "description": "Cook quickly in a small amount of fat over relatively high heat, stirring frequently"
          }],
          "warnings": ["Don't let onions burn - they'll turn bitter"],
          "ingredients": ["olive oil", "yellow onion"]
        }
      ],
      "nutritionalInfo": {
        "calories": 450,
        "protein_g": 25,
        "fat_g": 15,
        "carbs_g": 35
      },
      "metadata": {
        "sourceUrl": "https://example.com/recipe",
        "servings": 4,
        "totalTimeMinutes": 60,
        "difficulty": "medium"
      },
      "tags": ["dinner", "healthy", "quick"]
    }
  ]
}

INSTRUCTION GUIDELINES:
- For "title": Provide a short, descriptive title (e.g., "Sauté aromatics", "Prepare sauce")
- For "timing": Include duration in minutes, specify if it's active cooking time
- For "temperature": Always include unit (F or C) and where to apply (oven/stovetop/oil/water)
- For "equipment": List specific tools needed for this step
- For "visualCues": Describe what to look/listen/smell for when step is complete
- For "tips": Provide helpful advice for beginners
- For "techniques": Explain any cooking methods used
- For "warnings": Mention safety concerns or common mistakes
- For "ingredients": List which ingredients are used in this specific step

Return ONLY the JSON, no additional text.`;
  }

  /**
   * Parse Perplexity's recipe search response with robust error handling
   */
  private parseRecipeSearchResponse(content: string): PerplexityRecipe[] {
    try {
      // Clean the content
      let cleanedContent = content.trim();
      
      // Remove any code fences
      cleanedContent = cleanedContent
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '');

      // Try to fix common JSON issues
      cleanedContent = this.fixCommonJSONIssues(cleanedContent);

      const parsed = JSON.parse(cleanedContent);
      
      if (parsed.recipes && Array.isArray(parsed.recipes)) {
        return parsed.recipes.map((recipe: any) => this.normalizeRecipe(recipe));
      }

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
    const ingredients = (recipe.ingredients || []).map((ing: any, index: number) => ({
      name: ing.name || ing.item || `Unknown ingredient ${index + 1}`,
      amount: typeof ing.amount === 'number' ? ing.amount : (parseFloat(ing.amount) || 1),
      unit: ing.unit || 'unit',
      notes: ing.notes || ''
    }));
    
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
      nutritionalInfo: recipe.nutritionalInfo ? {
        calories: typeof recipe.nutritionalInfo.calories === 'number' 
          ? recipe.nutritionalInfo.calories 
          : parseFloat(recipe.nutritionalInfo.calories) || 0,
        protein_g: typeof recipe.nutritionalInfo.protein_g === 'number' 
          ? recipe.nutritionalInfo.protein_g 
          : parseFloat(recipe.nutritionalInfo.protein_g) || 0,
        fat_g: typeof recipe.nutritionalInfo.fat_g === 'number' 
          ? recipe.nutritionalInfo.fat_g 
          : parseFloat(recipe.nutritionalInfo.fat_g) || 0,
        carbs_g: typeof recipe.nutritionalInfo.carbs_g === 'number' 
          ? recipe.nutritionalInfo.carbs_g 
          : parseFloat(recipe.nutritionalInfo.carbs_g) || 0
      } : undefined,
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