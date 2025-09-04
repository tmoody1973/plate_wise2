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
    imageUrl?: string;
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
      
      // Create timeout controller with a conservative cap to avoid Vercel timeouts
      const controller = new AbortController();
      // Edge Functions allow ~30s; keep a safe buffer in production
      const timeoutMs = process.env.NODE_ENV === 'development' ? 60000 : 25000;
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
          max_tokens: 2000, // Increased for detailed recipes
          temperature: 0.2, // Low randomness for concise JSON
          return_citations: true,
          search_domain_filter: [
            // Mainstream recipe sites
            'allrecipes.com', 'food.com', 'epicurious.com', 'simplyrecipes.com',
            'seriouseats.com', 'bonappetit.com', 'foodnetwork.com', 'tasteofhome.com',
            'delish.com', 'foodandwine.com', 'thekitchn.com',
            // African cuisine
            'africanbites.com', 'afrolems.com', 'allnigerianrecipes.com', 'immaculatebites.com',
            'ethiopianfood.guide', 'ethiopianrecipes.net', 'xsomali.com', 'somalifoodblog.com',
            // Asian cuisine
            'bunbobae.com', 'justonecookbook.com', 'japanesecooking101.com', 'cookpad.com',
            'madewithlau.com', 'vickypham.com', 'hungryhuy.com',
            // Latin American & Caribbean
            'caribbeanpot.com', 'cheflolaskitchen.com', 'cocinacriolla.org', 'mexicoinmykitchen.com',
            'patijinich.com', 'isabeleats.com', 'elboricua.com', 'thenoshery.com', 'latinamommeals.com',
            'cookingwithria.com', 'perudelights.com', 'latinamericancooking.com', 'jamaicanbikkle.com',
            'jamaicanfoodsandrecipes.com', 'comidavenezolana.com', 'buenprovecho.hn',
            // Eastern European
            'polishhousewife.com', 'polonist.com', 'olgasflavorfactory.com', 'ruscuisine.com',
            'ukrainianclassickitchen.ca', 'savaskitchen.com', 'anna-voloshyna.com', 'etnocook.com',
            'klopotenko.com', 'myodessakitchen.com', 'proborsch.com',
            // Middle Eastern & Mediterranean
            'tasteofbeirut.com', 'themediterraneandish.com', 'mypersiankitchen.com',
            'ozlemsturkishtable.com', 'givecipe.com', 'cookingorgeous.com', 'turkishfoodie.com',
            'munatycooking.com', 'jeddahmom.com', 'palestineinadish.com',
            // South Asian
            'swasthisrecipes.com', 'vegrecipesofindia.com', 'archanaskitchen.com',
            'kannammacooks.com', 'sinfullyspicy.com', 'ministryofcurry.com',
            'simpleindianrecipes.com', 'flourandspiceblog.com', 'pakistaneats.com',
            // Haitian & Native American
            'petersfoodadventures.com', 'chawjcreations.com', 'loveforhaitianfood.com',
            'savorythoughts.com', 'haitian-recipes.com', 'natifs.org', 'sioux-chef.com',
            // European & Other
            'greatbritishchefs.com', 'whats4eats.com', 'thegermankitchen.com',
            'bettybossi.ch', 'marmiton.org', 'lesfoodies.com', 'icasvori.is',
            // Brazilian & Portuguese
            'receitas.globo.com', 'panelinha.com.br', 'cozinhabrasileira.com',
            'receitinhas.com.br', 'javirecipes.com',
            // Soul Food
            'thesoulfoodpot.com', 'urbanfarmandkitchen.com'
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

Return ONLY a JSON object with this exact structure:
{
  "recipes": [
    {
      "title": "Recipe Name",
      "description": "Brief description",
      "cuisine": "Cuisine Type",
      "culturalOrigin": ["Culture"],
      "ingredients": [
        {"name": "ingredient", "amount": 1, "unit": "cup"}
      ],
      "instructions": [
        {"step": 1, "text": "detailed instruction"}
      ],
      "nutritionalInfo": {
        "calories": 300,
        "protein_g": 15,
        "fat_g": 10,
        "carbs_g": 45
      }
    }
  ]
}

IMPORTANT: 
- Return ONLY the JSON, no other text
- Use "amount" (not "quantity") as a number
- Include timing and temperatures in instruction text`;
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
      
      // Debug: Log nutrition field structure if present
      if (parsed.recipes && parsed.recipes.length > 0) {
        const firstRecipe = parsed.recipes[0];
        if (firstRecipe.nutritionalInfo) {
          console.log('🔬 Found nutritionalInfo:', Object.keys(firstRecipe.nutritionalInfo));
        }
        if (firstRecipe.nutrition) {
          console.log('🔬 Found nutrition:', Object.keys(firstRecipe.nutrition));
        }
        
        // Debug: Log ingredient field structure
        if (firstRecipe.ingredients && firstRecipe.ingredients.length > 0) {
          const firstIngredient = firstRecipe.ingredients[0];
          console.log('🔬 Ingredient fields:', Object.keys(firstIngredient));
          if (firstIngredient.quantity !== undefined) {
            console.log('⚠️ Found "quantity" field in ingredient - should be "amount"');
          }
        }
      }
      
      if (parsed.recipes && Array.isArray(parsed.recipes)) {
        console.log(`📦 Found ${parsed.recipes.length} recipes in standard format`);
        // Filter out any non-object entries and normalize
        return parsed.recipes
          .filter((recipe: any) => typeof recipe === 'object' && recipe !== null)
          .map((recipe: any) => this.normalizeRecipe(recipe));
      }
      
      // Check if the response IS the recipes array directly
      if (Array.isArray(parsed)) {
        console.log(`📦 Response is direct array of ${parsed.length} items`);
        // Filter out any non-object entries
        return parsed
          .filter((recipe: any) => typeof recipe === 'object' && recipe !== null)
          .map((recipe: any) => this.normalizeRecipe(recipe));
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
    // Validate recipe is an object
    if (!recipe || typeof recipe !== 'object') {
      console.warn('⚠️ Invalid recipe data:', recipe);
      return {
        title: 'Invalid Recipe',
        description: 'This recipe could not be parsed correctly',
        cuisine: 'Unknown',
        culturalOrigin: ['Unknown'],
        ingredients: [],
        instructions: [{step: 1, text: 'Recipe data was invalid'}],
        nutritionalInfo: undefined,
        metadata: {
          sourceUrl: '',
          servings: 4,
          totalTimeMinutes: 30,
          difficulty: 'medium'
        },
        tags: []
      };
    }
    const ingredients = (recipe.ingredients || []).map((ing: any, index: number) => {
      // Debug log ingredient structure
      if (ing.quantity !== undefined && ing.amount === undefined) {
        console.log(`🔬 Ingredient ${index} has 'quantity' field:`, ing.quantity);
      }
      
      // Handle both 'amount' and 'quantity' fields from API response
      const amountValue = ing.amount || ing.quantity || 1;
      const parsedAmount = typeof amountValue === 'number' ? amountValue : (parseFloat(amountValue) || 1);
      
      // Handle both 'name' and 'item' fields - prefer 'name' but fall back to 'item'
      const ingredientName = ing.name || ing.item || `Unknown ingredient ${index + 1}`;
      
      // Only return expected fields - no quantity field
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
      instructions: (() => {
        // Handle missing or invalid instructions
        if (!recipe.instructions || !Array.isArray(recipe.instructions) || recipe.instructions.length === 0) {
          // Create a basic instruction if none exist
          return [{
            step: 1,
            text: recipe.method || recipe.directions || 'Please refer to the ingredients list and prepare according to standard cooking methods.'
          }];
        }
        
        return recipe.instructions.map((inst: any, index: number) => {
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
      });
      })(),
      nutritionalInfo: (() => {
        // Check for both 'nutritionalInfo' and 'nutrition' fields
        const nutritionData = recipe.nutritionalInfo || recipe.nutrition;
        
        if (!nutritionData) return undefined;
        
        // Helper to safely parse numeric values
        const parseNumeric = (value: any, fieldName?: string): number => {
          if (value === null || value === undefined) {
            console.log(`⚠️ Null nutritional value for ${fieldName}, using 0`);
            return 0;
          }
          if (typeof value === 'number') return value;
          const parsed = parseFloat(value);
          if (isNaN(parsed)) {
            console.log(`⚠️ Invalid nutritional value for ${fieldName}: "${value}", using 0`);
            return 0;
          }
          return parsed;
        };
        
        return {
          calories: parseNumeric(nutritionData.calories, 'calories'),
          protein_g: parseNumeric(nutritionData.protein_g, 'protein_g'),
          fat_g: parseNumeric(nutritionData.fat_g, 'fat_g'),
          carbs_g: parseNumeric(nutritionData.carbs_g, 'carbs_g')
        };
      })(),
      metadata: {
        sourceUrl: recipe.metadata?.sourceUrl || recipe.source || '',
        imageUrl: recipe.metadata?.imageUrl || recipe.image || recipe.imageUrl || undefined,
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
