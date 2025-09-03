'use client';

import React, { useState, useCallback } from 'react';
import { Search, Plus, X, Loader2, ExternalLink } from 'lucide-react';
import { spoonacularService, type SpoonacularRecipe, type RecipeSearchParams } from '@/lib/external-apis/spoonacular-service';

interface SpoonacularSearchProps {
  onRecipeSelect?: (recipe: SpoonacularRecipe) => void;
  className?: string;
}

interface SearchState {
  query: string;
  ingredients: string[];
  cuisine: string;
  diet: string;
  maxReadyTime: number | undefined;
  results: SpoonacularRecipe[];
  loading: boolean;
  error: string | null;
}

export function SpoonacularSearch({ onRecipeSelect, className = '' }: SpoonacularSearchProps) {
  const [state, setState] = useState<SearchState>({
    query: '',
    ingredients: [],
    cuisine: '',
    diet: '',
    maxReadyTime: undefined,
    results: [],
    loading: false,
    error: null,
  });

  const [currentIngredient, setCurrentIngredient] = useState('');

  const updateState = useCallback((updates: Partial<SearchState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const addIngredient = useCallback(() => {
    if (currentIngredient.trim() && !state.ingredients.includes(currentIngredient.trim())) {
      updateState({
        ingredients: [...state.ingredients, currentIngredient.trim()]
      });
      setCurrentIngredient('');
    }
  }, [currentIngredient, state.ingredients, updateState]);

  const removeIngredient = useCallback((ingredient: string) => {
    updateState({
      ingredients: state.ingredients.filter(ing => ing !== ingredient)
    });
  }, [state.ingredients, updateState]);

  const performSearch = useCallback(async () => {
    if (!state.query.trim() && state.ingredients.length === 0) {
      updateState({ error: 'Please enter a search query or add ingredients' });
      return;
    }

    updateState({ loading: true, error: null });

    try {
      const searchParams: RecipeSearchParams = {
        query: state.query.trim() || undefined,
        cuisine: state.cuisine || undefined,
        diet: state.diet || undefined,
        maxReadyTime: state.maxReadyTime,
        includeIngredients: state.ingredients.length > 0 ? state.ingredients.join(',') : undefined,
        number: 12,
        addRecipeInformation: true,
        fillIngredients: true,
        instructionsRequired: true,
      };

      // Use ingredient search if ingredients are specified, otherwise use complex search
      let results: SpoonacularRecipe[];
      if (state.ingredients.length > 0 && !state.query.trim()) {
        results = await spoonacularService.searchByIngredients(state.ingredients, 12, 1, true);
      } else {
        const searchResult = await spoonacularService.searchRecipes(searchParams);
        results = searchResult.results;
      }

      updateState({ results, loading: false });
    } catch (error) {
      console.error('Search failed:', error);
      updateState({ 
        error: error instanceof Error ? error.message : 'Search failed',
        loading: false 
      });
    }
  }, [state.query, state.ingredients, state.cuisine, state.diet, state.maxReadyTime, updateState]);

  const handleKeyPress = (e: React.KeyboardEvent, action: 'search' | 'ingredient') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (action === 'search') {
        performSearch();
      } else if (action === 'ingredient') {
        addIngredient();
      }
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Search Spoonacular Recipes
        </h3>
        
        {/* Main Search */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for recipes (e.g., 'pasta carbonara', 'vegan dessert')..."
              value={state.query}
              onChange={(e) => updateState({ query: e.target.value })}
              onKeyPress={(e) => handleKeyPress(e, 'search')}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Ingredient Search */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search by Ingredients
            </label>
            <div className="flex space-x-2 mb-3">
              <input
                type="text"
                placeholder="Add ingredient (e.g., 'chicken', 'tomato')..."
                value={currentIngredient}
                onChange={(e) => setCurrentIngredient(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, 'ingredient')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addIngredient}
                disabled={!currentIngredient.trim()}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white rounded-md transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Ingredient Tags */}
            {state.ingredients.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {state.ingredients.map((ingredient) => (
                  <span
                    key={ingredient}
                    className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm"
                  >
                    {ingredient}
                    <button
                      type="button"
                      onClick={() => removeIngredient(ingredient)}
                      className="ml-2 text-orange-600 hover:text-orange-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cuisine
              </label>
              <select
                value={state.cuisine}
                onChange={(e) => updateState({ cuisine: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Any cuisine</option>
                <option value="italian">Italian</option>
                <option value="mexican">Mexican</option>
                <option value="chinese">Chinese</option>
                <option value="indian">Indian</option>
                <option value="japanese">Japanese</option>
                <option value="thai">Thai</option>
                <option value="french">French</option>
                <option value="mediterranean">Mediterranean</option>
                <option value="american">American</option>
                <option value="korean">Korean</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Diet
              </label>
              <select
                value={state.diet}
                onChange={(e) => updateState({ diet: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Any diet</option>
                <option value="vegetarian">Vegetarian</option>
                <option value="vegan">Vegan</option>
                <option value="gluten free">Gluten Free</option>
                <option value="ketogenic">Keto</option>
                <option value="paleo">Paleo</option>
                <option value="whole30">Whole30</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Cook Time
              </label>
              <select
                value={state.maxReadyTime || ''}
                onChange={(e) => updateState({ 
                  maxReadyTime: e.target.value ? parseInt(e.target.value) : undefined 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="">Any time</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
              </select>
            </div>
          </div>

          {/* Search Button */}
          <button
            onClick={performSearch}
            disabled={state.loading || (!state.query.trim() && state.ingredients.length === 0)}
            className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
          >
            {state.loading ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Search className="w-5 h-5 mr-2" />
            )}
            {state.loading ? 'Searching...' : 'Search Recipes'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{state.error}</p>
        </div>
      )}

      {/* Results */}
      <div className="space-y-4">
        {state.results.length > 0 && (
          <h4 className="text-lg font-semibold text-gray-900">
            Found {state.results.length} recipes
          </h4>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {state.results.map((recipe, index) => (
            <div
              key={`recipe-${recipe.id}-${index}`}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onRecipeSelect?.(recipe)}
            >
              {recipe.image && (
                <div className="aspect-w-16 aspect-h-12">
                  <img
                    src={recipe.image}
                    alt={recipe.title}
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}
              <div className="p-4">
                <h5 className="font-semibold text-gray-900 mb-2 truncate">
                  {recipe.title}
                </h5>
                <p className="text-sm text-gray-600 mb-3 overflow-hidden" style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical' as const,
                  lineClamp: 3
                }}>
                  {recipe.summary}
                </p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{recipe.readyInMinutes} min</span>
                  <span>{recipe.servings} servings</span>
                  {recipe.healthScore && (
                    <span>Health: {recipe.healthScore}/100</span>
                  )}
                </div>
                {recipe.cuisines.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {recipe.cuisines.slice(0, 2).map((cuisine) => (
                      <span
                        key={cuisine}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                      >
                        {cuisine}
                      </span>
                    ))}
                  </div>
                )}
                {recipe.sourceUrl && (
                  <a
                    href={recipe.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-orange-600 hover:text-orange-700 text-sm mt-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    View Original
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {!state.loading && state.results.length === 0 && (state.query || state.ingredients.length > 0) && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No recipes found</h3>
          <p className="text-gray-600">
            Try adjusting your search terms, ingredients, or filters.
          </p>
        </div>
      )}
    </div>
  );
}

export default SpoonacularSearch;