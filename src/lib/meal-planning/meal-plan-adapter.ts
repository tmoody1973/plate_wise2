/**
 * Clean WebScraping.AI to MealPlan Adapter
 * Solves data conversion issues by creating a direct pipeline
 * from recipe URLs to MealPlan format with proper error handling
 */

import { z } from "zod";
import pLimit from "p-limit";

// ---------- Config ----------
const WSAI_KEY = process.env.WEBSCRAPING_AI_API_KEY!;
const WSAI_BASE = "https://api.webscraping.ai/ai/fields";
const CONCURRENCY = 3; // Polite parallelism
const REQUEST_TIMEOUT_MS = 20_000; // HTTP timeout guard
const JS_TIMEOUT_MS = 3_000; // Headless render time
const PAGE_TIMEOUT_MS = 15_000; // Server-side page timeout

// ---------- MealPlan Types ----------
type CostBand = "$" | "$$";
type Confidence = "High" | "Medium" | "Low";

export interface MealItem {
  slot_id: string;
  recipe_id: string;
  title: string;
  culture_tags: string[];
  time_minutes: number;
  servings: number;
  est_cost_band: CostBand;
  key_ingredients: { ingredient_id: string; display: string; synonyms?: string[] }[];
  subs_tip?: string;
  diet_flags?: string[];
  instructions: { step: number; text: string }[];
  source: string;
  imageUrl?: string;
}

export interface MealPlan {
  meals_target: number;
  estimated_total_low?: number;
  estimated_total_high?: number;
  price_confidence?: Confidence;
  meals: MealItem[];
  notes?: string[];
}

// ---------- Robust WebScraping.AI Schema (Tolerant Ingestion) ----------

/** Helper schemas for tolerant parsing */
const strNullish = z.string().transform(s => s?.trim?.() ?? s).nullish();
const httpsUrlNullish = z.string().url().nullish();
const toUndefined = <T>(schema: z.ZodType<T>) =>
  schema.nullish().transform(v => (v == null ? undefined : (v as T)));

const numberFromNumOrString = z.union([
  z.number(),
  z.string().transform(s => {
    const n = Number(String(s).trim());
    return Number.isFinite(n) ? n : NaN;
  })
]).refine(v => Number.isFinite(v), { message: "not a number" });

/** WebScraping.AI loose response schema (accepts nulls/empties) */
const WsaiLoose = z.object({
  title: strNullish,
  ingredients: z
    .union([
      z.array(strNullish),
      z.array(z.object({
        name: strNullish,
        amount: toUndefined(numberFromNumOrString),
        unit: strNullish
      }))
    ])
    .nullish(),
  instructions: z.union([strNullish, z.array(strNullish)]).nullish(),
  servings: z.union([numberFromNumOrString, strNullish]).nullish(),
  yieldText: strNullish,
  imageUrl: httpsUrlNullish.or(z.string().nullish()),
  "image-url": httpsUrlNullish.or(z.string().nullish()),
  sourceUrl: httpsUrlNullish.or(z.string().nullish()),
  "recipe url": httpsUrlNullish.or(z.string().nullish()),
  totalTimeMinutes: toUndefined(numberFromNumOrString),
  cuisine: strNullish,
  culturalOrigin: z.array(strNullish).nullish()
}).passthrough();

type WsaiLooseType = z.infer<typeof WsaiLoose>;

// ---------- Normalization Functions ----------

function asArray(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String).map(s => s.trim()).filter(Boolean);
  return String(v).split(/\r?\n|,|•|·|- /g).map(s => s.trim()).filter(Boolean);
}

function normalizeInstructions(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String).map(s => s.trim()).filter(Boolean);
  return String(v)
    .split(/\n+|(?<=\.)\s+(?=[A-Z])/g)
    .map(s => s.trim())
    .filter(Boolean);
}

function firstHttps(...urls: Array<string | undefined | null>): string | undefined {
  for (const u of urls) {
    if (!u) continue;
    try {
      const url = new URL(u, "https://");
      url.protocol = "https:";
      return url.toString();
    } catch {}
  }
  return undefined;
}

