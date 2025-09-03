/**
 * Recipe Scaling Service
 * Handles recipe scaling, cost analysis, and ingredient substitutions
 */

// Removed Kroger service - now using Perplexity as primary pricing source
import type { Recipe, Ingredient, CostAnalysis } from '@/types';

export interface ScaledRecipe {
  originalRecipe: Recipe;
  scaledRecipe: Recipe;
  scalingFactor: number;
  costComparison: {
    originalCost: number;
    scaledCost: number;
    costPerServing: number;
    savings: number;
  };
  adjustments: {
    cookingTimeAdjustment: number;
    equipmentRecommendations: string[];
    techniqueAdjustments: string[];
  };
}

export interface CostAnalysisResult {
  totalCost: number;
  costPerServing: number;
  ingredientCosts: Array<{
    ingredient: Ingredient;
    unitCost: number;
    totalCost: number;
    availability: 'available' | 'limited' | 'unavailable';
    alternatives?: Array<{
      name: string;
      cost: number;
      culturalImpact: 'minimal' | 'moderate' | 'significant';
    }>;
  }>;
  storeComparison: Array<{
    storeName: string;
    totalCost: number;
    savings: number;
    distance?: number;
  }>;
  seasonalFactors: Array<{
    ingredient: string;
    currentSeason: 'in-season' | 'out-of-season';
    priceImpact: number;
    bestMonths: string[];
  }>;
  budgetOptimizations: string[];
}

export interface IngredientSubstitution {
  original: Ingredient;
  substitute: Ingredient;
  reason: 'cost' | 'availability' | 'dietary' | 'cultural';
  culturalImpact: 'minimal' | 'moderate' | 'significant';
  costDifference: number;
  conversionRatio: number;
  preparationNotes: string;
  flavorImpact: string;
}

/**
 * Recipe Scaling Service Class
 */
export class RecipeScalingService {
  /**
   * Scale recipe to different serving size
   */
  async scaleRecipe(
    recipe: Recipe,
    targetServings: number,
    userLocation?: string
  ): Promise<ScaledRecipe> {
    const scalingFactor = targetServings / recipe.metadata.servings;
    
    // Scale ingredients
    const scaledIngredients = recipe.ingredients.map(ingredient => ({
      ...ingredient,
      amount: this.scaleIngredientAmount(ingredient.amount, scalingFactor, ingredient.unit),
    }));

    // Scale cooking times (with diminishing returns for large batches)
    const cookingTimeAdjustment = this.calculateCookingTimeAdjustment(scalingFactor);
    const scaledPrepTime = Math.round(recipe.metadata.prepTime * Math.min(scalingFactor, 2));
    const scaledCookTime = Math.round(recipe.metadata.cookTime * cookingTimeAdjustment);

    // Create scaled recipe
    const scaledRecipe: Recipe = {
      ...recipe,
      ingredients: scaledIngredients,
      metadata: {
        ...recipe.metadata,
        servings: targetServings,
        prepTime: scaledPrepTime,
        cookTime: scaledCookTime,
        totalTime: scaledPrepTime + scaledCookTime,
      },
    };

    // Calculate cost comparison
    const originalCost = await this.calculateRecipeCost(recipe, userLocation);
    const scaledCost = await this.calculateRecipeCost(scaledRecipe, userLocation);

    const costComparison = {
      originalCost: originalCost.totalCost,
      scaledCost: scaledCost.totalCost,
      costPerServing: scaledCost.costPerServing,
      savings: (originalCost.costPerServing * targetServings) - scaledCost.totalCost,
    };

    // Generate cooking adjustments
    const adjustments = await this.generateScalingAdjustments(recipe, scalingFactor);

    return {
      originalRecipe: recipe,
      scaledRecipe,
      scalingFactor,
      costComparison,
      adjustments,
    };
  }

