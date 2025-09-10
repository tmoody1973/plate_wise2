-- ============================================================================
-- STEP 2: CREATE INDEXES (Run this after tables are created)
-- ============================================================================

-- Meal Plans indexes
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_id ON meal_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_status ON meal_plans(status);
CREATE INDEX IF NOT EXISTS idx_meal_plans_created_at ON meal_plans(created_at DESC);

-- Recipes indexes
CREATE INDEX IF NOT EXISTS idx_recipes_meal_plan_id ON recipes(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_recipes_cuisine ON recipes(cuisine);
CREATE INDEX IF NOT EXISTS idx_recipes_has_pricing ON recipes(has_pricing);

-- Recipe Ingredients indexes
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_user_status ON recipe_ingredients(user_status);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_kroger_product_id ON recipe_ingredients(kroger_product_id);

-- Shopping Lists indexes
CREATE INDEX IF NOT EXISTS idx_shopping_lists_meal_plan_id ON shopping_lists(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_id ON shopping_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_status ON shopping_lists(status);

-- Shopping List Items indexes
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_shopping_list_id ON shopping_list_items(shopping_list_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_store ON shopping_list_items(store);

-- Recipe Collections indexes
CREATE INDEX IF NOT EXISTS idx_recipe_collections_user_id ON recipe_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_collections_is_public ON recipe_collections(is_public);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_meal_plan_analytics_user_id ON meal_plan_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_analytics_event_type ON meal_plan_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_meal_plan_analytics_created_at ON meal_plan_analytics(created_at DESC);

-- Verify indexes were created
SELECT 'Indexes created successfully!' as status;