function normalizeWsai(raw: WsaiLooseType) {
  const title = raw.title ?? "Untitled recipe";

  // ingredients → strings
  const ingredients: string[] = Array.isArray(raw.ingredients)
    ? (typeof raw.ingredients[0] === "string" || raw.ingredients[0] == null
        ? asArray(raw.ingredients)
        : (raw.ingredients as any[]).map(o =>
            [o.amount, o.unit, o.name].filter(Boolean).join(" ").trim()
          ).filter(Boolean))
    : [];

  // time, servings with safe fallbacks
  const time_minutes =
    typeof raw.totalTimeMinutes === "number" && raw.totalTimeMinutes > 0
      ? raw.totalTimeMinutes
      : 30;

  const servings =
    typeof raw.servings === "number" && raw.servings > 0
      ? Math.floor(raw.servings)
      : (() => {
          const m = String(raw.servings ?? "").match(/\d+/);
          return m ? Math.max(1, parseInt(m[0], 10)) : 4;
        })();

  const instructions = normalizeInstructions(raw.instructions);
  const imageUrl = firstHttps(raw.imageUrl as any, (raw as any)["image-url"]);
  const source = firstHttps(raw.sourceUrl as any, (raw as any)["recipe url"]);

  const culture_tags =
    (raw.culturalOrigin?.filter(Boolean) as string[] | undefined)?.filter(Boolean) ??
    (raw.cuisine ? [raw.cuisine] : []);

  return {
    title,
    ingredients,
    time_minutes,
    servings,
    instructions: instructions.length
      ? instructions
      : ["Follow the steps on the source page."],
    imageUrl,
    source,
    culture_tags
  };
}

// ---------- Utility Functions ----------
const abortableFetch = async (url: string, opts: RequestInit, ms: number) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  
  try {
    const response = await fetch(url, { ...opts, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

const toAbsoluteHttps = (url?: string, fallback?: string) => {
  try {
    if (!url) return fallback;
    const urlObj = new URL(url, fallback);
    if (urlObj.protocol !== "https:") urlObj.protocol = "https:";
    return urlObj.toString();
  } catch {
    return fallback;
  }
};

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

// Quick heuristic: proteins & specialty items push to "$$"
const estimateCostBand = (ingredients: string[]): CostBand => {
  const pricey = /shrimp|salmon|beef|steak|pork loin|lamb|saffron|pine nuts|prosciutto|halibut|scallops|mafaldine/i;
  return ingredients.some(i => pricey.test(i)) ? "$$" : "$";
};

// Normalize ingredients into key_ingredients[]
const normalizeIngredients = (ingredients: string[]): { ingredient_id: string; display: string; synonyms?: string[] }[] => {
  return ingredients.slice(0, 8).map(name => ({
    ingredient_id: slug(name.split(",")[0]),
    display: name.split(",")[0].trim(),
  }));
};

const splitInstructions = (instructions?: string | string[]): string[] => {
  if (!instructions) return [];
  if (Array.isArray(instructions)) return instructions.filter(Boolean).map(s => s.trim());
  
  // Split on numbered steps or periods; keep it simple and safe
  const parts = instructions.split(/\n+|(?<=\.)\s+(?=[A-Z])/g).map(s => s.trim()).filter(Boolean);
  return parts;
};

// ---------- WebScraping.AI Recipe Scraper ----------
async function scrapeRecipe(url: string): Promise<unknown> {
  const fields = {
    // titles: take Recipe.name/headline OR page/H1/OG
    title: "Recipe title if present (Schema.org Recipe.name or headline); else main page title/H1/og:title in short form.",
    // ingredients: accept either array (preferred) or raw text we can split
    ingredients: "Ingredients as an array of strings if possible (Schema.org recipeIngredient); else a single text block with one ingredient per line/bullet.",
    // instructions: array of steps preferred; else raw text we can split
    instructions: "Recipe instructions as an array of strings (Schema.org recipeInstructions or HowToStep.text); else a single text block.",
    // servings/yield
    servings: "Recipe servings as an integer parsed from recipeYield or page; if range, return the lower bound.",
    yieldText: "Original yield text (e.g., 'Serves 4', '10 tacos').",
    // canonical + OG
    sourceUrl: "Canonical URL from <link rel='canonical'>; else final resolved URL.",
    imageUrl: "Main recipe image from Open Graph (og:image) as an absolute HTTPS URL.",
    // helpful extras when present
    totalTimeMinutes: "Total time in minutes if available (Schema.org totalTime).",
    cuisine: "Recipe cuisine if stated.",
    culturalOrigin: "Array of cultural origins if stated."
  };

  const queryParams = new URLSearchParams({
    api_key: WSAI_KEY,
    url,
    timeout: String(PAGE_TIMEOUT_MS),
    js: "true",
    js_timeout: String(JS_TIMEOUT_MS),
    fields: JSON.stringify(fields),
    format: "json"
  });

  const response = await abortableFetch(`${WSAI_BASE}?${queryParams.toString()}`, {}, REQUEST_TIMEOUT_MS);
  
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`WebScraping.AI error ${response.status}: ${body.slice(0, 200)}`);
  }
  
  const json = await response.json();
  console.log('🔍 WebScraping.AI raw response:', JSON.stringify(json, null, 2));
  
  // Extract data from the result wrapper
  const resultData = json.result || json;
  
  // Return raw data for robust parsing in toMealItem
  console.log('✅ WebScraping.AI extracted data:', JSON.stringify(resultData, null, 2));
  return resultData;
}

// ---------- Convert to MealItem ----------
function toMealItem(rawJson: unknown, originalUrl: string, slotIndex: number): MealItem {
  // Step 1: Tolerant parsing (accepts nulls/empties)
  const loose = WsaiLoose.parse(rawJson);
  
  // Step 2: Normalize to clean values
  const normalized = normalizeWsai(loose);
  
  // Step 3: Build MealItem with safe defaults
  const key_ingredients = normalized.ingredients.slice(0, 8).map(s => {
    const base = s.split(",")[0].trim();
    return { 
      ingredient_id: slug(base), 
      display: base 
    };
  });

  const meal: MealItem = {
    slot_id: `d${slotIndex + 1}`,
    recipe_id: slug(`${normalized.title}-${normalized.source ?? originalUrl}`),
    title: normalized.title,
    culture_tags: normalized.culture_tags,
    time_minutes: normalized.time_minutes,
    servings: normalized.servings,
    est_cost_band: estimateCostBand(normalized.ingredients),
    key_ingredients,
    subs_tip: undefined,
    diet_flags: undefined,
    instructions: normalized.instructions.map((text, i) => ({ step: i + 1, text })),
    source: normalized.source || originalUrl,
    imageUrl: normalized.imageUrl
  };

  return meal;
}

// ---------- Public API ----------
export async function buildMealPlanFromUrls(urls: string[], mealsTarget = urls.length): Promise<MealPlan> {
  if (!WSAI_KEY) {
    throw new Error("WEBSCRAPING_AI_API_KEY environment variable is required");
  }

  const limit = pLimit(CONCURRENCY);
  const tasks = urls.slice(0, mealsTarget).map((url, index) =>
    limit(async () => {
      // Simple retry with jitter
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const rawData = await scrapeRecipe(url);
          return toMealItem(rawData, url, index);
        } catch (error) {
          if (attempt === 3) throw error;
          // Wait with jitter before retry
          await new Promise(resolve => setTimeout(resolve, 250 * attempt + Math.random() * 200));
        }
      }
    })
  );

  const meals = await Promise.all(tasks) as MealItem[];

  // You can plug in live/local pricing later; for now we leave totals undefined
  const plan: MealPlan = {
    meals_target: meals.length,
    price_confidence: undefined,
    estimated_total_low: undefined,
    estimated_total_high: undefined,
    meals
  };

  return plan;
}

