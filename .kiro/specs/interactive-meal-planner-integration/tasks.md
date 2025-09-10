# Implementation Plan: Interactive Meal Planner Integration

## Overview

This implementation plan breaks down the migration of the working Interactive Meal Planner from `/test-interactive-planner` to the main `/meal-plans` interface into clear, manageable steps. Each task is designed to be completed incrementally with testing at each stage.

## Implementation Tasks

- [ ] 1. Database Schema Setup and Validation
  - Create and run database migration scripts for enhanced meal planning tables
  - Validate existing Supabase tables match our requirements
  - Test database connections and RLS policies
  - **Goal**: Ensure all data can be properly stored and retrieved
  - _Requirements: 22.1, 22.2, 22.3, 22.4_

- [ ] 1.1 Create Database Migration Script
  - **What**: Create complete SQL migration file with all required schema changes
  - **Why**: We need to store cultural preferences, recipe modifications, and shopping lists that the current database doesn't support
  - **How**: Create `supabase/migrations/004_enhanced_meal_planning.sql` with this exact content:
    ```sql
    -- Enhanced Meal Planning Migration
    -- Add columns to existing meal_plans table
    ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS cultural_cuisines TEXT[] DEFAULT '{}';
    ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT[] DEFAULT '{}';
    ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS household_size INTEGER DEFAULT 4;
    ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS zip_code TEXT;
    ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';
    ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS is_saved BOOLEAN DEFAULT false;
    ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

    -- Add columns to existing recipes table
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cultural_origin TEXT[] DEFAULT '{}';
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS authenticity_score DECIMAL;
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS user_modifications JSONB DEFAULT '[]';
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS saved_to_collection BOOLEAN DEFAULT false;
    ALTER TABLE recipes ADD COLUMN IF NOT EXISTS swapped_from UUID REFERENCES recipes(id);

    -- Create shopping_lists table
    CREATE TABLE IF NOT EXISTS shopping_lists (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      items JSONB NOT NULL DEFAULT '[]',
      total_cost DECIMAL DEFAULT 0,
      store_breakdown JSONB DEFAULT '[]',
      instacart_order_id TEXT,
      status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'ordered')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_meal_plans_user_cultural ON meal_plans(user_id, cultural_cuisines);
    CREATE INDEX IF NOT EXISTS idx_recipes_cultural_origin ON recipes(cultural_origin);
    CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_status ON shopping_lists(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_shopping_lists_meal_plan ON shopping_lists(meal_plan_id);
    ```
  - **Test**: 
    - Run `supabase db reset` to apply migration
    - Check tables exist: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';`
    - Verify columns: `\d meal_plans`, `\d recipes`, `\d shopping_lists` in psql
  - **Files to create**: `supabase/migrations/004_enhanced_meal_planning.sql`
  - _Requirements: 22.1, 22.2_

- [ ] 1.2 Set Up Row Level Security (RLS) Policies
  - **What**: Add RLS policies to secure the new shopping_lists table and verify existing policies
  - **Why**: Users should only see their own shopping lists and meal plans, not other users' data
  - **How**: Add this to the end of `004_enhanced_meal_planning.sql`:
    ```sql
    -- Enable RLS on shopping_lists table
    ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;

    -- RLS Policies for shopping_lists
    CREATE POLICY "Users can view their own shopping lists" ON shopping_lists
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can create their own shopping lists" ON shopping_lists
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own shopping lists" ON shopping_lists
      FOR UPDATE USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own shopping lists" ON shopping_lists
      FOR DELETE USING (auth.uid() = user_id);

    -- Create updated_at trigger for shopping_lists
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    CREATE TRIGGER update_shopping_lists_updated_at 
      BEFORE UPDATE ON shopping_lists 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    ```
  - **Test**: 
    - Create test shopping list as one user, verify another user can't see it
    - Try to insert shopping list with different user_id, should fail
    - Update shopping list, verify updated_at changes automatically
  - **Files to modify**: `supabase/migrations/004_enhanced_meal_planning.sql`
  - _Requirements: 22.6_

