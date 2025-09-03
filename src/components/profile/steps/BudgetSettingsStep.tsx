/**
 * Budget settings step for profile setup
 * Collects monthly budget, household size, shopping frequency, and priority categories
 */

'use client';

import { useState, useEffect } from 'react';

interface BudgetSettingsData {
  monthlyLimit: number;
  householdSize: number;
  shoppingFrequency: 'weekly' | 'biweekly' | 'monthly';
  priorityCategories: string[];
}

interface BudgetSettingsStepProps {
  data: BudgetSettingsData;
  onUpdate: (data: BudgetSettingsData) => void;
}

const SHOPPING_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly', description: 'Shop every week' },
  { value: 'biweekly', label: 'Bi-weekly', description: 'Shop every 2 weeks' },
  { value: 'monthly', label: 'Monthly', description: 'Shop once a month' },
] as const;

const PRIORITY_CATEGORIES = [
  { id: 'organic', name: 'Organic Products', description: 'Prioritize organic ingredients when possible' },
  { id: 'local', name: 'Local/Seasonal', description: 'Focus on local and seasonal ingredients' },
  { id: 'cultural-authentic', name: 'Cultural Authenticity', description: 'Invest in authentic cultural ingredients' },
  { id: 'protein-quality', name: 'High-Quality Protein', description: 'Prioritize quality meat, fish, and plant proteins' },
  { id: 'fresh-produce', name: 'Fresh Produce', description: 'Emphasize fresh fruits and vegetables' },
  { id: 'pantry-staples', name: 'Pantry Staples', description: 'Build a well-stocked pantry' },
  { id: 'specialty-items', name: 'Specialty Items', description: 'Allow budget for unique cultural ingredients' },
  { id: 'bulk-buying', name: 'Bulk Buying', description: 'Save money through bulk purchases' },
];

// Budget guidelines based on USDA data
const BUDGET_GUIDELINES = {
  1: { thrifty: 250, lowCost: 320, moderate: 400, liberal: 500 },
  2: { thrifty: 380, lowCost: 490, moderate: 610, liberal: 760 },
  3: { thrifty: 550, lowCost: 700, moderate: 870, liberal: 1080 },
  4: { thrifty: 700, lowCost: 900, moderate: 1120, liberal: 1390 },
  5: { thrifty: 830, lowCost: 1070, moderate: 1330, liberal: 1650 },
  6: { thrifty: 990, lowCost: 1270, moderate: 1580, liberal: 1960 },
};

