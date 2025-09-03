/**
 * Enhanced Cultural Pricing Test Component
 * Test interface for comprehensive cultural pricing database integration
 */

'use client';

import React, { useState } from 'react';
import { useEnhancedCulturalPricing, useCulturalIngredientManager } from '@/hooks/useEnhancedCulturalPricing';
import EnhancedCulturalPricingPanel from '@/components/recipes/EnhancedCulturalPricingPanel';

const TEST_SCENARIOS = [
  {
    name: 'Persian Saffron Rice',
    ingredients: ['saffron', 'basmati rice', 'butter', 'salt'],
    culturalContext: 'persian',
    location: '90210',
    servings: 4,
  },
  {
    name: 'Mexican Tacos',
    ingredients: ['corn tortillas', 'chicken thighs', 'cilantro', 'onions', 'lime'],
    culturalContext: 'mexican',
    location: '90210',
    servings: 6,
  },
  {
    name: 'Indian Curry',
    ingredients: ['ghee', 'paneer', 'garam masala', 'tomatoes', 'ginger'],
    culturalContext: 'indian',
    location: '90210',
    servings: 4,
  },
  {
    name: 'Mediterranean Salad',
    ingredients: ['olive oil', 'feta cheese', 'olives', 'cucumber', 'oregano'],
    culturalContext: 'mediterranean',
    location: '90210',
    servings: 4,
  },
];

