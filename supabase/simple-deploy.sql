-- PlateWise Meal Planning Database - Simple Deployment
-- This script creates the essential schema without complex functions

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_cuisines TEXT[] DEFAULT '{}',
  dietary_restrictions TEXT[] DEFAULT '{}',
  default_budget DECIMAL(10,2) DEFAULT 50.00,
  household_size INTEGER DEFAULT 4,
  zip_code VARCHAR(10),
  preferred_stores TEXT[] DEFAULT '{}',
  cultural_background TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Meal Plans Table
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cultural_cuisines TEXT[] DEFAULT '{}',
  dietary_restrictions TEXT[] DEFAULT '{}',
  budget_limit DECIMAL(10,2) NOT NULL,
  household_size INTEGER DEFAULT 4,
  zip_code VARCHAR(10),
  time_frame VARCHAR(50) DEFAULT 'week',
  nutritional_goals TEXT[] DEFAULT '{}',
  exclude_ingredients TEXT[] DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'draft',
  total_cost DECIMAL(10,2) DEFAULT 0.00,
  cost_per_serving DECIMAL(10,2) DEFAULT 0.00,
  budget_utilization DECIMAL(5,2) DEFAULT 0.00,
  has_pricing BOOLEAN DEFAULT FALSE,
  recipe_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipes Table
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  cultural_origin TEXT[] DEFAULT '{}',
  cuisine VARCHAR(100) DEFAULT 'international',
  source VARCHAR(100) DEFAULT 'perplexity',
  source_url TEXT,
  image_url TEXT,
  servings INTEGER DEFAULT 4,
  prep_time INTEGER DEFAULT 15,
  cook_time INTEGER DEFAULT 30,
  total_time INTEGER DEFAULT 45,
  difficulty VARCHAR(50) DEFAULT 'medium',
  cultural_authenticity VARCHAR(50) DEFAULT 'medium',
  instructions JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  has_pricing BOOLEAN DEFAULT FALSE,
  total_cost DECIMAL(10,2) DEFAULT 0.00,
  cost_per_serving DECIMAL(10,2) DEFAULT 0.00,
  budget_friendly BOOLEAN DEFAULT FALSE,
  savings_opportunities TEXT[] DEFAULT '{}',
  kroger_store_location VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipe Ingredients Table
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  amount VARCHAR(100) DEFAULT '1',
  unit VARCHAR(50) DEFAULT 'serving',
  original_name VARCHAR(255) NOT NULL,
  is_substituted BOOLEAN DEFAULT FALSE,
  user_status VARCHAR(50) DEFAULT 'normal',
  specialty_store VARCHAR(255),
  kroger_product_id VARCHAR(100),
  kroger_product_name VARCHAR(500),
  kroger_price DECIMAL(10,2),
  kroger_unit_price DECIMAL(10,2),
  kroger_confidence VARCHAR(20),
  kroger_store_location VARCHAR(255),
  kroger_brand VARCHAR(255),
  kroger_size VARCHAR(100),
  on_sale BOOLEAN DEFAULT FALSE,
  sale_price DECIMAL(10,2),
  alternatives JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shopping Lists Table
CREATE TABLE IF NOT EXISTS shopping_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  total_estimated_cost DECIMAL(10,2) DEFAULT 0.00,
  store_breakdown JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shopping List Items Table
CREATE TABLE IF NOT EXISTS shopping_list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopping_list_id UUID REFERENCES shopping_lists(id) ON DELETE CASCADE,
  ingredient_name VARCHAR(255) NOT NULL,
  total_amount VARCHAR(100),
  estimated_cost DECIMAL(10,2) DEFAULT 0.00,
  store VARCHAR(255),
  category VARCHAR(100),
  recipes TEXT[] DEFAULT '{}',
  kroger_product_id VARCHAR(100),
  is_purchased BOOLEAN DEFAULT FALSE,
  actual_cost DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipe Collections Table
CREATE TABLE IF NOT EXISTS recipe_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  cultural_theme VARCHAR(100),
  tags TEXT[] DEFAULT '{}',
  recipe_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Collection Recipes Junction Table
