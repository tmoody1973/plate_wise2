/**
 * Shared Recipe Data Types for Tavily + Perplexity Integration
 * 
 * Defines common interfaces and types used across the two-stage
 * recipe search system while maintaining backward compatibility
 * with existing meal planner interfaces.
 */

// ============================================================================
// CORE RECIPE INTERFACES (Backward Compatible)
// ============================================================================

/**
 * Enhanced Recipe interface - MUST match existing meal planner format
 * This ensures 100% backward compatibility with current system
 */
export interface EnhancedRecipe {
  title: string;
  description: string;
  culturalOrigin: string[];
  cuisine: string;
  sourceUrl: string;
  imageUrl?: string;
  totalTimeMinutes: number;
  servings: number;
  yieldText: string;
  ingredients: Array<{
    name: string;
    amount: number;
    unit: string;
  }>;
  instructions: Array<{
    step: number;
    text: string;
  }>;
  nutritionalInfo?: {
    calories: number;
    protein_g: number;
    fat_g: number;
    carbs_g: number;
  };
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Enhanced Recipe Search Request - MUST match existing interface
 */
export interface EnhancedRecipeSearchRequest {
  query: string;
  culturalCuisine?: string;
  country?: string;
  includeIngredients?: string[];
  excludeIngredients?: string[];
  dietaryRestrictions?: string[];
  difficulty?: 'easy' | 'moderate' | 'advanced';
  maxTimeMinutes?: number;
  maxResults?: number;
  
  // NEW: Meal type filtering for Tavily search
  mealTypes?: Array<'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert'>;
  
  // Quality filtering options (applied post-search)
  qualityFilter?: {
    excludeVideoSites?: boolean;
    excludeCollectionPages?: boolean;
    minContentLength?: number;
    requireIngredients?: boolean;
  };
}

/**
 * Enhanced Recipe Search Response - MUST match existing interface
 */
export interface EnhancedRecipeSearchResponse {
  recipes: EnhancedRecipe[];
}

// ============================================================================
// NEW RECIPE MODIFICATION INTERFACES
// ============================================================================

export interface RecipeModificationRequest {
  originalRecipe: EnhancedRecipe;
  modificationType: 'vegetarian' | 'vegan' | 'gluten-free' | 'dairy-free' | 'nut-free' | 'keto' | 'paleo' | 'custom';
  customRestrictions?: string[]; // For custom modifications
  maintainAuthenticity?: boolean; // Default: true
  culturalPreference?: string; // Maintain cultural cooking methods
}

export interface ModifiedRecipeResponse {
  modifiedRecipe: EnhancedRecipe;
  modifications: RecipeModification[];
  authenticityNotes: string;
  culturalContext: string;
}

export interface RecipeModification {
  originalIngredient: string;
  substituteIngredient: string;
  reason: string;
  quantityAdjustment?: string;
  cookingAdjustment?: string;
  flavorImpact: 'minimal' | 'moderate' | 'significant';
  culturalAuthenticity: 'traditional' | 'adapted' | 'modern';
}

// ============================================================================
// PERSONAL RECIPE COLLECTION INTERFACES
// ============================================================================

export interface SaveRecipeRequest {
  userId: string;
  recipe: EnhancedRecipe;
  modifications?: RecipeModification[];
  personalNotes?: string;
  isFavorite?: boolean;
  collections?: string[]; // e.g., ['Family Favorites', 'Quick Meals']
}

export interface SaveRecipeResponse {
  savedRecipeId: string;
  success: boolean;
  message: string;
}

export interface UserRecipeCollection {
  recipes: SavedRecipe[];
  totalCount: number;
  collections: string[];
  filters: RecipeFilters;
}

export interface SavedRecipe extends EnhancedRecipe {
  savedRecipeId: string;
  userId: string;
  dateSaved: Date;
  personalNotes?: string;
  isFavorite: boolean;
  collections: string[];
  modifications?: RecipeModification[];
  userRating?: RecipeRating;
  usageHistory: RecipeUsage[];
}

export interface RecipeRating {
  stars: number; // 1-5
  familyFeedback: string;
  difficultyRating: 'easier' | 'as-expected' | 'harder';
  tasteRating: 'loved-it' | 'liked-it' | 'okay' | 'not-for-us';
  wouldMakeAgain: boolean;
}

export interface RecipeUsage {
  mealPlanId: string;
  dateUsed: Date;
  servingsCooked: number;
  notes?: string;
}

export interface RecipeFilters {
  cuisine?: string[];
  dietaryRestrictions?: string[];
  isFavorite?: boolean;
  collections?: string[];
  cookingTime?: { min: number; max: number };
  difficulty?: string[];
  rating?: { min: number; max: number };
  dateRange?: { start: Date; end: Date };
}

// ============================================================================
// INTERNAL SERVICE TYPES
// ============================================================================

/**
 * Internal recipe representation used during processing
 */
export interface InternalRecipe {
  id?: string;
  title: string;
  description: string;
  culturalOrigin: string[];
  cuisine: string;
  sourceUrl: string;
  imageUrl?: string;
  
