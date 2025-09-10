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
  const m = src.match(/^\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)/)
  if (m) {
    const amt = m[1]?.trim()
    const cleaned = src.slice(m[0].length).trim()
    return { cleaned: cleaned || name, amount: amt }
  }
  return { cleaned: name }
}

export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies })

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return new Response(`event: error\ndata: {"message":"Authentication required"}\n\n`, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' },
      status: 401,
    })
  }

  const stream = new ReadableStream({
    start: async (controller) => {
      const enc = new TextEncoder()
      const send = (obj: any) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`))
      const sendEvent = (type: string, obj: any) => {
        controller.enqueue(enc.encode(`event: ${type}\n`))
        controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`))
      }

      try {
        if (!process.env.OPENAI_API_KEY) {
          sendEvent('error', { message: 'Missing OPENAI_API_KEY. Configure your OpenAI key to enable web discovery.' })
          controller.close();
          return
        }
        // Load profile
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        if (profileError || !profile) {
          sendEvent('error', { message: 'User profile not found' })
          controller.close()
          return
        }

        const prefs: any = profile.preferences || {}
        const budget: any = profile.budget_settings || {}
        const cooking: any = profile.cooking_profile || {}

        // Allow overrides via query params for on-the-fly edits
        const url = new URL(request.url)
        function csv(name: string): string[] {
          const v = url.searchParams.get(name) || ''
          return v ? v.split(',').map(s => s.trim()).filter(Boolean) : []
        }
        const overrideCuisines = csv('cuisines')
        const overrideDietary = csv('dietary')
        const overrideAllergies = csv('allergies')
        const overrideDislikes = csv('dislikes')
        const overrideAvail = (url.searchParams.get('availableTime') || '').toLowerCase()
        const overrideCountry = (url.searchParams.get('country') || '').trim()
        const mealTypesCSV = url.searchParams.get('mealTypes') || ''
        const mealTypes = mealTypesCSV ? mealTypesCSV.split(',').map(s => s.trim()).filter(Boolean) : ['dinner']
        const includeCSV = url.searchParams.get('include') || ''
        const includeIngredients = includeCSV ? includeCSV.split(',').map(s => s.trim()).filter(Boolean) : undefined
        const overrideHH = url.searchParams.get('householdSize')
        const overrideTotal = url.searchParams.get('total')
        const excludeCSV = url.searchParams.get('exclude') || ''
        const excludeSources = excludeCSV ? excludeCSV.split(',').map(s => s.trim()).filter(Boolean) : []

        const culturalCuisines: string[] = overrideCuisines.length ? overrideCuisines : (Array.isArray(prefs.culturalCuisines) ? prefs.culturalCuisines : [])
        const dietaryRestrictions: string[] = overrideDietary.length ? overrideDietary : (Array.isArray(prefs.dietaryRestrictions) ? prefs.dietaryRestrictions : [])
        const dislikes: string[] = overrideDislikes.length ? overrideDislikes : (Array.isArray(prefs.dislikes) ? prefs.dislikes : [])
        const allergies: string[] = overrideAllergies.length ? overrideAllergies : (Array.isArray(prefs.allergies) ? prefs.allergies : [])
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
        const excludeIngredients = [...new Set([...dislikes, ...allergies, ...buildDietaryExclusions(dietaryRestrictions)])].filter(Boolean)
        const householdSize: number = Number(overrideHH ?? budget.householdSize) > 0 ? Number(overrideHH ?? budget.householdSize) : 4
        const availableTime = String(overrideAvail || cooking.availableTime || '').toLowerCase()

        const planTotal = Number(overrideTotal || 7)
        const cuisinesRotation = (culturalCuisines.length ? culturalCuisines : ['international']).slice()

        // Helper to map to UI shape
        function toUiRecipe(recipe: any, primaryCuisine: string, index: number) {
          return {
            id: `recipe-${Date.now()}-${index}`,
            title: recipe.title,
            description: recipe.description || '',
            culturalOrigin: [recipe.cuisine || primaryCuisine],
            cuisine: recipe.cuisine || primaryCuisine,
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
                userStatus: 'normal' as const,
              }
            }),
            instructions: (recipe.instructions || []).map((inst: any) => inst.text || String((inst as any).description || inst)),
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
            tags: recipe.tags || [],
            hasPricing: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        }

        for (let i = 0; i < planTotal; i++) {
          const primaryCuisine = cuisinesRotation[i % cuisinesRotation.length]
          const mealType = mealTypes[i % mealTypes.length]
          const dietText = dietaryRestrictions.includes('vegan') ? 'vegan' : (dietaryRestrictions.includes('vegetarian') ? 'vegetarian' : '')
          const maxTimeMinutes = availableTime.includes('quick') || availableTime.includes('30') ? 30 : undefined
          const query = `${primaryCuisine} ${mealType} ${dietText} recipes`.trim()
          const maxResults = 3

          sendEvent('progress', { step: 'search', index: i + 1, total: planTotal, cuisine: primaryCuisine })
          try {
            const res = await searchRecipes({
              query,
              country: overrideCountry || undefined,
              includeIngredients,
              excludeIngredients,
              maxResults,
              detailedInstructions: true,
            })
            const candidates = (res.recipes || [])
            const picked = candidates.find(r => r?.source && !excludeSources.includes(r.source)) || candidates[0]
            if (!picked) {
              sendEvent('warning', { message: 'No recipe found for cuisine', cuisine: primaryCuisine, index: i + 1 })
              continue
            }
            const uiRecipe = toUiRecipe(picked, primaryCuisine, i)
            sendEvent('recipe', { index: i, total: planTotal, recipe: uiRecipe })
          } catch (err: any) {
            sendEvent('error', { message: err?.message || 'slot_failed', index: i + 1 })
          }
        }

        sendEvent('done', { ok: true, total: planTotal })
        controller.close()
      } catch (e: any) {
        sendEvent('error', { message: e?.message || 'stream_failed' })
        try { controller.close() } catch {}
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}

export async function POST(request: NextRequest) {
  // Support POST for clients that prefer it
  return GET(request)
}
