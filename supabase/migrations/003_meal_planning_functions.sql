-- PlateWise Meal Planning Database Functions and Views
-- Migration: 003_meal_planning_functions.sql

-- Function to calculate meal plan totals
CREATE OR REPLACE FUNCTION calculate_meal_plan_totals(meal_plan_uuid UUID)
RETURNS TABLE (
  total_cost DECIMAL(10,2),
  cost_per_serving DECIMAL(10,2),
  recipe_count INTEGER,
  ingredient_count INTEGER,
  budget_utilization DECIMAL(5,2)
) AS $$
DECLARE
  plan_budget DECIMAL(10,2);
  plan_household_size INTEGER;
BEGIN
  -- Get meal plan budget and household size
  SELECT budget_limit, household_size 
  INTO plan_budget, plan_household_size
  FROM meal_plans 
  WHERE id = meal_plan_uuid;
  
  -- Calculate totals
  SELECT 
    COALESCE(SUM(r.total_cost), 0) as total_cost,
    CASE 
      WHEN plan_household_size > 0 THEN COALESCE(SUM(r.total_cost), 0) / plan_household_size
      ELSE 0
    END as cost_per_serving,
    COUNT(r.id)::INTEGER as recipe_count,
    COALESCE(SUM(
      (SELECT COUNT(*) FROM recipe_ingredients ri WHERE ri.recipe_id = r.id)
    ), 0)::INTEGER as ingredient_count,
    CASE 
      WHEN plan_budget > 0 THEN (COALESCE(SUM(r.total_cost), 0) / plan_budget * 100)
      ELSE 0
    END as budget_utilization
  INTO total_cost, cost_per_serving, recipe_count, ingredient_count, budget_utilization
  FROM recipes r
  WHERE r.meal_plan_id = meal_plan_uuid;
  
  RETURN QUERY SELECT 
    COALESCE(calculate_meal_plan_totals.total_cost, 0::DECIMAL(10,2)),
    COALESCE(calculate_meal_plan_totals.cost_per_serving, 0::DECIMAL(10,2)),
    COALESCE(calculate_meal_plan_totals.recipe_count, 0),
    COALESCE(calculate_meal_plan_totals.ingredient_count, 0),
    COALESCE(calculate_meal_plan_totals.budget_utilization, 0::DECIMAL(5,2));
END;
$$ LANGUAGE plpgsql;

-- Function to update meal plan totals (call after recipe changes)
CREATE OR REPLACE FUNCTION update_meal_plan_totals(meal_plan_uuid UUID)
RETURNS VOID AS $$
DECLARE
  totals RECORD;
BEGIN
  -- Calculate new totals
  SELECT * INTO totals FROM calculate_meal_plan_totals(meal_plan_uuid);
  
  -- Update meal plan
  UPDATE meal_plans SET
    total_cost = totals.total_cost,
    cost_per_serving = totals.cost_per_serving,
    recipe_count = totals.recipe_count,
    budget_utilization = totals.budget_utilization,
    updated_at = NOW()
  WHERE id = meal_plan_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to generate shopping list from meal plan
CREATE OR REPLACE FUNCTION generate_shopping_list(meal_plan_uuid UUID)
RETURNS UUID AS $$
DECLARE
  shopping_list_id UUID;
  plan_name VARCHAR(255);
  plan_user_id UUID;
  total_cost DECIMAL(10,2) := 0;
  store_breakdown JSONB := '{}';
