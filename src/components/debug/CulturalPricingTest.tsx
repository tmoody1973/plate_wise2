'use client';

import React, { useState } from 'react';
import { perplexityPricingService } from '@/lib/external-apis/perplexity-service';
import type { PerplexityAPIResponse, AdvancedCulturalPricingRequest } from '@/lib/external-apis/perplexity-service';
import type { Ingredient, UserProfile } from '@/types';

export function CulturalPricingTest() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PerplexityAPIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testRecipe, setTestRecipe] = useState('persian');
  const [prioritizeAuthenticity, setPrioritizeAuthenticity] = useState(false);
  const [budgetLimit, setBudgetLimit] = useState<number>(50);

  const testRecipes = {
    persian: {
      ingredients: [
        { id: '1', name: 'saffron', amount: 0.25, unit: 'tsp', culturalName: 'za\'faran', substitutes: [], costPerUnit: 0, availability: [] },
        { id: '2', name: 'basmati rice', amount: 2, unit: 'cups', culturalName: 'berenj', substitutes: [], costPerUnit: 0, availability: [] },
        { id: '3', name: 'sumac', amount: 1, unit: 'tbsp', culturalName: 'somagh', substitutes: [], costPerUnit: 0, availability: [] },
        { id: '4', name: 'pomegranate molasses', amount: 2, unit: 'tbsp', culturalName: 'rob-e anar', substitutes: [], costPerUnit: 0, availability: [] },
      ] as Ingredient[],
      culturalOrigin: ['persian', 'middle_eastern'],
      title: 'Persian Jeweled Rice (Polo Morasa)'
    },
    mexican: {
      ingredients: [
        { id: '1', name: 'masa harina', amount: 2, unit: 'cups', culturalName: 'masa', substitutes: [], costPerUnit: 0, availability: [] },
        { id: '2', name: 'dried chiles guajillo', amount: 4, unit: 'pieces', culturalName: 'chile guajillo', substitutes: [], costPerUnit: 0, availability: [] },
        { id: '3', name: 'mexican crema', amount: 0.5, unit: 'cup', culturalName: 'crema mexicana', substitutes: [], costPerUnit: 0, availability: [] },
        { id: '4', name: 'queso fresco', amount: 4, unit: 'oz', culturalName: 'queso fresco', substitutes: [], costPerUnit: 0, availability: [] },
      ] as Ingredient[],
      culturalOrigin: ['mexican'],
      title: 'Authentic Tamales'
    },
    indian: {
      ingredients: [
        { id: '1', name: 'ghee', amount: 2, unit: 'tbsp', culturalName: 'ghee', substitutes: [], costPerUnit: 0, availability: [] },
        { id: '2', name: 'garam masala', amount: 1, unit: 'tsp', culturalName: 'garam masala', substitutes: [], costPerUnit: 0, availability: [] },
        { id: '3', name: 'paneer', amount: 8, unit: 'oz', culturalName: 'paneer', substitutes: [], costPerUnit: 0, availability: [] },
        { id: '4', name: 'curry leaves', amount: 10, unit: 'leaves', culturalName: 'kadi patta', substitutes: [], costPerUnit: 0, availability: [] },
      ] as Ingredient[],
      culturalOrigin: ['indian', 'south_asian'],
      title: 'Palak Paneer'
    }
  };

  const mockUserProfile: UserProfile = {
    id: 'test-user',
    email: 'test@example.com',
    name: 'Test User',
    location: {
      zipCode: '90210',
      city: 'Beverly Hills',
      state: 'CA'
    },
    preferences: {
      languages: ['English'],
      primaryLanguage: 'English',
      culturalCuisines: ['persian', 'middle_eastern'],
      dietaryRestrictions: [],
      allergies: [],
      dislikes: []
    },
    budget: {
      monthlyLimit: 400,
      householdSize: 4,
      shoppingFrequency: 'weekly'
    },
    nutritionalGoals: {
      calorieTarget: 2000,
      macroTargets: { protein: 150, carbs: 200, fat: 70 },
      healthGoals: [],
      activityLevel: 'moderate'
    },
    cookingProfile: {
      skillLevel: 'intermediate',
      availableTime: 60,
      equipment: ['stove', 'oven'],
      mealPrepPreference: false
    },
    savedStores: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const runTest = async () => {
    const recipe = testRecipes[testRecipe as keyof typeof testRecipes];
    
    setLoading(true);
    setError(null);
    
    try {
      const request: AdvancedCulturalPricingRequest = {
        ingredients: recipe.ingredients.map(ing => ing.name),
        location: mockUserProfile.location.zipCode,
        culturalContext: recipe.culturalOrigin[0],
        budgetLimit,
        prioritizeAuthenticity
      };

      console.log('Testing advanced cultural pricing with:', request);
      
      const result = await perplexityPricingService.getAdvancedCulturalPricing(request);
      setData(result);
      
      console.log('Advanced cultural pricing result:', result);
    } catch (error) {
      console.error('Test failed:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Cultural Pricing Intelligence Test</h2>
        
        <div className="space-y-4 mb-6">
          <div className="flex items-center space-x-4">
            <select
              value={testRecipe}
              onChange={(e) => setTestRecipe(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="persian">Persian Recipe (Saffron, Sumac, etc.)</option>
              <option value="mexican">Mexican Recipe (Masa, Chiles, etc.)</option>
              <option value="indian">Indian Recipe (Ghee, Paneer, etc.)</option>
            </select>
            
            <button
              onClick={runTest}
              disabled={loading}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Test Advanced Cultural Pricing'}
            </button>
            
            <button
              onClick={reset}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Reset
            </button>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="prioritizeAuthenticity"
                checked={prioritizeAuthenticity}
                onChange={(e) => setPrioritizeAuthenticity(e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="prioritizeAuthenticity" className="text-sm text-gray-700">
                Prioritize Authenticity over Cost
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <label htmlFor="budgetLimit" className="text-sm text-gray-700">
                Budget Limit: $
              </label>
              <input
                type="number"
                id="budgetLimit"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(Number(e.target.value))}
                className="w-20 px-2 py-1 border border-gray-300 rounded"
                min="10"
                max="200"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-red-800 mb-2">Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Advanced Cultural Pricing Results</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    ${data.culturalInsights?.totalEstimatedCost?.toFixed(2) || '0.00'}
                  </div>
                  <div className="text-sm text-gray-600">Total Cost</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {data.culturalInsights?.authenticityScore?.toFixed(1) || '0.0'}/10
                  </div>
                  <div className="text-sm text-gray-600">Authenticity Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {data.culturalInsights?.ethnicMarketsFound?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Ethnic Markets</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{data.data.length}</div>
                  <div className="text-sm text-gray-600">Ingredients Analyzed</div>
                </div>
              </div>
              
              {/* Budget status removed - not available in current API response */}
            </div>

            {/* Cultural Insights */}
            {data.culturalInsights && (
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Cultural Intelligence Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Shopping Strategy</h4>
                    <p className="text-gray-700 text-sm">{data.culturalInsights.culturalShoppingStrategy}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Cost vs Authenticity</h4>
                    <p className="text-gray-700 text-sm">{data.culturalInsights.costVsAuthenticityAnalysis}</p>
                  </div>
                </div>
                
                {data.culturalInsights.ethnicMarketsFound && data.culturalInsights.ethnicMarketsFound.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Ethnic Markets Discovered</h4>
                    <div className="flex flex-wrap gap-2">
                      {data.culturalInsights.ethnicMarketsFound.map((market, index) => (
                        <span key={index} className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                          {market}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {data.culturalInsights.seasonalConsiderations && data.culturalInsights.seasonalConsiderations.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Seasonal Considerations</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {data.culturalInsights.seasonalConsiderations.map((consideration, index) => (
                        <li key={index}>• {consideration}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Bulk buying opportunities removed - not available in current API response */}
              </div>
            )}

            {/* API Response Details */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3">API Response Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Success:</span> 
                  <span className={`ml-2 ${data.success ? 'text-green-600' : 'text-red-600'}`}>
                    {data.success ? '✓ Yes' : '✗ No'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Fallback Used:</span> 
                  <span className={`ml-2 ${data.fallbackUsed ? 'text-orange-600' : 'text-green-600'}`}>
                    {data.fallbackUsed ? '⚠ Yes' : '✓ No'}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Error:</span> 
                  <span className="ml-2 text-gray-600">
                    {data.error || 'None'}
                  </span>
                </div>
              </div>
            </div>

            {/* Ingredient Results */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Enhanced Ingredient Analysis</h3>
              <div className="space-y-4">
                {data.data.map((result, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{result.ingredient}</h4>
                        {result.traditionalName && (
                          <p className="text-sm text-orange-600">Traditional: {result.traditionalName}</p>
                        )}
                        <div className="flex items-center space-x-4 mt-1">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            result.culturalSignificance === 'essential' ? 'bg-red-100 text-red-800' :
                            result.culturalSignificance === 'important' ? 'bg-orange-100 text-orange-800' :
                            result.culturalSignificance === 'common' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {result.culturalSignificance} for authenticity
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            result.storeType === 'ethnic_market' ? 'bg-green-100 text-green-800' :
                            result.storeType === 'specialty' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {result.storeType?.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          ${result.estimatedPrice.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-600">{result.unit}</div>
                        <div className="text-xs text-gray-500">
                          {Math.round(result.confidence * 100)}% confident
                        </div>
                      </div>
                    </div>

                    {/* Store Information */}
                    <div className="bg-green-50 rounded-lg p-3 mb-3">
                      <h5 className="font-medium text-green-800 mb-1">Best Source</h5>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-700">{result.store}</p>
                          <p className="text-sm text-green-600">
                            {result.seasonalAvailability} availability
                            {result.authenticityLevel && ` • ${result.authenticityLevel} authenticity`}
                          </p>
                        </div>
                        <div className="text-green-800 font-medium">
                          {result.culturalRelevance} cultural relevance
                        </div>
                      </div>
                    </div>

                    {/* Cultural Notes */}
                    {result.culturalNotes && result.culturalNotes.length > 0 && (
                      <div className="bg-orange-50 rounded-lg p-3 mb-3">
                        <h5 className="font-medium text-orange-800 mb-1">Cultural Notes</h5>
                        <ul className="text-sm text-orange-700 space-y-1">
                          {result.culturalNotes.map((note, noteIndex) => (
                            <li key={noteIndex}>• {note}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Sourcing Tips */}
                    {result.sourcingTips && result.sourcingTips.length > 0 && (
                      <div className="bg-blue-50 rounded-lg p-3 mb-3">
                        <h5 className="font-medium text-blue-800 mb-1">Sourcing Tips</h5>
                        <ul className="text-sm text-blue-700 space-y-1">
                          {result.sourcingTips.map((tip, tipIndex) => (
                            <li key={tipIndex}>💡 {tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Alternative Stores */}
                    {result.alternativeStores && result.alternativeStores.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <h5 className="font-medium text-gray-800 mb-1">Alternative Sources</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {result.alternativeStores.map((alt, altIndex) => (
                            <div key={altIndex} className="text-sm text-gray-700">
                              <span className="font-medium">{alt.store}</span>: ${alt.price.toFixed(2)}
                              <span className="text-xs text-gray-500 ml-1">({alt.storeType})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bulk Options */}
                    {result.bulkOptions && result.bulkOptions.available && (
                      <div className="bg-purple-50 rounded-lg p-3 mt-3">
                        <h5 className="font-medium text-purple-800 mb-1">Bulk Buying Option</h5>
                        <p className="text-sm text-purple-700">
                          Buy {result.bulkOptions.minQuantity} for ${result.bulkOptions.bulkPrice.toFixed(2)} 
                          <span className="text-green-600 ml-1">(Save {result.bulkOptions.savings})</span>
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Raw API Response for Debugging */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Raw API Response (Debug)</h3>
              <pre className="text-xs text-gray-600 overflow-auto max-h-96 bg-white p-4 rounded border">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}