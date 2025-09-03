/**
 * Main Recipe Service
 * Combines database operations with external API functionality
 * Provides a unified interface for all recipe-related operations
 */

import { recipeDatabaseService, type CreateRecipeInput, type UpdateRecipeInput, type RecipeSearchFilters as DBSearchFilters } from './recipe-database-service';
import { recipeService as externalRecipeService, type RecipeSearchFilters as ExternalSearchFilters } from '@/lib/external-apis/recipe-service';
import type { Recipe, CulturalAuthenticity } from '@/types';

export interface CombinedRecipeSearchFilters extends DBSearchFilters {
  includeExternal?: boolean;
  externalSources?: ('spoonacular')[];
}

export interface RecipeAnalysisResult {
  recipe: Recipe;
  culturalAnalysis: CulturalAuthenticity;
  costEstimate: number;
  healthScore: number;
  recommendations: string[];
}

export interface RecipeParsingInput {
  text?: string;
  image?: File;
  voice?: Blob;
  language?: string;
}

export interface ParsedRecipeResult {
  success: boolean;
  recipe?: CreateRecipeInput;
  errors?: string[];
  confidence?: number;
}

/**
 * Main Recipe Service Class
 * Orchestrates database operations and external API calls
 */
export class RecipeService {
  /**
   * Create a new recipe in the database
   */
  async createRecipe(input: CreateRecipeInput, authorId: string): Promise<Recipe | null> {
    try {
      // Enhance recipe with AI analysis if needed
      if (!input.nutritionalInfo || !input.costAnalysis) {
        const enhanced = await this.enhanceRecipeWithAI(input);
        input = { ...input, ...enhanced };
      }

      return await recipeDatabaseService.createRecipe(input, authorId);
    } catch (error) {
      console.error('Failed to create recipe:', error);
      return null;
    }
  }

  /**
   * Get recipe by ID from database
   */
  async getRecipeById(id: string): Promise<Recipe | null> {
    // First try exact match
    let recipe = await recipeDatabaseService.getRecipeById(id);
    
    // If not found and ID looks like a partial ID (8 chars), try partial match
    if (!recipe && id.length === 8 && /^[a-f0-9]{8}$/i.test(id)) {
      console.log(`Trying partial ID lookup for: ${id}`);
      recipe = await recipeDatabaseService.getRecipeByPartialId(id);
    }
    
    return recipe;
  }

  /**
   * Update existing recipe
   */
  async updateRecipe(input: UpdateRecipeInput, authorId: string): Promise<Recipe | null> {
    return await recipeDatabaseService.updateRecipe(input, authorId);
  }

  /**
   * Delete recipe
   */
  async deleteRecipe(id: string, authorId: string): Promise<boolean> {
    return await recipeDatabaseService.deleteRecipe(id, authorId);
  }

  /**
   * Search recipes from both database and external sources
   */
  async searchRecipes(filters: CombinedRecipeSearchFilters): Promise<Recipe[]> {
    const results: Recipe[] = [];

    try {
      // Search database first
      const dbResults = await recipeDatabaseService.searchRecipes(filters);
      results.push(...dbResults);

      // Search external sources if requested
      if (filters.includeExternal) {
        const externalResults = await this.searchExternalRecipes(filters);
        results.push(...externalResults);
      }

      // Remove duplicates and sort by relevance
      return this.deduplicateAndSortRecipes(results, filters);
    } catch (error) {
      console.error('Failed to search recipes:', error);
      return results; // Return whatever we have
    }
  }

  /**
   * Get recipe recommendations based on user preferences
   */
  async getRecommendations(
    userPreferences: {
      culturalCuisines: string[];
      dietaryRestrictions: string[];
      healthGoals: string[];
      budgetRange: 'low' | 'medium' | 'high';
      cookingSkill: 'beginner' | 'intermediate' | 'advanced';
      availableTime: number;
    },
    limit: number = 10
  ): Promise<Recipe[]> {
    try {
      // Get recommendations from external service
      const externalRecommendations = await externalRecipeService.getRecommendations(userPreferences, limit);
      
      // Get similar recipes from database
      const dbRecommendations = await recipeDatabaseService.searchRecipes({
        culturalOrigin: userPreferences.culturalCuisines,
        difficulty: [this.mapCookingSkillToDifficulty(userPreferences.cookingSkill)],
        maxCookTime: userPreferences.availableTime,
        isPublic: true,
        limit: limit,
      });

      // Combine and sort by relevance
      const allRecommendations = [
        ...externalRecommendations.map(rec => this.convertExternalRecipeToRecipe(rec.recipe)),
        ...dbRecommendations,
      ];

      return this.deduplicateAndSortRecipes(allRecommendations, {}).slice(0, limit);
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      return [];
    }
  }

