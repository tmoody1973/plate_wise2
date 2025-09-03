import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { perplexityRecipeSearchService } from '@/lib/external-apis/perplexity-recipe-search';

export async function POST(request: NextRequest) {
  try {
    const { recipeId, recipeName } = await request.json();
    
    if (!recipeId || !recipeName) {
      return NextResponse.json(
        { error: 'Recipe ID and name are required' },
        { status: 400 }
      );
    }

    console.log('🔧 Repairing recipe ingredients for:', recipeName);
    
    // Get fresh recipe data from Perplexity
    const freshRecipe = await perplexityRecipeSearchService.searchRecipes({
      query: recipeName,
      maxResults: 1
    });

    if (!freshRecipe.success || freshRecipe.recipes.length === 0) {
      return NextResponse.json(
        { error: 'Could not find fresh recipe data' },
        { status: 404 }
      );
    }

    const newRecipeData = freshRecipe.recipes[0];
    console.log('✅ Found fresh recipe with', newRecipeData.ingredients.length, 'ingredients');

    // Update the database record
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('recipes')
      .update({
        ingredients: newRecipeData.ingredients.map((ing, index) => ({
          id: `ing_${index + 1}`,
          name: ing.name, // Fresh ingredient name
          amount: ing.amount,
          unit: ing.unit,
          culturalName: ing.name,
          substitutes: [],
          costPerUnit: 0,
          availability: [],
          notes: ing.notes || ''
        })),
        instructions: newRecipeData.instructions.map(inst => ({
          step: inst.step,
          description: inst.text,
          culturalTechnique: '',
          estimatedTime: inst.timing?.duration
        })),
        // Also update other fields that might have improved
        description: newRecipeData.description,
        cultural_origin: newRecipeData.culturalOrigin,
        cuisine: newRecipeData.cuisine,
        updated_at: new Date().toISOString()
      })
      .eq('id', recipeId)
      .select();

    if (error) {
      console.error('Database update error:', error);
      return NextResponse.json(
        { error: 'Failed to update recipe in database' },
        { status: 500 }
      );
    }

    console.log('✅ Recipe repaired successfully');

    return NextResponse.json({
      success: true,
      message: 'Recipe ingredients repaired successfully',
      repairedIngredients: newRecipeData.ingredients.length,
      updatedInstructions: newRecipeData.instructions.length
    });

  } catch (error) {
    console.error('Recipe repair error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Repair failed' },
      { status: 500 }
    );
  }
}

// GET endpoint to check if a recipe needs repair
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const recipeId = searchParams.get('recipeId');
    
    if (!recipeId) {
      return NextResponse.json({ error: 'Recipe ID required' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: recipe, error } = await supabase
      .from('recipes')
      .select('ingredients, title')
      .eq('id', recipeId)
      .single();

    if (error || !recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    // Check if ingredients have placeholder names
    const hasPlaceholderNames = recipe.ingredients.some((ing: any) => 
      ing.name && (
        ing.name.startsWith('Ingredient ') ||
        ing.name === `Ingredient ${recipe.ingredients.indexOf(ing) + 1}` ||
        ing.name.match(/^Ingredient \d+$/)
      )
    );

    return NextResponse.json({
      needsRepair: hasPlaceholderNames,
      recipeName: recipe.title,
      ingredientCount: recipe.ingredients.length,
      placeholderCount: recipe.ingredients.filter((ing: any) => 
        ing.name && ing.name.match(/^Ingredient \d+$/)
      ).length
    });

  } catch (error) {
    console.error('Recipe check error:', error);
    return NextResponse.json(
      { error: 'Failed to check recipe' },
      { status: 500 }
    );
  }
}