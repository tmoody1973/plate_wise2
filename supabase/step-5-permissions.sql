-- ============================================================================
-- STEP 5: GRANT PERMISSIONS (Run this last)
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions to service role for server-side operations
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Verify permissions were granted
SELECT 'Permissions granted successfully!' as status;

-- Final verification - check all tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name IN (
      'user_preferences', 'meal_plans', 'recipes', 'recipe_ingredients',
      'shopping_lists', 'shopping_list_items', 'recipe_collections', 
      'collection_recipes', 'meal_plan_analytics'
    ) THEN '✅ Created'
    ELSE '❌ Missing'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'user_preferences', 'meal_plans', 'recipes', 'recipe_ingredients',
    'shopping_lists', 'shopping_list_items', 'recipe_collections', 
    'collection_recipes', 'meal_plan_analytics'
  )
ORDER BY table_name;

-- Check RLS is enabled
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

SELECT 'PlateWise database deployment completed successfully! 🎉' as final_status;