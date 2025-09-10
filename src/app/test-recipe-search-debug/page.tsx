"use client"

import { useState } from 'react';

export default function TestRecipeSearchDebug() {
  const [query, setQuery] = useState('chicken curry');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const request = {
        query,
        maxResults: 5,
        mode: 'web'
      };

      console.log('🧪 Testing debug endpoint with request:', request);
      
      // Call the debug API endpoint to get detailed error information
      const response = await fetch('/api/recipes/search/debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${JSON.stringify(data)}`);
      }

      setResults(data);
      console.log('✅ Debug search results:', data);
      
    } catch (err) {
      console.error('❌ Debug search failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          🔍 Recipe Search Debug Test
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
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {loading ? '🔄 Debugging...' : '🔍 Debug Search'}
            </button>
          </div>
          
          <p className="text-gray-600 text-sm">
            This tests the debug version of the recipe search endpoint with detailed error logging.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 font-medium mb-2">❌ Error</h3>
            <pre className="text-red-700 text-sm whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        {results && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-green-800 font-medium mb-2">✅ Search Results</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Success:</span> {results.success ? 'Yes' : 'No'}
                </div>
                <div>
                  <span className="font-medium">Found:</span> {results.found || 0}
                </div>
                <div>
                  <span className="font-medium">Query:</span> {query}
                </div>
              </div>
            </div>

            {results.debug && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-blue-800 font-medium mb-2">🔍 Debug Information</h3>
                <pre className="text-blue-700 text-sm whitespace-pre-wrap">
                  {JSON.stringify(results.debug, null, 2)}
                </pre>
              </div>
            )}

            {results.rows && results.rows.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium mb-4 text-gray-800">📋 Recipes Found</h3>
                <div className="space-y-4">
                  {results.rows.slice(0, 3).map((recipe: any, index: number) => (
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
                          ⏱️ {recipe.totalTimeMinutes || recipe.total_time || 'Unknown'} minutes
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

            {(!results.rows || results.rows.length === 0) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-yellow-800 font-medium mb-2">⚠️ No Results</h3>
                <p className="text-yellow-700">
                  No recipes found for "{query}". This might be expected if you haven't created any meal plans yet.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}