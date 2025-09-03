/**
 * Unified Recipe Service
 * Uses Spoonacular API for comprehensive recipe and nutrition data
 */

import { spoonacularService, type SpoonacularRecipe, type RecipeSearchParams as SpoonacularSearchParams } from './spoonacular-service';

export interface UnifiedRecipe {
  id: string;
  source: 'spoonacular' | 'user';
  title: string;
  description: string;
  image: string;
  servings: number;
  readyInMinutes: number;
  preparationMinutes?: number;
  cookingMinutes?: number;
  cuisines: string[];
  dishTypes: string[];
  diets: string[];
  healthLabels: string[];
  ingredients: UnifiedIngredient[];
  instructions: UnifiedInstruction[];
  nutrition: UnifiedNutrition;
  culturalScore: number;
  healthScore: number;
  pricePerServing?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  sourceUrl?: string;
  author?: string;
}

export interface UnifiedIngredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
  originalText: string;
  image?: string;
  category?: string;
  culturalSignificance?: string;
  substitutes?: string[];
}

export interface UnifiedInstruction {
  step: number;
  instruction: string;
  ingredients?: string[];
  equipment?: string[];
  time?: number;
  technique?: string;
}

export interface UnifiedNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  cholesterol: number;
  saturatedFat: number;
  vitamins: Record<string, number>;
  minerals: Record<string, number>;
  percentDailyValues: Record<string, number>;
}

export interface RecipeSearchFilters {
  query?: string;
  cuisines?: string[];
  diets?: string[];
  healthLabels?: string[];
  intolerances?: string[];
  maxReadyTime?: number;
  minServings?: number;
  maxServings?: number;
  minCalories?: number;
  maxCalories?: number;
  includeIngredients?: string[];
  excludeIngredients?: string[];
  culturalAuthenticity?: 'high' | 'medium' | 'low';
  difficulty?: 'easy' | 'medium' | 'hard';
  priceRange?: 'budget' | 'moderate' | 'premium';
  limit?: number;
  offset?: number;
}

export interface RecipeRecommendation {
  recipe: UnifiedRecipe;
  score: number;
  reasons: string[];
  culturalMatch: number;
  nutritionalMatch: number;
  budgetMatch: number;
}

export interface CulturalRecipeAnalysis {
  authenticityScore: number;
  traditionalIngredients: string[];
  modernAdaptations: string[];
  culturalContext: string;
  preservationTips: string[];
  regionalVariations: string[];
}

/**
 * Unified Recipe Service
 * Provides a single interface for recipe search, analysis, and recommendations
 */
export class RecipeService {
  /**
   * Search recipes across multiple sources with unified filtering
   */
  async searchRecipes(filters: RecipeSearchFilters): Promise<UnifiedRecipe[]> {
    const recipes: UnifiedRecipe[] = [];

    try {
      // Search Spoonacular
      const spoonacularResults = await this.searchSpoonacularRecipes(filters);
      recipes.push(...spoonacularResults);

      // Only using Spoonacular now

      // Sort by relevance and cultural authenticity
      return this.sortRecipesByRelevance(recipes, filters);
    } catch (error) {
      console.error('Recipe search failed:', error);
      return [];
    }
  }

