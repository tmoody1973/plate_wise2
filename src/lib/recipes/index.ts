/**
 * Recipe Services Index
 * Exports all recipe-related services and types
 */

// Main recipe service (combines database and external APIs)
export { recipeService, RecipeService } from './recipe-service';

// Database-specific service
export { 
  recipeDatabaseService, 
  RecipeDatabaseService,
  type CreateRecipeInput,
  type UpdateRecipeInput,
  type RecipeSearchFilters,
  type RecipeCollection,
  type CreateCollectionInput,
} from './recipe-database-service';

// Analysis service for AI-powered features
export {
  recipeAnalysisService,
  RecipeAnalysisService,
  type RecipeParsingInput,
  type ParsedRecipeResult,
  type RecipeAnalysisOptions,
  type EnhancedRecipeAnalysis,
} from './recipe-analysis-service';

// Scaling service for recipe scaling and cost analysis
export {
  recipeScalingService,
  RecipeScalingService,
  type ScaledRecipe,
  type CostAnalysisResult,
  type IngredientSubstitution,
} from './recipe-scaling-service';

// Recommendations service for personalized recipe suggestions
export {
  recipeRecommendationsService,
  RecipeRecommendationsService,
  type RecommendationRequest,
  type RecipeRecommendation,
  type RecommendationFilters,
  type FavoriteRecipe,
} from './recipe-recommendations-service';

// Re-export types from main types file
export type {
  Recipe,
  Ingredient,
  Instruction,
  NutritionalInfo,
  CostAnalysis,
  Rating,
  Review,
  CulturalAuthenticity,
} from '@/types';