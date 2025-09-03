-- Cultural Pricing Database Schema
-- This schema stores pricing data from Perplexity and other sources

-- Stores information about different grocery stores
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  store_type VARCHAR(50) NOT NULL, -- 'ethnic_market', 'mainstream', 'specialty', etc.
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  phone VARCHAR(20),
  google_place_id VARCHAR(255),
  cultural_specialties TEXT[], -- Array of cultural cuisines they specialize in
  languages TEXT[], -- Languages spoken at store
  quality_rating DECIMAL(3,2) DEFAULT 3.0, -- 0-5 rating
  price_reliability DECIMAL(3,2) DEFAULT 0.5, -- 0-1 how often they have items
  avg_price_difference DECIMAL(5,2) DEFAULT 0, -- % difference from mainstream
  coordinates POINT, -- For distance calculations
  hours JSONB, -- Store hours
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stores ingredient pricing data
CREATE TABLE IF NOT EXISTS ingredient_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name VARCHAR(255) NOT NULL,
  normalized_name VARCHAR(255) NOT NULL, -- Lowercase, standardized name
  traditional_names TEXT[], -- Cultural names for the ingredient
  store_id UUID REFERENCES stores(id),
  store_name VARCHAR(255), -- Denormalized for quick access
  store_type VARCHAR(50),
  price DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50) NOT NULL, -- 'per lb', 'per oz', 'each', etc.
  cultural_relevance VARCHAR(20) DEFAULT 'medium', -- 'high', 'medium', 'low'
  cultural_context VARCHAR(100), -- 'persian', 'mexican', etc.
  confidence DECIMAL(3,2) NOT NULL, -- 0-1 confidence score
  source VARCHAR(100) NOT NULL, -- 'perplexity', 'kroger', 'user_report', etc.
  source_url TEXT,
  seasonal_availability VARCHAR(50) DEFAULT 'year-round',
  bulk_options JSONB, -- Bulk pricing information
  notes TEXT,
  location_zip VARCHAR(20), -- For location-based pricing
  expires_at TIMESTAMP WITH TIME ZONE, -- When this price data expires
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stores user-reported pricing corrections
CREATE TABLE IF NOT EXISTS user_price_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- References auth.users
  ingredient_name VARCHAR(255) NOT NULL,
  store_name VARCHAR(255) NOT NULL,
  reported_price DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  store_type VARCHAR(50),
  cultural_context VARCHAR(100),
  location_zip VARCHAR(20),
  confidence VARCHAR(20) DEFAULT 'user_verified', -- 'user_verified', 'community_verified'
  notes TEXT,
  photo_url TEXT, -- Optional receipt photo
  verified_by_community BOOLEAN DEFAULT FALSE,
  verification_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stores cultural ingredient context and significance
CREATE TABLE IF NOT EXISTS cultural_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name VARCHAR(255) NOT NULL,
  normalized_name VARCHAR(255) NOT NULL,
  cultural_origins TEXT[] NOT NULL, -- ['persian', 'middle_eastern']
  traditional_names JSONB, -- {"persian": "za'faran", "arabic": "za'faran"}
  cultural_significance VARCHAR(50) NOT NULL, -- 'essential', 'important', 'common', 'optional'
  seasonality JSONB, -- Peak seasons, availability info
  common_substitutes TEXT[],
  preparation_notes TEXT,
  cultural_context TEXT, -- Historical/cultural significance
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stores pricing cache for quick lookups
CREATE TABLE IF NOT EXISTS pricing_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR(500) NOT NULL UNIQUE, -- Hash of ingredients + location + cultural context
  ingredients TEXT[] NOT NULL,
  location_zip VARCHAR(20) NOT NULL,
  cultural_context VARCHAR(100),
  pricing_data JSONB NOT NULL, -- Full pricing response
  total_estimated_cost DECIMAL(10,2),
  potential_savings DECIMAL(10,2),
  primary_store_recommendation VARCHAR(255),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipe-specific pricing data and history