  /**
   * Get detailed recipe information with comprehensive analysis
   */
  async getRecipeDetails(
    recipeId: string,
    source: 'spoonacular',
    culturalContext?: string
  ): Promise<UnifiedRecipe | null> {
    try {
      let recipe: UnifiedRecipe | null = null;

      if (source === 'spoonacular') {
        const spoonacularRecipe = await spoonacularService.getRecipeInformation(parseInt(recipeId));
        if (spoonacularRecipe) {
          recipe = await this.convertSpoonacularRecipe(spoonacularRecipe);
        }
      }

      if (recipe && culturalContext) {
        // Enhance with cultural analysis
        const culturalAnalysis = await this.analyzeCulturalAuthenticity(recipe, culturalContext);
        recipe.culturalScore = culturalAnalysis.authenticityScore;
      }

      return recipe;
    } catch (error) {
      console.error(`Failed to get recipe details for ${recipeId}:`, error);
      return null;
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
  ): Promise<RecipeRecommendation[]> {
    const recommendations: RecipeRecommendation[] = [];

    for (const cuisine of userPreferences.culturalCuisines) {
      try {
        const recipes = await this.searchRecipes({
          cuisines: [cuisine],
          diets: userPreferences.dietaryRestrictions,
          maxReadyTime: userPreferences.availableTime,
          culturalAuthenticity: 'high',
          limit: Math.ceil(limit / userPreferences.culturalCuisines.length),
        });

        for (const recipe of recipes) {
          const recommendation = await this.scoreRecipeRecommendation(recipe, userPreferences);
          recommendations.push(recommendation);
        }
      } catch (error) {
        console.error(`Failed to get recommendations for cuisine ${cuisine}:`, error);
      }
    }

    // Sort by score and return top recommendations
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Analyze recipe for cultural authenticity
   */
  async analyzeCulturalAuthenticity(
    recipe: UnifiedRecipe,
    culturalOrigin: string
  ): Promise<CulturalRecipeAnalysis> {
    const traditionalIngredients = this.getTraditionalIngredients(culturalOrigin);
    const recipeIngredients = recipe.ingredients.map(ing => ing.name.toLowerCase());

    // Calculate authenticity score
    const matchingIngredients = traditionalIngredients.filter(traditional =>
      recipeIngredients.some(ingredient => ingredient.includes(traditional.toLowerCase()))
    );

    const authenticityScore = Math.min(100, (matchingIngredients.length / traditionalIngredients.length) * 100);

    // Identify modern adaptations
    const modernKeywords = ['substitute', 'alternative', 'modern', 'fusion', 'twist'];
    const modernAdaptations = recipe.ingredients
      .filter(ing => modernKeywords.some(keyword => ing.originalText.toLowerCase().includes(keyword)))
      .map(ing => ing.name);

    return {
      authenticityScore,
      traditionalIngredients: matchingIngredients,
      modernAdaptations,
      culturalContext: this.getCulturalContext(culturalOrigin),
      preservationTips: this.getPreservationTips(culturalOrigin),
      regionalVariations: this.getRegionalVariations(culturalOrigin),
    };
  }

  /**
   * Get nutritional analysis with cultural considerations
   */
  async analyzeNutritionWithCulturalContext(
    ingredients: string[],
    servings: number,
    culturalOrigin?: string
  ): Promise<{
    nutrition: UnifiedNutrition | null;
    culturalNutritionNotes: string[];
    healthRecommendations: string[];
  }> {
    // Use Spoonacular's nutrition data
    const nutrition = this.getDefaultNutrition(); // Placeholder for now
    
    const culturalNutritionNotes = culturalOrigin 
      ? this.getCulturalNutritionNotes(culturalOrigin, nutrition)
      : [];

    const healthRecommendations: string[] = []; // Simplified for now

    return {
      nutrition,
      culturalNutritionNotes,
      healthRecommendations,
    };
  }

  /**
   * Find similar recipes with cultural awareness
   */
  async findSimilarRecipes(
    recipeId: string,
    source: 'spoonacular',
    culturalPreference?: string,
    limit: number = 5
  ): Promise<UnifiedRecipe[]> {
    try {
      if (source === 'spoonacular') {
        const similarRecipes = await spoonacularService.getSimilarRecipes(parseInt(recipeId), limit);
        const unifiedRecipes = await Promise.all(
          similarRecipes.map(async (recipe) => {
            const fullRecipe = await spoonacularService.getRecipeInformation(recipe.id);
            return fullRecipe ? await this.convertSpoonacularRecipe(fullRecipe) : null;
          })
        );

        return unifiedRecipes.filter(Boolean) as UnifiedRecipe[];
      }

      return [];
    } catch (error) {
      console.error(`Failed to find similar recipes for ${recipeId}:`, error);
      return [];
    }
  }

  /**
   * Search Spoonacular recipes
   */
  private async searchSpoonacularRecipes(filters: RecipeSearchFilters): Promise<UnifiedRecipe[]> {
    const params: SpoonacularSearchParams = {
      query: filters.query,
      cuisine: filters.cuisines?.join(','),
      diet: filters.diets?.join(','),
      intolerances: filters.intolerances?.join(','),
      includeIngredients: filters.includeIngredients?.join(','),
      excludeIngredients: filters.excludeIngredients?.join(','),
      instructionsRequired: true,
      fillIngredients: false,
      addRecipeInformation: true,
      addRecipeInstructions: false,
      addRecipeNutrition: false,
      maxReadyTime: filters.maxReadyTime,
      ignorePantry: true,
      sort: 'meta-score',
      offset: filters.offset || 0,
      number: filters.limit || 12,
      minServings: filters.minServings,
      maxServings: filters.maxServings,
      minCalories: filters.minCalories,
      maxCalories: filters.maxCalories,
    };

    const result = await spoonacularService.searchRecipes(params);
    return Promise.all(result.results.map(recipe => this.convertSpoonacularRecipe(recipe)));
  }



  /**
   * Convert Spoonacular recipe to unified format
   */
  private async convertSpoonacularRecipe(recipe: SpoonacularRecipe): Promise<UnifiedRecipe> {
    const nutrition = await this.extractSpoonacularNutrition(recipe);
    
    return {
      id: recipe.id.toString(),
      source: 'spoonacular',
      title: recipe.title,
      description: recipe.summary,
      image: recipe.image,
      servings: recipe.servings,
      readyInMinutes: recipe.readyInMinutes,
      preparationMinutes: recipe.preparationMinutes,
      cookingMinutes: recipe.cookingMinutes,
      cuisines: recipe.cuisines,
      dishTypes: recipe.dishTypes,
      diets: recipe.diets,
      healthLabels: [], // Spoonacular doesn't provide health labels
      ingredients: this.convertSpoonacularIngredients(recipe.extendedIngredients || []),
      instructions: this.convertSpoonacularInstructions(recipe.analyzedInstructions || []),
      nutrition,
      culturalScore: 0, // Will be calculated separately
      healthScore: recipe.healthScore || 0,
      pricePerServing: recipe.pricePerServing,
      difficulty: this.calculateDifficulty(recipe),
      tags: [...recipe.cuisines, ...recipe.dishTypes, ...recipe.diets],
      sourceUrl: recipe.sourceUrl,
      author: recipe.sourceName,
    };
  }



  /**
   * Helper methods for data conversion and analysis
   */
  private convertSpoonacularIngredients(ingredients: any[]): UnifiedIngredient[] {
    return ingredients.map((ing, index) => ({
      id: ing.id?.toString() || index.toString(),
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      originalText: ing.original,
      image: ing.image,
      category: ing.aisle,
    }));
  }

  private convertSpoonacularInstructions(instructions: any[]): UnifiedInstruction[] {
    const steps: UnifiedInstruction[] = [];
    
    instructions.forEach(instruction => {
      instruction.steps?.forEach((step: any) => {
        steps.push({
          step: step.number,
          instruction: step.step,
          ingredients: step.ingredients?.map((ing: any) => ing.name) || [],
          equipment: step.equipment?.map((eq: any) => eq.name) || [],
          time: step.length?.number,
        });
      });
    });

    return steps;
  }



  private async extractSpoonacularNutrition(recipe: SpoonacularRecipe): Promise<UnifiedNutrition> {
    // Extract nutrition from Spoonacular data
    if (recipe.nutrition) {
      return this.convertSpoonacularNutrition(recipe.nutrition);
    }

    // Return default nutrition if not available from Spoonacular
    return this.getDefaultNutrition();
  }

  private convertSpoonacularNutrition(nutrition: any): UnifiedNutrition {
    const nutrients = nutrition.nutrients || [];
    
    const getNutrient = (name: string) => {
      const nutrient = nutrients.find((n: any) => n.name === name);
      return nutrient?.amount || 0;
    };

    return {
      calories: getNutrient('Calories'),
      protein: getNutrient('Protein'),
      carbs: getNutrient('Carbohydrates'),
      fat: getNutrient('Fat'),
      fiber: getNutrient('Fiber'),
      sugar: getNutrient('Sugar'),
      sodium: getNutrient('Sodium'),
      cholesterol: getNutrient('Cholesterol'),
      saturatedFat: getNutrient('Saturated Fat'),
      vitamins: {},
      minerals: {},
      percentDailyValues: {},
    };
  }


  private getDefaultNutrition(): UnifiedNutrition {
    return {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      cholesterol: 0,
      saturatedFat: 0,
      vitamins: {},
      minerals: {},
      percentDailyValues: {},
    };
  }

  private calculateDifficulty(recipe: SpoonacularRecipe): 'easy' | 'medium' | 'hard' {
    const factors = {
      ingredients: recipe.extendedIngredients?.length || 0,
      time: recipe.readyInMinutes || 0,
      steps: recipe.analyzedInstructions?.reduce((total, inst) => total + (inst.steps?.length || 0), 0) || 0,
    };

    const score = (factors.ingredients * 0.3) + (factors.time * 0.01) + (factors.steps * 0.5);

    if (score < 10) return 'easy';
    if (score < 20) return 'medium';
    return 'hard';
  }


  private sortRecipesByRelevance(recipes: UnifiedRecipe[], filters: RecipeSearchFilters): UnifiedRecipe[] {
    return recipes.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      // Cultural authenticity preference
      if (filters.culturalAuthenticity === 'high') {
        scoreA += a.culturalScore * 0.4;
        scoreB += b.culturalScore * 0.4;
      }

      // Health score
      scoreA += a.healthScore * 0.3;
      scoreB += b.healthScore * 0.3;

      // Time preference
      if (filters.maxReadyTime) {
        const timeScoreA = Math.max(0, 100 - (a.readyInMinutes / filters.maxReadyTime) * 100);
        const timeScoreB = Math.max(0, 100 - (b.readyInMinutes / filters.maxReadyTime) * 100);
        scoreA += timeScoreA * 0.2;
        scoreB += timeScoreB * 0.2;
      }

      // Difficulty preference
      const difficultyScores = { easy: 100, medium: 70, hard: 40 };
      scoreA += difficultyScores[a.difficulty] * 0.1;
      scoreB += difficultyScores[b.difficulty] * 0.1;

      return scoreB - scoreA;
    });
  }

