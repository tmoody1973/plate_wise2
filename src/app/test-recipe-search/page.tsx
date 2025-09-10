"use client"

import { useState } from 'react';
import { useRecipeSearch } from '@/hooks/useRecipeWebSearch';

export default function TestRecipeSearch() {
  const [query, setQuery] = useState('chicken curry');
  const recipeSearch = useRecipeSearch();

  const handleSearch = () => {
    recipeSearch.mutate({
      query,
      maxResults: 5,
      mode: 'web'
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          🔍 Recipe Search Test
        </h1>
        
        <div className="mb-6">
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for recipes..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={recipeSearch.isPending}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {recipeSearch.isPending ? '🔄 Searching...' : '🔍 Search'}
            </button>
          </div>
          
          <p className="text-gray-600 text-sm">
            This tests the POST /api/recipes/search endpoint that was causing the 405 error.
          </p>
        </div>

        {recipeSearch.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 font-medium mb-2">❌ Error</h3>
            <p className="text-red-700">{recipeSearch.error.message}</p>
          </div>
        )}

        {recipeSearch.data && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-green-800 font-medium mb-2">✅ Search Results</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Found:</span> {recipeSearch.data.found}
                </div>
                <div>
                  <span className="font-medium">Rows:</span> {recipeSearch.data.rows?.length || 0}
                </div>
                <div>
                  <span className="font-medium">Query:</span> {query}
                </div>
              </div>
            </div>

            {recipeSearch.data.rows && recipeSearch.data.rows.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium mb-4 text-gray-800">📋 Recipes Found</h3>
                <div className="space-y-4">
                  {recipeSearch.data.rows.slice(0, 3).map((recipe: any, index: number) => (
                    <div key={index} className="bg-white rounded-lg p-4 border">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-800">{recipe.title || 'Untitled Recipe'}</h4>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {recipe.cuisine || 'Unknown'}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-2">
                        {recipe.description || 'No description available'}
                      </p>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div>
                          ⏱️ {recipe.totalTimeMinutes || 'Unknown'} minutes
                        </div>
                        <div>
                          🍽️ {recipe.servings || 'Unknown'} servings
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!recipeSearch.data.rows || recipeSearch.data.rows.length === 0) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-yellow-800 font-medium mb-2">⚠️ No Results</h3>
                <p className="text-yellow-700">
                  No recipes found for "{query}". Try a different search term or create some meal plans first.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}