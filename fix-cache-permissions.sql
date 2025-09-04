-- Fix permissions for the cache table
-- Run this in Supabase SQL Editor if you're still getting 504 errors

-- Enable Row Level Security (but allow all operations for now)
ALTER TABLE ingredient_price_cache ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (for anonymous and authenticated users)
CREATE POLICY "Allow all operations on ingredient_price_cache" 
ON ingredient_price_cache
FOR ALL 
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Grant permissions to anon and authenticated roles
GRANT ALL ON ingredient_price_cache TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE ingredient_price_cache_id_seq TO anon, authenticated;

-- Verify the table has data
SELECT COUNT(*) as total_cached_items FROM ingredient_price_cache;

-- Check if any items are expired
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN expires_at > NOW() THEN 1 ELSE 0 END) as fresh,
  SUM(CASE WHEN expires_at <= NOW() THEN 1 ELSE 0 END) as expired
FROM ingredient_price_cache;

-- Show sample cached items
SELECT 
  ingredient_name, 
  location, 
  package_price, 
  portion_cost, 
  store_name,
  source,
  expires_at
FROM ingredient_price_cache 
LIMIT 10;