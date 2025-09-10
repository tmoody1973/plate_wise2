import { NextRequest, NextResponse } from 'next/server';
import { KrogerPricingService } from '@/lib/integrations/kroger-pricing';

// --- Shared pricing helpers (keep consistent with UI logic) ---
function normalizeVulgarFractions(s: string): string {
  return (s || '')
    .replace(/¼/g, '1/4').replace(/½/g, '1/2').replace(/¾/g, '3/4')
    .replace(/⅐/g, '1/7').replace(/⅑/g, '1/9').replace(/⅒/g, '1/10')
    .replace(/⅓/g, '1/3').replace(/⅔/g, '2/3')
    .replace(/⅕/g, '1/5').replace(/⅖/g, '2/5').replace(/⅗/g, '3/5').replace(/⅘/g, '4/5')
    .replace(/⅙/g, '1/6').replace(/⅚/g, '5/6')
    .replace(/⅛/g, '1/8').replace(/⅜/g, '3/8').replace(/⅝/g, '5/8').replace(/⅞/g, '7/8')
}
function parseMixedNumber(s: string): number {
  const t = normalizeVulgarFractions(s).trim()
  const m = t.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (m) return parseFloat(m[1]!) + (parseFloat(m[2]!) / parseFloat(m[3]!))
  const f = t.match(/^(\d+)\/(\d+)$/)
  if (f) return parseFloat(f[1]!) / parseFloat(f[2]!)
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : 0
}
function toBaseUnits(amount: number, unit: string): { value: number; base: 'g'|'ml'|'each' } {
  const u = (unit || '').toLowerCase()
  if (['g','gram','grams'].includes(u)) return { value: amount, base: 'g' }
  if (['kg','kilogram','kilograms'].includes(u)) return { value: amount * 1000, base: 'g' }
  if (['oz','ounce','ounces'].includes(u)) return { value: amount * 28.3495, base: 'g' }
  if (['lb','pound','pounds'].includes(u)) return { value: amount * 453.592, base: 'g' }
  if (['ml','milliliter','milliliters'].includes(u)) return { value: amount, base: 'ml' }
  if (['l','liter','liters'].includes(u)) return { value: amount * 1000, base: 'ml' }
  if (['tsp','teaspoon','teaspoons'].includes(u)) return { value: amount * 4.92892, base: 'ml' }
  if (['tbsp','tablespoon','tablespoons'].includes(u)) return { value: amount * 14.7868, base: 'ml' }
  if (['cup','cups'].includes(u)) return { value: amount * 236.588, base: 'ml' }
  if (['clove','cloves','piece','pieces','slice','slices','can','cans','package','packages','each'].includes(u)) return { value: amount, base: 'each' }
  return { value: amount, base: 'each' }
}
function parseSizeToBase(size: string): { qty: number; base: 'g'|'ml'|'each' } | null {
  const s = (size || '').toLowerCase().replace(/fl\s*oz/g, 'floz').replace(/fluid\s*ounce(s)?/g, 'floz')
  const m = s.match(/(\d+(?:\.\d+)?)\s*(floz|oz|ounce|ounces|lb|pound|pounds|g|gram|grams|kg|l|liter|liters|ml|milliliter|milliliters)\b/)
  if (m) {
    const qty = parseFloat(m[1] || '0')
    const unit = m[2] || ''
    const conv = unit === 'floz' ? { value: qty * 29.5735, base: 'ml' as const } : toBaseUnits(qty, unit)
    return { qty: conv.value, base: conv.base }
  }
  const c = s.match(/(\d+)\s*(count|ct|pk|pack|pieces?)\b/)
  if (c) return { qty: parseFloat(c[1] || '1'), base: 'each' }
  return null
}
function computeIngredientCost(ingredient: { amount: string; unit: string }, product: { price: number; size: string }, byPackage: boolean = true) {
  const reqAmt = parseMixedNumber(ingredient.amount || '0')
  const reqConv = toBaseUnits(reqAmt, ingredient.unit || '')
  let pack = parseSizeToBase(product.size || '')
  if (!Number.isFinite(product.price) || product.price <= 0) return null
  let adjusted = false
  const DEFAULTS: Record<'g'|'ml', number> = { g: 454, ml: 473 }
  if (!pack) {
    if (reqConv.base !== 'each') { pack = { qty: DEFAULTS[reqConv.base], base: reqConv.base }; adjusted = true } else { pack = { qty: 1, base: 'each' }; adjusted = true }
  }
  if (pack.base === 'each' && reqConv.base !== 'each') { pack = { qty: DEFAULTS[reqConv.base], base: reqConv.base }; adjusted = true }
  const unitPrice = product.price / (pack.qty || 1)
  if (byPackage) {
    let packages = Math.max(1, Math.ceil((reqConv.value || 0) / pack.qty))
    if ((reqConv.value || 0) > 0 && packages > 20 && (reqConv.value || 0) < 2000) { packages = 1; adjusted = true }
    const total = packages * product.price
    const leftover = packages * pack.qty - (reqConv.value || 0)
    return { unitPrice, totalCost: total, packageCount: packages, base: pack.base, packageSize: pack.qty, required: reqConv.value || 0, leftover: Math.max(0, leftover), adjusted }
  }
  const total = (reqConv.value || 0) * unitPrice
  return { unitPrice, totalCost: total, packageCount: 1, base: pack.base, packageSize: pack.qty, required: reqConv.value || 0, leftover: Math.max(0, pack.qty - (reqConv.value || 0)), adjusted }
}
function isFreeWater(name: string): boolean {
  const n = (name || '').toLowerCase()
  if (n.includes('coconut water') || n.includes('rose water') || n.includes('orange blossom')) return false
  return n === 'water' || n.includes(' water') || n === 'ice' || n.includes('ice water')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipes, zipCode = '90210' } = body;

    if (!recipes || !Array.isArray(recipes)) {
      return NextResponse.json({
        success: false,
        error: 'recipes array is required'
      }, { status: 400 });
    }

    console.log(`💰 Adding Kroger pricing to ${recipes.length} recipes...`);

    const krogerService = new KrogerPricingService();
    const pricedRecipes = [];

    for (const recipe of recipes) {
      try {
        console.log(`🛒 Processing recipe: ${recipe.title}`);
        
        // Get pricing for all ingredients in this recipe
        const ingredientNames = recipe.ingredients.map((ing: any) => ing.name);
        const pricingResults = await krogerService.getMultipleIngredientPrices(
          ingredientNames, 
          zipCode
        );
        
        let totalCost = 0;
        const enhancedIngredients = recipe.ingredients.map((ingredient: any) => {
          const pricing = pricingResults.get(ingredient.name);
          
          // Exclude water/ice from pricing
          if (isFreeWater(ingredient.name)) {
            return { ...ingredient, krogerPrice: null }
          }

          if (pricing?.bestMatch) {
            const price = pricing.bestMatch.price.sale || pricing.bestMatch.price.promo || pricing.bestMatch.price.regular
            const comp = computeIngredientCost({ amount: ingredient.amount, unit: ingredient.unit }, { price, size: pricing.bestMatch.size }, true)
            const itemCost = comp ? comp.totalCost : 0
            
            totalCost += itemCost;
            
            return {
              ...ingredient,
              krogerPrice: {
                unitPrice: comp ? comp.unitPrice : price,
                totalCost: itemCost,
                confidence: pricing.confidence,
                storeLocation: pricing.location?.name,
                onSale: !!(pricing.bestMatch.price.sale || pricing.bestMatch.price.promo),
                salePrice: pricing.bestMatch.price.sale || pricing.bestMatch.price.promo,
                productId: pricing.bestMatch.productId,
                productName: pricing.bestMatch.name,
                size: pricing.bestMatch.size,
                brand: pricing.bestMatch.brand,
                packageCount: comp?.packageCount,
                baseUnit: comp?.base,
                packageSize: comp?.packageSize,
                requiredAmount: comp?.required,
                leftoverAmount: comp?.leftover,
                adjusted: comp?.adjusted,
                alternatives: pricing.alternatives?.slice(0, 3).map(alt => ({
                  name: alt.name,
                  price: alt.price.regular,
                  brand: alt.brand,
                  size: alt.size
                })) || []
              }
            };
          }
          
          return {
            ...ingredient,
            krogerPrice: null // No pricing found
          };
        });
        
        const costPerServing = totalCost / recipe.metadata.servings;
        
        // Identify savings opportunities
        const savingsOpportunities = [];
        for (const ingredient of enhancedIngredients) {
          if (ingredient.krogerPrice?.onSale) {
            const savings = ingredient.krogerPrice.unitPrice - ingredient.krogerPrice.salePrice;
            savingsOpportunities.push(`${ingredient.name} is on sale - save $${savings.toFixed(2)}!`);
          }
          if (ingredient.krogerPrice?.alternatives?.length > 0) {
            const cheaperAlt = ingredient.krogerPrice.alternatives.find(
              (alt: any) => alt.price < ingredient.krogerPrice.unitPrice * 0.9
            );
            if (cheaperAlt) {
              savingsOpportunities.push(`Consider ${cheaperAlt.brand} ${ingredient.name} for additional savings`);
            }
          }
        }
        
        const pricedRecipe = {
          ...recipe,
          ingredients: enhancedIngredients,
          pricing: {
            totalCost,
            costPerServing,
            budgetFriendly: costPerServing <= 8, // Under $8 per serving
            savingsOpportunities,
            storeLocation: enhancedIngredients.find(ing => ing.krogerPrice?.storeLocation)?.krogerPrice?.storeLocation
          },
          hasPricing: true,
          pricingUpdatedAt: new Date()
        };
        
        pricedRecipes.push(pricedRecipe);
        console.log(`✅ Completed pricing for: ${recipe.title} ($${costPerServing.toFixed(2)}/serving)`);
        
      } catch (error) {
        console.error(`❌ Failed to price recipe ${recipe.title}:`, error);
        // Add recipe without pricing
        pricedRecipes.push({
          ...recipe,
          pricing: {
            totalCost: 0,
            costPerServing: 0,
            budgetFriendly: false,
            savingsOpportunities: [],
            error: 'Pricing unavailable'
          },
          hasPricing: false
        });
      }
    }
        


    // Calculate summary
    const totalCost = pricedRecipes.reduce((sum, recipe) => sum + (recipe.pricing?.totalCost || 0), 0);
    const averageCostPerMeal = totalCost / pricedRecipes.length;
    const successfulPricing = pricedRecipes.filter(r => r.hasPricing).length;

    return NextResponse.json({
      success: true,
      message: `Added pricing to ${successfulPricing}/${pricedRecipes.length} recipes`,
      data: {
        recipes: pricedRecipes,
        summary: {
          totalRecipes: pricedRecipes.length,
          successfulPricing,
          totalCost,
          averageCostPerMeal,
          storeLocation: pricedRecipes.find(r => r.pricing?.storeLocation)?.pricing?.storeLocation
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Pricing addition failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
