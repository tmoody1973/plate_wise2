/**
 * Enhanced Cultural Pricing Panel
 * Comprehensive UI for cultural pricing intelligence with confidence scoring,
 * ethnic market discovery, and traditional ingredient mapping
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useEnhancedCulturalPricing, useCulturalIngredientManager } from '@/hooks/useEnhancedCulturalPricing';
import type { CulturalPricingRequest } from '@/lib/external-apis/enhanced-cultural-pricing-service';

interface EnhancedCulturalPricingPanelProps {
  ingredients: string[];
  location: string;
  culturalContext?: string;
  servings?: number;
  budgetConstraint?: number;
  onPricingUpdate?: (totalCost: number, costPerServing: number) => void;
}

export default function EnhancedCulturalPricingPanel({
  ingredients,
  location,
  culturalContext,
  servings = 4,
  budgetConstraint,
  onPricingUpdate,
}: EnhancedCulturalPricingPanelProps) {
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

  const [activeTab, setActiveTab] = useState<'pricing' | 'markets' | 'insights' | 'confidence'>('pricing');
  const [showTraditionalNames, setShowTraditionalNames] = useState(false);

  // Load pricing data when component mounts or props change
  useEffect(() => {
    if (ingredients.length > 0 && location) {
      const request: CulturalPricingRequest = {
        ingredients,
        location,
        culturalContext,
        servings,
        budgetConstraint,
        prioritizeAuthenticity: true,
      };

      getCulturalPricing(request);
      
      if (culturalContext) {
        discoverEthnicMarkets(location, culturalContext);
        getConfidenceScore(ingredients, location, culturalContext);
        mapTraditionalIngredients(ingredients, culturalContext);
      }
    }
  }, [ingredients, location, culturalContext, servings, budgetConstraint]);

  // Update parent component when pricing changes
  useEffect(() => {
    if (pricingResult && onPricingUpdate) {
      onPricingUpdate(pricingResult.totalEstimatedCost, pricingResult.costPerServing);
    }
  }, [pricingResult, onPricingUpdate]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
        <p className="text-center text-gray-600 mt-4">
          Analyzing cultural pricing intelligence...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <div className="flex items-center mb-2">
          <div className="w-5 h-5 bg-red-500 rounded-full mr-2"></div>
          <h3 className="text-red-800 font-semibold">Pricing Error</h3>
        </div>
        <p className="text-red-700">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!pricingResult) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
        <p className="text-gray-600 text-center">
          No pricing data available. Please check your ingredients and location.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Header with Cultural Context */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Cultural Pricing Intelligence</h2>
            {culturalContext && (
              <p className="text-orange-100 mt-1">
                {culturalContext.charAt(0).toUpperCase() + culturalContext.slice(1)} Cuisine Analysis
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              ${pricingResult.totalEstimatedCost.toFixed(2)}
            </div>
            <div className="text-orange-100">
              ${pricingResult.costPerServing.toFixed(2)} per serving
            </div>
            {pricingResult.cached && (
              <div className="text-xs text-orange-200 mt-1">
                Cached • Updated {pricingResult.lastUpdated.toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {/* Confidence Score */}
        {confidence && (
          <div className="mt-4 bg-white bg-opacity-20 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Pricing Confidence</span>
              <span className="text-sm font-bold">
                {Math.round(confidence.overall * 100)}%
              </span>
            </div>
            <div className="w-full bg-white bg-opacity-30 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full transition-all duration-500"
                style={{ width: `${confidence.overall * 100}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'pricing', label: 'Ingredient Pricing', count: pricingResult.ingredients.length },
            { id: 'markets', label: 'Ethnic Markets', count: ethnicMarkets.length },
            { id: 'insights', label: 'Cultural Insights', count: pricingResult.culturalInsights.length },
            { id: 'confidence', label: 'Confidence Score', count: null },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className="ml-2 bg-gray-100 text-gray-600 py-1 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'pricing' && (
          <PricingTab 
            ingredients={pricingResult.ingredients}
            traditionalMapping={traditionalMapping}
            showTraditionalNames={showTraditionalNames}
            onToggleTraditionalNames={() => setShowTraditionalNames(!showTraditionalNames)}
          />
        )}

        {activeTab === 'markets' && (
          <MarketsTab 
            markets={ethnicMarkets}
            shoppingStrategy={pricingResult.shoppingStrategy}
          />
        )}

        {activeTab === 'insights' && (
          <InsightsTab 
            insights={pricingResult.culturalInsights}
            alternatives={pricingResult.alternativeIngredients}
          />
        )}

        {activeTab === 'confidence' && confidence && (
          <ConfidenceTab confidence={confidence} />
        )}
      </div>
    </div>
  );
}

// Pricing Tab Component
function PricingTab({ 
  ingredients, 
  traditionalMapping, 
  showTraditionalNames, 
  onToggleTraditionalNames 
}: any) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Ingredient Pricing</h3>
        {Object.keys(traditionalMapping).length > 0 && (
          <button
            onClick={onToggleTraditionalNames}
            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
          >
            {showTraditionalNames ? 'Hide' : 'Show'} Traditional Names
          </button>
        )}
      </div>

      <div className="space-y-3">
        {ingredients.map((ingredient: any, index: number) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="font-medium text-gray-900">{ingredient.ingredient}</h4>
                {showTraditionalNames && ingredient.traditionalName && (
                  <p className="text-sm text-gray-600 italic">
                    Traditional: {ingredient.traditionalName}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900">
                  ${ingredient.totalCost.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">
                  ${ingredient.estimatedPrice.toFixed(2)} per {ingredient.unit}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  ingredient.culturalSignificance === 'essential' 
                    ? 'bg-red-100 text-red-800'
                    : ingredient.culturalSignificance === 'important'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {ingredient.culturalSignificance}
                </span>
                <span className="text-gray-600">
                  Authenticity: {ingredient.authenticityImportance}/10
                </span>
              </div>
              <div className="text-gray-600">
                {ingredient.recommendedStore} ({ingredient.storeType})
              </div>
            </div>

            {ingredient.sourcingTips.length > 0 && (
              <div className="mt-2 text-sm text-gray-600">
                <strong>Tips:</strong> {ingredient.sourcingTips.join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Markets Tab Component
function MarketsTab({ markets, shoppingStrategy }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Shopping Strategy</h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-blue-900">Primary Store</span>
            <span className="text-blue-700">{shoppingStrategy.primaryStore}</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-blue-900">Estimated Time</span>
            <span className="text-blue-700">{shoppingStrategy.estimatedTime} minutes</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium text-blue-900">Potential Savings</span>
            <span className="text-blue-700">${shoppingStrategy.estimatedSavings.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ethnic Markets</h3>
        <div className="space-y-3">
          {markets.map((market: any, index: number) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{market.name}</h4>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    Authenticity: {market.authenticityScore.toFixed(1)}/10
                  </span>
                  {market.verified && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      Verified
                    </span>
                  )}
                </div>
              </div>
              
              {market.address && (
                <p className="text-sm text-gray-600 mb-2">{market.address}</p>
              )}
              
              <div className="flex items-center justify-between text-sm">
                <div className="flex flex-wrap gap-1">
                  {market.culturalSpecialties.map((specialty: string, i: number) => (
                    <span key={i} className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                      {specialty}
                    </span>
                  ))}
                </div>
                <span className="text-gray-600">
                  Mentioned {market.mentionCount} times
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Insights Tab Component
function InsightsTab({ insights, alternatives }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cultural Insights</h3>
        <div className="space-y-3">
          {insights.map((insight: any, index: number) => (
            <div key={index} className="border-l-4 border-orange-500 bg-orange-50 p-4 rounded-r-lg">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-medium px-2 py-1 rounded ${
                  insight.type === 'authenticity' ? 'bg-red-100 text-red-800' :
                  insight.type === 'sourcing' ? 'bg-blue-100 text-blue-800' :
                  insight.type === 'seasonal' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {insight.type.replace('_', ' ')}
                </span>
                <span className={`text-xs ${
                  insight.importance === 'high' ? 'text-red-600' :
                  insight.importance === 'medium' ? 'text-orange-600' :
                  'text-gray-600'
                }`}>
                  {insight.importance} importance
                </span>
              </div>
              <p className="text-gray-700">{insight.insight}</p>
            </div>
          ))}
        </div>
      </div>

      {alternatives.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Alternative Ingredients</h3>
          <div className="space-y-3">
            {alternatives.map((alt: any, index: number) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium text-gray-900">{alt.original}</span>
                    <span className="text-gray-500 mx-2">→</span>
                    <span className="font-medium text-green-700">{alt.alternative}</span>
                  </div>
                  <span className="text-green-600 font-medium">
                    Save ${alt.costSavings.toFixed(2)}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{alt.explanation}</p>
                <div className="mt-2 flex items-center space-x-4 text-xs">
                  <span className={`px-2 py-1 rounded ${
                    alt.culturalImpact === 'minimal' ? 'bg-green-100 text-green-800' :
                    alt.culturalImpact === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {alt.culturalImpact} cultural impact
                  </span>
                  {alt.availabilityImprovement && (
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Better availability
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Confidence Tab Component
function ConfidenceTab({ confidence }: any) {
  const metrics = [
    { label: 'Source Reliability', value: confidence.source_reliability, description: 'Quality and freshness of pricing data sources' },
    { label: 'Cultural Authenticity', value: confidence.cultural_authenticity, description: 'Accuracy of cultural ingredient information' },
    { label: 'Price Accuracy', value: confidence.price_accuracy, description: 'Reliability of current price estimates' },
    { label: 'Market Coverage', value: confidence.market_coverage, description: 'Availability of ethnic market data' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Confidence Breakdown</h3>
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900 mb-2">
              {Math.round(confidence.overall * 100)}%
            </div>
            <div className="text-gray-600">Overall Confidence Score</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {metrics.map((metric, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">{metric.label}</span>
              <span className="font-semibold text-gray-700">
                {Math.round(metric.value * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${metric.value * 100}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">{metric.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}