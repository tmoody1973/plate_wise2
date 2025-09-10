import { NextRequest, NextResponse } from 'next/server';
import { CleanMealPlannerService } from '@/lib/meal-planning/clean-meal-planner';
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
      mealsTarget, // Alternative name
      culturalCuisines = [],
      cultureTags = [], // Alternative name
      dietaryRestrictions = [],
      dietFlags = [], // Alternative name
      householdSize = 4,
      pantryItems = [],
      pantry = [], // Alternative name
      preferredStores = [],
      location = 'United States',
      maxTime,
      exclude = []
    } = body;

    // Normalize input (support both naming conventions)
    const normalizedRequest = {
      weeklyBudget,
      numberOfMeals: numberOfMeals || mealsTarget,
      culturalCuisines: culturalCuisines.length > 0 ? culturalCuisines : cultureTags,
      dietaryRestrictions: dietaryRestrictions.length > 0 ? dietaryRestrictions : dietFlags,
      householdSize,
      pantryItems: pantryItems.length > 0 ? pantryItems : pantry,
      preferredStores,
      location,
      maxTime,
      exclude
    };

    // Validate required fields
    if (!normalizedRequest.numberOfMeals) {
      return NextResponse.json(
        { error: 'Number of meals is required' },
        { status: 400 }
      );
    }

    console.log('🍽️ Generating meal plan v2 for user:', user.id, {
      numberOfMeals: normalizedRequest.numberOfMeals,
      culturalCuisines: normalizedRequest.culturalCuisines,
      dietaryRestrictions: normalizedRequest.dietaryRestrictions,
      householdSize: normalizedRequest.householdSize
    });

    // Get user preferences from database if not provided
    let finalCulturalCuisines = normalizedRequest.culturalCuisines;
    let finalDietaryRestrictions = normalizedRequest.dietaryRestrictions;
    let finalPantryItems = normalizedRequest.pantryItems;

    // Fetch user profile
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('cultural_cuisines, dietary_restrictions, pantry_items')
      .eq('user_id', user.id)
      .single();

    // Apply user profile preferences if not provided
    if (profileData) {
      finalCulturalCuisines = normalizedRequest.culturalCuisines.length > 0 
        ? normalizedRequest.culturalCuisines 
        : (profileData.cultural_cuisines || ['Mexican', 'Italian']);
      
      finalDietaryRestrictions = normalizedRequest.dietaryRestrictions.length > 0 
        ? normalizedRequest.dietaryRestrictions 
        : (profileData.dietary_restrictions || []);
      
      finalPantryItems = normalizedRequest.pantryItems.length > 0 
        ? normalizedRequest.pantryItems 
        : (profileData.pantry_items || []);
    }

    // Create clean meal planner request
    const cleanRequest = {
      weeklyBudget: normalizedRequest.weeklyBudget,
      numberOfMeals: normalizedRequest.numberOfMeals,
      culturalCuisines: finalCulturalCuisines,
      dietaryRestrictions: finalDietaryRestrictions,
      householdSize: normalizedRequest.householdSize,
      location: normalizedRequest.location,
      pantry: finalPantryItems,
      exclude: normalizedRequest.exclude,
      maxTime: normalizedRequest.maxTime
    };

    console.log('🤖 Starting Stage 1 + Stage 2 meal plan generation...');

    // Generate meal plan using our robust Stage 1 + Stage 2 pipeline
    const cleanMealPlanner = new CleanMealPlannerService();
    const mealPlan = await cleanMealPlanner.generateMealPlan(cleanRequest);

    console.log('✅ Stage 1 + Stage 2 meal plan generated:', {
      success: mealPlan.success,
      recipeCount: mealPlan.recipes.length,
      totalCost: mealPlan.totalCost,
      confidence: mealPlan.confidence
    });

    // Convert to format expected by frontend
    const formattedMealPlan = {
      recipes: mealPlan.recipes.map(recipe => ({
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
      totalEstimatedCost: mealPlan.totalCost,
      costRange: { 
        min: Math.round(mealPlan.totalCost * 0.85), 
        max: Math.round(mealPlan.totalCost * 1.15) 
      },
      budgetUtilization: mealPlan.budgetUtilization || 0,
      confidence: mealPlan.confidence,
      shoppingList: [], // TODO: Generate shopping list from ingredients
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

    // Save meal plan to database
    const { data: savedMealPlan, error: saveError } = await supabase
      .from('meal_plans')
      .insert({
        user_id: user.id,
        title: `AI Meal Plan - ${new Date().toLocaleDateString()}`,
        recipes: formattedMealPlan.recipes,
        total_estimated_cost: formattedMealPlan.totalEstimatedCost,
        cost_range: formattedMealPlan.costRange,
        confidence: formattedMealPlan.confidence,
        shopping_list: formattedMealPlan.shoppingList,
        savings: formattedMealPlan.savings,
        cultural_balance: formattedMealPlan.culturalBalance,
        weekly_budget: normalizedRequest.weeklyBudget,
        number_of_meals: normalizedRequest.numberOfMeals,
        household_size: normalizedRequest.householdSize,
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

    return NextResponse.json({
      success: true,
      mealPlan: {
        ...formattedMealPlan,
        id: savedMealPlan?.id || null
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        userId: user.id,
        processingTime: 'Generated with Perplexity AI + WebScraping.AI',
        pipeline: 'Stage 1 (Perplexity) + Stage 2 (WebScraping.AI)',
        extractionMethods: ['AI Fields', 'JSON-LD Schema.org', 'Generated Fallback']
      }
    });

  } catch (error) {
    console.error('❌ Meal plan generation v2 failed:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to generate meal plan',
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'Please try again with simpler preferences or check your network connection',
        pipeline: 'Stage 1 (Perplexity) + Stage 2 (WebScraping.AI)'
      },
      { status: 500 }
    );
  }
}