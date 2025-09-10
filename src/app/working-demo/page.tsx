'use client';

import { useState, useEffect } from 'react';

interface MockMealPlan {
  id: string;
  name: string;
  status: string;
  cultural_cuisines: string[];
  budget_limit: number;
  household_size: number;
  total_cost: number;
  budget_utilization: number;
  recipe_count: number;
  created_at: string;
  recipes: MockRecipe[];
}

interface MockRecipe {
  id: string;
  title: string;
  cuisine: string;
  servings: number;
  total_time: number;
  total_cost: number;
  cost_per_serving: number;
  ingredients: string[];
}

export default function WorkingDemoPage() {
  const [user, setUser] = useState<any>(null);
  const [mealPlans, setMealPlans] = useState<MockMealPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MockMealPlan | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'create'>('dashboard');
  const [isCreating, setIsCreating] = useState(false);
  const [creationProgress, setCreationProgress] = useState<string[]>([]);

  // Mock meal plans data
  const mockMealPlans: MockMealPlan[] = [
    {
      id: '1',
      name: 'Mediterranean Week',
      status: 'active',
      cultural_cuisines: ['mediterranean'],
      budget_limit: 60,
      household_size: 4,
      total_cost: 47.25,
      budget_utilization: 78.8,
      recipe_count: 5,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      recipes: [
        {
          id: '1',
          title: 'Greek Quinoa Salad',
          cuisine: 'Mediterranean',
          servings: 4,
          total_time: 20,
          total_cost: 8.50,
          cost_per_serving: 2.13,
          ingredients: ['quinoa', 'cucumber', 'tomatoes', 'feta cheese', 'olive oil', 'lemon']
        },
        {
          id: '2',
          title: 'Mediterranean Chickpea Stew',
          cuisine: 'Mediterranean',
          servings: 4,
          total_time: 35,
          total_cost: 12.75,
          cost_per_serving: 3.19,
          ingredients: ['chickpeas', 'tomatoes', 'onion', 'garlic', 'olive oil', 'herbs']
        }
      ]
    },
    {
      id: '2',
      name: 'Asian Fusion',
      status: 'completed',
      cultural_cuisines: ['asian'],
      budget_limit: 45,
      household_size: 4,
      total_cost: 38.90,
      budget_utilization: 86.4,
      recipe_count: 4,
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      recipes: [
        {
          id: '3',
          title: 'Vegetable Stir Fry',
          cuisine: 'Asian',
          servings: 4,
          total_time: 15,
          total_cost: 9.25,
          cost_per_serving: 2.31,
          ingredients: ['broccoli', 'bell peppers', 'soy sauce', 'ginger', 'garlic', 'rice']
        }
      ]
    }
  ];

  useEffect(() => {
    // Check for mock user
    const mockUser = localStorage.getItem('mockUser');
    if (mockUser) {
      setUser(JSON.parse(mockUser));
      // Load mock meal plans after a short delay to simulate API call
      setTimeout(() => {
        setMealPlans(mockMealPlans);
      }, 500);
    }
  }, []);

  const createMockUser = () => {
    const newMockUser = {
      id: `mock-user-${Date.now()}`,
      email: `test${Date.now()}@platewise.local`,
      created_at: new Date().toISOString(),
      isMockUser: true
    };

    localStorage.setItem('mockUser', JSON.stringify(newMockUser));
    setUser(newMockUser);
    
    // Load mock data
    setTimeout(() => {
      setMealPlans(mockMealPlans);
    }, 500);
  };

  const signOut = () => {
    localStorage.removeItem('mockUser');
    setUser(null);
    setMealPlans([]);
    setSelectedPlan(null);
  };

  const createNewMealPlan = async () => {
    setIsCreating(true);
    setCreationProgress([]);

    const steps = [
      'Creating meal plan...',
      'Discovering Mediterranean recipes...',
      'Found: Greek Quinoa Salad',
      'Found: Mediterranean Chickpea Stew', 
      'Found: Lemon Herb Chicken',
      'Adding Kroger pricing...',
      'Calculating budget utilization...',
      'Meal plan created successfully!'
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setCreationProgress(prev => [...prev, steps[i]]);
    }

    // Create new meal plan
    const newPlan: MockMealPlan = {
      id: `plan-${Date.now()}`,
      name: 'New Mediterranean Plan',
      status: 'active',
      cultural_cuisines: ['mediterranean'],
      budget_limit: 55,
      household_size: 4,
      total_cost: 42.30,
      budget_utilization: 76.9,
      recipe_count: 3,
      created_at: new Date().toISOString(),
      recipes: [
        {
          id: `recipe-${Date.now()}`,
          title: 'Greek Quinoa Salad',
          cuisine: 'Mediterranean',
          servings: 4,
          total_time: 20,
          total_cost: 8.50,
          cost_per_serving: 2.13,
          ingredients: ['quinoa', 'cucumber', 'tomatoes', 'feta cheese', 'olive oil', 'lemon']
        },
        {
          id: `recipe-${Date.now() + 1}`,
          title: 'Mediterranean Chickpea Stew',
          cuisine: 'Mediterranean',
          servings: 4,
          total_time: 35,
          total_cost: 12.75,
          cost_per_serving: 3.19,
          ingredients: ['chickpeas', 'tomatoes', 'onion', 'garlic', 'olive oil', 'herbs']
        },
        {
          id: `recipe-${Date.now() + 2}`,
          title: 'Lemon Herb Chicken',
          cuisine: 'Mediterranean',
          servings: 4,
          total_time: 45,
          total_cost: 21.05,
          cost_per_serving: 5.26,
          ingredients: ['chicken breast', 'lemon', 'herbs', 'olive oil', 'garlic', 'potatoes']
        }
      ]
    };

    setMealPlans(prev => [newPlan, ...prev]);
    setSelectedPlan(newPlan);
    setIsCreating(false);
    setActiveTab('dashboard');
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-center mb-6">
            PlateWise Working Demo
          </h1>
          
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🍽️</div>
            <p className="text-gray-600 mb-6">
              Experience the complete meal planning system with mock data - no authentication issues!
            </p>
          </div>

          <button
            onClick={createMockUser}
            className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 font-medium"
          >
            🚀 Start Demo (Create Mock User)
          </button>

          <div className="mt-4 text-xs text-gray-500 text-center">
            This creates a local test user and loads sample meal plans
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                PlateWise Working Demo
              </h1>
              <p className="text-gray-600 mt-1">
                Fully functional meal planning with mock data
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-green-600">
                ✅ {user.email}
              </div>
              <button
                onClick={signOut}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6">
          <nav className="flex space-x-8">
            {[
              { id: 'dashboard' as const, label: 'Dashboard', icon: '📊' },
              { id: 'create' as const, label: 'Create Plan', icon: '➕' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
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
          
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Meal Plans List */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Your Meal Plans</h2>
                
                {mealPlans.length === 0 ? (
                  <div className="text-gray-500 italic p-4 border border-gray-200 rounded-lg">
                    Loading meal plans...
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
                        onClick={() => setSelectedPlan(plan)}
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
                          <p className="text-green-600">
                            Total Cost: {formatCurrency(plan.total_cost)} 
                            ({plan.budget_utilization.toFixed(1)}% of budget)
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Plan Details */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                {selectedPlan ? (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">{selectedPlan.name}</h2>

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
                        <div className="text-green-600">
                          <strong>Total Cost:</strong> {formatCurrency(selectedPlan.total_cost)}
                        </div>
                        <div className="text-green-600">
                          <strong>Budget Used:</strong> {selectedPlan.budget_utilization.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* Recipes */}
                    <h3 className="text-lg font-semibold mb-3">Recipes</h3>
                    <div className="space-y-3">
                      {selectedPlan.recipes.map((recipe) => (
                        <div key={recipe.id} className="p-3 border border-gray-200 rounded-lg">
                          <h4 className="font-medium mb-2">{recipe.title}</h4>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>Cuisine: {recipe.cuisine} | Servings: {recipe.servings} | Time: {recipe.total_time}min</p>
                            <p className="text-green-600">
                              Cost: {formatCurrency(recipe.total_cost)} 
                              ({formatCurrency(recipe.cost_per_serving)}/serving)
                            </p>
                            <div>
                              <strong>Ingredients:</strong> {recipe.ingredients.join(', ')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 italic p-8 text-center border border-gray-200 rounded-lg">
                    Select a meal plan to view details
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Create Tab */}
          {activeTab === 'create' && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6">Create New Meal Plan</h2>
              
              {!isCreating ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🍽️</div>
                  <h3 className="text-xl font-semibold mb-2">Ready to Create a Mediterranean Meal Plan?</h3>
                  <p className="text-gray-600 mb-6">
                    This demo will create a sample Mediterranean meal plan with pricing
                  </p>
                  <button
                    onClick={createNewMealPlan}
                    className="bg-green-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-600"
                  >
                    Create Mediterranean Plan
                  </button>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Creating Meal Plan...</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {creationProgress.map((step, index) => (
                      <div key={index} className="mb-2 p-2 bg-white rounded border-l-4 border-blue-500">
                        <div className="text-sm">
                          {step}
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
    </div>
  );
}