/**
 * Offline Meal Planning System
 * Works without external APIs using local recipe database and estimated pricing
 */

interface OfflineRecipe {
  id: string;
  title: string;
  description: string;
  culturalOrigin: string[];
  cuisine: string;
  ingredients: Array<{
    name: string;
    amount: string;
    unit: string;
    estimatedPrice: number;
  }>;
  instructions: string[];
  servings: number;
  prepTime: number;
  cookTime: number;
  totalTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  estimatedCost: number;
  nutritionalInfo?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface MealPlanRequest {
  culturalCuisines: string[];
  dietaryRestrictions: string[];
  budgetLimit: number;
  householdSize: number;
  timeFrame: string;
  numberOfMeals: number;
}

interface MealPlanResult {
  success: boolean;
  recipes: OfflineRecipe[];
  totalCost: number;
  costPerServing: number;
  budgetUtilization: number;
  message: string;
}

export class OfflineMealPlanner {
  private recipeDatabase: OfflineRecipe[] = [
    // Mediterranean Recipes
    {
      id: 'med-001',
      title: 'Classic Greek Salad',
      description: 'Fresh Mediterranean salad with feta cheese and olives',
      culturalOrigin: ['greek', 'mediterranean'],
      cuisine: 'mediterranean',
      ingredients: [
        { name: 'Tomatoes', amount: '3', unit: 'large', estimatedPrice: 2.50 },
        { name: 'Cucumber', amount: '1', unit: 'large', estimatedPrice: 1.00 },
        { name: 'Red onion', amount: '1/2', unit: 'medium', estimatedPrice: 0.50 },
        { name: 'Feta cheese', amount: '200', unit: 'g', estimatedPrice: 4.00 },
        { name: 'Kalamata olives', amount: '1/2', unit: 'cup', estimatedPrice: 2.00 },
        { name: 'Olive oil', amount: '3', unit: 'tbsp', estimatedPrice: 0.75 },
        { name: 'Oregano', amount: '1', unit: 'tsp', estimatedPrice: 0.25 }
      ],
      instructions: [
        'Cut tomatoes into wedges',
        'Slice cucumber and red onion',
        'Combine vegetables in a large bowl',
        'Add feta cheese and olives',
        'Drizzle with olive oil and sprinkle oregano',
        'Toss gently and serve immediately'
      ],
      servings: 4,
      prepTime: 15,
      cookTime: 0,
      totalTime: 15,
      difficulty: 'easy',
      tags: ['vegetarian', 'gluten-free', 'quick'],
      estimatedCost: 11.00,
      nutritionalInfo: { calories: 180, protein: 8, carbs: 12, fat: 14 }
    },
    {
      id: 'med-002',
      title: 'Mediterranean Chicken Souvlaki',
      description: 'Grilled chicken skewers with Greek herbs and lemon',
      culturalOrigin: ['greek', 'mediterranean'],
      cuisine: 'mediterranean',
      ingredients: [
        { name: 'Chicken breast', amount: '1.5', unit: 'lbs', estimatedPrice: 8.00 },
        { name: 'Lemon juice', amount: '1/4', unit: 'cup', estimatedPrice: 0.50 },
        { name: 'Olive oil', amount: '3', unit: 'tbsp', estimatedPrice: 0.75 },
        { name: 'Garlic', amount: '3', unit: 'cloves', estimatedPrice: 0.25 },
        { name: 'Oregano', amount: '2', unit: 'tsp', estimatedPrice: 0.50 },
        { name: 'Pita bread', amount: '4', unit: 'pieces', estimatedPrice: 2.00 },
        { name: 'Tzatziki sauce', amount: '1', unit: 'cup', estimatedPrice: 3.00 }
      ],
      instructions: [
        'Cut chicken into 1-inch cubes',
        'Mix lemon juice, olive oil, minced garlic, and oregano',
        'Marinate chicken for 30 minutes',
        'Thread chicken onto skewers',
        'Grill for 12-15 minutes, turning occasionally',
        'Serve with warm pita and tzatziki'
      ],
      servings: 4,
      prepTime: 20,
      cookTime: 15,
      totalTime: 35,
      difficulty: 'medium',
      tags: ['protein-rich', 'grilled'],
      estimatedCost: 15.00,
      nutritionalInfo: { calories: 320, protein: 35, carbs: 18, fat: 12 }
    },
    // Asian Recipes
    {
      id: 'asian-001',
      title: 'Vegetable Fried Rice',
      description: 'Classic Asian fried rice with mixed vegetables',
      culturalOrigin: ['chinese', 'asian'],
      cuisine: 'asian',
      ingredients: [
        { name: 'Jasmine rice', amount: '2', unit: 'cups', estimatedPrice: 1.50 },
        { name: 'Mixed vegetables', amount: '2', unit: 'cups', estimatedPrice: 3.00 },
        { name: 'Eggs', amount: '3', unit: 'large', estimatedPrice: 1.50 },
        { name: 'Soy sauce', amount: '3', unit: 'tbsp', estimatedPrice: 0.50 },
        { name: 'Sesame oil', amount: '1', unit: 'tbsp', estimatedPrice: 0.75 },
        { name: 'Green onions', amount: '3', unit: 'stalks', estimatedPrice: 1.00 },
        { name: 'Garlic', amount: '2', unit: 'cloves', estimatedPrice: 0.25 }
      ],
      instructions: [
        'Cook rice according to package directions and cool',
        'Beat eggs and scramble in wok',
        'Add garlic and vegetables, stir-fry 3 minutes',
        'Add rice and break up clumps',
        'Add soy sauce and sesame oil',
        'Garnish with green onions'
      ],
      servings: 4,
      prepTime: 15,
      cookTime: 20,
      totalTime: 35,
      difficulty: 'easy',
      tags: ['vegetarian', 'one-pot'],
      estimatedCost: 8.50,
      nutritionalInfo: { calories: 280, protein: 12, carbs: 45, fat: 8 }
    },
    {
      id: 'asian-002',
      title: 'Teriyaki Salmon Bowl',
      description: 'Glazed salmon with steamed rice and vegetables',
      culturalOrigin: ['japanese', 'asian'],
      cuisine: 'asian',
      ingredients: [
        { name: 'Salmon fillets', amount: '4', unit: '6oz pieces', estimatedPrice: 16.00 },
        { name: 'Teriyaki sauce', amount: '1/2', unit: 'cup', estimatedPrice: 2.00 },
        { name: 'Brown rice', amount: '1.5', unit: 'cups', estimatedPrice: 1.00 },
        { name: 'Broccoli', amount: '2', unit: 'cups', estimatedPrice: 2.50 },
        { name: 'Carrots', amount: '2', unit: 'medium', estimatedPrice: 1.00 },
        { name: 'Sesame seeds', amount: '2', unit: 'tbsp', estimatedPrice: 0.50 }
      ],
      instructions: [
        'Cook brown rice according to package directions',
        'Steam broccoli and carrots until tender',
        'Pan-sear salmon fillets 4 minutes per side',
        'Brush salmon with teriyaki sauce',
        'Serve over rice with vegetables',
        'Sprinkle with sesame seeds'
      ],
      servings: 4,
      prepTime: 10,
      cookTime: 25,
      totalTime: 35,
      difficulty: 'medium',
      tags: ['healthy', 'protein-rich', 'gluten-free'],
      estimatedCost: 23.00,
      nutritionalInfo: { calories: 420, protein: 38, carbs: 35, fat: 16 }
    },
    // Mexican Recipes
    {
      id: 'mex-001',
      title: 'Black Bean Quesadillas',
      description: 'Crispy tortillas filled with black beans and cheese',
      culturalOrigin: ['mexican', 'latin-american'],
      cuisine: 'mexican',
      ingredients: [
        { name: 'Flour tortillas', amount: '8', unit: 'large', estimatedPrice: 3.00 },
        { name: 'Black beans', amount: '2', unit: 'cans', estimatedPrice: 2.00 },
        { name: 'Cheddar cheese', amount: '2', unit: 'cups', estimatedPrice: 4.00 },
        { name: 'Bell peppers', amount: '1', unit: 'large', estimatedPrice: 1.50 },
        { name: 'Onion', amount: '1', unit: 'medium', estimatedPrice: 0.75 },
        { name: 'Cumin', amount: '1', unit: 'tsp', estimatedPrice: 0.25 },
        { name: 'Salsa', amount: '1', unit: 'cup', estimatedPrice: 2.50 }
      ],
      instructions: [
        'Drain and rinse black beans',
        'Sauté diced onion and bell pepper',
        'Add beans and cumin, mash lightly',
        'Spread bean mixture on tortillas',
        'Top with cheese and fold',
        'Cook in skillet until crispy and cheese melts',
        'Serve with salsa'
      ],
      servings: 4,
      prepTime: 15,
      cookTime: 20,
      totalTime: 35,
      difficulty: 'easy',
      tags: ['vegetarian', 'budget-friendly'],
      estimatedCost: 14.00,
      nutritionalInfo: { calories: 380, protein: 18, carbs: 45, fat: 15 }
    },
    // Indian Recipes
    {
      id: 'ind-001',
      title: 'Chickpea Curry (Chana Masala)',
      description: 'Spiced chickpea curry with aromatic Indian spices',
      culturalOrigin: ['indian'],
      cuisine: 'indian',
      ingredients: [
        { name: 'Chickpeas', amount: '2', unit: 'cans', estimatedPrice: 2.50 },
        { name: 'Onion', amount: '1', unit: 'large', estimatedPrice: 0.75 },
        { name: 'Tomatoes', amount: '2', unit: 'large', estimatedPrice: 2.00 },
        { name: 'Ginger-garlic paste', amount: '2', unit: 'tbsp', estimatedPrice: 0.50 },
        { name: 'Garam masala', amount: '2', unit: 'tsp', estimatedPrice: 0.75 },
        { name: 'Turmeric', amount: '1', unit: 'tsp', estimatedPrice: 0.25 },
        { name: 'Coconut milk', amount: '1', unit: 'can', estimatedPrice: 2.00 },
        { name: 'Basmati rice', amount: '1.5', unit: 'cups', estimatedPrice: 2.00 }
      ],
      instructions: [
        'Cook basmati rice according to package directions',
        'Sauté diced onion until golden',
        'Add ginger-garlic paste and spices',
        'Add diced tomatoes and cook until soft',
        'Add chickpeas and coconut milk',
        'Simmer 15 minutes until thickened',
        'Serve over rice'
      ],
      servings: 4,
      prepTime: 15,
      cookTime: 30,
      totalTime: 45,
      difficulty: 'medium',
      tags: ['vegan', 'protein-rich', 'spicy'],
      estimatedCost: 10.75,
      nutritionalInfo: { calories: 350, protein: 15, carbs: 55, fat: 10 }
    },
    // Italian Recipes
    {
      id: 'ital-001',
      title: 'Spaghetti Aglio e Olio',
      description: 'Simple Italian pasta with garlic and olive oil',
      culturalOrigin: ['italian'],
      cuisine: 'italian',
      ingredients: [
        { name: 'Spaghetti', amount: '1', unit: 'lb', estimatedPrice: 1.50 },
        { name: 'Garlic', amount: '6', unit: 'cloves', estimatedPrice: 0.50 },
        { name: 'Extra virgin olive oil', amount: '1/2', unit: 'cup', estimatedPrice: 2.00 },
        { name: 'Red pepper flakes', amount: '1/2', unit: 'tsp', estimatedPrice: 0.25 },
        { name: 'Fresh parsley', amount: '1/4', unit: 'cup', estimatedPrice: 1.00 },
        { name: 'Parmesan cheese', amount: '1/2', unit: 'cup', estimatedPrice: 3.00 }
      ],
      instructions: [
        'Cook spaghetti according to package directions',
        'Slice garlic thinly',
        'Heat olive oil in large pan',
        'Add garlic and red pepper flakes',
        'Cook until garlic is golden',
        'Add drained pasta and parsley',
        'Toss with Parmesan and serve'
      ],
      servings: 4,
      prepTime: 10,
      cookTime: 15,
      totalTime: 25,
      difficulty: 'easy',
      tags: ['vegetarian', 'quick', 'budget-friendly'],
      estimatedCost: 8.25,
      nutritionalInfo: { calories: 420, protein: 14, carbs: 65, fat: 12 }
    }
  ];

