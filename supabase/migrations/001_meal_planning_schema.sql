-- PlateWise Meal Planning Database Schema
-- Migration: 001_meal_planning_schema.sql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Preferences Table
CREATE TABLE user_preferences (
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
CREATE TABLE meal_plans (
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
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'active', 'completed', 'archived'
  total_cost DECIMAL(10,2) DEFAULT 0.00,
  cost_per_serving DECIMAL(10,2) DEFAULT 0.00,
  budget_utilization DECIMAL(5,2) DEFAULT 0.00, -- Percentage of budget used
  has_pricing BOOLEAN DEFAULT FALSE,
  recipe_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipes Table
CREATE TABLE recipes (
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
  prep_time INTEGER DEFAULT 15, -- minutes
  cook_time INTEGER DEFAULT 30, -- minutes
  total_time INTEGER DEFAULT 45, -- minutes
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
CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  amount VARCHAR(100) DEFAULT '1',
  unit VARCHAR(50) DEFAULT 'serving',
  original_name VARCHAR(255) NOT NULL,
  is_substituted BOOLEAN DEFAULT FALSE,
  user_status VARCHAR(50) DEFAULT 'normal', -- 'normal', 'already-have', 'specialty-store'
  specialty_store VARCHAR(255),
  -- Kroger pricing data
  kroger_product_id VARCHAR(100),
  kroger_product_name VARCHAR(500),
  kroger_price DECIMAL(10,2),
  kroger_unit_price DECIMAL(10,2),
  kroger_confidence VARCHAR(20), -- 'high', 'medium', 'low'
  kroger_store_location VARCHAR(255),
  kroger_brand VARCHAR(255),
  kroger_size VARCHAR(100),
  on_sale BOOLEAN DEFAULT FALSE,
  sale_price DECIMAL(10,2),
  -- Alternative products
  alternatives JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shopping Lists Table
CREATE TABLE shopping_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  total_estimated_cost DECIMAL(10,2) DEFAULT 0.00,
  store_breakdown JSONB DEFAULT '{}', -- Store-wise item breakdown
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'shopping', 'completed'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shopping List Items Table
CREATE TABLE shopping_list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopping_list_id UUID REFERENCES shopping_lists(id) ON DELETE CASCADE,
  ingredient_name VARCHAR(255) NOT NULL,
  total_amount VARCHAR(100),
  estimated_cost DECIMAL(10,2) DEFAULT 0.00,
  store VARCHAR(255),
  category VARCHAR(100), -- 'produce', 'meat', 'dairy', etc.
  recipes TEXT[] DEFAULT '{}', -- Which recipes use this ingredient
  kroger_product_id VARCHAR(100),
  is_purchased BOOLEAN DEFAULT FALSE,
  actual_cost DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipe Collections Table (for favorites, custom collections)
CREATE TABLE recipe_collections (
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
CREATE TABLE collection_recipes (
  collection_id UUID REFERENCES recipe_collections(id) ON DELETE CASCADE,
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  PRIMARY KEY (collection_id, recipe_id)
);

-- Meal Plan Analytics Table (for tracking user behavior and optimization)
CREATE TABLE meal_plan_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL, -- 'created', 'recipe_added', 'pricing_added', 'ingredient_substituted', 'completed'
  event_data JSONB DEFAULT '{}',
  cultural_cuisines TEXT[] DEFAULT '{}',
  budget_range VARCHAR(50),
  success_metrics JSONB DEFAULT '{}', -- Time to complete, satisfaction, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_meal_plans_user_id ON meal_plans(user_id);
CREATE INDEX idx_meal_plans_status ON meal_plans(status);
CREATE INDEX idx_meal_plans_cultural_cuisines ON meal_plans USING GIN(cultural_cuisines);
CREATE INDEX idx_meal_plans_created_at ON meal_plans(created_at DESC);

CREATE INDEX idx_recipes_meal_plan_id ON recipes(meal_plan_id);
CREATE INDEX idx_recipes_cuisine ON recipes(cuisine);
CREATE INDEX idx_recipes_cultural_origin ON recipes USING GIN(cultural_origin);
CREATE INDEX idx_recipes_has_pricing ON recipes(has_pricing);

CREATE INDEX idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
CREATE INDEX idx_recipe_ingredients_user_status ON recipe_ingredients(user_status);
CREATE INDEX idx_recipe_ingredients_kroger_product_id ON recipe_ingredients(kroger_product_id);

CREATE INDEX idx_shopping_lists_meal_plan_id ON shopping_lists(meal_plan_id);
CREATE INDEX idx_shopping_lists_user_id ON shopping_lists(user_id);
CREATE INDEX idx_shopping_lists_status ON shopping_lists(status);

CREATE INDEX idx_shopping_list_items_shopping_list_id ON shopping_list_items(shopping_list_id);
CREATE INDEX idx_shopping_list_items_store ON shopping_list_items(store);

CREATE INDEX idx_recipe_collections_user_id ON recipe_collections(user_id);
CREATE INDEX idx_recipe_collections_is_public ON recipe_collections(is_public);

CREATE INDEX idx_meal_plan_analytics_user_id ON meal_plan_analytics(user_id);
CREATE INDEX idx_meal_plan_analytics_event_type ON meal_plan_analytics(event_type);
CREATE INDEX idx_meal_plan_analytics_created_at ON meal_plan_analytics(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to all tables
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON meal_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recipe_ingredients_updated_at BEFORE UPDATE ON recipe_ingredients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shopping_lists_updated_at BEFORE UPDATE ON shopping_lists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shopping_list_items_updated_at BEFORE UPDATE ON shopping_list_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recipe_collections_updated_at BEFORE UPDATE ON recipe_collections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();