CREATE TABLE IF NOT EXISTS recipe_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL, -- References recipes(id) from main schema
  recipe_title VARCHAR(255), -- Denormalized for quick access
  cultural_context VARCHAR(100), -- From recipe's cultural_origin
  total_estimated_cost DECIMAL(10,2) NOT NULL,
  cost_per_serving DECIMAL(10,2),
  servings INTEGER DEFAULT 4,
  location_zip VARCHAR(20) NOT NULL,
  primary_store_id UUID REFERENCES stores(id),
  alternative_stores JSONB, -- Array of store options with costs
  ingredient_breakdown JSONB NOT NULL, -- Detailed cost per ingredient
  cultural_authenticity_score DECIMAL(3,2), -- 0-10 authenticity rating
  cost_optimization_notes TEXT,
  potential_savings DECIMAL(10,2),
  pricing_confidence DECIMAL(3,2) NOT NULL, -- Overall confidence 0-1
  source_breakdown JSONB, -- Which pricing sources were used
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recipe ingredient pricing details (normalized from recipe_pricing)
CREATE TABLE IF NOT EXISTS recipe_ingredient_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_pricing_id UUID REFERENCES recipe_pricing(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL, -- References recipes(id)
  ingredient_name VARCHAR(255) NOT NULL,
  normalized_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,3) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  estimated_cost DECIMAL(10,2) NOT NULL,
  cost_per_unit DECIMAL(10,2) NOT NULL,
  recommended_store_id UUID REFERENCES stores(id),
  recommended_store_name VARCHAR(255),
  cultural_importance VARCHAR(20) DEFAULT 'medium', -- 'essential', 'important', 'common', 'optional'
  substitution_available BOOLEAN DEFAULT FALSE,
  substitution_notes TEXT,
  confidence DECIMAL(3,2) NOT NULL,
  source VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shopping optimization for recipes
