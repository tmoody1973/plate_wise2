// Orchestrator to search recipes and upsert into Supabase

import type { RecipeSearchFilters, RecipesResponseT } from './schema'
import { searchRecipes } from './search'
import { upsertRecipes } from './db'

export async function findAndStoreRecipes(filters: RecipeSearchFilters) {
  const results: RecipesResponseT = await searchRecipes(filters)
  const { rows } = await upsertRecipes(results.recipes)
  return { found: results.recipes.length, rows }
}

