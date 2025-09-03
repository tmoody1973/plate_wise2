/**
 * Recipe Analysis Service
 * Handles AI-powered recipe parsing, analysis, and enhancement
 */

import { bedrockService } from '@/lib/ai/bedrock-service';
import { krogerService } from '@/lib/external-apis/kroger-service';
import type { 
  Recipe, 
  Ingredient, 
  Instruction, 
  NutritionalInfo, 
  CostAnalysis,
  CulturalAuthenticity 
} from '@/types';
import type { CreateRecipeInput } from './recipe-database-service';

export interface RecipeParsingInput {
  text?: string;
  image?: File;
  voice?: Blob;
  language?: string;
  userLocation?: string;
}

export interface ParsedRecipeResult {
  success: boolean;
  recipe?: CreateRecipeInput;
  errors?: string[];
  confidence?: number;
  suggestions?: string[];
}

export interface RecipeAnalysisOptions {
  includeCostAnalysis?: boolean;
  includeNutritionalAnalysis?: boolean;
  includeCulturalAnalysis?: boolean;
  userLocation?: string;
  culturalContext?: string;
}

export interface EnhancedRecipeAnalysis {
  recipe: Recipe;
  nutritionalAnalysis?: {
    info: NutritionalInfo;
    healthScore: number;
    recommendations: string[];
  };
  costAnalysis?: {
    analysis: CostAnalysis;
    budgetTips: string[];
    seasonalNotes: string[];
  };
  culturalAnalysis?: {
    authenticity: CulturalAuthenticity;
    preservationTips: string[];
    regionalVariations: string[];
  };
  overallScore: number;
  recommendations: string[];
}

/**
 * Recipe Analysis Service Class
 */
