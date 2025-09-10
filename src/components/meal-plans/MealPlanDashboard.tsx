'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface MealPlan {
  id: string;
  name: string;
  status: string;
  cultural_cuisines: string[];
  budget_limit: number;
  household_size: number;
  recipe_count: number;
  total_cost: number;
  budget_utilization: number;
  has_pricing: boolean;
  created_at: string;
  updated_at: string;
}

interface Recipe {
  id: string;
  title: string;
  cuisine: string;
  servings: number;
  total_time: number;
  image_url?: string;
  source_url?: string;
  total_cost: number;
  cost_per_serving: number;
}

export default function MealPlanDashboard() {
  const [user, setUser] = useState<any>(null);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MealPlan | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClientComponentClient();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadMealPlans();
    }
  }, [user]);

  const checkUser = async () => {
    // Check for mock user first
    const mockUser = localStorage.getItem('mockUser');
    if (mockUser) {
      setUser(JSON.parse(mockUser));
      return;
    }

    // Fall back to Supabase auth
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadMealPlans = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/meal-plans/list');
      const data = await response.json();
      
      if (data.success) {
        setMealPlans(data.mealPlans || []);
      } else {
        setError(data.error || 'Failed to load meal plans');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMealPlanDetails = async (planId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/meal-plans/${planId}`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedPlan(data.mealPlan);
        setRecipes(data.mealPlan.recipes || []);
      } else {
        setError(data.error || 'Failed to load meal plan details');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const addPricing = async (planId: string) => {
    if (!selectedPlan?.zip_code) {
      setError('ZIP code required for pricing. Please update the meal plan.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/meal-plans/${planId}/pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zipCode: selectedPlan.zip_code })
      });

      if (response.ok) {
        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const eventData = JSON.parse(line.slice(6));
                  console.log('Pricing event:', eventData);
                } catch (e) {
                  // Ignore parsing errors
                }
              }
            }
          }
        }

        // Reload the meal plan to get updated pricing
        await loadMealPlanDetails(planId);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to add pricing');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateShoppingList = async (planId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/meal-plans/${planId}/shopping-list`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Shopping list generated with ${data.shoppingList.items?.length || 0} items!`);
      } else {
        setError(data.error || 'Failed to generate shopping list');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Sign In Required</h2>
        <p className="text-gray-600">Please sign in to view your meal plans.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Meal Plan Dashboard</h1>
          <button
            onClick={loadMealPlans}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* User Info */}
        <div className="bg-green-50 p-4 rounded-lg mb-6">
          <p className="text-green-800">
            ✅ Signed in as: {user.email}
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Meal Plans List */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Your Meal Plans</h2>
            
            {mealPlans.length === 0 ? (
              <div className="text-gray-500 italic p-4 border border-gray-200 rounded-lg">
                No meal plans found. Create your first meal plan to get started!
              </div>
            ) : (
              <div className="space-y-4">
                {mealPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedPlan?.id === plan.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => loadMealPlanDetails(plan.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{plan.name}</h3>
                      <span className={`px-2 py-1 text-xs rounded ${
                        plan.status === 'active' ? 'bg-green-100 text-green-800' :
                        plan.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {plan.status}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Budget: {formatCurrency(plan.budget_limit)} | Household: {plan.household_size}</p>
                      <p>Cuisines: {plan.cultural_cuisines.join(', ')}</p>
                      <p>Recipes: {plan.recipe_count} | Created: {formatDate(plan.created_at)}</p>
                      
                      {plan.has_pricing && (
                        <p className="text-green-600">
                          Total Cost: {formatCurrency(plan.total_cost)} 
                          ({plan.budget_utilization.toFixed(1)}% of budget)
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Meal Plan Details */}
          <div>
            {selectedPlan ? (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">{selectedPlan.name}</h2>
                  <div className="space-x-2">
                    {!selectedPlan.has_pricing && (
                      <button
                        onClick={() => addPricing(selectedPlan.id)}
                        disabled={loading}
                        className="bg-orange-500 text-white px-3 py-1 text-sm rounded hover:bg-orange-600 disabled:opacity-50"
                      >
                        Add Pricing
                      </button>
                    )}
                    <button
                      onClick={() => generateShoppingList(selectedPlan.id)}
                      disabled={loading}
                      className="bg-green-500 text-white px-3 py-1 text-sm rounded hover:bg-green-600 disabled:opacity-50"
                    >
                      Shopping List
                    </button>
                  </div>
                </div>

                {/* Plan Summary */}
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Budget:</strong> {formatCurrency(selectedPlan.budget_limit)}
                    </div>
                    <div>
                      <strong>Household:</strong> {selectedPlan.household_size} people
                    </div>
                    <div>
                      <strong>Recipes:</strong> {selectedPlan.recipe_count}
                    </div>
                    <div>
                      <strong>Status:</strong> {selectedPlan.status}
                    </div>
                    {selectedPlan.has_pricing && (
                      <>
                        <div className="text-green-600">
                          <strong>Total Cost:</strong> {formatCurrency(selectedPlan.total_cost)}
                        </div>
                        <div className="text-green-600">
                          <strong>Budget Used:</strong> {selectedPlan.budget_utilization.toFixed(1)}%
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Recipes */}
                <h3 className="text-lg font-semibold mb-3">Recipes</h3>
                {recipes.length === 0 ? (
                  <div className="text-gray-500 italic">No recipes found.</div>
                ) : (
                  <div className="space-y-3">
                    {recipes.map((recipe) => (
                      <div key={recipe.id} className="p-3 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{recipe.title}</h4>
                          {recipe.source_url && (
                            <a
                              href={recipe.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 text-sm hover:underline"
                            >
                              View Recipe
                            </a>
                          )}
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>Cuisine: {recipe.cuisine} | Servings: {recipe.servings} | Time: {recipe.total_time}min</p>
                          {recipe.total_cost > 0 && (
                            <p className="text-green-600">
                              Cost: {formatCurrency(recipe.total_cost)} 
                              ({formatCurrency(recipe.cost_per_serving)}/serving)
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 italic p-8 text-center border border-gray-200 rounded-lg">
                Select a meal plan to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}