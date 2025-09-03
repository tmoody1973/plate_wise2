/**
 * Recipe Recommendations Service
 * Handles AI-powered recipe recommendations, favorites, and collections
 */

import { recipeDatabaseService } from './recipe-database-service';
import { bedrockService } from '@/lib/ai/bedrock-service';
import { recipeService as externalRecipeService, type UnifiedRecipe } from '@/lib/external-apis/recipe-service';
import type { Recipe, UserProfile } from '@/types';

export interface RecommendationRequest {
  userId: string;
  userProfile: UserProfile;
  excludeRecipeIds?: string[];
  limit?: number;
  includeExternal?: boolean;
}

export interface RecipeRecommendation {
  recipe: Recipe;
  score: number;
  reasons: string[];
  matchFactors: {
    culturalMatch: number;
    nutritionalMatch: number;
    budgetMatch: number;
    difficultyMatch: number;
    timeMatch: number;
  };
  confidence: number;
}

export interface RecommendationFilters {
  culturalCuisines?: string[];
  dietaryRestrictions?: string[];
  maxCookTime?: number;
  maxCostPerServing?: number;
  difficulty?: ('easy' | 'medium' | 'hard')[];
  tags?: string[];
}

export interface FavoriteRecipe {
  id: string;
  userId: string;
  recipeId: string;
  recipe?: Recipe;
  addedAt: Date;
  notes?: string;
}

