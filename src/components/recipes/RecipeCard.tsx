'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Clock, Users, Star, DollarSign, Globe } from 'lucide-react';
import { createUniqueRecipeSlug } from '@/lib/utils/slug';
import type { Recipe } from '@/types';

interface RecipeCardProps {
  recipe: Recipe;
  showActions?: boolean;
  onAddToCollection?: (recipeId: string) => void;
  onRate?: (recipeId: string) => void;
  className?: string;
}

export function RecipeCard({ 
  recipe, 
  showActions = true, 
  onAddToCollection, 
  onRate,
  className = '' 
}: RecipeCardProps) {
  const averageRating = recipe.ratings.length > 0 
    ? recipe.ratings.reduce((sum, r) => sum + r.rating, 0) / recipe.ratings.length 
    : 0;

  const costPerServing = recipe.costAnalysis?.costPerServing || 0;
  
  const culturalOriginDisplay = recipe.culturalOrigin.length > 0 
    ? recipe.culturalOrigin.join(', ') 
    : recipe.cuisine;

  return (
    <div className={`bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-105 ${className}`}>
      {/* Recipe Image */}
      <div className="relative h-48 bg-gradient-to-br from-orange-400 to-red-500">
        {recipe.metadata?.imageUrl ? (
          <img
            src={`/api/image?url=${encodeURIComponent(recipe.metadata.imageUrl)}`}
            alt={recipe.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white text-6xl opacity-20">
            🍽️
          </div>
        )}
        
        {/* Cultural Origin Badge */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white bg-opacity-90 text-gray-800">
            <Globe className="w-3 h-3 mr-1" />
            {culturalOriginDisplay}
          </span>
        </div>

        {/* Source Badge */}
        <div className="absolute top-3 right-3">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            recipe.source === 'user' 
              ? 'bg-green-100 text-green-800' 
              : recipe.source === 'community'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {recipe.source === 'user' ? 'My Recipe' : 
             recipe.source === 'community' ? 'Community' : 'External'}
          </span>
        </div>
      </div>

      {/* Recipe Content */}
      <div className="p-6">
        {/* Title and Description */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
            {recipe.title}
          </h3>
          {recipe.description && (
            <p className="text-gray-600 text-sm line-clamp-2">
              {recipe.description}
            </p>
          )}
        </div>

        {/* Recipe Metadata */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="w-4 h-4 mr-2" />
            <span>{recipe.metadata.totalTime}min</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Users className="w-4 h-4 mr-2" />
            <span>{recipe.metadata.servings} servings</span>
          </div>
          {averageRating > 0 && (
            <div className="flex items-center text-sm text-gray-600">
              <Star className="w-4 h-4 mr-2 fill-yellow-400 text-yellow-400" />
              <span>{averageRating.toFixed(1)} ({recipe.ratings.length})</span>
            </div>
          )}
          {costPerServing > 0 && (
            <div className="flex items-center text-sm text-gray-600">
              <DollarSign className="w-4 h-4 mr-2" />
              <span>${costPerServing.toFixed(2)}/serving</span>
            </div>
          )}
        </div>

        {/* Difficulty and Cultural Authenticity */}
        <div className="flex items-center justify-between mb-4">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            recipe.metadata.difficulty === 'easy' 
              ? 'bg-green-100 text-green-800'
              : recipe.metadata.difficulty === 'medium'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {recipe.metadata.difficulty.charAt(0).toUpperCase() + recipe.metadata.difficulty.slice(1)}
          </span>
          
          {recipe.metadata.culturalAuthenticity > 0 && (
            <div className="flex items-center text-sm text-gray-600">
              <span className="mr-1">Authenticity:</span>
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${
                      i < Math.round(recipe.metadata.culturalAuthenticity / 2)
                        ? 'fill-orange-400 text-orange-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tags */}
        {recipe.tags.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {recipe.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700"
                >
                  {tag}
                </span>
              ))}
              {recipe.tags.length > 3 && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">
                  +{recipe.tags.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <Link
              href={`/recipes/${createUniqueRecipeSlug(recipe.title, recipe.id)}`}
              className="text-orange-600 hover:text-orange-700 font-medium text-sm transition-colors"
            >
              View Recipe
            </Link>
            
            <div className="flex items-center space-x-2">
              {onAddToCollection && (
                <button
                  onClick={() => onAddToCollection(recipe.id)}
                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                >
                  Save
                </button>
              )}
              {onRate && (
                <button
                  onClick={() => onRate(recipe.id)}
                  className="px-3 py-1 text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-md transition-colors"
                >
                  Rate
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RecipeCard;
