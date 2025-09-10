import { NextRequest, NextResponse } from 'next/server';
import { enhancedRecipeSearchService } from '@/lib/meal-planning/enhanced-recipe-search';
import { recipeValidationService } from '@/lib/meal-planning/recipe-validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request parameters
    if (!body.query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Enhanced recipe search request:', body);

    // Perform enhanced recipe search
    const searchResult = await enhancedRecipeSearchService.searchRecipes({
      query: body.query,
      culturalCuisine: body.culturalCuisine,
      country: body.country,
      includeIngredients: body.includeIngredients,
      excludeIngredients: body.excludeIngredients,
      dietaryRestrictions: body.dietaryRestrictions,
      difficulty: body.difficulty,
      maxTimeMinutes: body.maxTimeMinutes,
      maxResults: body.maxResults || 5
    });

    // Validate each recipe and add quality metrics
    const recipesWithValidation = searchResult.recipes.map(recipe => {
      const validation = recipeValidationService.validateRecipe(recipe);
      const qualityMetrics = recipeValidationService.getQualityMetrics(recipe);
      
      return {
        recipe,
        validation: {
          isValid: validation.isValid,
          score: validation.score,
          errorCount: validation.errors.length,
          warningCount: validation.warnings.length,
          errors: validation.errors,
          warnings: validation.warnings
        },
        qualityMetrics
      };
    });

    // Calculate summary statistics
    const summary = {
      totalRecipes: searchResult.recipes.length,
      validRecipes: recipesWithValidation.filter(r => r.validation.isValid).length,
      averageQualityScore: recipesWithValidation.reduce((sum, r) => sum + r.validation.score, 0) / recipesWithValidation.length,
      totalErrors: recipesWithValidation.reduce((sum, r) => sum + r.validation.errorCount, 0),
      totalWarnings: recipesWithValidation.reduce((sum, r) => sum + r.validation.warningCount, 0)
    };

    console.log('✅ Enhanced recipe search completed:', summary);

    return NextResponse.json({
      success: true,
      summary,
      results: recipesWithValidation,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Enhanced recipe search failed:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Enhanced Recipe Search API',
    description: 'Production-ready recipe search with comprehensive data extraction and validation',
    endpoints: {
      'POST /api/recipes/enhanced-search': {
        description: 'Search for recipes with enhanced data extraction',
        parameters: {
          query: 'string (required) - Search query for recipes',
          culturalCuisine: 'string (optional) - Specific cuisine type',
          country: 'string (optional) - Country for regional preferences',
          includeIngredients: 'string[] (optional) - Must include these ingredients',
          excludeIngredients: 'string[] (optional) - Must exclude these ingredients',
          dietaryRestrictions: 'string[] (optional) - Dietary restrictions to follow',
          difficulty: 'string (optional) - easy, moderate, or advanced',
          maxTimeMinutes: 'number (optional) - Maximum cooking time',
          maxResults: 'number (optional) - Maximum number of results (default: 5)'
        }
      }
    },
    features: [
      'Comprehensive recipe data extraction (source URLs, images, detailed instructions)',
      'Production-ready JSON Schema validation',
      'USDA-aligned safety guidelines',
      'Beginner-friendly instruction formatting',
      'Ingredient synonym support for accessibility',
      'Quality scoring and validation metrics',
      'Cultural authenticity preservation'
    ]
  });
}