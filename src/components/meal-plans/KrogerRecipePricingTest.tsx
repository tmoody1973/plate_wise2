'use client';

import { useState, useEffect } from 'react';

interface IngredientCost {
  ingredient: string;
  unitPrice: number;
  quantity: number;
  totalCost: number;
  confidence: string;
  krogerLocation?: string;
}

interface RecipePricingResult {
  totalCost: number;
  costPerServing: number;
  servings: number;
  ingredientCosts: IngredientCost[];
  savings?: {
    estimatedSavings: number;
    budgetOptimizationTips: string[];
  };
}

export default function KrogerRecipePricingTest() {
  const [zipCode, setZipCode] = useState('90210');
  const [servings, setServings] = useState(4);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [selectedRecipe, setSelectedRecipe] = useState('mexican');
  const [customIngredients, setCustomIngredients] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  const testRecipePricing = async (useCustom = false) => {
    setLoading(true);
    setResult(null);

    try {
      let ingredients;
      
      if (useCustom && customIngredients.trim()) {
        // Parse custom ingredients (one per line)
        ingredients = customIngredients
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .map(line => {
            // Try to parse "amount unit ingredient" format
            const match = line.match(/^(\d+(?:\.\d+)?)\s*(\w+)?\s+(.+)$/);
            if (match) {
              return {
                name: match[3],
                amount: parseFloat(match[1]),
                unit: match[2] || 'each'
              };
            }
            // Fallback to just ingredient name
            return { name: line, amount: 1, unit: 'each' };
          });
      } else {
        // Use sample recipe
        const response = await fetch(
          `/api/debug/kroger-recipe-pricing?recipe=${selectedRecipe}&zipCode=${zipCode}`
        );
        const data = await response.json();
        setResult(data);
        setLoading(false);
        return;
      }

      // Test custom ingredients
      const response = await fetch('/api/debug/kroger-recipe-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients, zipCode, servings })
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      });
    } finally {
      setLoading(false);
    }
  };

  const sampleRecipes = {
    mexican: 'Mexican Beef Tacos (10 ingredients)',
    italian: 'Italian Pasta Bake (8 ingredients)', 
    asian: 'Asian Stir Fry (9 ingredients)'
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Recipe Selection */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Recipe Pricing Test</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Sample Recipe</label>
            <select
              value={selectedRecipe}
              onChange={(e) => setSelectedRecipe(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Object.entries(sampleRecipes).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Zip Code</label>
            <input
              type="text"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              placeholder="90210"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Servings</label>
            <input
              type="number"
              value={servings}
              onChange={(e) => setServings(parseInt(e.target.value) || 4)}
              min="1"
              max="12"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <button
          onClick={() => testRecipePricing(false)}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 mr-4"
        >
          {loading ? 'Getting Prices...' : 'Test Sample Recipe'}
        </button>
      </div>

      {/* Custom Ingredients */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Custom Ingredient List</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Enter ingredients (one per line, format: "amount unit ingredient")
          </label>
          <textarea
            value={customIngredients}
            onChange={(e) => setCustomIngredients(e.target.value)}
            placeholder={`1 lb ground beef
2 large tomatoes
1 medium onion
1 cup rice
8 oz cheese`}
            rows={8}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
        </div>
        
        <button
          onClick={() => testRecipePricing(true)}
          disabled={loading || !customIngredients.trim()}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Getting Prices...' : 'Test Custom Recipe'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-6">
            <h3 className={`text-lg font-semibold mb-4 ${result.success ? 'text-green-600' : 'text-red-600'}`}>
              {result.success ? '✅ Recipe Pricing Results' : '❌ Pricing Failed'}
            </h3>
            
            {result.success && result.result ? (
              <div className="space-y-6">
                {/* Cost Summary */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        ${result.result.totalCost?.toFixed(2) || '0.00'}
                      </div>
                      <div className="text-sm text-gray-600">Total Recipe Cost</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        ${result.result.costPerServing?.toFixed(2) || '0.00'}
                      </div>
                      <div className="text-sm text-gray-600">Cost Per Serving</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        {result.result.servings || result.servings}
                      </div>
                      <div className="text-sm text-gray-600">Servings</div>
                    </div>
                  </div>
                </div>

                {/* Ingredient Breakdown */}
                <div>
                  <h4 className="font-semibold mb-3">Ingredient Cost Breakdown</h4>
                  <div className="space-y-2">
                    {result.result.ingredientCosts?.map((item: IngredientCost, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium capitalize">{item.ingredient}</div>
                          <div className="text-sm text-gray-600">
                            {item.quantity} × ${item.unitPrice?.toFixed(2)} 
                            {item.krogerLocation && (
                              <span className="ml-2 text-blue-600">@ {item.krogerLocation}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">${item.totalCost?.toFixed(2)}</div>
                          <div className={`text-xs px-2 py-1 rounded ${
                            item.confidence === 'high' ? 'bg-green-100 text-green-800' :
                            item.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {item.confidence}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Budget Tips */}
                {result.result.savings?.budgetOptimizationTips?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">💡 Budget Optimization Tips</h4>
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <ul className="space-y-2">
                        {result.result.savings.budgetOptimizationTips.map((tip: string, index: number) => (
                          <li key={index} className="flex items-start">
                            <span className="text-yellow-600 mr-2">•</span>
                            <span className="text-sm">{tip}</span>
                          </li>
                        ))}
                      </ul>
                      {result.result.savings.estimatedSavings > 0 && (
                        <div className="mt-3 pt-3 border-t border-yellow-200">
                          <div className="text-sm font-medium text-yellow-800">
                            Potential Savings: ${result.result.savings.estimatedSavings.toFixed(2)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Getting Kroger pricing for all ingredients...</p>
        </div>
      )}
    </div>
  );
}