export function BudgetSettingsStep({ data, onUpdate }: BudgetSettingsStepProps) {
  const [formData, setFormData] = useState(data);

  useEffect(() => {
    onUpdate(formData);
  }, [formData]);

  const handleInputChange = (field: keyof BudgetSettingsData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayToggle = (field: keyof BudgetSettingsData, value: string) => {
    if (field === 'priorityCategories') {
      setFormData(prev => ({
        ...prev,
        [field]: prev[field].includes(value)
          ? prev[field].filter(item => item !== value)
          : [...prev[field], value],
      }));
    }
  };

  const getBudgetGuideline = (householdSize: number) => {
    const size = Math.min(householdSize, 6);
    return BUDGET_GUIDELINES[size as keyof typeof BUDGET_GUIDELINES] || BUDGET_GUIDELINES[6];
  };

  const getBudgetCategory = (amount: number, householdSize: number) => {
    const guidelines = getBudgetGuideline(householdSize);
    if (amount <= guidelines.thrifty) return 'thrifty';
    if (amount <= guidelines.lowCost) return 'low-cost';
    if (amount <= guidelines.moderate) return 'moderate';
    return 'liberal';
  };

  const currentGuidelines = getBudgetGuideline(formData.householdSize);
  const currentCategory = getBudgetCategory(formData.monthlyLimit, formData.householdSize);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Settings</h3>
        <p className="text-gray-600 mb-6">
          Set your grocery budget and preferences so we can optimize your meal plans for maximum value 
          while respecting your cultural food traditions.
        </p>
      </div>

      {/* Household Size */}
      <div>
        <label htmlFor="householdSize" className="block text-md font-medium text-gray-900 mb-3">
          Household Size
        </label>
        <p className="text-sm text-gray-600 mb-4">
          How many people will you be cooking for regularly?
        </p>
        <div className="flex items-center space-x-4">
          <input
            id="householdSize"
            type="number"
            min="1"
            max="10"
            value={formData.householdSize}
            onChange={(e) => handleInputChange('householdSize', parseInt(e.target.value) || 1)}
            className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-700">people</span>
        </div>
      </div>

      {/* Monthly Budget */}
      <div>
        <label htmlFor="monthlyLimit" className="block text-md font-medium text-gray-900 mb-3">
          Monthly Grocery Budget
        </label>
        <p className="text-sm text-gray-600 mb-4">
          What's your target monthly spending for groceries?
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">$</span>
            <input
              id="monthlyLimit"
              type="number"
              min="50"
              max="2000"
              step="25"
              value={formData.monthlyLimit}
              onChange={(e) => handleInputChange('monthlyLimit', parseInt(e.target.value) || 400)}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-700">per month</span>
          </div>

          {/* Budget Guidelines */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="font-medium text-blue-900 mb-2">
              USDA Budget Guidelines for {formData.householdSize} {formData.householdSize === 1 ? 'person' : 'people'}
            </h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className={`p-2 rounded ${currentCategory === 'thrifty' ? 'bg-blue-200' : 'bg-white'}`}>
                <div className="font-medium">Thrifty</div>
                <div className="text-blue-700">${currentGuidelines.thrifty}</div>
              </div>
              <div className={`p-2 rounded ${currentCategory === 'low-cost' ? 'bg-blue-200' : 'bg-white'}`}>
                <div className="font-medium">Low-Cost</div>
                <div className="text-blue-700">${currentGuidelines.lowCost}</div>
              </div>
              <div className={`p-2 rounded ${currentCategory === 'moderate' ? 'bg-blue-200' : 'bg-white'}`}>
                <div className="font-medium">Moderate</div>
                <div className="text-blue-700">${currentGuidelines.moderate}</div>
              </div>
              <div className={`p-2 rounded ${currentCategory === 'liberal' ? 'bg-blue-200' : 'bg-white'}`}>
                <div className="font-medium">Liberal</div>
                <div className="text-blue-700">${currentGuidelines.liberal}</div>
              </div>
            </div>
            <p className="text-xs text-blue-800 mt-2">
              Your budget of ${formData.monthlyLimit} falls in the <strong>{currentCategory}</strong> category.
            </p>
          </div>
        </div>
      </div>

      {/* Shopping Frequency */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">Shopping Frequency</h4>
        <p className="text-sm text-gray-600 mb-4">
          How often do you prefer to shop for groceries?
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SHOPPING_FREQUENCIES.map(frequency => (
            <label
              key={frequency.value}
              className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                formData.shoppingFrequency === frequency.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="radio"
                name="shoppingFrequency"
                value={frequency.value}
                checked={formData.shoppingFrequency === frequency.value}
                onChange={(e) => handleInputChange('shoppingFrequency', e.target.value)}
                className="sr-only"
              />
              <div>
                <div className="font-medium text-gray-900">{frequency.label}</div>
                <div className="text-sm text-gray-600">{frequency.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Priority Categories */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">
          Budget Priorities
          <span className="text-sm font-normal text-gray-600 ml-2">(Select up to 3)</span>
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          Choose what's most important to you when allocating your grocery budget.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PRIORITY_CATEGORIES.map(category => (
            <label
              key={category.id}
              className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                formData.priorityCategories.includes(category.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              } ${
                formData.priorityCategories.length >= 3 && !formData.priorityCategories.includes(category.id)
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
            >
              <input
                type="checkbox"
                checked={formData.priorityCategories.includes(category.id)}
                onChange={() => handleArrayToggle('priorityCategories', category.id)}
                disabled={formData.priorityCategories.length >= 3 && !formData.priorityCategories.includes(category.id)}
                className="sr-only"
              />
              <div>
                <div className="font-medium text-gray-900">{category.name}</div>
                <div className="text-sm text-gray-600">{category.description}</div>
              </div>
            </label>
          ))}
        </div>
        
        {formData.priorityCategories.length >= 3 && (
          <p className="text-sm text-orange-600 mt-2">
            You've selected the maximum of 3 priorities. Unselect one to choose a different priority.
          </p>
        )}
      </div>

      {/* Budget Tips */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start">
          <span className="text-green-500 text-lg mr-3">💡</span>
          <div>
            <h5 className="font-medium text-green-900 mb-1">Budget Optimization Tips</h5>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• We'll suggest seasonal ingredients to reduce costs</li>
              <li>• Bulk buying recommendations for pantry staples</li>
              <li>• Cultural ingredient substitutions that maintain authenticity</li>
              <li>• Store comparison and coupon opportunities</li>
              <li>• Meal prep strategies to minimize food waste</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}