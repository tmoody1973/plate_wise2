/**
 * Simple Meal Plan Adapter
 * Uses our existing working WebScraping.AI integration and converts to clean MealPlan format
 */

import { webScrapingAIRecipeScraperService } from './webscraping-ai-recipe-scraper';

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

// ---------- Utility Functions ----------
const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

// Quick heuristic: proteins & specialty items push to "$$"
const estimateCostBand = (ingredients: string[]): CostBand => {
  const pricey = /shrimp|salmon|beef|steak|pork loin|lamb|saffron|pine nuts|prosciutto|halibut|scallops|truffle/i;
  return ingredients.some(i => pricey.test(i)) ? "$$" : "$";
};

// Convert ingredients to key_ingredients format
const convertIngredients = (ingredients: any[]): { ingredient_id: string; display: string; synonyms?: string[] }[] => {
  if (!ingredients || !Array.isArray(ingredients)) return [];
  
  return ingredients.slice(0, 8).map(ingredient => {
    const name = typeof ingredient === 'string' ? ingredient : ingredient.name || 'Unknown ingredient';
    return {
      ingredient_id: slug(name.split(",")[0]),
      display: name.split(",")[0].trim(),
    };
  });
};

// Convert instructions to standard format
const convertInstructions = (instructions: any[]): { step: number; text: string }[] => {
  if (!instructions || !Array.isArray(instructions)) {
    return [{ step: 1, text: "Follow the recipe as described on the source page." }];
  }
  
  return instructions.map((instruction, index) => ({
    step: index + 1,
    text: typeof instruction === 'string' ? instruction : instruction.text || `Step ${index + 1}`
  }));
};

// ---------- Convert Scraped Recipe to MealItem ----------
function convertToMealItem(scrapedData: any, sourceUrl: string, slotIndex: number): MealItem {
  const title = scrapedData.title || "Delicious Recipe";
  const timeMinutes = scrapedData.totalTimeMinutes || 30;
  const servings = scrapedData.servings || 4;
  
  const ingredientStrings = (scrapedData.ingredients || []).map((ing: any) => 
    typeof ing === 'string' ? ing : ing.name || 'ingredient'
  );
  
  return {
    slot_id: `meal-${slotIndex + 1}`,
    recipe_id: slug(`${title}-${sourceUrl}`),
    title,
    culture_tags: scrapedData.culturalOrigin || [scrapedData.cuisine || 'International'],
    time_minutes: timeMinutes,
    servings,
    est_cost_band: estimateCostBand(ingredientStrings),
    key_ingredients: convertIngredients(scrapedData.ingredients),
    subs_tip: undefined,
    diet_flags: undefined,
    instructions: convertInstructions(scrapedData.instructions),
    source: sourceUrl,
    imageUrl: scrapedData.imageUrl
  };
}

// ---------- Public API ----------
export async function buildMealPlanFromUrls(urls: string[]): Promise<MealPlan> {
  console.log(`🔄 Building meal plan from ${urls.length} URLs...`);
  
  const mealPromises = urls.map(async (url, index) => {
    try {
      console.log(`🔍 Scraping recipe ${index + 1}: ${url}`);
      const result = await webScrapingAIRecipeScraperService.scrapeRecipe(url);
      
      if (result.success && result.data) {
        console.log(`✅ Successfully scraped: ${result.data.title}`);
        return convertToMealItem(result.data, url, index);
      } else {
        console.warn(`⚠️ Scraping failed for ${url}: ${result.error}`);
        // Return a fallback meal item
        return {
          slot_id: `meal-${index + 1}`,
          recipe_id: slug(`fallback-${url}`),
          title: "Recipe from " + new URL(url).hostname,
          culture_tags: ['International'],
          time_minutes: 30,
          servings: 4,
          est_cost_band: "$" as CostBand,
          key_ingredients: [],
          instructions: [{ step: 1, text: "Please visit the source website for complete recipe details." }],
          source: url,
          imageUrl: undefined
        };
      }
    } catch (error) {
      console.error(`❌ Error scraping ${url}:`, error);
      // Return a fallback meal item
      return {
        slot_id: `meal-${index + 1}`,
        recipe_id: slug(`error-${url}`),
        title: "Recipe from " + new URL(url).hostname,
        culture_tags: ['International'],
        time_minutes: 30,
        servings: 4,
        est_cost_band: "$" as CostBand,
        key_ingredients: [],
        instructions: [{ step: 1, text: "Please visit the source website for complete recipe details." }],
        source: url,
        imageUrl: undefined
      };
    }
  });

  const meals = await Promise.all(mealPromises);

  const plan: MealPlan = {
    meals_target: meals.length,
    price_confidence: "Medium" as Confidence,
    estimated_total_low: undefined,
    estimated_total_high: undefined,
    meals: meals.filter(Boolean) // Remove any null results
  };

  console.log(`✅ Generated meal plan with ${plan.meals.length} meals`);
  return plan;
}

// ---------- Integration with Enhanced Recipe Search ----------
export async function generateMealPlanFromQuery(
  query: string,
  culturalCuisine?: string,
  numberOfMeals = 3
): Promise<MealPlan> {
  console.log(`🔍 Generating meal plan for: ${query} (${culturalCuisine || 'any cuisine'})`);
  
  // Use our existing enhanced recipe search to get URLs
  const { enhancedRecipeSearchService } = await import('./enhanced-recipe-search');
  
  const searchResult = await enhancedRecipeSearchService.searchRecipes({
    query,
    culturalCuisine,
    maxResults: numberOfMeals
  });
  
  if (searchResult.recipes.length === 0) {
    throw new Error('No recipes found for the given query');
  }
  
  // Extract URLs from the search results
  const urls = searchResult.recipes.map(recipe => recipe.sourceUrl).filter(Boolean);
  console.log(`✅ Found ${urls.length} recipe URLs from enhanced search`);
  
  // Build meal plan from those URLs
  return await buildMealPlanFromUrls(urls);
}