  /**
   * Generate meal plan using offline recipe database
   */
  async generateMealPlan(request: MealPlanRequest): Promise<MealPlanResult> {
    try {
      console.log('🔄 Generating offline meal plan...');

      // Filter recipes by cultural preferences
      let availableRecipes = this.recipeDatabase.filter(recipe => 
        (request.culturalCuisines || ['international']).some(cuisine => 
          recipe.culturalOrigin?.includes(cuisine) || 
          recipe.cuisine === cuisine ||
          cuisine === 'international'
        )
      );

      // Apply dietary restrictions
      if (request.dietaryRestrictions && request.dietaryRestrictions.length > 0) {
        availableRecipes = availableRecipes.filter(recipe => {
          return request.dietaryRestrictions.every(restriction => {
            switch (restriction) {
              case 'vegetarian':
                return !(recipe.ingredients || []).some(ing => 
                  ['chicken', 'beef', 'pork', 'fish', 'salmon'].some(meat => 
                    ing.name?.toLowerCase().includes(meat)
                  )
                );
              case 'vegan':
                return (recipe.tags || []).includes('vegan') || 
                  !(recipe.ingredients || []).some(ing => 
                    ['cheese', 'milk', 'egg', 'butter', 'yogurt'].some(dairy => 
                      ing.name?.toLowerCase().includes(dairy)
                    )
                  );
              case 'gluten-free':
                return (recipe.tags || []).includes('gluten-free') ||
                  !(recipe.ingredients || []).some(ing => 
                    ['wheat', 'flour', 'bread', 'pasta', 'soy sauce'].some(gluten => 
                      ing.name?.toLowerCase().includes(gluten)
                    )
                  );
              default:
                return true;
            }
          });
        });
      }

      if (availableRecipes.length === 0) {
        return {
          success: false,
          recipes: [],
          totalCost: 0,
          costPerServing: 0,
          budgetUtilization: 0,
          message: 'No recipes found matching your preferences'
        };
      }

      // Select recipes within budget
      const selectedRecipes: OfflineRecipe[] = [];
      let totalCost = 0;
      const targetCost = request.budgetLimit * 0.9; // Use 90% of budget

      // Sort by cost efficiency (cost per serving)
      availableRecipes.sort((a, b) => 
        (a.estimatedCost / a.servings) - (b.estimatedCost / b.servings)
      );

      // Select recipes up to the number requested or budget limit
      for (const recipe of availableRecipes) {
        if (selectedRecipes.length >= request.numberOfMeals) break;
        
        const scaledCost = this.scaleRecipeCost(recipe, request.householdSize);
        
        if (totalCost + scaledCost <= targetCost) {
          const scaledRecipe = this.scaleRecipe(recipe, request.householdSize);
          selectedRecipes.push(scaledRecipe);
          totalCost += scaledCost;
        }
      }

      // If we don't have enough recipes, add more regardless of budget
      while (selectedRecipes.length < request.numberOfMeals && selectedRecipes.length < availableRecipes.length) {
        const remainingRecipes = availableRecipes.filter(recipe => 
          !selectedRecipes.some(selected => selected.id === recipe.id)
        );
        
        if (remainingRecipes.length > 0) {
          const recipe = remainingRecipes[0];
          const scaledRecipe = this.scaleRecipe(recipe, request.householdSize);
          selectedRecipes.push(scaledRecipe);
          totalCost += this.scaleRecipeCost(recipe, request.householdSize);
        } else {
          break;
        }
      }

      const costPerServing = totalCost / (selectedRecipes.length * request.householdSize);
      const budgetUtilization = (totalCost / request.budgetLimit) * 100;

      console.log(`✅ Generated offline meal plan: ${selectedRecipes.length} recipes, $${totalCost.toFixed(2)} total`);

      return {
        success: true,
        recipes: selectedRecipes,
        totalCost,
        costPerServing,
        budgetUtilization,
        message: `Generated ${selectedRecipes.length} recipes using offline database`
      };

    } catch (error) {
      console.error('❌ Offline meal plan generation failed:', error);
      return {
        success: false,
        recipes: [],
        totalCost: 0,
        costPerServing: 0,
        budgetUtilization: 0,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Scale recipe for different household sizes
   */
  private scaleRecipe(recipe: OfflineRecipe, householdSize: number): OfflineRecipe {
    const scaleFactor = householdSize / recipe.servings;
    
    return {
      ...recipe,
      servings: householdSize,
      ingredients: recipe.ingredients.map(ingredient => ({
        ...ingredient,
        amount: this.scaleAmount(ingredient.amount, scaleFactor),
        estimatedPrice: ingredient.estimatedPrice * scaleFactor
      })),
      estimatedCost: recipe.estimatedCost * scaleFactor
    };
  }

  /**
   * Calculate scaled recipe cost
   */
  private scaleRecipeCost(recipe: OfflineRecipe, householdSize: number): number {
    const scaleFactor = householdSize / recipe.servings;
    return recipe.estimatedCost * scaleFactor;
  }

  /**
   * Scale ingredient amounts
   */
  private scaleAmount(amount: string, scaleFactor: number): string {
    // Handle fractions and decimals
    const fractionMatch = amount.match(/^(\d+)\/(\d+)$/);
    if (fractionMatch) {
      const numerator = parseInt(fractionMatch[1]);
      const denominator = parseInt(fractionMatch[2]);
      const decimal = (numerator / denominator) * scaleFactor;
      return decimal.toFixed(2);
    }

    const numberMatch = amount.match(/^(\d+(?:\.\d+)?)/);
    if (numberMatch) {
      const number = parseFloat(numberMatch[1]);
      const scaled = number * scaleFactor;
      return scaled.toFixed(1);
    }

    return amount; // Return original if can't parse
  }

  /**
   * Get recipes by cuisine
   */
  getRecipesByCuisine(cuisine: string): OfflineRecipe[] {
    return this.recipeDatabase.filter(recipe => 
      recipe.culturalOrigin.includes(cuisine) || recipe.cuisine === cuisine
    );
  }

  /**
   * Get all available cuisines
   */
  getAvailableCuisines(): string[] {
    const cuisines = new Set<string>();
    this.recipeDatabase.forEach(recipe => {
      cuisines.add(recipe.cuisine);
      recipe.culturalOrigin.forEach(origin => cuisines.add(origin));
    });
    return Array.from(cuisines).sort();
  }

  /**
   * Add custom recipe to database
   */
  addRecipe(recipe: Omit<OfflineRecipe, 'id'>): string {
    const id = `custom-${Date.now()}`;
    this.recipeDatabase.push({ ...recipe, id });
    return id;
  }
}

export const offlineMealPlanner = new OfflineMealPlanner();