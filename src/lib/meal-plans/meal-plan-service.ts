/**
 * Meal Plan Database Service
 * Handles all database operations for meal planning
 */

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/database';

type MealPlan = Database['public']['Tables']['meal_plans']['Row'];
type Recipe = Database['public']['Tables']['recipes']['Row'];
type RecipeIngredient = Database['public']['Tables']['recipe_ingredients']['Row'];
type UserPreferences = Database['public']['Tables']['user_preferences']['Row'];
type ShoppingList = Database['public']['Tables']['shopping_lists']['Row'];

export interface MealPlanRequest {
  name: string;
  description?: string;
  culturalCuisines: string[];
  dietaryRestrictions: string[];
  budgetLimit: number;
  householdSize: number;
  zipCode?: string;
  timeFrame?: string;
  nutritionalGoals?: string[];
  excludeIngredients?: string[];
}

export interface RecipeData {
  title: string;
  description?: string;
  culturalOrigin: string[];
  cuisine: string;
  sourceUrl?: string;
  imageUrl?: string;
  servings: number;
  prepTime: number;
  cookTime: number;
  totalTime: number;
  difficulty: string;
  instructions: string[];
  tags: string[];
  ingredients: IngredientData[];
}

export interface IngredientData {
  name: string;
  amount: string;
  unit: string;
  originalName: string;
  isSubstituted: boolean;
  userStatus: 'normal' | 'already-have' | 'specialty-store';
  specialtyStore?: string;
  krogerPrice?: {
    productId: string;
    productName: string;
    unitPrice: number;
    totalCost: number;
    confidence: string;
    storeLocation: string;
    brand: string;
    size: string;
    onSale: boolean;
    salePrice?: number;
    alternatives: any[];
  };
}

export class MealPlanService {
  private supabase = createClientComponentClient<Database>();

  /**
   * Get current user (supports mock users)
   */
  async getCurrentUser() {
    // Check for mock user first
    const mockUser = localStorage.getItem('mockUser');
    if (mockUser) {
      return JSON.parse(mockUser);
    }

    // Fall back to Supabase auth
    const { data: { user }, error } = await this.supabase.auth.getUser();
    if (error) throw error;
    return user;
  }

