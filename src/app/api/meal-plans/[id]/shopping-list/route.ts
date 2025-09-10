import { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { mealPlanService } from '@/lib/meal-plans/meal-plan-service';
import { Database } from '@/types/database';

// POST /api/meal-plans/[id]/shopping-list - Generate shopping list
export async function POST(
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
    // Verify ownership
    const mealPlan = await mealPlanService.getMealPlanWithRecipes(params.id);
    if (mealPlan.user_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Meal plan not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate shopping list using database function
    const shoppingListId = await mealPlanService.generateShoppingList(params.id);
    
    // Get the generated shopping list with items
    const shoppingList = await mealPlanService.getShoppingList(shoppingListId);

    // Log analytics event
    await mealPlanService.logAnalyticsEvent(
      params.id,
      user.id,
      'shopping_list_generated',
      {
        itemCount: shoppingList.items?.length || 0,
        totalCost: shoppingList.total_estimated_cost
      },
      mealPlan.cultural_cuisines
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        shoppingList,
        message: `Shopping list generated with ${shoppingList.items?.length || 0} items`
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating shopping list:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate shopping list' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// GET /api/meal-plans/[id]/shopping-list - Get existing shopping lists
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
    // Verify ownership
    const mealPlan = await mealPlanService.getMealPlanWithRecipes(params.id);
    if (mealPlan.user_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Meal plan not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get shopping lists for this meal plan
    const { data: shoppingLists, error } = await supabase
      .from('shopping_lists')
      .select(`
        *,
        shopping_list_items(*)
      `)
      .eq('meal_plan_id', params.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        success: true, 
        shoppingLists: shoppingLists || []
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching shopping lists:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch shopping lists' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}