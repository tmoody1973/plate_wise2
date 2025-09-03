-- PlateWise Database Schema for Supabase
-- This file contains the complete database schema as defined in the design document

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users and Authentication (handled by Supabase Auth)
-- Create user profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  location JSONB NOT NULL DEFAULT '{}',
  preferences JSONB NOT NULL DEFAULT '{}',
  budget_settings JSONB NOT NULL DEFAULT '{}',
  nutritional_goals JSONB NOT NULL DEFAULT '{}',
  cooking_profile JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipes
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  cultural_origin TEXT[] NOT NULL DEFAULT '{}',
  cuisine TEXT NOT NULL,
  ingredients JSONB NOT NULL DEFAULT '[]',
  instructions JSONB NOT NULL DEFAULT '[]',
  nutritional_info JSONB,
  cost_analysis JSONB,
  metadata JSONB NOT NULL DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  source TEXT NOT NULL CHECK (source IN ('user', 'spoonacular', 'community')),
  author_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipe Ratings and Reviews
CREATE TABLE recipe_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  cost_rating INTEGER CHECK (cost_rating >= 1 AND cost_rating <= 5),
  authenticity_rating INTEGER CHECK (authenticity_rating >= 1 AND authenticity_rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(recipe_id, user_id)
);

-- User Recipe Collections
CREATE TABLE recipe_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  recipe_ids UUID[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meal Plans
CREATE TABLE meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  meals JSONB NOT NULL DEFAULT '[]',
  total_cost DECIMAL(10,2),
  nutritional_summary JSONB,
  cultural_balance JSONB,
  generated_by TEXT CHECK (generated_by IN ('ai', 'user')),
  preferences JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shopping Lists
CREATE TABLE shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  total_estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  store_recommendations JSONB,
  coupons_available JSONB,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budget Tracking
CREATE TABLE budget_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  period_type TEXT CHECK (period_type IN ('weekly', 'monthly')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget_limit DECIMAL(10,2) NOT NULL,
  current_spending DECIMAL(10,2) DEFAULT 0,
  categories JSONB DEFAULT '{}',
  alerts JSONB DEFAULT '[]',
  projected_spending DECIMAL(10,2),
  savings_achieved DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  budget_period_id UUID REFERENCES budget_periods(id) ON DELETE CASCADE,
  shopping_list_id UUID REFERENCES shopping_lists(id) ON DELETE SET NULL,
  store_name TEXT,
  store_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  items JSONB DEFAULT '[]',
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Saved Stores
CREATE TABLE saved_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  store_type TEXT NOT NULL,
  address TEXT NOT NULL,
  google_place_id TEXT,
  specialties TEXT[] DEFAULT '{}',
  notes TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Community Features
CREATE TABLE user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Price History for Analytics
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name TEXT NOT NULL,
  store_id TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_recipes_cuisine ON recipes(cuisine);
CREATE INDEX idx_recipes_cultural_origin ON recipes USING GIN(cultural_origin);
CREATE INDEX idx_recipes_tags ON recipes USING GIN(tags);
CREATE INDEX idx_recipes_author_id ON recipes(author_id);
CREATE INDEX idx_recipes_is_public ON recipes(is_public);
CREATE INDEX idx_recipe_ratings_recipe_id ON recipe_ratings(recipe_id);
CREATE INDEX idx_recipe_ratings_user_id ON recipe_ratings(user_id);
CREATE INDEX idx_meal_plans_user_id ON meal_plans(user_id);
CREATE INDEX idx_meal_plans_date_range ON meal_plans(start_date, end_date);
CREATE INDEX idx_shopping_lists_user_id ON shopping_lists(user_id);
CREATE INDEX idx_shopping_lists_meal_plan_id ON shopping_lists(meal_plan_id);
CREATE INDEX idx_budget_periods_user_id ON budget_periods(user_id);
CREATE INDEX idx_budget_periods_date_range ON budget_periods(start_date, end_date);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_budget_period_id ON transactions(budget_period_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_saved_stores_user_id ON saved_stores(user_id);
CREATE INDEX idx_user_follows_follower_id ON user_follows(follower_id);
CREATE INDEX idx_user_follows_following_id ON user_follows(following_id);
CREATE INDEX idx_price_history_ingredient_store ON price_history(ingredient_name, store_id);
CREATE INDEX idx_price_history_recorded_at ON price_history(recorded_at);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User Profiles: Users can only access their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Recipes: Users can view public recipes and their own recipes
CREATE POLICY "Users can view public recipes" ON recipes
  FOR SELECT USING (is_public = true OR author_id = auth.uid());

CREATE POLICY "Users can insert own recipes" ON recipes
  FOR INSERT WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can update own recipes" ON recipes
  FOR UPDATE USING (author_id = auth.uid());

CREATE POLICY "Users can delete own recipes" ON recipes
  FOR DELETE USING (author_id = auth.uid());

-- Recipe Ratings: Users can view all ratings but only manage their own
CREATE POLICY "Users can view all recipe ratings" ON recipe_ratings
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own ratings" ON recipe_ratings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own ratings" ON recipe_ratings
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own ratings" ON recipe_ratings
  FOR DELETE USING (user_id = auth.uid());

-- Recipe Collections: Users can only access their own collections and public ones
CREATE POLICY "Users can view accessible collections" ON recipe_collections
  FOR SELECT USING (user_id = auth.uid() OR is_public = true);

CREATE POLICY "Users can manage own collections" ON recipe_collections
  FOR ALL USING (user_id = auth.uid());

-- Meal Plans: Users can only access their own meal plans
CREATE POLICY "Users can manage own meal plans" ON meal_plans
  FOR ALL USING (user_id = auth.uid());

-- Shopping Lists: Users can only access their own shopping lists
CREATE POLICY "Users can manage own shopping lists" ON shopping_lists
  FOR ALL USING (user_id = auth.uid());

-- Budget Periods: Users can only access their own budget data
CREATE POLICY "Users can manage own budget periods" ON budget_periods
  FOR ALL USING (user_id = auth.uid());

-- Transactions: Users can only access their own transactions
CREATE POLICY "Users can manage own transactions" ON transactions
  FOR ALL USING (user_id = auth.uid());

-- Saved Stores: Users can only access their own saved stores
CREATE POLICY "Users can manage own saved stores" ON saved_stores
  FOR ALL USING (user_id = auth.uid());

-- User Follows: Users can view follows and manage their own
CREATE POLICY "Users can view follows" ON user_follows
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own follows" ON user_follows
  FOR INSERT WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users can delete own follows" ON user_follows
  FOR DELETE USING (follower_id = auth.uid());

-- Price History: Read-only for all authenticated users
CREATE POLICY "Authenticated users can view price history" ON price_history
  FOR SELECT USING (auth.role() = 'authenticated');

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipe_collections_updated_at BEFORE UPDATE ON recipe_collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON meal_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopping_lists_updated_at BEFORE UPDATE ON shopping_lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_periods_updated_at BEFORE UPDATE ON budget_periods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_stores_updated_at BEFORE UPDATE ON saved_stores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default data for testing (optional)
-- This would be handled by the application in production

COMMENT ON TABLE user_profiles IS 'User profile information and preferences';
COMMENT ON TABLE recipes IS 'Recipe data from various sources including user-generated content';
COMMENT ON TABLE recipe_ratings IS 'User ratings and reviews for recipes';
COMMENT ON TABLE recipe_collections IS 'User-created collections of recipes';
COMMENT ON TABLE meal_plans IS 'AI-generated and user-created meal plans';
COMMENT ON TABLE shopping_lists IS 'Shopping lists generated from meal plans';
COMMENT ON TABLE budget_periods IS 'Budget tracking periods and limits';
COMMENT ON TABLE transactions IS 'Grocery shopping transactions';
COMMENT ON TABLE saved_stores IS 'User-saved grocery stores and markets';
COMMENT ON TABLE user_follows IS 'Social following relationships between users';
COMMENT ON TABLE price_history IS 'Historical pricing data for ingredients';