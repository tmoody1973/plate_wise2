'use client';

import { useState } from 'react';
import { Search, MapPin, Store, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface ClassificationResult {
  ingredient: string;
  classification: {
    availability: 'regular' | 'specialty' | 'both';
    confidence: 'high' | 'medium' | 'low';
    preferredStoreType: string[];
    culturalOrigin?: string;
    commonAlternatives?: string[];
  };
  alternatives: string[];
  requiresSpecialtyStore: boolean;
}

export function IngredientClassificationDemo() {
  const [ingredient, setIngredient] = useState('');
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exampleIngredients = [
    { name: 'soy sauce', type: 'regular', description: 'Available at regular stores' },
    { name: 'dark soy sauce', type: 'specialty', description: 'Requires Asian specialty store' },
    { name: 'korean radish', type: 'specialty', description: 'Requires Korean/Asian market' },
    { name: 'scotch bonnet', type: 'specialty', description: 'Requires Caribbean/African market' },
    { name: 'habanero', type: 'regular', description: 'Available at regular stores (scotch bonnet alternative)' },
    { name: 'berbere spice', type: 'specialty', description: 'Requires Ethiopian/African market' },
    { name: 'plantain', type: 'both', description: 'Available at regular and Caribbean stores' },
    { name: 'masa harina', type: 'specialty', description: 'Requires Mexican/Latin market' },
    { name: 'aji amarillo', type: 'specialty', description: 'Requires Peruvian/South American market' },
    { name: 'poblano peppers', type: 'specialty', description: 'Requires Mexican market' },
    { name: 'sumac', type: 'specialty', description: 'Requires Middle Eastern market' },
    { name: 'miso paste', type: 'specialty', description: 'Requires Japanese/Asian market' },
    { name: 'tahini', type: 'both', description: 'Available at regular and Middle Eastern stores' },
    { name: 'palm oil', type: 'specialty', description: 'Requires West African market' }
  ];

  const classifyIngredient = async (ingredientName: string) => {
    if (!ingredientName.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stores/smart-finder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ingredients: [ingredientName],
          action: 'classify-ingredient',
          location: 'Milwaukee, WI'
        })
      });

      if (!response.ok) {
        throw new Error('Classification failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Classification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    classifyIngredient(ingredient);
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'regular': return 'text-green-600 bg-green-50 border-green-200';
      case 'specialty': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'both': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence) {
      case 'high': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'medium': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'low': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default: return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          🧠 Intelligent Ingredient Classification
        </h3>
        <p className="text-gray-600 text-sm">
          Test how our AI distinguishes between regular store items (like soy sauce) vs. specialty store items (like dark soy sauce or Korean radish).
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex space-x-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={ingredient}
              onChange={(e) => setIngredient(e.target.value)}
              placeholder="Enter an ingredient (e.g., 'dark soy sauce', 'korean radish')"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !ingredient.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Classify</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Example Ingredients */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Try these examples:</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {exampleIngredients.map((example, index) => (
            <button
              key={index}
              onClick={() => {
                setIngredient(example.name);
                classifyIngredient(example.name);
              }}
              className={`text-left p-2 rounded-lg border text-xs hover:shadow-sm transition-shadow ${
                example.type === 'regular' ? 'border-green-200 bg-green-50' :
                example.type === 'specialty' ? 'border-orange-200 bg-orange-50' :
                'border-blue-200 bg-blue-50'
              }`}
            >
              <div className="font-medium">{example.name}</div>
              <div className="text-gray-600 text-xs">{example.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2 text-red-800">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Classification Error</span>
          </div>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="border-t border-gray-200 pt-4">
            <h4 className="font-medium text-gray-900 mb-3">
              Classification Results for "{result.ingredient}"
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Availability */}
              <div className={`p-4 rounded-lg border ${getAvailabilityColor(result.classification.availability)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Availability</span>
                  {getConfidenceIcon(result.classification.confidence)}
                </div>
                <div className="text-sm">
                  <div className="font-medium capitalize">{result.classification.availability}</div>
                  <div className="text-xs opacity-75 mt-1">
                    {result.classification.availability === 'regular' && 'Available at regular grocery stores'}
                    {result.classification.availability === 'specialty' && 'Requires ethnic/specialty stores'}
                    {result.classification.availability === 'both' && 'Available at both regular and specialty stores'}
                  </div>
                </div>
              </div>

              {/* Store Types */}
              <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                <div className="flex items-center space-x-2 mb-2">
                  <Store className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-gray-900">Recommended Stores</span>
                </div>
                <div className="space-y-1">
                  {result.classification.preferredStoreType.map((storeType, index) => (
                    <div key={index} className="text-sm text-gray-700 capitalize">
                      • {storeType.replace('-', ' ')} stores
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cultural Origin */}
            {result.classification.culturalOrigin && (
              <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-1">
                  <MapPin className="w-4 h-4 text-purple-600" />
                  <span className="font-medium text-purple-900">Cultural Origin</span>
                </div>
                <div className="text-sm text-purple-800 capitalize">
                  {result.classification.culturalOrigin}
                </div>
              </div>
            )}

            {/* Alternatives */}
            {result.alternatives && result.alternatives.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="font-medium text-yellow-900 mb-2">Common Alternatives</div>
                <div className="space-y-1">
                  {result.alternatives.map((alternative, index) => (
                    <div key={index} className="text-sm text-yellow-800">
                      • {alternative}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Specialty Store Requirement */}
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">Requires Specialty Store</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  result.requiresSpecialtyStore 
                    ? 'bg-orange-100 text-orange-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {result.requiresSpecialtyStore ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {result.requiresSpecialtyStore 
                  ? 'This ingredient is typically only available at ethnic or specialty grocery stores.'
                  : 'This ingredient can be found at regular grocery stores.'
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}