'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  DollarSign, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle,
  Calculator,
  Lightbulb
} from 'lucide-react';
import { recipeScalingService } from '@/lib/recipes/recipe-scaling-service';
import type { Recipe } from '@/types';
import type { ScaledRecipe, CostAnalysisResult } from '@/lib/recipes/recipe-scaling-service';

interface RecipeScalingProps {
  recipe: Recipe;
  onScaledRecipe?: (scaledRecipe: Recipe) => void;
  userLocation?: string;
}

export function RecipeScaling({ recipe, onScaledRecipe, userLocation }: RecipeScalingProps) {
  const [targetServings, setTargetServings] = useState(recipe.metadata.servings);
  const [scaledRecipe, setScaledRecipe] = useState<ScaledRecipe | null>(null);
  const [costAnalysis, setCostAnalysis] = useState<CostAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'scaling' | 'cost' | 'optimization'>('scaling');

  // Load initial cost analysis
  useEffect(() => {
    loadCostAnalysis();
  }, [recipe]);

  const loadCostAnalysis = async () => {
    try {
      const analysis = await recipeScalingService.analyzeCost(recipe, userLocation);
      setCostAnalysis(analysis);
    } catch (error) {
      console.error('Failed to load cost analysis:', error);
    }
  };

  const handleScale = async () => {
    if (targetServings === recipe.metadata.servings) {
      setScaledRecipe(null);
      return;
    }

    setLoading(true);
    try {
      const result = await recipeScalingService.scaleRecipe(recipe, targetServings, userLocation);
      setScaledRecipe(result);
      
      if (onScaledRecipe) {
        onScaledRecipe(result.scaledRecipe);
      }
    } catch (error) {
      console.error('Failed to scale recipe:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetScaling = () => {
    setTargetServings(recipe.metadata.servings);
    setScaledRecipe(null);
  };

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const renderScalingTab = () => (
    <div className="space-y-6">
      {/* Serving Size Adjuster */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Adjust Serving Size
        </h3>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setTargetServings(Math.max(1, targetServings - 1))}
            className="w-10 h-10 rounded-full bg-orange-100 hover:bg-orange-200 text-orange-700 flex items-center justify-center transition-colors"
          >
            -
          </button>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{targetServings}</div>
            <div className="text-sm text-gray-600">servings</div>
          </div>
          
          <button
            onClick={() => setTargetServings(targetServings + 1)}
            className="w-10 h-10 rounded-full bg-orange-100 hover:bg-orange-200 text-orange-700 flex items-center justify-center transition-colors"
          >
            +
          </button>
        </div>

        <div className="mt-4 flex space-x-2">
          {[1, 2, 4, 6, 8, 12].map(servings => (
            <button
              key={servings}
              onClick={() => setTargetServings(servings)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                targetServings === servings
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              {servings}
            </button>
          ))}
        </div>

        <div className="mt-4 flex space-x-3">
          <button
            onClick={handleScale}
            disabled={loading || targetServings === recipe.metadata.servings}
            className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white py-2 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Scaling...' : 'Scale Recipe'}
          </button>
          
          {scaledRecipe && (
            <button
              onClick={resetScaling}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Scaling Results */}
      {scaledRecipe && (
        <div className="space-y-4">
          {/* Cost Comparison */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Cost Comparison
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-600">Original</div>
                <div className="text-lg font-bold text-gray-900">
                  {formatCurrency(scaledRecipe.costComparison.originalCost)}
                </div>
                <div className="text-xs text-gray-500">
                  {formatCurrency(scaledRecipe.costComparison.originalCost / recipe.metadata.servings)} per serving
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-sm text-gray-600">Scaled</div>
                <div className="text-lg font-bold text-gray-900">
                  {formatCurrency(scaledRecipe.costComparison.scaledCost)}
                </div>
                <div className="text-xs text-gray-500">
                  {formatCurrency(scaledRecipe.costComparison.costPerServing)} per serving
                </div>
              </div>
            </div>

            {scaledRecipe.costComparison.savings !== 0 && (
              <div className={`mt-4 p-3 rounded-lg flex items-center ${
                scaledRecipe.costComparison.savings > 0
                  ? 'bg-green-50 text-green-800'
                  : 'bg-red-50 text-red-800'
              }`}>
                {scaledRecipe.costComparison.savings > 0 ? (
                  <TrendingDown className="w-5 h-5 mr-2" />
                ) : (
                  <TrendingUp className="w-5 h-5 mr-2" />
                )}
                <span className="font-medium">
                  {scaledRecipe.costComparison.savings > 0 ? 'Saves' : 'Costs'} {' '}
                  {formatCurrency(Math.abs(scaledRecipe.costComparison.savings))} total
                </span>
              </div>
            )}
          </div>

          {/* Time Adjustments */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Time Adjustments
            </h4>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-sm text-gray-600">Prep Time</div>
                <div className="font-medium">
                  {formatTime(scaledRecipe.scaledRecipe.metadata.prepTime)}
                </div>
                {scaledRecipe.scaledRecipe.metadata.prepTime !== recipe.metadata.prepTime && (
                  <div className="text-xs text-orange-600">
                    ({scaledRecipe.scaledRecipe.metadata.prepTime > recipe.metadata.prepTime ? '+' : ''}
                    {scaledRecipe.scaledRecipe.metadata.prepTime - recipe.metadata.prepTime}min)
                  </div>
                )}
              </div>
              
              <div>
                <div className="text-sm text-gray-600">Cook Time</div>
                <div className="font-medium">
                  {formatTime(scaledRecipe.scaledRecipe.metadata.cookTime)}
                </div>
                {scaledRecipe.scaledRecipe.metadata.cookTime !== recipe.metadata.cookTime && (
                  <div className="text-xs text-orange-600">
                    ({scaledRecipe.scaledRecipe.metadata.cookTime > recipe.metadata.cookTime ? '+' : ''}
                    {scaledRecipe.scaledRecipe.metadata.cookTime - recipe.metadata.cookTime}min)
                  </div>
                )}
              </div>
              
              <div>
                <div className="text-sm text-gray-600">Total Time</div>
                <div className="font-medium">
                  {formatTime(scaledRecipe.scaledRecipe.metadata.totalTime)}
                </div>
                {scaledRecipe.scaledRecipe.metadata.totalTime !== recipe.metadata.totalTime && (
                  <div className="text-xs text-orange-600">
                    ({scaledRecipe.scaledRecipe.metadata.totalTime > recipe.metadata.totalTime ? '+' : ''}
                    {scaledRecipe.scaledRecipe.metadata.totalTime - recipe.metadata.totalTime}min)
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cooking Adjustments */}
          {(scaledRecipe.adjustments.equipmentRecommendations.length > 0 || 
            scaledRecipe.adjustments.techniqueAdjustments.length > 0) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h4 className="font-medium text-blue-900 mb-4 flex items-center">
                <Lightbulb className="w-5 h-5 mr-2" />
                Cooking Adjustments
              </h4>
              
              {scaledRecipe.adjustments.equipmentRecommendations.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-medium text-blue-800 mb-2">Equipment</h5>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {scaledRecipe.adjustments.equipmentRecommendations.map((rec, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {scaledRecipe.adjustments.techniqueAdjustments.length > 0 && (
                <div>
                  <h5 className="font-medium text-blue-800 mb-2">Technique</h5>
                  <ul className="text-sm text-blue-700 space-y-1">
                    {scaledRecipe.adjustments.techniqueAdjustments.map((adj, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                        {adj}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderCostTab = () => (
    <div className="space-y-6">
      {costAnalysis && (
        <>
          {/* Cost Overview */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Calculator className="w-5 h-5 mr-2" />
              Cost Breakdown
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(costAnalysis.totalCost)}
                </div>
                <div className="text-sm text-gray-600">Total Cost</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(costAnalysis.costPerServing)}
                </div>
                <div className="text-sm text-gray-600">Per Serving</div>
              </div>
            </div>
          </div>

          {/* Ingredient Costs */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-medium text-gray-900 mb-4">Ingredient Costs</h4>
            
            <div className="space-y-3">
              {costAnalysis.ingredientCosts.map((cost, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{cost.ingredient.name}</div>
                    <div className="text-sm text-gray-600">
                      {cost.ingredient.amount} {cost.ingredient.unit} × {formatCurrency(cost.unitCost)}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      {formatCurrency(cost.totalCost)}
                    </div>
                    <div className={`text-xs ${
                      cost.availability === 'available' ? 'text-green-600' :
                      cost.availability === 'limited' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {cost.availability}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Store Comparison */}
          {costAnalysis.storeComparison.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-medium text-gray-900 mb-4">Store Comparison</h4>
              
              <div className="space-y-3">
                {costAnalysis.storeComparison.map((store, index) => (
                  <div key={index} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-medium text-gray-900">{store.storeName}</div>
                      {store.distance && (
                        <div className="text-sm text-gray-600">{store.distance} miles away</div>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <div className="font-medium text-gray-900">
                        {formatCurrency(store.totalCost)}
                      </div>
                      {store.savings > 0 && (
                        <div className="text-sm text-green-600">
                          Save {formatCurrency(store.savings)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seasonal Factors */}
          {costAnalysis.seasonalFactors.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-medium text-gray-900 mb-4">Seasonal Price Factors</h4>
              
              <div className="space-y-3">
                {costAnalysis.seasonalFactors.map((factor, index) => (
                  <div key={index} className="flex items-start justify-between py-2">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{factor.ingredient}</div>
                      <div className="text-sm text-gray-600">
                        Best months: {factor.bestMonths.join(', ')}
                      </div>
                    </div>
                    
                    <div className={`text-sm font-medium ${
                      factor.currentSeason === 'in-season' ? 'text-green-600' : 'text-orange-600'
                    }`}>
                      {factor.currentSeason}
                      {factor.priceImpact !== 0 && (
                        <div className="text-xs">
                          {factor.priceImpact > 0 ? '+' : ''}{Math.round(factor.priceImpact * 100)}%
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderOptimizationTab = () => (
    <div className="space-y-6">
      {costAnalysis && costAnalysis.budgetOptimizations.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-green-900 mb-4 flex items-center">
            <Lightbulb className="w-5 h-5 mr-2" />
            Budget Optimization Tips
          </h3>
          
          <div className="space-y-3">
            {costAnalysis.budgetOptimizations.map((tip, index) => (
              <div key={index} className="flex items-start">
                <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                <p className="text-green-800">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optimal Batch Size Calculator */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Optimal Batch Size</h4>
        <p className="text-sm text-gray-600 mb-4">
          Find the most cost-effective serving size for your needs.
        </p>
        
        <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors">
          Calculate Optimal Size
        </button>
      </div>

      {/* Substitution Suggestions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Cost-Saving Substitutions</h4>
        <p className="text-sm text-gray-600 mb-4">
          Reduce costs while maintaining cultural authenticity.
        </p>
        
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
          Find Substitutions
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'scaling', label: 'Recipe Scaling', icon: Users },
            { id: 'cost', label: 'Cost Analysis', icon: DollarSign },
            { id: 'optimization', label: 'Optimization', icon: TrendingUp },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 inline mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'scaling' && renderScalingTab()}
        {activeTab === 'cost' && renderCostTab()}
        {activeTab === 'optimization' && renderOptimizationTab()}
      </div>
    </div>
  );
}

export default RecipeScaling;