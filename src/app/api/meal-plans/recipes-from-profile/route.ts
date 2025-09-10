import { NextRequest } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'
import { searchRecipes } from '@/lib/recipes/search'

function extractUnitFromName(name: string): { cleaned: string; unit?: string } {
  const KNOWN = [
    'cup','cups','tablespoon','tablespoons','tbsp','teaspoon','teaspoons','tsp',
    'oz','ounce','ounces','lb','pound','pounds','g','gram','grams','kg','ml','milliliter','milliliters','l','liter','liters',
    'clove','cloves','sprig','sprigs','can','cans','package','packages','slice','slices','piece','pieces'
  ]
  for (const u of KNOWN) {
    const re = new RegExp(`(^|\\s)${u}(s)?(\\s|$)`, 'i')
    if (re.test(name)) {
      const cleaned = name.replace(new RegExp(`\\b${u}(s)?\\b`, 'i'), '').replace(/\s{2,}/g, ' ').trim()
      return { cleaned: cleaned || name, unit: u }
    }
  }
  return { cleaned: name, unit: undefined }
}

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies })

  // Require auth to read the user's profile
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response(
      JSON.stringify({ success: false, error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing OPENAI_API_KEY. Configure your OpenAI key to enable web discovery.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )
    }
    const overrides = await request.json().catch(() => ({} as any))
    // Load user profile to extract cultural preferences
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ success: false, error: 'User profile not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const prefs: any = profile.preferences || {}
    const budget: any = profile.budget_settings || {}
    const cooking: any = profile.cooking_profile || {}

    const culturalCuisines: string[] = Array.isArray(overrides.culturalCuisines) ? overrides.culturalCuisines : (Array.isArray(prefs.culturalCuisines) ? prefs.culturalCuisines : [])
    const dietaryRestrictions: string[] = Array.isArray(overrides.dietaryRestrictions) ? overrides.dietaryRestrictions : (Array.isArray(prefs.dietaryRestrictions) ? prefs.dietaryRestrictions : [])
    const dislikes: string[] = Array.isArray(overrides.dislikes) ? overrides.dislikes : (Array.isArray(prefs.dislikes) ? prefs.dislikes : [])
    const allergies: string[] = Array.isArray(overrides.allergies) ? overrides.allergies : (Array.isArray(prefs.allergies) ? prefs.allergies : [])
    const excludeIngredients = [...new Set([...dislikes, ...allergies])].filter(Boolean)
    const householdSize: number = Number(overrides.householdSize ?? budget.householdSize) > 0 ? Number(overrides.householdSize ?? budget.householdSize) : 4
    const availableTime = String(overrides.availableTime ?? cooking.availableTime ?? '').toLowerCase()

    // Derive basic search inputs from the profile
    const primaryCuisine = culturalCuisines[0] || 'international'
    const query = `${culturalCuisines.length ? culturalCuisines.join(' ') : primaryCuisine} recipes`
    const maxTimeMinutes = availableTime.includes('quick') || availableTime.includes('30') ? 30 : undefined
    const maxResults = Math.min(Math.max(5, householdSize * 2), 8)

    const searchRequest = {
      query,
      culturalCuisine: primaryCuisine,
      dietaryRestrictions,
      excludeIngredients,
      maxTimeMinutes,
      maxResults,
    }

    const mealTypes = Array.isArray(overrides.mealTypes) && overrides.mealTypes.length ? overrides.mealTypes : ['dinner']
    const mealText = mealTypes.join(' ')
    const dietText = Array.isArray(overrides.dietaryRestrictions) && overrides.dietaryRestrictions.includes('vegan')
      ? 'vegan'
      : (Array.isArray(overrides.dietaryRestrictions) && overrides.dietaryRestrictions.includes('vegetarian') ? 'vegetarian' : '')
    const typedQuery = `${query} ${mealText} ${dietText}`.trim()
    const count = Math.min(Math.max(1, Number(overrides.mealCount) || maxResults), 12)
    function buildDietaryExclusions(diet: string[] | undefined): string[] {
      const set = new Set<string>()
      const has = (k: string) => !!diet?.map(d => d.toLowerCase()).includes(k)
      if (has('vegan')) {
        ;['beef','pork','chicken','lamb','fish','seafood','shrimp','egg','milk','cheese','butter','yogurt','honey','gelatin','lard'].forEach(s => set.add(s))
      }
      if (has('vegetarian')) {
        ;['beef','pork','chicken','lamb','fish','seafood','shrimp','gelatin','lard'].forEach(s => set.add(s))
      }
      return Array.from(set)
    }
    const dietaryEx = buildDietaryExclusions(overrides.dietaryRestrictions)

    const resp = await searchRecipes({
      query: typedQuery,
      country: (typeof overrides.country === 'string' && overrides.country.trim()) ? overrides.country.trim() : undefined,
      includeIngredients: Array.isArray(overrides.includeIngredients) && overrides.includeIngredients.length ? overrides.includeIngredients : undefined,
      excludeIngredients: Array.from(new Set([...(excludeIngredients || []), ...dietaryEx])),
      maxResults: count,
      detailedInstructions: true,
    })
    let list = resp.recipes || []
    if (Array.isArray(overrides.dietaryRestrictions) && overrides.dietaryRestrictions.length) {
      const banned = new Set(dietaryEx)
      function ok(rec: any): boolean {
        const ing = (rec.ingredients || []).map((x: any) => (x.item || x.name || '').toString().toLowerCase())
        for (const b of banned) if (ing.some((n: string) => n.includes(b))) return false
        return true
      }
      list = list.filter(ok)
    }
    if (!list.length) {
      return new Response(
        JSON.stringify({ success: false, error: 'No recipes found for your profile' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Convert to MealPlannerV2 expected shape (align with /api/meal-plans/recipes-only)
    const recipes = list.map((recipe: any, index: number) => ({
      id: `recipe-${Date.now()}-${index}`,
      title: recipe.title,
      description: recipe.description || '',
      culturalOrigin: [recipe.cuisine || primaryCuisine],
      cuisine: recipe.cuisine || primaryCuisine,
      ingredients: (recipe.ingredients || []).map((ing: any, ingIndex: number) => {
        const rawName = String(ing.item || ing.name || '')
        const baseUnit = String(ing.unit || '').trim()
        const parsed = !baseUnit ? extractUnitFromName(rawName) : { cleaned: rawName, unit: baseUnit }
        return {
          id: `ingredient-${ingIndex}`,
          name: parsed.cleaned,
          amount: String(ing.quantity ?? ing.amount ?? ''),
          unit: parsed.unit || baseUnit || '',
          originalName: rawName,
          isSubstituted: false,
          userStatus: 'normal' as const,
        }
      }),
      instructions: (recipe.instructions || []).map((inst: any) => inst.text || String(inst.description || inst)),
      metadata: {
        servings: Number(recipe.servings) || 4,
        prepTime: Math.floor((Number(recipe.total_time_minutes) || 40) * 0.3),
        cookTime: Math.floor((Number(recipe.total_time_minutes) || 40) * 0.7),
        totalTime: Number(recipe.total_time_minutes) || 40,
        estimatedTime: Number(recipe.total_time_minutes) || 40,
      },
      imageUrl: recipe.image,
      source: 'profile-search',
      sourceUrl: recipe.source,
      tags: [],
      hasPricing: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${recipes.length} recipes from your cultural profile`,
        data: {
          recipes,
          summary: {
            totalRecipes: recipes.length,
            culturalDiversity: [...new Set(recipes.map((r: any) => r.cuisine))],
            averageTime: Math.round(recipes.reduce((sum: number, r: any) => sum + r.metadata.totalTime, 0) / recipes.length),
            readyForPricing: true,
            realUrls: recipes.filter((r: any) => r.sourceUrl).length,
            withImages: recipes.filter((r: any) => r.imageUrl).length,
          },
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('recipes-from-profile failed:', error)
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Failed to generate from profile' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function GET(request: NextRequest) {
  // Convenience: allow GET for quick manual testing
  return POST(request)
}
