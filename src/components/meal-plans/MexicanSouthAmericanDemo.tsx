'use client';

import { useState } from 'react';
import { MapPin, Store, ArrowRight, Flame } from 'lucide-react';

export function MexicanSouthAmericanDemo() {
  const [selectedCuisine, setSelectedCuisine] = useState<'mexican' | 'south-american' | null>(null);

  const cuisineData = {
    mexican: {
      title: '🌮 Mexican Cuisine Intelligence',
      description: 'From common jalapeños to specialty poblanos and masa harina',
      examples: [
        {
          ingredient: 'Jalapeño Peppers',
          availability: 'regular',
          stores: ['Kroger', 'Walmart', 'Any Grocery Store'],
          alternative: 'Serrano peppers (hotter)',
          usage: 'Common in salsas, tacos, and everyday Mexican cooking',
          heatLevel: 'Mild (2,500-8,000 SHU)'
        },
        {
          ingredient: 'Poblano Peppers',
          availability: 'specialty',
          stores: ['Mexican Market', 'Latino Grocery', 'Hispanic Market'],
          alternative: 'Bell peppers (no heat)',
          usage: 'Essential for chiles rellenos and authentic Mexican dishes',
          heatLevel: 'Mild (1,000-2,000 SHU)'
        },
        {
          ingredient: 'Masa Harina',
          availability: 'specialty',
          stores: ['Mexican Market', 'Latino Grocery'],
          alternative: 'Corn flour (different texture)',
          usage: 'Traditional corn flour for making tortillas and tamales',
          heatLevel: 'N/A'
        },
        {
          ingredient: 'Queso Oaxaca',
          availability: 'specialty',
          stores: ['Mexican Market', 'Latino Grocery'],
          alternative: 'Mozzarella cheese',
          usage: 'Traditional Mexican string cheese for quesadillas',
          heatLevel: 'N/A'
        },
        {
          ingredient: 'Epazote',
          availability: 'specialty',
          stores: ['Mexican Market', 'Latino Grocery'],
          alternative: 'No direct substitute (unique herb)',
          usage: 'Traditional herb used with beans to reduce gas',
          heatLevel: 'N/A'
        },
        {
          ingredient: 'Tomatillos',
          availability: 'specialty',
          stores: ['Mexican Market', 'Some Regular Stores'],
          alternative: 'Green tomatoes (different flavor)',
          usage: 'Essential for salsa verde and Mexican green sauces',
          heatLevel: 'N/A'
        }
      ]
    },
    'south-american': {
      title: '🏔️ South American Cuisine Intelligence',
      description: 'Diverse ingredients from Peru, Brazil, Argentina, and Colombia',
      examples: [
        {
          ingredient: 'Aji Amarillo (Peruvian)',
          availability: 'specialty',
          stores: ['Peruvian Market', 'South American Grocery'],
          alternative: 'Yellow bell pepper + cayenne',
          usage: 'Essential Peruvian yellow pepper for aji de gallina',
          heatLevel: 'Medium (30,000-50,000 SHU)',
          country: '🇵🇪 Peru'
        },
        {
          ingredient: 'Quinoa',
          availability: 'regular',
          stores: ['Any Grocery Store', 'Health Food Store'],
          alternative: 'Rice or couscous',
          usage: 'Ancient Andean grain, now globally available superfood',
          heatLevel: 'N/A',
          country: '🇵🇪 Peru/Bolivia'
        },
        {
          ingredient: 'Dulce de Leche (Argentinian)',
          availability: 'both',
          stores: ['Regular Grocery', 'South American Market'],
          alternative: 'Caramel sauce',
          usage: 'Traditional milk caramel for desserts and alfajores',
          heatLevel: 'N/A',
          country: '🇦🇷 Argentina'
        },
        {
          ingredient: 'Dendê Oil (Brazilian)',
          availability: 'specialty',
          stores: ['Brazilian Market', 'African Market'],
          alternative: 'Palm oil',
          usage: 'Essential for authentic Bahian cuisine like moqueca',
          heatLevel: 'N/A',
          country: '🇧🇷 Brazil'
        },
        {
          ingredient: 'Masarepa (Colombian)',
          availability: 'specialty',
          stores: ['Colombian Market', 'Venezuelan Market'],
          alternative: 'Regular corn flour (different texture)',
          usage: 'Pre-cooked corn flour for making arepas',
          heatLevel: 'N/A',
          country: '🇨🇴 Colombia/Venezuela'
        },
        {
          ingredient: 'Panela (Colombian)',
          availability: 'specialty',
          stores: ['Colombian Market', 'South American Grocery'],
          alternative: 'Brown sugar',
          usage: 'Unrefined cane sugar for traditional Colombian sweets',
          heatLevel: 'N/A',
          country: '🇨🇴 Colombia'
        }
      ]
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          🌶️ Mexican & South American Ingredient Intelligence
        </h3>
        <p className="text-gray-600 text-sm">
          Our AI understands the complexity of Latin American cuisines, from common Mexican jalapeños to specialty Peruvian aji amarillo peppers.
        </p>
      </div>

      {/* Cuisine Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => setSelectedCuisine(selectedCuisine === 'mexican' ? null : 'mexican')}
          className={`p-4 rounded-lg border-2 transition-all ${
            selectedCuisine === 'mexican'
              ? 'border-red-500 bg-red-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-2xl mb-2">🌮</div>
          <div className="font-medium text-gray-900">Mexican Cuisine</div>
          <div className="text-sm text-gray-600">Peppers, cheeses, masa, herbs</div>
        </button>

        <button
          onClick={() => setSelectedCuisine(selectedCuisine === 'south-american' ? null : 'south-american')}
          className={`p-4 rounded-lg border-2 transition-all ${
            selectedCuisine === 'south-american'
              ? 'border-yellow-500 bg-yellow-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="text-2xl mb-2">🏔️</div>
          <div className="font-medium text-gray-900">South American</div>
          <div className="text-sm text-gray-600">Peru, Brazil, Argentina, Colombia</div>
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
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h5 className="font-medium text-gray-900">{example.ingredient}</h5>
                      {example.country && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {example.country}
                        </span>
                      )}
                      {example.heatLevel !== 'N/A' && (
                        <div className="flex items-center space-x-1">
                          <Flame className="w-3 h-3 text-red-500" />
                          <span className="text-xs text-red-600">{example.heatLevel}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{example.usage}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    example.availability === 'specialty'
                      ? 'bg-orange-100 text-orange-800'
                      : example.availability === 'both'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {example.availability === 'specialty' ? 'Specialty Store' : 
                     example.availability === 'both' ? 'Both Stores' : 'Regular Store'}
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
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <div className="text-blue-600 text-lg">💡</div>
              <div>
                <div className="font-medium text-blue-900 mb-1">Smart Regional Intelligence</div>
                <div className="text-sm text-blue-800">
                  {selectedCuisine === 'mexican' 
                    ? 'Our AI distinguishes between everyday Mexican ingredients like jalapeños (available everywhere) and specialty items like poblano peppers or masa harina that require Mexican markets for authenticity.'
                    : 'Our AI recognizes the diversity of South American cuisines - from Peruvian aji amarillo peppers to Brazilian dendê oil to Colombian masarepa - and knows which specialty markets carry authentic ingredients from each country.'
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Pepper Heat Scale for Mexican */}
          {selectedCuisine === 'mexican' && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="font-medium text-red-900 mb-3">🌶️ Mexican Pepper Heat Scale</div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-red-800">Poblano</span>
                  <span className="text-red-600">1,000-2,000 SHU (Mild)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-red-800">Jalapeño</span>
                  <span className="text-red-600">2,500-8,000 SHU (Mild-Medium)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-red-800">Serrano</span>
                  <span className="text-red-600">10,000-25,000 SHU (Medium)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-red-800">Habanero</span>
                  <span className="text-red-600">100,000-350,000 SHU (Hot)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-red-600">60+</div>
            <div className="text-sm text-gray-600">Mexican Ingredients</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">45+</div>
            <div className="text-sm text-gray-600">South American Ingredients</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">8</div>
            <div className="text-sm text-gray-600">Countries Covered</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">100%</div>
            <div className="text-sm text-gray-600">Alternative Suggestions</div>
          </div>
        </div>
      </div>
    </div>
  );
}