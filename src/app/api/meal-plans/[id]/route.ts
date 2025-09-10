import { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { mealPlanService } from '@/lib/meal-plans/meal-plan-service';
import { Database } from '@/types/database';

// GET /api/meal-plans/[id] - Get meal plan with recipes
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const mealPlan = await mealPlanService.getMealPlanWithRecipes(params.id);
    
    // Verify ownership
    if (mealPlan.user_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Meal plan not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, mealPlan }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching meal plan:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch meal plan' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// PUT /api/meal-plans/[id] - Update meal plan
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { name, description, status, budgetLimit, householdSize } = body;

    // First verify ownership
    const existingMealPlan = await mealPlanService.getMealPlanWithRecipes(params.id);
    if (existingMealPlan.user_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Meal plan not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update meal plan
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (budgetLimit !== undefined) updates.budget_limit = budgetLimit;
    if (householdSize !== undefined) updates.household_size = householdSize;

    const { data, error } = await supabase
      .from('meal_plans')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    // Log analytics event
    await mealPlanService.logAnalyticsEvent(
      params.id,
      user.id,
      'meal_plan_updated',
      { updates },
      existingMealPlan.cultural_cuisines
    );

    return new Response(
      JSON.stringify({ success: true, mealPlan: data }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating meal plan:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update meal plan' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// DELETE /api/meal-plans/[id] - Delete meal plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    // First verify ownership
    const existingMealPlan = await mealPlanService.getMealPlanWithRecipes(params.id);
    if (existingMealPlan.user_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Meal plan not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Log analytics event before deletion
    await mealPlanService.logAnalyticsEvent(
      params.id,
      user.id,
      'meal_plan_deleted',
      { recipeCount: existingMealPlan.recipes?.length || 0 },
      existingMealPlan.cultural_cuisines
    );

    // Delete meal plan (cascades to recipes and ingredients)
    await mealPlanService.deleteMealPlan(params.id);

    return new Response(
      JSON.stringify({ success: true, message: 'Meal plan deleted successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error deleting meal plan:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete meal plan' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}