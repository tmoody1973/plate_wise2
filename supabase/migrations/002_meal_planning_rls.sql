-- PlateWise Meal Planning Row Level Security (RLS) Policies
-- Migration: 002_meal_planning_rls.sql

-- Enable RLS on all tables
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_analytics ENABLE ROW LEVEL SECURITY;

-- User Preferences Policies
CREATE POLICY "Users can view their own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences" ON user_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Meal Plans Policies
CREATE POLICY "Users can view their own meal plans" ON meal_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meal plans" ON meal_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal plans" ON meal_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal plans" ON meal_plans
  FOR DELETE USING (auth.uid() = user_id);

-- Recipes Policies (access through meal plan ownership)
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

-- Recipe Ingredients Policies (access through recipe ownership)
CREATE POLICY "Users can view ingredients from their recipes" ON recipe_ingredients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM recipes 
      JOIN meal_plans ON meal_plans.id = recipes.meal_plan_id
      WHERE recipes.id = recipe_ingredients.recipe_id 
      AND meal_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert ingredients to their recipes" ON recipe_ingredients
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes 
      JOIN meal_plans ON meal_plans.id = recipes.meal_plan_id
      WHERE recipes.id = recipe_ingredients.recipe_id 
      AND meal_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update ingredients in their recipes" ON recipe_ingredients
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM recipes 
      JOIN meal_plans ON meal_plans.id = recipes.meal_plan_id
      WHERE recipes.id = recipe_ingredients.recipe_id 
      AND meal_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete ingredients from their recipes" ON recipe_ingredients
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM recipes 
      JOIN meal_plans ON meal_plans.id = recipes.meal_plan_id
      WHERE recipes.id = recipe_ingredients.recipe_id 
      AND meal_plans.user_id = auth.uid()
    )
  );

-- Shopping Lists Policies
CREATE POLICY "Users can view their own shopping lists" ON shopping_lists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shopping lists" ON shopping_lists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopping lists" ON shopping_lists
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shopping lists" ON shopping_lists
  FOR DELETE USING (auth.uid() = user_id);

-- Shopping List Items Policies (access through shopping list ownership)
CREATE POLICY "Users can view items from their shopping lists" ON shopping_list_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM shopping_lists 
      WHERE shopping_lists.id = shopping_list_items.shopping_list_id 
      AND shopping_lists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert items to their shopping lists" ON shopping_list_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM shopping_lists 
      WHERE shopping_lists.id = shopping_list_items.shopping_list_id 
      AND shopping_lists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items in their shopping lists" ON shopping_list_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM shopping_lists 
      WHERE shopping_lists.id = shopping_list_items.shopping_list_id 
      AND shopping_lists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items from their shopping lists" ON shopping_list_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM shopping_lists 
      WHERE shopping_lists.id = shopping_list_items.shopping_list_id 
      AND shopping_lists.user_id = auth.uid()
    )
  );

-- Recipe Collections Policies
CREATE POLICY "Users can view their own collections" ON recipe_collections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view public collections" ON recipe_collections
  FOR SELECT USING (is_public = TRUE);

CREATE POLICY "Users can insert their own collections" ON recipe_collections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections" ON recipe_collections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections" ON recipe_collections
  FOR DELETE USING (auth.uid() = user_id);

-- Collection Recipes Policies (access through collection ownership)
CREATE POLICY "Users can view recipes in accessible collections" ON collection_recipes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM recipe_collections 
      WHERE recipe_collections.id = collection_recipes.collection_id 
      AND (recipe_collections.user_id = auth.uid() OR recipe_collections.is_public = TRUE)
    )
  );

CREATE POLICY "Users can add recipes to their collections" ON collection_recipes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipe_collections 
      WHERE recipe_collections.id = collection_recipes.collection_id 
      AND recipe_collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove recipes from their collections" ON collection_recipes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM recipe_collections 
      WHERE recipe_collections.id = collection_recipes.collection_id 
      AND recipe_collections.user_id = auth.uid()
    )
  );

-- Meal Plan Analytics Policies
CREATE POLICY "Users can view their own analytics" ON meal_plan_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics" ON meal_plan_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant permissions to service role for server-side operations
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;