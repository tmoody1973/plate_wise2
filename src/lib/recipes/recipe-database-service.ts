/**
 * Recipe Database Service
 * Handles CRUD operations for recipes in the Supabase database
 * Implements cultural authenticity tracking and categorization
 */

import { createClient } from '@/lib/supabase/client';
import type { 
  Recipe, 
  Ingredient, 
  Instruction, 
  NutritionalInfo, 
  CostAnalysis,
  Rating,
  Review,
  CulturalAuthenticity 
} from '@/types';

export interface CreateRecipeInput {
  title: string;
  description?: string;
  culturalOrigin: string[];
  cuisine: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  nutritionalInfo?: NutritionalInfo;
  costAnalysis?: CostAnalysis;
  metadata: {
    servings: number;
    prepTime: number;
    cookTime: number;
    totalTime: number;
    difficulty: 'easy' | 'medium' | 'hard';
    culturalAuthenticity: number;
    imageUrl?: string;
    sourceUrl?: string;
  };
  tags: string[];
  source: 'user' | 'spoonacular' | 'community';
  isPublic?: boolean;
}

export interface UpdateRecipeInput extends Partial<CreateRecipeInput> {
  id: string;
}

export interface RecipeSearchFilters {
  query?: string;
  culturalOrigin?: string[];
  cuisine?: string[];
  tags?: string[];
  difficulty?: ('easy' | 'medium' | 'hard')[];
  maxPrepTime?: number;
  maxCookTime?: number;
  minServings?: number;
  maxServings?: number;
  source?: ('user' | 'spoonacular' | 'community')[];
  authorId?: string;
  isPublic?: boolean;
  minCulturalAuthenticity?: number;
  limit?: number;
  offset?: number;
}

