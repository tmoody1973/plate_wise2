/**
 * Tavily + Perplexity Integration Exports
 * 
 * Central export point for all Tavily + Perplexity integration components
 */

// API Clients
export { TavilyClient } from './tavily-client';
export { PerplexityClient } from './perplexity-client';

// Configuration Management
export { 
  TavilyPerplexityConfigManager,
  getTavilyPerplexityConfig,
  areApiKeysConfigured,
  getConfigurationStatus
} from './tavily-perplexity-config';

// Type Definitions
export type {
  // Core Recipe Types (Backward Compatible)
  EnhancedRecipe,
  EnhancedRecipeSearchRequest,
  EnhancedRecipeSearchResponse,
  
  // Recipe Modification Types
  RecipeModificationRequest,
  ModifiedRecipeResponse,
  RecipeModification,
  
  // Personal Recipe Collection Types
  SaveRecipeRequest,
  SaveRecipeResponse,
  UserRecipeCollection,
  SavedRecipe,
  RecipeRating,
  RecipeUsage,
  RecipeFilters,
  
  // Internal Processing Types
  InternalRecipe,
  RecipeIngredient,
  RecipeInstruction,
  NutritionalInfo,
  DietaryInfo,
  
  // Error Handling Types
  RecipeSearchError,
  RecipeSearchErrorType,
  APIResponse,
  
  // Configuration Types
  TavilyPerplexityConfig,
  
  // Utility Types
  RecipeConverter,
  SearchMetadata,
  BatchSearchRequest,
  BatchSearchResponse
} from './recipe-types';

// Tavily Client Types
export type {
  TavilySearchOptions,
  TavilySearchResult,
  TavilySearchResponse,
  TavilyConfig
} from './tavily-client';

// Perplexity Client Types
export type {
  PerplexityConfig,
  ParsingContext,
  ParsedRecipe,
  Ingredient,
  Instruction,
  RecipeMetadata,
  PerplexityMessage,
  PerplexityResponse
} from './perplexity-client';

// Re-export existing integrations for compatibility
export { default as webscraping } from './webscraping';
export { FastRecipeExtractor } from './fast-recipe-extractor';
export { PerplexityRecipeExtractor } from './perplexity-recipe-extractor';
export { RecipeCache } from './recipe-cache';
export { OGImageExtractor } from './og-image-extractor';
export { WebscrapingHTML } from './webscraping-html';
export { KrogerPricingService } from './kroger-pricing';
export { InstacartPricingService } from './instacart-pricing';