"use client"

import { useState } from 'react';

export default function TestUrlValidation() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testUrlValidation = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const request = {
        numberOfMeals: 3,
        culturalCuisines: ['Mexican', 'Italian', 'Asian'],
        dietaryRestrictions: [],
        maxTime: 45,
        pantry: ['rice', 'onions', 'garlic'],
        exclude: []
      };

      console.log('🧪 Testing URL validation with request:', request);
      
      // Call the API endpoint instead of the service directly
      const response = await fetch('/api/test-url-validation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setResults(data);
      console.log('✅ URL validation test results:', data);
      
    } catch (err) {
      console.error('❌ URL validation test failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          🔧 Recipe URL Validation Test
        </h1>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            This test validates that recipe URLs from Perplexity are working and accessible.
            It includes URL validation, retry logic, and fallback to verified URLs.
          </p>
          
          <button
            onClick={testUrlValidation}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            {loading ? '🔄 Testing URL Validation...' : '🧪 Test URL Validation'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 font-medium mb-2">❌ Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {results && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-green-800 font-medium mb-2">✅ Results Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Success:</span> {results.success ? 'Yes' : 'No'}
                </div>
                <div>
                  <span className="font-medium">Recipes Found:</span> {results.recipes?.length || 0}
                </div>
                <div>
                  <span className="font-medium">Confidence:</span> {results.confidence}
                </div>
              </div>
            </div>

            {results.recipes && results.recipes.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium mb-4 text-gray-800">📋 Recipe URLs Found</h3>
                <div className="space-y-4">
                  {results.recipes.map((recipe: any, index: number) => (
                    <div key={index} className="bg-white rounded-lg p-4 border">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-800">{recipe.title}</h4>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {recipe.cuisine}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-2">{recipe.description}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                          ⏱️ {recipe.estimatedTime} minutes
                        </div>
                        <a 
                          href={recipe.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          🔗 View Recipe
                        </a>
                      </div>
                      
                      <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono break-all">
                        {recipe.url}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}