import { NextRequest, NextResponse } from 'next/server';
import { perplexityMealPlannerService } from '@/lib/meal-planning/perplexity-meal-planner';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      weeklyBudget,
      numberOfMeals,
      culturalCuisines = [],
      dietaryRestrictions = [],
      householdSize = 4,
      pantryItems = [],
      preferredStores = [],
      location = 'United States'
    } = body;

    // Validate required fields
    if (!numberOfMeals) {
      return NextResponse.json(
        { error: 'Number of meals is required' },
        { status: 400 }
      );
    }

    console.log('🍽️ Generating meal plan for user:', user.id, {
      weeklyBudget,
      numberOfMeals,
      culturalCuisines,
      householdSize
    });

    // Get user preferences and favorite stores from database
    let finalCulturalCuisines = culturalCuisines;
    let finalDietaryRestrictions = dietaryRestrictions;
    let finalPantryItems = pantryItems;
    let finalPreferredStores = preferredStores;

    // Fetch user profile and favorite stores in parallel
    const [profileResult, storesResult] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('cultural_cuisines, dietary_restrictions, pantry_items')
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('saved_stores')
        .select('store_name, store_type, address, store_url, specialties, is_favorite, google_place_id')
        .eq('user_id', user.id)
        .eq('is_favorite', true)
        .order('created_at', { ascending: false })
    ]);

    // Apply user profile preferences if not provided
    if (profileResult.data) {
      const profile = profileResult.data;
      finalCulturalCuisines = culturalCuisines.length > 0 ? culturalCuisines : (profile.cultural_cuisines || ['International']);
      finalDietaryRestrictions = dietaryRestrictions.length > 0 ? dietaryRestrictions : (profile.dietary_restrictions || []);
      finalPantryItems = pantryItems.length > 0 ? pantryItems : (profile.pantry_items || []);
    }

    // Use favorite stores if no preferred stores provided
    if (preferredStores.length === 0 && storesResult.data) {
      finalPreferredStores = storesResult.data.map(store => ({
        name: store.store_name,
        type: store.store_type,
        address: store.address,
        url: store.store_url,
        specialties: store.specialties || [],
        placeId: store.google_place_id
      }));
    }

    console.log('🏪 Using favorite stores for meal planning:', finalPreferredStores.length, 'stores');

    // Generate meal plan using our robust Stage 1 + Stage 2 pipeline
    console.log('🤖 Using Stage 1 + Stage 2 pipeline for meal generation...');
    
    const { CleanMealPlannerService } = await import('@/lib/meal-planning/clean-meal-planner');
    const cleanMealPlanner = new CleanMealPlannerService();
    
    const cleanMealPlan = await cleanMealPlanner.generateMealPlan({
      weeklyBudget: weeklyBudget || 100, // Default budget if not provided
      numberOfMeals,
      culturalCuisines: finalCulturalCuisines,
      dietaryRestrictions: finalDietaryRestrictions,
      householdSize,
      pantry: finalPantryItems,
      location,
      exclude: [] // Could be added to request body if needed
    });

    // Convert to expected format
    const mealPlan = {
      recipes: cleanMealPlan.recipes.map(recipe => ({
        id: recipe.id,
        title: recipe.title,
        description: recipe.description || 'Delicious and culturally authentic recipe',
        cuisine: recipe.cuisine,
        culturalOrigin: [recipe.cuisine],
        ingredients: recipe.ingredients.map(ing => ({
          name: ing.name,
          amount: ing.amount || 1,
          unit: ing.unit || 'piece',
          estimatedCost: ing.estimatedCost || 0,
          notes: ing.notes
        })),
        instructions: recipe.instructions.map(inst => ({
          step: inst.step,
          text: inst.text,
          timing: inst.timing ? { duration: 0, isActive: false } : undefined
        })),
        metadata: {
          servings: recipe.servings,
          totalTimeMinutes: recipe.totalTimeMinutes,
          difficulty: recipe.totalTimeMinutes > 60 ? 'hard' : recipe.totalTimeMinutes > 30 ? 'medium' : 'easy',
          estimatedCost: recipe.estimatedCost || 0,
          costPerServing: recipe.costPerServing || 0
        },
        tags: [recipe.cuisine],
        culturalAuthenticity: 'high' as const,
        budgetOptimized: true,
        sourceUrl: recipe.sourceUrl,
        imageUrl: recipe.imageUrl
      })),
      totalEstimatedCost: cleanMealPlan.totalCost,
      costRange: { 
        min: Math.round(cleanMealPlan.totalCost * 0.85), 
        max: Math.round(cleanMealPlan.totalCost * 1.15) 
      },
      budgetUtilization: cleanMealPlan.budgetUtilization || 0,
      confidence: cleanMealPlan.confidence,
      shoppingList: [], // TODO: Generate from ingredients
      savings: {
        pantryItemsSavings: 0,
        bulkBuyingSavings: 0,
        seasonalSavings: 0,
        totalSavings: 0
      },
      culturalBalance: finalCulturalCuisines.reduce((acc, cuisine) => {
        acc[cuisine] = Math.round(100 / finalCulturalCuisines.length);
        return acc;
      }, {} as Record<string, number>)
    };

    // Save meal plan to database (excluding budget_utilization for now)
    const { data: savedMealPlan, error: saveError } = await supabase
      .from('meal_plans')
      .insert({
        user_id: user.id,
        title: `Meal Plan - ${new Date().toLocaleDateString()}`,
        recipes: mealPlan.recipes,
        total_estimated_cost: mealPlan.totalEstimatedCost,
        cost_range: mealPlan.costRange,
        confidence: mealPlan.confidence,
        shopping_list: mealPlan.shoppingList,
        savings: mealPlan.savings,
        cultural_balance: mealPlan.culturalBalance,
        weekly_budget: weeklyBudget,
        number_of_meals: numberOfMeals,
        household_size: householdSize,
        cultural_cuisines: finalCulturalCuisines,
        dietary_restrictions: finalDietaryRestrictions,
        pantry_items: finalPantryItems,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) {
      console.error('❌ Failed to save meal plan:', saveError);
      // Continue anyway - return the generated plan even if save fails
    }

    console.log('✅ Meal plan generated successfully:', {
      recipeCount: mealPlan.recipes.length,
      totalCost: mealPlan.totalEstimatedCost,
      budgetUtilization: mealPlan.budgetUtilization,
      confidence: mealPlan.confidence
    });

    return NextResponse.json({
      success: true,
      mealPlan: {
        ...mealPlan,
        id: savedMealPlan?.id || null
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        userId: user.id,
        processingTime: 'Generated with Perplexity AI'
      }
    });

  } catch (error) {
    console.error('❌ Meal plan generation failed:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to generate meal plan',
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'Please try again with simpler preferences or check your budget constraints'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's recent meal plans
    const { data: mealPlans, error } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      mealPlans: mealPlans || []
    });

  } catch (error) {
    console.error('❌ Failed to fetch meal plans:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch meal plans',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}