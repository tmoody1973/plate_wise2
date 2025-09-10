# PlateWise Database Deployment Guide

## 🚀 Quick Deployment

### Option 1: Single Script Deployment (Recommended)
Run the combined deployment script in your Supabase SQL Editor:

```sql
-- Copy and paste the entire content of supabase/deploy-migrations.sql
-- into your Supabase SQL Editor and execute
```

### Option 2: Individual Migration Files
Run each migration file in order:

1. **Schema Creation**: `supabase/migrations/001_meal_planning_schema.sql`
2. **Security Policies**: `supabase/migrations/002_meal_planning_rls.sql`  
3. **Functions & Views**: `supabase/migrations/003_meal_planning_functions.sql`

## 📋 Deployment Steps

### 1. Access Supabase Dashboard
- Go to your Supabase project dashboard
- Navigate to **SQL Editor** in the left sidebar

### 2. Run the Migration
- Copy the content from `supabase/deploy-migrations.sql`
- Paste it into the SQL Editor
- Click **Run** to execute

### 3. Verify Deployment
Check that all tables were created:

```sql
-- Verify tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'user_preferences',
  'meal_plans', 
  'recipes',
  'recipe_ingredients',
  'shopping_lists',
  'shopping_list_items',
  'recipe_collections',
  'collection_recipes',
  'meal_plan_analytics'
);
```

### 4. Test Database Functions
```sql
-- Test a simple function
SELECT * FROM calculate_meal_plan_totals('00000000-0000-0000-0000-000000000000');
```

## 🗄️ Database Schema Overview

### Core Tables Created:

| Table | Purpose | Key Features |
|-------|---------|--------------|
| **user_preferences** | User settings | Cultural cuisines, dietary restrictions, budget defaults |
| **meal_plans** | Main meal plan records | Budget tracking, cultural cuisines, status management |
| **recipes** | Individual recipes | Cultural origin, pricing, authenticity scores |
| **recipe_ingredients** | Ingredient details | Kroger pricing, substitutions, user status |
| **shopping_lists** | Generated shopping lists | Store breakdown, cost estimates |
| **shopping_list_items** | Shopping items | Category grouping, purchase tracking |
| **recipe_collections** | User recipe collections | Public/private, cultural themes |
| **meal_plan_analytics** | User behavior tracking | Event logging, success metrics |

### Key Features Enabled:

✅ **Row Level Security (RLS)** - Users can only access their own data  
✅ **Automatic Timestamps** - `created_at` and `updated_at` triggers  
✅ **Performance Indexes** - Optimized queries for all common operations  
✅ **Database Functions** - Automatic calculations and data processing  
✅ **Materialized Views** - Fast dashboard queries  
✅ **Cultural Authenticity** - Scoring and tracking system  
✅ **Budget Analytics** - Cost tracking and optimization  

## 🔧 Post-Deployment Configuration

### 1. Set Up Authentication
Ensure Supabase Auth is configured for your application:

```typescript
// In your Next.js app
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const supabase = createClientComponentClient()
```

### 2. Environment Variables
Make sure these are set in your `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Test API Endpoints
After deployment, test your API endpoints:

```bash
# Test user preferences
curl -X GET "http://localhost:3000/api/user/preferences" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test meal plan creation
curl -X POST "http://localhost:3000/api/meal-plans/create" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Test Meal Plan",
    "culturalCuisines": ["mediterranean"],
    "budgetLimit": 50,
    "householdSize": 4
  }'
```

## 🔍 Troubleshooting

### Common Issues:

#### 1. **Permission Errors**
```sql
-- Grant permissions if needed
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
```

#### 2. **RLS Policy Issues**
```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

#### 3. **Function Errors**
```sql
-- Check function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION';
```

#### 4. **Index Issues**
```sql
-- Check indexes were created
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public';
```

## 📊 Database Monitoring

### Performance Queries:

```sql
-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check query performance
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements 
WHERE query LIKE '%meal_plans%'
ORDER BY total_time DESC;
```

### Maintenance Tasks:

```sql
-- Refresh materialized views (run periodically)
REFRESH MATERIALIZED VIEW CONCURRENTLY user_meal_plan_stats;

-- Update table statistics
ANALYZE;

-- Check for unused indexes
SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;
```

## 🎯 Next Steps

After successful deployment:

1. **Test the API endpoints** with your frontend
2. **Set up monitoring** for database performance
3. **Configure backups** in Supabase dashboard
4. **Set up alerts** for error tracking
5. **Plan for scaling** as user base grows

## 🆘 Support

If you encounter issues:

1. Check the Supabase logs in your dashboard
2. Verify all environment variables are set
3. Ensure your Supabase project has sufficient resources
4. Check the API endpoint responses for detailed error messages

The database is now ready for production use with full meal planning functionality!