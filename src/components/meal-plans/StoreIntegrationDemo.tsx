'use client';

import { useState } from 'react';
import { MapPin, ExternalLink, Star, DollarSign } from 'lucide-react';

interface Store {
  name: string;
  type: string;
  address: string;
  url?: string;
  specialties: string[];
  rating?: number;
}

interface StoreIntegrationDemoProps {
  stores: Store[];
  mealPlan?: any;
}

export function StoreIntegrationDemo({ stores, mealPlan }: StoreIntegrationDemoProps) {
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  if (stores.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 text-blue-800">
          <MapPin className="w-5 h-5" />
          <span className="font-medium">No Saved Stores Found</span>
        </div>
        <p className="text-blue-700 text-sm mt-1">
          Add stores in your profile to get personalized meal planning and cost optimization. 
          Check the browser console for debugging information.
        </p>
        <div className="mt-2 text-xs text-blue-600">
          Debug: {stores.length} stores loaded
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 text-green-800 mb-2">
          <MapPin className="w-5 h-5" />
          <span className="font-medium">Using Your Favorite Stores</span>
        </div>
        <p className="text-green-700 text-sm mb-3">
          Perplexity AI is optimizing your meal plan based on {stores.length} saved store{stores.length !== 1 ? 's' : ''}:
        </p>
        <div className="text-xs text-green-600 mb-2">
          Favorites: {stores.filter((store: any) => store.isFavorite).length} | 
          Total: {stores.length}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stores.map((store, index) => (
            <div
              key={index}
              className="bg-white rounded-lg border border-green-200 p-3 hover:shadow-sm transition-shadow cursor-pointer"
              onClick={() => setSelectedStore(store)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{store.name}</h4>
                  <p className="text-sm text-gray-600">{store.type}</p>
                  {store.specialties.length > 0 && (
                    <div className="mt-1">
                      <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                        {store.specialties[0]}
                      </span>
                    </div>
                  )}
                </div>
                {store.url && (
                  <a
                    href={store.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-800"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Store-specific recommendations */}
      {mealPlan?.shoppingList && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-900 mb-3">🎯 Store-Optimized Shopping</h4>
          <div className="space-y-2">
            {mealPlan.shoppingList.slice(0, 3).map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">{item.ingredient}</span>
                  {item.bestStore && (
                    <span className="text-gray-600 ml-2">
                      → {item.bestStore.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {item.bestStore?.specialty && (
                    <Star className="w-3 h-3 text-yellow-500" />
                  )}
                  <span className="text-green-600 font-medium">
                    ${item.bestStore?.price?.toFixed(2) || item.estimatedCost?.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Estimated savings from store optimization:</span>
              <span className="text-green-600 font-bold">
                ${((mealPlan.savings?.totalSavings || 0) * 0.3).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Selected store modal */}
      {selectedStore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedStore.name}</h3>
                <p className="text-gray-600">{selectedStore.type}</p>
              </div>
              <button
                onClick={() => setSelectedStore(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-700">Address:</span>
                <p className="text-sm text-gray-600">{selectedStore.address}</p>
              </div>
              
              {selectedStore.specialties.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Specialties:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedStore.specialties.map((specialty, index) => (
                      <span
                        key={index}
                        className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedStore.url && (
                <div className="pt-3">
                  <a
                    href={selectedStore.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Visit Store Website</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}