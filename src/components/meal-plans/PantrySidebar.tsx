'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface PantryItem {
  id: string;
  name: string;
  savings: number;
  checked?: boolean;
}

const mockPantryItems: PantryItem[] = [
  { id: '1', name: 'Rice', savings: 3 },
  { id: '2', name: 'Onions', savings: 2 },
  { id: '3', name: 'Garlic', savings: 1 },
  { id: '4', name: 'Cooking Oil', savings: 2 }
];

interface PantrySidebarProps {
  mealPlan?: any;
  onPantryChange?: (items: PantryItem[]) => void;
}

const mockSavingSuggestions = [
  'Buy generic brand rice instead of name brand',
  'Purchase vegetables from farmer\'s market',
  'Use seasonal ingredients for better prices',
  'Consider bulk buying for non-perishables'
];

export function PantrySidebar({ mealPlan, onPantryChange }: PantrySidebarProps) {
  const [showMoneySaving, setShowMoneySaving] = useState(false);
  const [pantryItems, setPantryItems] = useState(mockPantryItems);

  return (
    <div className="space-y-6">
      {/* Lower My Total Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Lower My Total</h3>
        
        {/* Money-Saving Suggestions */}
        <div className="space-y-2">
          <button
            onClick={() => setShowMoneySaving(!showMoneySaving)}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-sm font-medium text-gray-700">
              💡 Money-Saving Suggestions
            </span>
            {showMoneySaving ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </button>
          
          {showMoneySaving && (
            <div className="mt-3 space-y-2">
              {(mealPlan?.savings?.recommendations || mockSavingSuggestions).map((suggestion: string, index: number) => (
                <div key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pantry Items Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Pantry Items I Have</h3>
        
        <div className="space-y-3">
          {pantryItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`pantry-${item.id}`}
                  defaultChecked
                  onChange={(e) => {
                    const updatedItems = pantryItems.map(pantryItem =>
                      pantryItem.id === item.id 
                        ? { ...pantryItem, checked: e.target.checked }
                        : pantryItem
                    );
                    setPantryItems(updatedItems);
                    if (onPantryChange) {
                      onPantryChange(updatedItems.filter(item => item.checked));
                    }
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label
                  htmlFor={`pantry-${item.id}`}
                  className="text-sm text-gray-700"
                >
                  {item.name}
                </label>
              </div>
              <span className="text-sm font-medium text-green-600">
                +${item.savings}
              </span>
            </div>
          ))}
        </div>

        {/* Add Pantry Item */}
        <button className="mt-4 w-full text-left text-sm text-blue-600 hover:text-blue-800 transition-colors">
          + Add pantry item
        </button>

        {/* Total Savings */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Total Pantry Savings
            </span>
            <span className="text-sm font-bold text-green-600">
              +${mealPlan?.savings?.pantryItemsSavings?.toFixed(2) || pantryItems.reduce((sum, item) => sum + item.savings, 0)}
            </span>
          </div>
          
          {mealPlan?.savings?.totalSavings && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">
                  Total Weekly Savings
                </span>
                <span className="text-xs font-bold text-green-700">
                  +${mealPlan.savings.totalSavings.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Store Recommendations */}
      {mealPlan?.shoppingList && mealPlan.shoppingList.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">🏪 Store Recommendations</h3>
          
          <div className="space-y-3">
            {mealPlan.shoppingList.slice(0, 3).map((item: any, index: number) => (
              <div key={index} className="text-sm">
                <div className="font-medium text-gray-800">{item.ingredient}</div>
                {item.bestStore && (
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-gray-600">
                      Best at: {item.bestStore.name}
                    </div>
                    <div className="text-green-600 font-medium">
                      ${item.bestStore.price.toFixed(2)}
                    </div>
                  </div>
                )}
                {item.bestStore?.url && (
                  <a 
                    href={item.bestStore.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Visit store website →
                  </a>
                )}
              </div>
            ))}
          </div>
          
          <button className="mt-3 w-full text-sm text-blue-600 hover:text-blue-800 transition-colors">
            View full shopping list →
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
        
        <div className="space-y-2">
          <button className="w-full text-left text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 p-2 rounded transition-colors">
            🔄 Regenerate meal plan
          </button>
          <button className="w-full text-left text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 p-2 rounded transition-colors">
            🎯 Optimize for budget
          </button>
          <button className="w-full text-left text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 p-2 rounded transition-colors">
            🌍 Add cultural preferences
          </button>
          <button className="w-full text-left text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 p-2 rounded transition-colors">
            📋 View shopping list
          </button>
        </div>
      </div>
    </div>
  );
}