-- ============================================================================
-- STEP 2: CREATE INDEXES (Fixed version - only for existing columns)
-- ============================================================================

-- First, let's check what tables exist
SELECT 'Checking existing tables...' as status;

-- Meal Plans indexes (these columns should exist)
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_id ON meal_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_created_at ON meal_plans(created_at DESC);

-- Only create status index if the column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meal_plans' 
    AND column_name = 'status' 
    AND table_schema = 'public'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_meal_plans_status ON meal_plans(status);
    RAISE NOTICE 'Created index on meal_plans.status';
  ELSE
    RAISE NOTICE 'Skipped meal_plans.status index - column does not exist';
  END IF;
END $$;

-- Recipes indexes
CREATE INDEX IF NOT EXISTS idx_recipes_meal_plan_id ON recipes(meal_plan_id);

-- Only create cuisine index if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recipes' 
    AND column_name = 'cuisine' 
    AND table_schema = 'public'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_recipes_cuisine ON recipes(cuisine);
    RAISE NOTICE 'Created index on recipes.cuisine';
  ELSE
    RAISE NOTICE 'Skipped recipes.cuisine index - column does not exist';
  END IF;
END $$;

-- Only create has_pricing index if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recipes' 
    AND column_name = 'has_pricing' 
    AND table_schema = 'public'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_recipes_has_pricing ON recipes(has_pricing);
    RAISE NOTICE 'Created index on recipes.has_pricing';
  ELSE
    RAISE NOTICE 'Skipped recipes.has_pricing index - column does not exist';
  END IF;
END $$;

-- Recipe Ingredients indexes
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);

-- Only create user_status index if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recipe_ingredients' 
    AND column_name = 'user_status' 
    AND table_schema = 'public'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_user_status ON recipe_ingredients(user_status);
    RAISE NOTICE 'Created index on recipe_ingredients.user_status';
  ELSE
    RAISE NOTICE 'Skipped recipe_ingredients.user_status index - column does not exist';
  END IF;
END $$;

-- Only create kroger_product_id index if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recipe_ingredients' 
    AND column_name = 'kroger_product_id' 
    AND table_schema = 'public'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_kroger_product_id ON recipe_ingredients(kroger_product_id);
    RAISE NOTICE 'Created index on recipe_ingredients.kroger_product_id';
  ELSE
    RAISE NOTICE 'Skipped recipe_ingredients.kroger_product_id index - column does not exist';
  END IF;
END $$;

-- Shopping Lists indexes
CREATE INDEX IF NOT EXISTS idx_shopping_lists_meal_plan_id ON shopping_lists(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_id ON shopping_lists(user_id);

-- Only create shopping_lists status index if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopping_lists' 
    AND column_name = 'status' 
    AND table_schema = 'public'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_shopping_lists_status ON shopping_lists(status);
    RAISE NOTICE 'Created index on shopping_lists.status';
  ELSE
    RAISE NOTICE 'Skipped shopping_lists.status index - column does not exist';
  END IF;
END $$;

-- Shopping List Items indexes
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_shopping_list_id ON shopping_list_items(shopping_list_id);

-- Only create store index if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopping_list_items' 
    AND column_name = 'store' 
    AND table_schema = 'public'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_shopping_list_items_store ON shopping_list_items(store);
    RAISE NOTICE 'Created index on shopping_list_items.store';
  ELSE
    RAISE NOTICE 'Skipped shopping_list_items.store index - column does not exist';
  END IF;
END $$;

-- Recipe Collections indexes
CREATE INDEX IF NOT EXISTS idx_recipe_collections_user_id ON recipe_collections(user_id);

-- Only create is_public index if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recipe_collections' 
    AND column_name = 'is_public' 
    AND table_schema = 'public'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_recipe_collections_is_public ON recipe_collections(is_public);
    RAISE NOTICE 'Created index on recipe_collections.is_public';
  ELSE
    RAISE NOTICE 'Skipped recipe_collections.is_public index - column does not exist';
  END IF;
END $$;

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_meal_plan_analytics_user_id ON meal_plan_analytics(user_id);

-- Only create event_type index if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meal_plan_analytics' 
    AND column_name = 'event_type' 
    AND table_schema = 'public'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_meal_plan_analytics_event_type ON meal_plan_analytics(event_type);
    RAISE NOTICE 'Created index on meal_plan_analytics.event_type';
  ELSE
    RAISE NOTICE 'Skipped meal_plan_analytics.event_type index - column does not exist';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_meal_plan_analytics_created_at ON meal_plan_analytics(created_at DESC);

-- Show what indexes were actually created
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
  AND tablename IN (
    'user_preferences', 'meal_plans', 'recipes', 'recipe_ingredients',
    'shopping_lists', 'shopping_list_items', 'recipe_collections', 
    'collection_recipes', 'meal_plan_analytics'
  )
ORDER BY tablename, indexname;

-- Verify indexes were created
SELECT 'Indexes created successfully (with column checks)!' as status;