  // Cooking Information
  totalTimeMinutes: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings: number;
  yieldText: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  
  // Recipe Content
  ingredients: RecipeIngredient[];
  instructions: RecipeInstruction[];
  
  // Cultural Information
  culturalContext: string;
  traditionalOccasions?: string[];
  regionalVariations?: string[];
  
  // Metadata
  nutritionalInfo?: NutritionalInfo;
  tags: string[];
  dietaryInfo: DietaryInfo;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipeIngredient {
  name: string;
  amount: number;
  unit: string;
  notes?: string;
  substitutions?: string[];
  culturalSignificance?: string;
}

export interface RecipeInstruction {
  step: number;
  text: string;
  timeMinutes?: number;
  temperature?: string;
  equipment?: string[];
  culturalTechnique?: string;
}

export interface NutritionalInfo {
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
}

export interface DietaryInfo {
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  isNutFree: boolean;
  isKeto: boolean;
  isPaleo: boolean;
  isHalal?: boolean;
  isKosher?: boolean;
  customRestrictions?: string[];
}

// ============================================================================
// ERROR HANDLING TYPES
// ============================================================================

export enum RecipeSearchErrorType {
  TAVILY_API_ERROR = 'tavily_api_error',
  PERPLEXITY_API_ERROR = 'perplexity_api_error',
  NO_URLS_FOUND = 'no_urls_found',
  PARSING_FAILED = 'parsing_failed',
  VALIDATION_FAILED = 'validation_failed',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  NETWORK_ERROR = 'network_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  TIMEOUT_ERROR = 'timeout_error'
}

export interface RecipeSearchError {
  type: RecipeSearchErrorType;
  message: string;
  details?: any;
  retryable: boolean;
  fallbackAvailable: boolean;
  timestamp: Date;
}

export interface APIResponse<T> {
  data?: T;
  error?: RecipeSearchError;
  cached?: boolean;
  timestamp: Date;
  source: 'tavily' | 'perplexity' | 'cache' | 'fallback';
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface TavilyPerplexityConfig {
  tavily: {
    apiKey: string;
    baseUrl: string;
    defaultSearchDepth: 'basic' | 'advanced';
    maxRetries: number;
    timeoutMs: number;
    qualityThresholds: {
      minTitleLength: number;
      minContentLength: number;
      excludePatterns: string[];
    };
  };
  perplexity: {
    apiKey: string;
    baseUrl: string;
    model: string;
    maxTokens: number;
    temperature: number;
    maxRetries: number;
    timeoutMs: number;
  };
  caching: {
    urlDiscoveryTTL: number; // 4 hours
    recipeParsingTTL: number; // 24 hours
    enableCaching: boolean;
  };
  fallback: {
    enableFallbacks: boolean;
    maxFallbackAttempts: number;
    fallbackSources: string[];
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Utility type for converting internal recipe to enhanced recipe format
 */
export type RecipeConverter = (internal: InternalRecipe) => EnhancedRecipe;

/**
 * Utility type for search result metadata
 */
export interface SearchMetadata {
  totalResults: number;
  searchTime: number;
  source: 'tavily' | 'perplexity' | 'cache' | 'fallback';
  cacheHit: boolean;
  qualityScore: number;
  culturalRelevance: number;
}

/**
 * Utility type for batch operations
 */
export interface BatchSearchRequest {
  queries: EnhancedRecipeSearchRequest[];
  batchId: string;
  priority: 'high' | 'medium' | 'low';
}

export interface BatchSearchResponse {
  results: EnhancedRecipeSearchResponse[];
  batchId: string;
  completedAt: Date;
  errors: RecipeSearchError[];
}