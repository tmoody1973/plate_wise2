/**
 * AI Service Factory and Unified Interface
 * Provides a single entry point for all AI-powered features in PlateWise
 */

// import { BedrockService, bedrockService } from './bedrock-service'; // DISABLED
import { getAIConfig, validateAIConfig } from './config';
import type {
  MealPlanRequest,
  MealPlan,
  RecipeSubstitution,
  CulturalAnalysis,
  BudgetOptimization,
} from './bedrock-service';

// Re-export types for easier imports
export type {
  MealPlanRequest,
  MealPlan,
  PlannedMeal,
  NutritionalSummary,
  CulturalBalance,
  RecipeSubstitution,
  CulturalAnalysis,
  BudgetOptimization,
  OptimizationRecommendation,
} from './bedrock-service';

/**
 * AI Service Interface
 * Defines the contract for all AI services
 */
export interface AIService {
  generateMealPlan(params: MealPlanRequest): Promise<MealPlan>;
  suggestSubstitutions(
    ingredient: string,
    culturalOrigin: string[],
    reason: string,
    budgetLimit?: number
  ): Promise<RecipeSubstitution[]>;
  analyzeCulturalAuthenticity(
    recipeName: string,
    ingredients: string[],
    culturalOrigin: string,
    cookingMethods: string[]
  ): Promise<CulturalAnalysis>;
  optimizeBudget(
    currentSpending: number,
    budgetLimit: number,
    preferences: string[],
    restrictions: string[]
  ): Promise<BudgetOptimization>;
  translateContent(
    content: string,
    targetLanguage: string,
    culturalContext?: string
  ): Promise<string>;
  parseRecipe(
    input: string,
    inputType: 'text' | 'photo_description' | 'voice_transcription',
    language?: string
  ): Promise<any>;
}

/**
 * AI Service Factory
 * Creates and manages AI service instances
 */
class AIServiceFactory {
  private static instance: AIServiceFactory;
  private bedrockService: BedrockService;
  private isInitialized = false;

  private constructor() {
    this.bedrockService = bedrockService;
  }

  static getInstance(): AIServiceFactory {
    if (!AIServiceFactory.instance) {
      AIServiceFactory.instance = new AIServiceFactory();
    }
    return AIServiceFactory.instance;
  }

  /**
   * Initialize AI services with configuration validation
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Validate configuration
      validateAIConfig();
      
      // Initialize services
      const config = getAIConfig();
      console.log('AI services initialized with config:', {
        region: config.bedrock.region,
        modelId: config.bedrock.modelId,
        rateLimiting: config.rateLimiting,
      });
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize AI services:', error);
      throw new Error(`AI service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the primary AI service (Bedrock)
   */
  getAIService(): AIService {
    if (!this.isInitialized) {
      throw new Error('AI services not initialized. Call initialize() first.');
    }
    return this.bedrockService;
  }

  /**
   * Health check for AI services
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; services: Record<string, boolean> }> {
    const services = {
      bedrock: false,
    };

    try {
      // Test Bedrock service with a simple translation
      await this.bedrockService.translateContent('Hello', 'es');
      services.bedrock = true;
    } catch (error) {
      console.warn('Bedrock service health check failed:', error);
    }

    const allHealthy = Object.values(services).every(status => status);
    
    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      services,
    };
  }
}

/**
 * Convenience functions for common AI operations
 */

/**
 * Generate a meal plan with AI
 */
export async function generateAIMealPlan(params: MealPlanRequest): Promise<MealPlan> {
  const factory = AIServiceFactory.getInstance();
  await factory.initialize();
  const aiService = factory.getAIService();
  return aiService.generateMealPlan(params);
}

/**
 * Get ingredient substitutions with cultural awareness
 */
export async function getIngredientSubstitutions(
  ingredient: string,
  culturalOrigin: string[],
  reason: string,
  budgetLimit?: number
): Promise<RecipeSubstitution[]> {
  const factory = AIServiceFactory.getInstance();
  await factory.initialize();
  const aiService = factory.getAIService();
  return aiService.suggestSubstitutions(ingredient, culturalOrigin, reason, budgetLimit);
}

/**
 * Analyze recipe cultural authenticity
 */
export async function analyzeRecipeAuthenticity(
  recipeName: string,
  ingredients: string[],
  culturalOrigin: string,
  cookingMethods: string[]
): Promise<CulturalAnalysis> {
  const factory = AIServiceFactory.getInstance();
  await factory.initialize();
  const aiService = factory.getAIService();
  return aiService.analyzeCulturalAuthenticity(recipeName, ingredients, culturalOrigin, cookingMethods);
}

/**
 * Get budget optimization recommendations
 */
export async function getBudgetOptimization(
  currentSpending: number,
  budgetLimit: number,
  preferences: string[],
  restrictions: string[]
): Promise<BudgetOptimization> {
  const factory = AIServiceFactory.getInstance();
  await factory.initialize();
  const aiService = factory.getAIService();
  return aiService.optimizeBudget(currentSpending, budgetLimit, preferences, restrictions);
}

/**
 * Translate content with cultural context
 */
export async function translateWithCulturalContext(
  content: string,
  targetLanguage: string,
  culturalContext?: string
): Promise<string> {
  const factory = AIServiceFactory.getInstance();
  await factory.initialize();
  const aiService = factory.getAIService();
  return aiService.translateContent(content, targetLanguage, culturalContext);
}

/**
 * Parse recipe from various input types
 */
export async function parseRecipeInput(
  input: string,
  inputType: 'text' | 'photo_description' | 'voice_transcription',
  language: string = 'en'
): Promise<any> {
  const factory = AIServiceFactory.getInstance();
  await factory.initialize();
  const aiService = factory.getAIService();
  return aiService.parseRecipe(input, inputType, language);
}

/**
 * Check AI service health
 */
export async function checkAIHealth(): Promise<{ status: 'healthy' | 'unhealthy'; services: Record<string, boolean> }> {
  const factory = AIServiceFactory.getInstance();
  return factory.healthCheck();
}

// Export the factory instance for advanced usage
export const aiServiceFactory = AIServiceFactory.getInstance();