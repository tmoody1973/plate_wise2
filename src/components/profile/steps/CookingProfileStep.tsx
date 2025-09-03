/**
 * Cooking profile step for profile setup
 * Collects skill level, available time, equipment, and meal prep preferences
 */

'use client';

import { useState, useEffect } from 'react';

interface CookingProfileData {
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  availableTime: number;
  equipment: string[];
  mealPrepPreference: boolean;
  cookingFrequency: string;
}

interface CookingProfileStepProps {
  data: CookingProfileData;
  onUpdate: (data: CookingProfileData) => void;
}

const SKILL_LEVELS = [
  {
    id: 'beginner',
    name: 'Beginner',
    description: 'Basic cooking skills, prefer simple recipes',
    details: 'Comfortable with basic techniques like boiling, baking, and simple sautéing'
  },
  {
    id: 'intermediate',
    name: 'Intermediate',
    description: 'Comfortable with most cooking techniques',
    details: 'Can handle multiple cooking methods, timing, and moderate complexity'
  },
  {
    id: 'advanced',
    name: 'Advanced',
    description: 'Experienced cook, enjoy complex recipes',
    details: 'Skilled in advanced techniques, comfortable with complex timing and methods'
  },
];

const COOKING_EQUIPMENT = [
  { id: 'basic-stove', name: 'Stovetop', category: 'Essential' },
  { id: 'oven', name: 'Oven', category: 'Essential' },
  { id: 'microwave', name: 'Microwave', category: 'Essential' },
  { id: 'blender', name: 'Blender', category: 'Small Appliances' },
  { id: 'food-processor', name: 'Food Processor', category: 'Small Appliances' },
  { id: 'stand-mixer', name: 'Stand Mixer', category: 'Small Appliances' },
  { id: 'slow-cooker', name: 'Slow Cooker/Crockpot', category: 'Small Appliances' },
  { id: 'pressure-cooker', name: 'Pressure Cooker/Instant Pot', category: 'Small Appliances' },
  { id: 'air-fryer', name: 'Air Fryer', category: 'Small Appliances' },
  { id: 'rice-cooker', name: 'Rice Cooker', category: 'Small Appliances' },
  { id: 'wok', name: 'Wok', category: 'Cookware' },
  { id: 'cast-iron', name: 'Cast Iron Skillet', category: 'Cookware' },
  { id: 'dutch-oven', name: 'Dutch Oven', category: 'Cookware' },
  { id: 'steamer', name: 'Steamer Basket/Insert', category: 'Cookware' },
  { id: 'grill', name: 'Grill (Indoor/Outdoor)', category: 'Specialty' },
  { id: 'mortar-pestle', name: 'Mortar & Pestle', category: 'Specialty' },
  { id: 'mandoline', name: 'Mandoline Slicer', category: 'Specialty' },
  { id: 'pasta-machine', name: 'Pasta Machine', category: 'Specialty' },
];

const COOKING_FREQUENCIES = [
  { id: 'daily', name: 'Daily', description: 'Cook most meals at home' },
  { id: 'few-times-week', name: 'Few times a week', description: 'Cook 3-4 times per week' },
  { id: 'weekly', name: 'Weekly', description: 'Cook 1-2 times per week' },
  { id: 'occasionally', name: 'Occasionally', description: 'Cook when I have time' },
];

