/**
 * Clean Meal Planner with Perplexity AI Integration (Stage 1)
 * Stage 1: Uses Perplexity AI to discover real recipe URLs
 * Stage 2: Will use WebScraping.AI to extract recipe data from URLs
 */

import { promises as fs } from "fs";
import { basename } from "path";
import { config } from "dotenv";
import type { MealItem } from "./meal-plan-adapter"; // only need the type
import { perplexityRecipeUrlService, type PerplexityRecipeUrlRequest } from "./perplexity-recipe-urls";
import { aiFields, htmlJsonLdFallback, type RecipeData } from "../integrations/webscraping";
import { webScrapingHtmlService } from "../integrations/webscraping-html";
import { fastRecipeExtractor } from "../integrations/fast-recipe-extractor";
import { perplexityRecipeExtractor } from "../integrations/perplexity-recipe-extractor";
import { instacartPricingService } from "../integrations/instacart-pricing";

// Load environment variables from .env.local
config({ path: '.env.local' });

export interface CleanMealPlanRequest {
  weeklyBudget?: number;
  numberOfMeals?: number;
  mealsTarget?: number; // Alternative name for numberOfMeals
  culturalCuisines?: string[];
  cultureTags?: string[]; // Alternative name for culturalCuisines
  householdSize?: number;
  location?: string;
  dietaryRestrictions?: string[];
  dietFlags?: string[]; // Alternative name for dietaryRestrictions
  preferredStores?: any[];
  maxTime?: number;
  pantry?: string[];
  exclude?: string[];
  dishCategories?: string[];
  country?: string;
  language?: string;
}

export interface CleanMealPlanResponse {
  success: boolean;
  recipes: CleanMealPlanRecipe[];
  totalCost: number;
  confidence: "high" | "medium" | "low";
  budgetUtilization?: number;
}

export interface CleanMealPlanRecipe {
  id: string;
  title: string;
  description?: string;
  cuisine: string;
  sourceUrl: string;
  imageUrl?: string;
  totalTimeMinutes: number;
  servings: number;
  ingredients: CleanIngredient[];
  instructions: CleanInstruction[];
  estimatedCost?: number;
  costPerServing?: number;
}

export interface CleanIngredient {
  name: string;
  amount?: number;
  unit?: string;
  estimatedCost?: number;
  notes?: string;
}

export interface CleanInstruction {
  step: number;
  text: string;
  timing?: string;
}