- [ ] 1.3 Test Database Schema
  - **What**: Thoroughly test the new database schema works correctly
  - **Why**: We need to catch any database issues before building components that depend on it
  - **How**: Run these specific tests:
    
    **1. Apply Migration:**
    ```bash
    supabase db reset
    # Should see: "Applying migration 004_enhanced_meal_planning.sql"
    ```
    
    **2. Test Table Structure:**
    ```sql
    -- Check meal_plans has new columns
    SELECT column_name, data_type FROM information_schema.columns 
    WHERE table_name = 'meal_plans' AND column_name IN ('cultural_cuisines', 'dietary_restrictions', 'household_size');
    
    -- Check recipes has new columns  
    SELECT column_name, data_type FROM information_schema.columns 
    WHERE table_name = 'recipes' AND column_name IN ('cultural_origin', 'authenticity_score', 'user_modifications');
    
    -- Check shopping_lists table exists
    SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'shopping_lists';
    ```
    
    **3. Test CRUD Operations:**
    ```sql
    -- Test meal_plans insert with new columns
    INSERT INTO meal_plans (user_id, cultural_cuisines, dietary_restrictions, household_size) 
    VALUES ('test-user-id', '{"mexican", "italian"}', '{"vegetarian"}', 4);
    
    -- Test shopping_lists insert
    INSERT INTO shopping_lists (user_id, meal_plan_id, name, items) 
    VALUES ('test-user-id', (SELECT id FROM meal_plans LIMIT 1), 'Test List', '[{"name": "tomatoes", "quantity": 2}]');
    ```
    
    **4. Test Indexes:**
    ```sql
    -- Check indexes were created
    SELECT indexname FROM pg_indexes WHERE tablename IN ('meal_plans', 'recipes', 'shopping_lists');
    ```
  - **Expected Results**: 
    - All columns exist with correct data types
    - Can insert/update/delete records without errors
    - Foreign key constraints work (can't insert shopping list with invalid meal_plan_id)
    - Indexes exist for performance
  - _Requirements: 22.5, 22.8_

- [ ] 2. Create Enhanced Data Access Layer
  - Build TypeScript interfaces and services for the new database schema
  - Create functions to save/load meal plans, recipes, and shopping lists
  - Implement data consolidation logic for shopping lists
  - **Goal**: Have reliable data access functions that match our component needs
  - _Requirements: 27.9, 27.10_

- [ ] 2.1 Define Enhanced TypeScript Interfaces
  - **What**: Create TypeScript interfaces that match our new database schema
  - **Why**: We need type safety when working with the enhanced meal planning data
  - **How**: Create `src/types/enhanced-meal-planning.ts` with these exact interfaces:
    ```typescript
    // Enhanced Recipe interface (extends existing Recipe)
    export interface EnhancedRecipe extends Recipe {
      cultural_origin?: string[];
      authenticity_score?: number;
      user_modifications?: UserModification[];
      saved_to_collection?: boolean;
      swapped_from?: string; // UUID of original recipe if this was swapped
    }

    // User modification tracking
    export interface UserModification {
      type: 'ingredient_substitution' | 'quantity_adjustment' | 'scaling';
      original_value: any;
      new_value: any;
      reason?: string;
      timestamp: Date;
    }

    // Saved meal plan (matches database schema)
    export interface SavedMealPlan {
      id: string;
      user_id: string;
      name: string;
      description?: string;
      cultural_cuisines: string[];
      dietary_restrictions: string[];
      household_size: number;
      zip_code?: string;
      preferences: MealPlanConfig;
      total_cost: number;
      cost_per_serving: number;
      is_saved: boolean;
      tags: string[];
      created_at: Date;
      updated_at: Date;
      recipes?: EnhancedRecipe[]; // Loaded separately
    }

    // Shopping list (matches database schema)
    export interface ShoppingList {
      id: string;
      user_id: string;
      meal_plan_id: string;
      name: string;
      items: ConsolidatedIngredient[];
      total_cost: number;
      store_breakdown: StoreBreakdown[];
      instacart_order_id?: string;
      status: 'active' | 'completed' | 'ordered';
      created_at: Date;
      updated_at: Date;
    }

    // Consolidated ingredient for shopping lists
    export interface ConsolidatedIngredient {
      name: string;
      total_quantity: number;
      unit: string;
      recipes: string[]; // Recipe IDs that use this ingredient
      pricing?: IngredientPricing;
      package_optimization?: PackageOptimization;
      user_status: 'normal' | 'already-have' | 'specialty-store';
      specialty_store?: string;
    }

    // Package optimization for bulk buying
    export interface PackageOptimization {
      recommended_package_size: string;
      package_quantity: number;
      leftover_amount: number;
      cost_per_unit: number;
      alternatives: PackageAlternative[];
    }

    export interface PackageAlternative {
      name: string;
      size: string;
      price: number;
      cost_per_unit: number;
    }

    // Store breakdown for shopping lists
    export interface StoreBreakdown {
      store_name: string;
      store_type: 'regular' | 'specialty';
      items: ConsolidatedIngredient[];
      total_cost: number;
    }

    // Enhanced meal plan configuration
    export interface MealPlanConfig {
      cultural_cuisines: string[];
      dietary_restrictions: string[];
      household_size: number;
      time_frame: string;
      zip_code: string;
      budget_limit?: number;
      use_profile_defaults: boolean;
      overrides: Partial<UserPreferences>;
    }

    // User preferences (from profile)
    export interface UserPreferences {
      cultural_cuisines: string[];
      dietary_restrictions: string[];
      household_size: number;
      default_zip_code: string;
      favorite_stores: string[];
    }
    ```
  - **Test**: Import interfaces in a component and verify TypeScript doesn't show errors
  - **Files to create**: `src/types/enhanced-meal-planning.ts`
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 2.2 Build MealPlanningService Class
  - Create service class with methods to save/load meal plans
  - Implement recipe saving and retrieval functions
  - Add shopping list generation and consolidation logic
  - Include error handling and data validation
  - _Requirements: 16.1, 16.2, 17.1, 17.2_

- [ ] 2.3 Test Data Access Functions
  - Write unit tests for all service methods
  - Test with real Supabase connection
  - Verify data is saved and retrieved correctly
  - Test error handling for network issues
  - _Requirements: 26.1, 26.2_

- [ ] 3. Copy and Adapt Working Interactive Meal Planner Component
  - Copy the working component from `/test-interactive-planner`
  - Adapt it to work within the main app structure (ProtectedRoute + DashboardLayout)
  - Ensure all APIs work exactly the same as the test
  - **Goal**: Get the basic 3-step process working in the main app
  - _Requirements: 1.1, 1.4, 1.5, 1.9_

- [x] 3.1 Copy InteractiveMealPlanner Component
  - **What**: Create `src/components/meal-plans/EnhancedInteractiveMealPlanner.tsx` based on working test
  - **Why**: We want to preserve the exact functionality that works in `/test-interactive-planner`
  - **How**: 
    - Copy entire `InteractiveMealPlanner.tsx` component code
    - Rename component to `EnhancedInteractiveMealPlanner`
    - Keep all existing state, functions, and UI exactly the same
    - Don't change any API calls or logic yet - just copy what works
  - **Test**: Component should render without errors and show the same 3-step interface
  - **Files to create**: `src/components/meal-plans/EnhancedInteractiveMealPlanner.tsx`
  - _Requirements: 1.1, 1.4_

- [x] 3.2 Integrate with Main App Structure
  - **What**: Replace the current meal planner with our enhanced version in the main app
  - **Why**: Users need to access the new functionality from the main `/meal-plans` page
  - **How**: 
    - Open `src/app/meal-plans/page.tsx`
    - Replace `<MealPlannerInterface />` with `<EnhancedInteractiveMealPlanner />`
    - Keep the existing `<ProtectedRoute>` and `<DashboardLayout>` wrappers
    - Import the new component: `import { EnhancedInteractiveMealPlanner } from '@/components/meal-plans/EnhancedInteractiveMealPlanner'`
  - **Test**: Visit `/meal-plans` and verify you see the 3-step interface, navigation works, and you're still authenticated
  - **Files to modify**: `src/app/meal-plans/page.tsx`
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 3.3 Validate Kroger and Perplexity API Integration
  - **What**: Verify the underlying Kroger and Perplexity APIs work correctly in the main app
  - **Why**: These external APIs power the pricing and recipe generation - they must work reliably
  - **How**: Test the actual API integrations that power the endpoints:
    
    **Test Perplexity API (Recipe Generation):**
    ```javascript
    // Check the Perplexity integration directly
    import { perplexityMealPlanner } from '@/lib/meal-planning/perplexity-meal-planner';
    
    const testConfig = {
      culturalCuisines: ['mexican'],
      dietaryRestrictions: [],
      householdSize: 4,
      timeFrame: 'week'
    };
    
    // This should work exactly like in test-interactive-planner
    const recipes = await perplexityMealPlanner.generateRecipes(testConfig);
    console.log('Generated recipes:', recipes.length);
    // Verify: Returns 3-5 recipes with proper structure
    ```
    
    **Test Kroger API (Pricing):**
    ```javascript
    // Check Kroger pricing integration
    import { krogerPricing } from '@/lib/integrations/kroger-pricing';
    
    const testIngredient = 'chicken breast';
    const testZipCode = '90210';
    
    const pricingResults = await krogerPricing.searchIngredient(testIngredient, testZipCode);
    console.log('Kroger pricing:', pricingResults);
    // Verify: Returns price data with unitPrice, totalCost, productName
    ```
    
    **Test Ingredient Search:**
    ```javascript
    // Test the ingredient search that powers substitutions
    const searchResults = await fetch('/api/ingredients/search?q=organic+chicken&zipCode=90210&limit=8');
    const data = await searchResults.json();
    
    // Should return alternatives with pricing
    console.log('Search alternatives:', data.results);
    // Verify: Multiple options with different prices and brands
    ```
    
    **Check API Keys and Environment:**
    - Verify `NEXT_PUBLIC_RAPIDAPI_KEY` is set for Kroger API
    - Verify Perplexity API key is configured
    - Test API rate limits aren't exceeded
    - Check error handling for API failures
    
  - **Test**: All external APIs return data and don't throw errors
  - **Files to check**: 
    - `src/lib/meal-planning/perplexity-meal-planner.ts`
    - `src/lib/integrations/kroger-pricing.ts`
    - `src/app/api/ingredients/search/route.ts`
  - _Requirements: 1.5, 1.6, 1.7_

- [x] 3.4 Verify API Compatibility
  - **What**: Ensure all APIs work exactly like they do in `/test-interactive-planner`
  - **Why**: This is CRITICAL - the working test proves these APIs work, we must preserve exact behavior
  - **How**: Test each API endpoint with identical requests and verify identical responses:
    
    **Test `/api/meal-plans/recipes-only`:**
    ```javascript
    // Test with exact same request as working test
    const testRequest = {
      culturalCuisines: ['mexican'],
      dietaryRestrictions: [],
      householdSize: 4,
      timeFrame: 'week'
    };
    
    const response = await fetch('/api/meal-plans/recipes-only', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testRequest)
    });
    
    // Should return recipes array with same structure as test
    const data = await response.json();
    console.log('Recipes response:', data);
    // Verify: data.success === true, data.data.recipes is array
    ```
    
    **Test `/api/meal-plans/add-pricing`:**
    ```javascript
    // Use recipes from previous test
    const pricingRequest = { recipes: testRecipes, zipCode: '90210' };
    
    const response = await fetch('/api/meal-plans/add-pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pricingRequest)
    });
    
    // Should add krogerPrice to ingredients
    const data = await response.json();
    // Verify: recipes have pricing data, hasPricing: true
    ```
    
    **Test `/api/ingredients/search`:**
    ```javascript
    // Test ingredient search like in working test
    const searchUrl = '/api/ingredients/search?q=chicken&zipCode=90210&limit=8';
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    // Should return Kroger search results
    // Verify: data.success === true, data.results is array with price info
    ```
    
    **Performance Test:**
    - Recipe generation should complete in 5-10 seconds maximum
    - Time the full request/response cycle
    - If slower, investigate Perplexity API calls or caching issues
    
  - **Test**: All three APIs return identical data structures and performance as `/test-interactive-planner`
  - **Files to check**: Existing API files should work as-is, no changes needed if working in test
  - _Requirements: 1.5, 1.6, 1.7, 1.8_

- [ ] 4. Add User Profile Integration
  - Connect meal planner configuration to user profile preferences
  - Add ability to override profile defaults for specific meal plans
  - Implement "Save to Profile" functionality
  - **Goal**: Users see their preferences pre-filled but can customize as needed
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [ ] 4.1 Create User Preference Management
  - **What**: Add user profile integration to pre-fill meal planner settings
  - **Why**: Users shouldn't have to re-enter their preferences every time
  - **How**: 
    - Create `useUserPreferences()` hook to load user profile data
    - Add state to track when user overrides profile defaults: `const [usingCustomSettings, setUsingCustomSettings] = useState(false)`
    - Show blue indicator when using custom settings: "Using custom preferences (different from your profile)"
    - Add "Save to Profile" button that appears when `usingCustomSettings` is true
    - Create function to update user profile with current settings
  - **Test**: User with existing preferences sees them pre-filled, can override them, and can save overrides back to profile
  - **Files to modify**: `EnhancedInteractiveMealPlanner.tsx`
  - **New files**: `src/hooks/useUserPreferences.ts`
  - _Requirements: 3.1, 3.6, 3.7_

- [ ] 4.2 Implement Configuration Pre-population
  - Auto-fill cultural cuisines from user profile on first load
  - Auto-fill dietary restrictions and household size
  - Remember last session preferences with option to reset to profile defaults
  - _Requirements: 3.2, 3.3, 3.8_

- [ ] 4.3 Test Profile Integration
  - Test with users who have existing preferences
  - Test override functionality and "Save to Profile"
  - Verify preferences persist across sessions
  - _Requirements: 3.4, 3.5_

- [ ] 5. Implement Recipe Swapping Feature
  - Add "Swap Recipe" buttons to recipe cards
  - Create modal for browsing saved recipes or searching new ones
  - Integrate with Perplexity API for new recipe search
  - **Goal**: Users can easily replace recipes they don't like
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

- [ ] 5.1 Add Swap Recipe UI Elements
  - **What**: Add "Swap Recipe" buttons and create the swap modal interface
  - **Why**: Users need an easy way to replace recipes they don't like
  - **How**: 
    - Add "🔄 Swap Recipe" button to each recipe card in the recipes display
    - Create `src/components/meal-plans/RecipeSwapModal.tsx` component
    - Modal should have two tabs: "My Saved Recipes" and "Search New Recipes"
    - Use existing PlateWise modal styling (check other modals for reference)
    - Add state to track which recipe is being swapped: `const [swappingRecipe, setSwappingRecipe] = useState<{recipeId: string, recipeIndex: number} | null>(null)`
  - **Test**: Click "Swap Recipe" button opens modal with two tabs, modal can be closed
  - **Files to modify**: `EnhancedInteractiveMealPlanner.tsx`
  - **New files**: `src/components/meal-plans/RecipeSwapModal.tsx`
  - _Requirements: 5.1, 5.2_

- [ ] 5.2 Implement Saved Recipe Browsing
  - Load user's saved recipes filtered by similar cuisine/type
  - Display recipes in selectable cards with preview information
  - Handle recipe selection and replacement in meal plan
  - _Requirements: 5.3, 5.6_

- [ ] 5.3 Add New Recipe Search with Perplexity
  - **What**: Create recipe search functionality for finding replacement recipes
  - **Why**: Users need to search for new recipes when swapping out ones they don't like
  - **How**: Build search interface that uses existing Perplexity API:
    
    **Create Recipe Search API Endpoint:**
    ```javascript
    // Create /api/recipes/search-perplexity/route.ts
    import { perplexityMealPlanner } from '@/lib/meal-planning/perplexity-meal-planner';
    
    export async function POST(request: Request) {
      const { query, culturalCuisines, dietaryRestrictions, maxResults = 5 } = await request.json();
      
      // Use existing Perplexity integration to search for specific recipes
      const searchResults = await perplexityMealPlanner.searchRecipes({
        query,
        culturalCuisines,
        dietaryRestrictions,
        maxResults
      });
      
      return Response.json({ success: true, recipes: searchResults });
    }
    ```
    
    **Create Search Interface:**
    ```javascript
    // In RecipeSwapModal component
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    
    const searchRecipes = async () => {
      const response = await fetch('/api/recipes/search-perplexity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          culturalCuisines: mealPlanConfig.culturalCuisines,
          dietaryRestrictions: mealPlanConfig.dietaryRestrictions
        })
      });
      
      const data = await response.json();
      setSearchResults(data.recipes);
    };
    ```
    
    **Add Search Filters:**
    - Cuisine type dropdown (Mexican, Italian, Asian, etc.)
    - Cooking time filter (< 30 min, 30-60 min, > 60 min)
    - Difficulty level (Easy, Medium, Hard)
    - Dietary restrictions checkboxes
    
    **Display Search Results:**
    - Show recipe cards with title, description, cooking time
    - Display estimated cost and cultural authenticity score
    - Add "Preview Recipe" button to see full details
    - Add "Select This Recipe" button to replace original
    
  - **Test**: Search returns relevant recipes, filters work, can preview and select recipes
  - **Files to create**: 
    - `src/app/api/recipes/search-perplexity/route.ts`
    - Search UI in `RecipeSwapModal.tsx`
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

- [ ] 5.4 Implement Recipe Replacement Logic
  - Update meal plan when recipe is swapped
  - Recalculate total costs automatically
  - Update shopping list if one exists
  - Show confirmation with cost and ingredient changes
  - _Requirements: 5.6, 5.7, 5.8, 5.9_

- [ ] 6. Add Recipe Scaling and Quantity Management
  - Add serving size controls to recipe cards
  - Implement smart package matching for ingredients
  - Show cost impact of scaling and quantity adjustments
  - **Goal**: Users can adjust recipes to match their needs and available packages
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

- [ ] 6.1 Add Recipe Scaling Controls
  - Add serving size input/controls to recipe cards
  - Implement automatic quantity adjustment for all ingredients
  - Update cooking time guidance for different scales
  - _Requirements: 8.1, 8.2, 8.7_

- [ ] 6.2 Implement Package Matching Logic
  - Show actual store package sizes alongside recipe quantities
  - Calculate leftover amounts when buying full packages
  - Provide cost-per-unit comparisons for different package sizes
  - _Requirements: 9.1, 9.2, 9.3, 9.7_

- [ ] 6.3 Add Quantity Optimization Features
  - Allow manual quantity adjustments to match available packages
  - Show cost impact of quantity changes on per-serving price
  - Suggest recipes for leftover ingredients
  - Warn about potential waste from oversized packages
  - _Requirements: 8.4, 8.5, 8.6, 9.4, 9.5, 9.6_

- [ ] 7. Enhance Recipe Cards with shadcn Components
  - Ensure recipe display uses existing shadcn expandable card component
  - Add new functionality while preserving existing card behavior
  - Maintain consistent styling and interactions
  - **Goal**: Keep familiar UI while adding new features
  - _Requirements: 11.7, 11.8, 11.9, 11.10_

- [ ] 7.1 Integrate with Existing ExpandableRecipeCard
  - Use existing `src/components/meal-plans/ExpandableRecipeCard.tsx` as base
  - Add new props for swap, save, and scale functionality
  - Preserve existing expand/collapse behavior
  - _Requirements: 11.7, 11.10_

- [ ] 7.2 Add Enhanced Card Features
  - Add "Swap Recipe", "Save Recipe", and scaling controls
  - Ensure all new buttons are accessible and properly styled
  - Maintain card performance with new features
  - _Requirements: 11.8, 11.9_

- [ ] 8. Implement Shopping List Generation
  - Add "Generate Shopping List" button after pricing step
  - Create logic to consolidate ingredients across all recipes
  - Generate organized shopping lists by store section
  - **Goal**: Users get optimized shopping lists from their meal plans
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8_

- [ ] 8.1 Create Shopping List Generator Component
  - **What**: Add shopping list generation after users have priced recipes
  - **Why**: Users need a consolidated shopping list for all their meal plan ingredients
  - **How**: 
    - Add "🛒 Generate Shopping List" button in the pricing step (after recipes have pricing)
    - Create `src/components/meal-plans/ShoppingListGenerator.tsx` component
    - Implement `consolidateIngredients()` function that:
      - Loops through all recipes and their ingredients
      - Combines ingredients with same name (e.g., "2 cups rice" + "1 cup rice" = "3 cups rice")
      - Excludes ingredients marked as "already have"
      - Groups specialty store items separately
    - Show consolidated list with total estimated cost
  - **Test**: Generate shopping list shows combined ingredients, correct quantities, and excludes "already have" items
  - **Files to modify**: `EnhancedInteractiveMealPlanner.tsx`
  - **New files**: `src/components/meal-plans/ShoppingListGenerator.tsx`
  - _Requirements: 17.1, 17.2_

- [ ] 8.2 Implement Smart List Organization
  - Group ingredients by store section (produce, dairy, etc.)
  - Separate specialty store items with store names
  - Show which recipes each ingredient is used in
  - _Requirements: 18.1, 18.2, 17.8_

- [ ] 8.3 Add Cost Tracking and Optimization
  - Show current pricing and total estimated cost
  - Highlight sale prices and savings opportunities
  - Update costs in real-time as items are checked off
  - _Requirements: 17.6, 18.4, 18.6_

- [ ] 9. Integrate with Shopping Page
  - Make generated shopping lists appear on `/shopping` page
  - Add management features for multiple shopping lists
  - Implement list completion and tracking
  - **Goal**: Seamless workflow from meal planning to shopping
  - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7, 21.8_

- [ ] 9.1 Update Shopping Page Integration
  - Modify `/shopping` page to display meal plan shopping lists
  - Show which meal plan each shopping list came from
  - Add ability to manage multiple shopping lists
  - _Requirements: 21.1, 21.2, 21.3_

- [ ] 9.2 Add Shopping List Management
  - Allow editing shopping list items and quantities
  - Implement item completion tracking
  - Add ability to mark entire lists as completed
  - _Requirements: 21.4, 21.5, 21.6_

- [ ] 10. Add Instacart Integration (Future Enhancement)
  - Create Instacart API integration for online ordering
  - Add price comparison between in-store and delivery
  - Implement order tracking within PlateWise
  - **Goal**: Users can order groceries directly from shopping lists
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8_

- [ ] 10.1 Set Up Instacart API Integration
  - Research Instacart API requirements and authentication
  - Create service class for Instacart API calls
  - Implement shopping list transfer to Instacart format
  - _Requirements: 19.1, 19.2, 19.3_

- [ ] 10.2 Add Price Comparison Features
  - Show side-by-side pricing for in-store vs Instacart
  - Include delivery fees in total cost comparisons
  - Display time savings vs cost trade-offs
  - _Requirements: 20.1, 20.2, 20.3_

- [ ] 10.3 Implement Order Tracking
  - Add order status tracking within PlateWise
  - Show delivery time estimates and updates
  - Mark shopping lists as "ordered" when sent to Instacart
  - _Requirements: 19.7, 19.8, 21.9_

- [ ] 11. Add Accessibility and Senior-Friendly Features
  - Implement large text, high contrast, and clear navigation
  - Add helpful tooltips and error messages
  - Ensure keyboard navigation and screen reader support
  - **Goal**: Make the interface comfortable for all users, especially seniors
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8_

- [ ] 11.1 Implement Senior-Friendly Design
  - Ensure all text is at least 16px with high contrast
  - Make buttons at least 44px tall for easy clicking
  - Add clear, simple language in all instructions
  - Include descriptive text labels with all icons
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ] 11.2 Add Accessibility Compliance
  - Implement proper ARIA labels for screen readers
  - Ensure complete keyboard navigation support
  - Test with 200% zoom without losing functionality
  - Make sure information doesn't rely solely on color
  - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [ ] 11.3 Add Helpful User Guidance
  - Include clear explanations of each step in the process
  - Add helpful tips and tooltips throughout
  - Create friendly error messages with clear solutions
  - Provide easy undo/correction capabilities
  - _Requirements: 12.5, 12.6, 13.7_

