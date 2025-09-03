'use client';

import React, { useEffect, useState } from 'react';
import { 
  MapPin, 
  Store, 
  DollarSign, 
  Star, 
  Clock, 
  Globe, 
  AlertCircle, 
  CheckCircle, 
  TrendingDown,
  Zap,
  Database,
  RefreshCw,
  ShoppingCart
} from 'lucide-react';
import { useCulturalPricing } from '@/hooks/useCulturalPricing';
import type { Recipe, UserProfile, Ingredient } from '@/types';
import type { CulturalPriceResult, CulturalStore, CulturalPricingOption } from '@/lib/external-apis/cultural-pricing-service';

interface PerplexityPricingPanelProps {
  recipe: Recipe;
  userProfile: UserProfile;
  onStoreSelect?: (store: CulturalStore) => void;
  onAddToShoppingList?: (ingredients: string[]) => void;
  className?: string;
}

export function PerplexityPricingPanel({ 
  recipe, 
  userProfile, 
  onStoreSelect,
  onAddToShoppingList,
  className = '' 
}: PerplexityPricingPanelProps) {
  const { 
    loading, 
    data, 
    error, 
    getCulturalPricing, 
    reset,
    totalCost, 
    potentialSavings,
    culturalStores,
    shoppingStrategy,
    culturalInsights,
    hasCulturalStores 
  } = useCulturalPricing();

  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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
          ? (recipe.culturalOrigin.length ? recipe.culturalOrigin : ['general'])
          : (recipe.culturalOrigin ? [recipe.culturalOrigin] : ['general']),
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
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load cultural pricing:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      reset();
      await loadCulturalPricing();
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddAllToShoppingList = () => {
    if (onAddToShoppingList && data) {
      const ingredients = data.results.map(result => result.ingredient);
      onAddToShoppingList(ingredients);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mr-3"></div>
          <div className="text-center">
            <div className="text-lg font-medium text-gray-900">Getting Live Pricing...</div>
            <div className="text-sm text-gray-600 mt-1">
              Searching ethnic markets and mainstream stores
            </div>
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
        <p className="text-gray-600 text-sm mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
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
      {/* Header with Perplexity Branding */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Zap className="w-6 h-6 mr-3" />
            <div>
              <h3 className="text-xl font-bold mb-1">Live Cultural Pricing</h3>
              <p className="text-purple-100 text-sm">
                Powered by Perplexity AI • Real-time ethnic market data
              </p>
            </div>
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
        
        {/* Action Bar */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-purple-400">
          <div className="flex items-center text-sm text-purple-100">
            <Clock className="w-4 h-4 mr-1" />
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-1 inline ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {onAddToShoppingList && (
              <button
                onClick={handleAddAllToShoppingList}
                className="px-3 py-1 bg-green-500 hover:bg-green-600 rounded-lg text-sm transition-colors"
              >
                <ShoppingCart className="w-4 h-4 mr-1 inline" />
                Add All to List
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cultural Insights */}
      {culturalInsights.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 border-b">
          <div className="flex items-start">
            <Globe className="w-5 h-5 text-orange-600 mr-2 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Cultural Market Intelligence</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                {culturalInsights.map((insight, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-orange-600 mr-2">•</span>
                    <span>{insight}</span>
                  </li>
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
              <h4 className="font-medium text-gray-900 mb-2">Optimal Shopping Strategy</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <span>{shoppingStrategy.estimatedTime} min total</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span>{shoppingStrategy.totalDistance} mi route</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ingredient Pricing List */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-900">Live Ingredient Pricing</h4>
          <div className="flex items-center text-sm text-gray-600">
            <Database className="w-4 h-4 mr-1" />
            <span>{data.results.length} ingredients analyzed</span>
          </div>
        </div>
        
        <div className="space-y-3">
          {data.results.map((result, index) => (
            <PerplexityIngredientRow
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
          <h4 className="font-medium text-gray-900 mb-4">Recommended Cultural Markets</h4>
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

interface PerplexityIngredientRowProps {
  result: CulturalPriceResult;
  isSelected: boolean;
  onSelect: () => void;
  onStoreSelect?: (store: CulturalStore) => void;
}

function PerplexityIngredientRow({ result, isSelected, onSelect, onStoreSelect }: PerplexityIngredientRowProps) {
  const bestOption = result.bestOption;
  const perplexityOptions = result.pricingOptions.filter(opt => 
    opt.store.id === 'perplexity' || opt.confidence > 0.7
  );
  const hasLiveData = perplexityOptions.length > 0;

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
              {hasLiveData && (
                <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full flex items-center">
                  <Zap className="w-3 h-3 mr-1" />
                  Live
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
              {bestOption.store.type === 'ethnic_market' && (
                <span className="ml-2 text-green-600 text-xs">Cultural Market</span>
              )}
            </div>
          </div>
          <div className="flex items-center">
            {bestOption.authenticity === 'traditional' && (
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            )}
            <span className={`px-2 py-1 rounded-full text-xs ${
              bestOption.confidence > 0.8 
                ? 'bg-green-100 text-green-800'
                : bestOption.confidence > 0.6
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
          <div className="space-y-4">
            {/* Live Perplexity Data Highlight */}
            {hasLiveData && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="flex items-center mb-2">
                  <Zap className="w-4 h-4 text-purple-600 mr-2" />
                  <h5 className="font-medium text-purple-900">Live Market Data</h5>
                </div>
                <div className="text-sm text-purple-800">
                  Fresh pricing from Perplexity AI search across ethnic markets and mainstream stores
                </div>
              </div>
            )}

            {/* Cultural Notes */}
            {result.culturalNotes.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Cultural Context</h5>
                <ul className="text-sm text-gray-700 space-y-1">
                  {result.culturalNotes.map((note, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-orange-600 mr-2">•</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pricing Options */}
            <div>
              <h5 className="font-medium text-gray-900 mb-2">Pricing Options</h5>
              <div className="space-y-2">
                {result.pricingOptions.slice(0, 3).map((option, index) => (
                  <PerplexityPricingOptionRow
                    key={index}
                    option={option}
                    isBest={option === bestOption}
                    isLive={option.store.id === 'perplexity'}
                    onStoreSelect={onStoreSelect}
                  />
                ))}
              </div>
            </div>

            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Smart Recommendations</h5>
                <ul className="text-sm text-gray-700 space-y-1">
                  {result.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
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

interface PerplexityPricingOptionRowProps {
  option: CulturalPricingOption;
  isBest: boolean;
  isLive: boolean;
  onStoreSelect?: (store: CulturalStore) => void;
}

function PerplexityPricingOptionRow({ option, isBest, isLive, onStoreSelect }: PerplexityPricingOptionRowProps) {
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
          {isLive && (
            <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full flex items-center">
              <Zap className="w-3 h-3 mr-1" />
              Live
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

export default PerplexityPricingPanel;
