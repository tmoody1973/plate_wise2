import { NextRequest, NextResponse } from 'next/server';
import { searchRecipes } from '@/lib/recipes/search';
import { ogImageExtractor } from '@/lib/integrations/og-image-extractor';

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
      culturalCuisines = [],
      dietaryRestrictions = [],
      mealTypes = ['dinner'],
      dishCategories = ['main'],
      mealCount = 7,
      includeIngredients = [],
      excludeIngredients = [],
      country,
      householdSize = 4,
      timeFrame = 'week',
      // Optional UX filters (not required by model, used for post-filtering and reasons)
      maxPrepTime,
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
    const categoryText = Array.isArray(dishCategories) && dishCategories.length ? dishCategories.join(' ') : ''
    const dietText = (dietaryRestrictions || []).includes('vegan') ? 'vegan' : (dietaryRestrictions || []).includes('vegetarian') ? 'vegetarian' : ''

    // Map cultures to synonyms to steer web search and enable stricter filtering
    const CULTURE_SYNONYMS: Record<string, string[]> = {
      'african-american': [
        'african-american', 'african american', 'black american', 'soul food',
        'southern black', 'southern united states', 'southern cuisine', 'gullah geechee'
      ],
      // Louisiana regional cuisines
      'cajun': [
        'cajun', 'louisiana cajun', 'acadiana cajun', 'acadian cajun', 'cajun cuisine', 'cajun recipes', 'south louisiana cajun'
      ],
      'creole': [
        // Intend Louisiana/New Orleans Creole here; Caribbean/Haitian handled under caribbean/west-indies
        'creole', 'louisiana creole', 'new orleans creole', 'creole cuisine', 'creole recipes', 'nola creole'
      ],
      // Caribbean umbrella
      'caribbean': [
        'caribbean', 'west indian', 'west indies', 'jamaican', 'trinidadian', 'trinidad & tobago', 'barbadian', 'bajan',
        'haitian', 'puerto rican', 'dominican', 'bahamian', 'cuban', 'antillean', 'lucian', 'st lucia', 'grenadian', 'anguillian'
      ],
      'west indies': [
        'west indies', 'west indian', 'caribbean', 'jamaican', 'trinidadian', 'haitian', 'puerto rican', 'dominican', 'barbadian', 'bahamian'
      ],
      'mexican': ['mexican'],
      'hmong': ['hmong'],
      'haitian': ['haitian'],
      'japanese': ['japanese'],
      'chinese': ['chinese'],
      // Chinese regional cuisines (Eight Great + common variants)
      'sichuan': ['sichuan', 'szechuan', 'chuan cuisine', 'sichuanese'],
      'cantonese': ['cantonese', 'yue cuisine', 'guangdong', 'hong kong style'],
      'hunan': ['hunan', 'xiang cuisine', 'hunanese'],
      'shanghai': ['shanghai', 'shanghainese', 'hu cuisine'],
      'jiangsu': ['jiangsu', 'su cuisine', 'huaiyang', 'yangzhou', 'suzhou'],
      'zhejiang': ['zhejiang', 'zhe cuisine', 'hangzhou', 'shaoxing', 'ningbo'],
      'fujian': ['fujian', 'min cuisine', 'hokkien', 'hokkienese', 'minnan'],
      'shandong': ['shandong', 'lu cuisine'],
      'anhui': ['anhui', 'hui cuisine'],
      'fuyang': ['fuyang'],
      'xinjiang': ['xinjiang', 'uyghur', 'uighur'],
      'yunnan': ['yunnan'],
      'dongbei': ['dongbei', 'northeast chinese', 'manchurian chinese'],
      'teochew': ['teochew', 'chaozhou'],
      'hakka': ['hakka'] ,
      'hainan': ['hainan', 'hainanese'] ,
      'indian': ['indian'],
      'italian': ['italian'],
      'greek': ['greek'],
      'brazilian': ['brazilian'],
      'thai': ['thai'],
      'vietnamese': ['vietnamese'],
      'ethiopian': ['ethiopian']
    }

    // Normalize user-entered culture names to best-known keys (tolerate typos like 'african-america')
    const normalize = (s: string) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '')
    const keys = Object.keys(CULTURE_SYNONYMS)
    const normIndex = new Map(keys.map(k => [normalize(k), k]))
    const bestKeyFor = (raw: string) => {
      const n = normalize(raw)
      if (normIndex.has(n)) return normIndex.get(n) as string
      // fallback: prefix or includes match
      for (const k of keys) { const nk = normalize(k); if (n.startsWith(nk) || nk.startsWith(n)) return k }
      for (const k of keys) { const nk = normalize(k); if (nk.includes(n) || n.includes(nk)) return k }
      return raw.toLowerCase().trim()
    }

    const cultureTerms: string[] = []
    for (const c of (culturalCuisines || [])) {
      const key = bestKeyFor(String(c))
      const syns = CULTURE_SYNONYMS[key] || [key]
      cultureTerms.push(...syns)
    }

    const query = `${cultureTerms.join(' OR ')} ${mealText} ${categoryText} ${dietText} authentic home-style recipes`.trim()

    const autoExcludes = buildDietaryExclusions(dietaryRestrictions)
    const resp = await searchRecipes({
      // Strengthen instruction to avoid drifting into unrelated cuisines when culture terms are present
      query: `${query} ${cultureTerms.length ? 'Return recipes specifically from these cuisines only; avoid unrelated African or Caribbean cuisines unless they are explicitly African-American (soul food).' : ''}`.trim(),
      country: (typeof country === 'string' && country.trim()) ? country.trim() : undefined,
      includeIngredients: Array.isArray(includeIngredients) && includeIngredients.length ? includeIngredients : undefined,
      excludeIngredients: Array.from(new Set([...(excludeIngredients || []), ...autoExcludes])),
      maxResults: Math.min(Math.max(1, Number(mealCount) || 7), 12),
      detailedInstructions: true,
    })

    let picked = resp.recipes || []

    // --- Diagnose causes for potential empty results by simulating filters independently ---
    const reasons: string[] = []
    const diag = {
      initial: picked.length,
      afterCategory: 0,
      afterDietary: 0,
      afterCulture: 0,
      afterTime: 0,
    }

    // Optional category filter (keyword-based, fail-soft)
    const CATEGORY_KEYWORDS: Record<string, string[]> = {
      appetizer: ['appetizer','starter','finger food','snack','tapas'],
      bread: ['bread','flatbread','naan','rolls','tortilla','loaf'],
      breakfast: ['breakfast','pancake','waffle','omelet','omelette','oatmeal','granola','toast'],
      dessert: ['dessert','sweet','cake','cookie','brownie','pie','pudding','ice cream','tart','custard'],
      drink: ['drink','beverage','smoothie','juice','shake','cocktail','mocktail','tea','coffee'],
      main: ['main','entree','one-pot','casserole','stir-fry','roast','bake','grill','braise','curry'],
      salad: ['salad'],
      side: ['side','side dish'],
      soup_stew: ['soup','stew','chowder','broth','bisque'],
      sauce: ['sauce','marinade','dressing','dip','relish','chutney'],
      other: [],
    };

    const wanted = new Set((dishCategories || []).map((s: string) => String(s).toLowerCase()))
    if (wanted.size > 0) {
      const isMatch = (rec: any) => {
        const hay = `${(rec.title||'')} ${(rec.description||'')} ${(rec.source||'')}`.toLowerCase()
        for (const cat of wanted) {
          const kws = CATEGORY_KEYWORDS[cat] || []
          if (kws.some(kw => hay.includes(kw))) return true
        }
        return wanted.has('other') // allow 'other' as catch-all
      }
      const filtered = picked.filter(isMatch)
      diag.afterCategory = filtered.length
      if (filtered.length > 0) picked = filtered
    } else {
      diag.afterCategory = picked.length
    }
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
      const filtered = picked.filter(ok)
      diag.afterDietary = filtered.length
      picked = filtered
    } else {
      diag.afterDietary = picked.length
    }
    // Cultural hard filter helper and first pass
    const applyCulturalFilter = (list: any[]) => {
      if (!(culturalCuisines || []).length) return list
      const synSet = new Set(cultureTerms.map(s => s.toLowerCase()))
      const aaPositive = /(soul\s*food|african[-\s]?american|gullah\s*geechee|southern\s*(black\s*)?cuisine|southern\s*black|black\s*american|southern\s*soul)/i
      const aaNegative = /\b(haitian|caribbean|jamaican|trinidad|trinidadian|west\s*indies|west\s*indian)\b/i
      const strongMatch = (rec: any): boolean => {
        const hay = `${(rec.title||'')} ${(rec.description||'')} ${(rec.cuisine||'')} ${(rec.source||'')}`.toLowerCase()
        // Must include at least one synonym
        let ok = false
        for (const t of synSet) { if (t && hay.includes(t)) { ok = true; break } }
        // Extra strict rule for African-American: require explicit positive phrase
        if (ok && cultureTerms.some(t => /african[-\s]?american|soul\s*food/i.test(t))) {
          if (!aaPositive.test(hay)) return false
          if (aaNegative.test(hay)) return false
        }
        return ok
      }
      const out = list.filter(strongMatch)
      return out // do not fallback; zero triggers reasons/relaxers instead of off-culture results
    }
    const beforeCulture = picked.length
    picked = applyCulturalFilter(picked)
    diag.afterCulture = picked.length

    // Time filtering (optional): keep those with total_time_minutes <= maxPrepTime
    const maxTimeNum = (maxPrepTime !== undefined && maxPrepTime !== null && maxPrepTime !== 'any') ? Number(maxPrepTime) : undefined
    if (Number.isFinite(maxTimeNum as number)) {
      const t = maxTimeNum as number
      const filtered = picked.filter((rec: any) => {
        const total = Number(rec.total_time_minutes || rec.metadata?.totalTime || rec.metadata?.total_time || rec.totalTime)
        return !Number.isFinite(total) || total <= t
      })
      diag.afterTime = filtered.length
      picked = filtered
    } else {
      diag.afterTime = picked.length
    }

    if (!picked.length) {
      // Fail-soft fallback: broaden query and retry once or twice
      const baseQuery = `${culturalCuisines.join(' ')} ${dietText} recipes`.trim() || 'family dinner recipes'
      try {
        const retry1 = await searchRecipes({
          query: baseQuery,
          country: (typeof country === 'string' && country.trim()) ? country.trim() : undefined,
          maxResults: Math.min(Math.max(1, Number(mealCount) || 7), 12),
          detailedInstructions: true,
        })
        picked = applyCulturalFilter(retry1.recipes || [])
      } catch {}

      if (!picked.length) {
        try {
          // If a culture is specified, do not broaden to generic; keep strict
          if ((culturalCuisines || []).length === 0) {
            const retry2 = await searchRecipes({
              query: 'easy weeknight recipes',
              country: 'United States',
              maxResults: 7,
              detailedInstructions: true,
            })
            picked = retry2.recipes || []
          } else {
            picked = []
          }
        } catch {}
      }
    }

    if (!picked.length) {
      // Build human-readable reasons
      if ((culturalCuisines || []).length && diag.afterCulture === 0 && beforeCulture > 0) {
        reasons.push(`The selected culture (${culturalCuisines.join(', ')}) is very specific and removed all results.`)
      }
      if (wanted.size && diag.afterCategory === 0) {
        reasons.push(`Meal type/category (${Array.from(wanted).join(', ')}) combined with other filters resulted in no matches.`)
      }
      if ((dietaryRestrictions || []).length && diag.afterDietary === 0) {
        reasons.push(`Dietary restrictions (${dietaryRestrictions.join(', ')}) filtered out the available recipes.`)
      }
      if (Number.isFinite(maxTimeNum as number) && diag.afterTime === 0) {
        reasons.push(`Prep/total time limit (≤ ${maxTimeNum} min) is too strict.`)
      }
      if (!reasons.length) {
        reasons.push('No good sources found for the current filters. Try widening culture or categories.')
      }

      // Compose one-click relaxers
      const relaxers: Array<{ key: string; label: string; patch: any }> = []
      if ((culturalCuisines || []).some((c: string) => /african[-\s]?american/i.test(c))) {
        relaxers.push({ key: 'add_related_southern_us', label: 'Include related: Southern US', patch: { culturesAppend: ['southern united states', 'southern cuisine'] } })
      }
      if (Number.isFinite(maxTimeNum as number) && (maxTimeNum as number) < 60) {
        relaxers.push({ key: 'allow_60_min', label: 'Allow 45–60 min', patch: { maxPrepTime: 60 } })
      }
      if (!Array.isArray(dishCategories) || !dishCategories.includes('side')) {
        relaxers.push({ key: 'include_sides', label: 'Include sides', patch: { categoriesAppend: ['side'] } })
      }

      return NextResponse.json({
        success: true,
        message: 'No matches for filters; returned 0 results',
        data: { recipes: [], reasons, relaxers, summary: { totalRecipes: 0, culturalDiversity: [], averageTime: 0, readyForPricing: false, enhancedSearch: true, realUrls: 0, withImages: 0 } },
        timestamp: new Date().toISOString()
      })
    }

    console.log(`✅ Found ${picked.length} recipes via Discover pipeline`)

    // Extract og:images from recipe URLs in parallel
    console.log('🖼️ Extracting recipe images from source URLs...');
    const recipeUrls = picked.map(recipe => recipe.source).filter(Boolean);
    const ogImageResults = await ogImageExtractor.extractMultipleOGImages(recipeUrls);

    const recipes = picked.map((recipe, index) => {
      // Get the best image: either from recipe.image or extracted og:image
      const ogData = recipe.source ? ogImageResults.get(recipe.source) : null;
      const imageUrl = recipe.image || ogData?.bestImage || undefined;

      return {
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
      imageUrl,
      source: 'enhanced-search',
      sourceUrl: recipe.source, // Real URLs from web search
      tags: Array.from(new Set([...(dishCategories||[])])),
      hasPricing: false, // Indicates pricing not yet loaded
      createdAt: new Date(),
      updatedAt: new Date()
      };
    });

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
