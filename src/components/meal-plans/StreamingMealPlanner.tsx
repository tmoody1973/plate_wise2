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
  }>;
  instructions: string[];
  metadata: {
    servings: number;
    totalTime: number;
    estimatedTime: number;
  };
  imageUrl?: string;
  sourceUrl?: string;
  hasPricing: boolean;
}

interface StreamEvent {
  event: string;
  data: any;
}

export default function StreamingMealPlanner() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [config, setConfig] = useState({
    culturalCuisines: ['mexican'],
    householdSize: 4,
    dietaryRestrictions: [] as string[]
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div>Loading...</div>;
  }

  const startStreaming = async () => {
    setIsStreaming(true);
    setRecipes([]);
    setStatus('Connecting...');
    setProgress({ current: 0, total: 0 });

    try {
      const response = await fetch('/api/meal-plans/recipes-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('event:')) {
            const event = line.substring(6).trim();
            continue;
          }
          
          if (line.startsWith('data:')) {
            try {
              const data = JSON.parse(line.substring(5).trim());
              handleStreamEvent(data);
            } catch (error) {
              console.error('Failed to parse SSE data:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleStreamEvent = (data: any) => {
    // Handle different event types based on the data structure
    if (data.recipe) {
      // New recipe received
      setRecipes(prev => [...prev, data.recipe]);
      setStatus(data.message || `Received recipe: ${data.recipe.title}`);
      setProgress({ current: data.index || 0, total: data.total || 0 });
    } else if (data.current !== undefined && data.total !== undefined) {
      // Progress update
      setProgress({ current: data.current, total: data.total });
      setStatus(data.message || `Processing ${data.current}/${data.total}...`);
    } else if (data.message) {
      // Status update
      setStatus(data.message);
      if (data.step && data.total) {
        setProgress({ current: data.step, total: data.total });
      }
    }
  };

  const cuisineOptions = [
    'mexican', 'italian', 'chinese', 'indian', 'thai', 'japanese', 
    'mediterranean', 'american', 'french', 'korean', 'vietnamese'
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Configuration */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">🚀 Streaming Meal Planner</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
              disabled={isStreaming}
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
              className="w-full p-2 border border-gray-300 rounded-md"
              disabled={isStreaming}
            />
          </div>
        </div>

        <button
          onClick={startStreaming}
          disabled={isStreaming}
          className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
        >
          {isStreaming ? '🔄 Streaming Recipes...' : '🚀 Start Streaming Recipes'}
        </button>
      </div>

      {/* Status and Progress */}
      {(isStreaming || status) && (
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">📡 Live Status</h3>
            {isStreaming && (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                <span className="text-sm text-gray-600">Streaming...</span>
              </div>
            )}
          </div>
          
          <div className="mb-4">
            <p className="text-gray-700">{status}</p>
          </div>

          {progress.total > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progress</span>
                <span>{progress.current}/{progress.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Streaming Recipes */}
      {recipes.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">🍳 Recipes ({recipes.length})</h3>
            <div className="text-sm text-gray-500">
              {isStreaming ? 'Receiving recipes...' : 'Stream complete'}
            </div>
          </div>

          <div className="grid gap-6">
            {recipes.map((recipe, index) => (
              <div 
                key={recipe.id} 
                className={`border rounded-lg p-4 transition-all duration-500 ${
                  index === recipes.length - 1 && isStreaming 
                    ? 'border-purple-300 bg-purple-50 animate-pulse' 
                    : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg">{recipe.title}</h4>
                    <p className="text-gray-600 text-sm">{recipe.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>🍽️ {recipe.metadata.servings} servings</span>
                      <span>⏱️ {recipe.metadata.totalTime} min</span>
                      <span>🌍 {recipe.cuisine}</span>
                    </div>
                  </div>
                  
                  {recipe.imageUrl && (
                    <img 
                      src={recipe.imageUrl} 
                      alt={recipe.title}
                      className="w-20 h-20 object-cover rounded-lg ml-4"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                </div>

                {/* Ingredients Preview */}
                <div>
                  <h5 className="font-medium mb-2">🛒 Ingredients ({recipe.ingredients.length})</h5>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {recipe.ingredients.slice(0, 6).map((ingredient) => (
                      <div key={ingredient.id} className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded">
                        {ingredient.name}
                      </div>
                    ))}
                    {recipe.ingredients.length > 6 && (
                      <div className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        +{recipe.ingredients.length - 6} more
                      </div>
                    )}
                  </div>
                </div>

                {/* Instructions Preview */}
                {recipe.instructions.length > 0 && (
                  <div className="mt-3">
                    <h5 className="font-medium mb-2">👨‍🍳 Instructions</h5>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {recipe.instructions[0]}
                      {recipe.instructions.length > 1 && ` ... (${recipe.instructions.length} steps total)`}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}