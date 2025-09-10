'use client';

import React, { useState } from 'react';
import { enhancedRecipeSearchService, EnhancedRecipeSearchRequest } from '@/lib/meal-planning/enhanced-recipe-search';
import { recipeValidationService, ValidationResult, RecipeQualityMetrics } from '@/lib/meal-planning/recipe-validation';
import { EnhancedRecipe } from '@/types';

interface TestResult {
  success: boolean;
  recipes?: EnhancedRecipe[];
  validation?: ValidationResult[];
  qualityMetrics?: RecipeQualityMetrics[];
  error?: string;
  executionTime: number;
}

export default function EnhancedRecipeSearchTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [searchRequest, setSearchRequest] = useState<EnhancedRecipeSearchRequest>({
    query: 'authentic Italian pasta carbonara',
    culturalCuisine: 'Italian',
    country: 'Italy',
    difficulty: 'moderate',
    maxTimeMinutes: 45,
    maxResults: 3
  });

  const predefinedTests = [
    {
      name: 'Italian Carbonara',
      request: {
        query: 'authentic Italian pasta carbonara',
        culturalCuisine: 'Italian',
        country: 'Italy',
        difficulty: 'moderate',
        maxTimeMinutes: 45,
        maxResults: 3
      }
    },
    {
      name: 'Thai Pad Thai',
      request: {
        query: 'traditional Thai pad thai with tamarind',
        culturalCuisine: 'Thai',
        country: 'Thailand',
        includeIngredients: ['rice noodles', 'tamarind'],
        difficulty: 'easy',
        maxTimeMinutes: 30,
        maxResults: 2
      }
    },
    {
      name: 'Mexican Mole',
      request: {
        query: 'authentic Mexican mole poblano',
        culturalCuisine: 'Mexican',
        country: 'Mexico',
        difficulty: 'advanced',
        maxTimeMinutes: 180,
        maxResults: 2
      }
    },
    {
      name: 'Vegan Indian Curry',
      request: {
        query: 'vegan Indian chickpea curry',
        culturalCuisine: 'Indian',
        dietaryRestrictions: ['vegan', 'dairy_free'],
        difficulty: 'easy',
        maxTimeMinutes: 40,
        maxResults: 3
      }
    },
    {
      name: 'Japanese Ramen',
      request: {
        query: 'authentic Japanese tonkotsu ramen',
        culturalCuisine: 'Japanese',
        country: 'Japan',
        difficulty: 'advanced',
        maxTimeMinutes: 480, // 8 hours for proper broth
        maxResults: 1
      }
    }
  ];

  const runTest = async (request: EnhancedRecipeSearchRequest) => {
    setIsLoading(true);
    const startTime = Date.now();

    try {
      console.log('🧪 Running enhanced recipe search test:', request);
      
      const response = await enhancedRecipeSearchService.searchRecipes(request);
      const executionTime = Date.now() - startTime;

      // Validate each recipe
      const validation = response.recipes.map(recipe => 
        recipeValidationService.validateRecipe(recipe)
      );

      // Get quality metrics for each recipe
      const qualityMetrics = response.recipes.map(recipe =>
        recipeValidationService.getQualityMetrics(recipe)
      );

      setTestResult({
        success: true,
        recipes: response.recipes,
        validation,
        qualityMetrics,
        executionTime
      });

      console.log('✅ Enhanced recipe search test completed:', {
        recipesFound: response.recipes.length,
        executionTime,
        validRecipes: validation.filter(v => v.isValid).length,
        avgQualityScore: validation.reduce((sum, v) => sum + v.score, 0) / validation.length
      });

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('❌ Enhanced recipe search test failed:', error);
      
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getValidationStatusColor = (validation: ValidationResult) => {
    if (!validation.isValid) return 'text-red-600';
    if (validation.warnings.length > 0) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getQualityScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Enhanced Recipe Search Test Suite
        </h2>
        <p className="text-gray-600 mb-6">
          Test the production-ready Perplexity recipe search with comprehensive data extraction,
          validation, and quality metrics.
        </p>

        {/* Predefined Tests */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Predefined Test Cases</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {predefinedTests.map((test, index) => (
              <button
                key={index}
                onClick={() => runTest(test.request)}
                disabled={isLoading}
                className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <div className="font-medium text-gray-900">{test.name}</div>
                <div className="text-sm text-gray-500">
                  {test.request.culturalCuisine} • {test.request.difficulty} • {test.request.maxResults} recipes
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Test Configuration */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Custom Test Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Query
              </label>
              <input
                type="text"
                value={searchRequest.query}
                onChange={(e) => setSearchRequest(prev => ({ ...prev, query: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., authentic Italian pasta carbonara"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cultural Cuisine
              </label>
              <select
                value={searchRequest.culturalCuisine || ''}
                onChange={(e) => setSearchRequest(prev => ({ ...prev, culturalCuisine: e.target.value || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any Cuisine</option>
                <option value="Italian">Italian</option>
                <option value="Thai">Thai</option>
                <option value="Mexican">Mexican</option>
                <option value="Indian">Indian</option>
                <option value="Japanese">Japanese</option>
                <option value="Chinese">Chinese</option>
                <option value="French">French</option>
                <option value="Mediterranean">Mediterranean</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty
              </label>
              <select
                value={searchRequest.difficulty || ''}
                onChange={(e) => setSearchRequest(prev => ({ ...prev, difficulty: e.target.value as any || undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any Difficulty</option>
                <option value="easy">Easy</option>
                <option value="moderate">Moderate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Time (minutes)
              </label>
              <input
                type="number"
                value={searchRequest.maxTimeMinutes || ''}
                onChange={(e) => setSearchRequest(prev => ({ ...prev, maxTimeMinutes: e.target.value ? parseInt(e.target.value) : undefined }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 45"
              />
            </div>
          </div>
          
          <button
            onClick={() => runTest(searchRequest)}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Running Test...' : 'Run Custom Test'}
          </button>
        </div>
      </div>

      {/* Test Results */}
      {testResult && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Test Results</h3>
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                testResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {testResult.success ? 'Success' : 'Failed'}
              </span>
              <span className="text-sm text-gray-500">
                {testResult.executionTime}ms
              </span>
            </div>
          </div>

          {testResult.error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <h4 className="text-red-800 font-medium mb-2">Error</h4>
              <p className="text-red-700">{testResult.error}</p>
            </div>
          )}

          {testResult.recipes && testResult.validation && testResult.qualityMetrics && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{testResult.recipes.length}</div>
                  <div className="text-sm text-gray-600">Recipes Found</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {testResult.validation.filter(v => v.isValid).length}
                  </div>
                  <div className="text-sm text-gray-600">Valid Recipes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {Math.round(testResult.validation.reduce((sum, v) => sum + v.score, 0) / testResult.validation.length)}
                  </div>
                  <div className="text-sm text-gray-600">Avg Quality Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {testResult.validation.reduce((sum, v) => sum + v.warnings.length, 0)}
                  </div>
                  <div className="text-sm text-gray-600">Total Warnings</div>
                </div>
              </div>

              {/* Individual Recipe Results */}
              {testResult.recipes.map((recipe, index) => {
                const validation = testResult.validation![index];
                const metrics = testResult.qualityMetrics![index];

                return (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">{recipe.title}</h4>
                        <p className="text-sm text-gray-600">{recipe.cuisine} • {recipe.servings} servings • {recipe.totalTimeMinutes} min</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${getQualityScoreColor(validation.score)}`}>
                          {validation.score}/100
                        </div>
                        <div className={`text-sm ${getValidationStatusColor(validation)}`}>
                          {validation.isValid ? 'Valid' : 'Invalid'}
                        </div>
                      </div>
                    </div>

                    {/* Recipe Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h5 className="font-medium text-gray-800 mb-2">Recipe Data</h5>
                        <div className="space-y-1 text-sm">
                          <div>
                            <span className="font-medium">Source:</span>{' '}
                            <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer" 
                               className="text-blue-600 hover:underline truncate">
                              {recipe.sourceUrl}
                            </a>
                          </div>
                          <div>
                            <span className="font-medium">Image:</span>{' '}
                            <a href={recipe.imageUrl} target="_blank" rel="noopener noreferrer"
                               className="text-blue-600 hover:underline">
                              View Image
                            </a>
                          </div>
                          <div><span className="font-medium">Yield:</span> {recipe.yieldText}</div>
                          <div><span className="font-medium">Ingredients:</span> {recipe.ingredients.length}</div>
                          <div><span className="font-medium">Instructions:</span> {recipe.instructions.length} steps</div>
                        </div>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-800 mb-2">Quality Metrics</h5>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Completeness:</span>
                            <span className={getQualityScoreColor(metrics.completeness)}>{metrics.completeness}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Instruction Quality:</span>
                            <span className={getQualityScoreColor(metrics.instructionQuality)}>{metrics.instructionQuality}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Ingredient Detail:</span>
                            <span className={getQualityScoreColor(metrics.ingredientDetail)}>{metrics.ingredientDetail}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Safety Compliance:</span>
                            <span className={getQualityScoreColor(metrics.safetyCompliance)}>{metrics.safetyCompliance}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Accessibility:</span>
                            <span className={getQualityScoreColor(metrics.accessibility)}>{metrics.accessibility}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Validation Issues */}
                    {(validation.errors.length > 0 || validation.warnings.length > 0) && (
                      <div className="space-y-2">
                        {validation.errors.length > 0 && (
                          <div>
                            <h5 className="font-medium text-red-800 mb-1">Errors ({validation.errors.length})</h5>
                            <div className="space-y-1">
                              {validation.errors.map((error, errorIndex) => (
                                <div key={errorIndex} className="text-sm text-red-700 bg-red-50 p-2 rounded">
                                  <span className="font-medium">{error.field}:</span> {error.message}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {validation.warnings.length > 0 && (
                          <div>
                            <h5 className="font-medium text-yellow-800 mb-1">Warnings ({validation.warnings.length})</h5>
                            <div className="space-y-1">
                              {validation.warnings.slice(0, 3).map((warning, warningIndex) => (
                                <div key={warningIndex} className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                                  <span className="font-medium">{warning.field}:</span> {warning.message}
                                </div>
                              ))}
                              {validation.warnings.length > 3 && (
                                <div className="text-sm text-yellow-600">
                                  ... and {validation.warnings.length - 3} more warnings
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sample Ingredients and Instructions */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="font-medium text-gray-800 mb-2">Sample Ingredients</h5>
                        <div className="text-sm space-y-1">
                          {recipe.ingredients.slice(0, 3).map((ingredient, ingIndex) => (
                            <div key={ingIndex} className="flex justify-between">
                              <span>{ingredient.name}</span>
                              <span className="text-gray-500">{ingredient.amount} {ingredient.unit}</span>
                            </div>
                          ))}
                          {recipe.ingredients.length > 3 && (
                            <div className="text-gray-500">... and {recipe.ingredients.length - 3} more</div>
                          )}
                        </div>
                      </div>

                      <div>
                        <h5 className="font-medium text-gray-800 mb-2">Sample Instructions</h5>
                        <div className="text-sm space-y-1">
                          {recipe.instructions.slice(0, 2).map((instruction, instIndex) => (
                            <div key={instIndex}>
                              <span className="font-medium">{instruction.step}.</span> {instruction.text.substring(0, 100)}...
                            </div>
                          ))}
                          {recipe.instructions.length > 2 && (
                            <div className="text-gray-500">... and {recipe.instructions.length - 2} more steps</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}