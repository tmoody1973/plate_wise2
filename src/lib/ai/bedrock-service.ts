/**
 * Amazon Bedrock AI Service Integration
 * Provides AI-powered meal planning, recipe recommendations, and cultural authenticity analysis
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput,
  InvokeModelCommandOutput,
} from '@aws-sdk/client-bedrock-runtime';
// AWS credentials will be handled by environment variables

// Types for AI service requests and responses
export interface MealPlanRequest {
  userId: string;
  budgetConstraints: {
    monthlyLimit: number;
    householdSize: number;
    currentSpending: number;
  };
  nutritionalGoals: {
    calorieTarget: number;
    macroTargets: {
      protein: number;
      carbs: number;
      fat: number;
    };
    healthGoals: string[];
  };
  culturalPreferences: string[];
  timeframe: {
    startDate: string;
    endDate: string;
  };
  dietaryRestrictions: string[];
  cookingConstraints: {
    skillLevel: 'beginner' | 'intermediate' | 'advanced';
    availableTime: number;
    equipment: string[];
  };
}

export interface MealPlan {
  id: string;
  name: string;
  totalCost: number;
  meals: PlannedMeal[];
  nutritionalSummary: NutritionalSummary;
  culturalBalance: CulturalBalance;
  shoppingList: string[];
}

export interface PlannedMeal {
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipeName: string;
  servings: number;
  estimatedCost: number;
  culturalOrigin: string;
  ingredients: string[];
  cookingTime: number;
}

export interface NutritionalSummary {
  totalCalories: number;
  macroBreakdown: {
    protein: number;
    carbs: number;
    fat: number;
  };
  micronutrients: Record<string, number>;
}

export interface CulturalBalance {
  authenticity: number;
  diversity: number;
  traditionalMeals: number;
}

export interface RecipeSubstitution {
  originalIngredient: string;
  substitute: string;
  reason: string;
  culturalImpact: 'minimal' | 'moderate' | 'significant';
  costDifference: number;
  availabilityNotes: string;
}

export interface CulturalAnalysis {
  authenticityScore: number;
  culturalSignificance: string;
  traditionalContext: string;
  modernAdaptations: string[];
  preservationNotes: string;
  regionalVariations: string;
  ceremonialUse: string;
  recommendations: string;
}

export interface BudgetOptimization {
  totalSavings: number;
  recommendations: OptimizationRecommendation[];
  alternativeIngredients: RecipeSubstitution[];
  seasonalSuggestions: string[];
}

export interface OptimizationRecommendation {
  type: 'ingredient_swap' | 'bulk_buying' | 'seasonal_timing' | 'store_comparison';
  description: string;
  potentialSavings: number;
  culturalImpact: string;
}

/**
 * Circuit breaker for handling API failures gracefully
 */
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('AI service temporarily unavailable');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}

/**
 * Rate limiter to prevent API abuse
 */