CREATE TABLE IF NOT EXISTS recipe_shopping_optimization (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL, -- References recipes(id)
  location_zip VARCHAR(20) NOT NULL,
  optimal_shopping_strategy JSONB NOT NULL, -- Multi-store shopping plan
  single_store_option JSONB, -- Best single-store option
  cultural_store_priority JSONB, -- Ethnic markets prioritized for cultural ingredients
  estimated_total_cost DECIMAL(10,2) NOT NULL,
  estimated_savings DECIMAL(10,2),
  time_investment_minutes INTEGER, -- Estimated shopping time
  cultural_authenticity_maintained BOOLEAN DEFAULT TRUE,
  notes TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Junction table: Links ingredients to recipes for better price context
-- This helps us understand ingredient usage patterns without duplicating price data
CREATE TABLE IF NOT EXISTS recipe_ingredients_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL, -- References recipes(id)
  ingredient_name VARCHAR(255) NOT NULL,
  normalized_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,3),
  unit VARCHAR(50),
  cultural_importance VARCHAR(20) DEFAULT 'medium', -- 'essential', 'important', 'common', 'optional'
  preparation_notes TEXT, -- How this ingredient is used in this specific recipe
  substitution_allowed BOOLEAN DEFAULT TRUE,
  substitution_impact VARCHAR(20) DEFAULT 'minimal', -- 'none', 'minimal', 'moderate', 'significant'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(recipe_id, normalized_name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ingredient_prices_ingredient ON ingredient_prices(normalized_name);
CREATE INDEX IF NOT EXISTS idx_ingredient_prices_store ON ingredient_prices(store_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_prices_location ON ingredient_prices(location_zip);
CREATE INDEX IF NOT EXISTS idx_ingredient_prices_cultural ON ingredient_prices(cultural_context);
CREATE INDEX IF NOT EXISTS idx_ingredient_prices_expires ON ingredient_prices(expires_at);

CREATE INDEX IF NOT EXISTS idx_stores_type ON stores(store_type);
CREATE INDEX IF NOT EXISTS idx_stores_location ON stores(zip_code);
CREATE INDEX IF NOT EXISTS idx_stores_specialties ON stores USING GIN(cultural_specialties);

CREATE INDEX IF NOT EXISTS idx_cultural_ingredients_name ON cultural_ingredients(normalized_name);
CREATE INDEX IF NOT EXISTS idx_cultural_ingredients_origins ON cultural_ingredients USING GIN(cultural_origins);

CREATE INDEX IF NOT EXISTS idx_pricing_cache_key ON pricing_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_pricing_cache_expires ON pricing_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_user_price_reports_ingredient ON user_price_reports(ingredient_name);
CREATE INDEX IF NOT EXISTS idx_user_price_reports_location ON user_price_reports(location_zip);

-- Recipe-related indexes
CREATE INDEX IF NOT EXISTS idx_recipe_pricing_recipe_id ON recipe_pricing(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_pricing_location ON recipe_pricing(location_zip);
CREATE INDEX IF NOT EXISTS idx_recipe_pricing_cultural ON recipe_pricing(cultural_context);
CREATE INDEX IF NOT EXISTS idx_recipe_pricing_expires ON recipe_pricing(expires_at);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredient_prices_recipe ON recipe_ingredient_prices(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredient_prices_recipe_pricing ON recipe_ingredient_prices(recipe_pricing_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredient_prices_ingredient ON recipe_ingredient_prices(normalized_name);

CREATE INDEX IF NOT EXISTS idx_recipe_shopping_optimization_recipe ON recipe_shopping_optimization(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_shopping_optimization_location ON recipe_shopping_optimization(location_zip);
CREATE INDEX IF NOT EXISTS idx_recipe_shopping_optimization_expires ON recipe_shopping_optimization(expires_at);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_context_recipe ON recipe_ingredients_context(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_context_ingredient ON recipe_ingredients_context(normalized_name);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_context_importance ON recipe_ingredients_context(cultural_importance);

-- Functions for data management

-- Function to clean expired pricing data
CREATE OR REPLACE FUNCTION clean_expired_pricing_data()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete expired ingredient prices
  DELETE FROM ingredient_prices WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Delete expired cache entries
  DELETE FROM pricing_cache WHERE expires_at < NOW();
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to normalize ingredient names
CREATE OR REPLACE FUNCTION normalize_ingredient_name(ingredient_name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(TRIM(REGEXP_REPLACE(ingredient_name, '[^a-zA-Z0-9\s]', ' ', 'g')));
END;
$$ LANGUAGE plpgsql;

-- Function to calculate price confidence based on multiple factors
CREATE OR REPLACE FUNCTION calculate_price_confidence(
  source_confidence DECIMAL,
  age_hours INTEGER,
  verification_count INTEGER DEFAULT 0
)
RETURNS DECIMAL AS $$
DECLARE
  age_factor DECIMAL;
  verification_factor DECIMAL;
  final_confidence DECIMAL;
BEGIN
  -- Age factor: confidence decreases over time
  age_factor = CASE 
    WHEN age_hours <= 24 THEN 1.0
    WHEN age_hours <= 168 THEN 0.8  -- 1 week
    WHEN age_hours <= 720 THEN 0.6  -- 1 month
    ELSE 0.3
  END;
  
  -- Verification factor: community verification increases confidence
  verification_factor = LEAST(1.0, 1.0 + (verification_count * 0.1));
  
  final_confidence = source_confidence * age_factor * verification_factor;
  
  RETURN LEAST(1.0, final_confidence);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update normalized names
CREATE OR REPLACE FUNCTION update_normalized_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.normalized_name = normalize_ingredient_name(NEW.ingredient_name);
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_ingredient_prices_normalize ON ingredient_prices;
DROP TRIGGER IF EXISTS trigger_cultural_ingredients_normalize ON cultural_ingredients;

CREATE TRIGGER trigger_ingredient_prices_normalize
  BEFORE INSERT OR UPDATE ON ingredient_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_normalized_name();

CREATE TRIGGER trigger_cultural_ingredients_normalize
  BEFORE INSERT OR UPDATE ON cultural_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION update_normalized_name();

-- Row Level Security (RLS) policies
-- Enable RLS only if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'stores' AND relrowsecurity = true) THEN
    ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'ingredient_prices' AND relrowsecurity = true) THEN
    ALTER TABLE ingredient_prices ENABLE ROW LEVEL SECURITY;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'user_price_reports' AND relrowsecurity = true) THEN
    ALTER TABLE user_price_reports ENABLE ROW LEVEL SECURITY;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'cultural_ingredients' AND relrowsecurity = true) THEN
    ALTER TABLE cultural_ingredients ENABLE ROW LEVEL SECURITY;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'pricing_cache' AND relrowsecurity = true) THEN
    ALTER TABLE pricing_cache ENABLE ROW LEVEL SECURITY;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'recipe_pricing' AND relrowsecurity = true) THEN
    ALTER TABLE recipe_pricing ENABLE ROW LEVEL SECURITY;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'recipe_ingredient_prices' AND relrowsecurity = true) THEN
    ALTER TABLE recipe_ingredient_prices ENABLE ROW LEVEL SECURITY;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'recipe_shopping_optimization' AND relrowsecurity = true) THEN
    ALTER TABLE recipe_shopping_optimization ENABLE ROW LEVEL SECURITY;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'recipe_ingredients_context' AND relrowsecurity = true) THEN
    ALTER TABLE recipe_ingredients_context ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for stores" ON stores;
