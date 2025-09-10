import { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { mealPlanService } from '@/lib/meal-plans/meal-plan-service';
import { Database } from '@/types/database';

// POST /api/recipes/search/debug - Debug version with detailed error logging
export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  
  try {
    console.log('🔍 Debug: Starting recipe search...');
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('❌ Debug: Authentication failed:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required', debug: { authError } }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Debug: User authenticated:', user.id);

    const body = await request.json();
    console.log('📝 Debug: Request body:', body);
    
    const { 
      query = '', 
      country, 
      includeIngredients = [], 
      excludeIngredients = [], 
      maxResults = 20,
      excludeSources = [],
      mode = 'web'
    } = body;

    if (!query.trim()) {
      console.log('❌ Debug: Empty query');
      return new Response(
        JSON.stringify({ success: false, error: 'Search query is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Debug: Searching for:', query);

    // Convert web search filters to internal format
    const filters = {
      cuisine: undefined,
      maxCost: undefined,
      maxTime: undefined,
      dietary: excludeIngredients.length > 0 ? [`exclude:${excludeIngredients.join(',')}`] : []
    };

    console.log('🔧 Debug: Filters:', filters);

    // Try the search with detailed error handling
    let recipes;
    try {
      console.log('🔄 Debug: Calling mealPlanService.searchUserRecipes...');
      recipes = await mealPlanService.searchUserRecipes(user.id, query, filters);
      console.log('✅ Debug: Search completed, found:', recipes.length, 'recipes');
    } catch (searchError) {
      console.error('❌ Debug: Search error:', searchError);
      
      // Return detailed error information
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Search failed',
          debug: {
            searchError: searchError instanceof Error ? {
              message: searchError.message,
              stack: searchError.stack,
              name: searchError.name
            } : searchError,
            userId: user.id,
            query,
            filters
          }
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Filter results based on additional criteria
    let filteredRecipes = recipes;
    
    if (includeIngredients.length > 0) {
      console.log('🔧 Debug: Filtering by include ingredients:', includeIngredients);
      filteredRecipes = filteredRecipes.filter(recipe => 
        includeIngredients.some(ingredient => 
          recipe.ingredients?.some(ing => 
            ing.name.toLowerCase().includes(ingredient.toLowerCase())
          )
        )
      );
    }

    if (excludeIngredients.length > 0) {
      console.log('🔧 Debug: Filtering by exclude ingredients:', excludeIngredients);
      filteredRecipes = filteredRecipes.filter(recipe => 
        !excludeIngredients.some(ingredient => 
          recipe.ingredients?.some(ing => 
            ing.name.toLowerCase().includes(ingredient.toLowerCase())
          )
        )
      );
    }

    // Limit results
    filteredRecipes = filteredRecipes.slice(0, maxResults);
    
    console.log('✅ Debug: Final results:', filteredRecipes.length, 'recipes');

    return new Response(
      JSON.stringify({ 
        success: true,
        found: filteredRecipes.length,
        rows: filteredRecipes,
        results: {
          recipes: filteredRecipes,
          total: filteredRecipes.length,
          query,
          filters: body
        },
        debug: {
          userId: user.id,
          originalCount: recipes.length,
          filteredCount: filteredRecipes.length,
          filters
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Debug: Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Unexpected error',
        debug: {
          error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name
          } : error
        }
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}