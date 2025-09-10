import { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { mealPlanService } from '@/lib/meal-plans/meal-plan-service';
import { Database } from '@/types/database';

// GET /api/shopping-lists/[id] - Get shopping list with items
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
    // Verify ownership through meal plan
    const { data: shoppingList, error: fetchError } = await supabase
      .from('shopping_lists')
      .select(`
        *,
        meal_plans!inner(user_id)
      `)
      .eq('id', params.id)
      .single();

    if (fetchError || !shoppingList) {
      return new Response(
        JSON.stringify({ success: false, error: 'Shopping list not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (shoppingList.meal_plans.user_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get full shopping list with items
    const fullShoppingList = await mealPlanService.getShoppingList(params.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        shoppingList: fullShoppingList
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching shopping list:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch shopping list' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// PUT /api/shopping-lists/[id] - Update shopping list
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
    const { name, status, notes } = body;

    // Verify ownership
    const { data: shoppingList, error: fetchError } = await supabase
      .from('shopping_lists')
      .select(`
        *,
        meal_plans!inner(user_id, cultural_cuisines)
      `)
      .eq('id', params.id)
      .single();

    if (fetchError || !shoppingList) {
      return new Response(
        JSON.stringify({ success: false, error: 'Shopping list not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (shoppingList.meal_plans.user_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update shopping list
    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    const { data: updatedList, error: updateError } = await supabase
      .from('shopping_lists')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log analytics event
    await mealPlanService.logAnalyticsEvent(
      shoppingList.meal_plan_id,
      user.id,
      'shopping_list_updated',
      { updates },
      shoppingList.meal_plans.cultural_cuisines
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        shoppingList: updatedList,
        message: 'Shopping list updated successfully'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating shopping list:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update shopping list' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}