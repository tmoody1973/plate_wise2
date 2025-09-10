import { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { mealPlanService } from '@/lib/meal-plans/meal-plan-service';
import { Database } from '@/types/database';

// GET /api/user/analytics - Get user analytics and statistics
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
    const daysBack = parseInt(searchParams.get('days') || '30');

    // Get budget analytics
    const budgetAnalytics = await mealPlanService.getUserBudgetAnalytics(user.id, daysBack);

    // Get meal plan summary
    const mealPlans = await mealPlanService.getUserMealPlans(user.id, 50);

    // Get user stats from view
    const { data: userStats, error: statsError } = await supabase
      .from('user_meal_plan_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (statsError && statsError.code !== 'PGRST116') {
      console.error('Error fetching user stats:', statsError);
    }

    // Calculate additional metrics
    const totalMealPlans = mealPlans.length;
    const completedPlans = mealPlans.filter(plan => plan.status === 'completed').length;
    const activePlans = mealPlans.filter(plan => plan.status === 'active').length;
    const plansWithPricing = mealPlans.filter(plan => plan.budget_utilization > 0).length;

    // Calculate average metrics
    const avgBudget = mealPlans.length > 0 
      ? mealPlans.reduce((sum, plan) => sum + plan.budget_limit, 0) / mealPlans.length 
      : 0;
    
    const avgSpent = plansWithPricing > 0
      ? mealPlans
          .filter(plan => plan.total_cost > 0)
          .reduce((sum, plan) => sum + plan.total_cost, 0) / plansWithPricing
      : 0;

    const avgBudgetUtilization = plansWithPricing > 0
      ? mealPlans
          .filter(plan => plan.budget_utilization > 0)
          .reduce((sum, plan) => sum + plan.budget_utilization, 0) / plansWithPricing
      : 0;

    // Get cuisine preferences from meal plans
    const cuisineCount: Record<string, number> = {};
    mealPlans.forEach(plan => {
      plan.cultural_cuisines.forEach(cuisine => {
        cuisineCount[cuisine] = (cuisineCount[cuisine] || 0) + 1;
      });
    });

    const favoriteCuisines = Object.entries(cuisineCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([cuisine, count]) => ({ cuisine, count }));

    // Get recent activity
    const recentActivity = mealPlans
      .slice(0, 5)
      .map(plan => ({
        id: plan.id,
        name: plan.name,
        status: plan.status,
        created_at: plan.created_at,
        updated_at: plan.updated_at,
        recipe_count: plan.recipe_count,
        total_cost: plan.total_cost
      }));

    const analytics = {
      overview: {
        totalMealPlans,
        completedPlans,
        activePlans,
        plansWithPricing,
        avgBudget,
        avgSpent,
        avgBudgetUtilization,
        totalSavings: budgetAnalytics?.total_savings || 0,
        budgetEfficiency: budgetAnalytics?.budget_efficiency || 0
      },
      cuisines: {
        favorites: favoriteCuisines,
        totalTried: Object.keys(cuisineCount).length
      },
      budgetTrends: {
        averageBudget: avgBudget,
        averageSpent: avgSpent,
        utilizationRate: avgBudgetUtilization,
        savingsOpportunities: budgetAnalytics?.most_substituted_ingredients || []
      },
      recentActivity,
      userStats: userStats || null,
      budgetAnalytics: budgetAnalytics || null
    };

    return new Response(
      JSON.stringify({ 
        success: true, 
        analytics,
        generatedAt: new Date().toISOString()
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch analytics' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}