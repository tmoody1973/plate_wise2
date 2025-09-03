/**
 * Cultural preferences step for profile setup
 * Collects cultural cuisines, background, and traditional cooking methods
 */

'use client';

import { useState, useEffect } from 'react';

interface CulturalPreferencesData {
  culturalCuisines: string[];
  culturalBackground: string[];
  traditionalCookingMethods: string[];
}

interface CulturalPreferencesStepProps {
  data: CulturalPreferencesData;
  onUpdate: (data: CulturalPreferencesData) => void;
}

const CULTURAL_CUISINES = [
  { id: 'mediterranean', name: 'Mediterranean', flag: '🇬🇷', description: 'Greek, Italian, Spanish' },
  { id: 'asian', name: 'Asian', flag: '🍜', description: 'Chinese, Japanese, Korean, Thai' },
  { id: 'indian', name: 'Indian', flag: '🇮🇳', description: 'North & South Indian, Pakistani' },
  { id: 'middle-eastern', name: 'Middle Eastern', flag: '🇹🇷', description: 'Turkish, Lebanese, Persian' },
  { id: 'latin-american', name: 'Latin American', flag: '🇲🇽', description: 'Mexican, Brazilian, Argentinian' },
  { id: 'african', name: 'African', flag: '🌍', description: 'Ethiopian, Moroccan, West African' },
  { id: 'caribbean', name: 'Caribbean', flag: '🏝️', description: 'Jamaican, Cuban, Puerto Rican' },
  { id: 'european', name: 'European', flag: '🇪🇺', description: 'French, German, British' },
  { id: 'american', name: 'American', flag: '🇺🇸', description: 'Southern, Tex-Mex, BBQ' },
  { id: 'fusion', name: 'Fusion', flag: '🌐', description: 'Modern fusion cuisines' },
];

const CULTURAL_BACKGROUNDS = [
  'African', 'African American', 'Arab', 'Asian', 'Caribbean', 'East Asian',
  'European', 'Hispanic/Latino', 'Indian', 'Indigenous', 'Jewish', 'Mediterranean',
  'Middle Eastern', 'Mixed Heritage', 'Native American', 'Pacific Islander',
  'South Asian', 'Southeast Asian', 'Other'
];

const COOKING_METHODS = [
  { id: 'stir-frying', name: 'Stir-frying', culture: 'Asian' },
  { id: 'slow-cooking', name: 'Slow cooking/Braising', culture: 'Various' },
  { id: 'grilling', name: 'Grilling/BBQ', culture: 'American/Global' },
  { id: 'steaming', name: 'Steaming', culture: 'Asian' },
  { id: 'fermentation', name: 'Fermentation', culture: 'Korean/Global' },
  { id: 'clay-pot', name: 'Clay pot cooking', culture: 'Various' },
  { id: 'tandoor', name: 'Tandoor/High-heat', culture: 'Indian' },
  { id: 'smoking', name: 'Smoking', culture: 'American/Global' },
  { id: 'pressure-cooking', name: 'Pressure cooking', culture: 'Modern' },
  { id: 'wok-hei', name: 'Wok hei technique', culture: 'Chinese' },
  { id: 'tagine', name: 'Tagine cooking', culture: 'Moroccan' },
  { id: 'comal', name: 'Comal/Griddle', culture: 'Mexican' },
];

export function CulturalPreferencesStep({ data, onUpdate }: CulturalPreferencesStepProps) {
  const [formData, setFormData] = useState(data);

  useEffect(() => {
    onUpdate(formData);
  }, [formData]);

  const handleArrayToggle = (field: keyof CulturalPreferencesData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value],
    }));
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cultural Preferences</h3>
        <p className="text-gray-600 mb-6">
          Help us understand your cultural food heritage so we can recommend authentic recipes 
          that honor your traditions while staying within your budget.
        </p>
      </div>

      {/* Cultural Cuisines */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">
          Preferred Cuisines
          <span className="text-sm font-normal text-gray-600 ml-2">(Select all that apply)</span>
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          Choose the types of cuisine you enjoy or want to explore. We'll prioritize these in your meal plans.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CULTURAL_CUISINES.map(cuisine => (
            <label
              key={cuisine.id}
              className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                formData.culturalCuisines.includes(cuisine.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.culturalCuisines.includes(cuisine.id)}
                onChange={() => handleArrayToggle('culturalCuisines', cuisine.id)}
                className="sr-only"
              />
              <div className="flex items-start space-x-3">
                <span className="text-2xl">{cuisine.flag}</span>
                <div>
                  <div className="font-medium text-gray-900">{cuisine.name}</div>
                  <div className="text-sm text-gray-600">{cuisine.description}</div>
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Cultural Background */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">
          Cultural Background
          <span className="text-sm font-normal text-gray-600 ml-2">(Optional)</span>
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          Share your cultural heritage to help us provide more authentic and meaningful recipe recommendations.
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {CULTURAL_BACKGROUNDS.map(background => (
            <label
              key={background}
              className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                formData.culturalBackground.includes(background)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.culturalBackground.includes(background)}
                onChange={() => handleArrayToggle('culturalBackground', background)}
                className="sr-only"
              />
              <span className="text-sm font-medium">{background}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Traditional Cooking Methods */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">
          Traditional Cooking Methods
          <span className="text-sm font-normal text-gray-600 ml-2">(Optional)</span>
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          Select cooking methods you're familiar with or interested in learning. This helps us suggest recipes 
          that match your cooking style and cultural preferences.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {COOKING_METHODS.map(method => (
            <label
              key={method.id}
              className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                formData.traditionalCookingMethods.includes(method.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.traditionalCookingMethods.includes(method.id)}
                onChange={() => handleArrayToggle('traditionalCookingMethods', method.id)}
                className="sr-only"
              />
              <div>
                <span className="text-sm font-medium">{method.name}</span>
                <span className="text-xs text-gray-500 ml-2">({method.culture})</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Cultural Authenticity Note */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-start">
          <span className="text-orange-500 text-lg mr-3">🌟</span>
          <div>
            <h5 className="font-medium text-orange-900 mb-1">Cultural Authenticity Promise</h5>
            <p className="text-sm text-orange-800">
              We respect and honor cultural food traditions. Our AI will prioritize authentic recipes 
              and cooking methods while helping you adapt them for your budget and dietary needs. 
              We'll always indicate when we suggest modifications to traditional recipes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}