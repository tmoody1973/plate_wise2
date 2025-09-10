"use client"

import { useState } from 'react';

export default function TestPerplexityCitations() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testCitations = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const request = {
        culturalCuisines: ['Mexican', 'Italian', 'Indian'],
        dietaryRestrictions: [],
        numberOfMeals: 3
      };

      console.log('🧪 Testing Perplexity citations with request:', request);
      
      const response = await fetch('/api/test-perplexity-citations', {
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
      console.log('✅ Perplexity citations test results:', data);
      
    } catch (err) {
      console.error('❌ Citations test failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          📚 Perplexity Citations Test
        </h1>
        
        <div className="mb-6">
          <button
            onClick={testCitations}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            {loading ? '🔄 Testing Citations...' : '📚 Test Perplexity Citations'}
          </button>
          
          <p className="text-gray-600 text-sm mt-4">
            This tests whether Perplexity citations are being extracted and used as source URLs.
            Check the browser console for detailed citation logs.
          </p>
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
              <h3 className="text-green-800 font-medium mb-2">✅ Perplexity Citations Test</h3>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Success:</span> {results.success ? 'Yes' : 'No'}
                </div>
                <div>
                  <span className="font-medium">Citations:</span> {results.stats?.citationsCount || 0}
                </div>
                <div>
                  <span className="font-medium">Recipes:</span> {results.stats?.recipesCount || 0}
                </div>
                <div>
                  <span className="font-medium">With URLs:</span> {results.stats?.recipesWithUrls || 0}
                </div>
              </div>
            </div>

            {results.citations && results.citations.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-blue-800 font-medium mb-2">📚 Raw Citations from Perplexity</h3>
                <div className="space-y-2">
                  {results.citations.map((citation: any, index: number) => (
                    <div key={index} className="bg-white rounded p-3 text-sm">
                      <div className="font-medium text-gray-800 mb-1">[{index + 1}] {citation.title}</div>
                      <a 
                        href={citation.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 break-all"
                      >
                        {citation.url}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show structured recipes if available */}
            {results.recipes && results.recipes.length > 0 && (
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-medium mb-4 text-green-800">🍽️ Structured Recipe Results</h3>
                <div className="space-y-4">
                  {results.recipes.map((recipe: any, index: number) => (
                    <div key={index} className="bg-white rounded-lg p-4 border">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-800">{recipe.name}</h4>
                        {recipe.source_url ? (
                          <span className="text-green-600 text-xs font-medium bg-green-100 px-2 py-1 rounded">
                            ✅ HAS URL
                          </span>
                        ) : (
                          <span className="text-red-600 text-xs font-medium bg-red-100 px-2 py-1 rounded">
                            ❌ NO URL
                          </span>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Cuisine:</span> {recipe.cuisine}
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-3">
                        {recipe.description}
                      </div>
                      
                      <div className="bg-gray-100 rounded p-3">
                        <div className="text-sm font-medium text-gray-700 mb-1">Source URL:</div>
                        {recipe.source_url ? (
                          <a 
                            href={recipe.source_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm break-all"
                          >
                            {recipe.source_url}
                          </a>
                        ) : (
                          <div className="text-gray-500 text-sm">No source URL available</div>
                        )}
                      </div>
                      
                      {recipe.difficulty && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Difficulty:</span> {recipe.difficulty}
                        </div>
                      )}
                      
                      {recipe.prep_time && (
                        <div className="mt-1 text-sm text-gray-600">
                          <span className="font-medium">Prep Time:</span> {recipe.prep_time}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Show sources if available */}
            {results.sources && results.sources.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium mb-4 text-blue-800">📚 Structured Sources</h3>
                <div className="space-y-2">
                  {results.sources.map((source: any, index: number) => (
                    <div key={index} className="bg-white rounded p-3 text-sm">
                      <div className="font-medium text-gray-800 mb-1">{source.title}</div>
                      <a 
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 break-all"
                      >
                        {source.url}
                      </a>
                      {source.description && (
                        <div className="text-gray-600 mt-1">{source.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fallback to concepts if structured data not available */}
            {results.concepts && results.concepts.length > 0 && !results.recipes && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium mb-4 text-gray-800">🔗 Parsed Recipe Concepts (Fallback)</h3>
                <div className="space-y-4">
                  {results.concepts.map((concept: any, index: number) => (
                    <div key={index} className="bg-white rounded-lg p-4 border">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-800">{concept.concept}</h4>
                        {concept.hasCitation ? (
                          <span className="text-green-600 text-xs font-medium bg-green-100 px-2 py-1 rounded">
                            ✅ HAS CITATION [{concept.citationIndex + 1}]
                          </span>
                        ) : (
                          <span className="text-red-600 text-xs font-medium bg-red-100 px-2 py-1 rounded">
                            ❌ NO CITATION
                          </span>
                        )}
                      </div>
                      
                      <div className="bg-gray-100 rounded p-3">
                        <div className="text-sm font-medium text-gray-700 mb-1">Source URL:</div>
                        {concept.sourceUrl ? (
                          <a 
                            href={concept.sourceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm break-all"
                          >
                            {concept.sourceUrl}
                          </a>
                        ) : (
                          <div className="text-gray-500 text-sm">No source URL available</div>
                        )}
                      </div>
                      
                      {concept.title && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Citation Title:</span> {concept.title}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.content && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-yellow-800 font-medium mb-2">📝 Raw Perplexity Response</h3>
                <pre className="text-yellow-700 text-sm whitespace-pre-wrap bg-white p-3 rounded border overflow-auto max-h-64">
                  {results.content}
                </pre>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-blue-800 font-medium mb-2">🔍 How to Verify Citations</h3>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• Check that citations are being returned by Perplexity</li>
                <li>• Verify that recipe concepts are being matched to citations</li>
                <li>• Test that the citation URLs actually work (no 404 errors)</li>
                <li>• Look for [1], [2], [3] references in the raw response</li>
                <li>• Check browser console for detailed parsing logs</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}