export class RecipeAnalysisService {
  /**
   * Parse recipe from various input formats
   */
  async parseRecipe(input: RecipeParsingInput): Promise<ParsedRecipeResult> {
    try {
      let recipeText = '';
      let inputType: 'text' | 'photo_description' | 'voice_transcription' = 'text';

      if (input.text) {
        recipeText = input.text;
        inputType = 'text';
      } else if (input.image) {
        // Convert image to text description using AI vision
        recipeText = await this.extractTextFromImage(input.image);
        inputType = 'photo_description';
      } else if (input.voice) {
        // Convert voice to text using speech recognition
        recipeText = await this.transcribeVoice(input.voice);
        inputType = 'voice_transcription';
      } else {
        return {
          success: false,
          errors: ['No input provided'],
        };
      }

      // Parse recipe using AI
      const parsedData = await bedrockService.parseRecipe(
        recipeText,
        inputType,
        input.language || 'en'
      );

      if (!parsedData) {
        return {
          success: false,
          errors: ['Failed to parse recipe with AI'],
        };
      }

      // Convert to CreateRecipeInput format
      const recipe = await this.convertParsedDataToRecipe(parsedData, input.userLocation);
      
      // Calculate confidence score
      const confidence = this.calculateParsingConfidence(parsedData, recipeText);

      // Generate suggestions for improvement
      const suggestions = await this.generateImprovementSuggestions(recipe);

      return {
        success: true,
        recipe,
        confidence,
        suggestions,
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
   * Perform comprehensive recipe analysis
   */
  async analyzeRecipe(
    recipe: Recipe,
    options: RecipeAnalysisOptions = {}
  ): Promise<EnhancedRecipeAnalysis> {
    const analysis: EnhancedRecipeAnalysis = {
      recipe,
      overallScore: 0,
      recommendations: [],
    };

    try {
      // Nutritional analysis
      if (options.includeNutritionalAnalysis !== false) {
        analysis.nutritionalAnalysis = await this.performNutritionalAnalysis(recipe);
      }

      // Cost analysis
      if (options.includeCostAnalysis !== false) {
        analysis.costAnalysis = await this.performCostAnalysis(recipe, options.userLocation);
      }

      // Cultural analysis
      if (options.includeCulturalAnalysis !== false) {
        analysis.culturalAnalysis = await this.performCulturalAnalysis(
          recipe,
          options.culturalContext
        );
      }

      // Calculate overall score
      analysis.overallScore = this.calculateOverallScore(analysis);

      // Generate comprehensive recommendations
      analysis.recommendations = await this.generateComprehensiveRecommendations(analysis);

      return analysis;
    } catch (error) {
      console.error('Failed to analyze recipe:', error);
      throw error;
    }
  }

  /**
   * Enhance recipe with AI-generated improvements
   */
  async enhanceRecipe(recipe: CreateRecipeInput): Promise<CreateRecipeInput> {
    try {
      // Generate nutritional information if missing
      if (!recipe.nutritionalInfo && recipe.ingredients.length > 0) {
        const nutritionalInfo = await this.generateNutritionalInfo(recipe.ingredients);
        recipe.nutritionalInfo = nutritionalInfo;
      }

      // Generate cost analysis if missing
      if (!recipe.costAnalysis && recipe.ingredients.length > 0) {
        const costAnalysis = await this.generateCostAnalysis(recipe.ingredients);
        recipe.costAnalysis = costAnalysis;
      }

      // Enhance cultural authenticity score
      if (recipe.metadata.culturalAuthenticity === 0) {
        const authenticityScore = await this.calculateCulturalAuthenticity(recipe);
        recipe.metadata.culturalAuthenticity = authenticityScore;
      }

      // Generate tags if missing
      if (recipe.tags.length === 0) {
        const tags = await this.generateTags(recipe);
        recipe.tags = tags;
      }

      // Optimize cooking times
      if (recipe.metadata.totalTime === 0) {
        const optimizedTimes = await this.optimizeCookingTimes(recipe);
        recipe.metadata = { ...recipe.metadata, ...optimizedTimes };
      }

      return recipe;
    } catch (error) {
      console.error('Failed to enhance recipe:', error);
      return recipe; // Return original recipe if enhancement fails
    }
  }

  /**
   * Generate ingredient substitutions with cultural awareness
   */
  async generateSubstitutions(
    ingredient: Ingredient,
    culturalOrigin: string[],
    reason: 'dietary' | 'availability' | 'cost' | 'preference',
    budgetLimit?: number
  ): Promise<Array<{
    substitute: Ingredient;
    culturalImpact: 'minimal' | 'moderate' | 'significant';
    explanation: string;
    costDifference: number;
  }>> {
    try {
      const substitutions = await bedrockService.suggestSubstitutions(
        ingredient.name,
        culturalOrigin,
        reason,
        budgetLimit
      );

      return substitutions.map(sub => ({
        substitute: {
          id: `sub_${ingredient.id}`,
          name: sub.substitute,
          amount: ingredient.amount,
          unit: ingredient.unit,
          culturalName: ingredient.culturalName,
          substitutes: [],
          costPerUnit: ingredient.costPerUnit + sub.costDifference,
          availability: [],
        },
        culturalImpact: sub.culturalImpact,
        explanation: sub.reason,
        costDifference: sub.costDifference,
      }));
    } catch (error) {
      console.error('Failed to generate substitutions:', error);
      return [];
    }
  }

  /**
   * Analyze recipe difficulty and suggest modifications
   */
  async analyzeDifficulty(recipe: Recipe): Promise<{
    difficulty: 'easy' | 'medium' | 'hard';
    factors: string[];
    simplificationSuggestions: string[];
    skillRequirements: string[];
  }> {
    try {
      const factors = [];
      const simplificationSuggestions = [];
      const skillRequirements = [];

      // Analyze ingredient complexity
      const complexIngredients = recipe.ingredients.filter(ing => 
        ing.culturalName || ing.name.includes('specialty') || ing.name.includes('exotic')
      );
      if (complexIngredients.length > 0) {
        factors.push('Complex or specialty ingredients required');
        simplificationSuggestions.push('Consider common substitutes for specialty ingredients');
      }

      // Analyze cooking techniques
      const complexTechniques = recipe.instructions.filter(inst => 
        inst.culturalTechnique || 
        inst.description.toLowerCase().includes('fold') ||
        inst.description.toLowerCase().includes('temper') ||
        inst.description.toLowerCase().includes('emulsify')
      );
      if (complexTechniques.length > 0) {
        factors.push('Advanced cooking techniques required');
        skillRequirements.push('Knowledge of traditional cooking methods');
      }

      // Analyze time requirements
      if (recipe.metadata.totalTime > 120) {
        factors.push('Long cooking time required');
        simplificationSuggestions.push('Consider pressure cooking or slow cooker adaptations');
      }

      // Analyze number of steps
      if (recipe.instructions.length > 10) {
        factors.push('Many preparation steps');
        simplificationSuggestions.push('Prep ingredients in advance to streamline cooking');
      }

      // Determine difficulty
      let difficulty: 'easy' | 'medium' | 'hard' = 'easy';
      if (factors.length >= 3) {
        difficulty = 'hard';
      } else if (factors.length >= 1) {
        difficulty = 'medium';
      }

      return {
        difficulty,
        factors,
        simplificationSuggestions,
        skillRequirements,
      };
    } catch (error) {
      console.error('Failed to analyze difficulty:', error);
      return {
        difficulty: 'medium',
        factors: [],
        simplificationSuggestions: [],
        skillRequirements: [],
      };
    }
  }

  /**
   * Private helper methods
   */

  /**
   * Extract text from image using AI vision
   */
  private async extractTextFromImage(image: File): Promise<string> {
    // TODO: Implement image-to-text conversion using AI vision
    // This would typically involve:
    // 1. Upload image to a vision AI service
    // 2. Extract text and recipe information
    // 3. Return structured text description
    
    throw new Error('Image parsing not yet implemented');
  }

  /**
   * Transcribe voice to text
   */
  private async transcribeVoice(voice: Blob): Promise<string> {
    // TODO: Implement voice-to-text conversion
    // This would typically involve:
    // 1. Convert blob to audio format
    // 2. Send to speech recognition service
    // 3. Return transcribed text
    
    throw new Error('Voice transcription not yet implemented');
  }

  /**
   * Convert parsed AI data to CreateRecipeInput format
   */
  private async convertParsedDataToRecipe(
    parsedData: any,
    userLocation?: string
  ): Promise<CreateRecipeInput> {
    const ingredients: Ingredient[] = parsedData.ingredients.map((ing: any, index: number) => ({
      id: `ing_${index}`,
      name: ing.name,
      amount: ing.amount || 0,
      unit: ing.unit || '',
      culturalName: ing.culturalName,
      substitutes: [],
      costPerUnit: 0, // Will be calculated later
      availability: [],
      culturalSignificance: ing.notes,
    }));

    const instructions: Instruction[] = parsedData.instructions.map((inst: any) => ({
      step: inst.step,
      description: inst.instruction,
      culturalTechnique: inst.technique,
      estimatedTime: inst.time,
    }));

    return {
      title: parsedData.recipeName,
      description: parsedData.culturalNotes || '',
      culturalOrigin: [parsedData.culturalOrigin],
      cuisine: parsedData.cuisine,
      ingredients,
      instructions,
      metadata: {
        servings: parsedData.servings || 4,
        prepTime: parsedData.prepTime || 0,
        cookTime: parsedData.cookTime || 0,
        totalTime: (parsedData.prepTime || 0) + (parsedData.cookTime || 0),
        difficulty: parsedData.difficulty || 'medium',
        culturalAuthenticity: 8, // Default high score for parsed recipes
      },
      tags: parsedData.tags || [],
      source: 'user',
    };
  }

  /**
   * Calculate parsing confidence score
   */
  private calculateParsingConfidence(parsedData: any, originalText: string): number {
    let confidence = 0.5; // Base confidence

    // Check if essential fields are present
    if (parsedData.recipeName) confidence += 0.1;
    if (parsedData.ingredients && parsedData.ingredients.length > 0) confidence += 0.2;
    if (parsedData.instructions && parsedData.instructions.length > 0) confidence += 0.2;

    // Check ingredient detail quality
    const detailedIngredients = parsedData.ingredients?.filter((ing: any) => 
      ing.amount && ing.unit
    ) || [];
    confidence += (detailedIngredients.length / (parsedData.ingredients?.length || 1)) * 0.1;

    // Check instruction detail quality
    const detailedInstructions = parsedData.instructions?.filter((inst: any) => 
      inst.instruction && inst.instruction.length > 10
    ) || [];
    confidence += (detailedInstructions.length / (parsedData.instructions?.length || 1)) * 0.1;

    return Math.min(1.0, confidence);
  }

  /**
   * Generate improvement suggestions
   */
  private async generateImprovementSuggestions(recipe: CreateRecipeInput): Promise<string[]> {
    const suggestions: string[] = [];

    // Check for missing information
    if (!recipe.description) {
      suggestions.push('Add a description to help others understand the dish');
    }

    if (recipe.ingredients.some(ing => !ing.amount || !ing.unit)) {
      suggestions.push('Specify amounts and units for all ingredients');
    }

    if (recipe.metadata.prepTime === 0 && recipe.metadata.cookTime === 0) {
      suggestions.push('Add preparation and cooking times');
    }

    if (recipe.tags.length === 0) {
      suggestions.push('Add tags to help categorize the recipe');
    }

    return suggestions;
  }

  /**
   * Perform nutritional analysis
   */
  private async performNutritionalAnalysis(recipe: Recipe): Promise<{
    info: NutritionalInfo;
    healthScore: number;
    recommendations: string[];
  }> {
    try {
      // Simplified nutritional analysis without external API
      // This uses basic estimation based on ingredients
      const info: NutritionalInfo = {
        calories: this.estimateCalories(recipe),
        protein: this.estimateProtein(recipe),
        carbs: this.estimateCarbs(recipe),
        fat: this.estimateFat(recipe),
        fiber: this.estimateFiber(recipe),
        sugar: this.estimateSugar(recipe),
        sodium: this.estimateSodium(recipe),
        vitamins: {},
        minerals: {},
      };

      // Calculate health score
      const healthScore = this.calculateHealthScore(info);

      // Generate recommendations
      const recommendations = this.generateNutritionalRecommendations(info);

      return { info, healthScore, recommendations };
    } catch (error) {
      console.error('Failed to perform nutritional analysis:', error);
      throw error;
    }
  }

  /**
   * Perform cost analysis
   */
  private async performCostAnalysis(recipe: Recipe, userLocation?: string): Promise<{
    analysis: CostAnalysis;
    budgetTips: string[];
    seasonalNotes: string[];
  }> {
    try {
      // Get pricing data from Kroger API
      const costAnalysis: CostAnalysis = {
        totalCost: 0,
        costPerServing: 0,
        storeComparison: [],
        seasonalTrends: [],
        bulkBuyingOpportunities: [],
        couponSavings: [],
        alternativeIngredients: [],
      };

      let totalCost = 0;

      for (const ingredient of recipe.ingredients) {
        try {
          // Search for ingredient pricing
          const products = await krogerService.searchProducts({
            query: ingredient.name,
            storeId: userLocation || 'default'
          });

          if (products.length > 0) {
            const product = products[0];
            // Prefer promo price if available
            const price = (product?.price?.promo ?? product?.price?.regular) ?? 0;
            const sizeStr = product?.size;
            // Try to parse pack size like "15 oz", "500 g", "1 lb", "12 fl oz"
            const { parsePackSize, estimateIngredientCost, normalizeUnit } = await import('@/utils/units');
            const parsed = parsePackSize(sizeStr);
            if (parsed && price) {
              const { estimatedCost } = estimateIngredientCost({
                quantity: ingredient.amount || 0,
                unit: ingredient.unit || 'each',
                packSize: parsed.qty,
                packUnit: parsed.unit,
                packPrice: price,
              });
              totalCost += estimatedCost;
            } else {
              // Fallback: treat as each
              const u = normalizeUnit(ingredient.unit || 'each') || 'each'
              const qty = u === 'each' ? Math.max(1, Math.ceil(ingredient.amount || 0)) : (ingredient.amount || 0)
              totalCost += Math.max(0, price) * (qty || 0);
            }
          }
        } catch (error) {
          console.error(`Failed to get pricing for ${ingredient.name}:`, error);
        }
      }

      costAnalysis.totalCost = totalCost;
      costAnalysis.costPerServing = totalCost / recipe.metadata.servings;

      // Generate budget tips
      const budgetTips = await this.generateBudgetTips(recipe);

      // Generate seasonal notes
      const seasonalNotes = await this.generateSeasonalNotes(recipe);

      return { analysis: costAnalysis, budgetTips, seasonalNotes };
    } catch (error) {
      console.error('Failed to perform cost analysis:', error);
      throw error;
    }
  }

  /**
   * Perform cultural analysis
   */
  private async performCulturalAnalysis(
    recipe: Recipe,
    culturalContext?: string
  ): Promise<{
    authenticity: CulturalAuthenticity;
    preservationTips: string[];
    regionalVariations: string[];
  }> {
    try {
      const analysis = await bedrockService.analyzeCulturalAuthenticity(
        recipe.title,
        recipe.ingredients.map(ing => ing.name),
        recipe.culturalOrigin[0] || recipe.cuisine,
        recipe.instructions.map(inst => inst.culturalTechnique || inst.description)
      );

      const authenticity: CulturalAuthenticity = {
        level: analysis.authenticityScore > 8 ? 'traditional' : 
               analysis.authenticityScore > 6 ? 'adapted' : 
               analysis.authenticityScore > 4 ? 'inspired' : 'fusion',
        culturalOrigin: recipe.culturalOrigin,
        traditionalIngredients: recipe.ingredients
          .filter(ing => ing.culturalSignificance)
          .map(ing => ing.name),
        adaptations: [],
        culturalContext: analysis.culturalSignificance,
        ceremonialSignificance: analysis.ceremonialUse,
      };

      const preservationTips = analysis.preservationNotes.split('\n').filter(tip => tip.trim());
      const regionalVariations = analysis.regionalVariations.split('\n').filter(variation => variation.trim());

      return { authenticity, preservationTips, regionalVariations };
    } catch (error) {
      console.error('Failed to perform cultural analysis:', error);
      throw error;
    }
  }

  /**
   * Calculate overall recipe score
   */
  private calculateOverallScore(analysis: EnhancedRecipeAnalysis): number {
    let score = 50; // Base score

    // Nutritional score contribution (30%)
    if (analysis.nutritionalAnalysis) {
      score += (analysis.nutritionalAnalysis.healthScore * 0.3);
    }

    // Cultural authenticity contribution (40%)
    if (analysis.culturalAnalysis) {
      const authenticityScores = {
        traditional: 40,
        adapted: 30,
        inspired: 20,
        fusion: 10,
      };
      score += authenticityScores[analysis.culturalAnalysis.authenticity.level];
    }

    // Cost efficiency contribution (20%)
    if (analysis.costAnalysis) {
      const costPerServing = analysis.costAnalysis.analysis.costPerServing;
      if (costPerServing < 5) score += 20;
      else if (costPerServing < 10) score += 15;
      else if (costPerServing < 15) score += 10;
      else score += 5;
    }

    // Recipe completeness (10%)
    const recipe = analysis.recipe;
    if (recipe.description) score += 2;
    if (recipe.tags.length > 0) score += 2;
    if (recipe.metadata.prepTime > 0) score += 2;
    if (recipe.metadata.cookTime > 0) score += 2;
    if (recipe.ingredients.every(ing => ing.amount && ing.unit)) score += 2;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Generate comprehensive recommendations
   */
  private async generateComprehensiveRecommendations(
    analysis: EnhancedRecipeAnalysis
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Nutritional recommendations
    if (analysis.nutritionalAnalysis) {
      recommendations.push(...analysis.nutritionalAnalysis.recommendations);
    }

    // Cost recommendations
    if (analysis.costAnalysis) {
      recommendations.push(...analysis.costAnalysis.budgetTips);
    }

    // Cultural recommendations
    if (analysis.culturalAnalysis) {
      recommendations.push(...analysis.culturalAnalysis.preservationTips);
    }

    return recommendations.slice(0, 5); // Limit to top 5 recommendations
  }

  /**
   * Helper methods for specific calculations
   */

  private async generateNutritionalInfo(ingredients: Ingredient[]): Promise<NutritionalInfo> {
    // Placeholder implementation - uses simple estimation
    return {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      vitamins: {},
      minerals: {},
    };
  }

  private async generateCostAnalysis(ingredients: Ingredient[]): Promise<CostAnalysis> {
    // Placeholder implementation - would use Kroger API
    return {
      totalCost: 0,
      costPerServing: 0,
      storeComparison: [],
      seasonalTrends: [],
      bulkBuyingOpportunities: [],
      couponSavings: [],
      alternativeIngredients: [],
    };
  }

  private async calculateCulturalAuthenticity(recipe: CreateRecipeInput): Promise<number> {
    // Placeholder implementation - would use AI analysis
    return 7; // Default moderate authenticity
  }

  private async generateTags(recipe: CreateRecipeInput): Promise<string[]> {
    const tags: string[] = [];
    
    // Add cuisine-based tags
    tags.push(recipe.cuisine);
    
    // Add difficulty tag
    tags.push(recipe.metadata.difficulty);
    
    // Add time-based tags
    if (recipe.metadata.totalTime < 30) tags.push('quick');
    if (recipe.metadata.totalTime > 120) tags.push('slow-cooked');
    
    // Add cultural tags
    tags.push(...recipe.culturalOrigin);
    
    return tags;
  }

  private async optimizeCookingTimes(recipe: CreateRecipeInput): Promise<{
    prepTime: number;
    cookTime: number;
    totalTime: number;
  }> {
    // Estimate times based on ingredients and instructions
    const prepTime = Math.max(15, recipe.ingredients.length * 3);
    const cookTime = Math.max(20, recipe.instructions.length * 5);
    
    return {
      prepTime,
      cookTime,
      totalTime: prepTime + cookTime,
    };
  }

  private calculateHealthScore(nutrition: NutritionalInfo): number {
    let score = 50; // Base score

    // Positive factors
    if (nutrition.fiber > 5) score += 10;
    if (nutrition.protein > 15) score += 10;
    if (nutrition.sodium < 600) score += 10;

    // Negative factors
    if (nutrition.sugar > 20) score -= 10;
    if (nutrition.sodium > 1500) score -= 15;

    return Math.max(0, Math.min(100, score));
  }

  private generateNutritionalRecommendations(nutrition: NutritionalInfo): string[] {
    const recommendations: string[] = [];

    if (nutrition.sodium > 1500) {
      recommendations.push('Consider reducing salt or using herbs and spices for flavor');
    }

    if (nutrition.fiber < 5) {
      recommendations.push('Add more vegetables or whole grains to increase fiber');
    }

    if (nutrition.sugar > 20) {
      recommendations.push('Consider reducing added sugars or using natural sweeteners');
    }

    return recommendations;
  }

  private async generateBudgetTips(recipe: Recipe): Promise<string[]> {
    return [
      'Buy ingredients in bulk when possible',
      'Look for seasonal alternatives to reduce costs',
      'Check for store coupons on key ingredients',
    ];
  }

  private async generateSeasonalNotes(recipe: Recipe): Promise<string[]> {
    return [
      'Some ingredients may be more expensive out of season',
      'Consider frozen alternatives for out-of-season produce',
    ];
  }

  /**
   * Simple nutrition estimation methods
   * These provide basic estimates without external API calls
   */
  private estimateCalories(recipe: CreateRecipeInput): number {
    // Simple estimation based on ingredient types and quantities
    // This is a placeholder - could be improved with ingredient database
    const baseCalories = recipe.metadata.servings * 200; // Base estimate
    const ingredientCount = recipe.ingredients.length;
    return Math.round(baseCalories + (ingredientCount * 50));
  }

  private estimateProtein(recipe: CreateRecipeInput): number {
    const proteinIngredients = recipe.ingredients.filter(ing => 
      ['meat', 'chicken', 'beef', 'fish', 'egg', 'protein', 'bean'].some(keyword =>
        ing.name.toLowerCase().includes(keyword)
      )
    );
    return proteinIngredients.length * 25; // Rough estimate
  }

  private estimateCarbs(recipe: CreateRecipeInput): number {
    const carbIngredients = recipe.ingredients.filter(ing => 
      ['rice', 'pasta', 'bread', 'flour', 'potato', 'sugar'].some(keyword =>
        ing.name.toLowerCase().includes(keyword)
      )
    );
    return carbIngredients.length * 30; // Rough estimate
  }

  private estimateFat(recipe: CreateRecipeInput): number {
    const fatIngredients = recipe.ingredients.filter(ing => 
      ['oil', 'butter', 'fat', 'cream', 'cheese', 'nut'].some(keyword =>
        ing.name.toLowerCase().includes(keyword)
      )
    );
    return fatIngredients.length * 10; // Rough estimate
  }

  private estimateFiber(recipe: CreateRecipeInput): number {
    const fiberIngredients = recipe.ingredients.filter(ing => 
      ['vegetable', 'fruit', 'bean', 'grain', 'whole'].some(keyword =>
        ing.name.toLowerCase().includes(keyword)
      )
    );
    return fiberIngredients.length * 3; // Rough estimate
  }

  private estimateSugar(recipe: CreateRecipeInput): number {
    const sugarIngredients = recipe.ingredients.filter(ing => 
      ['sugar', 'honey', 'syrup', 'fruit', 'sweet'].some(keyword =>
        ing.name.toLowerCase().includes(keyword)
      )
    );
    return sugarIngredients.length * 15; // Rough estimate
  }

  private estimateSodium(recipe: CreateRecipeInput): number {
    const sodiumIngredients = recipe.ingredients.filter(ing => 
      ['salt', 'soy sauce', 'broth', 'stock', 'cheese'].some(keyword =>
        ing.name.toLowerCase().includes(keyword)
      )
    );
    return sodiumIngredients.length * 400; // Rough estimate in mg
  }
}

/**
 * Singleton instance of RecipeAnalysisService
 */
export const recipeAnalysisService = new RecipeAnalysisService();
