'use client';

import { useState } from 'react';

export default function OfflineDemoPage() {
  const [activeDemo, setActiveDemo] = useState<'meal-plan' | 'recipes' | 'pricing'>('meal-plan');
  const [mealPlan, setMealPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Mock data for demonstration
  const mockRecipes = [
    {
      id: '1',
      title: 'Mediterranean Quinoa Bowl',
      cuisine: 'Mediterranean',
      servings: 4,
      totalTime: 25,
      ingredients: ['quinoa', 'chickpeas', 'cucumber', 'tomatoes', 'feta cheese', 'olive oil'],
      estimatedCost: 12.50,
      costPerServing: 3.13
    },
    {
      id: '2', 
      title: 'Asian Stir-Fry with Tofu',
      cuisine: 'Asian',
      servings: 4,
      totalTime: 20,
      ingredients: ['tofu', 'broccoli', 'bell peppers', 'soy sauce', 'ginger', 'rice'],
      estimatedCost: 10.75,
      costPerServing: 2.69
    },
    {
      id: '3',
      title: 'Mexican Black Bean Tacos',
      cuisine: 'Mexican', 
      servings: 4,
      totalTime: 15,
      ingredients: ['black beans', 'corn tortillas', 'avocado', 'lime', 'cilantro', 'onion'],
      estimatedCost: 8.25,
      costPerServing: 2.06
    }
  ];

  const createMockMealPlan = () => {
    setLoading(true);
    
    // Simulate API delay
    setTimeout(() => {
      const newMealPlan = {
        id: `plan-${Date.now()}`,
        name: 'Demo Mediterranean Week',
        culturalCuisines: ['mediterranean', 'asian', 'mexican'],
        budgetLimit: 50,
        householdSize: 4,
        recipes: mockRecipes,
        totalCost: mockRecipes.reduce((sum, recipe) => sum + recipe.estimatedCost, 0),
        budgetUtilization: 62.5, // (31.50 / 50) * 100
        status: 'active',
        createdAt: new Date().toISOString()
      };
      
      setMealPlan(newMealPlan);
      setLoading(false);
    }, 2000);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            PlateWise Demo (Offline Mode)
          </h1>
          <p className="text-gray-600 mt-1">
            Experience meal planning features without authentication - no rate limits!
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6">
          <nav className="flex space-x-8">
            {[
              { id: 'meal-plan' as const, label: 'Meal Plan Demo', icon: '🍽️' },
              { id: 'recipes' as const, label: 'Recipe Library', icon: '📚' },
              { id: 'pricing' as const, label: 'Budget Analysis', icon: '💰' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveDemo(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeDemo === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="py-8">
        <div className="max-w-6xl mx-auto px-6">
          
          {/* Meal Plan Demo */}
          {activeDemo === 'meal-plan' && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6">Create Demo Meal Plan</h2>
              
              {!mealPlan ? (
                <div className="text-center py-12">
                  <div className="mb-6">
                    <div className="text-6xl mb-4">🍽️</div>
                    <h3 className="text-xl font-semibold mb-2">Ready to Create Your Meal Plan?</h3>
                    <p className="text-gray-600 mb-6">
                      This demo shows how PlateWise creates culturally-authentic, budget-optimized meal plans
                    </p>
                  </div>
                  
                  <button
                    onClick={createMockMealPlan}
                    disabled={loading}
                    className="bg-green-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50"
                  >
                    {loading ? 'Creating Meal Plan...' : 'Create Demo Meal Plan'}
                  </button>
                  
                  {loading && (
                    <div className="mt-4 text-sm text-gray-600">
                      🔄 Discovering recipes... (This would normally stream in real-time)
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {/* Meal Plan Summary */}
                  <div className="bg-green-50 p-4 rounded-lg mb-6">
                    <h3 className="text-lg font-semibold text-green-800 mb-2">
                      ✅ {mealPlan.name} Created Successfully!
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <strong>Budget:</strong> {formatCurrency(mealPlan.budgetLimit)}
                      </div>
                      <div>
                        <strong>Total Cost:</strong> {formatCurrency(mealPlan.totalCost)}
                      </div>
                      <div>
                        <strong>Budget Used:</strong> {mealPlan.budgetUtilization}%
                      </div>
                      <div>
                        <strong>Recipes:</strong> {mealPlan.recipes.length}
                      </div>
                    </div>
                  </div>

                  {/* Recipes */}
                  <div className="space-y-4">
                    {mealPlan.recipes.map((recipe: any) => (
                      <div key={recipe.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-lg">{recipe.title}</h4>
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                            {recipe.cuisine}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                          <div>Servings: {recipe.servings}</div>
                          <div>Time: {recipe.totalTime} min</div>
                          <div className="text-green-600">Cost: {formatCurrency(recipe.estimatedCost)}</div>
                          <div className="text-green-600">Per Serving: {formatCurrency(recipe.costPerServing)}</div>
                        </div>
                        
                        <div>
                          <strong className="text-sm">Ingredients:</strong>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {recipe.ingredients.map((ingredient: string, index: number) => (
                              <span key={index} className="bg-gray-100 px-2 py-1 rounded text-sm">
                                {ingredient}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 text-center">
                    <button
                      onClick={() => setMealPlan(null)}
                      className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
                    >
                      Create Another Plan
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recipe Library Demo */}
          {activeDemo === 'recipes' && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6">Recipe Library</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockRecipes.map((recipe) => (
                  <div key={recipe.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <h3 className="font-semibold mb-2">{recipe.title}</h3>
                    <div className="text-sm text-gray-600 space-y-1 mb-3">
                      <div>Cuisine: {recipe.cuisine}</div>
                      <div>Time: {recipe.totalTime} minutes</div>
                      <div>Servings: {recipe.servings}</div>
                      <div className="text-green-600">Cost: {formatCurrency(recipe.estimatedCost)}</div>
                    </div>
                    <div className="text-xs">
                      <strong>Ingredients:</strong> {recipe.ingredients.slice(0, 3).join(', ')}
                      {recipe.ingredients.length > 3 && '...'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Budget Analysis Demo */}
          {activeDemo === 'pricing' && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6">Budget Analysis</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">Weekly Budget</h3>
                  <div className="text-2xl font-bold text-blue-600">{formatCurrency(50)}</div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">Estimated Cost</h3>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(31.50)}</div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-purple-800 mb-2">Savings</h3>
                  <div className="text-2xl font-bold text-purple-600">{formatCurrency(18.50)}</div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold mb-3">Cost Breakdown by Recipe</h3>
                <div className="space-y-2">
                  {mockRecipes.map((recipe) => (
                    <div key={recipe.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span>{recipe.title}</span>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(recipe.estimatedCost)}</div>
                        <div className="text-sm text-gray-600">{formatCurrency(recipe.costPerServing)}/serving</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-semibold text-yellow-800 mb-2">💡 Budget Optimization Tips</h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• You're 37% under budget - great job!</li>
                  <li>• Consider buying ingredients in bulk for additional savings</li>
                  <li>• Mediterranean recipes offer the best cost per serving</li>
                  <li>• Look for seasonal produce to reduce costs further</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-100 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h3 className="font-semibold mb-2">Ready to try the full version?</h3>
          <p className="text-gray-600 mb-4">
            This demo shows PlateWise's core features. The full version includes real-time recipe discovery, 
            Kroger pricing integration, and shopping list generation.
          </p>
          <div className="space-x-4">
            <a
              href="/meal-plans-demo"
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
            >
              Try Full Demo
            </a>
            <a
              href="/test-no-auth"
              className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
            >
              Test Database
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}