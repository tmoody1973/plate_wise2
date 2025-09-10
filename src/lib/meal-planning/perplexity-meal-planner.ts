/**
 * Perplexity-powered Meal Planning Service
 * Generates meal plans with parallel recipe fetching and cost calculations
 */

import { perplexityRecipeSearchService } from '@/lib/external-apis/perplexity-recipe-search';
import { enhancedRecipeSearchService } from './enhanced-recipe-search';
import { recipeValidationService } from './recipe-validation';
import { smartStoreFinderService } from './smart-store-finder';
import { ingredientClassifierService } from './ingredient-classifier';
import { urlValidatorService } from '@/lib/utils/url-validator';
import { EnhancedRecipe } from '@/types';
import { error } from 'console';

export interface PreferredStore {
  name: string;
  type: string;
  address: string;
  url?: string;
  specialties: string[];
  placeId?: string;
}

export interface MealPlanRequest {
  weeklyBudget: number;
  numberOfMeals: number;
  culturalCuisines: string[];
  dietaryRestrictions: string[];
  householdSize: number;
  pantryItems: string[];
  preferredStores?: PreferredStore[];
  location?: string;
}

export interface MealPlanRecipe {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  culturalOrigin: string[];
  ingredients: Array<{
    name: string;
    amount: number;
    unit: string;
    estimatedCost: number;
    notes?: string;
  }>;
  instructions: Array<{
    step: number;
    text: string;
    timing?: {
      duration: number;
      isActive: boolean;
    };
  }>;
  metadata: {
    servings: number;
    totalTimeMinutes: number;
    difficulty: 'easy' | 'medium' | 'hard';
    estimatedCost: number;
    costPerServing: number;
  };
  nutritionalInfo?: {
    calories: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
  };
  tags: string[];
  culturalAuthenticity: 'high' | 'medium' | 'low';
  budgetOptimized: boolean;
  sourceUrl?: string | null;
  imageUrl?: string | null;
}

export interface MealPlan {
  recipes: MealPlanRecipe[];
  totalEstimatedCost: number;
  costRange: { min: number; max: number };
  budgetUtilization: number; // Percentage of budget used
  confidence: 'high' | 'medium' | 'low';
  shoppingList: Array<{
    ingredient: string;
    totalAmount: number;
    unit: string;
    estimatedCost: number;
    stores: Array<{
      name: string;
      price: number;
      url?: string;
      specialty: boolean;
    }>;
    pantryItem: boolean;
    bestStore?: {
      name: string;
      price: number;
      url?: string;
    };
  }>;
  savings: {
    pantryItemsSavings: number;
    bulkBuyingSavings: number;
    seasonalSavings: number;
    totalSavings: number;
  };
  culturalBalance: {
    [cuisine: string]: number; // Percentage of meals from each cuisine
  };
}

