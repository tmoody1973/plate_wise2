'use client';

import { useState } from 'react';

interface PricingTestScenario {
  name: string;
  ingredients: string[];
  description: string;
  zipCode?: string;
}

const PRICING_SCENARIOS: PricingTestScenario[] = [
  {
    name: "Nigerian Jollof Rice",
    ingredients: ["tomatoes", "rice", "chicken", "onions", "scotch bonnet pepper", "vegetable oil"],
    description: "Traditional Nigerian dish ingredients"
  },
  {
    name: "Caribbean Curry",
    ingredients: ["curry powder", "coconut milk", "potatoes", "carrots", "chicken thighs"],
    description: "Caribbean curry essentials"
  },
  {
    name: "Mexican Tacos",
    ingredients: ["ground beef", "corn tortillas", "tomatoes", "onions", "cilantro", "lime"],
    description: "Classic taco ingredients"
  },
  {
    name: "Budget Basics",
    ingredients: ["rice", "beans", "eggs", "milk", "bread", "bananas"],
    description: "Essential budget-friendly ingredients"
  }
];

export default function InstacartPricingTest() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{[key: string]: any}>({});
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [zipCode, setZipCode] = useState('10001'); // Default NYC zip

  const testPricing = async (scenario: PricingTestScenario) => {
    const scenarioKey = scenario.name;
    setLoading(true);
    setErrors(prev => ({ ...prev, [scenarioKey]: '' }));
    setResults(prev => ({ ...prev, [scenarioKey]: null }));

    try {
      const response = await fetch('/api/debug/instacart-pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredients: scenario.ingredients,
          zipCode: zipCode || undefined
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setResults(prev => ({ ...prev, [scenarioKey]: data }));
    } catch (err) {
      setErrors(prev => ({ 
        ...prev, 
        [scenarioKey]: err instanceof Error ? err.message : 'Unknown error' 
      }));
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults({});
    setErrors({});
  };

  const calculateTotalCost = (ingredients: any[]) => {
    return ingredients.reduce((sum, ing) => sum + (ing.bestMatch?.price || 0), 0);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Instacart Pricing Integration Test</h1>
        <button
          onClick={clearResults}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Clear Results
        </button>
      </div>

      {/* Zip Code Input */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <label className="block text-sm font-medium mb-2">
          Zip Code (for location-based pricing):
        </label>
        <input
          type="text"
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
          placeholder="Enter zip code (e.g., 10001)"
          className="border rounded px-3 py-2 w-32"
        />
        <span className="text-sm text-gray-600 ml-2">
          Leave empty for general pricing
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {PRICING_SCENARIOS.map((scenario) => {
          const scenarioKey = scenario.name;
          const isLoading = loading;
          const result = results[scenarioKey];
          const error = errors[scenarioKey];

          return (
            <div key={scenarioKey} className="border rounded-lg p-4 bg-white shadow-sm">
              <h3 className="font-semibold text-lg mb-2">{scenario.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{scenario.description}</p>
              
              <div className="text-xs space-y-1 mb-3">
                <div><strong>Ingredients ({scenario.ingredients.length}):</strong></div>
                <div className="text-gray-500">
                  {scenario.ingredients.join(', ')}
                </div>
              </div>

              <button
                onClick={() => testPricing(scenario)}
                disabled={isLoading}
                className={`w-full px-3 py-2 rounded text-sm font-medium ${
                  result 
                    ? 'bg-green-500 text-white' 
                    : error 
                    ? 'bg-red-500 text-white' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                } disabled:opacity-50`}
              >
                {isLoading ? 'Getting Prices...' : result ? '✓ Priced' : error ? '✗ Error' : 'Get Pricing'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Results Section */}
      <div className="space-y-6">
        {Object.entries(results).map(([scenarioName, result]) => (
          <div key={scenarioName} className="border rounded-lg p-4 bg-green-50">
            <h2 className="text-xl font-semibold mb-3 text-green-800">
              💰 {scenarioName} Pricing Results
            </h2>
            
            {result && result.results && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      ${calculateTotalCost(result.results).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">Total Cost</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {result.summary?.withPricing || 0}/{result.summary?.totalIngredients || 0}
                    </div>
                    <div className="text-sm text-gray-600">Items Priced</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.round(result.summary?.avgConfidence || 1)}/3
                    </div>
                    <div className="text-sm text-gray-600">Avg Confidence</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Ingredient Pricing:</h3>
                  {result.results.map((item: any, index: number) => (
                    <div key={index} className="bg-white p-3 rounded border flex justify-between items-center">
                      <div>
                        <span className="font-medium">{item.ingredient}</span>
                        <span className={`ml-2 text-xs px-2 py-1 rounded ${
                          item.confidence === 'high' ? 'bg-green-100 text-green-800' :
                          item.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.confidence}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${item.bestMatch?.price?.toFixed(2) || '0.00'}</div>
                        <div className="text-xs text-gray-500">{item.bestMatch?.unit || 'each'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {Object.entries(errors).map(([scenarioName, error]) => (
          error && (
            <div key={scenarioName} className="border rounded-lg p-4 bg-red-50">
              <h2 className="text-xl font-semibold mb-2 text-red-800">
                ❌ {scenarioName} Error
              </h2>
              <div className="text-red-700">{error}</div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}