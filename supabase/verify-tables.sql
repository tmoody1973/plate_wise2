-- Verify what tables and columns were actually created
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN (
    'user_preferences', 'meal_plans', 'recipes', 'recipe_ingredients',
    'shopping_lists', 'shopping_list_items', 'recipe_collections', 
    'collection_recipes', 'meal_plan_analytics'
  )
ORDER BY table_name, ordinal_position;