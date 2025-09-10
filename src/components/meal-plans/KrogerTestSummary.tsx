'use client';

import { useState } from 'react';

interface TestResult {
  ingredient: string;
  bestMatch?: {
    name: string;
    price: { regular: number; promo?: number; sale?: number };
    brand: string;
    size: string;
    availability: string;
  };
  location?: {
    name: string;
    address: { city: string; state: string };
  };
  confidence: string;
}

export default function KrogerTestSummary() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);

  const testIngredients = ['tomatoes', 'chicken', 'rice', 'onions', 'milk', 'bread'];

  const runAllTests = async () => {
    setLoading(true);
    setResults([]);
    
    for (const ingredient of testIngredients) {
      try {
        const response = await fetch(
          `/api/debug/kroger-single-test?ingredient=${ingredient}&zipCode=90210`
        );
        const data = await response.json();
        
        if (data.success && data.result) {
          setResults(prev => [...prev, {
            ingredient,
            bestMatch: data.result.bestMatch,
            location: data.result.location,
            confidence: data.result.confidence
          }]);
        }
      } catch (error) {
        console.error(`Failed to test ${ingredient}:`, error);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Kroger API Test Summary</h2>
        <button
          onClick={runAllTests}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testing All Ingredients...' : 'Test Common Ingredients'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              Results from {results[0]?.location?.name} ({results[0]?.location?.address?.city}, {results[0]?.location?.address?.state})
            </h3>
            
            <div className="grid gap-4">
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-lg capitalize">{result.ingredient}</h4>
                      <p className="text-gray-600">{result.bestMatch?.name}</p>
                      <p className="text-sm text-gray-500">
                        {result.bestMatch?.brand} • {result.bestMatch?.size} • {result.bestMatch?.availability}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xl font-bold text-green-600">
                        ${result.bestMatch?.price.regular?.toFixed(2)}
                      </div>
                      {result.bestMatch?.price.promo && result.bestMatch.price.promo > 0 && (
                        <div className="text-sm text-red-600">
                          Sale: ${result.bestMatch.price.promo.toFixed(2)}
                        </div>
                      )}
                      <div className={`text-xs px-2 py-1 rounded mt-1 ${
                        result.confidence === 'high' ? 'bg-green-100 text-green-800' :
                        result.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {result.confidence} confidence
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Testing ingredients... ({results.length}/{testIngredients.length})</p>
        </div>
      )}
    </div>
  );
}