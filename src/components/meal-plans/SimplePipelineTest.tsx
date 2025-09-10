'use client';

import React, { useState } from 'react';

interface TestResult {
  success: boolean;
  mealPlan?: any;
  metadata?: any;
  error?: string;
  details?: string;
}

export function SimplePipelineTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const runTest = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      console.log('🧪 Testing Stage 1 + Stage 2 pipeline...');

      const response = await fetch('/api/meal-plans/test-pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          numberOfMeals: 2,
          culturalCuisines: ['Mexican'],
          dietaryRestrictions: ['halal_friendly'],
          householdSize: 4,
          maxTime: 45
        })
      });

      const data = await response.json();
      console.log('📥 Received response:', data);
      setResult(data);
    } catch (error) {
      console.error('❌ Test failed:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Simple Pipeline Test</h1>
        <p className="text-gray-600">
          Test the Stage 1 + Stage 2 meal planning pipeline
        </p>
        
        <button 
          onClick={runTest} 
          disabled={isLoading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Testing Pipeline...' : 'Test Pipeline'}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          {result.success ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-green-800 mb-4">✅ Pipeline Success!</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {result.mealPlan?.recipes?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Recipes Generated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    ${(result.mealPlan?.totalEstimatedCost || 0).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600">Total Cost</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {result.mealPlan?.confidence || 'medium'}
                  </div>
                  <div className="text-sm text-gray-600">Confidence</div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Generated Recipes:</h3>
                {(result.mealPlan?.recipes || []).map((recipe: any, index: number) => (
                  <div key={recipe.id || index} className="bg-white border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold">{recipe.title || 'Unknown Recipe'}</h4>
                      {recipe.sourceUrl && (
                        <a 
                          href={recipe.sourceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          View Source →
                        </a>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      🌍 {recipe.cuisine} • ⏱️ {recipe.metadata?.totalTimeMinutes || 30} min • 
                      🍽️ {recipe.metadata?.servings || 4} servings • 
                      💰 ${(recipe.metadata?.estimatedCost || 0).toFixed(2)}
                    </div>

                    {recipe.id?.startsWith('scraped-') && (
                      <div className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded mb-2">
                        ✅ Real Data Extracted
                      </div>
                    )}

                    <div className="text-sm">
                      <strong>Ingredients ({(recipe.ingredients || []).length}):</strong>
                      <div className="mt-1 text-gray-600">
                        {(recipe.ingredients || []).slice(0, 3).map((ing: any, idx: number) => (
                          <span key={idx}>
                            {ing.name || 'Unknown ingredient'}
                            {idx < Math.min(2, (recipe.ingredients || []).length - 1) ? ', ' : ''}
                          </span>
                        ))}
                        {(recipe.ingredients || []).length > 3 && ` +${(recipe.ingredients || []).length - 3} more`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 text-sm text-gray-600">
                <strong>Pipeline:</strong> {result.metadata?.pipeline || 'Stage 1 + Stage 2'}
                <br />
                <strong>Generated:</strong> {result.metadata?.generatedAt ? new Date(result.metadata.generatedAt).toLocaleString() : 'Just now'}
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-red-800 mb-4">❌ Pipeline Failed</h2>
              <p className="text-red-600 mb-4">{result.error}</p>
              
              {result.details && (
                <div className="mb-4">
                  <strong className="text-red-800">Details:</strong>
                  <pre className="mt-2 p-3 bg-red-100 rounded text-xs overflow-auto max-h-32">
                    {result.details}
                  </pre>
                </div>
              )}

              <div className="text-sm text-red-600">
                <strong>Troubleshooting:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Check API keys: <a href="/api/debug/pipeline-status" target="_blank" className="text-blue-600 underline">Pipeline Status</a></li>
                  <li>Verify network connectivity</li>
                  <li>Try again in a few moments (rate limiting)</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}