export default function EnhancedCulturalPricingTest() {
  const [selectedScenario, setSelectedScenario] = useState(TEST_SCENARIOS[0]);
  const [customIngredients, setCustomIngredients] = useState('');
  const [customLocation, setCustomLocation] = useState('90210');
  const [customCulturalContext, setCustomCulturalContext] = useState('persian');
  const [useCustom, setUseCustom] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  const {
    pricingResult,
    loading,
    error,
    ethnicMarkets,
    confidence,
    traditionalMapping,
    getCulturalPricing,
    discoverEthnicMarkets,
    getConfidenceScore,
    mapTraditionalIngredients,
  } = useEnhancedCulturalPricing();

  const {
    ingredients: culturalIngredients,
    loading: ingredientsLoading,
    loadIngredientsByOrigin,
    updateIngredient,
  } = useCulturalIngredientManager();

  const handleTestScenario = async (scenario: typeof TEST_SCENARIOS[0]) => {
    setTestResults(null);
    
    try {
      // Test main pricing function
      await getCulturalPricing({
        ingredients: scenario.ingredients,
        location: scenario.location,
        culturalContext: scenario.culturalContext,
        servings: scenario.servings,
        prioritizeAuthenticity: true,
      });

      // Test ethnic markets discovery
      await discoverEthnicMarkets(scenario.location, scenario.culturalContext);

      // Test confidence scoring
      await getConfidenceScore(scenario.ingredients, scenario.location, scenario.culturalContext);

      // Test traditional ingredient mapping
      await mapTraditionalIngredients(scenario.ingredients, scenario.culturalContext);

      // Test cultural ingredients loading
      await loadIngredientsByOrigin(scenario.culturalContext);

      setTestResults({
        scenario: scenario.name,
        timestamp: new Date().toISOString(),
        success: true,
      });

    } catch (error) {
      console.error('Test scenario failed:', error);
      setTestResults({
        scenario: scenario.name,
        timestamp: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const handleCustomTest = async () => {
    if (!customIngredients.trim()) return;

    const ingredients = customIngredients.split(',').map(ing => ing.trim()).filter(Boolean);
    
    await handleTestScenario({
      name: 'Custom Test',
      ingredients,
      culturalContext: customCulturalContext,
      location: customLocation,
      servings: 4,
    });
  };

  const currentScenario = useCustom ? {
    name: 'Custom Test',
    ingredients: customIngredients.split(',').map(ing => ing.trim()).filter(Boolean),
    culturalContext: customCulturalContext,
    location: customLocation,
    servings: 4,
  } : selectedScenario;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Enhanced Cultural Pricing Test Suite
        </h1>

        {/* Test Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Scenario Selection */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Test Scenarios</h2>
            
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={!useCustom}
                  onChange={() => setUseCustom(false)}
                  className="mr-2"
                />
                <span>Predefined Scenarios</span>
              </label>
              
              {!useCustom && (
                <select
                  value={selectedScenario?.name || ''}
                  onChange={(e) => {
                    const scenario = TEST_SCENARIOS.find(s => s.name === e.target.value);
                    if (scenario) setSelectedScenario(scenario);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  {TEST_SCENARIOS.map(scenario => (
                    <option key={scenario.name} value={scenario.name}>
                      {scenario.name} ({scenario.culturalContext})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={useCustom}
                  onChange={() => setUseCustom(true)}
                  className="mr-2"
                />
                <span>Custom Test</span>
              </label>
              
              {useCustom && (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Ingredients (comma-separated)"
                    value={customIngredients}
                    onChange={(e) => setCustomIngredients(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Location (zip code)"
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  />
                  <select
                    value={customCulturalContext}
                    onChange={(e) => setCustomCulturalContext(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                  >
                    <option value="persian">Persian</option>
                    <option value="mexican">Mexican</option>
                    <option value="indian">Indian</option>
                    <option value="mediterranean">Mediterranean</option>
                    <option value="chinese">Chinese</option>
                    <option value="japanese">Japanese</option>
                  </select>
                </div>
              )}
            </div>

            <button
              onClick={() => useCustom ? handleCustomTest() : selectedScenario && handleTestScenario(selectedScenario)}
              disabled={loading || (useCustom && !customIngredients.trim())}
              className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Testing...' : 'Run Test'}
            </button>
          </div>

          {/* Test Results */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800">Test Results</h2>
            
            {testResults && (
              <div className={`p-4 rounded-lg ${
                testResults.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">
                    {testResults.scenario}
                  </span>
                  <span className={`text-sm ${
                    testResults.success ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {testResults.success ? 'Success' : 'Failed'}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {new Date(testResults.timestamp).toLocaleString()}
                </div>
                {testResults.error && (
                  <div className="text-sm text-red-600 mt-2">
                    Error: {testResults.error}
                  </div>
                )}
              </div>
            )}

            {/* Quick Stats */}
            {pricingResult && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Quick Stats</h3>
                <div className="space-y-1 text-sm">
                  <div>Total Cost: ${pricingResult.totalEstimatedCost.toFixed(2)}</div>
                  <div>Cost per Serving: ${pricingResult.costPerServing.toFixed(2)}</div>
                  <div>Ingredients: {pricingResult.ingredients.length}</div>
                  <div>Ethnic Markets: {ethnicMarkets.length}</div>
                  <div>Cultural Insights: {pricingResult.culturalInsights.length}</div>
                  {confidence && (
                    <div>Confidence: {Math.round(confidence.overall * 100)}%</div>
                  )}
                </div>
              </div>
            )}

            {/* Traditional Mapping */}
            {Object.keys(traditionalMapping).length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-medium text-purple-900 mb-2">Traditional Names</h3>
                <div className="space-y-1 text-sm">
                  {Object.entries(traditionalMapping).map(([traditional, modern]) => (
                    <div key={traditional}>
                      {traditional} → {modern}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cultural Ingredients Database */}
        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Cultural Ingredients Database</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <button
                onClick={() => currentScenario && loadIngredientsByOrigin(currentScenario.culturalContext)}
                disabled={ingredientsLoading}
                className="mb-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {ingredientsLoading ? 'Loading...' : `Load ${currentScenario?.culturalContext || 'Cultural'} Ingredients`}
              </button>

              {culturalIngredients.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {culturalIngredients.map((ingredient, index) => (
                    <div key={index} className="border border-gray-200 rounded p-3 text-sm">
                      <div className="font-medium">{ingredient.ingredient_name}</div>
                      <div className="text-gray-600">
                        Significance: {ingredient.cultural_significance} | 
                        Authenticity: {ingredient.authenticity_importance}/10
                      </div>
                      {ingredient.sourcing_tips.length > 0 && (
                        <div className="text-gray-500 text-xs mt-1">
                          Tips: {ingredient.sourcing_tips.slice(0, 2).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-medium text-gray-800 mb-2">Database Operations</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span>Enhanced Cultural Ingredients</span>
                  <span className="text-green-600">{culturalIngredients.length} loaded</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span>Ethnic Markets Discovered</span>
                  <span className="text-blue-600">{ethnicMarkets.length} found</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span>Traditional Name Mappings</span>
                  <span className="text-purple-600">{Object.keys(traditionalMapping).length} mapped</span>
                </div>
                {confidence && (
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span>Confidence Score</span>
                    <span className="text-orange-600">{Math.round(confidence.overall * 100)}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Cultural Pricing Panel */}
      {currentScenario?.ingredients && currentScenario.ingredients.length > 0 && (
        <EnhancedCulturalPricingPanel
          ingredients={currentScenario?.ingredients || []}
          location={currentScenario?.location || ''}
          culturalContext={currentScenario?.culturalContext || ''}
          servings={currentScenario?.servings || 4}
          onPricingUpdate={(totalCost, costPerServing) => {
            console.log('Pricing updated:', { totalCost, costPerServing });
          }}
        />
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <h3 className="text-red-800 font-semibold mb-2">Error</h3>
          <p className="text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}