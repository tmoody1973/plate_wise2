'use client';

import { useState, useEffect } from 'react';
import { ExpandableRecipeCard } from './ExpandableRecipeCard';

interface RecipeGridProps {
  numberOfMeals: number;
  recipes?: any[];
  isLoading?: boolean;
}

export function RecipeGrid({ numberOfMeals, recipes: providedRecipes = [], isLoading = false }: RecipeGridProps) {
  const [recipes, setRecipes] = useState(providedRecipes);

  // Update recipes when new ones are provided
  useEffect(() => {
    if (providedRecipes.length > 0) {
      setRecipes(providedRecipes);
    }
  }, [providedRecipes]);

  const handleRecipeChange = (index: number, newRecipe: any) => {
    const updatedRecipes = [...recipes];
    updatedRecipes[index] = newRecipe;
    setRecipes(updatedRecipes);
  };

  // Transform Perplexity recipe format to component format
  const transformRecipe = (recipe: any) => ({
    id: recipe.id || `recipe-${Math.random()}`,
    title: recipe.title,
    description: recipe.description,
    image: recipe.imageUrl || '/api/placeholder/300/200',
    cookTime: recipe.metadata?.totalTimeMinutes || 30,
    servings: recipe.metadata?.servings || 4,
    costRange: { 
      min: Math.round(recipe.metadata?.estimatedCost * 0.9) || 10, 
      max: Math.round(recipe.metadata?.estimatedCost * 1.1) || 15 
    },
    cuisine: recipe.cuisine,
    difficulty: recipe.metadata?.difficulty || 'Easy',
    ingredients: recipe.ingredients || [],
    instructions: recipe.instructions || [],
    culturalAuthenticity: recipe.culturalAuthenticity || 'medium',
    sourceUrl: recipe.sourceUrl,
    imageUrl: recipe.imageUrl
  });

  return (
    <div className="space-y-6">
      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-flex items-center space-x-2 text-blue-600">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-lg font-medium">Generating your personalized meal plan...</span>
          </div>
          <p className="text-gray-600 mt-2">Using AI to find culturally authentic recipes within your budget</p>
        </div>
      )}

      {!isLoading && (
        <>
          {/* Recipe grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recipes.slice(0, numberOfMeals).map((recipe, index) => (
              <ExpandableRecipeCard
                key={recipe.id}
                recipe={transformRecipe(recipe)}
                position={index + 1}
                onRecipeChange={(newRecipe) => handleRecipeChange(index, newRecipe)}
              />
            ))}
          </div>

          {/* Add more recipes if needed */}
          {numberOfMeals > recipes.length && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: numberOfMeals - recipes.length }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                >
                  <div className="text-gray-400 text-4xl mb-2">+</div>
                  <p className="text-gray-600 font-medium">Add Recipe</p>
                  <p className="text-gray-500 text-sm">Click to generate more recipes</p>
                </div>
              ))}
            </div>
          )}

          {/* Empty state when no recipes */}
          {recipes.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🍽️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to Create Your Meal Plan?</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Click "Generate Meal Plan" to get personalized, budget-friendly recipes that honor your cultural preferences.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto text-sm">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-blue-600 text-2xl mb-2">🤖</div>
                  <div className="font-medium text-blue-900">AI-Powered</div>
                  <div className="text-blue-700">Personalized recipe suggestions</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-green-600 text-2xl mb-2">💰</div>
                  <div className="font-medium text-green-900">Budget-Optimized</div>
                  <div className="text-green-700">Stay within your weekly budget</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="text-orange-600 text-2xl mb-2">🌍</div>
                  <div className="font-medium text-orange-900">Culturally Authentic</div>
                  <div className="text-orange-700">Honor your food traditions</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}