DROP POLICY IF EXISTS "Public read access for ingredient prices" ON ingredient_prices;
DROP POLICY IF EXISTS "Public read access for cultural ingredients" ON cultural_ingredients;
DROP POLICY IF EXISTS "Public read access for pricing cache" ON pricing_cache;
DROP POLICY IF EXISTS "Public read access for recipe pricing" ON recipe_pricing;
DROP POLICY IF EXISTS "Public read access for recipe ingredient prices" ON recipe_ingredient_prices;
DROP POLICY IF EXISTS "Public read access for recipe shopping optimization" ON recipe_shopping_optimization;
DROP POLICY IF EXISTS "Public read access for recipe ingredients context" ON recipe_ingredients_context;
DROP POLICY IF EXISTS "Users can insert their own price reports" ON user_price_reports;
DROP POLICY IF EXISTS "Users can view their own price reports" ON user_price_reports;
DROP POLICY IF EXISTS "Users can update their own price reports" ON user_price_reports;

-- Public read access for stores and ingredient prices
CREATE POLICY "Public read access for stores" ON stores FOR SELECT USING (true);
CREATE POLICY "Public read access for ingredient prices" ON ingredient_prices FOR SELECT USING (true);
CREATE POLICY "Public read access for cultural ingredients" ON cultural_ingredients FOR SELECT USING (true);
CREATE POLICY "Public read access for pricing cache" ON pricing_cache FOR SELECT USING (true);
CREATE POLICY "Public read access for recipe pricing" ON recipe_pricing FOR SELECT USING (true);
CREATE POLICY "Public read access for recipe ingredient prices" ON recipe_ingredient_prices FOR SELECT USING (true);
CREATE POLICY "Public read access for recipe shopping optimization" ON recipe_shopping_optimization FOR SELECT USING (true);
CREATE POLICY "Public read access for recipe ingredients context" ON recipe_ingredients_context FOR SELECT USING (true);

-- Users can only manage their own price reports
CREATE POLICY "Users can insert their own price reports" ON user_price_reports 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own price reports" ON user_price_reports 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own price reports" ON user_price_reports 
  FOR UPDATE USING (auth.uid() = user_id);