  private async scoreRecipeRecommendation(
    recipe: UnifiedRecipe,
    preferences: any
  ): Promise<RecipeRecommendation> {
    let score = 0;
    const reasons: string[] = [];

    // Cultural match
    const culturalMatch = recipe.cuisines.some(cuisine => 
      preferences.culturalCuisines.includes(cuisine)
    ) ? 100 : 0;
    score += culturalMatch * 0.4;
    if (culturalMatch > 0) reasons.push('Matches your cultural preferences');

    // Dietary restrictions
    const dietMatch = preferences.dietaryRestrictions.every((diet: string) =>
      recipe.diets.includes(diet) || recipe.healthLabels.includes(diet)
    ) ? 100 : 0;
    score += dietMatch * 0.3;
    if (dietMatch > 0) reasons.push('Meets your dietary requirements');

    // Time constraint
    const timeMatch = recipe.readyInMinutes <= preferences.availableTime ? 100 : 0;
    score += timeMatch * 0.2;
    if (timeMatch > 0) reasons.push('Fits your available cooking time');

    // Health score
    score += recipe.healthScore * 0.1;
    if (recipe.healthScore > 70) reasons.push('High nutritional value');

    return {
      recipe,
      score,
      reasons,
      culturalMatch,
      nutritionalMatch: recipe.healthScore,
      budgetMatch: recipe.pricePerServing ? Math.max(0, 100 - recipe.pricePerServing * 10) : 50,
    };
  }