BEGIN
  -- Get meal plan info
  SELECT name, user_id INTO plan_name, plan_user_id
  FROM meal_plans WHERE id = meal_plan_uuid;
  
  -- Create shopping list
  INSERT INTO shopping_lists (meal_plan_id, user_id, name, total_estimated_cost, store_breakdown)
  VALUES (meal_plan_uuid, plan_user_id, plan_name || ' - Shopping List', 0, '{}')
  RETURNING id INTO shopping_list_id;
  
  -- Consolidate ingredients by name and store
  INSERT INTO shopping_list_items (
    shopping_list_id,
    ingredient_name,
    total_amount,
    estimated_cost,
    store,
    category,
    recipes,
    kroger_product_id
  )
  SELECT 
    shopping_list_id,
    ri.name,
    STRING_AGG(ri.amount, ', ') as total_amount,
    SUM(COALESCE(ri.kroger_price, 0)) as estimated_cost,
    COALESCE(ri.kroger_store_location, 'Unknown Store') as store,
    CASE 
      WHEN ri.name ILIKE '%meat%' OR ri.name ILIKE '%chicken%' OR ri.name ILIKE '%beef%' OR ri.name ILIKE '%fish%' THEN 'meat'
      WHEN ri.name ILIKE '%vegetable%' OR ri.name ILIKE '%tomato%' OR ri.name ILIKE '%onion%' OR ri.name ILIKE '%pepper%' THEN 'produce'
      WHEN ri.name ILIKE '%milk%' OR ri.name ILIKE '%cheese%' OR ri.name ILIKE '%yogurt%' THEN 'dairy'
      WHEN ri.name ILIKE '%rice%' OR ri.name ILIKE '%pasta%' OR ri.name ILIKE '%bread%' THEN 'grains'
      ELSE 'other'
    END as category,
    ARRAY_AGG(r.title) as recipes,
    ri.kroger_product_id
  FROM recipe_ingredients ri
  JOIN recipes r ON r.id = ri.recipe_id
  WHERE r.meal_plan_id = meal_plan_uuid
    AND ri.user_status != 'already-have' -- Exclude items user already has
  GROUP BY ri.name, ri.kroger_store_location, ri.kroger_product_id;
  
  -- Calculate total cost
  SELECT SUM(estimated_cost) INTO total_cost
  FROM shopping_list_items 
  WHERE shopping_list_id = generate_shopping_list.shopping_list_id;
  
  -- Update shopping list total
  UPDATE shopping_lists 
  SET total_estimated_cost = total_cost
  WHERE id = shopping_list_id;
  
  RETURN shopping_list_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's recent meal plans with summary