- [ ] 12. Implement Error Handling and Performance Optimization
  - Add comprehensive error boundaries and fallback states
  - Implement caching for improved performance
  - Add loading states and progress indicators
  - **Goal**: Reliable, fast experience even when things go wrong
  - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6, 23.7, 23.8_

- [ ] 12.1 Add Error Boundaries and Fallbacks
  - Wrap components in error boundaries that preserve user work
  - Create fallback UI for when APIs are unavailable
  - Implement retry mechanisms for failed requests
  - Show helpful error messages with suggested actions
  - _Requirements: 23.1, 23.2, 23.4, 23.8_

- [ ] 12.2 Implement Performance Optimization
  - Add caching for recipe searches and pricing data
  - Implement lazy loading for heavy components
  - Optimize re-renders with React.memo and useMemo
  - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6, 24.7, 24.8_

- [ ] 12.3 Add Loading States and Progress Indicators
  - Show loading spinners during API calls
  - Add progress indicators for multi-step processes
  - Implement skeleton screens for better perceived performance
  - _Requirements: 24.6, 11.1, 11.2_

- [ ] 13. Testing and Quality Assurance
  - Write comprehensive tests for all new functionality
  - Test API compatibility with the working test implementation
  - Perform accessibility testing and browser compatibility checks
  - **Goal**: Ensure everything works reliably across different scenarios
  - _Requirements: 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 26.7, 26.8_

