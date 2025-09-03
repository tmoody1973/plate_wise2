/**
 * Nutritional goals step for profile setup
 * Collects calorie targets, macro targets, health goals, and activity level
 */

'use client';

import { useState, useEffect } from 'react';

interface NutritionalGoalsData {
  calorieTarget: number;
  macroTargets: {
    protein: number;
    carbs: number;
    fat: number;
  };
  healthGoals: string[];
  activityLevel: string;
}

interface NutritionalGoalsStepProps {
  data: NutritionalGoalsData;
  onUpdate: (data: NutritionalGoalsData) => void;
}

const ACTIVITY_LEVELS = [
  { id: 'sedentary', name: 'Sedentary', description: 'Little to no exercise', multiplier: 1.2 },
  { id: 'light', name: 'Lightly Active', description: 'Light exercise 1-3 days/week', multiplier: 1.375 },
  { id: 'moderate', name: 'Moderately Active', description: 'Moderate exercise 3-5 days/week', multiplier: 1.55 },
  { id: 'very', name: 'Very Active', description: 'Hard exercise 6-7 days/week', multiplier: 1.725 },
  { id: 'extra', name: 'Extra Active', description: 'Very hard exercise, physical job', multiplier: 1.9 },
];

const HEALTH_GOALS = [
  'Weight loss', 'Weight gain', 'Muscle building', 'Heart health', 'Diabetes management',
  'Lower cholesterol', 'Reduce inflammation', 'Improve digestion', 'Boost energy',
  'Better sleep', 'Immune support', 'Bone health', 'Mental clarity', 'Healthy aging'
];

export function NutritionalGoalsStep({ data, onUpdate }: NutritionalGoalsStepProps) {
  const [formData, setFormData] = useState(data);

  useEffect(() => {
    onUpdate(formData);
  }, [formData]);

  const handleInputChange = (field: string, value: string | number) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      if (parent === 'macroTargets' && child) {
        setFormData(prev => ({
          ...prev,
          macroTargets: {
            ...prev.macroTargets,
            [child]: value,
          },
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleArrayToggle = (field: keyof NutritionalGoalsData, value: string) => {
    if (field === 'healthGoals') {
      setFormData(prev => ({
        ...prev,
        [field]: prev[field].includes(value)
          ? prev[field].filter(item => item !== value)
          : [...prev[field], value],
      }));
    }
  };

  const adjustMacros = (type: 'balanced' | 'low-carb' | 'high-protein') => {
    let newMacros;
    switch (type) {
      case 'balanced':
        newMacros = { protein: 25, carbs: 50, fat: 25 };
        break;
      case 'low-carb':
        newMacros = { protein: 30, carbs: 20, fat: 50 };
        break;
      case 'high-protein':
        newMacros = { protein: 40, carbs: 35, fat: 25 };
        break;
      default:
        return;
    }
    setFormData(prev => ({ ...prev, macroTargets: newMacros }));
  };

  const totalMacros = formData.macroTargets.protein + formData.macroTargets.carbs + formData.macroTargets.fat;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Nutritional Goals</h3>
        <p className="text-gray-600 mb-6">
          Set your nutritional targets so we can create meal plans that support your health and fitness goals 
          while honoring your cultural food preferences.
        </p>
      </div>

      {/* Activity Level */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">Activity Level</h4>
        <p className="text-sm text-gray-600 mb-4">
          This helps us estimate your calorie needs.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACTIVITY_LEVELS.map(level => (
            <label
              key={level.id}
              className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                formData.activityLevel === level.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="radio"
                name="activityLevel"
                value={level.id}
                checked={formData.activityLevel === level.id}
                onChange={(e) => handleInputChange('activityLevel', e.target.value)}
                className="sr-only"
              />
              <div>
                <div className="font-medium text-gray-900">{level.name}</div>
                <div className="text-sm text-gray-600">{level.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Calorie Target */}
      <div>
        <label htmlFor="calorieTarget" className="block text-md font-medium text-gray-900 mb-3">
          Daily Calorie Target
        </label>
        <p className="text-sm text-gray-600 mb-4">
          Set your target daily calories. Leave at 2000 if you're unsure - we can adjust this later.
        </p>
        
        <div className="flex items-center space-x-4">
          <input
            id="calorieTarget"
            type="number"
            min="1200"
            max="4000"
            step="50"
            value={formData.calorieTarget}
            onChange={(e) => handleInputChange('calorieTarget', parseInt(e.target.value) || 2000)}
            className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-700">calories per day</span>
        </div>
      </div>

      {/* Macro Targets */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">Macronutrient Targets</h4>
        <p className="text-sm text-gray-600 mb-4">
          Set your preferred balance of protein, carbohydrates, and fats (should total 100%).
        </p>
        
        {/* Quick Presets */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => adjustMacros('balanced')}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200"
          >
            Balanced (25/50/25)
          </button>
          <button
            type="button"
            onClick={() => adjustMacros('low-carb')}
            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-full hover:bg-green-200"
          >
            Low Carb (30/20/50)
          </button>
          <button
            type="button"
            onClick={() => adjustMacros('high-protein')}
            className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200"
          >
            High Protein (40/35/25)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="protein" className="block text-sm font-medium text-gray-700 mb-1">
              Protein
            </label>
            <div className="flex items-center space-x-2">
              <input
                id="protein"
                type="number"
                min="10"
                max="50"
                value={formData.macroTargets.protein}
                onChange={(e) => handleInputChange('macroTargets.protein', parseInt(e.target.value) || 25)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-700">%</span>
            </div>
          </div>
          
          <div>
            <label htmlFor="carbs" className="block text-sm font-medium text-gray-700 mb-1">
              Carbohydrates
            </label>
            <div className="flex items-center space-x-2">
              <input
                id="carbs"
                type="number"
                min="10"
                max="70"
                value={formData.macroTargets.carbs}
                onChange={(e) => handleInputChange('macroTargets.carbs', parseInt(e.target.value) || 50)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-700">%</span>
            </div>
          </div>
          
          <div>
            <label htmlFor="fat" className="block text-sm font-medium text-gray-700 mb-1">
              Fat
            </label>
            <div className="flex items-center space-x-2">
              <input
                id="fat"
                type="number"
                min="15"
                max="60"
                value={formData.macroTargets.fat}
                onChange={(e) => handleInputChange('macroTargets.fat', parseInt(e.target.value) || 25)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-700">%</span>
            </div>
          </div>
        </div>
        
        {totalMacros !== 100 && (
          <p className="text-sm text-orange-600 mt-2">
            Total: {totalMacros}% (should equal 100%)
          </p>
        )}
      </div>

      {/* Health Goals */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">
          Health Goals
          <span className="text-sm font-normal text-gray-600 ml-2">(Select all that apply)</span>
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          Choose your health and wellness objectives to help us recommend appropriate recipes.
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {HEALTH_GOALS.map(goal => (
            <label
              key={goal}
              className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                formData.healthGoals.includes(goal)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.healthGoals.includes(goal)}
                onChange={() => handleArrayToggle('healthGoals', goal)}
                className="sr-only"
              />
              <span className="text-sm font-medium">{goal}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Nutrition Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <span className="text-blue-500 text-lg mr-3">🥗</span>
          <div>
            <h5 className="font-medium text-blue-900 mb-1">Personalized Nutrition</h5>
            <p className="text-sm text-blue-800">
              We'll use these goals to recommend recipes that fit your nutritional needs while respecting 
              your cultural food preferences. Our AI considers traditional cooking methods that preserve 
              nutrients and cultural authenticity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}