import { NextRequest, NextResponse } from 'next/server';
import { CleanMealPlannerService } from '@/lib/meal-planning/clean-meal-planner';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing Stage 1 + Stage 2 pipeline without authentication...');

    const body = await request.json();
    const {
      numberOfMeals = 2, // Default to 2 for faster testing
      culturalCuisines = ['Mexican'],
      dietaryRestrictions = [],
      householdSize = 4,
      maxTime = 45,
      pantry = [],
      exclude = []
    } = body;

    console.log('🔍 Test parameters:', {
      numberOfMeals,
      culturalCuisines,
      dietaryRestrictions,
      householdSize
    });

    // Create clean meal planner request
    const cleanRequest = {
      numberOfMeals,
      culturalCuisines,
      dietaryRestrictions,
      householdSize,
      maxTime,
      pantry,
      exclude,
      weeklyBudget: 50 // Optional for testing
    };

    // Generate meal plan using our robust Stage 1 + Stage 2 pipeline
    const cleanMealPlanner = new CleanMealPlannerService();
    const mealPlan = await cleanMealPlanner.generateMealPlan(cleanRequest);

    console.log('✅ Test pipeline completed:', {
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
      shoppingList: [], // TODO: Generate from ingredients
      savings: {
        pantryItemsSavings: 0,
        bulkBuyingSavings: 0,
        seasonalSavings: 0,
        totalSavings: 0
      },
      culturalBalance: culturalCuisines.reduce((acc: Record<string, number>, cuisine: string) => {
        acc[cuisine] = Math.round(100 / culturalCuisines.length);
        return acc;
      }, {})
    };

    return NextResponse.json({
      success: true,
      mealPlan: formattedMealPlan,
      metadata: {
        generatedAt: new Date().toISOString(),
        processingTime: 'Generated with Stage 1 + Stage 2 pipeline',
        pipeline: 'Perplexity AI + WebScraping.AI',
        testMode: true,
        extractionMethods: ['AI Fields', 'JSON-LD Schema.org', 'Generated Fallback']
      }
    });

  } catch (error) {
    console.error('❌ Test pipeline failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Pipeline test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        suggestion: 'Check API keys and network connectivity'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Stage 1 + Stage 2 Pipeline Test Endpoint',
    usage: 'POST with optional parameters: numberOfMeals, culturalCuisines, dietaryRestrictions, etc.',
    pipeline: 'Perplexity AI (Stage 1) → WebScraping.AI (Stage 2) → Real Recipes'
  });
}