class RateLimiter {
  private requests: number[] = [];
  
  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000
  ) {}

  async checkLimit(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds`);
    }

    this.requests.push(now);
  }
}

/**
 * Amazon Bedrock Service for AI-powered features
 */
export class BedrockService {
  private client: BedrockRuntimeClient | null = null;
  private circuitBreaker: CircuitBreaker;
  private rateLimiter: RateLimiter;
  private readonly modelId = 'anthropic.claude-3-5-sonnet-20241022-v2:0';
  private isAvailable: boolean = false;

  constructor() {
    // Check if AWS credentials are configured
    const hasCredentials = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
    
    if (hasCredentials) {
      this.client = new BedrockRuntimeClient({
        region: process.env.AWS_REGION || 'us-east-1',
        // Credentials will be automatically loaded from environment variables
      });
      this.isAvailable = true;
      console.log('BedrockService initialized with AWS credentials');
    } else {
      console.warn('AWS credentials not configured - AI features will use mock responses');
      this.isAvailable = false;
    }
    
    this.circuitBreaker = new CircuitBreaker();
    this.rateLimiter = new RateLimiter();
  }

  /**
   * Generate AI-powered meal plan based on user constraints
   */
  async generateMealPlan(params: MealPlanRequest): Promise<MealPlan> {
    await this.rateLimiter.checkLimit();

    const prompt = this.buildMealPlanPrompt(params);
    
    return this.circuitBreaker.execute(async () => {
      const response = await this.invokeModel(prompt);
      return this.parseMealPlanResponse(response, params.userId);
    });
  }

  /**
   * Suggest culturally appropriate ingredient substitutions
   */
  async suggestSubstitutions(
    ingredient: string,
    culturalOrigin: string[],
    reason: string,
    budgetLimit?: number
  ): Promise<RecipeSubstitution[]> {
    await this.rateLimiter.checkLimit();

    const prompt = this.buildSubstitutionPrompt(ingredient, culturalOrigin, reason, budgetLimit);
    
    return this.circuitBreaker.execute(async () => {
      const response = await this.invokeModel(prompt);
      return this.parseSubstitutionResponse(response);
    });
  }

  /**
   * Analyze cultural authenticity of recipes
   */
  async analyzeCulturalAuthenticity(
    recipeName: string,
    ingredients: string[],
    culturalOrigin: string,
    cookingMethods: string[]
  ): Promise<CulturalAnalysis> {
    await this.rateLimiter.checkLimit();

    const prompt = this.buildAuthenticityPrompt(recipeName, ingredients, culturalOrigin, cookingMethods);
    
    return this.circuitBreaker.execute(async () => {
      const response = await this.invokeModel(prompt);
      return this.parseAuthenticityResponse(response);
    });
  }

  /**
   * Optimize budget with AI recommendations
   */
  async optimizeBudget(
    currentSpending: number,
    budgetLimit: number,
    preferences: string[],
    restrictions: string[]
  ): Promise<BudgetOptimization> {
    await this.rateLimiter.checkLimit();

    const prompt = this.buildBudgetOptimizationPrompt(currentSpending, budgetLimit, preferences, restrictions);
    
    return this.circuitBreaker.execute(async () => {
      const response = await this.invokeModel(prompt);
      return this.parseBudgetOptimizationResponse(response);
    });
  }

  /**
   * Translate content while preserving cultural context
   */
  async translateContent(
    content: string,
    targetLanguage: string,
    culturalContext?: string
  ): Promise<string> {
    await this.rateLimiter.checkLimit();

    const prompt = this.buildTranslationPrompt(content, targetLanguage, culturalContext);
    
    return this.circuitBreaker.execute(async () => {
      const response = await this.invokeModel(prompt);
      return this.parseTranslationResponse(response);
    });
  }

  /**
   * Parse recipe from text, photo description, or voice input
   */
  async parseRecipe(
    input: string,
    inputType: 'text' | 'photo_description' | 'voice_transcription',
    language: string = 'en'
  ): Promise<any> {
    await this.rateLimiter.checkLimit();

    const prompt = this.buildRecipeParsingPrompt(input, inputType, language);
    
    return this.circuitBreaker.execute(async () => {
      const response = await this.invokeModel(prompt);
      return this.parseRecipeResponse(response);
    });
  }

  /**
   * Generate text response for a given prompt
   */
  async generateText(prompt: string): Promise<string> {
    await this.rateLimiter.checkLimit();
    
    return this.circuitBreaker.execute(async () => {
      return await this.invokeModel(prompt);
    });
  }

  /**
   * Core method to invoke Bedrock model
   */
  private async invokeModel(prompt: string): Promise<string> {
    if (!this.isAvailable || !this.client) {
      console.warn('BedrockService not available - returning mock response');
      return this.generateMockResponse(prompt);
    }

    const input: InvokeModelCommandInput = {
      modelId: this.modelId,
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        top_p: 0.9
      }),
      contentType: 'application/json',
      accept: 'application/json'
    };

    try {
      const command = new InvokeModelCommand(input);
      const response: InvokeModelCommandOutput = await this.client.send(command);
      
      if (!response.body) {
        throw new Error('No response body from Bedrock');
      }

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      return responseBody.content[0].text;
    } catch (error) {
      console.error('Bedrock API error, falling back to mock response:', error);
      return this.generateMockResponse(prompt);
    }
  }

  /**
   * Build meal plan generation prompt
   */
  private buildMealPlanPrompt(params: MealPlanRequest): string {
    return `You are a culturally-aware meal planning assistant for PlateWise. Generate a comprehensive meal plan with the following constraints:

CULTURAL PREFERENCES: ${params.culturalPreferences.join(', ')}
DIETARY RESTRICTIONS: ${params.dietaryRestrictions.join(', ')}
BUDGET LIMIT: $${params.budgetConstraints.monthlyLimit} for ${params.budgetConstraints.householdSize} people
CURRENT SPENDING: $${params.budgetConstraints.currentSpending}
TIME FRAME: ${params.timeframe.startDate} to ${params.timeframe.endDate}
NUTRITIONAL GOALS: ${params.nutritionalGoals.calorieTarget} calories/day, Protein: ${params.nutritionalGoals.macroTargets.protein}g, Carbs: ${params.nutritionalGoals.macroTargets.carbs}g, Fat: ${params.nutritionalGoals.macroTargets.fat}g
COOKING CONSTRAINTS: ${params.cookingConstraints.skillLevel} level, ${params.cookingConstraints.availableTime} minutes available, Equipment: ${params.cookingConstraints.equipment.join(', ')}

REQUIREMENTS:
1. Respect cultural authenticity while staying within budget
2. Provide accurate cost estimates for each meal (use realistic grocery prices)
3. Include traditional cooking methods when possible
4. Suggest seasonal ingredients to reduce costs
5. Balance nutrition across the meal plan
6. Consider leftover utilization to minimize waste
7. Ensure meals are appropriate for the cooking skill level
8. Include cultural context and significance for traditional dishes

FORMAT: Return a valid JSON object with this structure:
{
  "mealPlan": {
    "name": "Weekly Cultural Meal Plan",
    "totalCost": 0,
    "meals": [
      {
        "date": "YYYY-MM-DD",
        "mealType": "breakfast|lunch|dinner|snack",
        "recipeName": "Traditional Recipe Name",
        "servings": 0,
        "estimatedCost": 0,
        "culturalOrigin": "Culture Name",
        "ingredients": ["ingredient1", "ingredient2"],
        "cookingTime": 0,
        "culturalContext": "Brief explanation of cultural significance"
      }
    ],
    "nutritionalSummary": {
      "totalCalories": 0,
      "macroBreakdown": {"protein": 0, "carbs": 0, "fat": 0}
    },
    "culturalBalance": {
      "authenticity": 0.0,
      "diversity": 0.0,
      "traditionalMeals": 0
    },
    "shoppingList": ["consolidated ingredient list"],
    "budgetNotes": "Cost-saving tips and cultural shopping advice"
  }
}`;
  }

  /**
   * Build ingredient substitution prompt
   */
  private buildSubstitutionPrompt(
    ingredient: string,
    culturalOrigin: string[],
    reason: string,
    budgetLimit?: number
  ): string {
    return `You are a cultural food expert helping with ingredient substitutions for PlateWise users.

ORIGINAL INGREDIENT: ${ingredient}
CULTURAL ORIGIN: ${culturalOrigin.join(', ')}
SUBSTITUTION REASON: ${reason}
${budgetLimit ? `BUDGET CONSTRAINT: $${budgetLimit}` : ''}

REQUIREMENTS:
1. Maintain cultural authenticity as much as possible
2. Explain the impact on flavor and tradition
3. Provide cost comparison when possible
4. Include preparation method adjustments if needed
5. Suggest where to source authentic alternatives
6. Consider dietary restrictions and availability

FORMAT: Return a valid JSON array:
[
  {
    "originalIngredient": "${ingredient}",
    "substitute": "Alternative ingredient name",
    "reason": "Why this substitution works",
    "culturalImpact": "minimal|moderate|significant",
    "costDifference": 0,
    "availabilityNotes": "Where to find this ingredient",
    "preparationNotes": "How to prepare or use differently",
    "flavorImpact": "How it affects the dish's taste",
    "culturalContext": "Cultural significance of the substitution"
  }
]`;
  }

  /**
   * Build cultural authenticity analysis prompt
   */
  private buildAuthenticityPrompt(
    recipeName: string,
    ingredients: string[],
    culturalOrigin: string,
    cookingMethods: string[]
  ): string {
    return `You are a cultural food historian analyzing recipe authenticity for PlateWise.

RECIPE NAME: ${recipeName}
CULTURAL ORIGIN: ${culturalOrigin}
INGREDIENTS: ${ingredients.join(', ')}
COOKING METHODS: ${cookingMethods.join(', ')}

ANALYSIS REQUIREMENTS:
1. Assess cultural authenticity on a scale of 0-10
2. Identify traditional vs. modern elements
3. Explain cultural significance and context
4. Note any ceremonial or religious importance
5. Suggest ways to increase authenticity while maintaining accessibility
6. Provide historical context and regional variations

FORMAT: Return a valid JSON object:
{
  "authenticityScore": 0,
  "culturalSignificance": "Detailed explanation of cultural importance",
  "traditionalContext": "Historical and cultural background",
  "modernAdaptations": ["list of modern changes from traditional"],
  "preservationNotes": "How to maintain cultural integrity",
  "regionalVariations": "Different versions across regions",
  "ceremonialUse": "Any religious or ceremonial significance",
  "recommendations": "How to increase authenticity"
}`;
  }

  /**
   * Build budget optimization prompt
   */
  private buildBudgetOptimizationPrompt(
    currentSpending: number,
    budgetLimit: number,
    preferences: string[],
    restrictions: string[]
  ): string {
    return `You are a budget optimization expert for PlateWise, helping users save money while maintaining cultural food preferences.

CURRENT SPENDING: $${currentSpending}
BUDGET LIMIT: $${budgetLimit}
OVERAGE: $${currentSpending - budgetLimit}
CULTURAL PREFERENCES: ${preferences.join(', ')}
DIETARY RESTRICTIONS: ${restrictions.join(', ')}

OPTIMIZATION REQUIREMENTS:
1. Identify specific cost-saving opportunities
2. Suggest ingredient swaps that maintain cultural authenticity
3. Recommend bulk buying opportunities
4. Identify seasonal timing for better prices
5. Suggest store comparison strategies
6. Maintain nutritional value and cultural significance

FORMAT: Return a valid JSON object:
{
  "totalSavings": 0,
  "recommendations": [
    {
      "type": "ingredient_swap|bulk_buying|seasonal_timing|store_comparison",
      "description": "Specific recommendation",
      "potentialSavings": 0,
      "culturalImpact": "How this affects cultural authenticity",
      "implementationTips": "How to implement this suggestion"
    }
  ],
  "alternativeIngredients": [
    {
      "original": "expensive ingredient",
      "alternative": "budget-friendly option",
      "savingsPerUnit": 0,
      "culturalNotes": "Cultural considerations"
    }
  ],
  "seasonalSuggestions": ["seasonal cost-saving tips"],
  "shoppingStrategy": "Overall shopping approach for maximum savings"
}`;
  }

  /**
   * Build translation prompt with cultural context
   */
  private buildTranslationPrompt(
    content: string,
    targetLanguage: string,
    culturalContext?: string
  ): string {
    return `You are a cultural translation expert for PlateWise. Translate the following content while preserving cultural nuances and food-related terminology.

CONTENT TO TRANSLATE: ${content}
TARGET LANGUAGE: ${targetLanguage}
${culturalContext ? `CULTURAL CONTEXT: ${culturalContext}` : ''}

TRANSLATION REQUIREMENTS:
1. Preserve cultural food terminology where appropriate
2. Maintain the meaning and tone of the original
3. Use culturally appropriate expressions
4. Keep ingredient names authentic when possible
5. Provide pronunciation guides for complex terms
6. Ensure the translation is natural for native speakers

FORMAT: Return only the translated text, maintaining the original structure and formatting.`;
  }

  /**
   * Build recipe parsing prompt
   */
  private buildRecipeParsingPrompt(
    input: string,
    inputType: 'text' | 'photo_description' | 'voice_transcription',
    language: string
  ): string {
    return `You are a recipe parsing expert for PlateWise. Parse the following ${inputType} input into a structured recipe format.

INPUT (${inputType} in ${language}): ${input}

PARSING REQUIREMENTS:
1. Extract recipe name, ingredients with quantities, and instructions
2. Identify cultural origin and cuisine type
3. Estimate cooking and preparation times
4. Determine serving size
5. Assess difficulty level
6. Extract any cultural context or significance mentioned
7. Normalize ingredient names and quantities to standard units

FORMAT: Return a valid JSON object:
{
  "recipeName": "Extracted recipe name",
  "culturalOrigin": "Identified cultural background",
  "cuisine": "Cuisine type",
  "servings": 0,
  "prepTime": 0,
  "cookTime": 0,
  "difficulty": "easy|medium|hard",
  "ingredients": [
    {
      "name": "ingredient name",
      "amount": 0,
      "unit": "standard unit",
      "notes": "any special notes"
    }
  ],
  "instructions": [
    {
      "step": 1,
      "instruction": "detailed instruction",
      "technique": "cooking technique used",
      "time": 0
    }
  ],
  "culturalNotes": "Any cultural significance mentioned",
  "tags": ["relevant tags"],
  "equipment": ["required equipment"]
}`;
  }

  /**
   * Parse meal plan response from AI
   */
  private parseMealPlanResponse(response: string, userId: string): MealPlan {
    try {
      const parsed = JSON.parse(response);
      const mealPlan = parsed.mealPlan;
      
      return {
        id: `meal_plan_${userId}_${Date.now()}`,
        name: mealPlan.name,
        totalCost: mealPlan.totalCost,
        meals: mealPlan.meals,
        nutritionalSummary: mealPlan.nutritionalSummary,
        culturalBalance: mealPlan.culturalBalance,
        shoppingList: mealPlan.shoppingList
      };
    } catch (error) {
      console.error('Failed to parse meal plan response:', error);
      throw new Error('Invalid meal plan response from AI service');
    }
  }

  /**
   * Parse substitution response from AI
   */
  private parseSubstitutionResponse(response: string): RecipeSubstitution[] {
    try {
      const parsed = JSON.parse(response);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      console.error('Failed to parse substitution response:', error);
      throw new Error('Invalid substitution response from AI service');
    }
  }

  /**
   * Parse authenticity analysis response from AI
   */
  private parseAuthenticityResponse(response: string): CulturalAnalysis {
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse authenticity response:', error);
      throw new Error('Invalid authenticity analysis response from AI service');
    }
  }

  /**
   * Parse budget optimization response from AI
   */
  private parseBudgetOptimizationResponse(response: string): BudgetOptimization {
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse budget optimization response:', error);
      throw new Error('Invalid budget optimization response from AI service');
    }
  }

  /**
   * Parse translation response from AI
   */
  private parseTranslationResponse(response: string): string {
    // Translation responses are typically plain text
    return response.trim();
  }

  /**
   * Parse recipe parsing response from AI
   */
  private parseRecipeResponse(response: string): any {
    try {
      return JSON.parse(response);
    } catch (error) {
      console.error('Failed to parse recipe response:', error);
      throw new Error('Invalid recipe parsing response from AI service');
    }
  }

  /**
   * Generate mock response when Bedrock is not available
   */
  private generateMockResponse(prompt: string): string {
    if (prompt.includes('meal plan') || prompt.includes('MEAL PLAN')) {
      return JSON.stringify({
        "recipes": [
          {
            "recipeName": "Sample Cultural Dish",
            "servings": 4,
            "estimatedCost": 12,
            "culturalOrigin": "Mediterranean",
            "ingredients": ["olive oil", "tomatoes", "herbs", "vegetables"],
            "cookingTime": 30,
            "culturalContext": "Traditional family meal with cultural significance"
          }
        ],
        "nutritionalSummary": {
          "totalCalories": 1600,
          "macroBreakdown": {"protein": 60, "carbs": 200, "fat": 80}
        },
        "culturalBalance": {
          "authenticity": 8.5,
          "diversity": 7.0,
          "traditionalMeals": 3
        },
        "shoppingList": ["olive oil", "tomatoes", "fresh herbs", "seasonal vegetables"],
        "budgetNotes": "Mock response - consider seasonal ingredients for best prices"
      });
    }

    if (prompt.includes('substitut')) {
      return JSON.stringify([
        {
          "originalIngredient": "unknown",
          "substitute": "common alternative",
          "reason": "Mock substitution for testing",
          "culturalImpact": "minimal",
          "costDifference": 0,
          "availabilityNotes": "Available at most grocery stores",
          "preparationNotes": "Use as directed in original recipe",
          "flavorImpact": "Similar flavor profile",
          "culturalContext": "Maintains cultural essence"
        }
      ]);
    }

    if (prompt.includes('authentic')) {
      return JSON.stringify({
        "authenticityScore": 7,
        "culturalSignificance": "Mock analysis - traditional preparation methods",
        "traditionalContext": "Historical cultural background",
        "modernAdaptations": ["ingredient availability", "cooking methods"],
        "preservationNotes": "Maintain traditional cooking techniques",
        "regionalVariations": "Varies by region and family tradition",
        "ceremonialUse": "Often served during family gatherings",
        "recommendations": "Source authentic ingredients when possible"
      });
    }

    if (prompt.includes('recipe parsing') || prompt.includes('Parse the following')) {
      return JSON.stringify({
        "recipeName": "Mock Parsed Recipe",
        "culturalOrigin": "International",
        "cuisine": "International",
        "servings": 4,
        "prepTime": 15,
        "cookTime": 30,
        "difficulty": "medium",
        "ingredients": [
          {
            "name": "sample ingredient",
            "amount": 2,
            "unit": "cups",
            "notes": "or substitute with similar ingredient"
          },
          {
            "name": "basic seasoning",
            "amount": 1,
            "unit": "tsp",
            "notes": "to taste"
          }
        ],
        "instructions": [
          {
            "step": 1,
            "instruction": "This is a mock recipe parsing result for development",
            "technique": "mixing",
            "time": 5
          },
          {
            "step": 2,
            "instruction": "Continue following the original recipe instructions",
            "technique": "cooking",
            "time": 25
          }
        ],
        "culturalNotes": "Mock recipe - replace with actual parsing when Bedrock is available",
        "tags": ["mock", "development", "placeholder"],
        "equipment": ["basic cooking utensils"]
      });
    }

    return "Mock response - Bedrock service not available";
  }
}

/**
 * Singleton instance of BedrockService
 */
export const bedrockService = new BedrockService();