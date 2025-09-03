/**
 * Recipe Debug Component
 * Helps debug recipe saving and user authentication issues
 */

'use client';

import React, { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { recipeService } from '@/lib/recipes';
import { createClient } from '@/lib/supabase/client';

export function RecipeDebug() {
  const { user } = useAuthContext();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDebugCheck = async () => {
    setLoading(true);
    const supabase = createClient();
    const info: any = {
      timestamp: new Date().toISOString(),
      user: null,
      userProfile: null,
      userRecipes: null,
      errors: []
    };

    try {
      // Check user authentication
      info.user = {
        id: user?.id,
        email: user?.email,
        authenticated: !!user,
      };

      if (user?.id) {
        // Check if user profile exists
        try {
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          info.userProfile = {
            exists: !!profile,
            data: profile,
            error: profileError?.message
          };
        } catch (error) {
          info.errors.push(`Profile check error: ${error}`);
        }

        // Check user recipes
        try {
          const userRecipes = await recipeService.getUserRecipes(user.id, true);
          info.userRecipes = {
            count: userRecipes.length,
            recipes: userRecipes.map(r => ({
              id: r.id,
              title: r.title,
              authorId: r.authorId,
              source: r.source
            }))
          };
        } catch (error) {
          info.errors.push(`User recipes error: ${error}`);
        }

        // Check database recipes directly
        try {
          const { data: dbRecipes, error: dbError } = await supabase
            .from('recipes')
            .select('id, title, author_id, source, created_at')
            .eq('author_id', user.id);

          info.databaseRecipes = {
            count: dbRecipes?.length || 0,
            recipes: dbRecipes || [],
            error: dbError?.message
          };
        } catch (error) {
          info.errors.push(`Database recipes error: ${error}`);
        }
      }

    } catch (error) {
      info.errors.push(`General error: ${error}`);
    }

    setDebugInfo(info);
    setLoading(false);
  };

  const createTestRecipe = async () => {
    if (!user?.id) {
      alert('Please log in first');
      return;
    }

    setLoading(true);
    try {
      const testRecipe = {
        title: `Test Recipe ${Date.now()}`,
        description: 'This is a test recipe to debug the saving issue',
        culturalOrigin: ['test'],
        cuisine: 'test',
        ingredients: [
          {
            id: '1',
            name: 'Test Ingredient',
            amount: 1,
            unit: 'cup',
            substitutes: [],
            costPerUnit: 0,
            availability: []
          }
        ],
        instructions: [
          {
            step: 1,
            description: 'This is a test instruction'
          }
        ],
        metadata: {
          servings: 2,
          prepTime: 10,
          cookTime: 20,
          totalTime: 30,
          difficulty: 'easy' as const,
          culturalAuthenticity: 5
        },
        tags: ['test'],
        source: 'user' as const
      };

      console.log('Creating test recipe with user ID:', user.id);
      const result = await recipeService.createRecipe(testRecipe, user.id);
      console.log('Test recipe result:', result);

      if (result) {
        alert('Test recipe created successfully!');
        runDebugCheck(); // Refresh debug info
      } else {
        alert('Test recipe creation failed');
      }
    } catch (error) {
      console.error('Test recipe error:', error);
      alert(`Test recipe error: ${error}`);
    }
    setLoading(false);
  };

  return (
    <div className="p-6 bg-gray-50 rounded-lg">
      <h2 className="text-xl font-bold mb-4">Recipe Debug Tool</h2>
      
      <div className="space-y-4">
        <div className="flex space-x-4">
          <button
            onClick={runDebugCheck}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Run Debug Check'}
          </button>
          
          <button
            onClick={createTestRecipe}
            disabled={loading || !user}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Test Recipe'}
          </button>
        </div>

        {debugInfo && (
          <div className="bg-white p-4 rounded border">
            <h3 className="font-semibold mb-2">Debug Information:</h3>
            <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto max-h-96">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}