-- PlateWise Meal Planning Database - Step by Step Deployment
-- Run each section separately to ensure proper order

-- ============================================================================
-- STEP 1: ENABLE EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- STEP 2: CREATE TABLES (Run this section first)
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

-- Verify tables were created
SELECT 'Tables created successfully!' as status;