-- ============================================================================
-- STEP 2: SAFE INDEX CREATION (Only creates indexes for columns that exist)
-- ============================================================================

-- First, let's see what tables and columns actually exist
SELECT 'Checking what tables and columns exist...' as status;

-- Show all tables that were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Show all columns for our expected tables
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN (
    'user_preferences', 'meal_plans', 'recipes', 'recipe_ingredients',
    'shopping_lists', 'shopping_list_items', 'recipe_collections', 
    'collection_recipes', 'meal_plan_analytics'
  )
ORDER BY table_name, ordinal_position;

-- Now create indexes only for columns that definitely exist
-- We'll check each one individually

-- Basic user_id indexes (these should exist on most tables)
DO $$
BEGIN
  -- meal_plans.user_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meal_plans' AND column_name = 'user_id' AND table_schema = 'public'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_meal_plans_user_id ON meal_plans(user_id);
    RAISE NOTICE '✅ Created index on meal_plans.user_id';
  END IF;

  -- shopping_lists.user_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopping_lists' AND column_name = 'user_id' AND table_schema = 'public'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_id ON shopping_lists(user_id);
    RAISE NOTICE '✅ Created index on shopping_lists.user_id';
  END IF;

  -- recipe_collections.user_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recipe_collections' AND column_name = 'user_id' AND table_schema = 'public'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_recipe_collections_user_id ON recipe_collections(user_id);
    RAISE NOTICE '✅ Created index on recipe_collections.user_id';
  END IF;

  -- meal_plan_analytics.user_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meal_plan_analytics' AND column_name = 'user_id' AND table_schema = 'public'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_meal_plan_analytics_user_id ON meal_plan_analytics(user_id);
    RAISE NOTICE '✅ Created index on meal_plan_analytics.user_id';
  END IF;
END $$;

-- Basic created_at indexes (these should exist on most tables)
DO $$
BEGIN
  -- meal_plans.created_at
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meal_plans' AND column_name = 'created_at' AND table_schema = 'public'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_meal_plans_created_at ON meal_plans(created_at DESC);
    RAISE NOTICE '✅ Created index on meal_plans.created_at';
  END IF;

  -- meal_plan_analytics.created_at
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meal_plan_analytics' AND column_name = 'created_at' AND table_schema = 'public'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_meal_plan_analytics_created_at ON meal_plan_analytics(created_at DESC);
    RAISE NOTICE '✅ Created index on meal_plan_analytics.created_at';
  END IF;
END $$;

-- Foreign key indexes (only if the columns exist)
DO $$
BEGIN
  -- recipes.meal_plan_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recipes' AND column_name = 'meal_plan_id' AND table_schema = 'public'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_recipes_meal_plan_id ON recipes(meal_plan_id);
    RAISE NOTICE '✅ Created index on recipes.meal_plan_id';
  END IF;

  -- recipe_ingredients.recipe_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recipe_ingredients' AND column_name = 'recipe_id' AND table_schema = 'public'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
    RAISE NOTICE '✅ Created index on recipe_ingredients.recipe_id';
  END IF;

  -- shopping_lists.meal_plan_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopping_lists' AND column_name = 'meal_plan_id' AND table_schema = 'public'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_shopping_lists_meal_plan_id ON shopping_lists(meal_plan_id);
    RAISE NOTICE '✅ Created index on shopping_lists.meal_plan_id';
  END IF;

  -- shopping_list_items.shopping_list_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopping_list_items' AND column_name = 'shopping_list_id' AND table_schema = 'public'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_shopping_list_items_shopping_list_id ON shopping_list_items(shopping_list_id);
    RAISE NOTICE '✅ Created index on shopping_list_items.shopping_list_id';
  END IF;
END $$;

-- Optional performance indexes (only if columns exist)
DO $$
BEGIN
  -- meal_plans.status
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meal_plans' AND column_name = 'status' AND table_schema = 'public'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_meal_plans_status ON meal_plans(status);
    RAISE NOTICE '✅ Created index on meal_plans.status';
  END IF;

  -- recipes.cuisine
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recipes' AND column_name = 'cuisine' AND table_schema = 'public'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_recipes_cuisine ON recipes(cuisine);
    RAISE NOTICE '✅ Created index on recipes.cuisine';
  END IF;

  -- meal_plan_analytics.event_type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meal_plan_analytics' AND column_name = 'event_type' AND table_schema = 'public'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_meal_plan_analytics_event_type ON meal_plan_analytics(event_type);
    RAISE NOTICE '✅ Created index on meal_plan_analytics.event_type';
  END IF;
END $$;

-- Show final summary of what indexes were created
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes 
WHERE schemaname = 'public'
  AND tablename IN (
    'user_preferences', 'meal_plans', 'recipes', 'recipe_ingredients',
    'shopping_lists', 'shopping_list_items', 'recipe_collections', 
    'collection_recipes', 'meal_plan_analytics'
  )
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

SELECT 'Safe indexes created successfully! ✅' as status;