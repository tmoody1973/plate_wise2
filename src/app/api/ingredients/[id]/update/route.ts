import { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { mealPlanService } from '@/lib/meal-plans/meal-plan-service';
import { Database } from '@/types/database';

// PUT /api/ingredients/[id]/update - Update ingredient status or substitution
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
    const { 
      userStatus, 
      specialtyStore, 
      krogerSubstitution,
      amount,
      unit,
      notes
    } = body;

    // First verify the ingredient belongs to user's meal plan
    const { data: ingredient, error: fetchError } = await supabase
      .from('recipe_ingredients')
      .select(`
        *,
        recipes!inner(
          meal_plans!inner(user_id)
        )
      `)
      .eq('id', params.id)
      .single();

    if (fetchError || !ingredient) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ingredient not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check ownership
    if (ingredient.recipes.meal_plans.user_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Prepare updates
    const updates: any = {};
    
    if (userStatus !== undefined) {
      updates.user_status = userStatus;
      if (userStatus === 'specialty-store' && specialtyStore) {
        updates.specialty_store = specialtyStore;
      } else if (userStatus !== 'specialty-store') {
        updates.specialty_store = null;
      }
    }

    if (krogerSubstitution) {
      updates.name = krogerSubstitution.cleanName || krogerSubstitution.name;
      updates.is_substituted = true;
      updates.kroger_product_id = krogerSubstitution.productId;
      updates.kroger_product_name = krogerSubstitution.description;
      updates.kroger_price = krogerSubstitution.price;
      updates.kroger_unit_price = krogerSubstitution.unitPrice || krogerSubstitution.price;
      updates.kroger_confidence = krogerSubstitution.confidence || 'medium';
      updates.kroger_brand = krogerSubstitution.brand;
      updates.kroger_size = krogerSubstitution.size;
      updates.on_sale = krogerSubstitution.onSale || false;
      updates.sale_price = krogerSubstitution.salePrice;
    }

    if (amount !== undefined) updates.amount = amount;
    if (unit !== undefined) updates.unit = unit;

    // Update ingredient
    const updatedIngredient = await mealPlanService.updateRecipeIngredient(
      params.id, 
      updates
    );

    // Log analytics event
    const { data: mealPlan } = await supabase
      .from('recipes')
      .select('meal_plan_id, meal_plans!inner(user_id, cultural_cuisines)')
      .eq('id', ingredient.recipe_id)
      .single();

    if (mealPlan) {
      await mealPlanService.logAnalyticsEvent(
        mealPlan.meal_plan_id,
        user.id,
        'ingredient_updated',
        {
          ingredientName: ingredient.name,
          updateType: userStatus ? 'status_change' : krogerSubstitution ? 'substitution' : 'modification',
          newStatus: userStatus,
          wasSubstituted: krogerSubstitution ? true : undefined
        },
        mealPlan.meal_plans.cultural_cuisines
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        ingredient: updatedIngredient,
        message: 'Ingredient updated successfully'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating ingredient:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update ingredient' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}