-- ============================================================================
-- STEP 4: SAFE ROW LEVEL SECURITY (Only creates policies for existing tables/columns)
-- ============================================================================

-- First, let's see what tables actually exist
SELECT 'Checking existing tables for RLS setup...' as status;

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'user_preferences', 'meal_plans', 'recipes', 'recipe_ingredients',
    'shopping_lists', 'shopping_list_items', 'recipe_collections', 
    'collection_recipes', 'meal_plan_analytics'
  )
ORDER BY table_name;

-- Enable RLS on tables that exist
DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN 
    SELECT t.table_name 
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' 
      AND t.table_type = 'BASE TABLE'
      AND t.table_name IN (
        'user_preferences', 'meal_plans', 'recipes', 'recipe_ingredients',
        'shopping_lists', 'shopping_list_items', 'recipe_collections', 
        'collection_recipes', 'meal_plan_analytics'
      )
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    RAISE NOTICE '✅ Enabled RLS on table: %', table_name;
  END LOOP;
END $$;

-- Create policies only for tables that exist and have the required columns

-- User Preferences Policies (if table exists and has user_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_preferences' AND table_schema = 'public'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_preferences' AND column_name = 'user_id' AND table_schema = 'public'
  ) THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
    DROP POLICY IF EXISTS "Users can insert their own preferences" ON user_preferences;
    DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
    DROP POLICY IF EXISTS "Users can delete their own preferences" ON user_preferences;

    -- Create new policies
    CREATE POLICY "Users can view their own preferences" ON user_preferences
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own preferences" ON user_preferences
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own preferences" ON user_preferences
      FOR UPDATE USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own preferences" ON user_preferences
      FOR DELETE USING (auth.uid() = user_id);

    RAISE NOTICE '✅ Created RLS policies for user_preferences';
  ELSE
    RAISE NOTICE '⚠️ Skipped user_preferences policies - table or user_id column missing';
  END IF;
END $$;

-- Meal Plans Policies (if table exists and has user_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'meal_plans' AND table_schema = 'public'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meal_plans' AND column_name = 'user_id' AND table_schema = 'public'
  ) THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view their own meal plans" ON meal_plans;
    DROP POLICY IF EXISTS "Users can insert their own meal plans" ON meal_plans;
    DROP POLICY IF EXISTS "Users can update their own meal plans" ON meal_plans;
    DROP POLICY IF EXISTS "Users can delete their own meal plans" ON meal_plans;

    -- Create new policies
    CREATE POLICY "Users can view their own meal plans" ON meal_plans
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own meal plans" ON meal_plans
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own meal plans" ON meal_plans
      FOR UPDATE USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own meal plans" ON meal_plans
      FOR DELETE USING (auth.uid() = user_id);

    RAISE NOTICE '✅ Created RLS policies for meal_plans';
  ELSE
    RAISE NOTICE '⚠️ Skipped meal_plans policies - table or user_id column missing';
  END IF;
END $$;

-- Recipes Policies (only if both tables exist and have the required columns)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'recipes' AND table_schema = 'public'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'meal_plans' AND table_schema = 'public'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recipes' AND column_name = 'meal_plan_id' AND table_schema = 'public'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meal_plans' AND column_name = 'user_id' AND table_schema = 'public'
  ) THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view recipes from their meal plans" ON recipes;
    DROP POLICY IF EXISTS "Users can insert recipes to their meal plans" ON recipes;
    DROP POLICY IF EXISTS "Users can update recipes in their meal plans" ON recipes;
    DROP POLICY IF EXISTS "Users can delete recipes from their meal plans" ON recipes;

    -- Create new policies
    CREATE POLICY "Users can view recipes from their meal plans" ON recipes
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM meal_plans 
          WHERE meal_plans.id = recipes.meal_plan_id 
          AND meal_plans.user_id = auth.uid()
        )
      );

    CREATE POLICY "Users can insert recipes to their meal plans" ON recipes
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM meal_plans 
          WHERE meal_plans.id = recipes.meal_plan_id 
          AND meal_plans.user_id = auth.uid()
        )
      );

    CREATE POLICY "Users can update recipes in their meal plans" ON recipes
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM meal_plans 
          WHERE meal_plans.id = recipes.meal_plan_id 
          AND meal_plans.user_id = auth.uid()
        )
      );

    CREATE POLICY "Users can delete recipes from their meal plans" ON recipes
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM meal_plans 
          WHERE meal_plans.id = recipes.meal_plan_id 
          AND meal_plans.user_id = auth.uid()
        )
      );

    RAISE NOTICE '✅ Created RLS policies for recipes';
  ELSE
    RAISE NOTICE '⚠️ Skipped recipes policies - missing tables or required columns';
  END IF;
