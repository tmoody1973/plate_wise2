'use client';

import React, { useEffect, useState } from 'react';
import { MapPin, Store, DollarSign, Star, Clock, Globe, AlertCircle, CheckCircle, TrendingDown } from 'lucide-react';
import { useCulturalPricing } from '@/hooks/useCulturalPricing';
import type { Recipe, UserProfile, Ingredient } from '@/types';
import type { CulturalPriceResult, CulturalStore, CulturalPricingOption } from '@/lib/external-apis/cultural-pricing-service';

interface CulturalPricingPanelProps {
  recipe: Recipe;
  userProfile: UserProfile;
  onStoreSelect?: (store: CulturalStore) => void;
  className?: string;
}

export function CulturalPricingPanel({ 
  recipe, 
  userProfile, 
  onStoreSelect,
  className = '' 
}: CulturalPricingPanelProps) {
  const { 
    loading, 
    data, 
    error, 
    getCulturalPricing, 
    totalCost, 
    potentialSavings,
    culturalStores,
    shoppingStrategy,
    culturalInsights,
    hasCulturalStores 
  } = useCulturalPricing();

  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);

  useEffect(() => {
    if (recipe.ingredients.length > 0 && userProfile.location) {
      loadCulturalPricing();
    }
  }, [recipe.id, userProfile.location.zipCode]);

  const loadCulturalPricing = async () => {
    try {
      await getCulturalPricing({
        ingredients: recipe.ingredients,
        culturalOrigin: Array.isArray(recipe.culturalOrigin) 
          ? recipe.culturalOrigin 
          : recipe.culturalOrigin 
          ? [recipe.culturalOrigin]
          : ['general'],
        userLocation: userProfile.location.zipCode,
        userProfile: {
          preferences: userProfile.preferences,
          budget: userProfile.budget,
          savedStores: userProfile.savedStores
        },
        recipeContext: {
          recipeName: recipe.title,
          occasion: 'everyday',
          authenticity: recipe.metadata.culturalAuthenticity > 7 ? 'traditional' : 'adapted'
        }
      });
    } catch (error) {
      console.error('Failed to load cultural pricing:', error);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
        <div className="flex items-center text-red-600 mb-4">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span className="font-medium">Pricing Error</span>
        </div>
        <p className="text-gray-600 text-sm">{error}</p>
        <button
          onClick={loadCulturalPricing}
          className="mt-3 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">Cultural Price Intelligence</h3>
            <p className="text-orange-100 text-sm">
              Smart pricing for {recipe.culturalOrigin.join(' & ')} ingredients
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
            {potentialSavings > 0 && (
              <div className="text-green-200 text-sm flex items-center">
                <TrendingDown className="w-4 h-4 mr-1" />
                Save ${potentialSavings.toFixed(2)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cultural Insights */}
      {culturalInsights.length > 0 && (
        <div className="p-4 bg-orange-50 border-b">
          <div className="flex items-start">
            <Globe className="w-5 h-5 text-orange-600 mr-2 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Cultural Insights</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                {culturalInsights.map((insight, index) => (
                  <li key={index}>• {insight}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Shopping Strategy */}
      {shoppingStrategy && hasCulturalStores && (
        <div className="p-4 bg-blue-50 border-b">
          <div className="flex items-start">
            <Store className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-2">Recommended Shopping Strategy</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-700 mb-1">
                    <strong>Primary Store:</strong> {shoppingStrategy.primaryStore.name}
                  </p>
                  <p className="text-xs text-gray-600">
                    {shoppingStrategy.primaryStore.culturalSpecialties.join(', ')}
                  </p>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>{shoppingStrategy.estimatedTime} min</span>
                  <MapPin className="w-4 h-4 ml-3 mr-1" />
                  <span>{shoppingStrategy.totalDistance} mi</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ingredient Pricing List */}
      <div className="p-6">
        <h4 className="font-medium text-gray-900 mb-4">Ingredient Pricing Analysis</h4>
        <div className="space-y-3">
          {data.results.map((result, index) => (
            <IngredientPricingRow
              key={index}
              result={result}
              isSelected={selectedIngredient === result.ingredient}
              onSelect={() => setSelectedIngredient(
                selectedIngredient === result.ingredient ? null : result.ingredient
              )}
              onStoreSelect={onStoreSelect}
            />
          ))}
        </div>
      </div>

      {/* Cultural Stores */}
      {hasCulturalStores && (
        <div className="p-6 bg-gray-50 border-t">
          <h4 className="font-medium text-gray-900 mb-4">Recommended Cultural Stores</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {culturalStores.filter(store => store.type !== 'mainstream').slice(0, 4).map((store, index) => (
              <CulturalStoreCard
                key={index}
                store={store}
                onSelect={() => onStoreSelect?.(store)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface IngredientPricingRowProps {
  result: CulturalPriceResult;
  isSelected: boolean;
  onSelect: () => void;
  onStoreSelect?: (store: CulturalStore) => void;
}

function IngredientPricingRow({ result, isSelected, onSelect, onStoreSelect }: IngredientPricingRowProps) {
  const bestOption = result.bestOption;
  const culturalOptions = result.pricingOptions.filter(opt => opt.store.type !== 'mainstream');
  const hasCulturalOption = culturalOptions.length > 0;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onSelect}
        className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center">
              <span className="font-medium text-gray-900">{result.ingredient}</span>
              {result.culturalContext.traditionalName && (
                <span className="ml-2 text-sm text-gray-600">
                  ({result.culturalContext.traditionalName})
                </span>
              )}
              {result.culturalContext.culturalSignificance === 'essential' && (
                <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                  Essential
                </span>
              )}
            </div>
            <div className="flex items-center mt-1 text-sm text-gray-600">
              <DollarSign className="w-4 h-4 mr-1" />
              <span>${bestOption.price.toFixed(2)} {bestOption.unit}</span>
              <span className="mx-2">•</span>
              <span className={`${
                bestOption.store.type !== 'mainstream' ? 'text-green-600' : 'text-gray-600'
              }`}>
                {bestOption.store.name}
              </span>
              {hasCulturalOption && bestOption.store.type === 'mainstream' && (
                <span className="ml-2 text-orange-600 text-xs">Better options available</span>
              )}
            </div>
          </div>
          <div className="flex items-center">
            {bestOption.authenticity === 'traditional' && (
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            )}
            <span className={`px-2 py-1 rounded-full text-xs ${
              bestOption.confidence > 0.7 
                ? 'bg-green-100 text-green-800'
                : bestOption.confidence > 0.4
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {Math.round(bestOption.confidence * 100)}% confident
            </span>
          </div>
        </div>
      </button>

      {isSelected && (
        <div className="border-t bg-gray-50 p-4">
          <div className="space-y-3">
            {/* Cultural Notes */}
            {result.culturalNotes.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Cultural Notes</h5>
                <ul className="text-sm text-gray-700 space-y-1">
                  {result.culturalNotes.map((note, index) => (
                    <li key={index}>• {note}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pricing Options */}
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Pricing Options</h5>
              <div className="space-y-2">
                {result.pricingOptions.slice(0, 3).map((option, index) => (
                  <PricingOptionRow
                    key={index}
                    option={option}
                    isBest={option === bestOption}
                    onStoreSelect={onStoreSelect}
                  />
                ))}
              </div>
            </div>

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Recommendations</h5>
                <ul className="text-sm text-gray-700 space-y-1">
                  {result.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-orange-600 mr-2">•</span>
                      <span>{rec.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface PricingOptionRowProps {
  option: CulturalPricingOption;
  isBest: boolean;
  onStoreSelect?: (store: CulturalStore) => void;
}

function PricingOptionRow({ option, isBest, onStoreSelect }: PricingOptionRowProps) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${
      isBest ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
    }`}>
      <div className="flex-1">
        <div className="flex items-center">
          <span className="font-medium text-gray-900">{option.store.name}</span>
          {isBest && (
            <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              Best Choice
            </span>
          )}
          <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
            option.store.type !== 'mainstream'
              ? 'bg-orange-100 text-orange-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {option.store.type.replace('_', ' ')}
          </span>
        </div>
        <div className="flex items-center mt-1 text-sm text-gray-600">
          <span>${option.price.toFixed(2)} {option.unit}</span>
          <span className="mx-2">•</span>
          <span className="capitalize">{option.quality} quality</span>
          <span className="mx-2">•</span>
          <span className="capitalize">{option.authenticity}</span>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {option.estimatedSavings && option.estimatedSavings > 0 && (
          <span className="text-green-600 text-sm font-medium">
            -${option.estimatedSavings.toFixed(2)}
          </span>
        )}
        {onStoreSelect && (
          <button
            onClick={() => onStoreSelect(option.store)}
            className="px-3 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 transition-colors"
          >
            Select Store
          </button>
        )}
      </div>
    </div>
  );
}

interface CulturalStoreCardProps {
  store: CulturalStore;
  onSelect: () => void;
}

function CulturalStoreCard({ store, onSelect }: CulturalStoreCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h5 className="font-medium text-gray-900">{store.name}</h5>
          <p className="text-sm text-gray-600">{store.address}</p>
        </div>
        <div className="flex items-center">
          <Star className="w-4 h-4 text-yellow-400 mr-1" />
          <span className="text-sm text-gray-600">{store.qualityRating.toFixed(1)}</span>
        </div>
      </div>
      
      <div className="mb-3">
        <div className="flex flex-wrap gap-1">
          {store.culturalSpecialties.slice(0, 2).map((specialty, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full"
            >
              {specialty}
            </span>
          ))}
          {store.culturalSpecialties.length > 2 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
              +{store.culturalSpecialties.length - 2} more
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {store.avgPriceDifference < 0 ? (
            <span className="text-green-600">
              {Math.abs(store.avgPriceDifference)}% cheaper
            </span>
          ) : (
            <span>Market pricing</span>
          )}
        </div>
        <button
          onClick={onSelect}
          className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors"
        >
          Select
        </button>
      </div>
    </div>
  );
}

export default CulturalPricingPanel;