  /**
   * Perform comprehensive cost analysis
   */
  async analyzeCost(
    recipe: Recipe,
    userLocation?: string
  ): Promise<CostAnalysisResult> {
    const ingredientCosts = [];
    let totalCost = 0;

    // Analyze each ingredient
    for (const ingredient of recipe.ingredients) {
      const costData = await this.analyzeIngredientCost(ingredient, userLocation);
      ingredientCosts.push(costData);
      totalCost += costData.totalCost;
    }

    const costPerServing = totalCost / recipe.metadata.servings;

    // Get store comparison
    const storeComparison = await this.compareStorePrices(recipe.ingredients, userLocation);

    // Analyze seasonal factors
    const seasonalFactors = await this.analyzeSeasonalFactors(recipe.ingredients);

    // Generate budget optimizations
    const budgetOptimizations = await this.generateBudgetOptimizations(recipe, ingredientCosts);

    return {
      totalCost,
      costPerServing,
      ingredientCosts,
      storeComparison,
      seasonalFactors,
      budgetOptimizations,
    };
  }

  /**
   * Generate ingredient substitutions
   */
  async generateSubstitutions(
    ingredient: Ingredient,
    recipe: Recipe,
    reason: 'cost' | 'availability' | 'dietary' | 'cultural',
    userLocation?: string
  ): Promise<IngredientSubstitution[]> {
    try {
      // Note: Bedrock API disabled - using basic substitution logic
      console.log('Using basic substitution logic (Bedrock AI disabled)');
      const aiSubstitutions = [{
        original: ingredient.name,
        substitute: this.getBasicSubstitute(ingredient.name),
        reason: 'Basic ingredient substitution',
        culturalImpact: 'Minimal',
        availabilityNotes: 'Common substitute available at most stores'
      }];

      const substitutions: IngredientSubstitution[] = [];

      for (const aiSub of aiSubstitutions) {
        // Get cost data for substitute
        const substituteCost = await this.getIngredientPrice(aiSub.substitute, userLocation);
        const originalCost = await this.getIngredientPrice(ingredient.name, userLocation);

        const substitute: Ingredient = {
          id: `sub_${ingredient.id}`,
          name: aiSub.substitute,
          amount: ingredient.amount,
          unit: ingredient.unit,
          culturalName: ingredient.culturalName,
          substitutes: [],
          costPerUnit: substituteCost,
          availability: [],
        };

        substitutions.push({
          original: ingredient,
          substitute,
          reason,
          culturalImpact: aiSub.culturalImpact,
          costDifference: substituteCost - originalCost,
          conversionRatio: 1, // Default 1:1 ratio, could be enhanced
          preparationNotes: aiSub.availabilityNotes,
          flavorImpact: 'Minimal impact on overall flavor profile',
        });
      }

      return substitutions;
    } catch (error) {
      console.error('Failed to generate substitutions:', error);
      return [];
    }
  }

  /**
   * Get basic substitute for common ingredients (fallback when AI is disabled)
   */
  private getBasicSubstitute(ingredient: string): string {
    const ingredient_lower = ingredient.toLowerCase();
    
    // Common substitutions
    if (ingredient_lower.includes('butter')) return 'vegetable oil';
    if (ingredient_lower.includes('milk')) return 'almond milk';
    if (ingredient_lower.includes('eggs')) return 'egg substitute';
    if (ingredient_lower.includes('cream')) return 'half and half';
    if (ingredient_lower.includes('flour')) return 'all-purpose flour';
    if (ingredient_lower.includes('sugar')) return 'honey';
    if (ingredient_lower.includes('salt')) return 'sea salt';
    if (ingredient_lower.includes('pepper')) return 'black pepper';
    if (ingredient_lower.includes('onion')) return 'shallots';
    if (ingredient_lower.includes('garlic')) return 'garlic powder';
    
    // Default: return the original ingredient
    return ingredient;
  }

