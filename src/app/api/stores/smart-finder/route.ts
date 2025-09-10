import { NextRequest, NextResponse } from 'next/server';
import { smartStoreFinderService } from '@/lib/meal-planning/smart-store-finder';
import { ingredientClassifierService } from '@/lib/meal-planning/ingredient-classifier';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      ingredients = [],
      location = 'Milwaukee, WI',
      maxDistance = 10000,
      includeAlternatives = true,
      action = 'find-stores' // 'find-stores', 'classify-ingredient', 'optimize-route'
    } = body;

    console.log('🔍 Smart store finder request:', { ingredients, location, action });

    switch (action) {
      case 'classify-ingredient': {
        if (!ingredients[0]) {
          return NextResponse.json(
            { error: 'Ingredient name required for classification' },
            { status: 400 }
          );
        }

        const classification = ingredientClassifierService.classifyIngredient(ingredients[0]);
        const storeRecommendations = ingredientClassifierService.getStoreRecommendations(ingredients[0], location);
        const alternatives = ingredientClassifierService.getCommonAlternatives(ingredients[0]);

        return NextResponse.json({
          success: true,
          ingredient: ingredients[0],
          classification,
          storeRecommendations,
          alternatives,
          requiresSpecialtyStore: ingredientClassifierService.requiresSpecialtyStore(ingredients[0])
        });
      }

      case 'find-stores': {
        if (ingredients.length === 0) {
          return NextResponse.json(
            { error: 'At least one ingredient required' },
            { status: 400 }
          );
        }

        const storeRecommendations = await smartStoreFinderService.findStoresForIngredients({
          ingredients,
          userLocation: location,
          maxDistance,
          includeAlternatives
        });

        return NextResponse.json({
          success: true,
          location,
          ingredients,
          storeRecommendations,
          summary: {
            totalIngredients: ingredients.length,
            ingredientsWithStores: storeRecommendations.filter(rec => rec.stores.length > 0).length,
            specialtyIngredientsCount: storeRecommendations.filter(rec => 
              rec.classification.availability === 'specialty'
            ).length,
            regularIngredientsCount: storeRecommendations.filter(rec => 
              rec.classification.availability === 'regular'
            ).length
          }
        });
      }

      case 'optimize-route': {
        if (ingredients.length === 0) {
          return NextResponse.json(
            { error: 'At least one ingredient required for route optimization' },
            { status: 400 }
          );
        }

        const optimizedRoute = await smartStoreFinderService.getOptimizedShoppingRoute(
          ingredients,
          location,
          3 // Max 3 stores
        );

        return NextResponse.json({
          success: true,
          location,
          ingredients,
          optimizedRoute,
          summary: {
            recommendedStores: optimizedRoute.recommendedStores.length,
            totalEstimatedCost: optimizedRoute.totalEstimatedCost,
            estimatedSavings: optimizedRoute.estimatedSavings,
            ingredientsCovered: Object.values(optimizedRoute.ingredientMapping).flat().length
          }
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: find-stores, classify-ingredient, or optimize-route' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('❌ Smart store finder error:', error);
    
    return NextResponse.json(
      {
        error: 'Smart store finder failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'Please check your ingredients and location, then try again'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing ingredient classification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ingredient = searchParams.get('ingredient');
  
  if (!ingredient) {
    return NextResponse.json(
      { error: 'ingredient parameter required' },
      { status: 400 }
    );
  }

  try {
    const classification = ingredientClassifierService.classifyIngredient(ingredient);
    const alternatives = ingredientClassifierService.getCommonAlternatives(ingredient);
    const requiresSpecialty = ingredientClassifierService.requiresSpecialtyStore(ingredient);

    return NextResponse.json({
      success: true,
      ingredient,
      classification,
      alternatives,
      requiresSpecialtyStore,
      examples: {
        regularIngredients: ['soy sauce', 'ginger', 'cilantro', 'olive oil', 'habanero'],
        specialtyIngredients: ['dark soy sauce', 'korean radish', 'scotch bonnet', 'berbere spice', 'palm oil', 'sumac', 'masa harina', 'aji amarillo', 'poblano peppers'],
        bothAvailable: ['coconut milk', 'tahini', 'sriracha', 'plantain', 'okra', 'quinoa', 'dulce de leche'],
        caribbeanSpecialty: ['scotch bonnet', 'ackee', 'callaloo', 'breadfruit', 'allspice berries'],
        africanSpecialty: ['berbere spice', 'palm oil', 'cassava', 'egusi seeds', 'injera'],
        mexicanSpecialty: ['masa harina', 'poblano peppers', 'epazote', 'queso oaxaca', 'tomatillos'],
        southAmericanSpecialty: ['aji amarillo', 'aji panca', 'dendê oil', 'masarepa', 'panela'],
        commonAlternatives: {
          'scotch bonnet': 'habanero peppers',
          'korean radish': 'daikon radish',
          'palm oil': 'vegetable oil',
          'cassava': 'potato',
          'masa harina': 'corn flour',
          'poblano peppers': 'bell peppers',
          'aji amarillo': 'yellow bell pepper + cayenne',
          'queso oaxaca': 'mozzarella cheese',
          'epazote': 'no direct substitute',
          'dendê oil': 'palm oil',
          'masarepa': 'regular corn flour'
        }
      }
    });

  } catch (error) {
    console.error('❌ Ingredient classification error:', error);
    
    return NextResponse.json(
      {
        error: 'Classification failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}