CREATE OR REPLACE FUNCTION get_user_meal_plans_summary(user_uuid UUID, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  status VARCHAR(50),
  cultural_cuisines TEXT[],
  recipe_count INTEGER,
  total_cost DECIMAL(10,2),
  budget_limit DECIMAL(10,2),
  budget_utilization DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mp.id,
    mp.name,
    mp.status,
    mp.cultural_cuisines,
    mp.recipe_count,
    mp.total_cost,
    mp.budget_limit,
    mp.budget_utilization,
    mp.created_at,
    mp.updated_at
  FROM meal_plans mp
  WHERE mp.user_id = user_uuid
  ORDER BY mp.updated_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get recipe with all ingredients and pricing
CREATE OR REPLACE FUNCTION get_recipe_with_ingredients(recipe_uuid UUID)
RETURNS TABLE (
  recipe_id UUID,
  title VARCHAR(500),
  description TEXT,
  cultural_origin TEXT[],
  cuisine VARCHAR(100),
  source_url TEXT,
  image_url TEXT,
  servings INTEGER,
  total_time INTEGER,
  instructions JSONB,
  total_cost DECIMAL(10,2),
  cost_per_serving DECIMAL(10,2),
  ingredient_id UUID,
  ingredient_name VARCHAR(255),
  ingredient_amount VARCHAR(100),
  ingredient_unit VARCHAR(50),
  user_status VARCHAR(50),
  specialty_store VARCHAR(255),
  kroger_price DECIMAL(10,2),
  kroger_confidence VARCHAR(20),
  on_sale BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as recipe_id,
    r.title,
    r.description,
    r.cultural_origin,
    r.cuisine,
    r.source_url,
    r.image_url,
    r.servings,
    r.total_time,
    r.instructions,
    r.total_cost,
    r.cost_per_serving,
    ri.id as ingredient_id,
    ri.name as ingredient_name,
    ri.amount as ingredient_amount,
    ri.unit as ingredient_unit,
    ri.user_status,
    ri.specialty_store,
    ri.kroger_price,
    ri.kroger_confidence,
    ri.on_sale
  FROM recipes r
  LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
  WHERE r.id = recipe_uuid
  ORDER BY ri.created_at;
END;
$$ LANGUAGE plpgsql;

-- View for meal plan dashboard
CREATE VIEW meal_plan_dashboard AS
SELECT 
  mp.id,
  mp.name,
  mp.status,
  mp.cultural_cuisines,
  mp.budget_limit,
  mp.household_size,
  mp.recipe_count,
  mp.total_cost,
  mp.cost_per_serving,
  mp.budget_utilization,
  mp.has_pricing,
  mp.created_at,
  mp.updated_at,
  -- Recipe summary
  COALESCE(
    (SELECT ARRAY_AGG(DISTINCT r.cuisine) 
     FROM recipes r 
     WHERE r.meal_plan_id = mp.id), 
    '{}'::TEXT[]
  ) as recipe_cuisines,
  -- Ingredient summary
  COALESCE(
    (SELECT COUNT(*) 
     FROM recipe_ingredients ri 
     JOIN recipes r ON r.id = ri.recipe_id 
     WHERE r.meal_plan_id = mp.id), 
    0
  ) as total_ingredients,
  -- Shopping list status
  EXISTS(
    SELECT 1 FROM shopping_lists sl 
    WHERE sl.meal_plan_id = mp.id
  ) as has_shopping_list
FROM meal_plans mp;

-- View for recipe search and filtering
CREATE VIEW recipe_search AS
SELECT 
  r.id,
  r.meal_plan_id,
  r.title,
  r.description,
  r.cultural_origin,
  r.cuisine,
  r.image_url,
  r.servings,
  r.total_time,
  r.total_cost,
  r.cost_per_serving,
  r.budget_friendly,
  r.has_pricing,
  r.created_at,
  -- Ingredient summary
  COALESCE(
    (SELECT ARRAY_AGG(ri.name) 
     FROM recipe_ingredients ri 
     WHERE ri.recipe_id = r.id), 
    '{}'::TEXT[]
  ) as ingredients,
  -- Dietary compliance
  NOT EXISTS(
    SELECT 1 FROM recipe_ingredients ri 
    WHERE ri.recipe_id = r.id 
    AND (ri.name ILIKE '%meat%' OR ri.name ILIKE '%chicken%' OR ri.name ILIKE '%beef%')
  ) as is_vegetarian,
  NOT EXISTS(
    SELECT 1 FROM recipe_ingredients ri 
    WHERE ri.recipe_id = r.id 
    AND (ri.name ILIKE '%dairy%' OR ri.name ILIKE '%milk%' OR ri.name ILIKE '%cheese%')
  ) as is_dairy_free
FROM recipes r;

-- Trigger to update meal plan totals when recipes change
CREATE OR REPLACE FUNCTION trigger_update_meal_plan_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update totals for the affected meal plan
  IF TG_OP = 'DELETE' THEN
    PERFORM update_meal_plan_totals(OLD.meal_plan_id);
    RETURN OLD;
  ELSE
    PERFORM update_meal_plan_totals(NEW.meal_plan_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to automatically update meal plan totals
CREATE TRIGGER update_meal_plan_totals_on_recipe_change
  AFTER INSERT OR UPDATE OR DELETE ON recipes
  FOR EACH ROW EXECUTE FUNCTION trigger_update_meal_plan_totals();

-- Trigger to update recipe totals when ingredients change
CREATE OR REPLACE FUNCTION trigger_update_recipe_totals()
RETURNS TRIGGER AS $$
DECLARE
  recipe_total DECIMAL(10,2);
  recipe_servings INTEGER;
BEGIN
  -- Get recipe servings
  SELECT servings INTO recipe_servings FROM recipes WHERE id = COALESCE(NEW.recipe_id, OLD.recipe_id);
  
  -- Calculate new recipe total
  SELECT COALESCE(SUM(kroger_price), 0) INTO recipe_total
  FROM recipe_ingredients 
  WHERE recipe_id = COALESCE(NEW.recipe_id, OLD.recipe_id)
    AND user_status != 'already-have'; -- Exclude items user already has
  
  -- Update recipe totals
  UPDATE recipes SET
    total_cost = recipe_total,
    cost_per_serving = CASE WHEN recipe_servings > 0 THEN recipe_total / recipe_servings ELSE 0 END,
    budget_friendly = CASE WHEN recipe_servings > 0 THEN (recipe_total / recipe_servings) <= 8 ELSE FALSE END,
    has_pricing = EXISTS(SELECT 1 FROM recipe_ingredients WHERE recipe_id = recipes.id AND kroger_price IS NOT NULL),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.recipe_id, OLD.recipe_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Add trigger to automatically update recipe totals
CREATE TRIGGER update_recipe_totals_on_ingredient_change
  AFTER INSERT OR UPDATE OR DELETE ON recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION trigger_update_recipe_totals();

-- Function to get cultural authenticity score
CREATE OR REPLACE FUNCTION calculate_cultural_authenticity_score(
  recipe_cultural_origin TEXT[],
  user_cultural_cuisines TEXT[],
  ingredient_substitutions INTEGER,
  total_ingredients INTEGER
)
RETURNS DECIMAL(3,2) AS $$
DECLARE
  cultural_match_score DECIMAL(3,2) := 0;
  substitution_penalty DECIMAL(3,2) := 0;
  final_score DECIMAL(3,2);
BEGIN
  -- Cultural origin match (0-5 points)
  IF array_length(recipe_cultural_origin, 1) > 0 AND array_length(user_cultural_cuisines, 1) > 0 THEN
    IF recipe_cultural_origin && user_cultural_cuisines THEN
      cultural_match_score := 5.0;
    ELSE
      cultural_match_score := 2.0;
    END IF;
  ELSE
    cultural_match_score := 3.0; -- Neutral for international recipes
  END IF;
  
  -- Substitution penalty (0-2 points deduction)
  IF total_ingredients > 0 THEN
    substitution_penalty := (ingredient_substitutions::DECIMAL / total_ingredients) * 2.0;
  END IF;
  
  -- Calculate final score (0-10 scale)
  final_score := (cultural_match_score - substitution_penalty) * 2.0;
  
  -- Ensure score is between 0 and 10
  final_score := GREATEST(0, LEAST(10, final_score));
  
  RETURN final_score;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's budget analytics
CREATE OR REPLACE FUNCTION get_user_budget_analytics(user_uuid UUID, days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  total_meal_plans INTEGER,
  average_budget DECIMAL(10,2),
  average_spent DECIMAL(10,2),
  total_savings DECIMAL(10,2),
  budget_efficiency DECIMAL(5,2),
  favorite_cuisines TEXT[],
  most_substituted_ingredients TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(mp.id)::INTEGER as total_meal_plans,
    AVG(mp.budget_limit) as average_budget,
    AVG(mp.total_cost) as average_spent,
    SUM(mp.budget_limit - mp.total_cost) as total_savings,
    AVG(mp.budget_utilization) as budget_efficiency,
    -- Most used cuisines
    (SELECT ARRAY_AGG(cuisine) FROM (
      SELECT r.cuisine, COUNT(*) as usage_count
      FROM recipes r
      JOIN meal_plans mp2 ON mp2.id = r.meal_plan_id
      WHERE mp2.user_id = user_uuid
        AND mp2.created_at >= NOW() - INTERVAL '%s days' % days_back
      GROUP BY r.cuisine
      ORDER BY usage_count DESC
      LIMIT 5
    ) top_cuisines) as favorite_cuisines,
    -- Most substituted ingredients
    (SELECT ARRAY_AGG(name) FROM (
      SELECT ri.name, COUNT(*) as sub_count
      FROM recipe_ingredients ri
      JOIN recipes r ON r.id = ri.recipe_id
      JOIN meal_plans mp3 ON mp3.id = r.meal_plan_id
      WHERE mp3.user_id = user_uuid
        AND ri.is_substituted = TRUE
        AND mp3.created_at >= NOW() - INTERVAL '%s days' % days_back
      GROUP BY ri.name
      ORDER BY sub_count DESC
      LIMIT 5
    ) top_subs) as most_substituted_ingredients
  FROM meal_plans mp
  WHERE mp.user_id = user_uuid
    AND mp.created_at >= NOW() - INTERVAL '%s days' % days_back;
END;
$$ LANGUAGE plpgsql;

-- Create materialized view for performance (refresh periodically)
CREATE MATERIALIZED VIEW user_meal_plan_stats AS
SELECT 
  mp.user_id,
  COUNT(*) as total_meal_plans,
  AVG(mp.budget_limit) as avg_budget,
  AVG(mp.total_cost) as avg_spent,
  AVG(mp.budget_utilization) as avg_budget_utilization,
  COUNT(*) FILTER (WHERE mp.status = 'completed') as completed_plans,
  COUNT(*) FILTER (WHERE mp.has_pricing = TRUE) as plans_with_pricing,
  ARRAY_AGG(DISTINCT unnest(mp.cultural_cuisines)) as all_cuisines_tried,
  MAX(mp.updated_at) as last_activity
FROM meal_plans mp
WHERE mp.created_at >= NOW() - INTERVAL '90 days' -- Last 90 days
GROUP BY mp.user_id;

-- Create unique index for materialized view
CREATE UNIQUE INDEX idx_user_meal_plan_stats_user_id ON user_meal_plan_stats(user_id);

-- Function to refresh stats (call periodically)
CREATE OR REPLACE FUNCTION refresh_meal_plan_stats()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_meal_plan_stats;
END;
$$ LANGUAGE plpgsql;