CREATE TABLE IF NOT EXISTS collection_recipes (
  collection_id UUID REFERENCES recipe_collections(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  PRIMARY KEY (collection_id, recipe_id)
);

-- Meal Plan Analytics Table
CREATE TABLE IF NOT EXISTS meal_plan_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB DEFAULT '{}',
  cultural_cuisines TEXT[] DEFAULT '{}',
  budget_range VARCHAR(50),
  success_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Create indexes (only if they don't exist)
DO $$ 
BEGIN
  -- Meal Plans indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_meal_plans_user_id') THEN
    CREATE INDEX idx_meal_plans_user_id ON meal_plans(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_meal_plans_status') THEN
    CREATE INDEX idx_meal_plans_status ON meal_plans(status);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_meal_plans_created_at') THEN
    CREATE INDEX idx_meal_plans_created_at ON meal_plans(created_at DESC);
  END IF;

  -- Recipes indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_recipes_meal_plan_id') THEN
    CREATE INDEX idx_recipes_meal_plan_id ON recipes(meal_plan_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_recipes_cuisine') THEN
    CREATE INDEX idx_recipes_cuisine ON recipes(cuisine);
  END IF;

  -- Recipe Ingredients indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_recipe_ingredients_recipe_id') THEN
    CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_recipe_ingredients_user_status') THEN
    CREATE INDEX idx_recipe_ingredients_user_status ON recipe_ingredients(user_status);
  END IF;

  -- Shopping Lists indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_shopping_lists_meal_plan_id') THEN
    CREATE INDEX idx_shopping_lists_meal_plan_id ON shopping_lists(meal_plan_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_shopping_lists_user_id') THEN
    CREATE INDEX idx_shopping_lists_user_id ON shopping_lists(user_id);
  END IF;

  -- Analytics indexes
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_meal_plan_analytics_user_id') THEN
    CREATE INDEX idx_meal_plan_analytics_user_id ON meal_plan_analytics(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_meal_plan_analytics_event_type') THEN
    CREATE INDEX idx_meal_plan_analytics_event_type ON meal_plan_analytics(event_type);
  END IF;
END $$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_preferences_updated_at') THEN
    CREATE TRIGGER update_user_preferences_updated_at 
    BEFORE UPDATE ON user_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_meal_plans_updated_at') THEN
    CREATE TRIGGER update_meal_plans_updated_at 
    BEFORE UPDATE ON meal_plans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_recipes_updated_at') THEN
    CREATE TRIGGER update_recipes_updated_at 
    BEFORE UPDATE ON recipes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_recipe_ingredients_updated_at') THEN
    CREATE TRIGGER update_recipe_ingredients_updated_at 
    BEFORE UPDATE ON recipe_ingredients 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_shopping_lists_updated_at') THEN
    CREATE TRIGGER update_shopping_lists_updated_at 
    BEFORE UPDATE ON shopping_lists 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_shopping_list_items_updated_at') THEN
    CREATE TRIGGER update_shopping_list_items_updated_at 
    BEFORE UPDATE ON shopping_list_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_recipe_collections_updated_at') THEN
    CREATE TRIGGER update_recipe_collections_updated_at 
    BEFORE UPDATE ON recipe_collections 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

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
DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can delete their own preferences" ON user_preferences;

CREATE POLICY "Users can view their own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences" ON user_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Meal Plans Policies
DROP POLICY IF EXISTS "Users can view their own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can insert their own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can update their own meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Users can delete their own meal plans" ON meal_plans;

CREATE POLICY "Users can view their own meal plans" ON meal_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meal plans" ON meal_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal plans" ON meal_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal plans" ON meal_plans
  FOR DELETE USING (auth.uid() = user_id);

-- Recipes Policies
DROP POLICY IF EXISTS "Users can view recipes from their meal plans" ON recipes;
DROP POLICY IF EXISTS "Users can insert recipes to their meal plans" ON recipes;
DROP POLICY IF EXISTS "Users can update recipes in their meal plans" ON recipes;
DROP POLICY IF EXISTS "Users can delete recipes from their meal plans" ON recipes;

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

-- Recipe Ingredients Policies
DROP POLICY IF EXISTS "Users can view ingredients from their recipes" ON recipe_ingredients;
DROP POLICY IF EXISTS "Users can insert ingredients to their recipes" ON recipe_ingredients;
DROP POLICY IF EXISTS "Users can update ingredients in their recipes" ON recipe_ingredients;
DROP POLICY IF EXISTS "Users can delete ingredients from their recipes" ON recipe_ingredients;

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
DROP POLICY IF EXISTS "Users can view their own shopping lists" ON shopping_lists;
DROP POLICY IF EXISTS "Users can insert their own shopping lists" ON shopping_lists;
DROP POLICY IF EXISTS "Users can update their own shopping lists" ON shopping_lists;
DROP POLICY IF EXISTS "Users can delete their own shopping lists" ON shopping_lists;

CREATE POLICY "Users can view their own shopping lists" ON shopping_lists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shopping lists" ON shopping_lists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopping lists" ON shopping_lists
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shopping lists" ON shopping_lists
  FOR DELETE USING (auth.uid() = user_id);

-- Shopping List Items Policies
DROP POLICY IF EXISTS "Users can view items from their shopping lists" ON shopping_list_items;
DROP POLICY IF EXISTS "Users can insert items to their shopping lists" ON shopping_list_items;
DROP POLICY IF EXISTS "Users can update items in their shopping lists" ON shopping_list_items;
DROP POLICY IF EXISTS "Users can delete items from their shopping lists" ON shopping_list_items;

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

-- Analytics Policies
DROP POLICY IF EXISTS "Users can view their own analytics" ON meal_plan_analytics;
DROP POLICY IF EXISTS "Users can insert their own analytics" ON meal_plan_analytics;

CREATE POLICY "Users can view their own analytics" ON meal_plan_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics" ON meal_plan_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Success message
SELECT 'PlateWise database schema deployed successfully!' as status;