-- Admin policies (you'll need to create an admin role)
-- CREATE POLICY "Admins can manage all data" ON stores FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
-- CREATE POLICY "Admins can manage ingredient prices" ON ingredient_prices FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Enhanced Perplexity integration tables
CREATE TABLE IF NOT EXISTS perplexity_cultural_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR(500) NOT NULL UNIQUE,
  ingredients TEXT[] NOT NULL,
  location_zip VARCHAR(20) NOT NULL,
  cultural_context VARCHAR(100),
  raw_perplexity_response TEXT NOT NULL,
  parsed_results JSONB NOT NULL,
  ethnic_markets_discovered TEXT[],
  cultural_insights TEXT[],
  shopping_strategy TEXT,
  total_estimated_cost DECIMAL(10,2),
  confidence_score DECIMAL(3,2) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Traditional ingredient names with enhanced cultural data
CREATE TABLE IF NOT EXISTS enhanced_cultural_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name VARCHAR(255) NOT NULL,
  normalized_name VARCHAR(255) NOT NULL,
  traditional_names JSONB NOT NULL,
  cultural_origins TEXT[] NOT NULL,
  cultural_significance VARCHAR(20) NOT NULL,
  seasonal_availability JSONB,
  bulk_buying_notes TEXT,
  authenticity_importance DECIMAL(3,2) DEFAULT 5.0, -- 1-10 scale
  sourcing_tips TEXT[],
  price_sensitivity VARCHAR(20) DEFAULT 'medium', -- high/medium/low
  perplexity_enhanced BOOLEAN DEFAULT FALSE,
  last_perplexity_update TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ethnic markets discovered through Perplexity
CREATE TABLE IF NOT EXISTS perplexity_discovered_markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_name VARCHAR(255) NOT NULL,
  address TEXT,
  location_zip VARCHAR(20),
  cultural_specialties TEXT[] NOT NULL,
  store_type VARCHAR(50) NOT NULL,
  mentioned_in_responses INTEGER DEFAULT 1,
  quality_indicators TEXT[],
  price_competitiveness VARCHAR(20) DEFAULT 'unknown',
  community_verified BOOLEAN DEFAULT FALSE,
  first_discovered TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_mentioned TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for enhanced performance
CREATE INDEX IF NOT EXISTS idx_perplexity_responses_cache ON perplexity_cultural_responses(cache_key);
CREATE INDEX IF NOT EXISTS idx_perplexity_responses_location ON perplexity_cultural_responses(location_zip);
CREATE INDEX IF NOT EXISTS idx_perplexity_responses_cultural ON perplexity_cultural_responses(cultural_context);
CREATE INDEX IF NOT EXISTS idx_perplexity_responses_expires ON perplexity_cultural_responses(expires_at);
CREATE INDEX IF NOT EXISTS idx_enhanced_cultural_ingredients_name ON enhanced_cultural_ingredients(normalized_name);
CREATE INDEX IF NOT EXISTS idx_enhanced_cultural_ingredients_origins ON enhanced_cultural_ingredients USING GIN(cultural_origins);
CREATE INDEX IF NOT EXISTS idx_perplexity_markets_location ON perplexity_discovered_markets(location_zip);
CREATE INDEX IF NOT EXISTS idx_perplexity_markets_specialties ON perplexity_discovered_markets USING GIN(cultural_specialties);

-- Sample enhanced data for testing (insert only if not exists)
INSERT INTO enhanced_cultural_ingredients (ingredient_name, normalized_name, traditional_names, cultural_origins, cultural_significance, authenticity_importance, sourcing_tips, price_sensitivity, perplexity_enhanced) 
SELECT * FROM (VALUES
  ('saffron', 'saffron', '{"persian": "za''faran", "arabic": "za''faran", "spanish": "azafrán", "hindi": "kesar"}'::JSONB, ARRAY['persian', 'middle_eastern', 'spanish', 'indian'], 'essential', 9.5, ARRAY['Buy from Persian/Middle Eastern markets for freshness', 'Look for Category I grade', 'Store in cool, dark place'], 'high', TRUE),
  ('sumac', 'sumac', '{"persian": "somagh", "arabic": "summaq", "turkish": "sumak"}'::JSONB, ARRAY['middle_eastern', 'persian', 'turkish'], 'important', 8.0, ARRAY['Middle Eastern markets have better quality', 'Should be deep red color', 'Avoid if brownish'], 'medium', TRUE),
  ('masa harina', 'masa harina', '{"spanish": "masa harina", "english": "corn flour"}'::JSONB, ARRAY['mexican'], 'essential', 9.0, ARRAY['Mexican markets often have fresher stock', 'Maseca brand widely available', 'Check expiration date carefully'], 'medium', TRUE),
  ('ghee', 'ghee', '{"hindi": "ghee", "sanskrit": "ghrita", "punjabi": "ghi"}'::JSONB, ARRAY['indian', 'south_asian'], 'important', 8.5, ARRAY['Indian markets have variety of brands', 'Homemade often available', 'Organic options at health stores'], 'medium', TRUE),
  ('paneer', 'paneer', '{"hindi": "paneer", "urdu": "paneer"}'::JSONB, ARRAY['indian', 'south_asian'], 'important', 8.0, ARRAY['Fresh paneer from Indian markets', 'Check softness and freshness', 'Can be made at home'], 'high', TRUE)
) AS v(ingredient_name, normalized_name, traditional_names, cultural_origins, cultural_significance, authenticity_importance, sourcing_tips, price_sensitivity, perplexity_enhanced)
WHERE NOT EXISTS (
  SELECT 1 FROM enhanced_cultural_ingredients eci 
  WHERE eci.ingredient_name = v.ingredient_name
);

-- Sample stores (insert only if not exists)
INSERT INTO stores (name, store_type, address, city, state, zip_code, cultural_specialties, languages, quality_rating, avg_price_difference)
SELECT * FROM (VALUES
  ('Aria Persian Market', 'ethnic_market', '123 Main St', 'Los Angeles', 'CA', '90210', ARRAY['persian', 'middle_eastern'], ARRAY['English', 'Persian', 'Arabic'], 4.5, -15),
  ('Super Mercado Latino', 'ethnic_market', '456 Oak Ave', 'Los Angeles', 'CA', '90210', ARRAY['mexican', 'latin_american'], ARRAY['English', 'Spanish'], 4.2, -12),
  ('Patel Brothers', 'ethnic_market', '789 Pine St', 'Los Angeles', 'CA', '90210', ARRAY['indian', 'south_asian'], ARRAY['English', 'Hindi', 'Gujarati'], 4.3, -18),
  ('Kroger', 'mainstream', '321 Elm St', 'Los Angeles', 'CA', '90210', ARRAY[]::TEXT[], ARRAY['English'], 3.8, 0)
) AS v(name, store_type, address, city, state, zip_code, cultural_specialties, languages, quality_rating, avg_price_difference)
WHERE NOT EXISTS (
  SELECT 1 FROM stores s 
  WHERE s.name = v.name AND s.zip_code = v.zip_code
);

-- Sample recipe pricing data (assuming some recipe IDs exist)
-- Note: In production, these would reference actual recipe IDs from the recipes table
INSERT INTO recipe_pricing (recipe_id, recipe_title, cultural_context, total_estimated_cost, cost_per_serving, servings, location_zip, ingredient_breakdown, cultural_authenticity_score, pricing_confidence, source_breakdown, expires_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Persian Saffron Rice (Tahdig)', 'persian', 18.50, 4.63, 4, '90210', 
 '{"saffron": {"cost": 2.50, "store": "Aria Persian Market"}, "basmati_rice": {"cost": 3.99, "store": "Aria Persian Market"}, "butter": {"cost": 1.25, "store": "Kroger"}}', 
 9.2, 0.85, '{"perplexity": 0.7, "kroger": 0.2, "estimates": 0.1}', NOW() + INTERVAL '24 hours'),
('550e8400-e29b-41d4-a716-446655440002', 'Authentic Chicken Tacos', 'mexican', 12.75, 2.55, 5, '90210',
 '{"corn_tortillas": {"cost": 2.99, "store": "Super Mercado Latino"}, "chicken_thighs": {"cost": 6.99, "store": "Kroger"}, "cilantro": {"cost": 0.99, "store": "Super Mercado Latino"}}',
 8.7, 0.78, '{"perplexity": 0.6, "kroger": 0.3, "estimates": 0.1}', NOW() + INTERVAL '24 hours');

COMMENT ON TABLE stores IS 'Stores that sell groceries, including ethnic markets and mainstream stores';
COMMENT ON TABLE ingredient_prices IS 'Current and historical pricing data for ingredients from various sources';
COMMENT ON TABLE user_price_reports IS 'User-reported pricing corrections and updates';
COMMENT ON TABLE cultural_ingredients IS 'Cultural context and significance of ingredients';
COMMENT ON TABLE pricing_cache IS 'Cached pricing responses for performance optimization';
COMMENT ON TABLE recipe_pricing IS 'Complete pricing analysis for specific recipes with cultural context';
COMMENT ON TABLE recipe_ingredient_prices IS 'Detailed ingredient-level pricing for recipes';
COMMENT ON TABLE recipe_shopping_optimization IS 'Optimized shopping strategies for recipes considering cultural authenticity';