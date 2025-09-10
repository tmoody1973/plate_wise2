/**
 * Enhanced Meal Planner with Kroger API Integration
 * Combines recipe discovery with real grocery pricing
 */

import { PerplexityRecipeUrlService } from '@/lib/meal-planning/perplexity-recipe-urls';
import { PerplexityRecipeExtractor } from '@/lib/integrations/perplexity-recipe-extractor';
import { KrogerPricingService } from '@/lib/integrations/kroger-pricing';
import { OGImageExtractor } from '@/lib/integrations/og-image-extractor';

interface MealPlanRequest {
  culturalCuisines: string[];
  dietaryRestrictions: string[];
  budgetLimit: number;
  householdSize: number;
  timeFrame: string;
  zipCode?: string;
  nutritionalGoals?: string[];
  excludeIngredients?: string[];
  preferredStores?: string[];
}

interface EnhancedRecipe {
  id: string;
  title: string;
  description: string;
  culturalOrigin: string[];
  cuisine: string;
  ingredients: Array<{
    name: string;
    amount: string;
    unit?: string;
    krogerPrice?: {
      unitPrice: number;
      totalCost: number;
      confidence: string;
      storeLocation?: string;
      onSale?: boolean;
      salePrice?: number;
    };
  }>;
  instructions: string[];
  metadata: {
    servings: number;
    prepTime: number;
    cookTime: number;
    totalTime: number;
    difficulty: string;
    culturalAuthenticity: string;
  };
  pricing: {
    totalCost: number;
    costPerServing: number;
    budgetFriendly: boolean;
    savingsOpportunities: string[];
  };
  imageUrl?: string;
  source: string;
  sourceUrl?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface MealPlan {
  id: string;
  request: MealPlanRequest;
  recipes: EnhancedRecipe[];
  summary: {
    totalRecipes: number;
    totalCost: number;
    averageCostPerMeal: number;
    costPerPerson: number;
    budgetUtilization: number; // percentage of budget used
    culturalDiversity: string[];
    nutritionalBalance: string;
  };
  budgetAnalysis: {
    withinBudget: boolean;
    totalSpent: number;
    budgetRemaining: number;
    costBreakdown: {
      proteins: number;
      vegetables: number;
      grains: number;
      dairy: number;
      spices: number;
      other: number;
    };
    savingsOpportunities: Array<{
      type: 'sale' | 'generic' | 'bulk' | 'seasonal';
      description: string;
      potentialSavings: number;
    }>;
  };
  shoppingList: {
    byStore: Map<string, Array<{
      ingredient: string;
      totalAmount: string;
      estimatedCost: number;
      recipes: string[];
    }>>;
    totalEstimatedCost: number;
  };
  createdAt: Date;
}

export class KrogerEnhancedMealPlanner {
  private perplexityUrlService: PerplexityRecipeUrlService;
  private perplexityExtractor: PerplexityRecipeExtractor;
  private krogerPricing: KrogerPricingService;
  private imageExtractor: OGImageExtractor;

  constructor() {
    this.perplexityUrlService = new PerplexityRecipeUrlService();
    this.perplexityExtractor = new PerplexityRecipeExtractor();
    this.krogerPricing = new KrogerPricingService();
    this.imageExtractor = new OGImageExtractor();
  }

  /**
   * Generate a complete meal plan with Kroger pricing
   */
  async generateMealPlan(request: MealPlanRequest): Promise<MealPlan> {
    console.log('🍽️ Generating enhanced meal plan with Kroger pricing...');
    
    try {
      // Step 1: Discover recipes using Perplexity
      const recipeUrls = await this.discoverRecipes(request);
      console.log(`📋 Found ${recipeUrls.length} recipe URLs`);

      // Step 2: Extract detailed recipe information
      const recipes = await this.extractRecipeDetails(recipeUrls, request);
      console.log(`🔍 Extracted ${recipes.length} detailed recipes`);

      // Step 3: Get Kroger pricing for all ingredients
      const pricedRecipes = await this.addKrogerPricing(recipes, request.zipCode);
      console.log(`💰 Added Kroger pricing to ${pricedRecipes.length} recipes`);

      // Step 4: Filter recipes by budget and preferences
      const budgetFilteredRecipes = this.filterByBudget(pricedRecipes, request);
      console.log(`💵 ${budgetFilteredRecipes.length} recipes within budget`);

      // Step 5: Generate meal plan summary and analysis
      const mealPlan = this.generateMealPlanSummary(budgetFilteredRecipes, request);
      
      console.log('✅ Enhanced meal plan generated successfully');
      return mealPlan;

    } catch (error) {
      console.error('❌ Failed to generate enhanced meal plan:', error);
      throw error;
    }
  }

