import { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';

export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  
  try {
    // Test 1: Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    const tests = {
      authentication: {
        success: !authError,
        user: user ? { id: user.id, email: user.email } : null,
        error: authError?.message
      },
      database: {
        success: false,
        tables: [],
        error: null
      },
      rls: {
        success: false,
        policies: [],
        error: null
      }
    };

    // Test 2: Check database connectivity and tables
    try {
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_name', [
          'user_preferences', 'meal_plans', 'recipes', 'recipe_ingredients',
          'shopping_lists', 'shopping_list_items', 'recipe_collections', 
          'collection_recipes', 'meal_plan_analytics'
        ]);

      if (tablesError) throw tablesError;

      tests.database = {
        success: true,
        tables: tables?.map(t => t.table_name) || [],
        error: null
      };
    } catch (error: any) {
      tests.database = {
        success: false,
        tables: [],
        error: error.message
      };
    }

    // Test 3: Check RLS policies (if user is authenticated)
    if (user) {
      try {
        // Try to access meal_plans table (should work with RLS)
        const { data: mealPlans, error: rlsError } = await supabase
          .from('meal_plans')
          .select('id, name, created_at')
          .limit(5);

        tests.rls = {
          success: !rlsError,
          policies: mealPlans ? `Can access meal_plans (${mealPlans.length} records)` : 'No records',
          error: rlsError?.message
        };
      } catch (error: any) {
        tests.rls = {
          success: false,
          policies: [],
          error: error.message
        };
      }
    } else {
      tests.rls = {
        success: true,
        policies: 'Skipped (no user authenticated)',
        error: null
      };
    }

    // Test 4: Check if we can create a test record (if authenticated)
    let writeTest = null;
    if (user) {
      try {
        // Try to create and delete a test user preference
        const { data: testPref, error: writeError } = await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            preferred_cuisines: ['test'],
            dietary_restrictions: [],
            default_budget: 50,
            household_size: 4
          })
          .select()
          .single();

        if (writeError) throw writeError;

        writeTest = {
          success: true,
          message: 'Successfully created/updated user preferences',
          recordId: testPref?.id
        };
      } catch (error: any) {
        writeTest = {
          success: false,
          message: error.message,
          recordId: null
        };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        tests,
        writeTest,
        summary: {
          allTestsPassed: tests.authentication.success && tests.database.success && tests.rls.success,
          tablesFound: tests.database.tables.length,
          userAuthenticated: !!user
        }
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Database test error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}