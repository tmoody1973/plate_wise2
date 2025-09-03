'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, ChefHat, Heart, Plus } from 'lucide-react';
import { RecipeSearch } from './RecipeSearch';
import { RecipeCard } from './RecipeCard';
import { recipeService } from '@/lib/recipes';
import { useAuthContext } from '@/contexts/AuthContext';
import type { Recipe } from '@/types';

interface RecipeListProps {
  initialRecipes?: Recipe[];
  showSearch?: boolean;
  showCreateButton?: boolean;
  title?: string;
  emptyMessage?: string;
  onCreateRecipe?: () => void;
  onAddToCollection?: (recipeId: string) => void;
  onRateRecipe?: (recipeId: string) => void;
  className?: string;
  showUserRecipes?: boolean; // New prop to indicate if we should show user's own recipes
}

export function RecipeList({
  initialRecipes = [],
  showSearch = true,
  showCreateButton = false,
  title = 'Recipes',
  emptyMessage = 'No recipes found. Try adjusting your search filters.',
  onCreateRecipe,
  onAddToCollection,
  onRateRecipe,
  className = '',
  showUserRecipes = false,
}: RecipeListProps) {
  const { user } = useAuthContext();
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Load recipes on initial mount if no initial recipes provided
  useEffect(() => {
    if (initialRecipes.length === 0 && !hasSearched) {
      if (showUserRecipes && user?.id) {
        loadUserRecipes();
      } else {
        loadPopularRecipes();
      }
    }
  }, [initialRecipes.length, hasSearched, showUserRecipes, user?.id]);

  const loadPopularRecipes = async () => {
    setLoading(true);
    try {
      const popularRecipes = await recipeService.getPopularRecipes(20);
      setRecipes(popularRecipes);
    } catch (error) {
      console.error('Failed to load popular recipes:', error);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUserRecipes = async () => {
    if (!user?.id) {
      console.warn('No user ID available for loading user recipes');
      setRecipes([]);
      return;
    }

    setLoading(true);
    try {
      console.log('Loading user recipes for user:', user.id);
      const userRecipes = await recipeService.getUserRecipes(user.id, true);
      console.log('Loaded user recipes:', userRecipes);
      setRecipes(userRecipes);
    } catch (error) {
      console.error('Failed to load user recipes:', error);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchResults = (searchResults: Recipe[]) => {
    setRecipes(searchResults);
    setHasSearched(true);
  };

  const handleSearchLoading = (isLoading: boolean) => {
    setLoading(isLoading);
  };

  const handleAddToCollection = async (recipeId: string) => {
    if (onAddToCollection) {
      onAddToCollection(recipeId);
    } else {
      // Default behavior - could show a collection selection modal
      console.log('Add to collection:', recipeId);
    }
  };

  const handleRateRecipe = async (recipeId: string) => {
    if (onRateRecipe) {
      onRateRecipe(recipeId);
    } else {
      // Default behavior - could show a rating modal
      console.log('Rate recipe:', recipeId);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ChefHat className="w-8 h-8 text-orange-600" />
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        </div>
        
        {showCreateButton && onCreateRecipe && (
          <button
            onClick={onCreateRecipe}
            className="inline-flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Recipe
          </button>
        )}
      </div>

      {/* Search */}
      {showSearch && (
        <RecipeSearch
          onResults={handleSearchResults}
          onLoading={handleSearchLoading}
          showExternalToggle={true}
        />
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
          <span className="ml-3 text-gray-600">Searching recipes...</span>
        </div>
      )}

      {/* Recipe Grid */}
      {!loading && recipes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onAddToCollection={handleAddToCollection}
              onRate={handleRateRecipe}
              className="h-full"
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && recipes.length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <ChefHat className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Recipes Found</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {emptyMessage}
          </p>
          
          {showCreateButton && onCreateRecipe && (
            <button
              onClick={onCreateRecipe}
              className="inline-flex items-center px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Recipe
            </button>
          )}
          
          {!hasSearched && !showCreateButton && (
            <button
              onClick={loadPopularRecipes}
              className="inline-flex items-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
            >
              <Heart className="w-5 h-5 mr-2" />
              Browse Popular Recipes
            </button>
          )}
        </div>
      )}

      {/* Results Summary */}
      {!loading && recipes.length > 0 && (
        <div className="text-center text-sm text-gray-600">
          Showing {recipes.length} recipe{recipes.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

export default RecipeList;