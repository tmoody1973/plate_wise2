'use client';

import React, { useState } from 'react';
// import { EnhancedPricingPanel } from '@/components/recipes/EnhancedPricingPanel'; // Component not implemented yet

export function PricingFallbackTest() {
  const [ingredients, setIngredients] = useState<string[]>([
    'chicken breast',
    'onion',
    'garlic',
    'tomatoes',
    'rice'
  ]);
  const [location, setLocation] = useState('90210'); // Beverly Hills, CA
  const [customIngredient, setCustomIngredient] = useState('');

  const addIngredient = () => {
    if (customIngredient.trim() && !ingredients.includes(customIngredient.trim())) {
      setIngredients([...ingredients, customIngredient.trim()]);
      setCustomIngredient('');
    }
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  // Removed handlePricingUpdate as EnhancedPricingPanel is not implemented

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Enhanced Pricing with Perplexity Primary + Kroger Fallback Test
        </h2>
        
        <div className="space-y-4">
          {/* Location Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location (ZIP code or City, State)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="90210 or Los Angeles, CA"
            />
          </div>

          {/* Ingredients List */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ingredients ({ingredients.length})
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {ingredients.map((ingredient, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                >
                  {ingredient}
                  <button
                    onClick={() => removeIngredient(index)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            
            {/* Add Ingredient */}
            <div className="flex space-x-2">
              <input
                type="text"
                value={customIngredient}
                onChange={(e) => setCustomIngredient(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add ingredient..."
              />
              <button
                onClick={addIngredient}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Pricing Panel */}
      {ingredients.length > 0 && location && (
        <div className="bg-gray-100 rounded-lg p-6">
          <p className="text-gray-600">EnhancedPricingPanel component not implemented yet.</p>
          <p className="text-sm text-gray-500 mt-2">
            Would show pricing for: {ingredients.join(', ')} in {location}
          </p>
        </div>
      )}

      {/* How It Works */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">How the Fallback System Works</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <div className="flex items-start space-x-2">
            <span className="font-semibold">1. Perplexity AI First:</span>
            <span>Searches current web prices from major grocery stores with confidence scoring</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-semibold">2. Kroger API Fallback:</span>
            <span>For ingredients with low confidence or missing data, tries Kroger's catalog API</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-semibold">3. Basic Estimates:</span>
            <span>As a last resort, uses built-in price estimates for common ingredients</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-semibold">4. Confidence Scoring:</span>
            <span>Each price includes a confidence score (0-100%) indicating reliability</span>
          </div>
        </div>
      </div>

      {/* API Status */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <h4 className="font-medium text-gray-900 mb-2">API Endpoints</h4>
        <div className="space-y-1 text-sm text-gray-600">
          <div>POST /api/pricing/enhanced - Get enhanced pricing (Perplexity primary, Kroger fallback)</div>
          <div>GET /api/pricing/enhanced - Health check for all pricing services</div>
        </div>
      </div>
    </div>
  );
}