class CleanMealPlannerService {
  /**
   * Generate a meal plan (mock recipes if scraping keys are not wired yet)
   */
  async generateMealPlan(request: CleanMealPlanRequest): Promise<CleanMealPlanResponse> {
    try {
      console.log("🍽️ Starting clean meal plan generation:", request);

      // Normalize request properties
      const normalizedRequest = {
        ...request,
        numberOfMeals: request.numberOfMeals || request.mealsTarget || 1,
        culturalCuisines: request.culturalCuisines || request.cultureTags || ["Mexican"],
        dietaryRestrictions: request.dietaryRestrictions || request.dietFlags || [],
        householdSize: request.householdSize || 4,
      };

      // Step 1: Use Perplexity AI to discover real recipe URLs
      const perplexityRequest: PerplexityRecipeUrlRequest = {
        numberOfMeals: normalizedRequest.numberOfMeals,
        culturalCuisines: normalizedRequest.culturalCuisines,
        dietaryRestrictions: normalizedRequest.dietaryRestrictions,
        maxTime: normalizedRequest.maxTime,
        pantry: normalizedRequest.pantry,
        exclude: normalizedRequest.exclude,
        dishCategories: normalizedRequest.dishCategories,
        country: normalizedRequest.country,
        language: normalizedRequest.language,
      };

      const recipeUrlResponse = await perplexityRecipeUrlService.getRecipeUrls(perplexityRequest);
      console.log("🔍 Perplexity recipe discovery:", {
        success: recipeUrlResponse.success,
        recipesFound: recipeUrlResponse.recipes.length,
        confidence: recipeUrlResponse.confidence
      });

      // Step 2: Extract real recipe data using WebScraping.AI (Stage 2)
      const recipes = await this.extractRecipeDataFromUrls(recipeUrlResponse, normalizedRequest);
      console.log("✅ Generated meal plan with real recipe data:", {
        recipesGenerated: recipes.length,
        hasIngredients: recipes.every(r => r.ingredients.length > 0),
        hasInstructions: recipes.every(r => r.instructions.length > 0),
        realDataExtracted: recipes.filter(r => r.id.startsWith('scraped-')).length
      });

      // Step 3: Get real pricing from Instacart and compute costs/budget
      console.log("💰 Step 3: Getting real ingredient pricing...");
      
      const withCosts = await Promise.all(recipes.map(async (r) => {
        try {
          // Get real pricing for recipe ingredients
          const recipeIngredients = r.ingredients.map(ing => ({
            name: ing.name,
            amount: ing.amount || 1,
            unit: ing.unit || 'each'
          }));

          const costAnalysis = await instacartPricingService.calculateRecipeCost(recipeIngredients);
          
          console.log(`💰 Real pricing for ${r.title}:`, {
            totalCost: costAnalysis.totalCost,
            costPerServing: costAnalysis.costPerServing,
            highConfidenceItems: costAnalysis.ingredientCosts.filter(item => item.confidence === 'high').length
          });

          // Update ingredient costs with real pricing
          const updatedIngredients = r.ingredients.map(ing => {
            const pricingInfo = costAnalysis.ingredientCosts.find(cost => 
              cost.ingredient.toLowerCase().includes(ing.name.toLowerCase()) ||
              ing.name.toLowerCase().includes(cost.ingredient.toLowerCase())
            );
            
            return {
              ...ing,
              estimatedCost: pricingInfo?.unitPrice || ing.estimatedCost || 0,
              realPricing: !!pricingInfo,
              confidence: pricingInfo?.confidence || 'estimated'
            };
          });

          return { 
            ...r, 
            ingredients: updatedIngredients,
            estimatedCost: costAnalysis.totalCost,
            costPerServing: costAnalysis.costPerServing,
            realPricing: true,
            budgetOptimization: costAnalysis.savings
          };
        } catch (pricingError) {
          console.warn(`⚠️ Pricing failed for ${r.title}, using estimates:`, pricingError);
          
          // Fallback to estimated pricing
          const estimatedCost = r.ingredients.reduce((s, ing) => s + (ing.estimatedCost || 0), 0);
          const costPerServing = estimatedCost / Math.max(1, r.servings);
          return { ...r, estimatedCost, costPerServing, realPricing: false };
        }
      }));
      const totalCost = withCosts.reduce((s, r) => s + (r.estimatedCost || 0), 0);
      const budgetUtilization = normalizedRequest.weeklyBudget
        ? (totalCost / normalizedRequest.weeklyBudget) * 100
        : undefined;

      console.log("✅ Generated meal plan:", {
        mealsGenerated: withCosts.length,
        hasIngredients: withCosts.every(m => m.ingredients.length > 0), // fixed: no key_ingredients
        hasInstructions: withCosts.every(m => m.instructions.length > 0),
      });

      return {
        success: true,
        recipes: withCosts,
        totalCost,
        confidence: this.calculateOverallConfidence(recipeUrlResponse.confidence, withCosts.length, normalizedRequest.numberOfMeals),
        budgetUtilization,
      };
    } catch (err) {
      console.error("❌ Clean meal plan generation failed:", err);
      return { success: false, recipes: [], totalCost: 0, confidence: "low" };
    }
  }

  /** Build simple, diverse queries per cuisine (for Stage 1 later) */
  private generateRecipeQueries(request: CleanMealPlanRequest): string[] {
    const queries: string[] = [];
    const cuisines = request.culturalCuisines?.length ? request.culturalCuisines : ["Mexican", "Italian"];
    const numberOfMeals = request.numberOfMeals || 1;

    for (let i = 0; i < numberOfMeals; i++) {
      const cuisine = cuisines[i % cuisines.length];
      const queryTypes = [
        `authentic ${cuisine} main dish recipe`,
        `traditional ${cuisine} soup recipe`,
        `popular ${cuisine} chicken recipe`,
        `easy ${cuisine} vegetable recipe`,
        `${cuisine} rice recipe`,
        `${cuisine} seafood recipe`,
      ];
      const query = queryTypes[i % queryTypes.length];
      if (query) {
        queries.push(query);
      }
    }
    return queries;
  }

