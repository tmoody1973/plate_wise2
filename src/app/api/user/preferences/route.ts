import { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { mealPlanService } from '@/lib/meal-plans/meal-plan-service';
import { Database } from '@/types/database';

// GET /api/user/preferences - Get user preferences
export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ success: false, error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const preferences = await mealPlanService.getUserPreferences(user.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        preferences
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch preferences' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// PUT /api/user/preferences - Update user preferences
export async function PUT(request: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  
  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ success: false, error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json();
    const {
      preferredCuisines,
      dietaryRestrictions,
      defaultBudget,
      householdSize,
      zipCode,
      preferredStores,
      culturalBackground,
      allergies
    } = body;

    const updates: any = {};
    if (preferredCuisines !== undefined) updates.preferred_cuisines = preferredCuisines;
    if (dietaryRestrictions !== undefined) updates.dietary_restrictions = dietaryRestrictions;
    if (defaultBudget !== undefined) updates.default_budget = defaultBudget;
    if (householdSize !== undefined) updates.household_size = householdSize;
    if (zipCode !== undefined) updates.zip_code = zipCode;
    if (preferredStores !== undefined) updates.preferred_stores = preferredStores;
    if (culturalBackground !== undefined) updates.cultural_background = culturalBackground;
    if (allergies !== undefined) updates.allergies = allergies;

    const preferences = await mealPlanService.updateUserPreferences(user.id, updates);

    // Log analytics event
    await mealPlanService.logAnalyticsEvent(
      'user_preferences', // Use a special ID for user-level events
      user.id,
      'preferences_updated',
      { updatedFields: Object.keys(updates) },
      preferredCuisines || []
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        preferences,
        message: 'Preferences updated successfully'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update preferences' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}