  /**
   * Discover recipes using Perplexity AI
   */
  private async discoverRecipes(request: MealPlanRequest): Promise<string[]> {
    // Use Perplexity URL service to find recipe URLs
    const urlRequest = {
      numberOfMeals: Math.min(request.householdSize * 2, 8),
      culturalCuisines: request.culturalCuisines,
      dietaryRestrictions: request.dietaryRestrictions,
      maxTime: request.timeFrame.includes('quick') ? 30 : undefined,
      exclude: request.excludeIngredients
    };
    
    const response = await this.perplexityUrlService.getRecipeUrls(urlRequest);
    
    if (response.success) {
      return response.recipes.map(recipe => recipe.url);
    }
    
    return [];
  }

  /**
   * Build search query for recipe discovery
   */
  private buildRecipeSearchQuery(request: MealPlanRequest): string {
    const parts = [];
    
    // Cultural cuisines
    if (request.culturalCuisines.length > 0) {
      parts.push(`${request.culturalCuisines.join(' or ')} cuisine`);
    }
    
    // Dietary restrictions
    if (request.dietaryRestrictions.length > 0) {
      parts.push(`${request.dietaryRestrictions.join(' ')} recipes`);
    }
    
    // Budget consideration
    if (request.budgetLimit < 10) {
      parts.push('budget-friendly cheap meals');
    } else if (request.budgetLimit > 25) {
      parts.push('gourmet recipes');
    }
    
    // Time frame
    if (request.timeFrame.includes('quick') || request.timeFrame.includes('30')) {
      parts.push('quick 30-minute meals');
    }
    
    // Exclusions
    if (request.excludeIngredients && request.excludeIngredients.length > 0) {
      parts.push(`without ${request.excludeIngredients.join(' or ')}`);
    }

    return parts.join(' ') || 'healthy family recipes';
  }

