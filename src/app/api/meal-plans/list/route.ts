import { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { mealPlanService } from '@/lib/meal-plans/meal-plan-service';
import { Database } from '@/types/database';

// GET /api/meal-plans/list - Get user's meal plans
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
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const cuisine = searchParams.get('cuisine');

    // Get meal plans using the service
    const mealPlans = await mealPlanService.getUserMealPlans(user.id, limit);

    // Apply additional filters if needed
    let filteredPlans = mealPlans;
    
    if (status) {
      filteredPlans = filteredPlans.filter(plan => plan.status === status);
    }
    
    if (cuisine) {
      filteredPlans = filteredPlans.filter(plan => 
        plan.cultural_cuisines.includes(cuisine)
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        mealPlans: filteredPlans,
        count: filteredPlans.length
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching meal plans:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch meal plans' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}