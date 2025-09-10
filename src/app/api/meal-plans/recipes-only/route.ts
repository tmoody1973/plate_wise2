import { NextRequest, NextResponse } from 'next/server';
import { searchRecipes } from '@/lib/recipes/search';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ success: false, error: 'Missing OPENAI_API_KEY. Configure your OpenAI key to enable web discovery.' }, { status: 503 })
    }
    const body = await request.json();
    const {
      culturalCuisines = ['mexican'],
      dietaryRestrictions = [],
      mealTypes = ['dinner'],
      mealCount = 7,
      includeIngredients = [],
      excludeIngredients = [],
      country,
      householdSize = 4,
      timeFrame = 'week',
    } = body;

    console.log('🍽️ Generating recipes using Discover pipeline (web search + import)...');

    function buildDietaryExclusions(diet: string[]): string[] {
      const set = new Set<string>()
      const has = (k: string) => diet.map(d => d.toLowerCase()).includes(k)
      if (has('vegan')) {
        ;['beef','pork','chicken','lamb','fish','seafood','shrimp','egg','milk','cheese','butter','yogurt','honey','gelatin','lard'].forEach(s => set.add(s))
      }
      if (has('vegetarian')) {
        ;['beef','pork','chicken','lamb','fish','seafood','shrimp','gelatin','lard'].forEach(s => set.add(s))
      }
      return Array.from(set)
    }

    const mealText = Array.isArray(mealTypes) && mealTypes.length ? mealTypes.join(' ') : 'dinner'
    const dietText = (dietaryRestrictions || []).includes('vegan') ? 'vegan' : (dietaryRestrictions || []).includes('vegetarian') ? 'vegetarian' : ''
    const query = `${culturalCuisines.join(' ')} ${mealText} ${dietText} authentic home-style recipes`.trim()

    const autoExcludes = buildDietaryExclusions(dietaryRestrictions)
    const resp = await searchRecipes({
      query,
      country: (typeof country === 'string' && country.trim()) ? country.trim() : undefined,
      includeIngredients: Array.isArray(includeIngredients) && includeIngredients.length ? includeIngredients : undefined,
      excludeIngredients: Array.from(new Set([...(excludeIngredients || []), ...autoExcludes])),
      maxResults: Math.min(Math.max(1, Number(mealCount) || 7), 12),
      detailedInstructions: true,
    })

    let picked = resp.recipes || []
    // Post-filter by dietary if needed
    if ((dietaryRestrictions || []).length) {
      const isVegan = dietaryRestrictions.includes('vegan')
      const isVegetarian = dietaryRestrictions.includes('vegetarian')
      const banned = new Set(buildDietaryExclusions(dietaryRestrictions))
      function ok(rec: any): boolean {
        const ing = (rec.ingredients || []).map((x: any) => (x.item || x.name || '').toString().toLowerCase())
        if (isVegan || isVegetarian) {
          for (const b of banned) if (ing.some((n: string) => n.includes(b))) return false
        }
        return true
      }
      picked = picked.filter(ok)
    }
    if (!picked.length) throw new Error('Failed to find recipes')

    console.log(`✅ Found ${picked.length} recipes via Discover pipeline`)

    const recipes = picked.map((recipe, index) => ({
      id: `recipe-${Date.now()}-${index}`,
      title: recipe.title,
      description: recipe.description || '',
      culturalOrigin: [recipe.cuisine || culturalCuisines[0] || 'international'],
      cuisine: recipe.cuisine || culturalCuisines[0] || 'international',
      ingredients: (recipe.ingredients || []).map((ing: any, ingIndex: number) => ({
        id: `ingredient-${ingIndex}`,
        name: ing.item || ing.name,
        amount: String(ing.quantity ?? ing.amount ?? ''),
        unit: String(ing.unit ?? ''),
        originalName: ing.item || ing.name,
        isSubstituted: false,
        userStatus: 'normal' as const
      })),
      instructions: (recipe.instructions || []).map((inst: any) => inst.text || String(inst.description || inst)),
      metadata: {
        servings: recipe.servings || 4,
        prepTime: Math.floor((recipe.total_time_minutes || 40) * 0.3),
        cookTime: Math.floor((recipe.total_time_minutes || 40) * 0.7),
        totalTime: recipe.total_time_minutes || 40,
        difficulty: 'medium',
        culturalAuthenticity: 'high',
        estimatedTime: recipe.total_time_minutes || 40,
      },
      imageUrl: recipe.image,
      source: 'enhanced-search',
      sourceUrl: recipe.source, // Real URLs from web search
      tags: [],
      hasPricing: false, // Indicates pricing not yet loaded
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    console.log('🎯 Recipe conversion summary:', {
      totalRecipes: recipes.length,
      withImages: recipes.filter(r => r.imageUrl).length,
      withSourceUrls: recipes.filter(r => r.sourceUrl).length,
      avgIngredients: Math.round(recipes.reduce((sum, r) => sum + r.ingredients.length, 0) / recipes.length)
    });

    return NextResponse.json({
      success: true,
      message: `Generated ${recipes.length} recipes with real URLs and images`,
      data: {
        recipes,
        summary: {
          totalRecipes: recipes.length,
          culturalDiversity: [...new Set(recipes.map(r => r.cuisine))],
          averageTime: Math.round(recipes.reduce((sum, r) => sum + r.metadata.totalTime, 0) / recipes.length),
          readyForPricing: true,
          enhancedSearch: true, // Flag to indicate this used enhanced search
          realUrls: recipes.filter(r => r.sourceUrl).length,
          withImages: recipes.filter(r => r.imageUrl).length
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Enhanced recipe search failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Enhanced recipe search failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET endpoint for quick testing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cuisine = searchParams.get('cuisine') || 'mexican';
  const people = parseInt(searchParams.get('people') || '4');

  return POST(new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify({
      culturalCuisines: [cuisine],
      householdSize: people
    })
  }));
}