- [ ] 13.1 Write Component Tests
  - Test all new components with React Testing Library
  - Mock API calls to test different response scenarios
  - Test user interactions and state changes
  - _Requirements: 26.1, 26.4_

- [ ] 13.2 Test API Compatibility and Performance
  - **What**: Comprehensive testing of all APIs to ensure they match `/test-interactive-planner` exactly
  - **Why**: API compatibility is critical - any differences will break the user experience
  - **How**: Run detailed comparison tests between main app and test implementation:
    
    **Create API Test Suite:**
    ```javascript
    // Create tests/api-compatibility.test.js
    describe('API Compatibility with test-interactive-planner', () => {
      
      test('recipes-only API returns identical structure', async () => {
        const testConfig = {
          culturalCuisines: ['mexican'],
          dietaryRestrictions: [],
          householdSize: 4,
          timeFrame: 'week'
        };
        
        const response = await fetch('/api/meal-plans/recipes-only', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testConfig)
        });
        
        const data = await response.json();
        
        // Verify exact structure matches test
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data.recipes)).toBe(true);
        expect(data.data.recipes.length).toBeGreaterThan(0);
        
        // Check recipe structure
        const recipe = data.data.recipes[0];
        expect(recipe).toHaveProperty('id');
        expect(recipe).toHaveProperty('title');
        expect(recipe).toHaveProperty('ingredients');
        expect(recipe).toHaveProperty('instructions');
        expect(recipe).toHaveProperty('metadata');
      });
      
      test('add-pricing API adds Kroger pricing correctly', async () => {
        // First get recipes
        const recipes = await getTestRecipes();
        
        const response = await fetch('/api/meal-plans/add-pricing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipes, zipCode: '90210' })
        });
        
        const data = await response.json();
        
        // Verify pricing was added
        expect(data.success).toBe(true);
        expect(data.data.recipes[0].hasPricing).toBe(true);
        expect(data.data.recipes[0].ingredients[0]).toHaveProperty('krogerPrice');
      });
      
      test('ingredient search returns Kroger results', async () => {
        const response = await fetch('/api/ingredients/search?q=chicken&zipCode=90210&limit=8');
        const data = await response.json();
        
        expect(data.success).toBe(true);
        expect(Array.isArray(data.results)).toBe(true);
        expect(data.results[0]).toHaveProperty('price');
        expect(data.results[0]).toHaveProperty('cleanName');
      });
      
      test('recipe generation performance under 10 seconds', async () => {
        const startTime = Date.now();
        
        const response = await fetch('/api/meal-plans/recipes-only', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            culturalCuisines: ['italian'],
            dietaryRestrictions: [],
            householdSize: 4,
            timeFrame: 'week'
          })
        });
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        expect(duration).toBeLessThan(10000); // 10 seconds
        expect(response.ok).toBe(true);
      });
    });
    ```
    
    **Test Error Handling:**
    ```javascript
    test('APIs handle errors gracefully', async () => {
      // Test with invalid data
      const response = await fetch('/api/meal-plans/recipes-only', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalid: 'data' })
      });
      
      // Should return error but not crash
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });
    ```
    
    **Test External API Dependencies:**
    - Mock Perplexity API responses to test error handling
    - Mock Kroger API failures to test fallback behavior
    - Test rate limiting scenarios
    - Verify API keys are properly configured
    
  - **Test**: Run `npm test` and all API compatibility tests pass
  - **Files to create**: `tests/api-compatibility.test.js`
  - _Requirements: 26.1, 26.2_

