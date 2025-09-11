'use client';

import { useState } from 'react';
import { Clock, Users, DollarSign, MoreHorizontal, Pin, Eye } from 'lucide-react';
import { RecipeSearchModal } from './RecipeSearchModal';

interface Recipe {
  id: string;
  title: string;
  description: string;
  image: string;
  cookTime: number;
  servings: number;
  costRange: { min: number; max: number };
  cuisine: string;
  difficulty: string;
}

interface RecipeCardProps {
  recipe: Recipe;
  position: number;
  onRecipeChange?: (newRecipe: Recipe) => void;
}

export function RecipeCard({ recipe, position, onRecipeChange }: RecipeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const handleRecipeSelect = (newRecipe: Recipe) => {
    if (onRecipeChange) {
      onRecipeChange(newRecipe);
    }
    setShowSearchModal(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Recipe Image */}
      <div className="relative h-48 bg-gray-200">
        <div className="absolute top-3 left-3 bg-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold text-gray-700">
          ${recipe.costRange.min}
        </div>
        <div className="absolute top-3 right-3 bg-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold text-gray-700">
          ${recipe.costRange.max}
        </div>
        
        {/* Recipe image */}
        {recipe.image ? (
          <img 
            src={recipe.image} 
            alt={recipe.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
            <span className="text-4xl">🍳</span>
          </div>
        )}
      </div>

      {/* Recipe Content */}
      <div className="p-4 space-y-3">
        {/* Title and Description */}
        <div>
          <h3 className="font-semibold text-gray-900 text-lg mb-1">
            {recipe.title}
          </h3>
          <p className="text-gray-600 text-sm">
            {recipe.description}
          </p>
        </div>

        {/* Recipe Meta */}
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>{recipe.cookTime} min</span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="w-4 h-4" />
            <span>{recipe.servings} servings</span>
          </div>
          <div className="flex items-center space-x-1">
            <DollarSign className="w-4 h-4" />
            <span>${recipe.costRange.min}–${recipe.costRange.max}</span>
          </div>
        </div>

        {/* Cuisine Tag */}
        <div>
          <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
            {recipe.cuisine}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setShowSearchModal(true)}
              className="flex items-center space-x-1 px-3 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors"
            >
              <MoreHorizontal className="w-3 h-3" />
              <span>Swap Recipe</span>
            </button>
            <button className="flex items-center space-x-1 px-3 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors">
              <DollarSign className="w-3 h-3" />
              <span>Cheaper Option</span>
            </button>
            <button className="flex items-center space-x-1 px-3 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded transition-colors">
              <Pin className="w-3 h-3" />
              <span>Pin</span>
            </button>
          </div>
          
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1 px-3 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
          >
            <Eye className="w-3 h-3" />
            <span>Details</span>
          </button>
        </div>

        {/* Expandable Details Section */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Ingredients</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 1 lb chicken breast, sliced</li>
                <li>• 2 cups mixed vegetables</li>
                <li>• 2 tbsp soy sauce</li>
                <li>• 1 tbsp vegetable oil</li>
                <li>• 2 cloves garlic, minced</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Instructions</h4>
              <ol className="text-sm text-gray-600 space-y-1">
                <li>1. Heat oil in a large pan over medium-high heat</li>
                <li>2. Add chicken and cook until golden brown</li>
                <li>3. Add vegetables and garlic, stir-fry for 3-4 minutes</li>
                <li>4. Add soy sauce and cook for 1 more minute</li>
                <li>5. Serve hot over rice</li>
              </ol>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Difficulty: {recipe.difficulty}</span>
              <span className="text-green-600 font-medium">Cultural Authenticity: High</span>
            </div>
          </div>
        )}
      </div>

      {/* Recipe Search Modal */}
      <RecipeSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelectRecipe={handleRecipeSelect}
        currentRecipeTitle={recipe.title}
      />
    </div>
  );
}