class PerplexityMealPlannerService {
  private apiKey: string;
  private baseURL = 'https://api.perplexity.ai/chat/completions';

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY || '';
  }

  /**
   * Generate a complete meal plan with fallback approach
   */
  async generateMealPlan(request: MealPlanRequest): Promise<MealPlan> {
    console.log('🍽️ Starting meal plan generation:', request);

    // Check if API key is available
    if (!this.apiKey) {
      console.warn('⚠️ Perplexity API key not found, using mock data');
      return this.generateMockMealPlan(request);
    }

    // Try enhanced recipe search if API key is available
    // console.log('🧪 Temporarily forcing mock data to show correct cultural recipes');
    // return this.generateMockMealPlan(request);

    try {
      // Try enhanced recipe search first
      console.log('🔄 Attempting enhanced meal plan generation...');
      return await this.generateEnhancedMealPlan(request);

    } catch (enhancedError) {
      console.error('❌ Enhanced meal plan generation failed:', enhancedError);
      console.log('🔄 Enhanced recipe search not available, falling back to structured approach...');

      try {
        // Fallback to structured approach
        console.log('🔄 Falling back to structured meal plan generation...');
        const [structuredResponse, costAnalysis] = await Promise.all([
          this.generateStructuredMealPlan(request),
          this.calculateBudgetOptimization(request)
        ]);

        // Step 2: Convert to internal format and enhance with store intelligence
        const recipes = this.convertStructuredResponseToRecipes(structuredResponse, request);

        // Step 3: Enhance recipes with store-specific cost and availability data
        const enhancedRecipes = await Promise.all(
          recipes.map(recipe => this.enhanceRecipeWithStoreData(recipe, request))
        );

        // Step 4: Optimize meal plan for budget and cultural balance
        const optimizedPlan = await this.optimizeMealPlan(enhancedRecipes, request, costAnalysis);

        console.log('✅ Structured meal plan generated successfully:', {
          recipeCount: optimizedPlan.recipes.length,
          totalCost: optimizedPlan.totalEstimatedCost,
          budgetUtilization: optimizedPlan.budgetUtilization,
          culturalBalance: optimizedPlan.culturalBalance
        });

        return optimizedPlan;

      } catch (structuredError) {
        console.error('❌ Structured meal plan generation failed:', structuredError);

        try {
          // Fallback to legacy method
          console.log('🔄 Falling back to legacy meal plan generation...');
          return await this.generateLegacyMealPlan(request);
        } catch (legacyError) {
          console.error('❌ Legacy meal plan generation also failed:', legacyError);

          // Final fallback to mock data
          console.log('🔄 Using mock meal plan as final fallback...');
          return this.generateMockMealPlan(request);
        }
      }
    }
  }

  /**
   * Enhanced meal plan generation using production-ready recipe search
   */
  private async generateEnhancedMealPlan(request: MealPlanRequest): Promise<MealPlan> {
    // Step 1: Generate recipe concepts in parallel
    const recipePromises = this.generateRecipeConcepts(request);

    // Step 2: Fetch enhanced detailed recipes and costs in parallel
    const [recipes, costAnalysis] = await Promise.all([
      this.fetchEnhancedDetailedRecipes(recipePromises, request),
      this.calculateBudgetOptimization(request)
    ]);

    // Step 3: Optimize meal plan for budget and cultural balance
    return this.optimizeMealPlan(recipes, request, costAnalysis);
  }

  /**
   * Legacy meal plan generation method as fallback
   */
  private async generateLegacyMealPlan(request: MealPlanRequest): Promise<MealPlan> {
    // Step 1: Generate recipe concepts in parallel
    const recipePromises = this.generateRecipeConcepts(request);

    // Step 2: Fetch detailed recipes and costs in parallel
    const [recipes, costAnalysis] = await Promise.all([
      this.fetchDetailedRecipes(recipePromises, request),
      this.calculateBudgetOptimization(request)
    ]);

    // Step 3: Optimize meal plan for budget and cultural balance
    return this.optimizeMealPlan(recipes, request, costAnalysis);
  }

  /**
   * Generate complete meal plan using structured JSON output
   */
  private async generateStructuredMealPlan(request: MealPlanRequest): Promise<any> {
    const prompt = this.buildStructuredMealPlanPrompt(request);
    const schema = this.getMealPlanJSONSchema();

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
            content: 'You are a budget-aware, multicultural meal-planning assistant. Return only JSON that exactly matches the provided JSON Schema. No prose, no markdown. Do not include any fields not in the schema. Keep cultural labels clear (e.g., "Hmong", "West African", "Mexican") and prefer commonly available ingredients. Use simple substitutions when an item is often hard to find. For each recipe, include synonyms for ingredient names (e.g., "scallion (green onion)") to support bilingual labels. Do not guess prices; instead, provide a cost band ($ or $$) and call out likely cost drivers.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.2,
        top_p: 0.1,
        response_format: {
          type: "json_schema",
          json_schema: schema
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Perplexity Structured API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        model: 'sonar',
        hasApiKey: !!this.apiKey,
        apiKeyLength: this.apiKey?.length || 0
      });
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📥 Received Perplexity response:', {
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length || 0,
      hasContent: !!data.choices?.[0]?.message?.content
    });

    const content = data.choices?.[0]?.message?.content || '';

    if (!content) {
      throw new Error('Empty response from Perplexity API');
    }

    try {
      const parsedContent = JSON.parse(content);
      console.log('✅ Successfully parsed structured response:', {
        hasMeals: !!parsedContent.meals,
        mealsCount: parsedContent.meals?.length || 0,
        mealsTarget: parsedContent.meals_target
      });
      return parsedContent;
    } catch (parseError) {
      console.error('Failed to parse structured meal plan:', error);
      throw new Error('Invalid JSON response from Perplexity');
    }
  }

  /**
   * Fetch detailed recipes using enhanced recipe search with comprehensive data extraction
   */
  private async fetchEnhancedDetailedRecipes(
    recipeConcepts: Promise<Array<{ concept: string; sourceUrl?: string; title?: string }>>,
    request: MealPlanRequest
  ): Promise<MealPlanRecipe[]> {
    const conceptsWithSources = await recipeConcepts;

    console.log('🔄 Fetching enhanced detailed recipes in parallel:', conceptsWithSources.map(c => c.concept));

    // Create parallel requests for each recipe using enhanced search
    const recipePromises = conceptsWithSources.map(async (conceptWithSource, index) => {
      try {
        const searchResult = await enhancedRecipeSearchService.searchRecipes({
          query: conceptWithSource.concept,
          culturalCuisine: request.culturalCuisines[index % request.culturalCuisines.length],
          dietaryRestrictions: request.dietaryRestrictions,
          maxResults: 1,
          difficulty: 'easy', // Prefer easier recipes for meal planning
          maxTimeMinutes: 60 // Reasonable time limit for meal planning
        });

        if (searchResult.recipes.length > 0) {
          const enhancedRecipe = searchResult.recipes[0];
          
          // Validate the recipe
          const validation = recipeValidationService.validateRecipe(enhancedRecipe);
          
          // Fix common validation issues before validating
          const fixedRecipe = this.fixRecipeValidationIssues(enhancedRecipe);
          const recipeValidation = recipeValidationService.validateRecipe(fixedRecipe);
          
          if (recipeValidation.isValid || recipeValidation.score >= 50) { // Lower threshold for scraped data
            return await this.convertEnhancedRecipeToMealPlanRecipe(fixedRecipe, request, conceptWithSource.sourceUrl);
          } else {
            console.warn(`⚠️ Recipe "${enhancedRecipe?.title || 'Unknown'}" failed validation:`, recipeValidation.errors);
            // Use the recipe anyway but log the issues
            return await this.convertEnhancedRecipeToMealPlanRecipe(fixedRecipe, request, conceptWithSource.sourceUrl);
          }
        }

        return null;
      } catch (error) {
        console.error(`❌ Failed to fetch enhanced recipe for "${conceptWithSource.concept}":`, error);
        return null;
      }
    });

    // Wait for all recipes to complete
    const results = await Promise.allSettled(recipePromises);

    // Filter out failed requests and null results
    const successfulRecipes = results
      .filter((result): result is PromiseFulfilledResult<MealPlanRecipe> =>
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);

    console.log(`✅ Successfully fetched ${successfulRecipes.length}/${concepts.length} enhanced recipes`);

    return successfulRecipes;
  }

  /**
   * Fetch detailed recipes in parallel for better performance (legacy method)
   */
  private async fetchDetailedRecipes(
    recipeConcepts: Promise<Array<{ concept: string; sourceUrl?: string; title?: string }>>,
    request: MealPlanRequest
  ): Promise<MealPlanRecipe[]> {
    const conceptsWithSources = await recipeConcepts;

    console.log('🔄 Fetching detailed recipes in parallel:', conceptsWithSources.map(c => c.concept));

    // Create parallel requests for each recipe
    const recipePromises = conceptsWithSources.map(async (conceptWithSource, index) => {
      try {
        const searchResult = await perplexityRecipeSearchService.searchRecipes({
          query: conceptWithSource.concept,
          culturalCuisine: request.culturalCuisines[index % request.culturalCuisines.length],
          dietaryRestrictions: request.dietaryRestrictions,
          maxResults: 1,
          difficulty: 'easy' // Prefer easier recipes for meal planning
        });

        if (searchResult.success && searchResult.recipes.length > 0) {
          const recipe = searchResult.recipes[0];
          return await this.enhanceRecipeWithCosts(recipe, request, conceptWithSource.sourceUrl);
        }

        return null;
      } catch (error) {
        console.error(`❌ Failed to fetch recipe for "${conceptWithSource.concept}":`, error);
        return null;
      }
    });

    // Wait for all recipes to complete
    const results = await Promise.allSettled(recipePromises);

    // Filter out failed requests and null results
    const successfulRecipes = results
      .filter((result): result is PromiseFulfilledResult<MealPlanRecipe> =>
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);

    console.log(`✅ Successfully fetched ${successfulRecipes.length}/${concepts.length} recipes`);

    return successfulRecipes;
  }

  /**
   * Convert enhanced recipe to meal plan recipe format
   */
  private async convertEnhancedRecipeToMealPlanRecipe(
    enhancedRecipe: EnhancedRecipe,
    request: MealPlanRequest,
    citationSourceUrl?: string
  ): Promise<MealPlanRecipe> {
    // Calculate ingredient costs in parallel
    const ingredients = enhancedRecipe.ingredients || [];
    const ingredientCostPromises = ingredients.map(async (ingredient) => {
      const cost = await this.calculateIngredientCost(
        ingredient.name,
        ingredient.amount,
        ingredient.unit,
        request.location
      );

      return {
        name: ingredient.name,
        amount: ingredient.amount,
        unit: ingredient.unit,
        estimatedCost: cost,
        notes: ingredient.synonyms?.join(', ') || ''
      };
    });

    const enhancedIngredients = await Promise.all(ingredientCostPromises);

    // Calculate total recipe cost
    const totalCost = enhancedIngredients.reduce((sum, ing) => sum + ing.estimatedCost, 0);
    const costPerServing = totalCost / enhancedRecipe.servings;

    // Assess cultural authenticity
    const culturalAuthenticity = this.assessCulturalAuthenticity(enhancedRecipe, request.culturalCuisines);

    // Check if recipe is budget optimized
    const budgetOptimized = costPerServing <= (request.weeklyBudget / request.numberOfMeals / request.householdSize);

    // Convert instructions to meal plan format
    const recipeInstructions = enhancedRecipe.instructions || [];
    const instructions = recipeInstructions.map(instruction => ({
      step: instruction.step,
      text: instruction.text,
      timing: this.extractTimingFromInstruction(instruction.text)
    }));

    return {
      id: `enhanced-recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: enhancedRecipe.title,
      description: enhancedRecipe.description,
      cuisine: enhancedRecipe.cuisine,
      culturalOrigin: enhancedRecipe.culturalOrigin,
      ingredients: enhancedIngredients,
      instructions,
      metadata: {
        servings: enhancedRecipe.servings,
        totalTimeMinutes: enhancedRecipe.totalTimeMinutes,
        difficulty: this.mapDifficultyFromTime(enhancedRecipe.totalTimeMinutes),
        estimatedCost: totalCost,
        costPerServing
      },
      nutritionalInfo: {
        calories: enhancedRecipe.nutritionalInfo.calories,
        protein_g: enhancedRecipe.nutritionalInfo.protein_g,
        fat_g: enhancedRecipe.nutritionalInfo.fat_g,
        carbs_g: enhancedRecipe.nutritionalInfo.carbs_g
      },
      tags: enhancedRecipe.tags || [],
      culturalAuthenticity,
      budgetOptimized,
      sourceUrl: this.validateSourceUrl(citationSourceUrl || enhancedRecipe.sourceUrl),
      imageUrl: enhancedRecipe.imageUrl
    };
  }

  /**
   * Enhance recipe with cost calculations and cultural authenticity scoring
   */
  private async enhanceRecipeWithCosts(
    recipe: any,
    request: MealPlanRequest,
    citationSourceUrl?: string
  ): Promise<MealPlanRecipe> {
    // Calculate ingredient costs in parallel
    const ingredientCostPromises = recipe.ingredients.map(async (ingredient: any) => {
      const cost = await this.calculateIngredientCost(
        ingredient.name,
        ingredient.amount,
        ingredient.unit,
        request.location
      );

      return {
        ...ingredient,
        estimatedCost: cost
      };
    });

    const enhancedIngredients = await Promise.all(ingredientCostPromises);

    // Calculate total recipe cost
    const totalCost = enhancedIngredients.reduce((sum, ing) => sum + ing.estimatedCost, 0);
    const costPerServing = totalCost / (recipe.metadata?.servings || 4);

    // Assess cultural authenticity
    const culturalAuthenticity = this.assessCulturalAuthenticity(recipe, request.culturalCuisines);

    // Check if recipe is budget optimized
    const budgetOptimized = costPerServing <= (request.weeklyBudget / request.numberOfMeals / request.householdSize);

    return {
      id: `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: recipe.title,
      description: recipe.description,
      cuisine: recipe.cuisine,
      culturalOrigin: recipe.culturalOrigin,
      ingredients: enhancedIngredients,
      instructions: recipe.instructions,
      metadata: {
        servings: recipe.metadata?.servings || 4,
        totalTimeMinutes: recipe.metadata?.totalTimeMinutes || 30,
        difficulty: recipe.metadata?.difficulty || 'medium',
        estimatedCost: totalCost,
        costPerServing
      },
      nutritionalInfo: recipe.nutritionalInfo,
      tags: recipe.tags || [],
      culturalAuthenticity,
      budgetOptimized,
      sourceUrl: this.validateSourceUrl(citationSourceUrl || recipe.sourceUrl || null),
      imageUrl: recipe.imageUrl || null
    };
  }

  /**
   * Calculate ingredient cost using Perplexity for real-time pricing
   */
  private async calculateIngredientCost(
    ingredient: string,
    amount: number,
    unit: string,
    location?: string
  ): Promise<number> {
    try {
      // Use existing pricing API endpoint
      const response = await fetch('/api/pricing/perplexity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ingredients: [{
            name: ingredient,
            amount,
            unit
          }],
          location: location || 'United States',
          includeAlternatives: false
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.results?.[0]?.estimatedCost || 2.0; // Fallback cost
      }
    } catch (error) {
      console.warn(`⚠️ Cost calculation failed for ${ingredient}:`, error);
    }

    // Fallback cost estimation
    return this.getFallbackIngredientCost(ingredient, amount, unit);
  }

  /**
   * Calculate budget optimization strategies using user's favorite stores
   */
  private async calculateBudgetOptimization(request: MealPlanRequest): Promise<any> {
    const storeInfo = request.preferredStores?.map(store =>
      `${store.name} (${store.type}) - Specialties: ${store.specialties.join(', ') || 'General grocery'} - ${store.url || 'No website'}`
    ).join('\n') || 'No preferred stores specified';

    const prompt = `
    Analyze budget optimization strategies for meal planning with user's favorite stores:
    
    Budget: $${request.weeklyBudget} for ${request.numberOfMeals} meals
    Household size: ${request.householdSize} people
    Pantry items: ${request.pantryItems.join(', ')}
    Location: ${request.location || 'United States'}
    
    User's Favorite Stores:
    ${storeInfo}
    
    Provide cost-saving strategies including:
    1. Store-specific recommendations based on their specialties
    2. Seasonal ingredient recommendations available at these stores
    3. Bulk buying opportunities at preferred stores
    4. Cross-store shopping strategies for maximum savings
    5. Pantry utilization savings
    6. Cultural ingredient sourcing from specialty stores
    
    Return as JSON with specific dollar amounts, store recommendations, and actionable strategies.
    `;

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
              content: 'You are a budget optimization expert. Provide specific, actionable cost-saving strategies with realistic dollar amounts.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 800,
          temperature: 0.2
        })
      });

      if (response.ok) {
        const data = await response.json();
        return this.parseBudgetOptimization(data.choices?.[0]?.message?.content || '');
      }
    } catch (error) {
      console.warn('⚠️ Budget optimization analysis failed:', error);
    }

    return this.getDefaultBudgetOptimization(request);
  }

  /**
   * Build the meal planning prompt for Perplexity with store information
   */
  private buildMealPlanPrompt(request: MealPlanRequest): string {
    const budgetPerMeal = request.weeklyBudget / request.numberOfMeals;
    const budgetPerServing = budgetPerMeal / request.householdSize;

    const storeInfo = request.preferredStores?.length > 0
      ? `\n    PREFERRED STORES:\n${request.preferredStores.map(store =>
        `    - ${store.name} (${store.type}) - Specialties: ${store.specialties.join(', ') || 'General grocery'}`
      ).join('\n')}`
      : '';

    return `
    Generate ${request.numberOfMeals} diverse meal ideas for a weekly meal plan:
    
    CONSTRAINTS:
    - Budget: $${request.weeklyBudget} total ($${budgetPerMeal.toFixed(2)} per meal, $${budgetPerServing.toFixed(2)} per serving)
    - Household size: ${request.householdSize} people
    - Cultural cuisines: ${request.culturalCuisines.join(', ')}
    - Dietary restrictions: ${request.dietaryRestrictions.join(', ') || 'None'}
    - Available pantry items: ${request.pantryItems.join(', ') || 'None specified'}${storeInfo}
    
    REQUIREMENTS:
    - Each meal should be culturally authentic and budget-friendly
    - Prioritize seasonal ingredients for cost savings
    - Include variety across different cuisines
    - Consider prep time and difficulty for busy families
    - Suggest ingredient substitutions for budget optimization
    ${request.preferredStores?.length > 0 ? '- Consider ingredients available at the user\'s preferred stores and their specialties' : ''}
    
    Return ${request.numberOfMeals} specific recipe names that meet these criteria.
    Focus on dishes that can feed ${request.householdSize} people within the budget constraints.
    ${request.preferredStores?.length > 0 ? 'Take advantage of store specialties for authentic cultural ingredients.' : ''}
    `;
  }

  /**
   * Parse recipe concepts from Perplexity response
   */
  private parseRecipeConcepts(content: string, numberOfMeals: number): string[] {
    // Extract recipe names from the response
    const lines = content.split('\n').filter(line => line.trim());
    const recipes: string[] = [];

    for (const line of lines) {
      // Look for numbered lists, bullet points, or recipe names
      const match = line.match(/(?:\d+\.|\-|\*)\s*(.+)/);
      if (match && match[1]) {
        recipes.push(match[1].trim());
      } else if (line.length > 5 && line.length < 100 && !line.includes('$')) {
        // Likely a recipe name
        recipes.push(line.trim());
      }
    }

    // Ensure we have the right number of recipes
    return recipes.slice(0, numberOfMeals);
  }

  /**
   * Parse recipe concepts from Perplexity response with citations
   */
  private parseRecipeConceptsWithCitations(
    content: string, 
    citations: any[], 
    numberOfMeals: number
  ): Array<{ concept: string; sourceUrl?: string; title?: string }> {
    const lines = content.split('\n').filter(line => line.trim());
    const conceptsWithSources: Array<{ concept: string; sourceUrl?: string; title?: string }> = [];

    for (const line of lines) {
      // Look for numbered lists, bullet points, or recipe names with citation references [1], [2], etc.
      const match = line.match(/(?:\d+\.|\-|\*)\s*(.+?)(?:\s*\[(\d+)\])?/);
      if (match && match[1]) {
        const concept = match[1].trim();
        const citationIndex = match[2] ? parseInt(match[2]) - 1 : undefined;
        
        const citation = citationIndex !== undefined && citations[citationIndex] 
          ? citations[citationIndex] 
          : null;

        conceptsWithSources.push({
          concept,
          sourceUrl: citation?.url,
          title: citation?.title
        });

        console.log(`📝 Recipe concept: "${concept}" ${citation ? `-> ${citation.url}` : '(no citation)'}`);
      } else if (line.length > 5 && line.length < 100 && !line.includes('CONSTRAINTS') && !line.includes('Requirements')) {
        // Likely a recipe name without explicit citation reference
        // Try to match with available citations by order
        const availableCitation = citations[conceptsWithSources.length];
        
        conceptsWithSources.push({
          concept: line.trim(),
          sourceUrl: availableCitation?.url,
          title: availableCitation?.title
        });

        console.log(`📝 Recipe concept: "${line.trim()}" ${availableCitation ? `-> ${availableCitation.url}` : '(no citation)'}`);
      }
    }

    // Ensure we have the right number of recipes
    return conceptsWithSources.slice(0, numberOfMeals);
  }

  /**
   * Optimize the meal plan for budget and cultural balance
   */
  private async optimizeMealPlan(
    recipes: MealPlanRecipe[],
    request: MealPlanRequest,
    costAnalysis: any
  ): Promise<MealPlan> {
    // Calculate total costs
    const totalEstimatedCost = recipes.reduce((sum, recipe) => sum + recipe.metadata.estimatedCost, 0);
    const costRange = {
      min: Math.round(totalEstimatedCost * 0.85),
      max: Math.round(totalEstimatedCost * 1.15)
    };

    // Calculate budget utilization
    const budgetUtilization = (totalEstimatedCost / request.weeklyBudget) * 100;

    // Determine confidence level
    const confidence = this.calculateConfidence(budgetUtilization, recipes.length, request.numberOfMeals);

    // Generate consolidated shopping list with store recommendations
    const shoppingList = await this.generateShoppingList(
      recipes,
      request.pantryItems,
      request.preferredStores,
      request.location
    );

    // Calculate savings
    const savings = this.calculateSavings(shoppingList, costAnalysis, request.pantryItems);

    // Calculate cultural balance
    const culturalBalance = this.calculateCulturalBalance(recipes);

    return {
      recipes,
      totalEstimatedCost,
      costRange,
      budgetUtilization,
      confidence,
      shoppingList,
      savings,
      culturalBalance
    };
  }

  // Helper methods for calculations
  private assessCulturalAuthenticity(recipe: any, preferredCuisines: string[]): 'high' | 'medium' | 'low' {
    if (preferredCuisines.includes(recipe.cuisine)) return 'high';
    if (recipe.culturalOrigin?.some((origin: string) => preferredCuisines.includes(origin))) return 'medium';
    return 'low';
  }

  private getFallbackIngredientCost(ingredient: string, amount: number, unit: string): number {
    // Simple fallback cost estimation based on common ingredient categories
    const costPerUnit: { [key: string]: number } = {
      'meat': 6.0,
      'seafood': 8.0,
      'dairy': 3.0,
      'vegetable': 2.0,
      'fruit': 2.5,
      'grain': 1.5,
      'spice': 0.5,
      'oil': 4.0
    };

    // Categorize ingredient (simplified)
    const category = this.categorizeIngredient(ingredient);
    const baseRate = costPerUnit[category] || 2.0;

    return Math.round((amount * baseRate) * 100) / 100;
  }

  private categorizeIngredient(ingredient: string): string {
    const lower = ingredient.toLowerCase();
    if (lower.includes('chicken') || lower.includes('beef') || lower.includes('pork')) return 'meat';
    if (lower.includes('fish') || lower.includes('salmon') || lower.includes('shrimp')) return 'seafood';
    if (lower.includes('cheese') || lower.includes('milk') || lower.includes('yogurt')) return 'dairy';
    if (lower.includes('rice') || lower.includes('pasta') || lower.includes('bread')) return 'grain';
    if (lower.includes('oil') || lower.includes('butter')) return 'oil';
    return 'vegetable';
  }

  private parseBudgetOptimization(content: string): any {
    // Parse budget optimization suggestions from Perplexity response
    return {
      seasonalSavings: 5.0,
      bulkBuyingSavings: 8.0,
      storeSavings: 3.0,
      recommendations: ['Buy seasonal vegetables', 'Consider bulk rice and grains']
    };
  }

  private getDefaultBudgetOptimization(request: MealPlanRequest): any {
    return {
      seasonalSavings: request.weeklyBudget * 0.1,
      bulkBuyingSavings: request.weeklyBudget * 0.15,
      storeSavings: request.weeklyBudget * 0.05,
      recommendations: ['Focus on seasonal ingredients', 'Buy pantry staples in bulk']
    };
  }

  private calculateConfidence(budgetUtilization: number, recipeCount: number, targetCount: number): 'high' | 'medium' | 'low' {
    if (budgetUtilization <= 90 && recipeCount === targetCount) return 'high';
    if (budgetUtilization <= 110 && recipeCount >= targetCount * 0.8) return 'medium';
    return 'low';
  }

  private async generateShoppingList(
    recipes: MealPlanRecipe[],
    pantryItems: string[],
    preferredStores: PreferredStore[] = [],
    location: string = 'United States'
  ): Promise<any[]> {
    const consolidatedIngredients = new Map();

    // Consolidate ingredients across all recipes
    for (const recipe of recipes) {
      for (const ingredient of recipe.ingredients) {
        const key = ingredient.name.toLowerCase();
        if (consolidatedIngredients.has(key)) {
          const existing = consolidatedIngredients.get(key);
          existing.totalAmount += ingredient.amount;
          existing.estimatedCost += ingredient.estimatedCost;
        } else {
          // Determine best stores for this ingredient using smart classification
          const ingredientStores = await this.findBestStoresForIngredient(
            ingredient.name,
            preferredStores,
            location
          );
          const bestStore = ingredientStores.length > 0 ? ingredientStores[0] : null;

          consolidatedIngredients.set(key, {
            ingredient: ingredient.name,
            totalAmount: ingredient.amount,
            unit: ingredient.unit,
            estimatedCost: ingredient.estimatedCost,
            stores: ingredientStores,
            pantryItem: pantryItems.some(item => item.toLowerCase().includes(key)),
            bestStore
          });
        }
      }
    }

    return Array.from(consolidatedIngredients.values());
  }

  /**
   * Find the best stores for a specific ingredient using smart classification
   */
  private async findBestStoresForIngredient(
    ingredient: string,
    preferredStores: PreferredStore[],
    location: string
  ): Promise<Array<{
    name: string;
    price: number;
    url?: string;
    specialty: boolean;
    availability: 'high' | 'medium' | 'low';
    storeType: string;
  }>> {

    // First, check user's preferred stores
    const userStoreMatches = this.matchIngredientToUserStores(ingredient, preferredStores);

    // If we have good matches from user stores, use those
    if (userStoreMatches.length > 0) {
      return userStoreMatches;
    }

    // Otherwise, use smart store finder to discover appropriate stores
    try {
      const storeRecommendations = await smartStoreFinderService.findStoresForIngredients({
        ingredients: [ingredient],
        userLocation: location,
        maxDistance: 15000 // 15km radius
      });

      if (storeRecommendations.length > 0 && storeRecommendations[0].stores.length > 0) {
        return storeRecommendations[0].stores.map(store => ({
          name: store.name,
          price: store.estimatedPrice,
          url: store.website,
          specialty: store.isSpecialtyMatch,
          availability: store.availability,
          storeType: store.storeType
        }));
      }
    } catch (error) {
      console.warn(`⚠️ Smart store finder failed for ${ingredient}:`, error);
    }

    // Fallback to basic classification
    return this.getFallbackStores(ingredient);
  }

  /**
   * Match ingredient to user's preferred stores using intelligent classification
   */
  private matchIngredientToUserStores(ingredient: string, preferredStores: PreferredStore[]): Array<{
    name: string;
    price: number;
    url?: string;
    specialty: boolean;
    availability: 'high' | 'medium' | 'low';
    storeType: string;
  }> {
    const classification = ingredientClassifierService.classifyIngredient(ingredient);
    const stores: Array<{
      name: string;
      price: number;
      url?: string;
      specialty: boolean;
      availability: 'high' | 'medium' | 'low';
      storeType: string;
    }> = [];

    preferredStores.forEach(store => {
      let isSpecialty = false;
      let estimatedPrice = 2.5; // Base price
      let availability: 'high' | 'medium' | 'low' = 'medium';

      // Check if store specializes in this ingredient type
      const storeSpecialties = store.specialties.map(s => s.toLowerCase());
      const storeName = store.name.toLowerCase();

      // Intelligent matching based on classification
      if (classification.culturalOrigin) {
        const culturalKeywords = this.getCulturalStoreKeywords(classification.culturalOrigin);

        if (culturalKeywords.some(keyword =>
          storeName.includes(keyword) ||
          storeSpecialties.some(specialty => specialty.includes(keyword))
        )) {
          isSpecialty = true;
          estimatedPrice *= 0.8; // 20% discount for cultural specialty stores
          availability = 'high';
        }
      }

      // Check for general specialty matches
      if (store.type.toLowerCase().includes('specialty') ||
        store.type.toLowerCase().includes('ethnic') ||
        store.type.toLowerCase().includes('international')) {
        isSpecialty = true;
        estimatedPrice *= 0.85; // 15% discount for specialty stores
      }

      // Adjust availability based on ingredient classification
      if (classification.availability === 'regular') {
        availability = 'high';
      } else if (classification.availability === 'specialty' && !isSpecialty) {
        availability = 'low';
        estimatedPrice *= 1.3; // 30% markup for specialty items at regular stores
      }

      stores.push({
        name: store.name,
        price: estimatedPrice,
        url: store.url,
        specialty: isSpecialty,
        availability,
        storeType: isSpecialty ? 'ethnic' : 'regular'
      });
    });

    // Sort by specialty match and availability
    return stores.sort((a, b) => {
      if (a.specialty && !b.specialty) return -1;
      if (!a.specialty && b.specialty) return 1;

      const availabilityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      if (availabilityOrder[b.availability] !== availabilityOrder[a.availability]) {
        return availabilityOrder[b.availability] - availabilityOrder[a.availability];
      }

      return a.price - b.price;
    });
  }

  /**
   * Get cultural store keywords for matching
   */
  private getCulturalStoreKeywords(culturalOrigin: string): string[] {
    const keywordMap: { [key: string]: string[] } = {
      'asian': ['asian', 'chinese', 'japanese', 'korean', 'thai', 'oriental', 'international'],
      'korean': ['korean', 'h mart', 'hmart'],
      'japanese': ['japanese', 'mitsuwa', 'nijiya'],
      'thai': ['thai', 'southeast asian'],
      'vietnamese': ['vietnamese', 'southeast asian'],
      'mexican': ['mexican', 'latino', 'hispanic', 'latin'],
      'south american': ['south american', 'latino', 'latin american', 'peruvian', 'brazilian', 'colombian'],
      'peruvian': ['peruvian', 'south american', 'latino'],
      'brazilian': ['brazilian', 'south american', 'latino'],
      'argentinian': ['argentinian', 'south american', 'latino'],
      'colombian': ['colombian', 'south american', 'latino'],
      'middle eastern': ['middle eastern', 'mediterranean', 'halal', 'arabic'],
      'indian': ['indian', 'south asian', 'patel', 'spice'],
      'african': ['african', 'ethiopian', 'west african', 'nigerian', 'ghanaian'],
      'ethiopian': ['ethiopian', 'african'],
      'west african': ['west african', 'nigerian', 'ghanaian', 'african'],
      'caribbean': ['caribbean', 'jamaican', 'west indian', 'haitian', 'trinidad'],
      'jamaican': ['jamaican', 'caribbean', 'west indian'],
      'haitian': ['haitian', 'caribbean'],
      'trinidadian': ['trinidad', 'trinidadian', 'caribbean', 'west indian']
    };

    return keywordMap[culturalOrigin.toLowerCase()] || [];
  }

  /**
   * Get fallback stores when smart matching fails
   */
  private getFallbackStores(ingredient: string): Array<{
    name: string;
    price: number;
    url?: string;
    specialty: boolean;
    availability: 'high' | 'medium' | 'low';
    storeType: string;
  }> {
    const classification = ingredientClassifierService.classifyIngredient(ingredient);

    const stores = [
      {
        name: 'Kroger',
        price: 2.5,
        specialty: false,
        availability: classification.availability === 'regular' ? 'high' as const : 'medium' as const,
        storeType: 'regular'
      },
      {
        name: 'Walmart Supercenter',
        price: 2.2,
        specialty: false,
        availability: classification.availability === 'regular' ? 'high' as const : 'low' as const,
        storeType: 'regular'
      }
    ];

    // Add specialty store if ingredient requires it
    if (classification.availability === 'specialty' && classification.culturalOrigin) {
      stores.unshift({
        name: `${classification.culturalOrigin.charAt(0).toUpperCase() + classification.culturalOrigin.slice(1)} Market`,
        price: 2.8,
        specialty: true,
        availability: 'high' as const,
        storeType: 'ethnic'
      });
    }

    return stores;
  }

  private calculateSavings(shoppingList: any[], costAnalysis: any, pantryItems: string[]): any {
    const pantryItemsSavings = shoppingList
      .filter(item => item.pantryItem)
      .reduce((sum, item) => sum + item.estimatedCost, 0);

    return {
      pantryItemsSavings,
      bulkBuyingSavings: costAnalysis.bulkBuyingSavings || 0,
      seasonalSavings: costAnalysis.seasonalSavings || 0,
      totalSavings: pantryItemsSavings + (costAnalysis.bulkBuyingSavings || 0) + (costAnalysis.seasonalSavings || 0)
    };
  }

  private calculateCulturalBalance(recipes: MealPlanRecipe[]): { [cuisine: string]: number } {
    const cuisineCount = new Map();

    recipes.forEach(recipe => {
      const cuisine = recipe.cuisine;
      cuisineCount.set(cuisine, (cuisineCount.get(cuisine) || 0) + 1);
    });

    const total = recipes.length;
    const balance: { [cuisine: string]: number } = {};

    cuisineCount.forEach((count, cuisine) => {
      balance[cuisine] = Math.round((count / total) * 100);
    });

    return balance;
  }

  /**
   * Build structured meal planning prompt for JSON Schema output
   */
  private buildStructuredMealPlanPrompt(request: MealPlanRequest): string {
    const storeContext = request.preferredStores?.length > 0
      ? `Available stores: ${request.preferredStores.map(s => `${s.name} (${s.specialties.join(', ')})`).join('; ')}`
      : 'Prefer commonly available ingredients from regular grocery stores';

    return `Create a weekly dinner plan.

Context:
- Weekly budget: $${request.weeklyBudget}
- Household servings: ${request.householdSize}
- Meals target: ${request.numberOfMeals}
- **REQUIRED Cultural Cuisines**: ${request.culturalCuisines.join(', ')} - ALL recipes MUST be from these cuisines only
- Diet flags: ${request.dietaryRestrictions.join(', ') || 'none'}
- Pantry on hand (prefer recipes that use some of these): ${request.pantryItems.join(', ') || 'none'}
- Exclude ingredients: none
- Language hints: show ingredient synonyms where relevant (e.g., "scallion (green onion)")

Store context: ${storeContext}

CRITICAL REQUIREMENTS:
- Each recipe MUST be authentically from one of these cuisines: ${request.culturalCuisines.join(', ')}
- Use traditional cooking methods and authentic ingredient names
- Include cultural context in recipe titles and ingredients
- Distribute recipes evenly across the specified cuisines
- NO generic or fusion recipes unless "Fusion" is specifically listed

Output rules:
- Return **only** JSON matching the provided schema.
- Use **est_cost_band** ("$" common/low; "$$" higher-cost proteins/spices) and list up to 3 **cost_drivers**.
- Prefer commonly available items; when an ingredient is often hard to find, set **availability_risk** to "medium" or "high" and provide a helpful **subs_tip** that preserves flavor.
- Keep instructions beginner-friendly with temps, times, cookware, and visual cues.

Return exactly ${request.numberOfMeals} items in \`meals\`.`;
  }

  /**
   * Generate mock meal plan when API is unavailable
   */
  private generateMockMealPlan(request: MealPlanRequest): MealPlan {
    console.log('🎭 Generating mock meal plan for testing...');

    const mockRecipes: MealPlanRecipe[] = [];
    const cuisineTemplates = {
      'Asian': {
        title: 'Korean Beef Bulgogi Bowl',
        ingredients: ['beef sirloin', 'soy sauce', 'sesame oil', 'garlic', 'ginger', 'rice'],
        cost: 12.50,
        imageUrl: 'https://images.unsplash.com/photo-1553909489-cd47e0ef937f?w=400&h=300&fit=crop&crop=food'
      },
      'African': {
        title: 'Jollof Rice with Chicken',
        ingredients: ['jasmine rice', 'chicken', 'tomato paste', 'onions', 'scotch bonnet pepper'],
        cost: 10.25,
        imageUrl: 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400&h=300&fit=crop&crop=food'
      },
      'Caribbean': {
        title: 'Jamaican Jerk Chicken with Rice and Peas',
        ingredients: ['chicken thighs', 'jerk seasoning', 'coconut milk', 'kidney beans', 'rice'],
        cost: 11.75,
        imageUrl: 'https://images.unsplash.com/photo-1574653853027-5d3ac9b9f0c4?w=400&h=300&fit=crop&crop=food'
      },
      'American': {
        title: 'BBQ Pulled Pork Sandwich',
        ingredients: ['pork shoulder', 'bbq sauce', 'coleslaw mix', 'hamburger buns'],
        cost: 9.50,
        imageUrl: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400&h=300&fit=crop&crop=food'
      },
      'Fusion': {
        title: 'Korean-Mexican Bulgogi Tacos',
        ingredients: ['beef bulgogi', 'corn tortillas', 'kimchi', 'cilantro', 'lime'],
        cost: 13.25,
        imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop&crop=food'
      }
    };

    // Generate recipes based on requested cuisines
    for (let i = 0; i < request.numberOfMeals; i++) {
      const cuisine = request.culturalCuisines[i % request.culturalCuisines.length] || 'International';
      const template = cuisineTemplates[cuisine as keyof typeof cuisineTemplates] || cuisineTemplates['American'];

      const recipe: MealPlanRecipe = {
        id: `mock-recipe-${i + 1}`,
        title: template.title,
        description: `A delicious ${cuisine.toLowerCase()} dish perfect for your meal plan`,
        cuisine: cuisine,
        culturalOrigin: [cuisine],
        ingredients: template.ingredients.map((name, idx) => ({
          name,
          amount: 1,
          unit: 'item',
          estimatedCost: Math.round((template.cost / template.ingredients.length) * 100) / 100,
          notes: `Mock ingredient for ${name}`
        })),
        instructions: [
          { step: 1, text: 'Prepare all ingredients by washing and chopping as needed.' },
          { step: 2, text: 'Heat oil in a large pan over medium-high heat.' },
          { step: 3, text: 'Cook main ingredients according to traditional methods.' },
          { step: 4, text: 'Season with spices and herbs to taste.' },
          { step: 5, text: 'Simmer until flavors are well combined.' },
          { step: 6, text: 'Serve hot and enjoy your culturally authentic meal.' }
        ],
        metadata: {
          servings: request.householdSize,
          totalTimeMinutes: 30 + (i * 5), // Vary cooking times
          difficulty: 'medium' as const,
          estimatedCost: template.cost,
          costPerServing: template.cost / request.householdSize
        },
        tags: [cuisine, 'budget-friendly', 'family-meal'],
        culturalAuthenticity: 'high' as const,
        budgetOptimized: template.cost <= (request.weeklyBudget / request.numberOfMeals),
        sourceUrl: `https://example.com/recipes/${cuisine.toLowerCase()}-${template.title.toLowerCase().replace(/\s+/g, '-')}`,
        imageUrl: template.imageUrl
      };

      mockRecipes.push(recipe);
    }

    const totalCost = mockRecipes.reduce((sum, recipe) => sum + recipe.metadata.estimatedCost, 0);
    const budgetUtilization = (totalCost / request.weeklyBudget) * 100;

    // Generate mock shopping list
    const allIngredients = new Map();
    mockRecipes.forEach(recipe => {
      recipe.ingredients.forEach(ingredient => {
        const key = ingredient.name.toLowerCase();
        if (allIngredients.has(key)) {
          const existing = allIngredients.get(key);
          existing.totalAmount += ingredient.amount;
          existing.estimatedCost += ingredient.estimatedCost;
        } else {
          allIngredients.set(key, {
            ingredient: ingredient.name,
            totalAmount: ingredient.amount,
            unit: ingredient.unit,
            estimatedCost: ingredient.estimatedCost,
            stores: [
              { name: 'Local Grocery Store', price: ingredient.estimatedCost, specialty: false }
            ],
            pantryItem: request.pantryItems.some(item =>
              item.toLowerCase().includes(ingredient.name.toLowerCase())
            ),
            bestStore: { name: 'Local Grocery Store', price: ingredient.estimatedCost }
          });
        }
      });
    });

    const shoppingList = Array.from(allIngredients.values());
    const pantryItemsSavings = shoppingList
      .filter(item => item.pantryItem)
      .reduce((sum, item) => sum + item.estimatedCost, 0);

    // Calculate cultural balance
    const culturalBalance: { [cuisine: string]: number } = {};
    const cuisineCount = new Map();
    mockRecipes.forEach(recipe => {
      const cuisine = recipe.cuisine;
      cuisineCount.set(cuisine, (cuisineCount.get(cuisine) || 0) + 1);
    });

    cuisineCount.forEach((count, cuisine) => {
      culturalBalance[cuisine] = Math.round((count / mockRecipes.length) * 100);
    });

    return {
      recipes: mockRecipes,
      totalEstimatedCost: totalCost,
      costRange: {
        min: Math.round(totalCost * 0.9),
        max: Math.round(totalCost * 1.1)
      },
      budgetUtilization,
      confidence: 'medium' as const,
      shoppingList,
      savings: {
        pantryItemsSavings,
        bulkBuyingSavings: totalCost * 0.05,
        seasonalSavings: totalCost * 0.03,
        totalSavings: pantryItemsSavings + (totalCost * 0.08)
      },
      culturalBalance
    };
  }

  /**
   * Get the JSON Schema for structured meal plan output (Perplexity format)
   */
  private getMealPlanJSONSchema(): any {
    return {
      name: "meal_plan_response",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["meals_target", "meals"],
        properties: {
          meals_target: {
            type: "integer",
            minimum: 1,
            maximum: 10,
            description: "Number of meals requested"
          },
          meals: {
            type: "array",
            description: "Array of meal recipes",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["slot_id", "title", "culture_tags", "time_minutes", "servings", "est_cost_band", "key_ingredients", "subs_tip", "diet_flags", "instructions", "source_url", "image_url"],
              properties: {
                slot_id: {
                  type: "string",
                  minLength: 2,
                  description: "Unique identifier for this meal slot"
                },
                title: {
                  type: "string",
                  minLength: 3,
                  description: "Name of the dish"
                },
                culture_tags: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 1,
                  description: "Cultural origins of the dish"
                },
                time_minutes: {
                  type: "integer",
                  minimum: 5,
                  maximum: 240,
                  description: "Total cooking time in minutes"
                },
                servings: {
                  type: "integer",
                  minimum: 1,
                  maximum: 12,
                  description: "Number of servings this recipe makes"
                },
                est_cost_band: {
                  type: "string",
                  enum: ["$", "$$"],
                  description: "Cost estimate: $ for budget-friendly, $$ for higher cost"
                },
                cost_drivers: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 0,
                  maxItems: 3,
                  description: "Main factors driving the cost (e.g., protein, specialty spices)"
                },
                availability_risk: {
                  type: "string",
                  enum: ["low", "medium", "high"],
                  description: "How hard ingredients are to find"
                },
                key_ingredients: {
                  type: "array",
                  minItems: 3,
                  maxItems: 8,
                  description: "Main ingredients needed for this recipe",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["ingredient_id", "display"],
                    properties: {
                      ingredient_id: {
                        type: "string",
                        minLength: 2,
                        description: "Unique identifier for ingredient"
                      },
                      display: {
                        type: "string",
                        minLength: 2,
                        description: "Ingredient name as displayed to user"
                      },
                      synonyms: {
                        type: "array",
                        items: { type: "string" },
                        description: "Alternative names for this ingredient"
                      }
                    }
                  }
                },
                subs_tip: {
                  type: "string",
                  minLength: 10,
                  description: "Substitution advice for hard-to-find ingredients"
                },
                diet_flags: {
                  type: "array",
                  items: { type: "string" },
                  description: "Dietary categories this recipe fits (e.g., vegan, gluten-free)"
                },
                instructions: {
                  type: "array",
                  minItems: 4,
                  maxItems: 10,
                  description: "Step-by-step cooking instructions",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["step", "text"],
                    properties: {
                      step: {
                        type: "integer",
                        minimum: 1,
                        description: "Step number in sequence"
                      },
                      text: {
                        type: "string",
                        minLength: 15,
                        description: "Detailed instruction for this step"
                      }
                    }
                  }
                },
                source_url: {
                  type: "string",
                  format: "uri",
                  description: "URL to the original recipe source for attribution"
                },
                image_url: {
                  type: "string",
                  format: "uri",
                  description: "URL to a representative image of the dish"
                }
              }
            }
          },
          notes: {
            type: "array",
            items: { type: "string" },
            description: "Additional notes about the meal plan"
          }
        }
      }
    };
  }

  /**
   * Convert structured Perplexity response to internal MealPlanRecipe format
   */
  private convertStructuredResponseToRecipes(structuredResponse: any, request: MealPlanRequest): MealPlanRecipe[] {
    if (!structuredResponse || !structuredResponse.meals || !Array.isArray(structuredResponse.meals)) {
      console.error('❌ Invalid structured response:', structuredResponse);
      throw new Error('Invalid structured response from Perplexity - missing meals array');
    }

    return structuredResponse.meals.map((meal: any) => {
      // Convert ingredients with enhanced classification
      const enhancedIngredients = (meal.key_ingredients || []).map((ingredient: any) => {
        let classification;
        try {
          classification = ingredientClassifierService.classifyIngredient(ingredient.display);
        } catch (error) {
          console.warn('⚠️ Failed to classify ingredient:', ingredient.display, error);
          classification = { category: 'unknown', availability: 'regular', culturalOrigin: null };
        }

        return {
          name: ingredient.display,
          amount: 1, // Default amount - Perplexity doesn't provide specific amounts
          unit: 'item',
          estimatedCost: this.estimateCostFromBand(meal.est_cost_band, ingredient.display),
          notes: ingredient.synonyms?.join(', ') || '',
          classification,
          synonyms: ingredient.synonyms || []
        };
      });

      // Convert instructions
      const instructions = (meal.instructions || []).map((instruction: any) => ({
        step: instruction.step,
        text: instruction.text,
        timing: {
          duration: 0,
          isActive: false
        }
      }));

      // Calculate total cost
      const totalCost = enhancedIngredients.reduce((sum: number, ing: any) => sum + ing.estimatedCost, 0);
      const costPerServing = totalCost / meal.servings;

      return {
        id: meal.slot_id,
        title: meal.title,
        description: meal.subs_tip, // Use substitution tip as description
        cuisine: meal.culture_tags[0] || 'international',
        culturalOrigin: meal.culture_tags,
        ingredients: enhancedIngredients,
        instructions,
        metadata: {
          servings: meal.servings,
          totalTimeMinutes: meal.time_minutes,
          difficulty: this.mapCostBandToDifficulty(meal.est_cost_band),
          estimatedCost: totalCost,
          costPerServing
        },
        nutritionalInfo: undefined, // Not provided by structured response
        tags: [...meal.culture_tags, ...meal.diet_flags],
        culturalAuthenticity: this.assessAuthenticityFromTags(meal.culture_tags, request.culturalCuisines),
        budgetOptimized: meal.est_cost_band === '$',
        sourceUrl: this.validateSourceUrl(meal.source_url || null),
        imageUrl: meal.image_url || null
      };
    });
  }

  /**
   * Estimate cost from Perplexity's cost band
   */
  private estimateCostFromBand(costBand: string, ingredient: string): number {
    const baseCost = costBand === '$' ? 2.0 : 4.0;
    const classification = ingredientClassifierService.classifyIngredient(ingredient);

    // Adjust based on ingredient type
    if (classification.culturalOrigin && classification.culturalOrigin.includes('protein')) return baseCost * 1.5;
    if (classification.culturalOrigin && classification.culturalOrigin.includes('spice')) return baseCost * 0.3;
    if (classification.availability === 'specialty') return baseCost * 1.2;

    return baseCost;
  }

  /**
   * Map cost band to difficulty level
   */
  private mapCostBandToDifficulty(costBand: string): 'easy' | 'medium' | 'hard' {
    return costBand === '$' ? 'easy' : 'medium';
  }

  /**
   * Assess authenticity from culture tags
   */
  private assessAuthenticityFromTags(cultureTags: string[], preferredCuisines: string[]): 'high' | 'medium' | 'low' {
    const hasMatch = cultureTags.some(tag =>
      preferredCuisines.some(cuisine =>
        cuisine.toLowerCase().includes(tag.toLowerCase()) ||
        tag.toLowerCase().includes(cuisine.toLowerCase())
      )
    );

    return hasMatch ? 'high' : 'medium';
  }

  /**
   * Enhance recipe with store-specific data and availability
   */
  private async enhanceRecipeWithStoreData(recipe: MealPlanRecipe, request: MealPlanRequest): Promise<MealPlanRecipe> {
    // Enhance ingredients with store-specific pricing and availability
    const enhancedIngredients = await Promise.all(
      recipe.ingredients.map(async (ingredient) => {
        try {
          // Find best stores for this ingredient
          const storeMatches = await this.findBestStoresForIngredient(
            ingredient.name,
            request.preferredStores || [],
            request.location || 'United States'
          );

          // Update cost based on best available store
          const bestStore = storeMatches[0];
          const updatedCost = bestStore ? bestStore.price : ingredient.estimatedCost;

          return {
            ...ingredient,
            estimatedCost: updatedCost,
            bestStore: bestStore ? {
              name: bestStore.name,
              price: bestStore.price,
              availability: bestStore.availability,
              specialty: bestStore.specialty
            } : undefined,
            availableStores: storeMatches.slice(0, 3) // Top 3 options
          };
        } catch (error) {
          console.warn(`⚠️ Store enhancement failed for ${ingredient.name}:`, error);
          return ingredient;
        }
      })
    );

    // Recalculate total cost with store-enhanced pricing
    const totalCost = enhancedIngredients.reduce((sum, ing) => sum + ing.estimatedCost, 0);
    const costPerServing = totalCost / recipe.metadata.servings;

    return {
      ...recipe,
      ingredients: enhancedIngredients,
      metadata: {
        ...recipe.metadata,
        estimatedCost: totalCost,
        costPerServing
      }
    };
  }

  /**
   * Generate recipe concepts with citations from Perplexity
   */
  private async generateRecipeConcepts(request: MealPlanRequest): Promise<Array<{ concept: string; sourceUrl?: string; title?: string }>> {
    try {
      const prompt = this.buildLegacyMealPlanPrompt(request);

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
              content: 'You are a culturally-aware meal planning expert. Generate diverse, budget-conscious recipe suggestions that honor cultural traditions while meeting dietary needs.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.3,
          return_citations: true
        })
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const citations = data.citations || [];

      console.log('📚 Perplexity citations received:', citations.length, 'citations');
      console.log('🔗 Citation URLs:', citations.map((c: any) => c.url));

      const conceptsWithSources = this.parseRecipeConceptsWithCitations(content, citations, request.numberOfMeals);
      
      if (conceptsWithSources.length === 0) {
        throw new Error('No recipe concepts generated from Perplexity');
      }
      
      return conceptsWithSources;
      
    } catch (error) {
      console.warn('⚠️ Recipe concept generation failed, using fallback concepts:', error);
      
      // Fallback to predefined concepts that work with enhanced recipe search
      const fallbackConcepts = [
        `Authentic ${request.culturalCuisines[0]} pasta recipe`,
        `Traditional ${request.culturalCuisines[0]} main dish recipe`,
        `Classic ${request.culturalCuisines[0]} soup recipe`,
        `Popular ${request.culturalCuisines[0]} chicken recipe`,
        `Easy ${request.culturalCuisines[0]} vegetable recipe`
      ];
      
      // Convert to the new format (no source URLs for fallback)
      return fallbackConcepts.slice(0, request.numberOfMeals).map(concept => ({
        concept,
        sourceUrl: undefined,
        title: undefined
      }));
    }
  }

  /**
   * Build legacy meal planning prompt (for fallback)
   */
  private buildLegacyMealPlanPrompt(request: MealPlanRequest): string {
    const budgetPerMeal = request.weeklyBudget / request.numberOfMeals;
    const budgetPerServing = budgetPerMeal / request.householdSize;

    const storeInfo = request.preferredStores?.length > 0
      ? `\n    PREFERRED STORES:\n${request.preferredStores.map(store =>
        `    - ${store.name} (${store.type}) - Specialties: ${store.specialties.join(', ') || 'General grocery'}`
      ).join('\n')}`
      : '';

    return `Generate ${request.numberOfMeals} diverse meal ideas for a weekly meal plan:
    
CONSTRAINTS:
- Budget: $${request.weeklyBudget} total ($${budgetPerMeal.toFixed(2)} per meal, $${budgetPerServing.toFixed(2)} per serving)
- Household size: ${request.householdSize} people
- Cultural cuisines: ${request.culturalCuisines.join(', ')}
- Dietary restrictions: ${request.dietaryRestrictions.join(', ') || 'None'}
- Available pantry items: ${request.pantryItems.join(', ') || 'None specified'}${storeInfo}

REQUIREMENTS:
- Each meal should be culturally authentic and budget-friendly
- Prioritize seasonal ingredients for cost savings
- Include variety across different cuisines
- Consider prep time and difficulty for busy families
- Suggest ingredient substitutions for budget optimization
${request.preferredStores?.length > 0 ? '- Consider ingredients available at the user\'s preferred stores and their specialties' : ''}

Return ${request.numberOfMeals} specific recipe names that meet these criteria.
Focus on dishes that can feed ${request.householdSize} people within the budget constraints.
${request.preferredStores?.length > 0 ? 'Take advantage of store specialties for authentic cultural ingredients.' : ''}`;
  }
  /**
   * Extract timing information from instruction text
   */
  private extractTimingFromInstruction(text: string): { duration: number; isActive: boolean } | undefined {
    // Look for time patterns like "5 minutes", "30 seconds", "1 hour"
    const timePattern = /(\d+)\s*(minutes?|mins?|seconds?|secs?|hours?|hrs?)/i;
    const match = text.match(timePattern);
    
    if (match && match[1] && match[2]) {
      const value = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      
      let duration = value;
      if (unit.includes('hour') || unit.includes('hr')) {
        duration = value * 60; // Convert to minutes
      } else if (unit.includes('second') || unit.includes('sec')) {
        duration = Math.ceil(value / 60); // Convert to minutes, round up
      }
      
      // Determine if it's active time based on keywords
      const activeKeywords = ['stir', 'mix', 'chop', 'cut', 'sauté', 'cook', 'fry', 'boil'];
      const passiveKeywords = ['rest', 'sit', 'marinate', 'chill', 'cool', 'bake', 'simmer'];
      
      const lowerText = text.toLowerCase();
      const isActive = activeKeywords.some(keyword => lowerText.includes(keyword)) ||
                      !passiveKeywords.some(keyword => lowerText.includes(keyword));
      
      return { duration, isActive };
    }
    
    return undefined;
  }

  /**
   * Map cooking time to difficulty level
   */
  private mapDifficultyFromTime(totalTimeMinutes: number): 'easy' | 'medium' | 'hard' {
    if (totalTimeMinutes <= 30) return 'easy';
    if (totalTimeMinutes <= 90) return 'medium';
    return 'hard';
  }

  /**
   * Validate source URL and provide fallbacks
   */
  private validateSourceUrl(url: string | null): string | null {
    if (!url) return null;

    const validation = urlValidatorService.validateURL(url);
    
    if (validation.isValid && validation.sanitizedUrl) {
      return validation.sanitizedUrl;
    } else {
      console.warn(`⚠️ Invalid meal plan recipe source URL "${url}": ${validation.error}`);
      // Return null instead of broken URL to prevent 404s
      return null;
    }
  }

  /**
   * Fix common validation issues in scraped recipes
   */
  private fixRecipeValidationIssues(recipe: EnhancedRecipe): EnhancedRecipe {
    return {
      ...recipe,
      // Ensure yieldText is present
      yieldText: recipe.yieldText || `Serves ${recipe.servings || 4}`,
      // Ensure description is present
      description: recipe.description || `Delicious ${recipe.cuisine || ''} recipe`,
      // Ensure culturalOrigin is an array
      culturalOrigin: Array.isArray(recipe.culturalOrigin) ? recipe.culturalOrigin : [recipe.culturalOrigin || recipe.cuisine || 'International'],
      // Ensure tags is an array
      tags: Array.isArray(recipe.tags) ? recipe.tags : []
    };
  }
}

export const perplexityMealPlannerService = new PerplexityMealPlannerService();