  /**
   * Extract detailed recipe information
   */
  private async extractRecipeDetails(
    recipeUrls: string[], 
    request: MealPlanRequest
  ): Promise<EnhancedRecipe[]> {
    const recipes: EnhancedRecipe[] = [];
    
    for (const url of recipeUrls) {
      try {
        // Extract recipe using Perplexity
        const recipeData = await this.perplexityExtractor.extractRecipe(url);
        
        if (recipeData && recipeData.ingredients.length > 0) {
          // Get recipe image (use the one from extraction or fetch from URL)
          const imageUrl = recipeData.imageUrl || await this.imageExtractor.extractImageFromUrl(url);
          
          const enhancedRecipe: EnhancedRecipe = {
            id: this.generateRecipeId(recipeData.title),
            title: recipeData.title,
            description: recipeData.description || '',
            culturalOrigin: ['international'], // Default since extractor doesn't provide this
            cuisine: 'international', // Default since extractor doesn't provide this
            ingredients: recipeData.ingredients.map(ing => ({
              name: ing,
              amount: '1', // Default amount since extractor returns string array
              unit: 'serving'
            })),
            instructions: recipeData.instructions,
            metadata: {
              servings: recipeData.servings || 4,
              prepTime: Math.floor((recipeData.totalTimeMinutes || 45) * 0.3),
              cookTime: Math.floor((recipeData.totalTimeMinutes || 45) * 0.7),
              totalTime: recipeData.totalTimeMinutes || 45,
              difficulty: 'medium',
              culturalAuthenticity: 'medium'
            },
            pricing: {
              totalCost: 0,
              costPerServing: 0,
              budgetFriendly: false,
              savingsOpportunities: []
            },
            imageUrl,
            source: 'perplexity',
            sourceUrl: url,
            tags: [],
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          recipes.push(enhancedRecipe);
        }
      } catch (error) {
        console.error(`Failed to extract recipe from ${url}:`, error);
      }
    }
    
    return recipes;
  }

  /**
   * Add Kroger pricing to recipes
   */
  private async addKrogerPricing(
    recipes: EnhancedRecipe[], 
    zipCode?: string
  ): Promise<EnhancedRecipe[]> {
    const pricedRecipes: EnhancedRecipe[] = [];
    
    for (const recipe of recipes) {
      try {
        // Get pricing for all ingredients
        const ingredientNames = recipe.ingredients.map(ing => ing.name);
        const pricingResults = await this.krogerPricing.getMultipleIngredientPrices(
          ingredientNames, 
          zipCode
        );
        
        let totalCost = 0;
        const enhancedIngredients = recipe.ingredients.map(ingredient => {
          const pricing = pricingResults.get(ingredient.name);
          
          if (pricing?.bestMatch) {
            const unitPrice = pricing.bestMatch.price.regular;
            const quantity = this.parseQuantity(ingredient.amount);
            const itemCost = unitPrice * quantity;
            
            totalCost += itemCost;
            
            return {
              ...ingredient,
              krogerPrice: {
                unitPrice,
                totalCost: itemCost,
                confidence: pricing.confidence,
                storeLocation: pricing.location?.name,
                onSale: !!(pricing.bestMatch.price.sale || pricing.bestMatch.price.promo),
                salePrice: pricing.bestMatch.price.sale || pricing.bestMatch.price.promo
              }
            };
          }
          
          return ingredient;
        });
        
        const costPerServing = totalCost / recipe.metadata.servings;
        
        // Identify savings opportunities
        const savingsOpportunities = this.identifySavingsOpportunities(enhancedIngredients);
        
        const pricedRecipe: EnhancedRecipe = {
          ...recipe,
          ingredients: enhancedIngredients,
          pricing: {
            totalCost,
            costPerServing,
            budgetFriendly: costPerServing <= 8, // Under $8 per serving
            savingsOpportunities
          }
        };
        
        pricedRecipes.push(pricedRecipe);
        
      } catch (error) {
        console.error(`Failed to price recipe ${recipe.title}:`, error);
        // Add recipe without pricing
        pricedRecipes.push(recipe);
      }
    }
    
    return pricedRecipes;
  }

  /**
   * Filter recipes by budget constraints
   */
  private filterByBudget(
    recipes: EnhancedRecipe[], 
    request: MealPlanRequest
  ): EnhancedRecipe[] {
    const maxCostPerServing = request.budgetLimit / request.householdSize;
    
    return recipes
      .filter(recipe => recipe.pricing.costPerServing <= maxCostPerServing * 1.2) // 20% buffer
      .sort((a, b) => {
        // Prioritize budget-friendly recipes with good cultural authenticity
        const aScore = this.calculateRecipeScore(a, request);
        const bScore = this.calculateRecipeScore(b, request);
        return bScore - aScore;
      })
      .slice(0, Math.min(request.householdSize * 2, 8)); // 2 recipes per person, max 8
  }

  /**
   * Calculate recipe score for ranking
   */
  private calculateRecipeScore(recipe: EnhancedRecipe, request: MealPlanRequest): number {
    let score = 0;
    
    // Budget friendliness (40% weight)
    const maxCostPerServing = request.budgetLimit / request.householdSize;
    const costRatio = recipe.pricing.costPerServing / maxCostPerServing;
    score += (1 - Math.min(costRatio, 1)) * 40;
    
    // Cultural match (30% weight)
    const culturalMatch = recipe.culturalOrigin.some(origin => 
      request.culturalCuisines.some(cuisine => 
        cuisine.toLowerCase().includes(origin.toLowerCase())
      )
    );
    if (culturalMatch) score += 30;
    
    // Dietary restrictions compliance (20% weight)
    // This would need more sophisticated checking
    score += 20;
    
    // Savings opportunities (10% weight)
    score += recipe.pricing.savingsOpportunities.length * 2;
    
    return score;
  }

  /**
   * Generate comprehensive meal plan summary
   */
  private generateMealPlanSummary(
    recipes: EnhancedRecipe[], 
    request: MealPlanRequest
  ): MealPlan {
    const totalCost = recipes.reduce((sum, recipe) => sum + recipe.pricing.totalCost, 0);
    const averageCostPerMeal = totalCost / recipes.length;
    const costPerPerson = totalCost / request.householdSize;
    
    // Generate shopping list
    const shoppingList = this.generateShoppingList(recipes);
    
    // Budget analysis
    const budgetAnalysis = this.analyzeBudget(recipes, request);
    
    return {
      id: this.generateMealPlanId(),
      request,
      recipes,
      summary: {
        totalRecipes: recipes.length,
        totalCost,
        averageCostPerMeal,
        costPerPerson,
        budgetUtilization: (totalCost / request.budgetLimit) * 100,
        culturalDiversity: [...new Set(recipes.flatMap(r => r.culturalOrigin))],
        nutritionalBalance: this.assessNutritionalBalance(recipes)
      },
      budgetAnalysis,
      shoppingList,
      createdAt: new Date()
    };
  }

  /**
   * Generate consolidated shopping list
   */
  private generateShoppingList(recipes: EnhancedRecipe[]): MealPlan['shoppingList'] {
    const ingredientMap = new Map<string, {
      totalAmount: string;
      estimatedCost: number;
      recipes: string[];
      storeLocation?: string;
    }>();
    
    // Consolidate ingredients across recipes
    for (const recipe of recipes) {
      for (const ingredient of recipe.ingredients) {
        const key = ingredient.name.toLowerCase();
        const existing = ingredientMap.get(key);
        
        if (existing) {
          existing.recipes.push(recipe.title);
          existing.estimatedCost += ingredient.krogerPrice?.totalCost || 0;
        } else {
          ingredientMap.set(key, {
            totalAmount: ingredient.amount,
            estimatedCost: ingredient.krogerPrice?.totalCost || 0,
            recipes: [recipe.title],
            storeLocation: ingredient.krogerPrice?.storeLocation
          });
        }
      }
    }
    
    // Group by store location
    const byStore = new Map<string, Array<{
      ingredient: string;
      totalAmount: string;
      estimatedCost: number;
      recipes: string[];
    }>>();
    
    let totalEstimatedCost = 0;
    
    for (const [ingredient, data] of ingredientMap.entries()) {
      const store = data.storeLocation || 'Unknown Store';
      
      if (!byStore.has(store)) {
        byStore.set(store, []);
      }
      
      byStore.get(store)!.push({
        ingredient,
        totalAmount: data.totalAmount,
        estimatedCost: data.estimatedCost,
        recipes: data.recipes
      });
      
      totalEstimatedCost += data.estimatedCost;
    }
    
    return {
      byStore,
      totalEstimatedCost
    };
  }

  /**
   * Analyze budget utilization and savings
   */
  private analyzeBudget(
    recipes: EnhancedRecipe[], 
    request: MealPlanRequest
  ): MealPlan['budgetAnalysis'] {
    const totalSpent = recipes.reduce((sum, recipe) => sum + recipe.pricing.totalCost, 0);
    const budgetRemaining = request.budgetLimit - totalSpent;
    
    // Categorize costs
    const costBreakdown = {
      proteins: 0,
      vegetables: 0,
      grains: 0,
      dairy: 0,
      spices: 0,
      other: 0
    };
    
    // Collect all savings opportunities
    const savingsOpportunities: MealPlan['budgetAnalysis']['savingsOpportunities'] = [];
    
    for (const recipe of recipes) {
      for (const opportunity of recipe.pricing.savingsOpportunities) {
        savingsOpportunities.push({
          type: 'sale',
          description: opportunity,
          potentialSavings: 2.50 // Estimated
        });
      }
    }
    
    return {
      withinBudget: totalSpent <= request.budgetLimit,
      totalSpent,
      budgetRemaining,
      costBreakdown,
      savingsOpportunities
    };
  }

  /**
   * Helper methods
   */
  private parseQuantity(amount: string): number {
    const match = amount.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 1;
  }

  private identifySavingsOpportunities(ingredients: EnhancedRecipe['ingredients']): string[] {
    const opportunities: string[] = [];
    
    for (const ingredient of ingredients) {
      if (ingredient.krogerPrice?.onSale) {
        opportunities.push(`${ingredient.name} is on sale - save money!`);
      }
    }
    
    return opportunities;
  }

  private assessNutritionalBalance(recipes: EnhancedRecipe[]): string {
    // Simple assessment based on ingredient diversity
    const allIngredients = recipes.flatMap(r => r.ingredients.map(i => i.name.toLowerCase()));
    const uniqueIngredients = new Set(allIngredients);
    
    if (uniqueIngredients.size > 20) return 'excellent';
    if (uniqueIngredients.size > 15) return 'good';
    if (uniqueIngredients.size > 10) return 'fair';
    return 'needs improvement';
  }

  private generateRecipeId(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50);
  }

  private generateMealPlanId(): string {
    return `meal-plan-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }
}

export const krogerEnhancedMealPlanner = new KrogerEnhancedMealPlanner();