END $$;

-- Shopping Lists Policies (if table exists and has user_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'shopping_lists' AND table_schema = 'public'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopping_lists' AND column_name = 'user_id' AND table_schema = 'public'
  ) THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view their own shopping lists" ON shopping_lists;
    DROP POLICY IF EXISTS "Users can insert their own shopping lists" ON shopping_lists;
    DROP POLICY IF EXISTS "Users can update their own shopping lists" ON shopping_lists;
    DROP POLICY IF EXISTS "Users can delete their own shopping lists" ON shopping_lists;

    -- Create new policies
    CREATE POLICY "Users can view their own shopping lists" ON shopping_lists
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own shopping lists" ON shopping_lists
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own shopping lists" ON shopping_lists
      FOR UPDATE USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own shopping lists" ON shopping_lists
      FOR DELETE USING (auth.uid() = user_id);

    RAISE NOTICE '✅ Created RLS policies for shopping_lists';
  ELSE
    RAISE NOTICE '⚠️ Skipped shopping_lists policies - table or user_id column missing';
  END IF;
END $$;

-- Recipe Collections Policies (if table exists and has user_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'recipe_collections' AND table_schema = 'public'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recipe_collections' AND column_name = 'user_id' AND table_schema = 'public'
  ) THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view their own collections" ON recipe_collections;
    DROP POLICY IF EXISTS "Users can view public collections" ON recipe_collections;
    DROP POLICY IF EXISTS "Users can insert their own collections" ON recipe_collections;
    DROP POLICY IF EXISTS "Users can update their own collections" ON recipe_collections;
    DROP POLICY IF EXISTS "Users can delete their own collections" ON recipe_collections;

    -- Create new policies
    CREATE POLICY "Users can view their own collections" ON recipe_collections
      FOR SELECT USING (auth.uid() = user_id);

    -- Only create public collections policy if is_public column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'recipe_collections' AND column_name = 'is_public' AND table_schema = 'public'
    ) THEN
      CREATE POLICY "Users can view public collections" ON recipe_collections
        FOR SELECT USING (is_public = TRUE);
    END IF;

    CREATE POLICY "Users can insert their own collections" ON recipe_collections
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update their own collections" ON recipe_collections
      FOR UPDATE USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete their own collections" ON recipe_collections
      FOR DELETE USING (auth.uid() = user_id);

    RAISE NOTICE '✅ Created RLS policies for recipe_collections';
  ELSE
    RAISE NOTICE '⚠️ Skipped recipe_collections policies - table or user_id column missing';
  END IF;
END $$;

-- Analytics Policies (if table exists and has user_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'meal_plan_analytics' AND table_schema = 'public'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meal_plan_analytics' AND column_name = 'user_id' AND table_schema = 'public'
  ) THEN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can view their own analytics" ON meal_plan_analytics;
    DROP POLICY IF EXISTS "Users can insert their own analytics" ON meal_plan_analytics;

    -- Create new policies
    CREATE POLICY "Users can view their own analytics" ON meal_plan_analytics
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert their own analytics" ON meal_plan_analytics
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    RAISE NOTICE '✅ Created RLS policies for meal_plan_analytics';
  ELSE
    RAISE NOTICE '⚠️ Skipped meal_plan_analytics policies - table or user_id column missing';
  END IF;
END $$;

-- Show summary of RLS status
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN (
    'user_preferences', 'meal_plans', 'recipes', 'recipe_ingredients',
    'shopping_lists', 'shopping_list_items', 'recipe_collections', 
    'collection_recipes', 'meal_plan_analytics'
  )
ORDER BY tablename;

-- Show created policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

SELECT 'Safe RLS policies created successfully! ✅' as status;