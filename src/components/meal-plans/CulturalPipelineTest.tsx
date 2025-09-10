'use client';

import { useState } from 'react';

interface TestScenario {
  name: string;
  culturalCuisines: string[];
  dietaryRestrictions: string[];
  budgetLimit: number;
  householdSize: number;
  timeFrame: string;
  description: string;
}

const TEST_SCENARIOS: TestScenario[] = [
  {
    name: "West African Family",
    culturalCuisines: ["west african", "nigerian", "ghanaian"],
    dietaryRestrictions: [],
    budgetLimit: 60,
    householdSize: 4,
    timeFrame: "week",
    description: "Traditional West African dishes for a family of 4"
  },
  {
    name: "Caribbean Vegetarian",
    culturalCuisines: ["caribbean", "jamaican", "trinidadian"],
    dietaryRestrictions: ["vegetarian"],
    budgetLimit: 45,
    householdSize: 2,
    timeFrame: "week",
    description: "Plant-based Caribbean cuisine for couples"
  },
  {
    name: "South Asian Vegan",
    culturalCuisines: ["indian", "pakistani", "bangladeshi"],
    dietaryRestrictions: ["vegan"],
    budgetLimit: 40,
    householdSize: 3,
    timeFrame: "week",
    description: "Authentic South Asian vegan meals"
  },
  {
    name: "Middle Eastern Halal",
    culturalCuisines: ["middle eastern", "lebanese", "moroccan"],
    dietaryRestrictions: ["halal"],
    budgetLimit: 55,
    householdSize: 2,
    timeFrame: "week",
    description: "Traditional Middle Eastern halal cuisine"
  },
  {
    name: "East Asian Gluten-Free",
    culturalCuisines: ["chinese", "japanese", "korean"],
    dietaryRestrictions: ["gluten-free"],
    budgetLimit: 50,
    householdSize: 2,
    timeFrame: "week",
    description: "Gluten-free East Asian dishes"
  },
  {
    name: "Latin American Budget",
    culturalCuisines: ["mexican", "peruvian", "colombian"],
    dietaryRestrictions: [],
    budgetLimit: 35,
    householdSize: 3,
    timeFrame: "week",
    description: "Budget-friendly Latin American meals"
  },
  {
    name: "Mediterranean Keto",
    culturalCuisines: ["mediterranean", "greek", "italian"],
    dietaryRestrictions: ["keto"],
    budgetLimit: 65,
    householdSize: 2,
    timeFrame: "week",
    description: "Low-carb Mediterranean cuisine"
  },
  {
    name: "Ethiopian Traditional",
    culturalCuisines: ["ethiopian", "east african"],
    dietaryRestrictions: [],
    budgetLimit: 45,
    householdSize: 4,
    timeFrame: "week",
    description: "Authentic Ethiopian family meals"
  }
];

