'use client';

import { useState } from 'react';

export default function TestPerplexityDebugPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testPerplexityService = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/debug/perplexity-meal-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          culturalCuisines: ['mediterranean'],
          dietaryRestrictions: [],
          budgetLimit: 50,
          householdSize: 4,
          numberOfMeals: 3
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-6">🧪 Perplexity Service Debug Test</h1>
          
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              This tests the Perplexity meal planner service directly to isolate any issues.
            </p>
            
            <button
              onClick={testPerplexityService}
              disabled={loading}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Testing Perplexity Service...' : '🚀 Test Perplexity Service'}
            </button>
          </div>

          {loading && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <span className="text-blue-800">Testing Perplexity meal planner service...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-800 mb-2">❌ Error</h3>
              <pre className="text-red-700 text-sm whitespace-pre-wrap">{error}</pre>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              {result.success ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">✅ Success</h3>
                  <p className="text-green-700">{result.message}</p>
                  
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Recipes:</span> {result.data?.recipeCount || 0}
                    </div>
                    <div>
                      <span className="font-medium">Total Cost:</span> ${result.data?.totalCost?.toFixed(2) || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Budget Use:</span> {result.data?.budgetUtilization?.toFixed(1) || 'N/A'}%
                    </div>
                    <div>
                      <span className="font-medium">Time:</span> {result.executionTime || 'N/A'}ms
                    </div>
                  </div>

                  {result.data?.recipes && (
                    <div className="mt-4">
                      <h4 className="font-medium text-green-800 mb-2">Generated Recipes:</h4>
                      <div className="space-y-2">
                        {result.data.recipes.map((recipe: any, index: number) => (
                          <div key={index} className="bg-white p-3 rounded border">
                            <div className="font-medium">{recipe.title}</div>
                            <div className="text-sm text-gray-600">
                              {recipe.cuisine} • {recipe.ingredientCount} ingredients • {recipe.instructionCount} steps
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h3 className="font-semibold text-red-800 mb-2">❌ Service Failed</h3>
                  <p className="text-red-700 mb-2">{result.error}</p>
                  
                  {result.stack && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-red-600 hover:text-red-800">
                        Show Stack Trace
                      </summary>
                      <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap bg-red-100 p-2 rounded">
                        {result.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">📋 Full Response</h3>
                <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-2">🔍 What This Tests</h3>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>• Direct Perplexity meal planner service call</li>
              <li>• Service initialization and API key validation</li>
              <li>• Recipe generation and data structure</li>
              <li>• Error handling and detailed logging</li>
              <li>• Performance timing and execution flow</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}