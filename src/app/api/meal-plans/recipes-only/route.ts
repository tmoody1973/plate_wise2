import { NextRequest, NextResponse } from 'next/server';
import { searchRecipes } from '@/lib/recipes/search';

function extractUnitFromName(name: string): { cleaned: string; unit?: string } {
  const KNOWN = [
    'cup','cups','tablespoon','tablespoons','tbsp','teaspoon','teaspoons','tsp',
    'oz','ounce','ounces','lb','pound','pounds','g','gram','grams','kg','ml','milliliter','milliliters','l','liter','liters',
    'clove','cloves','sprig','sprigs','can','cans','package','packages','slice','slices','piece','pieces'
  ]
  const lower = name.toLowerCase()
  // find a standalone unit word anywhere in the string
  for (const u of KNOWN) {
    const re = new RegExp(`(^|\\s)${u}(s)?(\\s|$)`, 'i')
    if (re.test(name)) {
      const cleaned = lower.replace(new RegExp(`\\b${u}(s)?\\b`, 'i'), '').replace(/\s{2,}/g, ' ').trim()
      return { cleaned: cleaned.replace(/\s{2,}/g, ' ').trim() || name, unit: u }
    }
  }
  return { cleaned: name, unit: undefined }
}

function normalizeVulgarFractions(s: string): string {
  return s
    .replace(/¼/g, '1/4')
    .replace(/½/g, '1/2')
    .replace(/¾/g, '3/4')
    .replace(/⅐/g, '1/7')
    .replace(/⅑/g, '1/9')
    .replace(/⅒/g, '1/10')
    .replace(/⅓/g, '1/3')
    .replace(/⅔/g, '2/3')
    .replace(/⅕/g, '1/5')
    .replace(/⅖/g, '2/5')
    .replace(/⅗/g, '3/5')
    .replace(/⅘/g, '4/5')
    .replace(/⅙/g, '1/6')
    .replace(/⅚/g, '5/6')
    .replace(/⅛/g, '1/8')
    .replace(/⅜/g, '3/8')
    .replace(/⅝/g, '5/8')
    .replace(/⅞/g, '7/8')
}

function extractAmountFromName(name: string): { cleaned: string; amount?: string } {
  const src = normalizeVulgarFractions(name).trim()
  // Matches: "1 1/2", "1/2", "2.5", "3"
  const m = src.match(/^\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)/)
  if (m) {
    const amt = m[1]?.trim()
    const cleaned = src.slice(m[0].length).trim()
    return { cleaned: cleaned || name, amount: amt }
  }
  return { cleaned: name }
}

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
      ingredients: (recipe.ingredients || []).map((ing: any, ingIndex: number) => {
        const rawNameInput = String(ing.item || ing.name || '')
        const amtFromStruct = String(ing.quantity ?? ing.amount ?? '').trim()
        const amtProbe = !amtFromStruct ? extractAmountFromName(rawNameInput) : { cleaned: rawNameInput, amount: amtFromStruct }
        const rawName = amtProbe.cleaned
        const baseUnit = String(ing.unit || '').trim()
        const parsed = !baseUnit ? extractUnitFromName(rawName) : { cleaned: rawName, unit: baseUnit }
        return {
          id: `ingredient-${ingIndex}`,
          name: parsed.cleaned,
          amount: amtProbe.amount || '',
          unit: parsed.unit || baseUnit || '',
          originalName: rawName,
          isSubstituted: false,
          userStatus: 'normal' as const
        }
      }),
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