  /**
   * Parse recipe from various input formats using AI
   */
  async parseRecipe(input: RecipeParsingInput): Promise<ParsedRecipeResult> {
    try {
      let recipeText = '';

      if (input.text) {
        recipeText = input.text;
      } else if (input.image) {
        // TODO: Implement image-to-text conversion using AI
        return {
          success: false,
          errors: ['Image parsing not yet implemented'],
        };
      } else if (input.voice) {
        // TODO: Implement voice-to-text conversion
        return {
          success: false,
          errors: ['Voice parsing not yet implemented'],
        };
      } else {
        return {
          success: false,
          errors: ['No input provided'],
        };
      }

      // Use AI to parse the recipe text
      const parsedRecipe = await this.parseRecipeWithAI(recipeText, input.language || 'en');
      
      if (!parsedRecipe) {
        return {
          success: false,
          errors: ['Failed to parse recipe with AI'],
        };
      }

      return {
        success: true,
        recipe: parsedRecipe,
        confidence: 0.85, // TODO: Implement confidence scoring
      };
    } catch (error) {
      console.error('Failed to parse recipe:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Analyze recipe for cultural authenticity and other metrics
   */
  async analyzeRecipe(recipe: Recipe, culturalContext?: string): Promise<RecipeAnalysisResult> {
    try {
      // Get cultural analysis
      const culturalAnalysis = await this.analyzeCulturalAuthenticity(recipe, culturalContext);
      
      // Calculate cost estimate
      const costEstimate = await this.calculateCostEstimate(recipe);
      
      // Calculate health score
      const healthScore = this.calculateHealthScore(recipe);
      
      // Generate recommendations
      const recommendations = await this.generateRecipeRecommendations(recipe, culturalAnalysis);

      return {
        recipe,
        culturalAnalysis,
        costEstimate,
        healthScore,
        recommendations,
      };
    } catch (error) {
      console.error('Failed to analyze recipe:', error);
      throw error;
    }
  }

  /**
   * Get user's recipe collections
   */
  async getUserCollections(userId: string) {
    return await recipeDatabaseService.getUserCollections(userId);
  }

  /**
   * Create new recipe collection
   */
  async createCollection(name: string, description: string, userId: string, isPublic: boolean = false) {
    return await recipeDatabaseService.createCollection({
      name,
      description,
      isPublic,
    }, userId);
  }

  /**
   * Add recipe to collection
   */
  async addToCollection(collectionId: string, recipeId: string, userId: string): Promise<boolean> {
    return await recipeDatabaseService.addRecipeToCollection(collectionId, recipeId, userId);
  }

  /**
   * Rate a recipe
   */
  async rateRecipe(
    recipeId: string,
    userId: string,
    rating: number,
    costRating: number,
    authenticityRating: number,
    review?: string
  ): Promise<boolean> {
    return await recipeDatabaseService.addRecipeRating(
      recipeId,
      userId,
      rating,
      costRating,
      authenticityRating,
      review
    );
  }

  /**
   * Get popular recipes
   */
  async getPopularRecipes(limit: number = 20): Promise<Recipe[]> {
    return await recipeDatabaseService.getPopularRecipes(limit);
  }

  /**
   * Get recipes by cultural origin
   */
  async getRecipesByCulture(culturalOrigin: string, limit: number = 20): Promise<Recipe[]> {
    return await recipeDatabaseService.getRecipesByCulture(culturalOrigin, limit);
  }

  /**
   * Get recipe categories with counts
   */
  async getRecipeCategories() {
    return await recipeDatabaseService.getRecipeCategories();
  }

  /**
   * Get recipes created by a specific user
   */
  async getUserRecipes(userId: string, includePrivate: boolean = true): Promise<Recipe[]> {
    return await recipeDatabaseService.getUserRecipes(userId, includePrivate);
  }

  /**
   * Private helper methods
   */

  /**
   * Search external recipe sources
   */
  private async searchExternalRecipes(filters: CombinedRecipeSearchFilters): Promise<Recipe[]> {
    try {
      const externalFilters: ExternalSearchFilters = {
        query: filters.query,
        cuisines: filters.culturalOrigin,
        maxReadyTime: filters.maxCookTime,
        limit: filters.limit || 20,
      };

      const externalResults = await externalRecipeService.searchRecipes(externalFilters);
      
      // Convert external recipes to our Recipe type
      return externalResults.map(this.convertExternalRecipeToRecipe);
    } catch (error) {
      console.error('Failed to search external recipes:', error);
      return [];
    }
  }

  /**
   * Convert external recipe format to our Recipe type
   */
  private convertExternalRecipeToRecipe(externalRecipe: any): Recipe {
    return {
      id: externalRecipe.id,
      title: externalRecipe.title,
      description: externalRecipe.description,
      culturalOrigin: externalRecipe.cuisines || [],
      cuisine: externalRecipe.cuisines?.[0] || 'international',
      ingredients: externalRecipe.ingredients || [],
      instructions: externalRecipe.instructions || [],
      nutritionalInfo: externalRecipe.nutrition,
      costAnalysis: {
        totalCost: 0,
        costPerServing: externalRecipe.pricePerServing || 0,
        storeComparison: [],
        seasonalTrends: [],
        bulkBuyingOpportunities: [],
        couponSavings: [],
        alternativeIngredients: [],
      },
      metadata: {
        servings: externalRecipe.servings,
        prepTime: externalRecipe.preparationMinutes || 0,
        cookTime: externalRecipe.cookingMinutes || 0,
        totalTime: externalRecipe.readyInMinutes,
        difficulty: externalRecipe.difficulty,
        culturalAuthenticity: externalRecipe.culturalScore || 0,
      },
      tags: externalRecipe.tags || [],
      source: externalRecipe.source,
      authorId: undefined,
      ratings: [],
      reviews: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Remove duplicate recipes and sort by relevance
   */
  private deduplicateAndSortRecipes(recipes: Recipe[], filters: any): Recipe[] {
    // Simple deduplication by title (could be improved)
    const seen = new Set<string>();
    const unique = recipes.filter(recipe => {
      const key = recipe.title.toLowerCase().trim();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    // Sort by relevance (could be improved with better scoring)
    return unique.sort((a, b) => {
      // Prioritize user recipes, then community, then external
      const sourceOrder = { user: 3, community: 2, spoonacular: 1 };
      const aScore = sourceOrder[a.source] || 0;
      const bScore = sourceOrder[b.source] || 0;
      
      if (aScore !== bScore) {
        return bScore - aScore;
      }

      // Then by cultural authenticity
      return (b.metadata.culturalAuthenticity || 0) - (a.metadata.culturalAuthenticity || 0);
    });
  }

  /**
   * Enhance recipe with AI analysis
   */
  private async enhanceRecipeWithAI(recipe: CreateRecipeInput): Promise<Partial<CreateRecipeInput>> {
    const enhancements: Partial<CreateRecipeInput> = {};

    try {
      // Generate nutritional info if missing
      if (!recipe.nutritionalInfo && recipe.ingredients.length > 0) {
        // TODO: Use AI to analyze nutrition
        // enhancements.nutritionalInfo = await this.analyzeNutritionWithAI(recipe.ingredients);
      }

      // Generate cost analysis if missing
      if (!recipe.costAnalysis && recipe.ingredients.length > 0) {
        const { estimateRecipeCost } = await import('./cost-estimator')
        const { totalCost, costPerServing } = estimateRecipeCost(recipe.ingredients as any, recipe.metadata.servings)
        enhancements.costAnalysis = {
          totalCost,
          costPerServing,
          storeComparison: [],
          seasonalTrends: [],
          bulkBuyingOpportunities: [],
          couponSavings: [],
          alternativeIngredients: [],
        }
      }

      return enhancements;
    } catch (error) {
      console.error('Failed to enhance recipe with AI:', error);
      return {};
    }
  }

  /**
   * Parse recipe text using AI
   */
  private async parseRecipeWithAI(recipeText: string, language: string): Promise<CreateRecipeInput | null> {
    try {
      const prompt = `
Parse the following recipe text and extract structured information. Return a JSON object with the following structure:

{
  "title": "Recipe title",
  "description": "Brief description",
  "culturalOrigin": ["cuisine1", "cuisine2"],
  "cuisine": "primary cuisine",
  "ingredients": [
    {
      "id": "unique_id",
      "name": "ingredient name",
      "amount": number,
      "unit": "unit",
      "culturalName": "traditional name if applicable"
    }
  ],
  "instructions": [
    {
      "step": number,
      "description": "instruction text",
      "culturalTechnique": "traditional technique if applicable"
    }
  ],
  "metadata": {
    "servings": number,
    "prepTime": number_in_minutes,
    "cookTime": number_in_minutes,
    "totalTime": number_in_minutes,
    "difficulty": "easy|medium|hard",
    "culturalAuthenticity": number_0_to_10
  },
  "tags": ["tag1", "tag2"]
}

Recipe text:
${recipeText}

Language: ${language}

Please ensure cultural authenticity is preserved and traditional techniques are noted.`;

      const { bedrockService } = await import('@/lib/ai/bedrock-service');
      const response = await bedrockService.parseRecipe(recipeText, 'text', language);
      
      if (!response) {
        return null;
      }
      
      return {
        ...response,
        source: 'user' as const,
      };
    } catch (error) {
      console.error('Failed to parse recipe with AI:', error);
      return null;
    }
  }

  /**
   * Analyze cultural authenticity using AI
   */
  private async analyzeCulturalAuthenticity(recipe: Recipe, culturalContext?: string): Promise<CulturalAuthenticity> {
    try {
      const prompt = `
Analyze the cultural authenticity of this recipe:

Title: ${recipe.title}
Cuisine: ${recipe.cuisine}
Cultural Origin: ${recipe.culturalOrigin.join(', ')}
Ingredients: ${recipe.ingredients.map(ing => ing.name).join(', ')}
${culturalContext ? `Cultural Context: ${culturalContext}` : ''}

Provide analysis in this JSON format:
{
  "level": "traditional|adapted|inspired|fusion",
  "culturalOrigin": ["primary", "secondary"],
  "traditionalIngredients": ["ingredient1", "ingredient2"],
  "adaptations": [
    {
      "ingredient": "ingredient name",
      "reason": "dietary|availability|cost|preference",
      "culturalImpact": "minimal|moderate|significant",
      "explanation": "explanation text"
    }
  ],
  "culturalContext": "context description",
  "ceremonialSignificance": "significance if any"
}`;

      const { bedrockService } = await import('@/lib/ai/bedrock-service');
      const response = await bedrockService.analyzeCulturalAuthenticity(
        recipe.title,
        recipe.ingredients.map(ing => ing.name),
        recipe.culturalOrigin[0] || 'international',
        recipe.instructions.map(inst => inst.description)
      );
      
      // Map CulturalAnalysis to CulturalAuthenticity
      return {
        level: response.authenticityScore > 8 ? 'traditional' : 
               response.authenticityScore > 6 ? 'adapted' : 
               response.authenticityScore > 4 ? 'inspired' : 'fusion',
        culturalOrigin: recipe.culturalOrigin,
        traditionalIngredients: recipe.ingredients.map(ing => ing.name),
        adaptations: [],
        culturalContext: response.culturalSignificance,
        ceremonialSignificance: response.ceremonialUse || undefined,
      };
    } catch (error) {
      console.error('Failed to analyze cultural authenticity:', error);
      // Return default analysis
      return {
        level: 'adapted',
        culturalOrigin: recipe.culturalOrigin,
        traditionalIngredients: [],
        adaptations: [],
        culturalContext: 'Analysis not available',
      };
    }
  }

  /**
   * Calculate cost estimate for recipe
   */
  private async calculateCostEstimate(recipe: Recipe): Promise<number> {
    try {
      // TODO: Implement cost calculation using pricing APIs
      // For now, return a placeholder
      return recipe.costAnalysis?.costPerServing || 0;
    } catch (error) {
      console.error('Failed to calculate cost estimate:', error);
      return 0;
    }
  }

  /**
   * Calculate health score for recipe
   */
  private calculateHealthScore(recipe: Recipe): number {
    try {
      if (!recipe.nutritionalInfo) {
        return 50; // Default score
      }

      let score = 50;
      const nutrition = recipe.nutritionalInfo;

      // Positive factors
      if (nutrition.fiber > 5) score += 10;
      if (nutrition.protein > 15) score += 10;
      if (nutrition.sodium < 600) score += 10;

      // Negative factors
      if (nutrition.sugar > 20) score -= 10;
      if (nutrition.sodium > 1500) score -= 15;

      return Math.max(0, Math.min(100, score));
    } catch (error) {
      console.error('Failed to calculate health score:', error);
      return 50;
    }
  }

  /**
   * Generate recipe recommendations using AI
   */
  private async generateRecipeRecommendations(recipe: Recipe, culturalAnalysis: CulturalAuthenticity): Promise<string[]> {
    try {
      const prompt = `
Based on this recipe analysis, provide 3-5 helpful recommendations:

Recipe: ${recipe.title}
Cultural Level: ${culturalAnalysis.level}
Health Score: ${this.calculateHealthScore(recipe)}
Difficulty: ${recipe.metadata.difficulty}

Provide recommendations for:
1. Cultural authenticity improvements
2. Health/nutrition enhancements
3. Cost optimization
4. Cooking technique tips

Return as a JSON array of strings.`;

      // For now, return static recommendations until we implement a specific method
      return [
        'Consider using traditional cooking methods',
        'Add more vegetables for nutrition',
        'Look for seasonal ingredients to reduce costs',
      ];
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      return [
        'Consider using traditional cooking methods',
        'Add more vegetables for nutrition',
        'Look for seasonal ingredients to reduce costs',
      ];
    }
  }

  /**
   * Map cooking skill level to recipe difficulty
   */
  private mapCookingSkillToDifficulty(cookingSkill: 'beginner' | 'intermediate' | 'advanced'): 'easy' | 'medium' | 'hard' {
    switch (cookingSkill) {
      case 'beginner':
        return 'easy';
      case 'intermediate':
        return 'medium';
      case 'advanced':
        return 'hard';
      default:
        return 'medium';
    }
  }
}

/**
 * Singleton instance of RecipeService
 */
export const recipeService = new RecipeService();
