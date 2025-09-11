import { NextRequest, NextResponse } from 'next/server';

// Groq provider for suggestions (A/B testing vs Perplexity)
// Matches the API contract of /api/meal-plans/recipes-only

type Recipe = {
  title: string;
  description?: string;
  cuisine?: string;
  source?: string;
  image?: string;
  ingredients?: Array<{ item?: string; name?: string; quantity?: string; amount?: string; unit?: string }> | any[];
  instructions?: Array<{ step?: number; text?: string } | string> | any[];
  total_time_minutes?: number;
};

function isValidUrl(value: string): boolean {
  try { new URL(value); return true; } catch { return false; }
}

function stripCodeFences(s: string) {
  let t = (s || '').trim();
  t = t.replace(/^```json\s*/i, '');
  t = t.replace(/^```\s*/i, '');
  t = t.replace(/\s*```\s*$/i, '');
  return t;
}

function tryParseJson(text: string): any | null {
  const cleaned = stripCodeFences(text);
  try { return JSON.parse(cleaned); } catch {}
  // try to find first '{' and last '}'
  const i = cleaned.indexOf('{');
  const j = cleaned.lastIndexOf('}');
  if (i >= 0 && j > i) {
    const sub = cleaned.slice(i, j + 1);
    try { return JSON.parse(sub); } catch {}
  }
  return null;
}

export async function POST(request: NextRequest) {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ success: false, error: 'Missing GROQ_API_KEY' }, { status: 503 });
  }

  try {
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
      maxPrepTime,
    } = body || {};

    // ----- Culture synonyms & normalization (subset of recipes-only route) -----
    const CULTURE_SYNONYMS: Record<string, string[]> = {
      'african-american': [
        'african-american','african american','black american','soul food','southern black','southern united states','southern cuisine','gullah geechee'
      ],
      'cajun': ['cajun','louisiana cajun','acadiana cajun','acadian cajun','cajun cuisine'],
      'creole': ['creole','louisiana creole','new orleans creole','creole cuisine','nola creole'],
      'caribbean': ['caribbean','west indian','west indies','jamaican','trinidadian','puerto rican','dominican','haitian','bahamian','barbadian','bajan'],
      'west indies': ['west indies','west indian','caribbean','jamaican','trinidadian','haitian','puerto rican','dominican','barbadian','bahamian'],
      'mexican': ['mexican'],
      'hmong': ['hmong'],
      'haitian': ['haitian'],
      'japanese': ['japanese'],
      'chinese': ['chinese'],
      'sichuan': ['sichuan','szechuan','chuan cuisine','sichuanese'],
      'cantonese': ['cantonese','yue cuisine','guangdong','hong kong style'],
      'hunan': ['hunan','xiang cuisine','hunanese'],
      'shanghai': ['shanghai','shanghainese','hu cuisine'],
      'jiangsu': ['jiangsu','su cuisine','huaiyang','yangzhou','suzhou'],
      'zhejiang': ['zhejiang','zhe cuisine','hangzhou','shaoxing','ningbo'],
      'fujian': ['fujian','min cuisine','hokkien','hokkienese','minnan'],
      'shandong': ['shandong','lu cuisine'],
      'anhui': ['anhui','hui cuisine'],
      'xinjiang': ['xinjiang','uyghur','uighur'],
      'yunnan': ['yunnan'],
      'dongbei': ['dongbei','northeast chinese','manchurian chinese'],
      'teochew': ['teochew','chaozhou'],
      'hakka': ['hakka'],
      'hainan': ['hainan','hainanese'],
      'indian': ['indian'],
      'italian': ['italian'],
      'greek': ['greek'],
      'brazilian': ['brazilian'],
      'thai': ['thai'],
      'vietnamese': ['vietnamese'],
      'ethiopian': ['ethiopian']
    };
    const normalize = (s: string) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '');
    const keys = Object.keys(CULTURE_SYNONYMS);
    const normIndex = new Map(keys.map(k => [normalize(k), k]));
    const bestKeyFor = (raw: string) => {
      const n = normalize(raw);
      if (normIndex.has(n)) return normIndex.get(n) as string;
      for (const k of keys) { const nk = normalize(k); if (n.startsWith(nk) || nk.startsWith(n)) return k }
      for (const k of keys) { const nk = normalize(k); if (nk.includes(n) || n.includes(nk)) return k }
      return raw.toLowerCase().trim();
    };
    const cultureTerms: string[] = [];
    for (const c of (culturalCuisines || [])) {
      const key = bestKeyFor(String(c));
      const syns = CULTURE_SYNONYMS[key] || [key];
      cultureTerms.push(...syns);
    }

    const mealText = Array.isArray(mealTypes) && mealTypes.length ? mealTypes.join(' ') : 'dinner';
    const categoryText = Array.isArray(dishCategories) && dishCategories.length ? dishCategories.join(' ') : '';
    const dietText = (dietaryRestrictions || []).includes('vegan') ? 'vegan' : (dietaryRestrictions || []).includes('vegetarian') ? 'vegetarian' : '';
    const query = `${cultureTerms.join(' OR ')} ${mealText} ${categoryText} ${dietText} authentic home-style recipes`.trim();

    // Build Groq prompt for strict JSON output
    const schemaHint = `Return a single JSON object with this shape: { "recipes": [ { "title": string, "description": string?, "cuisine": string?, "source": string (absolute URL), "image": string (absolute URL), "ingredients": string[] or [{"item": string, "quantity": string?, "unit": string?}], "instructions": string[] or [{"step": number, "text": string}], "total_time_minutes": number? } ... ] }`;
    const constraints = [
      'Prefer single‑recipe pages with clear ingredients and steps; avoid roundup/listicle pages.',
      'Include canonical source URL and a representative image URL when available.',
      'Apply filters: cultures, categories, dietary, and time (if provided).',
      cultureTerms.length ? 'Keep to the requested cuisines only; avoid unrelated cuisines.' : '',
      'If any field is unknown, omit it rather than guessing.',
      'Output strictly valid JSON with no extra commentary or code fences.'
    ].filter(Boolean).join(' ');

    const started = Date.now();
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
        'Groq-Model-Version': 'latest',
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'groq/compound-mini',
        temperature: 0.6,
        top_p: 1,
        stream: false,
        messages: [
          { role: 'system', content: `${schemaHint} ${constraints}` },
          { role: 'user', content: JSON.stringify({
            query,
            country: (typeof country === 'string' && country.trim()) ? country.trim() : undefined,
            includeIngredients: Array.isArray(includeIngredients) && includeIngredients.length ? includeIngredients : undefined,
            excludeIngredients: Array.isArray(excludeIngredients) && excludeIngredients.length ? excludeIngredients : undefined,
            categories: dishCategories,
            mealTypes,
            dietaryRestrictions,
            maxTotalTime: (maxPrepTime && maxPrepTime !== 'any') ? Number(maxPrepTime) : undefined,
            count: Math.min(Math.max(1, Number(mealCount) || 7), 12),
          }) }
        ],
        // Ensure Groq Compound tools are enabled
        compound_custom: { tools: { enabled_tools: ['web_search','visit_website'] } },
      })
    });

    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`Groq error: ${resp.status} ${t}`);
    }
    const json: any = await resp.json();
    const text = json?.choices?.[0]?.message?.content || '';
    const parsed = tryParseJson(text);
    const latencyMs = Date.now() - started;

    let recipes: Recipe[] = Array.isArray(parsed?.recipes) ? parsed.recipes : [];
    // sanitize
    recipes = (recipes || []).map((r: any) => {
      const out: Recipe = {
        title: r.title || r.name || 'Untitled',
        description: r.description || '',
        cuisine: r.cuisine,
        source: typeof r.source === 'string' && isValidUrl(r.source) ? r.source : (typeof r.source_url === 'string' && isValidUrl(r.source_url) ? r.source_url : undefined),
        image: typeof r.image === 'string' && isValidUrl(r.image) ? r.image : (typeof r.image_url === 'string' && isValidUrl(r.image_url) ? r.image_url : undefined),
        ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
        instructions: Array.isArray(r.instructions) ? r.instructions : [],
        total_time_minutes: (typeof r.total_time_minutes === 'number' && isFinite(r.total_time_minutes)) ? r.total_time_minutes : undefined,
      };
      return out;
    }).filter(Boolean);

    // Category filter (keyword-based, like recipes-only)
    const wanted = new Set((dishCategories || []).map((s: string) => String(s).toLowerCase()));
    if (wanted.size > 0) {
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
      const isMatch = (rec: Recipe) => {
        const hay = `${rec.title||''} ${rec.description||''} ${rec.cuisine||''}`.toLowerCase();
        for (const cat of wanted) {
          const kws = CATEGORY_KEYWORDS[cat] || [];
          if (kws.some(kw => hay.includes(kw))) return true;
        }
        return wanted.has('other');
      };
      const filtered = recipes.filter(isMatch);
      if (filtered.length) recipes = filtered;
    }

    // Dietary filter
    if ((dietaryRestrictions || []).length) {
      const isVegan = dietaryRestrictions.includes('vegan');
      const isVegetarian = dietaryRestrictions.includes('vegetarian');
      const bannedSet = new Set<string>();
      const ban = (...xs: string[]) => xs.forEach(x => bannedSet.add(x));
      if (isVegan) ban('beef','pork','chicken','lamb','fish','seafood','shrimp','egg','milk','cheese','butter','yogurt','honey','gelatin','lard');
      if (isVegetarian) ban('beef','pork','chicken','lamb','fish','seafood','shrimp','gelatin','lard');
      const ok = (rec: Recipe) => {
        const ing = (rec.ingredients || []).map((x: any) => (x?.item || x?.name || String(x)).toString().toLowerCase());
        for (const b of bannedSet) if (ing.some(n => n.includes(b))) return false;
        return true;
      };
      recipes = recipes.filter(ok);
    }

    // Cultural hard filter
    const synSet = new Set(cultureTerms.map(s => s.toLowerCase()));
    const aaPositive = /(soul\s*food|african[-\s]?american|gullah\s*geechee|southern\s*(black\s*)?cuisine|southern\s*black|black\s*american|southern\s*soul)/i;
    const aaNegative = /\b(haitian|caribbean|jamaican|trinidad|trinidadian|west\s*indies|west\s*indian)\b/i;
    if (cultureTerms.length) {
      recipes = recipes.filter(r => {
        const hay = `${r.title||''} ${r.description||''} ${r.cuisine||''} ${r.source||''}`.toLowerCase();
        let ok = false; for (const t of synSet) { if (t && hay.includes(t)) { ok = true; break; } }
        if (ok && cultureTerms.some(t => /african[-\s]?american|soul\s*food/i.test(t))) {
          if (!aaPositive.test(hay)) return false; if (aaNegative.test(hay)) return false;
        }
        return ok;
      });
    }

    // Time filter
    const tnum = (maxPrepTime && maxPrepTime !== 'any') ? Number(maxPrepTime) : undefined;
    if (Number.isFinite(tnum as number)) {
      const t = tnum as number;
      recipes = recipes.filter(r => {
        const total = Number((r as any).total_time_minutes);
        return !Number.isFinite(total) || total <= t;
      });
    }

    // Build zero result reasons & relaxers if needed
    if (!recipes.length) {
      const reasons: string[] = [];
      if (cultureTerms.length) reasons.push('Selected culture is very specific; try adding a related region.');
      if (Array.isArray(dishCategories) && dishCategories.length) reasons.push('Category + culture combination yielded few results.');
      if (Number.isFinite(tnum as number)) reasons.push(`Time limit (≤ ${tnum} min) may be too strict.`);
      if ((dietaryRestrictions || []).length) reasons.push(`Dietary restrictions (${dietaryRestrictions.join(', ')}) reduced matches.`);
      const relaxers: Array<{ key: string; label: string; patch: any }> = [];
      if ((culturalCuisines || []).some((c: string) => /african[-\s]?american/i.test(c))) {
        relaxers.push({ key: 'add_related_southern_us', label: 'Include related: Southern US', patch: { culturesAppend: ['southern united states','southern cuisine'] } });
      }
      if (Number.isFinite(tnum as number) && (tnum as number) < 60) {
        relaxers.push({ key: 'allow_60_min', label: 'Allow 45–60 min', patch: { maxPrepTime: 60 } });
      }
      if (!Array.isArray(dishCategories) || !dishCategories.includes('side')) {
        relaxers.push({ key: 'include_sides', label: 'Include sides', patch: { categoriesAppend: ['side'] } });
      }
      return NextResponse.json({
        success: true,
        message: 'No matches for filters',
        data: { recipes: [], reasons, relaxers, summary: { totalRecipes: 0, provider: 'groq', latency_ms: latencyMs } },
        timestamp: new Date().toISOString(),
      });
    }

    const out = {
      success: true,
      message: `Generated ${recipes.length} recipes via Groq`,
      data: {
        recipes: recipes.map(r => ({
          title: r.title,
          description: r.description,
          cuisine: r.cuisine,
          sourceUrl: r.source,
          imageUrl: r.image,
          ingredients: r.ingredients,
          instructions: (r.instructions || []).map((st: any, i: number) => (typeof st === 'string' ? { step: i + 1, text: st } : { step: st.step ?? (i + 1), text: st.text || '' })),
          metadata: { totalTime: r.total_time_minutes }
        })),
        summary: { totalRecipes: recipes.length, provider: 'groq', latency_ms: latencyMs }
      },
      timestamp: new Date().toISOString()
    };
    return NextResponse.json(out);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: String(err?.message || err) }, { status: 500 });
  }
}