export interface RecipeCollection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  recipeIds: string[];
  recipes?: Recipe[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Recipe Recommendations Service Class
 */
export class RecipeRecommendationsService {
  /**
   * Get personalized recipe recommendations
   */
  async getRecommendations(request: RecommendationRequest): Promise<RecipeRecommendation[]> {
    try {
      const recommendations: RecipeRecommendation[] = [];

      // Get recommendations from database recipes
      const dbRecommendations = await this.getDatabaseRecommendations(request);
      recommendations.push(...dbRecommendations);

      // Get recommendations from external sources if requested
      if (request.includeExternal) {
        const externalRecommendations = await this.getExternalRecommendations(request);
        recommendations.push(...externalRecommendations);
      }

      // Sort by score and return top recommendations
      const sortedRecommendations = recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, request.limit || 20);

      return sortedRecommendations;
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      return [];
    }
  }

  /**
   * Get AI-powered recipe recommendations based on user preferences
   */
  async getAIRecommendations(
    userProfile: UserProfile,
    filters?: RecommendationFilters,
    limit: number = 10
  ): Promise<RecipeRecommendation[]> {
    try {
      // Use AI to generate personalized recommendations
      const aiRecommendations = await externalRecipeService.getRecommendations({
        culturalCuisines: filters?.culturalCuisines || userProfile.preferences.culturalCuisines,
        dietaryRestrictions: filters?.dietaryRestrictions || userProfile.preferences.dietaryRestrictions,
        healthGoals: userProfile.nutritionalGoals.healthGoals,
        budgetRange: this.getBudgetRange(userProfile.budget.monthlyLimit),
        cookingSkill: userProfile.cookingProfile.skillLevel,
        availableTime: filters?.maxCookTime || userProfile.cookingProfile.availableTime,
      }, limit);

      // Convert to our recommendation format
      return aiRecommendations.map(rec => {
        const convertedRecipe = this.convertUnifiedRecipeToRecipe(rec.recipe);
        return {
          recipe: convertedRecipe,
          score: rec.score,
          reasons: rec.reasons,
          matchFactors: {
            culturalMatch: rec.culturalMatch,
            nutritionalMatch: rec.nutritionalMatch,
            budgetMatch: rec.budgetMatch,
            difficultyMatch: this.calculateDifficultyMatch(convertedRecipe, userProfile),
            timeMatch: this.calculateTimeMatch(convertedRecipe, userProfile),
          },
          confidence: 0.8, // AI recommendations have high confidence
        };
      });
    } catch (error) {
      console.error('Failed to get AI recommendations:', error);
      return [];
    }
  }

  /**
   * Get similar recipes based on a given recipe
   */
  async getSimilarRecipes(
    recipeId: string,
    userProfile?: UserProfile,
    limit: number = 5
  ): Promise<Recipe[]> {
    try {
      // Get the base recipe
      const baseRecipe = await recipeDatabaseService.getRecipeById(recipeId);
      if (!baseRecipe) {
        return [];
      }

      // Search for similar recipes by cultural origin and tags
      const similarRecipes = await recipeDatabaseService.searchRecipes({
        culturalOrigin: baseRecipe.culturalOrigin,
        tags: baseRecipe.tags,
        isPublic: true,
        limit: limit * 2, // Get more to filter out the original
      });

      // Filter out the original recipe and apply user preferences
      let filteredRecipes = similarRecipes.filter(recipe => recipe.id !== recipeId);

      if (userProfile) {
        filteredRecipes = this.applyUserPreferences(filteredRecipes, userProfile);
      }

      return filteredRecipes.slice(0, limit);
    } catch (error) {
      console.error('Failed to get similar recipes:', error);
      return [];
    }
  }

  /**
   * Get trending recipes based on ratings and recent activity
   */
  async getTrendingRecipes(limit: number = 20): Promise<Recipe[]> {
    try {
      // Get popular recipes (this is a simplified implementation)
      const popularRecipes = await recipeDatabaseService.getPopularRecipes(limit);
      
      // TODO: Implement more sophisticated trending algorithm based on:
      // - Recent ratings and reviews
      // - Recipe views and saves
      // - Social sharing activity
      // - Seasonal relevance

      return popularRecipes;
    } catch (error) {
      console.error('Failed to get trending recipes:', error);
      return [];
    }
  }

  /**
   * Search recipes with advanced filtering and ranking
   */
  async searchRecipesAdvanced(
    query: string,
    filters: RecommendationFilters,
    userProfile?: UserProfile,
    limit: number = 20
  ): Promise<Recipe[]> {
    try {
      // Build search filters
      const searchFilters = {
        query,
        culturalOrigin: filters.culturalCuisines,
        tags: filters.tags,
        difficulty: filters.difficulty,
        maxCookTime: filters.maxCookTime,
        isPublic: true,
        limit: limit * 2, // Get more for ranking
      };

      // Search recipes
      const recipes = await recipeDatabaseService.searchRecipes(searchFilters);

      // Apply additional filtering
      let filteredRecipes = recipes;

      if (filters.maxCostPerServing) {
        filteredRecipes = filteredRecipes.filter(recipe => 
          !recipe.costAnalysis?.costPerServing || 
          recipe.costAnalysis.costPerServing <= filters.maxCostPerServing!
        );
      }

      if (filters.dietaryRestrictions && filters.dietaryRestrictions.length > 0) {
        filteredRecipes = filteredRecipes.filter(recipe =>
          this.matchesDietaryRestrictions(recipe, filters.dietaryRestrictions!)
        );
      }

      // Rank recipes based on user preferences
      if (userProfile) {
        filteredRecipes = this.rankRecipesByUserPreferences(filteredRecipes, userProfile);
      }

      return filteredRecipes.slice(0, limit);
    } catch (error) {
      console.error('Failed to search recipes:', error);
      return [];
    }
  }

  /**
   * Get user's favorite recipes
   */
  async getFavoriteRecipes(userId: string): Promise<Recipe[]> {
    try {
      // TODO: Implement favorites table and queries
      // For now, return user's own recipes as a placeholder
      return await recipeDatabaseService.getUserRecipes(userId, false);
    } catch (error) {
      console.error('Failed to get favorite recipes:', error);
      return [];
    }
  }

  /**
   * Add recipe to favorites
   */
  async addToFavorites(userId: string, recipeId: string): Promise<boolean> {
    try {
      // TODO: Implement favorites functionality
      console.log(`Adding recipe ${recipeId} to favorites for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Failed to add to favorites:', error);
      return false;
    }
  }

  /**
   * Remove recipe from favorites
   */
  async removeFromFavorites(userId: string, recipeId: string): Promise<boolean> {
    try {
      // TODO: Implement favorites functionality
      console.log(`Removing recipe ${recipeId} from favorites for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Failed to remove from favorites:', error);
      return false;
    }
  }

  /**
   * Get recipe collections for user
   */
  async getCollections(userId: string): Promise<RecipeCollection[]> {
    try {
      const collections = await recipeDatabaseService.getUserCollections(userId);
      
      // Convert to our format and load recipes
      const enrichedCollections = await Promise.all(
        collections.map(async (collection) => {
          const recipes = await recipeDatabaseService.getCollectionRecipes(collection.id, userId);
          return {
            ...collection,
            recipes,
          };
        })
      );

      return enrichedCollections;
    } catch (error) {
      console.error('Failed to get collections:', error);
      return [];
    }
  }

  /**
   * Create new recipe collection
   */
  async createCollection(
    userId: string,
    name: string,
    description?: string,
    isPublic: boolean = false
  ): Promise<RecipeCollection | null> {
    try {
      return await recipeDatabaseService.createCollection({
        name,
        description,
        isPublic,
      }, userId);
    } catch (error) {
      console.error('Failed to create collection:', error);
      return null;
    }
  }

  /**
   * Private helper methods
   */

  /**
   * Get recommendations from database recipes
   */
  private async getDatabaseRecommendations(request: RecommendationRequest): Promise<RecipeRecommendation[]> {
    const { userProfile, excludeRecipeIds = [], limit = 10 } = request;

    // Search for recipes matching user preferences
    const recipes = await recipeDatabaseService.searchRecipes({
      culturalOrigin: userProfile.preferences.culturalCuisines,
      isPublic: true,
      limit: limit * 2,
    });

    // Filter out excluded recipes
    const filteredRecipes = recipes.filter(recipe => !excludeRecipeIds.includes(recipe.id));

    // Score and rank recipes
    const recommendations = filteredRecipes.map(recipe => {
      const matchFactors = this.calculateMatchFactors(recipe, userProfile);
      const score = this.calculateOverallScore(matchFactors);
      const reasons = this.generateReasons(matchFactors, recipe);

      return {
        recipe,
        score,
        reasons,
        matchFactors,
        confidence: 0.7, // Database recommendations have moderate confidence
      };
    });

    return recommendations.slice(0, limit);
  }

  /**
   * Get recommendations from external sources
   */
  private async getExternalRecommendations(request: RecommendationRequest): Promise<RecipeRecommendation[]> {
    // This would integrate with external recipe APIs
    // For now, return empty array
    return [];
  }

  /**
   * Calculate match factors for a recipe against user profile
   */
  private calculateMatchFactors(recipe: Recipe, userProfile: UserProfile) {
    const culturalMatch = this.calculateCulturalMatch(recipe, userProfile);
    const nutritionalMatch = this.calculateNutritionalMatch(recipe, userProfile);
    const budgetMatch = this.calculateBudgetMatch(recipe, userProfile);
    const difficultyMatch = this.calculateDifficultyMatch(recipe, userProfile);
    const timeMatch = this.calculateTimeMatch(recipe, userProfile);

    return {
      culturalMatch,
      nutritionalMatch,
      budgetMatch,
      difficultyMatch,
      timeMatch,
    };
  }

  /**
   * Calculate cultural match score
   */
  private calculateCulturalMatch(recipe: Recipe, userProfile: UserProfile): number {
    const userCuisines = userProfile.preferences.culturalCuisines;
    const recipeCuisines = recipe.culturalOrigin;

    if (userCuisines.length === 0) return 0.5; // Neutral if no preferences

    const matches = recipeCuisines.filter(cuisine => 
      userCuisines.some(userCuisine => 
        userCuisine.toLowerCase().includes(cuisine.toLowerCase()) ||
        cuisine.toLowerCase().includes(userCuisine.toLowerCase())
      )
    );

    return matches.length / Math.max(recipeCuisines.length, 1);
  }

  /**
   * Calculate nutritional match score
   */
  private calculateNutritionalMatch(recipe: Recipe, userProfile: UserProfile): number {
    if (!recipe.nutritionalInfo) return 0.5; // Neutral if no nutrition data

    const targetCalories = userProfile.nutritionalGoals.calorieTarget / 3; // Assume 3 meals per day
    const recipeCalories = recipe.nutritionalInfo.calories / recipe.metadata.servings;

    // Score based on how close the recipe calories are to target
    const caloriesDiff = Math.abs(recipeCalories - targetCalories);
    const caloriesScore = Math.max(0, 1 - (caloriesDiff / targetCalories));

    // TODO: Add more sophisticated nutritional matching
    return caloriesScore;
  }

  /**
   * Calculate budget match score
   */
  private calculateBudgetMatch(recipe: Recipe, userProfile: UserProfile): number {
    if (!recipe.costAnalysis?.costPerServing) return 0.5; // Neutral if no cost data

    const monthlyBudget = userProfile.budget.monthlyLimit;
    const dailyBudget = monthlyBudget / 30;
    const mealBudget = dailyBudget / 3; // Assume 3 meals per day

    const costPerServing = recipe.costAnalysis.costPerServing;

    if (costPerServing <= mealBudget * 0.5) return 1.0; // Very affordable
    if (costPerServing <= mealBudget) return 0.8; // Affordable
    if (costPerServing <= mealBudget * 1.5) return 0.6; // Slightly over budget
    if (costPerServing <= mealBudget * 2) return 0.4; // Over budget
    return 0.2; // Way over budget
  }

  /**
   * Calculate difficulty match score
   */
  private calculateDifficultyMatch(recipe: Recipe, userProfile: UserProfile): number {
    const userSkill = userProfile.cookingProfile.skillLevel;
    const recipeDifficulty = recipe.metadata.difficulty;

    const skillLevels = { beginner: 1, intermediate: 2, advanced: 3 };
    const difficultyLevels = { easy: 1, medium: 2, hard: 3 };

    const userLevel = skillLevels[userSkill];
    const recipeLevel = difficultyLevels[recipeDifficulty];

    if (recipeLevel <= userLevel) return 1.0; // Recipe is at or below user skill
    if (recipeLevel === userLevel + 1) return 0.7; // Recipe is one level above
    return 0.3; // Recipe is too difficult
  }

  /**
   * Calculate time match score
   */
  private calculateTimeMatch(recipe: Recipe, userProfile: UserProfile): number {
    const availableTime = userProfile.cookingProfile.availableTime;
    const recipeTime = recipe.metadata.totalTime;

    if (recipeTime <= availableTime * 0.5) return 1.0; // Very quick
    if (recipeTime <= availableTime) return 0.8; // Within time limit
    if (recipeTime <= availableTime * 1.5) return 0.6; // Slightly over time
    if (recipeTime <= availableTime * 2) return 0.4; // Over time
    return 0.2; // Way over time
  }

  /**
   * Calculate overall recommendation score
   */
  private calculateOverallScore(matchFactors: any): number {
    const weights = {
      culturalMatch: 0.3,
      nutritionalMatch: 0.2,
      budgetMatch: 0.25,
      difficultyMatch: 0.15,
      timeMatch: 0.1,
    };

    return Object.entries(weights).reduce((score, [factor, weight]) => {
      return score + (matchFactors[factor] * weight);
    }, 0) * 100; // Convert to 0-100 scale
  }

  /**
   * Generate recommendation reasons
   */
  private generateReasons(matchFactors: any, recipe: Recipe): string[] {
    const reasons: string[] = [];

    if (matchFactors.culturalMatch > 0.8) {
      reasons.push('Matches your cultural cuisine preferences');
    }

    if (matchFactors.budgetMatch > 0.8) {
      reasons.push('Fits within your budget');
    }

    if (matchFactors.difficultyMatch > 0.8) {
      reasons.push('Appropriate for your cooking skill level');
    }

    if (matchFactors.timeMatch > 0.8) {
      reasons.push('Can be prepared in your available time');
    }

    if (recipe.metadata.culturalAuthenticity > 8) {
      reasons.push('Highly authentic traditional recipe');
    }

    if (reasons.length === 0) {
      reasons.push('Popular recipe in our community');
    }

    return reasons;
  }

  /**
   * Apply user preferences to filter recipes
   */
  private applyUserPreferences(recipes: Recipe[], userProfile: UserProfile): Recipe[] {
    return recipes.filter(recipe => {
      // Filter by dietary restrictions
      if (!this.matchesDietaryRestrictions(recipe, userProfile.preferences.dietaryRestrictions)) {
        return false;
      }

      // Filter by allergies
      if (!this.matchesAllergies(recipe, userProfile.preferences.allergies)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Check if recipe matches dietary restrictions
   */
  private matchesDietaryRestrictions(recipe: Recipe, restrictions: string[]): boolean {
    // This is a simplified implementation
    // In a real app, you'd have more sophisticated dietary restriction matching
    const recipeTags = recipe.tags.map(tag => tag.toLowerCase());
    
    return restrictions.every(restriction => {
      const restrictionLower = restriction.toLowerCase();
      
      // If user is vegetarian, recipe should be vegetarian
      if (restrictionLower.includes('vegetarian')) {
        return recipeTags.includes('vegetarian') || recipeTags.includes('vegan');
      }
      
      // If user is vegan, recipe should be vegan
      if (restrictionLower.includes('vegan')) {
        return recipeTags.includes('vegan');
      }
      
      // Add more dietary restriction logic as needed
      return true;
    });
  }

  /**
   * Check if recipe matches allergies
   */
  private matchesAllergies(recipe: Recipe, allergies: string[]): boolean {
    if (allergies.length === 0) return true;

    const ingredientNames = recipe.ingredients.map(ing => ing.name.toLowerCase());
    
    return !allergies.some(allergy => {
      const allergyLower = allergy.toLowerCase();
      return ingredientNames.some(ingredient => ingredient.includes(allergyLower));
    });
  }

  /**
   * Rank recipes by user preferences
   */
  private rankRecipesByUserPreferences(recipes: Recipe[], userProfile: UserProfile): Recipe[] {
    return recipes
      .map(recipe => ({
        recipe,
        score: this.calculateOverallScore(this.calculateMatchFactors(recipe, userProfile)),
      }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.recipe);
  }

  /**
   * Get budget range category
   */
  private getBudgetRange(monthlyLimit: number): 'low' | 'medium' | 'high' {
    if (monthlyLimit < 200) return 'low';
    if (monthlyLimit < 500) return 'medium';
    return 'high';
  }

  /**
   * Convert UnifiedRecipe to Recipe format
   */
  private convertUnifiedRecipeToRecipe(unifiedRecipe: UnifiedRecipe): Recipe {
    return {
      id: unifiedRecipe.id,
      title: unifiedRecipe.title,
      description: unifiedRecipe.description,
      culturalOrigin: unifiedRecipe.cuisines,
      cuisine: unifiedRecipe.cuisines[0] || 'international',
      ingredients: unifiedRecipe.ingredients.map(ing => ({
        id: `${unifiedRecipe.id}-${ing.name}`,
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        substitutes: [],
        costPerUnit: 0,
        availability: [],
        culturalSignificance: ing.culturalSignificance,
      })),
      instructions: unifiedRecipe.instructions.map(inst => ({
        step: inst.step,
        description: inst.instruction,
        culturalTechnique: inst.technique,
        estimatedTime: inst.time,
      })),
      nutritionalInfo: {
        calories: unifiedRecipe.nutrition.calories,
        protein: unifiedRecipe.nutrition.protein,
        carbs: unifiedRecipe.nutrition.carbs,
        fat: unifiedRecipe.nutrition.fat,
        fiber: unifiedRecipe.nutrition.fiber,
        sugar: unifiedRecipe.nutrition.sugar,
        sodium: unifiedRecipe.nutrition.sodium,
        vitamins: unifiedRecipe.nutrition.vitamins || {},
        minerals: unifiedRecipe.nutrition.minerals || {},
      },
      costAnalysis: {
        totalCost: unifiedRecipe.pricePerServing ? unifiedRecipe.pricePerServing * unifiedRecipe.servings : 0,
        costPerServing: unifiedRecipe.pricePerServing || 0,
        storeComparison: [],
        seasonalTrends: [],
        bulkBuyingOpportunities: [],
        couponSavings: [],
        alternativeIngredients: [],
      },
      metadata: {
        servings: unifiedRecipe.servings,
        prepTime: unifiedRecipe.preparationMinutes || 0,
        cookTime: unifiedRecipe.cookingMinutes || 0,
        totalTime: unifiedRecipe.readyInMinutes,
        difficulty: unifiedRecipe.difficulty,
        culturalAuthenticity: unifiedRecipe.culturalScore,
      },
      tags: unifiedRecipe.tags,
      source: unifiedRecipe.source as 'user' | 'spoonacular' | 'community',
      ratings: [],
      reviews: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

/**
 * Singleton instance of RecipeRecommendationsService
 */
export const recipeRecommendationsService = new RecipeRecommendationsService();