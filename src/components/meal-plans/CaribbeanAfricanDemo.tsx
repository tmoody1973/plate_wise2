'use client';

import { useState } from 'react';
import { MapPin, Store, ArrowRight } from 'lucide-react';

export function CaribbeanAfricanDemo() {
  const [selectedCuisine, setSelectedCuisine] = useState<'caribbean' | 'african' | null>(null);

  const cuisineData = {
    caribbean: {
      title: '🏝️ Caribbean Cuisine Intelligence',
      description: 'Authentic Caribbean ingredients with smart alternatives',
      examples: [
        {
          ingredient: 'Scotch Bonnet Peppers',
          availability: 'specialty',
          stores: ['Caribbean Market', 'West Indian Grocery', 'Jamaican Market'],
          alternative: 'Habanero Peppers (available at regular stores)',
          usage: 'Essential for authentic jerk chicken and Caribbean hot sauces'
        },
        {
          ingredient: 'Ackee',
          availability: 'specialty',
          stores: ['Caribbean Market', 'Jamaican Grocery'],
          alternative: 'No direct substitute (unique fruit)',
          usage: 'National dish of Jamaica - ackee and saltfish'
        },
        {
          ingredient: 'Callaloo',
          availability: 'specialty',
          stores: ['Caribbean Market', 'West Indian Grocery'],
          alternative: 'Spinach or Collard Greens',
          usage: 'Traditional Caribbean leafy green vegetable'
        },
        {
          ingredient: 'Allspice Berries (Pimento)',
          availability: 'specialty',
          stores: ['Caribbean Market', 'Spice Shop'],
          alternative: 'Ground Allspice (less authentic)',
          usage: 'Key ingredient in jerk seasoning and Caribbean cooking'
        },
        {
          ingredient: 'Plantain',
          availability: 'both',
          stores: ['Regular Grocery', 'Caribbean Market'],
          alternative: 'Green Bananas (similar but different)',
          usage: 'Staple starch in Caribbean cuisine - fried, boiled, or mashed'
        }
      ]
    },
    african: {
      title: '🌍 African Cuisine Intelligence',
      description: 'Diverse African ingredients from Ethiopian to West African',
      examples: [
        {
          ingredient: 'Berbere Spice',
          availability: 'specialty',
          stores: ['Ethiopian Market', 'African Grocery'],
          alternative: 'Cayenne + Paprika + Cardamom blend',
          usage: 'Essential Ethiopian spice blend for doro wat and other dishes'
        },
        {
          ingredient: 'Palm Oil',
          availability: 'specialty',
          stores: ['West African Market', 'Nigerian Grocery'],
          alternative: 'Vegetable Oil (different flavor profile)',
          usage: 'Traditional cooking oil in West African cuisine'
        },
        {
          ingredient: 'Cassava (Yuca)',
          availability: 'specialty',
          stores: ['African Market', 'Caribbean Market', 'Latin Market'],
          alternative: 'Potato (similar texture when cooked)',
          usage: 'Staple root vegetable - can be boiled, fried, or made into fufu'
        },
        {
          ingredient: 'Egusi Seeds',
          availability: 'specialty',
          stores: ['West African Market', 'Nigerian Grocery'],
          alternative: 'Pumpkin Seeds (different flavor)',
          usage: 'Ground seeds used to thicken Nigerian egusi soup'
        },
        {
          ingredient: 'Injera Bread',
          availability: 'specialty',
          stores: ['Ethiopian Market', 'African Grocery'],
          alternative: 'Sourdough Flatbread (different texture)',
          usage: 'Traditional Ethiopian spongy bread made from teff flour'
        }
      ]
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          🌍 Caribbean & African Ingredient Intelligence
        </h3>
        <p className="text-gray-600 text-sm">
          Our AI understands the nuances of Caribbean and African cuisines, distinguishing between specialty ingredients and their common alternatives.
        </p>
      </div>

      {/* Cuisine Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => setSelectedCuisine(selectedCuisine === 'caribbean' ? null : 'caribbean')}
          className={`p-4 rounded-lg border-2 transition-all ${
            selectedCuisine === 'caribbean'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-2xl mb-2">🏝️</div>
          <div className="font-medium text-gray-900">Caribbean Cuisine</div>
          <div className="text-sm text-gray-600">Jamaican, Haitian, Trinidad & Tobago</div>
        </button>

        <button
          onClick={() => setSelectedCuisine(selectedCuisine === 'african' ? null : 'african')}
          className={`p-4 rounded-lg border-2 transition-all ${
            selectedCuisine === 'african'
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-2xl mb-2">🌍</div>
          <div className="font-medium text-gray-900">African Cuisine</div>
          <div className="text-sm text-gray-600">Ethiopian, West African, North African</div>
        </button>
      </div>

      {/* Selected Cuisine Details */}
      {selectedCuisine && (
        <div className="border-t border-gray-200 pt-6">
          <div className="mb-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              {cuisineData[selectedCuisine].title}
            </h4>
            <p className="text-gray-600 text-sm">
              {cuisineData[selectedCuisine].description}
            </p>
          </div>

          <div className="space-y-4">
            {cuisineData[selectedCuisine].examples.map((example, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h5 className="font-medium text-gray-900">{example.ingredient}</h5>
                    <p className="text-sm text-gray-600 mt-1">{example.usage}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    example.availability === 'specialty'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {example.availability === 'specialty' ? 'Specialty Store' : 'Both Stores'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Recommended Stores */}
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <Store className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Best Stores</span>
                    </div>
                    <div className="space-y-1">
                      {example.stores.map((store, storeIndex) => (
                        <div key={storeIndex} className="text-sm text-gray-600">
                          • {store}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Alternative */}
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <ArrowRight className="w-4 h-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Alternative</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {example.alternative}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Key Insight */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <div className="text-yellow-600 text-lg">💡</div>
              <div>
                <div className="font-medium text-yellow-900 mb-1">Smart Substitution</div>
                <div className="text-sm text-yellow-800">
                  {selectedCuisine === 'caribbean' 
                    ? 'Our AI knows that scotch bonnet peppers are essential for authentic jerk chicken, but suggests habanero as the best substitute available at regular stores when specialty stores aren\'t accessible.'
                    : 'Our AI understands that berbere spice is crucial for authentic Ethiopian cuisine, but can suggest spice blends you can make at home when Ethiopian markets aren\'t available.'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">50+</div>
            <div className="text-sm text-gray-600">Caribbean Ingredients</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">40+</div>
            <div className="text-sm text-gray-600">African Ingredients</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">15+</div>
            <div className="text-sm text-gray-600">Store Types</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">100%</div>
            <div className="text-sm text-gray-600">Alternative Suggestions</div>
          </div>
        </div>
      </div>
    </div>
  );
}