  /**
   * Calculate optimal batch size for cost efficiency
   */
  async calculateOptimalBatchSize(
    recipe: Recipe,
    constraints: {
      maxServings?: number;
      storageCapacity?: number;
      budgetLimit?: number;
      shelfLife?: number; // days
    },
    userLocation?: string
  ): Promise<{
    optimalServings: number;
    costPerServing: number;
    totalCost: number;
    savings: number;
    reasoning: string[];
  }> {
    const testSizes = [
      recipe.metadata.servings,
      recipe.metadata.servings * 2,
      recipe.metadata.servings * 4,
      recipe.metadata.servings * 6,
      recipe.metadata.servings * 8,
    ].filter(size => !constraints.maxServings || size <= constraints.maxServings);

    let bestOption = {
      servings: recipe.metadata.servings,
      costPerServing: 0,
      totalCost: 0,
      savings: 0,
    };

    const reasoning: string[] = [];

    for (const servings of testSizes) {
      const scaledResult = await this.scaleRecipe(recipe, servings, userLocation);
      
      if (scaledResult.costComparison.costPerServing < bestOption.costPerServing || bestOption.costPerServing === 0) {
        bestOption = {
          servings,
          costPerServing: scaledResult.costComparison.costPerServing,
          totalCost: scaledResult.costComparison.scaledCost,
          savings: scaledResult.costComparison.savings,
        };
      }
    }

    // Add reasoning
    if (bestOption.servings > recipe.metadata.servings) {
      reasoning.push(`Scaling to ${bestOption.servings} servings reduces cost per serving by $${(bestOption.savings / bestOption.servings).toFixed(2)}`);
      reasoning.push('Bulk ingredient purchases offer better unit prices');
      
      if (constraints.shelfLife) {
        reasoning.push(`Consider storage and consumption within ${constraints.shelfLife} days`);
      }
    } else {
      reasoning.push('Original serving size is already cost-optimal for your constraints');
    }

    return {
      optimalServings: bestOption.servings,
      costPerServing: bestOption.costPerServing,
      totalCost: bestOption.totalCost,
      savings: bestOption.savings,
      reasoning,
    };
  }

  /**
   * Private helper methods
   */

  /**
   * Scale ingredient amount with unit-specific logic
   */
  private scaleIngredientAmount(amount: number, factor: number, unit: string): number {
    const scaledAmount = amount * factor;

    // Round to appropriate precision based on unit
    switch (unit.toLowerCase()) {
      case 'cup':
      case 'cups':
        return Math.round(scaledAmount * 4) / 4; // Round to nearest 1/4 cup
      case 'tbsp':
      case 'tablespoon':
      case 'tablespoons':
        return Math.round(scaledAmount * 2) / 2; // Round to nearest 1/2 tbsp
      case 'tsp':
      case 'teaspoon':
      case 'teaspoons':
        return Math.round(scaledAmount * 4) / 4; // Round to nearest 1/4 tsp
      case 'lb':
      case 'pound':
      case 'pounds':
        return Math.round(scaledAmount * 4) / 4; // Round to nearest 1/4 lb
      case 'oz':
      case 'ounce':
      case 'ounces':
        return Math.round(scaledAmount * 2) / 2; // Round to nearest 1/2 oz
      case 'g':
      case 'gram':
      case 'grams':
        return Math.round(scaledAmount);
      case 'kg':
      case 'kilogram':
      case 'kilograms':
        return Math.round(scaledAmount * 10) / 10; // Round to nearest 0.1 kg
      case 'piece':
      case 'pieces':
      case 'whole':
        return Math.ceil(scaledAmount); // Always round up for whole items
      default:
        return Math.round(scaledAmount * 100) / 100; // Round to 2 decimal places
    }
  }

  /**
   * Calculate cooking time adjustment for scaling
   */
  private calculateCookingTimeAdjustment(scalingFactor: number): number {
    // Cooking time doesn't scale linearly
    if (scalingFactor <= 1) {
      return scalingFactor;
    } else if (scalingFactor <= 2) {
      return 1 + (scalingFactor - 1) * 0.5; // 50% of additional time
    } else if (scalingFactor <= 4) {
      return 1.5 + (scalingFactor - 2) * 0.25; // 25% of additional time
    } else {
      return 2 + (scalingFactor - 4) * 0.1; // 10% of additional time
    }
  }

  /**
   * Calculate recipe cost
   */
  private async calculateRecipeCost(recipe: Recipe, userLocation?: string): Promise<CostAnalysisResult> {
    return this.analyzeCost(recipe, userLocation);
  }

