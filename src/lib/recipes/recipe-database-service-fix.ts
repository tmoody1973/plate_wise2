/**
 * Fix for Recipe Database Service
 * Ensures user profile exists before creating recipes
 */

import { createClient } from '@/lib/supabase/client';
import { profileService } from '@/lib/profile/profile-service';

/**
 * Ensure user profile exists before creating a recipe
 * This fixes the foreign key constraint issue
 */
export async function ensureUserProfileExists(userId: string): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await supabase
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
    const { data: { user }, error: userError } = await supabase.auth.getUser();
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

    const { error: createError } = await supabase
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
 * Enhanced create recipe function that ensures user profile exists
 */
export async function createRecipeWithProfileCheck(
  recipeData: any,
  authorId: string,
  originalCreateFunction: (data: any, authorId: string) => Promise<any>
): Promise<any> {
  try {
    // First ensure the user profile exists
    const profileExists = await ensureUserProfileExists(authorId);
    
    if (!profileExists) {
      console.error('Failed to ensure user profile exists');
      return null;
    }

    // Now proceed with the original recipe creation
    return await originalCreateFunction(recipeData, authorId);
    
  } catch (error) {
    console.error('Error in createRecipeWithProfileCheck:', error);
    return null;
  }
}
