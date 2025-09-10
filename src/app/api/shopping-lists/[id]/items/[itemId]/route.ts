import { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { mealPlanService } from '@/lib/meal-plans/meal-plan-service';
import { Database } from '@/types/database';

// PUT /api/shopping-lists/[id]/items/[itemId] - Update shopping list item
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
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
    const { isPurchased, actualCost, notes, totalAmount } = body;

    // Verify ownership through shopping list -> meal plan
    const { data: item, error: fetchError } = await supabase
      .from('shopping_list_items')
      .select(`
        *,
        shopping_lists!inner(
          meal_plans!inner(user_id, cultural_cuisines)
        )
      `)
      .eq('id', params.itemId)
      .eq('shopping_list_id', params.id)
      .single();

    if (fetchError || !item) {
      return new Response(
        JSON.stringify({ success: false, error: 'Shopping list item not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (item.shopping_lists.meal_plans.user_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update item
    const updates: any = {};
    if (isPurchased !== undefined) updates.is_purchased = isPurchased;
    if (actualCost !== undefined) updates.actual_cost = actualCost;
    if (notes !== undefined) updates.notes = notes;
    if (totalAmount !== undefined) updates.total_amount = totalAmount;

    const { data: updatedItem, error: updateError } = await supabase
      .from('shopping_list_items')
      .update(updates)
      .eq('id', params.itemId)
      .select()
      .single();

    if (updateError) throw updateError;

    // If item was marked as purchased, update shopping list totals
    if (isPurchased !== undefined) {
      const { data: allItems } = await supabase
        .from('shopping_list_items')
        .select('is_purchased, estimated_cost, actual_cost')
        .eq('shopping_list_id', params.id);

      if (allItems) {
        const totalActualCost = allItems
          .filter(item => item.is_purchased && item.actual_cost)
          .reduce((sum, item) => sum + (item.actual_cost || 0), 0);

        const totalEstimatedCost = allItems
          .reduce((sum, item) => sum + item.estimated_cost, 0);

        // Update shopping list with actual totals
        await supabase
          .from('shopping_lists')
          .update({
            total_estimated_cost: totalEstimatedCost,
            store_breakdown: { actualCost: totalActualCost }
          })
          .eq('id', params.id);
      }
    }

    // Log analytics event
    const mealPlanId = item.shopping_lists.meal_plans.id;
    await mealPlanService.logAnalyticsEvent(
      mealPlanId,
      user.id,
      'shopping_item_updated',
      {
        itemName: item.ingredient_name,
        isPurchased,
        actualCost,
        estimatedCost: item.estimated_cost,
        costDifference: actualCost ? actualCost - item.estimated_cost : null
      },
      item.shopping_lists.meal_plans.cultural_cuisines
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        item: updatedItem,
        message: 'Shopping list item updated successfully'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating shopping list item:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update shopping list item' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}