  private getTraditionalIngredients(cuisine: string): string[] {
    const traditionalIngredients: Record<string, string[]> = {
      'italian': ['olive oil', 'tomato', 'basil', 'parmesan', 'mozzarella', 'garlic'],
      'mexican': ['cumin', 'chili', 'lime', 'cilantro', 'avocado', 'corn'],
      'indian': ['turmeric', 'cumin', 'coriander', 'garam masala', 'ginger', 'garlic'],
      'chinese': ['soy sauce', 'ginger', 'garlic', 'sesame oil', 'rice wine', 'scallion'],
      'japanese': ['soy sauce', 'miso', 'sake', 'mirin', 'nori', 'wasabi'],
      'thai': ['fish sauce', 'lime', 'chili', 'coconut milk', 'lemongrass', 'basil'],
      'french': ['butter', 'wine', 'herbs', 'cream', 'shallot', 'thyme'],
      'mediterranean': ['olive oil', 'lemon', 'herbs', 'feta', 'olives', 'tomato'],
    };

    return traditionalIngredients[cuisine.toLowerCase()] || [];
  }

  private getCulturalContext(cuisine: string): string {
    const contexts: Record<string, string> = {
      'italian': 'Italian cuisine emphasizes fresh, high-quality ingredients and simple preparation methods.',
      'mexican': 'Mexican cuisine is known for its bold flavors, use of chili peppers, and corn-based dishes.',
      'indian': 'Indian cuisine features complex spice blends and diverse regional cooking styles.',
      'chinese': 'Chinese cuisine focuses on balance of flavors, textures, and colors with emphasis on fresh ingredients.',
      'japanese': 'Japanese cuisine values seasonal ingredients, minimal processing, and aesthetic presentation.',
      'thai': 'Thai cuisine balances sweet, sour, salty, and spicy flavors in harmonious combinations.',
      'french': 'French cuisine is renowned for its sophisticated techniques and emphasis on quality ingredients.',
      'mediterranean': 'Mediterranean cuisine promotes healthy eating with olive oil, fresh vegetables, and seafood.',
    };

    return contexts[cuisine.toLowerCase()] || 'This cuisine has a rich culinary tradition.';
  }