- [ ] 13.3 Perform Accessibility and Browser Testing
  - Test with screen readers and keyboard navigation
  - Check functionality across different browsers
  - Test on mobile devices and different screen sizes
  - Validate WCAG 2.1 AA compliance
  - _Requirements: 26.3, 26.5, 26.6_

- [ ] 14. Data Migration and Deployment Preparation
  - Ensure existing user data remains accessible
  - Create backup and rollback procedures
  - Test migration process in staging environment
  - **Goal**: Smooth transition with no data loss
  - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5, 25.6, 25.7, 25.8_

- [ ] 14.1 Test Data Migration
  - Test that existing meal plans display correctly in new interface
  - Verify saved recipes are compatible with new system
  - Ensure no data is lost or corrupted during migration
  - _Requirements: 25.1, 25.2, 25.4_

- [ ] 14.2 Create Backup and Rollback Procedures
  - Document how to revert to old interface if needed
  - Create database backup procedures
  - Test rollback process in staging environment
  - _Requirements: 25.5, 25.7_

## Success Criteria

- [ ] Users can access `/meal-plans` and see the new interface
- [ ] All APIs work exactly like `/test-interactive-planner`
- [ ] Recipe generation completes in 5-10 seconds
- [ ] Users can swap recipes from saved collection or search
- [ ] Recipe scaling and quantity management work correctly
- [ ] Shopping lists generate and appear on `/shopping` page
- [ ] Interface is accessible and senior-friendly
- [ ] No existing user data is lost during migration