  /**
   * Analyze individual ingredient cost using Perplexity
   */
  private async analyzeIngredientCost(ingredient: Ingredient, userLocation?: string) {
    try {
      const response = await fetch('/api/pricing/perplexity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: [ingredient],
          location: userLocation || '90210',
          culturalContext: 'general'
        }),
      });

      let unitCost = 0;
      let totalCost = 0;
      let availability: 'available' | 'limited' | 'unavailable' = 'limited';

      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          unitCost = result.packagePrice || 0;
          totalCost = result.portionCost || result.estimatedCost || 0;
          availability = result.packagePrice > 0 ? 'available' : 'unavailable';
        }
      } else {
        console.warn(`Perplexity API failed for ${ingredient.name}, using fallback`);
        // Fallback to simple estimation
        unitCost = this.getEstimatedPrice(ingredient.name);
        totalCost = unitCost * ingredient.amount;
        availability = 'limited';
      }

      // Generate alternatives if expensive or unavailable
      const alternatives = [];
      if (unitCost > 5 || availability !== 'available') {
        alternatives.push({
          name: `Generic ${ingredient.name}`,
          cost: unitCost * 0.7,
          culturalImpact: 'minimal' as const,
        });
      }

      return {
        ingredient,
        unitCost,
        totalCost,
        availability,
        alternatives,
        priceConfidence: availability === 'available' ? 0.8 : 0.5,
        notes: availability !== 'available' ? ['Limited availability'] : [],
      };

    } catch (error) {
      console.error(`Error analyzing cost for ${ingredient.name}:`, error);
      // Fallback to simple estimation
      const unitCost = this.getEstimatedPrice(ingredient.name);
      const totalCost = unitCost * ingredient.amount;
      
      return {
        ingredient,
        unitCost,
        totalCost,
        availability: 'limited' as const,
        alternatives: [],
        priceConfidence: 0.3,
        notes: ['Price estimated due to API error'],
      };
    }
  }

  /**
   * Simple price estimation fallback
   */
  private getEstimatedPrice(ingredientName: string): number {
    const name = ingredientName.toLowerCase();
    // Basic price estimates for common ingredients
    if (name.includes('salt') || name.includes('pepper')) return 2;
    if (name.includes('oil') || name.includes('butter')) return 4;
    if (name.includes('flour') || name.includes('sugar')) return 3;
    if (name.includes('meat') || name.includes('chicken') || name.includes('beef')) return 8;
    if (name.includes('cheese')) return 6;
    if (name.includes('milk')) return 4;
    if (name.includes('egg')) return 3;
    if (name.includes('vegetable') || name.includes('onion') || name.includes('tomato')) return 2;
    if (name.includes('herb') || name.includes('spice')) return 3;
    return 4; // Default estimate
  }

  /**
   * Get ingredient price using Perplexity API
   */
  private async getIngredientPrice(ingredientName: string, userLocation?: string): Promise<number> {
    try {
      const response = await fetch('/api/pricing/perplexity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: [{ name: ingredientName }],
          location: userLocation || '90210',
          culturalContext: 'general'
        }),
      });

      if (!response.ok) {
        throw new Error(`Perplexity API failed: ${response.status}`);
      }

      const data = await response.json();
      if (data.results && data.results.length > 0) {
        return data.results[0].packagePrice || 0;
      }
      return this.getEstimatedPrice(ingredientName);
    } catch (error) {
      console.error(`Failed to get price for ${ingredientName}:`, error);
      return this.getEstimatedPrice(ingredientName);
    }
  }

  /**
   * Check ingredient availability using Perplexity
   */
  private async checkIngredientAvailability(
    ingredientName: string,
    userLocation?: string
  ): Promise<'available' | 'limited' | 'unavailable'> {
    try {
      const response = await fetch('/api/pricing/perplexity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: [{ name: ingredientName }],
          location: userLocation || '90210',
          culturalContext: 'general'
        }),
      });

      if (!response.ok) {
        throw new Error(`Perplexity API failed: ${response.status}`);
      }

      const data = await response.json();
      if (data.results && data.results.length > 0 && data.results[0].packagePrice > 0) {
        return 'available';
      }
      return 'unavailable';
    } catch (error) {
      console.error(`Failed to check availability for ${ingredientName}:`, error);
      return 'limited'; // Assume limited availability on error
    }
  }

  /**
   * Compare prices across stores
   */
  private async compareStorePrices(ingredients: Ingredient[], userLocation?: string) {
    // Placeholder implementation - would integrate with multiple store APIs
    return [
      {
        storeName: 'Kroger',
        totalCost: 25.50,
        savings: 0,
        distance: 2.3,
      },
      {
        storeName: 'Walmart',
        totalCost: 23.75,
        savings: 1.75,
        distance: 3.1,
      },
    ];
  }

  /**
   * Analyze seasonal price factors
   */
  private async analyzeSeasonalFactors(ingredients: Ingredient[]) {
    const currentMonth = new Date().getMonth();
    const seasonalFactors = [];

    for (const ingredient of ingredients) {
      // Simple seasonal analysis - would be enhanced with real data
      const isProduceItem = ['tomato', 'lettuce', 'cucumber', 'pepper', 'onion'].some(
        produce => ingredient.name.toLowerCase().includes(produce)
      );

      if (isProduceItem) {
        seasonalFactors.push({
          ingredient: ingredient.name,
          currentSeason: (currentMonth >= 5 && currentMonth <= 8) ? 'in-season' as const : 'out-of-season' as const,
          priceImpact: (currentMonth >= 5 && currentMonth <= 8) ? -0.2 : 0.3,
          bestMonths: ['June', 'July', 'August', 'September'],
        });
      }
    }

    return seasonalFactors;
  }

  /**
   * Generate budget optimization suggestions
   */
  private async generateBudgetOptimizations(recipe: Recipe, ingredientCosts: any[]): Promise<string[]> {
    const optimizations: string[] = [];

    // Find expensive ingredients
    const expensiveIngredients = ingredientCosts
      .filter(cost => cost.totalCost > 5)
      .sort((a, b) => b.totalCost - a.totalCost);

    if (expensiveIngredients.length > 0) {
      optimizations.push(`Consider substitutes for ${expensiveIngredients[0].ingredient.name} to reduce costs`);
    }

    // Check for bulk opportunities
    const bulkIngredients = ingredientCosts.filter(cost => cost.ingredient.amount > 1);
    if (bulkIngredients.length > 0) {
      optimizations.push('Buy ingredients in bulk to reduce unit costs');
    }

    // Seasonal recommendations
    optimizations.push('Look for seasonal alternatives to reduce ingredient costs');

    // Store comparison
    optimizations.push('Compare prices across different stores for maximum savings');

    return optimizations;
  }

  /**
   * Generate scaling adjustments and recommendations
   */
  private async generateScalingAdjustments(recipe: Recipe, scalingFactor: number) {
    const adjustments = {
      cookingTimeAdjustment: this.calculateCookingTimeAdjustment(scalingFactor),
      equipmentRecommendations: [] as string[],
      techniqueAdjustments: [] as string[],
    };

    // Equipment recommendations based on scaling
    if (scalingFactor > 2) {
      adjustments.equipmentRecommendations.push('Consider using a larger pot or pan');
      adjustments.equipmentRecommendations.push('You may need multiple baking sheets or dishes');
    }

    if (scalingFactor > 4) {
      adjustments.equipmentRecommendations.push('Consider batch cooking in multiple rounds');
      adjustments.techniqueAdjustments.push('Increase mixing time for larger batches');
    }

    // Technique adjustments
    if (scalingFactor > 1.5) {
      adjustments.techniqueAdjustments.push('Allow extra time for ingredients to heat through');
      adjustments.techniqueAdjustments.push('Stir more frequently when cooking larger quantities');
    }

    return adjustments;
  }
}

/**
 * Singleton instance of RecipeScalingService
 */
export const recipeScalingService = new RecipeScalingService();