export default function CulturalPipelineTest() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{[key: string]: any}>({});
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

  const testScenario = async (scenario: TestScenario) => {
    const scenarioKey = scenario.name;
    setLoading(true);
    setErrors(prev => ({ ...prev, [scenarioKey]: '' }));
    setResults(prev => ({ ...prev, [scenarioKey]: null }));
    setSelectedScenario(scenarioKey);

    try {
      const response = await fetch('/api/meal-plans/test-pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          culturalCuisines: scenario.culturalCuisines,
          dietaryRestrictions: scenario.dietaryRestrictions,
          budgetLimit: scenario.budgetLimit,
          householdSize: scenario.householdSize,
          timeFrame: scenario.timeFrame
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('API Response for', scenarioKey, ':', data);
      
      // Handle nested response structure
      const processedData = {
        ...data,
        recipes: data.mealPlan?.recipes || data.recipes || [],
        totalCost: data.mealPlan?.totalEstimatedCost || data.totalCost || 0,
        confidence: data.mealPlan?.confidence || data.confidence || 'N/A'
      };
      
      setResults(prev => ({ ...prev, [scenarioKey]: processedData }));
    } catch (err) {
      setErrors(prev => ({ 
        ...prev, 
        [scenarioKey]: err instanceof Error ? err.message : 'Unknown error' 
      }));
    } finally {
      setLoading(false);
      setSelectedScenario(null);
    }
  };

  const clearResults = () => {
    setResults({});
    setErrors({});
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Cultural Pipeline Testing</h1>
        <button
          onClick={clearResults}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Clear All Results
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {TEST_SCENARIOS.map((scenario) => {
          const scenarioKey = scenario.name;
          const isLoading = loading && selectedScenario === scenarioKey;
          const hasResult = results[scenarioKey];
          const hasError = errors[scenarioKey];

          return (
            <div key={scenarioKey} className="border rounded-lg p-4 bg-white shadow-sm">
              <h3 className="font-semibold text-lg mb-2">{scenario.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{scenario.description}</p>
              
              <div className="text-xs space-y-1 mb-3">
                <div><strong>Cuisines:</strong> {scenario.culturalCuisines.join(', ')}</div>
                <div><strong>Diet:</strong> {scenario.dietaryRestrictions.length ? scenario.dietaryRestrictions.join(', ') : 'None'}</div>
                <div><strong>Budget:</strong> ${scenario.budgetLimit} for {scenario.householdSize} people</div>
              </div>

              <button
                onClick={() => testScenario(scenario)}
                disabled={loading}
                className={`w-full px-3 py-2 rounded text-sm font-medium ${
                  hasResult 
                    ? 'bg-green-500 text-white' 
                    : hasError 
                    ? 'bg-red-500 text-white' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                } disabled:opacity-50`}
              >
                {isLoading ? 'Testing...' : hasResult ? '✓ Tested' : hasError ? '✗ Error' : 'Test Scenario'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Results Section */}
      <div className="space-y-6">
        {Object.entries(results).map(([scenarioName, result]) => (
          <div key={scenarioName} className="border rounded-lg p-4 bg-green-50">
            <h2 className="text-xl font-semibold mb-3 text-green-800">
              ✅ {scenarioName} Results
            </h2>
            
            {result && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {result.recipes?.length || 0}
                    </div>
                    <div className="text-sm text-gray-600">Recipes Found</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      ${result.totalCost?.toFixed(2) || '0.00'}
                    </div>
                    <div className="text-sm text-gray-600">Total Cost</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {result.confidence || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">Confidence</div>
                  </div>
                </div>
                
                {/* Debug info */}
                {result.recipes?.length === 0 && (
                  <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-3 py-2 rounded mb-4">
                    <strong>Debug:</strong> No recipes found. 
                    {result.error && <span> Error: {result.error}</span>}
                    {result.details && <span> Details: {result.details}</span>}
                  </div>
                )}
              </div>
            )}

            {result?.recipes && (
              <div className="space-y-3">
                <h3 className="font-semibold">Generated Recipes:</h3>
                {result.recipes.map((recipe: any, index: number) => (
                  <div key={index} className="bg-white p-3 rounded border">
                    <div className="flex gap-3">
                      {/* Recipe Image with Fallback */}
                      <div className="flex-shrink-0 w-20 h-20 bg-gradient-to-br from-orange-100 to-red-100 rounded border flex items-center justify-center relative overflow-hidden">
                        {recipe.imageUrl ? (
                          <>
                            <img 
                              src={recipe.imageUrl} 
                              alt={recipe.title}
                              className="w-full h-full object-cover absolute inset-0"
                              crossOrigin="anonymous"
                              onError={(e) => {
                                console.log('OG Image failed to load:', recipe.imageUrl);
                                e.currentTarget.style.display = 'none';
                              }}
                              onLoad={() => {
                                console.log('OG Image loaded successfully:', recipe.imageUrl);
                              }}
                            />
                            {/* Fallback content - shows when image fails to load */}
                            <div className="flex flex-col items-center justify-center text-center p-1">
                              <span className="text-2xl">🍽️</span>
                              <span className="text-xs text-gray-600 font-medium leading-tight">
                                {recipe.title.split(' ').slice(0, 2).join(' ')}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center p-1">
                            <span className="text-2xl">🍽️</span>
                            <span className="text-xs text-gray-600 font-medium leading-tight">
                              {recipe.title.split(' ').slice(0, 2).join(' ')}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Recipe Content */}
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{recipe.title}</h4>
                          {recipe.realDataExtracted && (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                              ✓ Real Data
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>🍽️ {recipe.culturalOrigin?.join(', ')} • ⏱️ {recipe.metadata?.totalTime || 'N/A'} min • 👥 {recipe.metadata?.servings || 'N/A'} servings • 💰 ${recipe.estimatedCost?.toFixed(2) || '0.00'}</div>
                          <div><strong>Ingredients ({recipe.ingredients?.length || 0}):</strong> {recipe.ingredients?.slice(0, 3).map((ing: any) => typeof ing === 'string' ? ing : ing.name || ing.display || 'Unknown ingredient').join(', ')}{recipe.ingredients?.length > 3 ? ' +more' : ''}</div>
                          {recipe.sourceUrl && (
                            <div>
                              <a 
                                href={recipe.sourceUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline text-xs"
                              >
                                🔗 View Original Recipe
                              </a>
                            </div>
                          )}
                          {recipe.imageUrl && (
                            <div className="text-xs text-gray-500 mt-1">
                              <a 
                                href={recipe.imageUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                📷 View Recipe Image
                              </a>
                              <span className="text-gray-400 ml-2">(CORS protected)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {Object.entries(errors).map(([scenarioName, error]) => (
          error && (
            <div key={scenarioName} className="border rounded-lg p-4 bg-red-50">
              <h2 className="text-xl font-semibold mb-2 text-red-800">
                ❌ {scenarioName} Error
              </h2>
              <div className="text-red-700">{error}</div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}