## Troubleshooting Guide

When you encounter issues, I'll help you debug them in plain English by:

1. **Identifying the Problem**: We'll figure out exactly what's not working
2. **Finding the Root Cause**: We'll trace through the code to find why it's happening
3. **Explaining the Solution**: I'll explain the fix in simple terms before we implement it
4. **Testing the Fix**: We'll verify the solution works before moving on

### Common Issues and Solutions

**Database Issues:**
- "Table doesn't exist" → We need to run the migration script
- "Column not found" → The migration didn't add all required columns
- "Permission denied" → RLS policies need to be set up correctly

**Component Issues:**
- "Component not found" → Import path is wrong or file doesn't exist
- "Props error" → Component expecting different props than we're passing
- "Hooks error" → Using hooks outside of React component

**API Issues:**
- "404 Not Found" → API endpoint doesn't exist or path is wrong
- "500 Server Error" → Something broke on the server side
- "Network Error" → Internet connection or server is down

**For each error, I'll:**
1. Show you the exact error message
2. Explain what it means in simple terms
3. Walk through the fix step by step
4. Help you test that it's working

Each task is designed to be completed and tested independently, so if something breaks, we can isolate and fix it without affecting other parts of the system.

### How to Ask for Help

When you hit an issue, share:
1. **What you were trying to do** (which task/step)
2. **What happened** (error message, unexpected behavior)
3. **What you expected** (what should have happened)

I'll help you debug it in plain English and get you back on track!