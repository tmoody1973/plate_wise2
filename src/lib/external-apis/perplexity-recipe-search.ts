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
   * Search for recipes using Perplexity AI with streaming support
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
      // Increase timeout for production to handle complex recipe searches
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
              content: 'You are an expert culinary recipe assistant. Always return ONLY valid JSON in the exact format requested. Provide DETAILED, comprehensive step-by-step instructions that a home cook can easily follow. Include specific temperatures, times, techniques, visual cues, and helpful tips. Do not include any explanatory text outside the JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000, // Reduced for faster response while maintaining detail
          temperature: 0.1, // Very low randomness for concise, consistent JSON
          return_citations: true,
          stream: true, // Enable streaming for better UX and timeout prevention
          // No domain filter - let Perplexity use its SEO ranking to find best results
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body available');
      }

      let fullContent = '';
      let citations: string[] = [];
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                break;
              }
              
              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                
                if (delta) {
                  fullContent += delta;
                }
                
                // Extract citations if available
                if (parsed.citations && Array.isArray(parsed.citations)) {
                  citations = [...citations, ...parsed.citations];
                }
              } catch (e) {
                // Skip malformed JSON chunks
                continue;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
      
      console.log('🤖 Perplexity streaming response length:', fullContent.length);
      console.log('🤖 First 500 chars:', fullContent.substring(0, 500));
      
      if (!fullContent) {
        throw new Error('No content received from Perplexity streaming API');
      }

      // Parse the JSON response with citations
      const recipes = this.parseRecipeSearchResponse(fullContent, citations);
      console.log('📊 Parsed recipes count:', recipes.length);
      console.log('📔 Citations found:', citations.length);
      
      return {
        recipes,
        success: true,
        sources: citations
      };

    } catch (error) {
      console.error('Perplexity recipe search error:', error);
      
      // Handle timeout and deployment errors specifically
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          recipes: [],
          success: false,
          error: 'Recipe search timed out. Please try with a simpler query or try again.',
          sources: []
        };
      }
      
      // Handle Vercel deployment timeout errors
      if (error instanceof Error && (
        error.message.includes('FUNCTION_INVOCATION_TIMEOUT') ||
        error.message.includes('504') ||
        error.message.includes('timeout')
      )) {
        return {
          recipes: [],
          success: false,
          error: 'Recipe search took too long. Please try with a shorter, more specific query.',
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
   * Search for recipes using Perplexity AI with streaming for real-time UI updates
   */
  async *searchRecipesStream(request: PerplexityRecipeSearchRequest): AsyncGenerator<{
    type: 'partial' | 'complete' | 'error';
    content?: string;
    recipes?: PerplexityRecipe[];
    sources?: string[];
    error?: string;
  }> {
    if (!this.apiKey) {
      yield {
        type: 'error',
        error: 'Perplexity API key not configured'
      };
      return;
    }

    try {
      const prompt = this.buildRecipeSearchPrompt(request);
      
      const controller = new AbortController();
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
              content: 'You are an expert culinary recipe assistant. Always return ONLY valid JSON in the exact format requested. Provide DETAILED, comprehensive step-by-step instructions that a home cook can easily follow. Include specific temperatures, times, techniques, visual cues, and helpful tips. Do not include any explanatory text outside the JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.1,
          return_citations: true,
          stream: true,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        yield {
          type: 'error',
          error: `Perplexity API error: ${response.status}`
        };
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        yield {
          type: 'error',
          error: 'No response body available'
        };
        return;
      }

      let fullContent = '';
      let citations: string[] = [];
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                break;
              }
              
              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                
                if (delta) {
                  fullContent += delta;
                  
                  // Try to parse partial recipes for progressive loading
                  const partialRecipes = this.parsePartialRecipes(fullContent);
                  const recipeCount = this.getProgressiveRecipeCount(fullContent);
                  
                  // Only yield updates when we have new recipes or significant content changes
                  const shouldYield = partialRecipes.length > 0 || fullContent.length % 500 === 0;
                  
                  if (shouldYield) {
                    // Yield partial content with progressive recipe updates
                    yield {
                      type: 'partial',
                      content: fullContent,
                      recipes: partialRecipes.length > 0 ? partialRecipes : undefined
                    };
                    
                    // Log progress for debugging
                    if (recipeCount > 0) {
                      console.log(`📊 Progressive parsing found ${recipeCount} recipe titles, ${partialRecipes.length} complete recipes`);
                    }
                  }
                }
                
                if (parsed.citations && Array.isArray(parsed.citations)) {
                  citations = [...citations, ...parsed.citations];
                }
              } catch (e) {
                continue;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
      
      if (!fullContent) {
        yield {
          type: 'error',
          error: 'No content received from Perplexity streaming API'
        };
        return;
      }

      // Parse final result
      try {
        const recipes = this.parseRecipeSearchResponse(fullContent, citations);
        yield {
          type: 'complete',
          recipes,
          sources: citations
        };
      } catch (parseError) {
        yield {
          type: 'error',
          error: parseError instanceof Error ? parseError.message : 'Failed to parse recipes'
        };
      }

    } catch (error) {
      console.error('Perplexity streaming error:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        yield {
          type: 'error',
          error: 'Recipe search timed out. Please try with a simpler query.'
        };
      } else if (error instanceof Error && (
        error.message.includes('FUNCTION_INVOCATION_TIMEOUT') ||
        error.message.includes('504') ||
        error.message.includes('timeout')
      )) {
        yield {
          type: 'error',
          error: 'Recipe search took too long. Please try with a shorter, more specific query.'
        };
      } else {
        yield {
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
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
      // For global/international recipes, hint at whats4eats.com
      if (culturalCuisine.toLowerCase().includes('global') || 
          culturalCuisine.toLowerCase().includes('international') ||
          culturalCuisine.toLowerCase().includes('world')) {
        searchCriteria += ` (consider authentic sources like whats4eats.com for global recipes)`;
      }
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
      "source": "URL of recipe source",
      "imageUrl": "URL of recipe image if available",
      "ingredients": [
        {"name": "ingredient", "amount": 1, "unit": "cup"}
      ],
      "instructions": [
        {"step": 1, "text": "comprehensive step-by-step instruction with specific details"}
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
- Instructions must be DETAILED and COMPREHENSIVE:
  * Include specific techniques (e.g., "dice into 1/4-inch pieces", "sauté until golden brown")
  * Specify exact temperatures (e.g., "350°F/175°C", "medium-high heat")
  * Include precise timing (e.g., "cook for 8-10 minutes", "simmer for 20 minutes")
  * Mention visual/sensory cues (e.g., "until edges are crispy", "until fragrant", "until internal temp reaches 165°F")
  * Include preparation details (e.g., "pat dry with paper towels", "bring to room temperature")
  * Specify cookware and tools needed (e.g., "12-inch skillet", "wooden spoon")
  * Add helpful tips and warnings (e.g., "don't overcrowd the pan", "stir frequently to prevent burning")
- Each instruction step should be complete enough for a beginner to follow
- Break complex tasks into multiple detailed steps
- Include prep work in early steps (mise en place)`;
  }

  /**
   * Parse Perplexity's recipe search response with robust error handling
   */
  private parseRecipeSearchResponse(content: string, citations: string[] = []): PerplexityRecipe[] {
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
          .map((recipe: any, index: number) => this.normalizeRecipe(recipe, citations[index] || citations[0] || ''));
      }
      
      // Check if the response IS the recipes array directly
      if (Array.isArray(parsed)) {
        console.log(`📦 Response is direct array of ${parsed.length} items`);
        // Filter out any non-object entries
        return parsed
          .filter((recipe: any) => typeof recipe === 'object' && recipe !== null)
          .map((recipe: any, index: number) => this.normalizeRecipe(recipe, citations[index] || citations[0] || ''));
      }
      
      // Check for a single recipe object
      if (parsed.title && parsed.ingredients) {
        console.log('📦 Response is a single recipe object');
        return [this.normalizeRecipe(parsed, citations[0] || '')];
      }

      console.error('❌ Unexpected JSON structure:', parsed);
      throw new Error('Invalid recipe response structure - no recipes array found');
    } catch (error) {
      console.error('❌ Error parsing recipe search response:', error);
      console.log('🔍 Raw content length:', content.length);
      console.log('🔍 First 500 chars:', content.substring(0, 500));
      console.log('🔍 Last 500 chars:', content.substring(Math.max(0, content.length - 500)));
      
      // Try alternative parsing approaches
      return this.attemptFallbackParsing(content, citations);
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
  private attemptFallbackParsing(content: string, citations: string[] = []): PerplexityRecipe[] {
    console.log('🔄 Attempting fallback parsing methods...');
    
    // Try multiple fallback approaches
    const fallbackMethods = [
      () => this.tryExtractRecipesArray(content, citations),
      () => this.tryFixAndParseComplete(content, citations),
      () => this.tryLenientParsing(content, citations),
    ];
    
    for (let i = 0; i < fallbackMethods.length; i++) {
      try {
        console.log(`🔄 Trying fallback method ${i + 1}...`);
        const method = fallbackMethods[i];
        const result = method ? method() : null;
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
  
  private tryExtractRecipesArray(content: string, citations: string[] = []): PerplexityRecipe[] {
    // Try to extract just the recipes array if the outer structure is broken
    const recipesMatch = content.match(/"recipes"\s*:\s*\[([\s\S]*?)\]/);
    if (recipesMatch) {
      const recipesArrayContent = `[${recipesMatch[1]}]`;
      const fixedArray = this.fixCommonJSONIssues(recipesArrayContent);
      const recipes = JSON.parse(fixedArray);
      return recipes.map((recipe: any, index: number) => this.normalizeRecipe(recipe, citations[index] || citations[0] || ''));
    }
    return [];
  }
  
  private tryFixAndParseComplete(content: string, citations: string[] = []): PerplexityRecipe[] {
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
      return parsed.recipes.map((recipe: any, index: number) => this.normalizeRecipe(recipe, citations[index] || citations[0] || ''));
    }
    return [];
  }
  
  private tryLenientParsing(content: string, citations: string[] = []): PerplexityRecipe[] {
    // Try to manually extract recipe objects even if JSON is completely broken
    const recipeMatches = content.match(/\{[^{}]*"title"\s*:\s*"[^"]*"[^{}]*\}/g);
    if (recipeMatches && recipeMatches.length > 0) {
      const recipes: any[] = [];
      
      for (const match of recipeMatches) {
        try {
          const fixed = this.fixCommonJSONIssues(match);
          const recipe = JSON.parse(fixed);
          recipes.push(this.normalizeRecipe(recipe, citations[recipes.length] || citations[0] || ''));
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
  private normalizeRecipe(recipe: any, citationUrl: string = ''): PerplexityRecipe {
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
          sourceUrl: citationUrl || '',
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
        sourceUrl: citationUrl || recipe.metadata?.sourceUrl || recipe.source || '',
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
   * Parse partial JSON content to extract completed recipes as they stream
   */
  private parsePartialRecipes(content: string): PerplexityRecipe[] {
    try {
      console.log('🔍 Parsing partial content length:', content.length);
      
      // First, try to extract from a complete recipes array structure
      const recipesArrayMatch = content.match(/"recipes"\s*:\s*\[([\s\S]*?)\]/);
      if (recipesArrayMatch && recipesArrayMatch[1]) {
        const arrayContent = recipesArrayMatch[1];
        console.log('📦 Found recipes array content length:', arrayContent.length);
        
        // Look for complete recipe objects within the array
        const completeRecipes = this.extractCompleteRecipeObjects(arrayContent);
        if (completeRecipes.length > 0) {
          console.log('✅ Extracted', completeRecipes.length, 'complete recipes from array');
          return completeRecipes;
        }
      }
      
      // Fallback: Look for standalone recipe objects anywhere in the content
      const standaloneRecipes = this.extractCompleteRecipeObjects(content);
      console.log('🔍 Found', standaloneRecipes.length, 'standalone recipes');
      
      return standaloneRecipes;
    } catch (error) {
      console.log('❌ Failed to parse partial recipes:', error);
      return [];
    }
  }

  /**
   * Extract complete recipe objects from JSON content
   */
  private extractCompleteRecipeObjects(content: string): PerplexityRecipe[] {
    const partialRecipes: PerplexityRecipe[] = [];
    
    // Look for recipe objects that have at least title, ingredients, and instructions
    const recipePattern = /\{\s*"title"\s*:\s*"[^"]*"[\s\S]*?\}/g;
    const recipeMatches = content.match(recipePattern);
    
    if (!recipeMatches) {
      return [];
    }

    console.log('🔍 Found', recipeMatches.length, 'potential recipe objects');
    
    for (let i = 0; i < recipeMatches.length; i++) {
      const match = recipeMatches[i];
      
      if (!match) continue;
      
      try {
        // Check if this recipe has essential fields before parsing
        const hasIngredients = /"ingredients"\s*:\s*\[/.test(match);
        const hasInstructions = /"instructions"\s*:\s*\[/.test(match);
        
        if (!hasIngredients || !hasInstructions) {
          console.log(`⏭️ Recipe ${i + 1} incomplete - missing ingredients:${!hasIngredients} or instructions:${!hasInstructions}`);
          continue;
        }
        
        // Try to balance braces to get a complete JSON object
        const balancedMatch = this.balanceJsonObject(match);
        const cleanMatch = this.fixCommonJSONIssues(balancedMatch);
        
        console.log(`🔧 Attempting to parse recipe ${i + 1}:`, cleanMatch.substring(0, 100) + '...');
        
        const recipe = JSON.parse(cleanMatch);
        
        // Validate essential fields
        if (recipe.title && recipe.ingredients && recipe.instructions && 
            Array.isArray(recipe.ingredients) && Array.isArray(recipe.instructions)) {
          
          console.log(`✅ Successfully parsed recipe ${i + 1}:`, recipe.title);
          partialRecipes.push(this.normalizeRecipe(recipe, ''));
        } else {
          console.log(`⚠️ Recipe ${i + 1} missing essential fields:`, {
            title: !!recipe.title,
            ingredients: Array.isArray(recipe.ingredients),
            instructions: Array.isArray(recipe.instructions)
          });
        }
      } catch (e) {
        console.log(`❌ Failed to parse recipe ${i + 1}:`, e instanceof Error ? e.message : e);
        continue;
      }
    }
    
    return partialRecipes;
  }

  /**
   * Balance JSON object braces to ensure completeness
   */
  private balanceJsonObject(jsonString: string): string {
    let braceCount = 0;
    let lastValidIndex = -1;
    
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString[i];
      
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          lastValidIndex = i;
        }
      }
    }
    
    // If braces are balanced, return as is
    if (braceCount === 0 && lastValidIndex >= 0) {
      return jsonString.substring(0, lastValidIndex + 1);
    }
    
    // If unbalanced, try to close the object
    if (braceCount > 0) {
      return jsonString + '}'.repeat(braceCount);
    }
    
    return jsonString;
  }

  /**
   * Extract progressive recipe count from partial content
   */
  private getProgressiveRecipeCount(content: string): number {
    // Count recipe objects that appear to be complete or near-complete
    const titleMatches = content.match(/"title"\s*:\s*"[^"]*"/g);
    return titleMatches ? titleMatches.length : 0;
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
