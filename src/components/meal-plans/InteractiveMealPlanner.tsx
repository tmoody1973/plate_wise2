'use client';

import { useState, useEffect } from 'react';

interface Recipe {
  id: string;
  title: string;
  description: string;
  culturalOrigin: string[];
  cuisine: string;
  ingredients: Array<{
    id: string;
    name: string;
    amount: string;
    unit: string;
    originalName: string;
    isSubstituted: boolean;
    userStatus: 'normal' | 'already-have' | 'specialty-store';
    specialtyStore?: string;
    krogerPrice?: {
      unitPrice: number;
      totalCost: number;
      confidence: string;
      storeLocation?: string;
      onSale?: boolean;
      salePrice?: number;
      productName: string;
      size: string;
      brand: string;
      alternatives: Array<{
        name: string;
        price: number;
        brand: string;
        size: string;
      }>;
    };
  }>;
  instructions: string[];
  metadata: {
    servings: number;
    totalTime: number;
    estimatedTime: number;
  };
  pricing?: {
    totalCost: number;
    costPerServing: number;
    budgetFriendly: boolean;
    savingsOpportunities: string[];
    storeLocation?: string;
    excludedFromTotal: number; // Cost of items marked as "already have"
    specialtyStoreCost: number; // Cost of specialty items
  };
  imageUrl?: string;
  sourceUrl?: string;
  hasPricing: boolean;
}

interface SearchResult {
  id: string;
  name: string;
  cleanName: string;
  price: number;
  salePrice?: number;
  onSale: boolean;
  size: string;
  brand: string;
  confidence: string;
  isBestMatch: boolean;
}

