'use client';

import { useState } from 'react';

interface Recipe {
  title: string;
  description: string;
  sourceUrl: string;
  imageUrl?: string;
  totalTimeMinutes: number;
  servings: number;
  ingredients: Array<{ name: string; amount: number; unit: string }>;
  instructions: Array<{ step: number; text: string }>;
}

export default function TestTwoStagePerplexity() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testSearch = async () => {
    setLoading(true);
    setError(null);
    setRecipes([]);

    try {
      const response = await fetch('/api/test-two-stage-perplexity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          culturalCuisines: ['mexican'],
          dietaryRestrictions: ['vegan'],
          maxResults: 3
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API request failed');
      }

      const data = await response.json();
      setRecipes(data.data.recipes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const validateUrl = async (url: string) => {
    try {
      const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
      return response.ok;
    } catch {
      return false;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Test Two-Stage Perplexity Recipe Search</h1>
      
      <div className="mb-6">
        <p className="text-gray-600 mb-4">
          This tests the two-stage approach: Stage 1 finds URLs, Stage 2 parses each URL.
        </p>
        <button
          onClick={testSearch}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg"
        >
          {loading ? 'Searching...' : 'Test Search (Mexican Vegan Recipes)'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {recipes.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Results ({recipes.length} recipes)</h2>
          
          {recipes.map((recipe, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-gray-900">{recipe.title}</h3>
                <div className="text-sm text-gray-500">
                  {recipe.totalTimeMinutes} min • {recipe.servings} servings
                </div>
              </div>

              <p className="text-gray-700 mb-4">{recipe.description}</p>

              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <strong>Source URL:</strong>
                  <a 
                    href={recipe.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline break-all"
                  >
                    {recipe.sourceUrl}
                  </a>
                </div>
                
                {/* URL Validation */}
                <div className="text-sm">
                  <span className="font-medium">URL Type: </span>
                  {recipe.sourceUrl.includes('/search/') || 
                   recipe.sourceUrl.includes('/collection/') || 
                   recipe.sourceUrl.includes('/category/') ? (
                    <span className="text-red-600">❌ Collection/Search Page</span>
                  ) : (
                    <span className="text-green-600">✅ Individual Recipe Page</span>
                  )}
                </div>
              </div>

              {recipe.imageUrl && (
                <div className="mb-4">
                  <img 
                    src={recipe.imageUrl} 
                    alt={recipe.title}
                    className="w-full max-w-md h-48 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Ingredients ({recipe.ingredients.length})</h4>
                  <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
                    {recipe.ingredients.slice(0, 10).map((ingredient, i) => (
                      <li key={i} className="text-gray-700">• {ingredient.name}</li>
                    ))}
                    {recipe.ingredients.length > 10 && (
                      <li className="text-gray-500 italic">... and {recipe.ingredients.length - 10} more</li>
                    )}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Instructions ({recipe.instructions.length})</h4>
                  <ol className="text-sm space-y-1 max-h-40 overflow-y-auto">
                    {recipe.instructions.slice(0, 5).map((instruction, i) => (
                      <li key={i} className="text-gray-700">
                        {instruction.step}. {instruction.text}
                      </li>
                    ))}
                    {recipe.instructions.length > 5 && (
                      <li className="text-gray-500 italic">... and {recipe.instructions.length - 5} more steps</li>
                    )}
                  </ol>
                </div>
              </div>
            </div>
          ))}

          {/* Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Summary</h3>
            <div className="text-sm space-y-1">
              <div>Total Recipes: {recipes.length}</div>
              <div>
                Individual Recipe Pages: {recipes.filter(r => 
                  !r.sourceUrl.includes('/search/') && 
                  !r.sourceUrl.includes('/collection/') &&
                  !r.sourceUrl.includes('/category/')
                ).length}
              </div>
              <div>
                Collection/Search Pages: {recipes.filter(r => 
                  r.sourceUrl.includes('/search/') || 
                  r.sourceUrl.includes('/collection/') ||
                  r.sourceUrl.includes('/category/')
                ).length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}