  /** Helpers to convert from a MealItem (when your adapter is wired) */
  private convertMealItemsToRecipes(mealItems: MealItem[], request: CleanMealPlanRequest): CleanMealPlanRecipe[] {
    return mealItems.map(item => {
      const ingredients: CleanIngredient[] = (item.key_ingredients || []).map(ing => ({
        name: ing.display,
        estimatedCost: this.estimateIngredientCost(ing.display, request.location),
      }));
      const instructions: CleanInstruction[] = (item.instructions || []).map(inst => ({
        step: inst.step,
        text: inst.text,
        timing: this.extractTimingFromInstruction(inst.text),
      }));
      const estimatedCost = ingredients.reduce((sum, ing) => sum + (ing.estimatedCost || 0), 0);
      const costPerServing = estimatedCost / Math.max(1, item.servings);
      return {
        id: item.recipe_id,
        title: item.title,
        description: `Delicious ${item.culture_tags?.join(", ") || "home"} recipe`,
        cuisine: item.culture_tags?.[0] || "International",
        sourceUrl: item.source || "https://example.com/recipe",
        imageUrl: item.imageUrl,
        totalTimeMinutes: item.time_minutes || 30,
        servings: Math.max(1, item.servings || request.householdSize || 4),
        ingredients,
        instructions,
        estimatedCost,
        costPerServing,
      };
    });
  }

  private estimateIngredientCost(ingredientName: string, _location?: string): number {
    const n = ingredientName.toLowerCase();
    if (/(beef|chicken|pork|lamb|turkey|meat)\b/.test(n)) return 8.0;
    if (/(salmon|shrimp|fish|tuna)\b/.test(n)) return 12.0;
    if (/(cheese|butter|cream)\b/.test(n)) return 4.0;
    if (/(onion|carrot|pepper|tomato|vegetable|veggie)/.test(n)) return 2.0;
    if (/(spice|salt|pepper|herb)/.test(n)) return 1.0;
    return 3.0;
  }

  private extractTimingFromInstruction(text: string): string | undefined {
    const m = text.match(/(\d+)\s*(minutes?|mins?|hours?|hrs?)/i);
    return m ? m[0] : undefined;
  }

  /** Estimate ingredient cost based on name and amount */
  private estimateIngredientCostWithAmount(name: string, amount: number): number {
    const costPerUnit: { [key: string]: number } = {
      'chicken': 6.0,
      'beef': 8.0,
      'pork': 7.0,
      'fish': 8.0,
      'salmon': 10.0,
      'shrimp': 12.0,
      'cheese': 4.0,
      'milk': 3.0,
      'butter': 4.0,
      'oil': 3.0,
      'rice': 1.5,
      'pasta': 2.0,
      'bread': 2.5,
      'onion': 1.0,
      'garlic': 0.5,
      'tomato': 2.0,
      'pepper': 2.5,
      'beans': 1.5,
      'corn': 1.5,
      'flour': 1.0,
      'sugar': 1.0,
      'salt': 0.25,
      'spice': 0.5,
      'herb': 1.0
    };

    // Find matching ingredient category
    const lowerName = name.toLowerCase();
    for (const [category, basePrice] of Object.entries(costPerUnit)) {
      if (lowerName.includes(category)) {
        return Math.round((amount * basePrice) * 100) / 100;
      }
    }

    // Default cost for unknown ingredients
    return Math.round((amount * 2.0) * 100) / 100;
  }

