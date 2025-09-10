'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function DatabaseTestPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const supabase = createClientComponentClient();

  const addResult = (test: string, success: boolean, data?: any, error?: any) => {
    setResults(prev => [...prev, {
      test,
      success,
      data,
      error: error?.message || error,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const testAuth = async () => {
    setLoading(true);
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      
      if (user) {
        setUser(user);
        addResult('Authentication Check', true, { userId: user.id, email: user.email });
      } else {
        addResult('Authentication Check', false, null, 'No user logged in');
      }
    } catch (error) {
      addResult('Authentication Check', false, null, error);
    }
    setLoading(false);
  };

  const testUserPreferences = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/preferences');
      const data = await response.json();
      
      if (data.success) {
        addResult('User Preferences API', true, data.preferences);
      } else {
        addResult('User Preferences API', false, null, data.error);
      }
    } catch (error) {
      addResult('User Preferences API', false, null, error);
    }
    setLoading(false);
  };

  const testMealPlansList = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/meal-plans/list');
      const data = await response.json();
      
      if (data.success) {
        addResult('Meal Plans List API', true, { count: data.count, plans: data.mealPlans });
      } else {
        addResult('Meal Plans List API', false, null, data.error);
      }
    } catch (error) {
      addResult('Meal Plans List API', false, null, error);
    }
    setLoading(false);
  };

  const testCreateMealPlan = async () => {
    setLoading(true);
    try {
      const testPlan = {
        name: 'Test Mediterranean Plan',
        description: 'Testing database integration',
        culturalCuisines: ['mediterranean'],
        dietaryRestrictions: [],
        budgetLimit: 50,
        householdSize: 4,
        timeFrame: 'week'
      };

      const response = await fetch('/api/meal-plans/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPlan)
      });

      if (response.ok) {
        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let streamResults: any[] = [];

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  streamResults.push(data);
                } catch (e) {
                  // Ignore parsing errors
                }
              }
            }
          }
        }

        addResult('Create Meal Plan (Streaming)', true, { 
          events: streamResults.length,
          lastEvent: streamResults[streamResults.length - 1]
        });
      } else {
        const data = await response.json();
        addResult('Create Meal Plan (Streaming)', false, null, data.error);
      }
    } catch (error) {
      addResult('Create Meal Plan (Streaming)', false, null, error);
    }
    setLoading(false);
  };

  const testDirectDatabase = async () => {
    setLoading(true);
    try {
      // Test direct database access
      const { data: tables, error } = await supabase
        .from('meal_plans')
        .select('*')
        .limit(5);

      if (error) throw error;

      addResult('Direct Database Access', true, { 
        tableAccess: 'meal_plans',
        recordCount: tables?.length || 0,
        records: tables
      });
    } catch (error) {
      addResult('Direct Database Access', false, null, error);
    }
    setLoading(false);
  };

  const signInTestUser = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@platewise.com',
        password: 'testpassword123'
      });

      if (error) {
        // Try to sign up if sign in fails
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: 'test@platewise.com',
          password: 'testpassword123'
        });

        if (signUpError) throw signUpError;
        
        addResult('Test User Sign Up', true, { userId: signUpData.user?.id });
        setUser(signUpData.user);
      } else {
        addResult('Test User Sign In', true, { userId: data.user?.id });
        setUser(data.user);
      }
    } catch (error) {
      addResult('Test User Authentication', false, null, error);
    }
    setLoading(false);
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">PlateWise Database Test Suite</h1>
      
      {/* User Status */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">Authentication Status</h2>
        {user ? (
          <div className="text-green-600">
            ✅ Logged in as: {user.email} (ID: {user.id})
          </div>
        ) : (
          <div className="text-red-600">
            ❌ Not authenticated
          </div>
        )}
      </div>

      {/* Test Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <button
          onClick={signInTestUser}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Sign In Test User
        </button>
        
        <button
          onClick={testAuth}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
        >
          Test Auth
        </button>

        <button
          onClick={testDirectDatabase}
          disabled={loading}
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
        >
          Test Database
        </button>

        <button
          onClick={testUserPreferences}
          disabled={loading}
          className="bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 disabled:opacity-50"
        >
          Test Preferences
        </button>

        <button
          onClick={testMealPlansList}
          disabled={loading}
          className="bg-teal-500 text-white px-4 py-2 rounded hover:bg-teal-600 disabled:opacity-50"
        >
          Test Meal Plans
        </button>

        <button
          onClick={testCreateMealPlan}
          disabled={loading || !user}
          className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50"
        >
          Create Meal Plan
        </button>
      </div>

      {/* Clear Results */}
      <div className="mb-4">
        <button
          onClick={clearResults}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Clear Results
        </button>
        {loading && (
          <span className="ml-4 text-blue-600">
            🔄 Running test...
          </span>
        )}
      </div>

      {/* Results */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Test Results</h2>
        
        {results.length === 0 ? (
          <div className="text-gray-500 italic">
            No tests run yet. Click a test button above to start.
          </div>
        ) : (
          results.map((result, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-l-4 ${
                result.success 
                  ? 'bg-green-50 border-green-500' 
                  : 'bg-red-50 border-red-500'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">
                  {result.success ? '✅' : '❌'} {result.test}
                </h3>
                <span className="text-sm text-gray-500">{result.timestamp}</span>
              </div>
              
              {result.success && result.data && (
                <div className="mt-2">
                  <strong>Data:</strong>
                  <pre className="bg-gray-100 p-2 rounded mt-1 text-sm overflow-x-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              )}
              
              {!result.success && result.error && (
                <div className="mt-2 text-red-600">
                  <strong>Error:</strong> {result.error}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}