  /**
   * Get or create user preferences
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    const { data, error } = await this.supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // No preferences found, create default
      const defaultPrefs = {
        user_id: userId,
        preferred_cuisines: ['international'],
        dietary_restrictions: [],
        default_budget: 50.00,
        household_size: 4,
        preferred_stores: ['kroger'],
        cultural_background: [],
        allergies: []
      };

      const { data: newPrefs, error: createError } = await this.supabase
        .from('user_preferences')
        .insert(defaultPrefs)
        .select()
        .single();

      if (createError) throw createError;
      return newPrefs;
    }

    if (error) throw error;
    return data;
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>) {
    const { data, error } = await this.supabase
      .from('user_preferences')
      .upsert({ user_id: userId, ...preferences })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Create a new meal plan
   */
  async createMealPlan(userId: string, request: MealPlanRequest): Promise<MealPlan> {
    const { data, error } = await this.supabase
      .from('meal_plans')
      .insert({
        user_id: userId,
        name: request.name,
        description: request.description,
        cultural_cuisines: request.culturalCuisines,
        dietary_restrictions: request.dietaryRestrictions,
        budget_limit: request.budgetLimit,
        household_size: request.householdSize,
        zip_code: request.zipCode,
        time_frame: request.timeFrame || 'week',
        nutritional_goals: request.nutritionalGoals || [],
        exclude_ingredients: request.excludeIngredients || [],
        status: 'draft'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Add recipe to meal plan
   */
  async addRecipeToMealPlan(mealPlanId: string, recipeData: RecipeData): Promise<Recipe> {
    // Insert recipe
    const { data: recipe, error: recipeError } = await this.supabase
      .from('recipes')
      .insert({
        meal_plan_id: mealPlanId,
        title: recipeData.title,
        description: recipeData.description,
        cultural_origin: recipeData.culturalOrigin,
        cuisine: recipeData.cuisine,
        source_url: recipeData.sourceUrl,
        image_url: recipeData.imageUrl,
        servings: recipeData.servings,
        prep_time: recipeData.prepTime,
        cook_time: recipeData.cookTime,
        total_time: recipeData.totalTime,
        difficulty: recipeData.difficulty,
        instructions: recipeData.instructions,
        tags: recipeData.tags
      })
      .select()
      .single();

    if (recipeError) throw recipeError;

    // Insert ingredients
    if (recipeData.ingredients.length > 0) {
      const ingredients = recipeData.ingredients.map(ing => ({
        recipe_id: recipe.id,
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        original_name: ing.originalName,
        is_substituted: ing.isSubstituted,
        user_status: ing.userStatus,
        specialty_store: ing.specialtyStore,
        kroger_product_id: ing.krogerPrice?.productId,
        kroger_product_name: ing.krogerPrice?.productName,
        kroger_price: ing.krogerPrice?.totalCost,
        kroger_unit_price: ing.krogerPrice?.unitPrice,
        kroger_confidence: ing.krogerPrice?.confidence,
        kroger_store_location: ing.krogerPrice?.storeLocation,
        kroger_brand: ing.krogerPrice?.brand,
        kroger_size: ing.krogerPrice?.size,
        on_sale: ing.krogerPrice?.onSale || false,
        sale_price: ing.krogerPrice?.salePrice,
        alternatives: ing.krogerPrice?.alternatives || []
      }));

      const { error: ingredientsError } = await this.supabase
        .from('recipe_ingredients')
        .insert(ingredients);

      if (ingredientsError) throw ingredientsError;
    }

    return recipe;
  }

  /**
   * Get meal plan with recipes and ingredients
   */
  async getMealPlanWithRecipes(mealPlanId: string) {
    const { data: mealPlan, error: mealPlanError } = await this.supabase
      .from('meal_plans')
      .select('*')
      .eq('id', mealPlanId)
      .single();

    if (mealPlanError) throw mealPlanError;

    const { data: recipes, error: recipesError } = await this.supabase
      .from('recipes')
      .select(`
        *,
        recipe_ingredients(*)
      `)
      .eq('meal_plan_id', mealPlanId)
      .order('created_at');

    if (recipesError) throw recipesError;

    return {
      ...mealPlan,
      recipes: recipes || []
    };
  }

  /**
   * Get user's meal plans
   */
  async getUserMealPlans(userId: string, limit = 10) {
    const { data, error } = await this.supabase
      .from('meal_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  /**
   * Update ingredient in recipe
   */
  async updateRecipeIngredient(ingredientId: string, updates: Partial<RecipeIngredient>) {
    const { data, error } = await this.supabase
      .from('recipe_ingredients')
      .update(updates)
      .eq('id', ingredientId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update ingredient status (already-have, specialty-store, etc.)
   */
  async updateIngredientStatus(
    ingredientId: string, 
    status: 'normal' | 'already-have' | 'specialty-store',
    specialtyStore?: string
  ) {
    const updates: Partial<RecipeIngredient> = {
      user_status: status,
      specialty_store: status === 'specialty-store' ? specialtyStore : null
    };

    return this.updateRecipeIngredient(ingredientId, updates);
  }

  /**
   * Substitute ingredient with Kroger product
   */
  async substituteIngredient(ingredientId: string, krogerProduct: any) {
    const updates: Partial<RecipeIngredient> = {
      name: krogerProduct.cleanName,
      is_substituted: true,
      kroger_product_id: krogerProduct.id,
      kroger_product_name: krogerProduct.name,
      kroger_price: krogerProduct.price,
      kroger_unit_price: krogerProduct.price,
      kroger_confidence: krogerProduct.confidence,
      kroger_brand: krogerProduct.brand,
      kroger_size: krogerProduct.size,
      on_sale: krogerProduct.onSale,
      sale_price: krogerProduct.salePrice
    };

    return this.updateRecipeIngredient(ingredientId, updates);
  }

  /**
   * Generate shopping list from meal plan
   */
  async generateShoppingList(mealPlanId: string): Promise<string> {
    // Get meal plan info
    const mealPlan = await this.getMealPlanWithRecipes(mealPlanId);
    
    // Create shopping list
    const { data: shoppingList, error: listError } = await this.supabase
      .from('shopping_lists')
      .insert({
        meal_plan_id: mealPlanId,
        user_id: mealPlan.user_id,
        name: `${mealPlan.name} - Shopping List`,
        total_estimated_cost: 0,
        store_breakdown: {}
      })
      .select()
      .single();

    if (listError) throw listError;

    // Consolidate ingredients by name
    const ingredientMap = new Map();
    
    for (const recipe of mealPlan.recipes || []) {
      for (const ingredient of recipe.recipe_ingredients || []) {
        if (ingredient.user_status === 'already-have') continue;
        
        const key = ingredient.name.toLowerCase();
        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key);
          existing.recipes.push(recipe.title);
          existing.estimated_cost += ingredient.kroger_price || 0;
        } else {
          ingredientMap.set(key, {
            ingredient_name: ingredient.name,
            total_amount: ingredient.amount,
            estimated_cost: ingredient.kroger_price || 0,
            store: ingredient.kroger_store_location || 'Unknown Store',
            category: this.categorizeIngredient(ingredient.name),
            recipes: [recipe.title],
            kroger_product_id: ingredient.kroger_product_id
          });
        }
      }
    }

    // Insert shopping list items
    const items = Array.from(ingredientMap.values());
    if (items.length > 0) {
      const itemsWithListId = items.map(item => ({
        ...item,
        shopping_list_id: shoppingList.id
      }));

      const { error: itemsError } = await this.supabase
        .from('shopping_list_items')
        .insert(itemsWithListId);

      if (itemsError) throw itemsError;

      // Update total cost
      const totalCost = items.reduce((sum, item) => sum + item.estimated_cost, 0);
      await this.supabase
        .from('shopping_lists')
        .update({ total_estimated_cost: totalCost })
        .eq('id', shoppingList.id);
    }

    return shoppingList.id;
  }

  /**
   * Get shopping list with items
   */
  async getShoppingList(shoppingListId: string) {
    const { data: shoppingList, error: listError } = await this.supabase
      .from('shopping_lists')
      .select('*')
      .eq('id', shoppingListId)
      .single();

    if (listError) throw listError;

    const { data: items, error: itemsError } = await this.supabase
      .from('shopping_list_items')
      .select('*')
      .eq('shopping_list_id', shoppingListId)
      .order('category', { ascending: true })
      .order('ingredient_name', { ascending: true });

    if (itemsError) throw itemsError;

    return {
      ...shoppingList,
      items: items || []
    };
  }

  /**
   * Update meal plan status
   */
  async updateMealPlanStatus(mealPlanId: string, status: string) {
    const { data, error } = await this.supabase
      .from('meal_plans')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', mealPlanId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete meal plan
   */
  async deleteMealPlan(mealPlanId: string) {
    const { error } = await this.supabase
      .from('meal_plans')
      .delete()
      .eq('id', mealPlanId);

    if (error) throw error;
  }

  /**
   * Get user's budget analytics
   */
  async getUserBudgetAnalytics(userId: string, daysBack = 30) {
    const { data, error } = await this.supabase
      .from('meal_plans')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    const plans = data || [];
    const totalPlans = plans.length;
    const avgBudget = plans.length > 0 ? plans.reduce((sum, p) => sum + p.budget_limit, 0) / plans.length : 0;
    const avgSpent = plans.length > 0 ? plans.reduce((sum, p) => sum + p.total_cost, 0) / plans.length : 0;
    const totalSavings = plans.reduce((sum, p) => sum + Math.max(0, p.budget_limit - p.total_cost), 0);
    const budgetEfficiency = avgBudget > 0 ? (avgSpent / avgBudget) * 100 : 0;

    return {
      total_meal_plans: totalPlans,
      average_budget: avgBudget,
      average_spent: avgSpent,
      total_savings: totalSavings,
      budget_efficiency: budgetEfficiency,
      favorite_cuisines: [],
      most_substituted_ingredients: []
    };
  }

  /**
   * Log meal plan analytics event
   */
  async logAnalyticsEvent(
    mealPlanId: string,
    userId: string,
    eventType: string,
    eventData: any = {},
    culturalCuisines: string[] = [],
    budgetRange?: string
  ) {
    try {
      const { error } = await this.supabase
        .from('meal_plan_analytics')
        .insert({
          meal_plan_id: mealPlanId,
          user_id: userId,
          event_type: eventType,
          event_data: eventData,
          cultural_cuisines: culturalCuisines,
          budget_range: budgetRange
        });

      if (error) {
        console.error('Analytics logging failed:', error);
        // Don't throw - analytics failures shouldn't break the app
      }
    } catch (error) {
      console.error('Analytics logging failed:', error);
    }
  }

  /**
   * Search recipes across all user's meal plans
   */
  async searchUserRecipes(
    userId: string,
    query: string,
    filters: {
      cuisine?: string;
      maxCost?: number;
      maxTime?: number;
      dietary?: string[];
    } = {}
  ) {
    let queryBuilder = this.supabase
      .from('recipes')
      .select(`
        *,
        meal_plans!inner(user_id)
      `)
      .eq('meal_plans.user_id', userId)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`);

    // Add filters
    if (filters.cuisine) {
      queryBuilder = queryBuilder.eq('cuisine', filters.cuisine);
    }
    if (filters.maxCost) {
      queryBuilder = queryBuilder.lte('cost_per_serving', filters.maxCost);
    }
    if (filters.maxTime) {
      queryBuilder = queryBuilder.lte('total_time', filters.maxTime);
    }

    const { data, error } = await queryBuilder
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data || [];
  }

  /**
   * Helper function to categorize ingredients
   */
  private categorizeIngredient(name: string): string {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('meat') || lowerName.includes('chicken') || lowerName.includes('beef') || lowerName.includes('fish')) {
      return 'meat';
    }
    if (lowerName.includes('vegetable') || lowerName.includes('tomato') || lowerName.includes('onion') || lowerName.includes('pepper')) {
      return 'produce';
    }
    if (lowerName.includes('milk') || lowerName.includes('cheese') || lowerName.includes('yogurt')) {
      return 'dairy';
    }
    if (lowerName.includes('rice') || lowerName.includes('pasta') || lowerName.includes('bread')) {
      return 'grains';
    }
    
    return 'other';
  }
}

export const mealPlanService = new MealPlanService();