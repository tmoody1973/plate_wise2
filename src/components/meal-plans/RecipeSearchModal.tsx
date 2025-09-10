'use client';

import { useState } from 'react';
import { X, Search, Clock, Users, DollarSign } from 'lucide-react';

interface Recipe {
  id: string;
  title: string;
  description: string;
  cookTime: number;
  servings: number;
  costRange: { min: number; max: number };
  cuisine: string;
  difficulty: string;
}

interface RecipeSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecipe: (recipe: Recipe) => void;
  currentRecipeTitle?: string;
}

const mockSearchResults: Recipe[] = [
  {
    id: 'search-1',
    title: 'Chicken Teriyaki',
    description: 'Sweet and savory teriyaki chicken',
    cookTime: 30,
    servings: 4,
    costRange: { min: 14, max: 18 },
    cuisine: 'Japanese',
    difficulty: 'Easy'
  },
  {
    id: 'search-2',
    title: 'Black Bean Burgers',
    description: 'Homemade black bean patties',
    cookTime: 25,
    servings: 4,
    costRange: { min: 9, max: 13 },
    cuisine: 'American',
    difficulty: 'Easy'
  },
  {
    id: 'search-3',
    title: 'Mediterranean Quinoa Bowl',
    description: 'Fresh quinoa with Mediterranean vegetables',
    cookTime: 20,
    servings: 4,
    costRange: { min: 11, max: 15 },
    cuisine: 'Mediterranean',
    difficulty: 'Easy'
  },
  {
    id: 'search-4',
    title: 'Thai Green Curry',
    description: 'Authentic green curry with vegetables',
    cookTime: 35,
    servings: 4,
    costRange: { min: 16, max: 22 },
    cuisine: 'Thai',
    difficulty: 'Medium'
  }
];

export function RecipeSearchModal({ 
  isOpen, 
  onClose, 
  onSelectRecipe, 
  currentRecipeTitle 
}: RecipeSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredRecipes, setFilteredRecipes] = useState(mockSearchResults);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredRecipes(mockSearchResults);
    } else {
      const filtered = mockSearchResults.filter(recipe =>
        recipe.title.toLowerCase().includes(query.toLowerCase()) ||
        recipe.description.toLowerCase().includes(query.toLowerCase()) ||
        recipe.cuisine.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredRecipes(filtered);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Search Recipes</h2>
            <p className="text-sm text-gray-600 mt-1">
              Choose a replacement recipe for your meal plan
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>
        </div>

        {/* Search Results */}
        <div className="overflow-y-auto max-h-96">
          {filteredRecipes.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 text-4xl mb-2">🔍</div>
              <p className="text-gray-600">No recipes found</p>
              <p className="text-gray-500 text-sm">Try adjusting your search terms</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {filteredRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  onClick={() => onSelectRecipe(recipe)}
                  className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 cursor-pointer transition-colors border border-transparent hover:border-gray-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {recipe.title}
                        </h3>
                        <span className="text-lg font-bold text-gray-900">
                          $
                        </span>
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-3">
                        {recipe.description}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{recipe.cookTime} min</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <DollarSign className="w-4 h-4" />
                          <span>${recipe.costRange.min}–${recipe.costRange.max}</span>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <span className="inline-block px-2 py-1 bg-white text-gray-700 text-xs font-medium rounded border">
                          {recipe.cuisine}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? 's' : ''} found
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}