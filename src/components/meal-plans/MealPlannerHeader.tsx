'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, HelpCircle, ShoppingCart } from 'lucide-react';

interface MealPlannerHeaderProps {
  weeklyBudget: number;
  setWeeklyBudget: (budget: number) => void;
  numberOfMeals: number;
  setNumberOfMeals: (meals: number) => void;
  estimatedTotal: { min: number; max: number };
  confidence: string;
  isGenerating?: boolean;
  onGenerateMealPlan?: () => void;
  onAcceptPlan?: () => void;
}

export function MealPlannerHeader({
  weeklyBudget,
  setWeeklyBudget,
  numberOfMeals,
  setNumberOfMeals,
  estimatedTotal,
  confidence,
  isGenerating = false,
  onGenerateMealPlan,
  onAcceptPlan
}: MealPlannerHeaderProps) {
  const [showGenerateButton, setShowGenerateButton] = useState(true);

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      {/* Top navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">🍽️</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">Meal Planner</h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>EN</span>
            <span>-A</span>
            <span>+A+</span>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <HelpCircle className="w-5 h-5 text-gray-600" />
          </button>
          <button className="text-sm text-gray-600 hover:text-gray-800">
            Back
          </button>
        </div>
      </div>

      {/* Controls section */}
      <div className="flex items-center justify-between">
        {/* Left controls */}
        <div className="flex items-center space-x-8">
          {/* Weekly Budget */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Weekly Budget
            </label>
            <div className="text-2xl font-bold text-gray-900">
              {weeklyBudget}
            </div>
          </div>

          {/* Number of Meals */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Number of Meals
            </label>
            <div className="flex items-center space-x-4">
              <div className="relative w-32">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={numberOfMeals}
                  onChange={(e) => setNumberOfMeals(parseInt(e.target.value))}
                  className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${(numberOfMeals - 1) * 11.11}%, #E5E7EB ${(numberOfMeals - 1) * 11.11}%, #E5E7EB 100%)`
                  }}
                />
                <style jsx>{`
                  .slider::-webkit-slider-thumb {
                    appearance: none;
                    height: 20px;
                    width: 20px;
                    border-radius: 50%;
                    background: #3B82F6;
                    cursor: pointer;
                    border: 2px solid white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                  }
                  .slider::-moz-range-thumb {
                    height: 20px;
                    width: 20px;
                    border-radius: 50%;
                    background: #3B82F6;
                    cursor: pointer;
                    border: 2px solid white;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                  }
                `}</style>
              </div>
              <span className="text-lg font-semibold text-gray-900 min-w-[20px]">
                {numberOfMeals}
              </span>
            </div>
          </div>
        </div>

        {/* Right section - Estimated Total and Actions */}
        <div className="flex items-center space-x-6">
          {/* Estimated Total */}
          <div className="text-right space-y-1">
            <div className="text-sm text-gray-600">Estimated Total</div>
            <div className="text-2xl font-bold text-blue-600">
              ${estimatedTotal.min}–${estimatedTotal.max}
            </div>
            <div className="flex items-center justify-end space-x-1">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                Confidence: {confidence}
              </span>
              <HelpCircle className="w-4 h-4 text-gray-400" />
            </div>
          </div>

          {/* Action Button */}
          <div>
            {showGenerateButton ? (
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  if (onGenerateMealPlan) {
                    onGenerateMealPlan();
                    setShowGenerateButton(false);
                  }
                }}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Generating...</span>
                  </div>
                ) : (
                  'Generate Meal Plan'
                )}
              </Button>
            ) : (
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-sm font-medium flex items-center space-x-2"
                onClick={() => {
                  if (onAcceptPlan) {
                    onAcceptPlan();
                  }
                }}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Accept Plan → Shopping</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}