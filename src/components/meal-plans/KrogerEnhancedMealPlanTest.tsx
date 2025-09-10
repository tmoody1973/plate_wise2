'use client';

import { useState, useEffect } from 'react';

interface MealPlanRequest {
  culturalCuisines: string[];
  dietaryRestrictions: string[];
  budgetLimit: number;
  householdSize: number;
  timeFrame: string;
  zipCode: string;
  nutritionalGoals: string[];
  excludeIngredients: string[];
}

interface EnhancedRecipe {
  id: string;
  title: string;
  description: string;
  culturalOrigin: string[];
  ingredients: Array<{
    name: string;
    amount: string;
    krogerPrice?: {
      unitPrice: number;
      totalCost: number;
      confidence: string;
      storeLocation?: string;
      onSale?: boolean;
      salePrice?: number;
    };
  }>;
  pricing: {
    totalCost: number;
    costPerServing: number;
    budgetFriendly: boolean;
    savingsOpportunities: string[];
  };
  imageUrl?: string;
  metadata: {
    servings: number;
    prepTime: number;
    cookTime: number;
    totalTime: number;
  };
}

export default function KrogerEnhancedMealPlanTest() {
  const [request, setRequest] = useState<MealPlanRequest>({
    culturalCuisines: ['mexican'],
    dietaryRestrictions: [],
    budgetLimit: 50,
    householdSize: 4,
    timeFrame: 'week',
    zipCode: '90210',
    nutritionalGoals: [],
    excludeIngredients: []
  });
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  const generateMealPlan = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/meal-plans/kroger-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
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

  const cuisineOptions = [
    'mexican', 'italian', 'chinese', 'indian', 'thai', 'japanese', 
    'mediterranean', 'american', 'french', 'korean', 'vietnamese'
  ];

  const dietaryOptions = [
    'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'keto', 
    'paleo', 'low-carb', 'low-sodium', 'diabetic-friendly'
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Meal Plan Configuration */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">🍽️ Enhanced Meal Plan Generator</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Cultural Cuisines */}
          <div>
            <label className="block text-sm font-medium mb-2">Cultural Cuisines</label>
            <select
              multiple
              value={request.culturalCuisines}
              onChange={(e) => setRequest(prev => ({
                ...prev,
                culturalCuisines: Array.from(e.target.selectedOptions, option => option.value)
              }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              size={4}
            >
              {cuisineOptions.map(cuisine => (
                <option key={cuisine} value={cuisine}>
                  {cuisine.charAt(0).toUpperCase() + cuisine.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Budget & Household */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Budget Limit (${request.budgetLimit})
              </label>
              <input
                type="range"
                min="20"
                max="200"
                step="10"
                value={request.budgetLimit}
                onChange={(e) => setRequest(prev => ({
                  ...prev,
                  budgetLimit: parseInt(e.target.value)
                }))}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Household Size</label>
              <input
                type="number"
                min="1"
                max="12"
                value={request.householdSize}
                onChange={(e) => setRequest(prev => ({
                  ...prev,
                  householdSize: parseInt(e.target.value) || 4
                }))}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Zip Code</label>
              <input
                type="text"
                value={request.zipCode}
                onChange={(e) => setRequest(prev => ({
                  ...prev,
                  zipCode: e.target.value
                }))}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="90210"
              />
            </div>
          </div>

          {/* Dietary Restrictions */}
          <div>
            <label className="block text-sm font-medium mb-2">Dietary Restrictions</label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {dietaryOptions.map(diet => (
                <label key={diet} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={request.dietaryRestrictions.includes(diet)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setRequest(prev => ({
                          ...prev,
                          dietaryRestrictions: [...prev.dietaryRestrictions, diet]
                        }));
                      } else {
                        setRequest(prev => ({
                          ...prev,
                          dietaryRestrictions: prev.dietaryRestrictions.filter(d => d !== diet)
                        }));
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm">{diet}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={generateMealPlan}
          disabled={loading}
          className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
        >
          {loading ? '🔄 Generating Enhanced Meal Plan...' : '🚀 Generate Meal Plan with Kroger Pricing'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {result.success && result.data?.mealPlan ? (
            <>
              {/* Summary */}
              <div className="bg-white rounded-lg border shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4 text-green-600">
                  ✅ Meal Plan Generated Successfully
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {result.data.mealPlan.summary.totalRecipes}
                    </div>
                    <div className="text-sm text-gray-600">Recipes</div>
                  </div>
                  
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      ${result.data.mealPlan.summary.totalCost.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">Total Cost</div>
                  </div>
                  
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      ${result.data.mealPlan.summary.averageCostPerMeal.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">Per Meal</div>
                  </div>
                  
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {result.data.mealPlan.summary.budgetUtilization.toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-600">Budget Used</div>
                  </div>
                </div>

                {/* Cultural Diversity */}
                <div className="mb-4">
                  <h4 className="font-medium mb-2">🌍 Cultural Diversity</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.data.mealPlan.summary.culturalDiversity.map((culture: string) => (
                      <span key={culture} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {culture}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Budget Analysis */}
              <div className="bg-white rounded-lg border shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">💰 Budget Analysis</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className={`p-4 rounded-lg ${
                      result.data.mealPlan.budgetAnalysis.withinBudget 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Budget Status</span>
                        <span className={`font-bold ${
                          result.data.mealPlan.budgetAnalysis.withinBudget 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {result.data.mealPlan.budgetAnalysis.withinBudget ? '✅ Within Budget' : '⚠️ Over Budget'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Spent: ${result.data.mealPlan.budgetAnalysis.totalSpent.toFixed(2)} / 
                        Budget: ${request.budgetLimit}
                      </div>
                      <div className="text-sm text-gray-600">
                        Remaining: ${result.data.mealPlan.budgetAnalysis.budgetRemaining.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">💡 Savings Opportunities</h4>
                    <div className="space-y-2">
                      {result.data.mealPlan.budgetAnalysis.savingsOpportunities.slice(0, 3).map((opportunity: any, index: number) => (
                        <div key={index} className="text-sm p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
                          {opportunity.description}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recipes */}
              <div className="bg-white rounded-lg border shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">🍳 Recipes with Kroger Pricing</h3>
                
                <div className="grid gap-6">
                  {result.data.mealPlan.recipes.map((recipe: EnhancedRecipe) => (
                    <div key={recipe.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{recipe.title}</h4>
                          <p className="text-gray-600 text-sm">{recipe.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span>🍽️ {recipe.metadata.servings} servings</span>
                            <span>⏱️ {recipe.metadata.totalTime} min</span>
                            <span>🌍 {recipe.culturalOrigin.join(', ')}</span>
                          </div>
                        </div>
                        
                        <div className="text-right ml-4">
                          <div className="text-xl font-bold text-green-600">
                            ${recipe.pricing.costPerServing.toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-500">per serving</div>
                          <div className="text-sm text-gray-500">
                            Total: ${recipe.pricing.totalCost.toFixed(2)}
                          </div>
                          {recipe.pricing.budgetFriendly && (
                            <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                              Budget Friendly
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Ingredients with Kroger Pricing */}
                      <div>
                        <h5 className="font-medium mb-2">🛒 Ingredients & Kroger Prices</h5>
                        <div className="grid gap-2">
                          {recipe.ingredients.slice(0, 8).map((ingredient, index) => (
                            <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                              <span>
                                {ingredient.amount} {ingredient.name}
                              </span>
                              {ingredient.krogerPrice ? (
                                <div className="text-right">
                                  <span className="font-medium">
                                    ${ingredient.krogerPrice.totalCost.toFixed(2)}
                                  </span>
                                  {ingredient.krogerPrice.onSale && (
                                    <span className="ml-2 text-red-600 text-xs">ON SALE!</span>
                                  )}
                                  <div className="text-xs text-gray-500">
                                    @ {ingredient.krogerPrice.storeLocation}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400">Price unavailable</span>
                              )}
                            </div>
                          ))}
                          {recipe.ingredients.length > 8 && (
                            <div className="text-sm text-gray-500 text-center">
                              ... and {recipe.ingredients.length - 8} more ingredients
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Savings Opportunities */}
                      {recipe.pricing.savingsOpportunities.length > 0 && (
                        <div className="mt-3 p-3 bg-yellow-50 rounded border-l-4 border-yellow-400">
                          <h6 className="font-medium text-sm mb-1">💡 Savings Tips:</h6>
                          <ul className="text-sm text-gray-700">
                            {recipe.pricing.savingsOpportunities.map((tip, index) => (
                              <li key={index}>• {tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Shopping List */}
              <div className="bg-white rounded-lg border shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">🛍️ Consolidated Shopping List</h3>
                
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      ${result.data.mealPlan.shoppingList.totalEstimatedCost.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">Total Estimated Shopping Cost</div>
                  </div>
                </div>

                {Object.entries(result.data.mealPlan.shoppingList.byStore).map(([store, items]: [string, any[]]) => (
                  <div key={store} className="mb-6">
                    <h4 className="font-medium mb-3 text-lg">🏪 {store}</h4>
                    <div className="grid gap-2">
                      {items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <div>
                            <span className="font-medium">{item.ingredient}</span>
                            <div className="text-sm text-gray-600">
                              {item.totalAmount} • Used in: {item.recipes.join(', ')}
                            </div>
                          </div>
                          <span className="font-bold text-green-600">
                            ${item.estimatedCost.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4 text-red-600">
                ❌ Meal Plan Generation Failed
              </h3>
              <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600 font-medium">
            🔄 Generating your enhanced meal plan...
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Finding recipes → Extracting details → Getting Kroger prices → Optimizing budget
          </p>
        </div>
      )}
    </div>
  );
}