  private getPreservationTips(cuisine: string): string[] {
    const tips: Record<string, string[]> = {
      'italian': ['Use high-quality olive oil', 'Fresh herbs are essential', 'Don\'t overcook pasta'],
      'mexican': ['Toast spices before grinding', 'Use fresh lime juice', 'Char vegetables for authentic flavor'],
      'indian': ['Bloom spices in oil', 'Use fresh ginger and garlic', 'Balance spices gradually'],
      'chinese': ['High heat for stir-frying', 'Prep all ingredients before cooking', 'Use a wok when possible'],
      'japanese': ['Use dashi for umami base', 'Don\'t overcook vegetables', 'Quality of ingredients is key'],
      'thai': ['Balance sweet, sour, salty, spicy', 'Use fresh herbs', 'Pound curry pastes by hand'],
      'french': ['Use proper knife techniques', 'Build flavors in layers', 'Quality butter and cream'],
      'mediterranean': ['Use extra virgin olive oil', 'Fresh seasonal vegetables', 'Simple preparation methods'],
    };

    return tips[cuisine.toLowerCase()] || ['Focus on fresh, quality ingredients'];
  }

  private getRegionalVariations(cuisine: string): string[] {
    const variations: Record<string, string[]> = {
      'italian': ['Northern: cream-based sauces', 'Southern: tomato-based dishes', 'Coastal: seafood focus'],
      'mexican': ['Northern: beef and wheat', 'Central: corn and beans', 'Coastal: seafood and tropical fruits'],
      'indian': ['North: wheat and dairy', 'South: rice and coconut', 'East: fish and sweets'],
      'chinese': ['Sichuan: spicy and numbing', 'Cantonese: fresh and mild', 'Beijing: hearty and savory'],
      'japanese': ['Kansai: lighter flavors', 'Kanto: stronger flavors', 'Okinawan: unique ingredients'],
      'thai': ['Northern: mild and herbal', 'Central: balanced flavors', 'Southern: spicy and coconut'],
      'french': ['Provence: herbs and olive oil', 'Normandy: cream and apples', 'Burgundy: wine-based dishes'],
      'mediterranean': ['Greek: feta and olives', 'Spanish: paprika and saffron', 'Turkish: yogurt and herbs'],
    };

    return variations[cuisine.toLowerCase()] || ['Regional variations exist'];
  }

  private getCulturalNutritionNotes(cuisine: string, nutrition: UnifiedNutrition | null): string[] {
    if (!nutrition) return [];

    const notes: string[] = [];
    const sodium = nutrition.sodium || 0;
    const fiber = nutrition.fiber || 0;

    // Cuisine-specific nutrition notes
    if (cuisine.toLowerCase() === 'mediterranean' && fiber > 10) {
      notes.push('High fiber content aligns with traditional Mediterranean diet benefits');
    }

    if (cuisine.toLowerCase() === 'japanese' && sodium < 1000) {
      notes.push('Lower sodium content supports traditional Japanese dietary principles');
    }

    if (cuisine.toLowerCase() === 'indian' && nutrition.vitamins['Vitamin C'] && nutrition.vitamins['Vitamin C'] > 50) {
      notes.push('Rich in Vitamin C from traditional spices and vegetables');
    }

    return notes;
  }

  private generateHealthRecommendations(nutrition: UnifiedNutrition): string[] {
    const recommendations: string[] = [];

    const sodium = nutrition.sodium || 0;
    const fiber = nutrition.fiber || 0;
    const saturatedFat = nutrition.saturatedFat || 0;

    if (sodium > 2300) {
      recommendations.push('Consider reducing salt or using herbs and spices for flavor');
    }

    if (fiber < 5) {
      recommendations.push('Add more vegetables or whole grains to increase fiber');
    }

    if (saturatedFat > 20) {
      recommendations.push('Consider using healthier fats like olive oil or avocado');
    }

    return recommendations;
  }
}

/**
 * Singleton instance of RecipeService
 */
export const recipeService = new RecipeService();