export default function InteractiveMealPlanner() {
  const [step, setStep] = useState<'configure' | 'recipes' | 'pricing'>('configure');
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [zipCode, setZipCode] = useState('90210');
  
  // Configuration state
  const [config, setConfig] = useState({
    culturalCuisines: ['mexican'],
    dietaryRestrictions: [] as string[],
    householdSize: 4,
    timeFrame: 'week'
  });

  // Ingredient substitution state
  const [searchingIngredient, setSearchingIngredient] = useState<{
    recipeId: string;
    ingredientId: string;
    query: string;
  } | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [customSearchQuery, setCustomSearchQuery] = useState('');

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  // Step 1: Generate recipes without pricing
  const generateRecipes = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/meal-plans/recipes-only', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      const data = await response.json();
      if (data.success) {
        setRecipes(data.data.recipes);
        setStep('recipes');
      }
    } catch (error) {
      console.error('Recipe generation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Add pricing to recipes
  const addPricing = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/meal-plans/add-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipes, zipCode })
      });
      
      const data = await response.json();
      if (data.success) {
        setRecipes(data.data.recipes);
        setStep('pricing');
      }
    } catch (error) {
      console.error('Pricing addition failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search for ingredient alternatives
  const searchIngredient = async (recipeId: string, ingredientId: string, query: string) => {
    setSearchingIngredient({ recipeId, ingredientId, query });
    setCustomSearchQuery(query);
    setSearchLoading(true);
    
    try {
      const response = await fetch(
        `/api/ingredients/search?q=${encodeURIComponent(query)}&zipCode=${zipCode}&limit=8`
      );
      
      const data = await response.json();
      if (data.success) {
        setSearchResults(data.results);
      }
    } catch (error) {
      console.error('Ingredient search failed:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Custom search with user input
  const performCustomSearch = async () => {
    if (!customSearchQuery.trim() || !searchingIngredient) return;
    
    setSearchLoading(true);
    try {
      const response = await fetch(
        `/api/ingredients/search?q=${encodeURIComponent(customSearchQuery)}&zipCode=${zipCode}&limit=8`
      );
      
      const data = await response.json();
      if (data.success) {
        setSearchResults(data.results);
      }
    } catch (error) {
      console.error('Custom search failed:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Substitute ingredient
  const substituteIngredient = (searchResult: SearchResult) => {
    if (!searchingIngredient) return;
    
    setRecipes(prev => prev.map(recipe => {
      if (recipe.id === searchingIngredient.recipeId) {
        const updatedRecipe = {
          ...recipe,
          ingredients: recipe.ingredients.map(ing => {
            if (ing.id === searchingIngredient.ingredientId) {
              return {
                ...ing,
                name: searchResult.cleanName,
                isSubstituted: true,
                userStatus: 'normal' as const,
                krogerPrice: recipe.hasPricing ? {
                  unitPrice: searchResult.price,
                  totalCost: searchResult.price * parseFloat(ing.amount || '1'),
                  confidence: searchResult.confidence,
                  onSale: searchResult.onSale,
                  salePrice: searchResult.salePrice,
                  productName: searchResult.name,
                  size: searchResult.size,
                  brand: searchResult.brand,
                  alternatives: []
                } : undefined
              };
            }
            return ing;
          })
        };
        
        // Recalculate pricing if recipe has pricing
        if (updatedRecipe.hasPricing) {
          return recalculateRecipePricing(updatedRecipe);
        }
        return updatedRecipe;
      }
      return recipe;
    }));
    
    setSearchingIngredient(null);
    setSearchResults([]);
    setCustomSearchQuery('');
  };

  // Mark ingredient status (already have, specialty store, etc.)
  const updateIngredientStatus = (
    recipeId: string, 
    ingredientId: string, 
    status: 'normal' | 'already-have' | 'specialty-store',
    specialtyStore?: string
  ) => {
    setRecipes(prev => prev.map(recipe => {
      if (recipe.id === recipeId) {
        const updatedRecipe = {
          ...recipe,
          ingredients: recipe.ingredients.map(ing => {
            if (ing.id === ingredientId) {
              return {
                ...ing,
                userStatus: status,
                specialtyStore: status === 'specialty-store' ? specialtyStore : undefined
              };
            }
            return ing;
          })
        };
        
        // Recalculate pricing if recipe has pricing
        if (updatedRecipe.hasPricing) {
          return recalculateRecipePricing(updatedRecipe);
        }
        return updatedRecipe;
      }
      return recipe;
    }));
  };

  // Recalculate recipe pricing based on ingredient statuses
  const recalculateRecipePricing = (recipe: Recipe): Recipe => {
    if (!recipe.hasPricing || !recipe.pricing) return recipe;
    
    let totalCost = 0;
    let excludedFromTotal = 0;
    let specialtyStoreCost = 0;
    
    for (const ingredient of recipe.ingredients) {
      const cost = ingredient.krogerPrice?.totalCost || 0;
      
      switch (ingredient.userStatus) {
        case 'already-have':
          excludedFromTotal += cost;
          break;
        case 'specialty-store':
          specialtyStoreCost += cost;
          totalCost += cost; // Still count in total, but track separately
          break;
        default:
          totalCost += cost;
          break;
      }
    }
    
    return {
      ...recipe,
      pricing: {
        ...recipe.pricing,
        totalCost,
        costPerServing: totalCost / recipe.metadata.servings,
        excludedFromTotal,
        specialtyStoreCost
      }
    };
  };

  const cuisineOptions = [
    'mexican', 'italian', 'chinese', 'indian', 'thai', 'japanese', 
    'mediterranean', 'american', 'french', 'korean', 'vietnamese'
  ];

  const dietaryOptions = [
    'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'keto', 
    'paleo', 'low-carb', 'low-sodium'
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Progress Steps */}
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className={`flex items-center space-x-2 ${step === 'configure' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'configure' ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}>1</div>
            <span className="font-medium">Configure</span>
          </div>
          
          <div className={`flex items-center space-x-2 ${step === 'recipes' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'recipes' ? 'bg-blue-600 text-white' : 
              recipes.length > 0 ? 'bg-green-600 text-white' : 'bg-gray-200'
            }`}>2</div>
            <span className="font-medium">Recipes</span>
          </div>
          
          <div className={`flex items-center space-x-2 ${step === 'pricing' ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'pricing' ? 'bg-blue-600 text-white' : 
              recipes.some(r => r.hasPricing) ? 'bg-green-600 text-white' : 'bg-gray-200'
            }`}>3</div>
            <span className="font-medium">Pricing</span>
          </div>
        </div>
      </div>

      {/* Step 1: Configuration */}
      {step === 'configure' && (
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">🍽️ Meal Plan Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Cultural Cuisines</label>
              <select
                multiple
                value={config.culturalCuisines}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  culturalCuisines: Array.from(e.target.selectedOptions, option => option.value)
                }))}
                className="w-full p-2 border border-gray-300 rounded-md"
                size={4}
              >
                {cuisineOptions.map(cuisine => (
                  <option key={cuisine} value={cuisine}>
                    {cuisine.charAt(0).toUpperCase() + cuisine.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Household Size</label>
              <input
                type="number"
                min="1"
                max="12"
                value={config.householdSize}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  householdSize: parseInt(e.target.value) || 4
                }))}
                className="w-full p-2 border border-gray-300 rounded-md mb-4"
              />
              
              <label className="block text-sm font-medium mb-2">Zip Code (for pricing)</label>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="90210"
              />
            </div>
          </div>

          <button
            onClick={generateRecipes}
            disabled={loading}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? '🔄 Finding Recipes...' : '🚀 Generate Recipes (Fast!)'}
          </button>
        </div>
      )}

      {/* Step 2: Recipes Display */}
      {(step === 'recipes' || step === 'pricing') && recipes.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">🍳 Your Recipes</h2>
            {step === 'recipes' && (
              <button
                onClick={addPricing}
                disabled={loading}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? '💰 Getting Prices...' : '💰 Add Kroger Pricing'}
              </button>
            )}
          </div>

          <div className="grid gap-6">
            {recipes.map((recipe) => (
              <div key={recipe.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{recipe.title}</h3>
                    <p className="text-gray-600 text-sm">{recipe.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>🍽️ {recipe.metadata.servings} servings</span>
                      <span>⏱️ {recipe.metadata.totalTime} min</span>
                      <span>🌍 {recipe.cuisine}</span>
                    </div>
                  </div>
                  
                  {recipe.hasPricing && recipe.pricing && (
                    <div className="text-right ml-4">
                      <div className="text-xl font-bold text-green-600">
                        ${recipe.pricing.costPerServing.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">per serving</div>
                      <div className="text-sm text-gray-500">
                        Total: ${recipe.pricing.totalCost.toFixed(2)}
                      </div>
                      {recipe.pricing.excludedFromTotal > 0 && (
                        <div className="text-xs text-blue-600">
                          Saved: ${recipe.pricing.excludedFromTotal.toFixed(2)} (already have)
                        </div>
                      )}
                      {recipe.pricing.specialtyStoreCost > 0 && (
                        <div className="text-xs text-orange-600">
                          Specialty: ${recipe.pricing.specialtyStoreCost.toFixed(2)}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Ingredients */}
                <div>
                  <h4 className="font-medium mb-2">🛒 Ingredients</h4>
                  <div className="grid gap-2">
                    {recipe.ingredients.map((ingredient) => (
                      <div key={ingredient.id} className={`p-3 rounded border ${
                        ingredient.userStatus === 'already-have' ? 'bg-green-50 border-green-200' :
                        ingredient.userStatus === 'specialty-store' ? 'bg-orange-50 border-orange-200' :
                        'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className={`${ingredient.isSubstituted ? 'text-blue-600 font-medium' : ''} ${
                                ingredient.userStatus === 'already-have' ? 'line-through text-gray-500' : ''
                              }`}>
                                {ingredient.amount} {ingredient.name}
                              </span>
                              
                              {ingredient.isSubstituted && (
                                <span className="text-xs text-blue-500 bg-blue-100 px-2 py-1 rounded">substituted</span>
                              )}
                              {ingredient.userStatus === 'already-have' && (
                                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">already have</span>
                              )}
                              {ingredient.userStatus === 'specialty-store' && (
                                <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                                  {ingredient.specialtyStore || 'specialty store'}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex flex-wrap gap-1">
                              <button
                                onClick={() => searchIngredient(recipe.id, ingredient.id, ingredient.name)}
                                className="text-blue-600 hover:text-blue-800 text-xs bg-blue-100 px-2 py-1 rounded"
                              >
                                🔍 Find alternatives
                              </button>
                              
                              {ingredient.userStatus !== 'already-have' && (
                                <button
                                  onClick={() => updateIngredientStatus(recipe.id, ingredient.id, 'already-have')}
                                  className="text-green-600 hover:text-green-800 text-xs bg-green-100 px-2 py-1 rounded"
                                >
                                  ✓ Already have
                                </button>
                              )}
                              
                              {ingredient.userStatus !== 'specialty-store' && (
                                <button
                                  onClick={() => {
                                    const store = prompt('Enter specialty store name (e.g., "Asian market", "Halal store"):');
                                    if (store) {
                                      updateIngredientStatus(recipe.id, ingredient.id, 'specialty-store', store);
                                    }
                                  }}
                                  className="text-orange-600 hover:text-orange-800 text-xs bg-orange-100 px-2 py-1 rounded"
                                >
                                  🏪 Specialty store
                                </button>
                              )}
                              
                              {ingredient.userStatus !== 'normal' && (
                                <button
                                  onClick={() => updateIngredientStatus(recipe.id, ingredient.id, 'normal')}
                                  className="text-gray-600 hover:text-gray-800 text-xs bg-gray-100 px-2 py-1 rounded"
                                >
                                  ↺ Reset
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {ingredient.krogerPrice ? (
                            <div className="text-right ml-4">
                              <span className={`font-medium ${
                                ingredient.userStatus === 'already-have' ? 'line-through text-gray-400' : 'text-green-600'
                              }`}>
                                ${ingredient.krogerPrice.totalCost.toFixed(2)}
                              </span>
                              {ingredient.krogerPrice.onSale && (
                                <span className="ml-2 text-red-600 text-xs">ON SALE!</span>
                              )}
                              <div className="text-xs text-gray-500">
                                @ {ingredient.krogerPrice.storeLocation}
                              </div>
                            </div>
                          ) : step === 'pricing' ? (
                            <span className="text-gray-400 ml-4">Price unavailable</span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ingredient Search Modal */}
      {searchingIngredient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                🔍 Find alternatives for "{searchingIngredient.query}"
              </h3>
              <button
                onClick={() => {
                  setSearchingIngredient(null);
                  setSearchResults([]);
                  setCustomSearchQuery('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Custom Search Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Search for different ingredient:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSearchQuery}
                  onChange={(e) => setCustomSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && performCustomSearch()}
                  placeholder="e.g., organic chicken, ground turkey, tofu..."
                  className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={performCustomSearch}
                  disabled={searchLoading || !customSearchQuery.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Search
                </button>
              </div>
            </div>

            {searchLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Searching Kroger...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults.map((result, index) => (
                  <div
                    key={`${result.id}-${index}`}
                    onClick={() => substituteIngredient(result)}
                    className="flex justify-between items-center p-3 border rounded hover:bg-blue-50 cursor-pointer"
                  >
                    <div>
                      <div className="font-medium">{result.cleanName}</div>
                      <div className="text-sm text-gray-600">
                        {result.brand} • {result.size}
                        {result.isBestMatch && <span className="ml-2 text-blue-600 text-xs">BEST MATCH</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        ${result.price.toFixed(2)}
                      </div>
                      {result.onSale && result.salePrice && (
                        <div className="text-sm text-red-600">
                          Sale: ${result.salePrice.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {searchResults.length === 0 && !searchLoading && (
                  <p className="text-gray-500 text-center py-4">No alternatives found</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">
            {step === 'configure' ? 'Finding recipes...' : 'Getting Kroger prices...'}
          </p>
        </div>
      )}
    </div>
  );
}