  /** Extract real recipe data from Perplexity URLs using WebScraping.AI (Stage 2) */
  private async extractRecipeDataFromUrls(
    urlResponse: any,
    request: CleanMealPlanRequest
  ): Promise<CleanMealPlanRecipe[]> {
    if (!urlResponse.success || !urlResponse.recipes || urlResponse.recipes.length === 0) {
      console.log("🔄 Perplexity failed, falling back to cultural mock recipes");
      return this.generateCulturalMockRecipes(request, []);
    }

    console.log("🧠 Stage 2: Perplexity-only extraction with caching...");

    // Extract all recipes using Perplexity-only extractor (faster and more reliable)
    const urls = urlResponse.recipes.map((recipe: any) => recipe.url);
    const extractionResults = await perplexityRecipeExtractor.extractMultipleRecipes(urls, 2);

    console.log("✅ Perplexity extraction completed:", {
      totalRecipes: extractionResults.length,
      methods: extractionResults.reduce((acc, result) => {
        acc[result.extractionMethod] = (acc[result.extractionMethod] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    });

    // Process extraction results
    const scrapingPromises = extractionResults.map(async (extractionResult, index: number) => {
      const perplexityRecipe = urlResponse.recipes[index];
      try {
        console.log(`🔍 Processing recipe ${index + 1}: ${perplexityRecipe.title} (${extractionResult.extractionMethod})`);

        const recipeData = extractionResult;

        if (recipeData && (recipeData.ingredients?.length > 0 || recipeData.instructions?.length > 0)) {
          console.log(`✅ Successfully processed data for ${perplexityRecipe.title}:`, {
            hasIngredients: !!recipeData.ingredients,
            ingredientsCount: recipeData.ingredients?.length || 0,
            hasInstructions: !!recipeData.instructions,
            instructionsCount: recipeData.instructions?.length || 0,
            method: recipeData.extractionMethod
          });
          // Convert extracted data to our format
          return this.convertWebScrapingDataToRecipe(recipeData, perplexityRecipe, request, index);
        } else {
          console.warn(`⚠️ No usable data extracted for ${perplexityRecipe.title}, using fallback`);
          // Fallback to Perplexity metadata with generated ingredients
          return this.convertPerplexityRecipeToFallback(perplexityRecipe, request, index);
        }
      } catch (error) {
        console.error(`❌ Error scraping ${perplexityRecipe.title}:`, error);
        // Fallback to Perplexity metadata with generated ingredients
        return this.convertPerplexityRecipeToFallback(perplexityRecipe, request, index);
      }
    });

    // Wait for all scraping operations to complete
    const results = await Promise.allSettled(scrapingPromises);

    // Extract successful results
    const recipes = results
      .filter((result): result is PromiseFulfilledResult<CleanMealPlanRecipe> =>
        result.status === 'fulfilled'
      )
      .map(result => result.value);

    console.log(`✅ Stage 2 complete: ${recipes.length} recipes processed`);
    return recipes;
  }

  /** Convert new WebScraping data to our clean format */
  private convertWebScrapingDataToRecipe(
    recipeData: Partial<RecipeData>,
    perplexityRecipe: any,
    request: CleanMealPlanRequest,
    index: number
  ): CleanMealPlanRecipe {
    // Convert ingredients to our format
    let ingredients: CleanIngredient[] = [];

    if (recipeData.ingredients) {
      if (Array.isArray(recipeData.ingredients)) {
        ingredients = recipeData.ingredients.map(ingredientText =>
          this.parseIngredientFromText(ingredientText)
        );
      } else if (typeof recipeData.ingredients === 'string') {
        // Split string ingredients by lines
        const ingredientLines = recipeData.ingredients
          .split(/\n|;|\*|•|-/)
          .map(line => line.trim())
          .filter(line => line.length > 0);

        ingredients = ingredientLines.map(ingredientText =>
          this.parseIngredientFromText(ingredientText)
        );
      }
    }

    // Fallback to generated ingredients if none found
    if (ingredients.length === 0) {
      console.log(`⚠️ No ingredients parsed for ${perplexityRecipe.title}, using fallback`);
      ingredients = this.generateIngredientsForCuisine(perplexityRecipe.cuisine, request);
    }

    // Convert instructions to our format
    let instructions: CleanInstruction[] = [];

    if (recipeData.instructions) {
      if (Array.isArray(recipeData.instructions)) {
        instructions = recipeData.instructions.map((instructionText, idx) => ({
          step: idx + 1,
          text: instructionText,
          timing: this.extractTimingFromInstruction(instructionText)
        }));
      } else if (typeof recipeData.instructions === 'string') {
        // Split string instructions by lines or steps
        const instructionLines = recipeData.instructions
          .split(/\n|\d+\./)
          .map(line => line.trim())
          .filter(line => line.length > 0);

        instructions = instructionLines.map((instructionText, idx) => ({
          step: idx + 1,
          text: instructionText,
          timing: this.extractTimingFromInstruction(instructionText)
        }));
      }
    }

    // Fallback to generated instructions if none found
    if (instructions.length === 0) {
      instructions = this.generateInstructionsForCuisine(
        perplexityRecipe.cuisine,
        recipeData.title || perplexityRecipe.title
      );
    }

    // Parse servings
    let servings = request.householdSize || 4;
    if (recipeData.servings) {
      if (typeof recipeData.servings === 'number') {
        servings = recipeData.servings;
      } else if (typeof recipeData.servings === 'string') {
        const parsed = parseInt(recipeData.servings.match(/\d+/)?.[0] || '4');
        servings = parsed || 4;
      }
    }

    return {
      id: `scraped-recipe-${index + 1}`,
      title: recipeData.title || perplexityRecipe.title,
      description: perplexityRecipe.description,
      cuisine: perplexityRecipe.cuisine,
      sourceUrl: recipeData.sourceUrl || perplexityRecipe.url,
      imageUrl: recipeData.imageUrl,
      totalTimeMinutes: recipeData.totalTimeMinutes || perplexityRecipe.estimatedTime || 30,
      servings,
      ingredients,
      instructions,
    };
  }

  /** Parse ingredient from text string */
  private parseIngredientFromText(ingredientText: string): CleanIngredient {
    // Simple ingredient parsing - extract amount, unit, and name
    const match = ingredientText.match(/^([0-9\/\.\s]+)?\s*([a-zA-Z]+)?\s*(.+)$/);

    if (match) {
      const [, amountStr, unit, name] = match;
      const amount = this.parseAmount(amountStr?.trim() || '1');
      const cleanName = name?.trim() || ingredientText.trim();

      return {
        name: cleanName,
        amount,
        unit: unit?.trim() || 'piece',
        estimatedCost: this.estimateIngredientCost(cleanName, amount),
      };
    }

    // Fallback for unparseable ingredients
    return {
      name: ingredientText.trim(),
      amount: 1,
      unit: 'piece',
      estimatedCost: this.estimateIngredientCost(ingredientText.trim(), 1),
    };
  }

  /** Parse amount from string (handles fractions) */
  private parseAmount(amountStr: string): number {
    if (!amountStr) return 1;

    // Handle fractions like "1/2", "1 1/2"
    if (amountStr.includes('/')) {
      const parts = amountStr.split(' ');
      let total = 0;

      for (const part of parts) {
        if (part.includes('/')) {
          const [num, den] = part.split('/');
          total += parseInt(num) / parseInt(den);
        } else {
          total += parseFloat(part) || 0;
        }
      }

      return total || 1;
    }

    return parseFloat(amountStr) || 1;
  }

  /** Fallback conversion when scraping fails */
  private convertPerplexityRecipeToFallback(
    perplexityRecipe: any,
    request: CleanMealPlanRequest,
    index: number
  ): CleanMealPlanRecipe {
    const ingredients = this.generateIngredientsForCuisine(perplexityRecipe.cuisine, request);
    const instructions = this.generateInstructionsForCuisine(perplexityRecipe.cuisine, perplexityRecipe.title);

    return {
      id: `perplexity-recipe-${index + 1}`,
      title: perplexityRecipe.title,
      description: perplexityRecipe.description,
      cuisine: perplexityRecipe.cuisine,
      sourceUrl: perplexityRecipe.url,
      imageUrl: undefined,
      totalTimeMinutes: perplexityRecipe.estimatedTime || 30,
      servings: request.householdSize || 4,
      ingredients,
      instructions,
    };
  }

  /** Convert Perplexity recipe URL results to our recipe format (Stage 1 only) */
  private convertPerplexityResultsToRecipes(
    urlResponse: any,
    request: CleanMealPlanRequest
  ): CleanMealPlanRecipe[] {


    if (!urlResponse.success || !urlResponse.recipes || urlResponse.recipes.length === 0) {
      console.log("🔄 Perplexity failed, falling back to cultural mock recipes");
      return this.generateCulturalMockRecipes(request, []);
    }

    const perplexityRecipes = urlResponse.recipes.map((recipe: any, index: number) => {
      // Generate culturally appropriate ingredients based on the recipe info
      const ingredients = this.generateIngredientsForCuisine(recipe.cuisine, request);
      const instructions = this.generateInstructionsForCuisine(recipe.cuisine, recipe.title);

      return {
        id: `perplexity-recipe-${index + 1}`,
        title: recipe.title,
        description: recipe.description,
        cuisine: recipe.cuisine,
        sourceUrl: recipe.url,
        imageUrl: undefined,
        totalTimeMinutes: recipe.estimatedTime || 30,
        servings: request.householdSize || 4,
        ingredients,
        instructions,
      };
    });



    return perplexityRecipes;
  }

  /** Generate ingredients based on cuisine type */
  private generateIngredientsForCuisine(cuisine: string, request: CleanMealPlanRequest): CleanIngredient[] {
    const isHalal = request.dietaryRestrictions?.includes("halal_friendly") || false;

    if (cuisine.toLowerCase().includes('mexican')) {
      return [
        { name: "Chicken thighs", amount: 2, unit: "lbs", estimatedCost: 8.0 },
        { name: "Corn tortillas", amount: 12, unit: "pieces", estimatedCost: 2.0 },
        { name: "Chipotle peppers in adobo", amount: 3, unit: "pieces", estimatedCost: 1.5 },
        { name: "White onion", amount: 1, unit: "medium", estimatedCost: 0.75 },
        { name: "Roma tomatoes", amount: 2, unit: "medium", estimatedCost: 1.5 },
        { name: "Mexican crema", amount: 0.5, unit: "cup", estimatedCost: 2.0 },
        { name: "Fresh cilantro", amount: 1, unit: "bunch", estimatedCost: 1.0 },
      ];
    } else if (cuisine.toLowerCase().includes('west african') || cuisine.toLowerCase().includes('african')) {
      return [
        { name: "Jasmine rice", amount: 2, unit: "cups", estimatedCost: 2.0 },
        { name: "Chicken drumsticks", amount: 6, unit: "pieces", estimatedCost: 6.0 },
        { name: "Tomato paste", amount: 3, unit: "tbsp", estimatedCost: 1.0 },
        { name: "Bell peppers", amount: 2, unit: "medium", estimatedCost: 2.0 },
        { name: "Scotch bonnet pepper", amount: 1, unit: "small", estimatedCost: 0.5 },
        { name: "Chicken stock", amount: 3, unit: "cups", estimatedCost: 1.5 },
        { name: "Curry powder", amount: 2, unit: "tsp", estimatedCost: 0.5 },
      ];
    } else {
      // Default ingredients for other cuisines
      return [
        { name: "Chicken breast", amount: 1.5, unit: "lbs", estimatedCost: 7.0 },
        { name: "Rice", amount: 1.5, unit: "cups", estimatedCost: 1.5 },
        { name: "Mixed vegetables", amount: 2, unit: "cups", estimatedCost: 3.0 },
        { name: "Olive oil", amount: 2, unit: "tbsp", estimatedCost: 0.5 },
        { name: "Garlic", amount: 3, unit: "cloves", estimatedCost: 0.25 },
        { name: "Onion", amount: 1, unit: "medium", estimatedCost: 0.75 },
      ];
    }
  }

  /** Generate instructions based on cuisine type */
  private generateInstructionsForCuisine(cuisine: string, title: string): CleanInstruction[] {
    if (cuisine.toLowerCase().includes('mexican')) {
      return [
        { step: 1, text: "Season chicken thighs with salt and pepper, then sear in a hot skillet until golden." },
        { step: 2, text: "Add diced onions and cook until softened, about 5 minutes." },
        { step: 3, text: "Blend tomatoes with chipotle peppers and adobo sauce until smooth." },
        { step: 4, text: "Pour sauce over chicken, cover and simmer for 25 minutes until tender." },
        { step: 5, text: "Shred chicken with two forks and mix with the sauce." },
        { step: 6, text: "Warm tortillas and serve with chicken, crema, and fresh cilantro." },
      ];
    } else if (cuisine.toLowerCase().includes('west african') || cuisine.toLowerCase().includes('african')) {
      return [
        { step: 1, text: "Season chicken with salt, pepper, and curry powder. Brown in oil until golden." },
        { step: 2, text: "Remove chicken and sauté diced onions and bell peppers until soft." },
        { step: 3, text: "Add tomato paste and cook for 2 minutes until darkened." },
        { step: 4, text: "Add rice, stirring to coat with the tomato mixture." },
        { step: 5, text: "Pour in hot chicken stock, add scotch bonnet pepper whole." },
        { step: 6, text: "Return chicken to pot, cover and simmer for 20 minutes until rice is tender." },
      ];
    } else {
      return [
        { step: 1, text: "Heat olive oil in a large skillet over medium-high heat." },
        { step: 2, text: "Add diced onion and garlic, cook until fragrant, about 2 minutes." },
        { step: 3, text: "Add chicken and cook until browned on all sides." },
        { step: 4, text: "Add rice and vegetables, stir to combine." },
        { step: 5, text: "Add liquid and seasonings, bring to a boil." },
        { step: 6, text: "Reduce heat, cover and simmer until rice is tender, about 18 minutes." },
      ];
    }
  }

  /** Calculate overall confidence based on Perplexity confidence and recipe count */
  private calculateOverallConfidence(
    perplexityConfidence: "high" | "medium" | "low",
    recipeCount: number,
    targetCount: number
  ): "high" | "medium" | "low" {
    if (perplexityConfidence === "high" && recipeCount >= targetCount) return "high";
    if (perplexityConfidence === "medium" && recipeCount >= targetCount * 0.8) return "medium";
    return "low";
  }

  /** Generate culturally appropriate mock recipes based on request */
  private generateCulturalMockRecipes(request: CleanMealPlanRequest, recipeUrls: string[]): CleanMealPlanRecipe[] {
    const numberOfMeals = Math.max(1, request.numberOfMeals || 1);
    const cuisines = request.culturalCuisines?.length ? request.culturalCuisines : ["Mexican", "Italian"];
    const servings = Math.max(1, request.householdSize || 4);
    const isHalal = request.dietaryRestrictions?.includes("halal_friendly") || false;

    const recipeTemplates = {
      Mexican: {
        title: "Chicken Tinga Tacos",
        description: "Authentic Mexican shredded chicken in chipotle sauce with warm tortillas",
        ingredients: [
          { name: "Chicken thighs", amount: 2, unit: "lbs", estimatedCost: 8.0 },
          { name: "Corn tortillas", amount: 12, unit: "pieces", estimatedCost: 2.0 },
          { name: "Chipotle peppers in adobo", amount: 3, unit: "pieces", estimatedCost: 1.5 },
          { name: "White onion", amount: 1, unit: "medium", estimatedCost: 0.75 },
          { name: "Roma tomatoes", amount: 2, unit: "medium", estimatedCost: 1.5 },
          { name: "Mexican crema", amount: 0.5, unit: "cup", estimatedCost: 2.0 },
        ],
        instructions: [
          { step: 1, text: "Season chicken thighs with salt and pepper, then sear in a hot skillet until golden." },
          { step: 2, text: "Add diced onions and cook until softened, about 5 minutes." },
          { step: 3, text: "Blend tomatoes with chipotle peppers and adobo sauce until smooth." },
          { step: 4, text: "Pour sauce over chicken, cover and simmer for 25 minutes until tender." },
          { step: 5, text: "Shred chicken with two forks and mix with the sauce." },
          { step: 6, text: "Warm tortillas and serve with chicken, crema, and fresh cilantro." },
        ],
        totalTimeMinutes: 40,
      },
      "West African": {
        title: "Jollof Rice with Chicken",
        description: "Traditional West African one-pot rice dish with aromatic spices and tender chicken",
        ingredients: [
          { name: "Jasmine rice", amount: 2, unit: "cups", estimatedCost: 2.0 },
          { name: "Chicken drumsticks", amount: 6, unit: "pieces", estimatedCost: 6.0 },
          { name: "Tomato paste", amount: 3, unit: "tbsp", estimatedCost: 1.0 },
          { name: "Bell peppers", amount: 2, unit: "medium", estimatedCost: 2.0 },
          { name: "Scotch bonnet pepper", amount: 1, unit: "small", estimatedCost: 0.5 },
          { name: "Chicken stock", amount: 3, unit: "cups", estimatedCost: 1.5 },
        ],
        instructions: [
          { step: 1, text: "Season chicken with salt, pepper, and curry powder. Brown in oil until golden." },
          { step: 2, text: "Remove chicken and sauté diced onions and bell peppers until soft." },
          { step: 3, text: "Add tomato paste and cook for 2 minutes until darkened." },
          { step: 4, text: "Add rice, stirring to coat with the tomato mixture." },
          { step: 5, text: "Pour in hot chicken stock, add scotch bonnet pepper whole." },
          { step: 6, text: "Return chicken to pot, cover and simmer for 20 minutes until rice is tender." },
        ],
        totalTimeMinutes: 45,
      },
    };

    const recipes: CleanMealPlanRecipe[] = [];

    for (let i = 0; i < numberOfMeals; i++) {
      const cuisine = cuisines[i % cuisines.length];
      const template = recipeTemplates[cuisine as keyof typeof recipeTemplates] || recipeTemplates.Mexican;

      // Adjust for halal if needed
      let adjustedIngredients = [...template.ingredients];
      if (isHalal && cuisine === "Mexican") {
        // Replace pork-based ingredients with halal alternatives
        adjustedIngredients = adjustedIngredients.map(ing => {
          if (ing.name.toLowerCase().includes("pork") || ing.name.toLowerCase().includes("chorizo")) {
            return { ...ing, name: "Halal beef", estimatedCost: ing.estimatedCost * 1.1 };
          }
          return ing;
        });
      }

      const estimatedCost = adjustedIngredients.reduce((sum, ing) => sum + ing.estimatedCost, 0);

      recipes.push({
        id: `cultural-recipe-${i + 1}`,
        title: `${template.title} (Meal ${i + 1})`,
        description: template.description,
        cuisine,
        sourceUrl: recipeUrls[i % recipeUrls.length] || "https://example.com/recipe",
        imageUrl: undefined,
        totalTimeMinutes: template.totalTimeMinutes,
        servings,
        ingredients: adjustedIngredients,
        instructions: template.instructions,
        estimatedCost,
        costPerServing: estimatedCost / servings,
      });
    }

    return recipes;
  }
}

// Export both the class and service instance for programmatic use
export { CleanMealPlannerService };
export const cleanMealPlannerService = new CleanMealPlannerService();

/** -------------------- Tiny CLI --------------------
 * Usage:
 *  - Dev (tsx):  npx tsx meal-planning/clean-meal-planner.ts --in data/plan-request.json --out data/plan.json
 *  - Built JS:   node lib/meal-planning/clean-meal-planner.js --in data/plan-request.json --out data/plan.json
 */
if (process.argv[1] && basename(process.argv[1]).includes("clean-meal-planner")) {
  (async () => {
    try {
      // parse args: --in path --out path
      const args = process.argv.slice(2); // argv: [node, script, ...flags] :contentReference[oaicite:3]{index=3}
      const inIdx = args.indexOf("--in");
      const outIdx = args.indexOf("--out");
      const inPath = inIdx >= 0 && args[inIdx + 1] ? args[inIdx + 1] : "data/plan-request.json";
      const outPath = outIdx >= 0 && args[outIdx + 1] ? args[outIdx + 1] : "data/plan.json";

      const raw = await fs.readFile(inPath, "utf8");            // fs/promises API :contentReference[oaicite:4]{index=4}
      const req: CleanMealPlanRequest = JSON.parse(raw);

      const svc = new CleanMealPlannerService();
      const res = await svc.generateMealPlan(req);

      await fs.writeFile(outPath, JSON.stringify(res, null, 2), "utf8"); // fs/promises writeFile :contentReference[oaicite:5]{index=5}
      console.log(`✅ Wrote ${outPath}`);
    } catch (err) {
      console.error("❌ CLI failed:", err);
      process.exit(1);
    }
  })();
}
