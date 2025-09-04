-- Setup script for ingredient pricing cache
-- Run this in your Supabase SQL Editor

-- Create ingredient pricing cache table
CREATE TABLE IF NOT EXISTS ingredient_price_cache (
  id SERIAL PRIMARY KEY,
  ingredient_name VARCHAR(100) NOT NULL,
  location VARCHAR(50) NOT NULL,
  package_price DECIMAL(10,2) NOT NULL,
  portion_cost DECIMAL(10,2) NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  package_size VARCHAR(100) DEFAULT 'standard',
  store_name VARCHAR(100) DEFAULT 'Unknown',
  store_type VARCHAR(50) DEFAULT 'mainstream',
  unit_price VARCHAR(50),
  confidence DECIMAL(3,2) DEFAULT 0.5,
  source VARCHAR(20) DEFAULT 'estimated',
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  UNIQUE(ingredient_name, location)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_ingredient_cache_lookup 
ON ingredient_price_cache(ingredient_name, location, expires_at);

CREATE INDEX IF NOT EXISTS idx_ingredient_cache_cleanup 
ON ingredient_price_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_ingredient_cache_source 
ON ingredient_price_cache(source, cached_at);

-- Insert seed data for common ingredients to provide immediate relief
INSERT INTO ingredient_price_cache (
  ingredient_name, location, package_price, portion_cost, product_name, 
  package_size, store_name, store_type, unit_price, confidence, source, expires_at
) VALUES 
  -- Common vegetables
  ('onion', 'default', 2.49, 0.83, 'Yellow Onions 3lb bag', '3 lb', 'Walmart', 'mainstream', '$0.83/lb', 0.8, 'estimated', NOW() + INTERVAL '48 hours'),
  ('garlic', 'default', 1.99, 0.33, 'Fresh Garlic Bulb', '1 bulb', 'Walmart', 'mainstream', '$0.33/bulb', 0.8, 'estimated', NOW() + INTERVAL '48 hours'),
  ('tomato', 'default', 3.99, 2.66, 'Roma Tomatoes', '1.5 lb', 'Walmart', 'mainstream', '$2.66/lb', 0.8, 'estimated', NOW() + INTERVAL '48 hours'),
  ('bell pepper', 'default', 1.99, 1.99, 'Red Bell Pepper', '1 each', 'Walmart', 'mainstream', '$1.99/each', 0.8, 'estimated', NOW() + INTERVAL '48 hours'),
  
  -- Proteins  
  ('chicken breast', 'default', 8.99, 7.49, 'Boneless Skinless Chicken Breast', '1.2 lb', 'Walmart', 'mainstream', '$7.49/lb', 0.8, 'estimated', NOW() + INTERVAL '48 hours'),
  ('ground beef', 'default', 6.99, 6.99, '80/20 Ground Beef', '1 lb', 'Walmart', 'mainstream', '$6.99/lb', 0.8, 'estimated', NOW() + INTERVAL '48 hours'),
  ('eggs', 'default', 3.49, 0.29, 'Large Grade A Eggs', '12 count', 'Walmart', 'mainstream', '$0.29/each', 0.8, 'estimated', NOW() + INTERVAL '48 hours'),
  ('egg yolk', 'default', 3.49, 0.25, 'Large Grade A Eggs (for yolks)', '12 count', 'Walmart', 'mainstream', '$0.25/yolk', 0.8, 'estimated', NOW() + INTERVAL '48 hours'),
  
  -- Pantry staples
  ('flour', 'default', 2.99, 0.19, 'All-Purpose Flour', '5 lb', 'Walmart', 'mainstream', '$0.60/lb', 0.8, 'estimated', NOW() + INTERVAL '48 hours'),
  ('sugar', 'default', 3.49, 0.22, 'Granulated Sugar', '4 lb', 'Walmart', 'mainstream', '$0.87/lb', 0.8, 'estimated', NOW() + INTERVAL '48 hours'),
  ('salt', 'default', 1.49, 0.02, 'Iodized Salt', '26 oz', 'Walmart', 'mainstream', '$0.03/oz', 0.8, 'estimated', NOW() + INTERVAL '48 hours'),
  ('olive oil', 'default', 5.99, 0.47, 'Extra Virgin Olive Oil', '16.9 oz', 'Walmart', 'mainstream', '$0.35/oz', 0.8, 'estimated', NOW() + INTERVAL '48 hours'),
  ('butter', 'default', 4.49, 1.12, 'Salted Butter', '1 lb', 'Walmart', 'mainstream', '$4.49/lb', 0.8, 'estimated', NOW() + INTERVAL '48 hours'),
  
  -- Specialty ingredients that cause issues
  ('anchovy fillets', 'default', 4.99, 3.33, 'Flat Anchovy Fillets in Oil', '2 oz can', 'Walmart', 'mainstream', '$2.50/oz', 0.7, 'estimated', NOW() + INTERVAL '48 hours'),
  ('lemon juice', 'default', 1.29, 0.22, 'Fresh Lemon (for juice)', '1 lemon', 'Walmart', 'mainstream', '$0.22/lemon', 0.8, 'estimated', NOW() + INTERVAL '48 hours'),
  ('parmesan cheese', 'default', 7.99, 5.33, 'Grated Parmesan Cheese', '6 oz container', 'Walmart', 'mainstream', '$1.33/oz', 0.8, 'estimated', NOW() + INTERVAL '48 hours')
;

-- Grant permissions (adjust as needed for your RLS policies)
-- These might be needed depending on your Supabase setup
-- ALTER TABLE ingredient_price_cache ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE ingredient_price_cache IS 'Cache for ingredient pricing to prevent API timeouts';
COMMENT ON COLUMN ingredient_price_cache.confidence IS 'Price confidence: 0.0-1.0, where 1.0 is verified API price';
COMMENT ON COLUMN ingredient_price_cache.source IS 'Price source: perplexity, kroger, usda, estimated';