export interface RecipeCollection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  recipeIds: string[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCollectionInput {
  name: string;
  description?: string;
  recipeIds?: string[];
  isPublic?: boolean;
}

/**
 * Recipe Database Service Class
 */
export class RecipeDatabaseService {
  private supabase = createClient();

  /**
   * Create a new recipe
   */
  async createRecipe(input: CreateRecipeInput, authorId: string): Promise<Recipe | null> {
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.warn('Supabase not configured - returning mock recipe for development');
      return this.createMockRecipe(input, authorId);
    }

    try {
      // First ensure the user profile exists
      const profileExists = await this.ensureUserProfileExists(authorId);
      if (!profileExists) {
        console.error('Failed to ensure user profile exists for recipe creation');
        return null;
      }

      const recipeData = {
        title: input.title,
        description: input.description || '',
        cultural_origin: input.culturalOrigin,
        cuisine: input.cuisine,
        ingredients: input.ingredients,
        instructions: input.instructions,
        nutritional_info: input.nutritionalInfo,
        cost_analysis: input.costAnalysis,
        metadata: input.metadata,
        tags: input.tags,
        source: input.source,
        author_id: authorId,
        user_id: authorId, // Also set user_id if the field exists
        is_public: input.isPublic || false,
      };

      const { data, error } = await this.supabase
        .from('recipes')
        .insert(recipeData)
        .select()
        .single();

      if (error) {
        console.error('Error creating recipe:', error);
        console.error('Recipe data attempted:', recipeData);
        console.error('Author ID:', authorId);
        
        // Provide more specific error messages
        if (error.code === '23503') {
          console.error('Foreign key constraint violation - user profile may not exist');
          return null;
        }
        
        return null;
      }

      console.log('✅ Recipe created successfully:', data.id);
      return this.mapDatabaseRecipeToType(data);
    } catch (error) {
      console.error('Failed to create recipe:', error);
      return null;
    }
  }

  /**
   * Get recipe by ID
   */
  async getRecipeById(id: string): Promise<Recipe | null> {
    try {
      const { data, error } = await this.supabase
        .from('recipes')
        .select(`
          *,
          recipe_ratings (
            rating,
            cost_rating,
            authenticity_rating,
            review,
            user_id,
            created_at
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching recipe:', error);
        return null;
      }

      return this.mapDatabaseRecipeToType(data);
    } catch (error) {
      console.error('Failed to get recipe:', error);
      return null;
    }
  }

  /**
   * Get recipe by partial ID (for legacy slug support)
   */
  async getRecipeByPartialId(partialId: string): Promise<Recipe | null> {
    try {
      const { data, error } = await this.supabase
        .from('recipes')
        .select(`
          *,
          recipe_ingredients (
            id,
            name,
            amount,
            unit,
            optional,
            notes
          ),
          recipe_ratings (
            rating,
            cost_rating,
            authenticity_rating,
            review,
            user_id,
            created_at
          )
        `)
        .like('id', `${partialId}%`)
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching recipe by partial ID:', error);
        return null;
      }

      return this.mapDatabaseRecipeToType(data);
    } catch (error) {
      console.error('Failed to get recipe by partial ID:', error);
      return null;
    }
  }

  /**
   * Update recipe
   */
  async updateRecipe(input: UpdateRecipeInput, authorId: string): Promise<Recipe | null> {
    try {
      const updateData: any = {};
      
      if (input.title) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.culturalOrigin) updateData.cultural_origin = input.culturalOrigin;
      if (input.cuisine) updateData.cuisine = input.cuisine;
      if (input.ingredients) updateData.ingredients = input.ingredients;
      if (input.instructions) updateData.instructions = input.instructions;
      if (input.nutritionalInfo) updateData.nutritional_info = input.nutritionalInfo;
      if (input.costAnalysis) updateData.cost_analysis = input.costAnalysis;
      if (input.metadata) updateData.metadata = input.metadata;
      if (input.tags) updateData.tags = input.tags;
      if (input.isPublic !== undefined) updateData.is_public = input.isPublic;

      const { data, error } = await this.supabase
        .from('recipes')
        .update(updateData)
        .eq('id', input.id)
        .or(`author_id.eq.${authorId},user_id.eq.${authorId}`) // Check both fields for user ownership
        .select()
        .single();

      if (error) {
        console.error('Error updating recipe:', error);
        return null;
      }

      return this.mapDatabaseRecipeToType(data);
    } catch (error) {
      console.error('Failed to update recipe:', error);
      return null;
    }
  }

  /**
   * Delete recipe
   */
  async deleteRecipe(id: string, authorId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('recipes')
        .delete()
        .eq('id', id)
        .or(`author_id.eq.${authorId},user_id.eq.${authorId}`); // Check both fields for user ownership

      if (error) {
        console.error('Error deleting recipe:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      return false;
    }
  }

  /**
   * Search recipes with filters
   */
  async searchRecipes(filters: RecipeSearchFilters): Promise<Recipe[]> {
    try {
      let query = this.supabase
        .from('recipes')
        .select(`
          *,
          recipe_ratings (
            rating,
            cost_rating,
            authenticity_rating,
            review,
            user_id,
            created_at
          )
        `);

      // Apply filters
      if (filters.query) {
        query = query.or(`title.ilike.%${filters.query}%,description.ilike.%${filters.query}%`);
      }

      if (filters.culturalOrigin && filters.culturalOrigin.length > 0) {
        query = query.overlaps('cultural_origin', filters.culturalOrigin);
      }

      if (filters.cuisine && filters.cuisine.length > 0) {
        query = query.in('cuisine', filters.cuisine);
      }

      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      if (filters.difficulty && filters.difficulty.length > 0) {
        query = query.in('metadata->difficulty', filters.difficulty);
      }

      if (filters.maxPrepTime) {
        query = query.lte('metadata->prepTime', filters.maxPrepTime);
      }

      if (filters.maxCookTime) {
        query = query.lte('metadata->cookTime', filters.maxCookTime);
      }

      if (filters.minServings) {
        query = query.gte('metadata->servings', filters.minServings);
      }

      if (filters.maxServings) {
        query = query.lte('metadata->servings', filters.maxServings);
      }

      if (filters.source && filters.source.length > 0) {
        query = query.in('source', filters.source);
      }

      if (filters.authorId) {
        // Check both author_id and user_id fields for compatibility
        query = query.or(`author_id.eq.${filters.authorId},user_id.eq.${filters.authorId}`);
      }

      if (filters.isPublic !== undefined) {
        query = query.eq('is_public', filters.isPublic);
      }

      if (filters.minCulturalAuthenticity) {
        query = query.gte('metadata->culturalAuthenticity', filters.minCulturalAuthenticity);
      }

      // Apply pagination
      if (filters.offset) {
        query = query.range(filters.offset, (filters.offset + (filters.limit || 20)) - 1);
      } else if (filters.limit) {
        query = query.limit(filters.limit);
      }

      // Order by creation date (newest first)
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error searching recipes:', error);
        return [];
      }

      return data.map(this.mapDatabaseRecipeToType);
    } catch (error) {
      console.error('Failed to search recipes:', error);
      return [];
    }
  }

  /**
   * Get recipes by cultural origin
   */
  async getRecipesByCulture(culturalOrigin: string, limit: number = 20): Promise<Recipe[]> {
    return this.searchRecipes({
      culturalOrigin: [culturalOrigin],
      isPublic: true,
      limit,
    });
  }

  /**
   * Get user's recipes
   */
  async getUserRecipes(userId: string, includePrivate: boolean = true): Promise<Recipe[]> {
    const filters: RecipeSearchFilters = {
      authorId: userId,
      limit: 100, // Reasonable limit for user's recipes
    };

    if (!includePrivate) {
      filters.isPublic = true;
    }

    return this.searchRecipes(filters);
  }

  /**
   * Get popular recipes (by ratings)
   */
  async getPopularRecipes(limit: number = 20): Promise<Recipe[]> {
    try {
      const { data, error } = await this.supabase
        .from('recipes')
        .select(`
          *,
          recipe_ratings (
            rating,
            cost_rating,
            authenticity_rating,
            review,
            user_id,
            created_at
          )
        `)
        .eq('is_public', true)
        .limit(limit);

      if (error) {
        console.error('Error fetching popular recipes:', error);
        return [];
      }

      // Sort by average rating
      const recipesWithRatings = data
        .map(this.mapDatabaseRecipeToType)
        .map(recipe => ({
          recipe,
          avgRating: recipe.ratings.length > 0 
            ? recipe.ratings.reduce((sum, r) => sum + r.rating, 0) / recipe.ratings.length 
            : 0,
        }))
        .sort((a, b) => b.avgRating - a.avgRating);

      return recipesWithRatings.map(item => item.recipe);
    } catch (error) {
      console.error('Failed to get popular recipes:', error);
      return [];
    }
  }

  /**
   * Add rating to recipe
   */
  async addRecipeRating(
    recipeId: string,
    userId: string,
    rating: number,
    costRating: number,
    authenticityRating: number,
    review?: string
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('recipe_ratings')
        .upsert({
          recipe_id: recipeId,
          user_id: userId,
          rating,
          cost_rating: costRating,
          authenticity_rating: authenticityRating,
          review,
        });

      if (error) {
        console.error('Error adding recipe rating:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to add recipe rating:', error);
      return false;
    }
  }

  /**
   * Create recipe collection
   */
  async createCollection(input: CreateCollectionInput, userId: string): Promise<RecipeCollection | null> {
    try {
      const { data, error } = await this.supabase
        .from('recipe_collections')
        .insert({
          user_id: userId,
          name: input.name,
          description: input.description || '',
          recipe_ids: input.recipeIds || [],
          is_public: input.isPublic || false,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating collection:', error);
        return null;
      }

      return this.mapDatabaseCollectionToType(data);
    } catch (error) {
      console.error('Failed to create collection:', error);
      return null;
    }
  }

  /**
   * Add recipe to collection
   */
  async addRecipeToCollection(collectionId: string, recipeId: string, userId: string): Promise<boolean> {
    try {
      // First get the current collection
      const { data: collection, error: fetchError } = await this.supabase
        .from('recipe_collections')
        .select('recipe_ids')
        .eq('id', collectionId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !collection) {
        console.error('Error fetching collection:', fetchError);
        return false;
      }

      // Add recipe ID if not already present
      const currentRecipeIds = collection.recipe_ids || [];
      if (!currentRecipeIds.includes(recipeId)) {
        const updatedRecipeIds = [...currentRecipeIds, recipeId];

        const { error } = await this.supabase
          .from('recipe_collections')
          .update({ recipe_ids: updatedRecipeIds })
          .eq('id', collectionId)
          .eq('user_id', userId);

        if (error) {
          console.error('Error adding recipe to collection:', error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to add recipe to collection:', error);
      return false;
    }
  }

  /**
   * Remove recipe from collection
   */
  async removeRecipeFromCollection(collectionId: string, recipeId: string, userId: string): Promise<boolean> {
    try {
      // First get the current collection
      const { data: collection, error: fetchError } = await this.supabase
        .from('recipe_collections')
        .select('recipe_ids')
        .eq('id', collectionId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !collection) {
        console.error('Error fetching collection:', fetchError);
        return false;
      }

      // Remove recipe ID
      const currentRecipeIds = collection.recipe_ids || [];
      const updatedRecipeIds = currentRecipeIds.filter((id: string) => id !== recipeId);

      const { error } = await this.supabase
        .from('recipe_collections')
        .update({ recipe_ids: updatedRecipeIds })
        .eq('id', collectionId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error removing recipe from collection:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to remove recipe from collection:', error);
      return false;
    }
  }

  /**
   * Get user's collections
   */
  async getUserCollections(userId: string): Promise<RecipeCollection[]> {
    try {
      const { data, error } = await this.supabase
        .from('recipe_collections')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user collections:', error);
        return [];
      }

      return data.map(this.mapDatabaseCollectionToType);
    } catch (error) {
      console.error('Failed to get user collections:', error);
      return [];
    }
  }

  /**
   * Get recipes in collection
   */
  async getCollectionRecipes(collectionId: string, userId?: string): Promise<Recipe[]> {
    try {
      // First get the collection
      let query = this.supabase
        .from('recipe_collections')
        .select('recipe_ids, is_public, user_id')
        .eq('id', collectionId);

      if (userId) {
        query = query.or(`user_id.eq.${userId},is_public.eq.true`);
      } else {
        query = query.eq('is_public', true);
      }

      const { data: collection, error: collectionError } = await query.single();

      if (collectionError || !collection) {
        console.error('Error fetching collection:', collectionError);
        return [];
      }

      if (!collection.recipe_ids || collection.recipe_ids.length === 0) {
        return [];
      }

      // Get the recipes
      const { data: recipes, error: recipesError } = await this.supabase
        .from('recipes')
        .select(`
          *,
          recipe_ratings (
            rating,
            cost_rating,
            authenticity_rating,
            review,
            user_id,
            created_at
          )
        `)
        .in('id', collection.recipe_ids);

      if (recipesError) {
        console.error('Error fetching collection recipes:', recipesError);
        return [];
      }

      return recipes.map(this.mapDatabaseRecipeToType);
    } catch (error) {
      console.error('Failed to get collection recipes:', error);
      return [];
    }
  }

  /**
   * Get recipe categories (tags) with counts
   */
  async getRecipeCategories(): Promise<{ tag: string; count: number }[]> {
    try {
      const { data, error } = await this.supabase
        .from('recipes')
        .select('tags')
        .eq('is_public', true);

      if (error) {
        console.error('Error fetching recipe categories:', error);
        return [];
      }

      // Count tag occurrences
      const tagCounts: Record<string, number> = {};
      data.forEach(recipe => {
        if (recipe.tags) {
          recipe.tags.forEach((tag: string) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        }
      });

      // Convert to array and sort by count
      return Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('Failed to get recipe categories:', error);
      return [];
    }
  }

  /**
   * Ensure user profile exists before creating a recipe
   * This fixes the foreign key constraint issue
   */
  private async ensureUserProfileExists(userId: string): Promise<boolean> {
    try {
      // Check if profile already exists
      const { data: existingProfile, error: checkError } = await this.supabase
        .from('user_profiles')
        .select('id')
        .eq('id', userId)
        .single();

      if (existingProfile) {
        console.log('User profile already exists');
        return true;
      }

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking user profile:', checkError);
        return false;
      }

      // Profile doesn't exist, create a minimal one
      console.log('Creating minimal user profile for recipe saving...');
      
      // Get user email from auth
      const { data: { user }, error: userError } = await this.supabase.auth.getUser();
      if (userError || !user) {
        console.error('User not authenticated:', userError);
        return false;
      }

      // Create minimal profile
      const minimalProfile = {
        id: userId,
        email: user.email || '',
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        location: {},
        preferences: {},
        budget_settings: {
          monthlyLimit: 500,
          householdSize: 2,
          shoppingFrequency: 'weekly'
        },
        nutritional_goals: {
          calorieTarget: 2000,
          macroTargets: {
            protein: 150,
            carbs: 250,
            fat: 65
          },
          healthGoals: [],
          activityLevel: 'moderate'
        },
        cooking_profile: {
          skillLevel: 'intermediate',
          availableTime: 60,
          equipment: [],
          mealPrepPreference: 'daily',
          cookingFrequency: 'daily'
        }
      };

      const { error: createError } = await this.supabase
        .from('user_profiles')
        .insert(minimalProfile);

      if (createError) {
        console.error('Error creating minimal user profile:', createError);
        return false;
      }

      console.log('✅ Minimal user profile created successfully');
      return true;

    } catch (error) {
      console.error('Error ensuring user profile exists:', error);
      return false;
    }
  }

  /**
   * Map database recipe to Recipe type
   */
  private mapDatabaseRecipeToType(data: any): Recipe {
    const ratings: Rating[] = (data.recipe_ratings || []).map((rating: any) => ({
      userId: rating.user_id,
      rating: rating.rating,
      costRating: rating.cost_rating,
      authenticityRating: rating.authenticity_rating,
      createdAt: new Date(rating.created_at),
    }));

    const reviews: Review[] = (data.recipe_ratings || [])
      .filter((rating: any) => rating.review)
      .map((rating: any) => ({
        userId: rating.user_id,
        userName: 'User', // Would need to join with user_profiles to get actual name
        review: rating.review,
        rating: rating.rating,
        createdAt: new Date(rating.created_at),
      }));

    return {
      id: data.id,
      title: data.title,
      description: data.description || '',
      culturalOrigin: data.cultural_origin || [],
      cuisine: data.cuisine,
      ingredients: data.ingredients || [],
      instructions: data.instructions || [],
      nutritionalInfo: data.nutritional_info,
      costAnalysis: data.cost_analysis,
      metadata: data.metadata || {
        servings: 1,
        prepTime: 0,
        cookTime: 0,
        totalTime: 0,
        difficulty: 'medium',
        culturalAuthenticity: 0,
      },
      tags: data.tags || [],
      source: data.source,
      authorId: data.author_id,
      ratings,
      reviews,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * Map database collection to RecipeCollection type
   */
  private mapDatabaseCollectionToType(data: any): RecipeCollection {
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      description: data.description,
      recipeIds: data.recipe_ids || [],
      isPublic: data.is_public,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * Create a mock recipe for development when Supabase is not configured
   */
  private createMockRecipe(input: CreateRecipeInput, authorId: string): Recipe {
    const mockId = `mock-${Date.now()}`;
    return {
      id: mockId,
      title: input.title,
      description: input.description || '',
      culturalOrigin: input.culturalOrigin,
      cuisine: input.cuisine,
      ingredients: input.ingredients,
      instructions: input.instructions,
      nutritionalInfo: input.nutritionalInfo || {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
        vitamins: {},
        minerals: {},
      },
      costAnalysis: input.costAnalysis || {
        totalCost: 0,
        costPerServing: 0,
        storeComparison: [],
        seasonalTrends: [],
        bulkBuyingOpportunities: [],
        couponSavings: [],
        alternativeIngredients: [],
      },
      metadata: input.metadata,
      tags: input.tags,
      source: input.source,
      authorId,
      ratings: [],
      reviews: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

/**
 * Singleton instance of RecipeDatabaseService
 */
export const recipeDatabaseService = new RecipeDatabaseService();
