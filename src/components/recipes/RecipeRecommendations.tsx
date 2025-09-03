'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, Heart, Clock, Users, RefreshCw, ChevronRight } from 'lucide-react';
import { RecipeCard } from './RecipeCard';
import { recipeRecommendationsService } from '@/lib/recipes/recipe-recommendations-service';
import type { Recipe, UserProfile } from '@/types';
import type { RecipeRecommendation } from '@/lib/recipes/recipe-recommendations-service';

interface RecipeRecommendationsProps {
  userProfile?: UserProfile;
  currentRecipeId?: string;
  onRecipeSelect?: (recipe: Recipe) => void;
  className?: string;
}

type RecommendationType = 'personalized' | 'trending' | 'similar' | 'favorites';

export function RecipeRecommendations({ 
  userProfile, 
  currentRecipeId, 
  onRecipeSelect,
  className = '' 
}: RecipeRecommendationsProps) {
  const [activeType, setActiveType] = useState<RecommendationType>('personalized');
  const [recommendations, setRecommendations] = useState<RecipeRecommendation[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecommendations();
  }, [activeType, userProfile, currentRecipeId]);

  const loadRecommendations = async () => {
    setLoading(true);
    setError(null);

    try {
      switch (activeType) {
        case 'personalized':
          await loadPersonalizedRecommendations();
          break;
        case 'trending':
          await loadTrendingRecipes();
          break;
        case 'similar':
          await loadSimilarRecipes();
          break;
        case 'favorites':
          await loadFavoriteRecipes();
          break;
      }
    } catch (error) {
      console.error('Failed to load recommendations:', error);
      setError('Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const loadPersonalizedRecommendations = async () => {
    if (!userProfile) {
      setRecommendations([]);
      return;
    }

    const recs = await recipeRecommendationsService.getRecommendations({
      userId: userProfile.id,
      userProfile,
      excludeRecipeIds: currentRecipeId ? [currentRecipeId] : [],
      limit: 12,
      includeExternal: true,
    });

    setRecommendations(recs);
  };

  const loadTrendingRecipes = async () => {
    const trendingRecipes = await recipeRecommendationsService.getTrendingRecipes(12);
    setRecipes(trendingRecipes);
    setRecommendations([]);
  };

  const loadSimilarRecipes = async () => {
    if (!currentRecipeId) {
      setRecipes([]);
      return;
    }

    const similarRecipes = await recipeRecommendationsService.getSimilarRecipes(
      currentRecipeId,
      userProfile,
      12
    );
    setRecipes(similarRecipes);
    setRecommendations([]);
  };

  const loadFavoriteRecipes = async () => {
    if (!userProfile) {
      setRecipes([]);
      return;
    }

    const favoriteRecipes = await recipeRecommendationsService.getFavoriteRecipes(userProfile.id);
    setRecipes(favoriteRecipes);
    setRecommendations([]);
  };

  const handleRefresh = () => {
    loadRecommendations();
  };

  const handleRecipeClick = (recipe: Recipe) => {
    if (onRecipeSelect) {
      onRecipeSelect(recipe);
    }
  };

  const getDisplayRecipes = (): Recipe[] => {
    if (recommendations.length > 0) {
      return recommendations.map(rec => rec.recipe);
    }
    return recipes;
  };

  const getRecommendationInfo = (recipe: Recipe) => {
    const recommendation = recommendations.find(rec => rec.recipe.id === recipe.id);
    return recommendation;
  };

  const recommendationTypes = [
    {
      id: 'personalized' as const,
      label: 'For You',
      icon: Sparkles,
      description: 'Personalized recommendations based on your preferences',
      requiresProfile: true,
    },
    {
      id: 'trending' as const,
      label: 'Trending',
      icon: TrendingUp,
      description: 'Popular recipes in the community',
      requiresProfile: false,
    },
    {
      id: 'similar' as const,
      label: 'Similar',
      icon: RefreshCw,
      description: 'Recipes similar to the current one',
      requiresProfile: false,
      requiresCurrentRecipe: true,
    },
    {
      id: 'favorites' as const,
      label: 'Favorites',
      icon: Heart,
      description: 'Your saved favorite recipes',
      requiresProfile: true,
    },
  ];

  const availableTypes = recommendationTypes.filter(type => {
    if (type.requiresProfile && !userProfile) return false;
    if (type.requiresCurrentRecipe && !currentRecipeId) return false;
    return true;
  });

  const displayRecipes = getDisplayRecipes();

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Recipe Recommendations</h2>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Type Selector */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {availableTypes.map(type => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setActiveType(type.id)}
                className={`flex-1 flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeType === type.id
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {type.label}
              </button>
            );
          })}
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mt-2">
          {availableTypes.find(type => type.id === activeType)?.description}
        </p>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            <span className="ml-3 text-gray-600">Loading recommendations...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">⚠️</div>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && displayRecipes.length === 0 && (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Recommendations</h3>
            <p className="text-gray-600 mb-4">
              {activeType === 'personalized' && !userProfile
                ? 'Complete your profile to get personalized recommendations'
                : activeType === 'similar' && !currentRecipeId
                ? 'View a recipe to see similar recommendations'
                : 'No recipes found for this category'}
            </p>
          </div>
        )}

        {!loading && !error && displayRecipes.length > 0 && (
          <div className="space-y-6">
            {/* Recipe Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayRecipes.slice(0, 6).map(recipe => {
                const recInfo = getRecommendationInfo(recipe);
                return (
                  <div 
                    key={recipe.id} 
                    className="relative cursor-pointer"
                    onClick={() => handleRecipeClick(recipe)}
                  >
                    <RecipeCard
                      recipe={recipe}
                      onAddToCollection={() => {}} // TODO: Implement
                      onRate={() => {}} // TODO: Implement
                      className="h-full"
                    />
                    
                    {/* Recommendation Info Overlay */}
                    {recInfo && activeType === 'personalized' && (
                      <div className="absolute top-3 right-3 bg-orange-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                        {Math.round(recInfo.score)}% match
                      </div>
                    )}
                    
                    {/* Recommendation Reasons */}
                    {recInfo && recInfo.reasons.length > 0 && (
                      <div className="absolute bottom-3 left-3 right-3">
                        <div className="bg-black bg-opacity-75 text-white text-xs p-2 rounded-lg">
                          <div className="font-medium mb-1">Why this recipe:</div>
                          <div>{recInfo.reasons[0]}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Show More Button */}
            {displayRecipes.length > 6 && (
              <div className="text-center">
                <button className="inline-flex items-center px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors">
                  View More Recipes
                  <ChevronRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            )}

            {/* Recommendation Stats for Personalized */}
            {activeType === 'personalized' && recommendations.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Recommendation Insights</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-orange-600">
                      {Math.round(recommendations.reduce((sum, rec) => sum + rec.matchFactors.culturalMatch, 0) / recommendations.length * 100)}%
                    </div>
                    <div className="text-sm text-gray-600">Cultural Match</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round(recommendations.reduce((sum, rec) => sum + rec.matchFactors.budgetMatch, 0) / recommendations.length * 100)}%
                    </div>
                    <div className="text-sm text-gray-600">Budget Match</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.round(recommendations.reduce((sum, rec) => sum + rec.matchFactors.difficultyMatch, 0) / recommendations.length * 100)}%
                    </div>
                    <div className="text-sm text-gray-600">Skill Match</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.round(recommendations.reduce((sum, rec) => sum + rec.matchFactors.timeMatch, 0) / recommendations.length * 100)}%
                    </div>
                    <div className="text-sm text-gray-600">Time Match</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default RecipeRecommendations;