// ---------- Helper: Get Recipe URLs from Perplexity ----------
export async function getRecipeUrlsFromPerplexity(
  query: string, 
  culturalCuisine?: string, 
  maxResults = 3
): Promise<string[]> {
  const perplexityKey = process.env.PERPLEXITY_API_KEY;
  if (!perplexityKey) {
    throw new Error("PERPLEXITY_API_KEY environment variable is required");
  }

  const searchQuery = culturalCuisine 
    ? `${query} ${culturalCuisine} recipe site:allrecipes.com OR site:bonappetit.com OR site:foodnetwork.com OR site:seriouseats.com`
    : `${query} recipe site:allrecipes.com OR site:bonappetit.com OR site:foodnetwork.com OR site:seriouseats.com`;

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${perplexityKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        {
          role: "system",
          content: "You are a recipe URL finder. Return only the URLs of high-quality recipe pages, one per line. Focus on reputable cooking websites."
        },
        {
          role: "user",
          content: `Find ${maxResults} recipe URLs for: ${searchQuery}`
        }
      ],
      max_tokens: 500,
      temperature: 0.1,
      search_context_size: "medium" // Balanced search depth
    })
  });

  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  
  // Extract URLs from the response
  const urlPattern = /https?:\/\/[^\s<>"]+/g;
  const urls = content.match(urlPattern) || [];
  
  return urls.slice(0, maxResults);
}

// ---------- Complete Pipeline ----------
export async function generateMealPlanFromQuery(
  query: string,
  culturalCuisine?: string,
  numberOfMeals = 3
): Promise<MealPlan> {
  console.log(`🔍 Generating meal plan for: ${query} (${culturalCuisine || 'any cuisine'})`);
  
  // Step 1: Get recipe URLs from Perplexity
  const urls = await getRecipeUrlsFromPerplexity(query, culturalCuisine, numberOfMeals);
  console.log(`✅ Found ${urls.length} recipe URLs`);
  
  // Step 2: Scrape and convert to meal plan
  const mealPlan = await buildMealPlanFromUrls(urls, numberOfMeals);
  console.log(`✅ Generated meal plan with ${mealPlan.meals.length} meals`);
  
  return mealPlan;
}