export function CookingProfileStep({ data, onUpdate }: CookingProfileStepProps) {
  const [formData, setFormData] = useState(data);

  useEffect(() => {
    onUpdate(formData);
  }, [formData]);

  const handleInputChange = (field: keyof CookingProfileData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayToggle = (field: keyof CookingProfileData, value: string) => {
    if (field === 'equipment') {
      setFormData(prev => ({
        ...prev,
        [field]: prev[field].includes(value)
          ? prev[field].filter(item => item !== value)
          : [...prev[field], value],
      }));
    }
  };

  const groupedEquipment = COOKING_EQUIPMENT.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category]!.push(item);
    return acc;
  }, {} as Record<string, typeof COOKING_EQUIPMENT>);

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cooking Profile</h3>
        <p className="text-gray-600 mb-6">
          Tell us about your cooking experience and preferences so we can recommend recipes that match 
          your skill level and available equipment.
        </p>
      </div>

      {/* Skill Level */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">Cooking Skill Level</h4>
        <p className="text-sm text-gray-600 mb-4">
          This helps us recommend recipes with appropriate complexity.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SKILL_LEVELS.map(level => (
            <label
              key={level.id}
              className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                formData.skillLevel === level.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="radio"
                name="skillLevel"
                value={level.id}
                checked={formData.skillLevel === level.id}
                onChange={(e) => handleInputChange('skillLevel', e.target.value)}
                className="sr-only"
              />
              <div>
                <div className="font-medium text-gray-900">{level.name}</div>
                <div className="text-sm text-gray-600 mb-1">{level.description}</div>
                <div className="text-xs text-gray-500">{level.details}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Available Time */}
      <div>
        <label htmlFor="availableTime" className="block text-md font-medium text-gray-900 mb-3">
          Available Cooking Time
        </label>
        <p className="text-sm text-gray-600 mb-4">
          How much time do you typically have for cooking on weekdays?
        </p>
        
        <div className="flex items-center space-x-4">
          <input
            id="availableTime"
            type="number"
            min="10"
            max="180"
            step="5"
            value={formData.availableTime}
            onChange={(e) => handleInputChange('availableTime', parseInt(e.target.value) || 30)}
            className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-700">minutes</span>
        </div>
        
        <div className="mt-2 text-sm text-gray-500">
          {formData.availableTime <= 20 && "We'll focus on quick and simple recipes"}
          {formData.availableTime > 20 && formData.availableTime <= 45 && "Perfect for most everyday recipes"}
          {formData.availableTime > 45 && "Great! We can suggest more elaborate dishes"}
        </div>
      </div>

      {/* Cooking Frequency */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">Cooking Frequency</h4>
        <p className="text-sm text-gray-600 mb-4">
          How often do you cook at home?
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {COOKING_FREQUENCIES.map(frequency => (
            <label
              key={frequency.id}
              className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                formData.cookingFrequency === frequency.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="radio"
                name="cookingFrequency"
                value={frequency.id}
                checked={formData.cookingFrequency === frequency.id}
                onChange={(e) => handleInputChange('cookingFrequency', e.target.value)}
                className="sr-only"
              />
              <div>
                <div className="font-medium text-gray-900">{frequency.name}</div>
                <div className="text-sm text-gray-600">{frequency.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Meal Prep Preference */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">Meal Prep Preference</h4>
        <p className="text-sm text-gray-600 mb-4">
          Are you interested in meal prep recipes that can be made in batches?
        </p>
        
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.mealPrepPreference}
            onChange={(e) => handleInputChange('mealPrepPreference', e.target.checked)}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <div>
            <span className="font-medium text-gray-900">Yes, I enjoy meal prepping</span>
            <p className="text-sm text-gray-600">
              We'll suggest recipes that work well for batch cooking and storage
            </p>
          </div>
        </label>
      </div>

      {/* Equipment */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">
          Available Equipment
          <span className="text-sm font-normal text-gray-600 ml-2">(Select all that you have)</span>
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          This helps us recommend recipes that match your available cooking equipment.
        </p>
        
        {Object.entries(groupedEquipment).map(([category, items]) => (
          <div key={category} className="mb-6">
            <h5 className="text-sm font-medium text-gray-800 mb-3">{category}</h5>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {items.map(equipment => (
                <label
                  key={equipment.id}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.equipment.includes(equipment.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.equipment.includes(equipment.id)}
                    onChange={() => handleArrayToggle('equipment', equipment.id)}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium">{equipment.name}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Cooking Tips */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start">
          <span className="text-purple-500 text-lg mr-3">👨‍🍳</span>
          <div>
            <h5 className="font-medium text-purple-900 mb-1">Personalized Recipe Recommendations</h5>
            <p className="text-sm text-purple-800">
              Based on your cooking profile, we'll suggest recipes that match your skill level, time constraints, 
              and available equipment. We'll also provide tips to help you improve your cooking skills with 
              traditional techniques from your preferred cuisines.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}