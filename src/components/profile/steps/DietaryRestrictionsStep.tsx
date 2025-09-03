/**
 * Dietary restrictions step for profile setup
 * Collects dietary restrictions, allergies, dislikes, and religious restrictions
 */

'use client';

import { useState, useEffect } from 'react';

interface DietaryRestrictionsData {
  dietaryRestrictions: string[];
  allergies: string[];
  dislikes: string[];
  religiousRestrictions: string[];
}

interface DietaryRestrictionsStepProps {
  data: DietaryRestrictionsData;
  onUpdate: (data: DietaryRestrictionsData) => void;
}

const DIETARY_RESTRICTIONS = [
  { id: 'vegetarian', name: 'Vegetarian', description: 'No meat, poultry, or fish' },
  { id: 'vegan', name: 'Vegan', description: 'No animal products' },
  { id: 'pescatarian', name: 'Pescatarian', description: 'No meat or poultry, fish allowed' },
  { id: 'keto', name: 'Ketogenic', description: 'Very low carb, high fat' },
  { id: 'paleo', name: 'Paleo', description: 'No grains, legumes, or processed foods' },
  { id: 'low-carb', name: 'Low Carb', description: 'Reduced carbohydrate intake' },
  { id: 'gluten-free', name: 'Gluten-Free', description: 'No wheat, barley, rye, or gluten' },
  { id: 'dairy-free', name: 'Dairy-Free', description: 'No milk or dairy products' },
  { id: 'low-sodium', name: 'Low Sodium', description: 'Reduced salt intake' },
  { id: 'diabetic', name: 'Diabetic-Friendly', description: 'Blood sugar management' },
];

const COMMON_ALLERGIES = [
  'Peanuts', 'Tree nuts', 'Milk', 'Eggs', 'Wheat', 'Soy', 'Fish', 'Shellfish',
  'Sesame', 'Mustard', 'Celery', 'Lupin', 'Sulfites', 'Other'
];

const RELIGIOUS_RESTRICTIONS = [
  { id: 'halal', name: 'Halal', description: 'Islamic dietary laws' },
  { id: 'kosher', name: 'Kosher', description: 'Jewish dietary laws' },
  { id: 'hindu-vegetarian', name: 'Hindu Vegetarian', description: 'No meat, often no onion/garlic' },
  { id: 'jain', name: 'Jain', description: 'No root vegetables, strict vegetarian' },
  { id: 'buddhist', name: 'Buddhist', description: 'Often vegetarian, no alcohol' },
  { id: 'seventh-day-adventist', name: 'Seventh-day Adventist', description: 'Often vegetarian' },
];

const COMMON_DISLIKES = [
  'Spicy food', 'Seafood', 'Mushrooms', 'Onions', 'Garlic', 'Cilantro', 'Olives',
  'Tomatoes', 'Bell peppers', 'Eggplant', 'Coconut', 'Avocado', 'Beans', 'Lentils',
  'Quinoa', 'Tofu', 'Blue cheese', 'Liver', 'Organ meats', 'Raw fish'
];

export function DietaryRestrictionsStep({ data, onUpdate }: DietaryRestrictionsStepProps) {
  const [formData, setFormData] = useState(data);
  const [customAllergy, setCustomAllergy] = useState('');
  const [customDislike, setCustomDislike] = useState('');

  useEffect(() => {
    onUpdate(formData);
  }, [formData]);

  const handleArrayToggle = (field: keyof DietaryRestrictionsData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value],
    }));
  };

  const addCustomItem = (field: keyof DietaryRestrictionsData, value: string, setValue: (value: string) => void) => {
    if (value.trim() && !formData[field].includes(value.trim())) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], value.trim()],
      }));
      setValue('');
    }
  };

  const removeCustomItem = (field: keyof DietaryRestrictionsData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter(item => item !== value),
    }));
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Dietary Needs & Restrictions</h3>
        <p className="text-gray-600 mb-6">
          Help us create meal plans that respect your dietary needs, health requirements, and personal preferences.
        </p>
      </div>

      {/* Dietary Restrictions */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">
          Dietary Restrictions
          <span className="text-sm font-normal text-gray-600 ml-2">(Select all that apply)</span>
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          Choose any dietary patterns or restrictions you follow.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DIETARY_RESTRICTIONS.map(restriction => (
            <label
              key={restriction.id}
              className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                formData.dietaryRestrictions.includes(restriction.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.dietaryRestrictions.includes(restriction.id)}
                onChange={() => handleArrayToggle('dietaryRestrictions', restriction.id)}
                className="sr-only"
              />
              <div>
                <div className="font-medium text-gray-900">{restriction.name}</div>
                <div className="text-sm text-gray-600">{restriction.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Religious Restrictions */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">
          Religious Dietary Laws
          <span className="text-sm font-normal text-gray-600 ml-2">(Optional)</span>
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          Select any religious dietary laws you follow.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {RELIGIOUS_RESTRICTIONS.map(restriction => (
            <label
              key={restriction.id}
              className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                formData.religiousRestrictions.includes(restriction.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.religiousRestrictions.includes(restriction.id)}
                onChange={() => handleArrayToggle('religiousRestrictions', restriction.id)}
                className="sr-only"
              />
              <div>
                <div className="font-medium text-gray-900">{restriction.name}</div>
                <div className="text-sm text-gray-600">{restriction.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Allergies */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">
          Food Allergies
          <span className="text-sm font-normal text-red-600 ml-2">(Important for safety)</span>
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          Please list all food allergies. We'll ensure these ingredients are completely avoided in your meal plans.
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
          {COMMON_ALLERGIES.map(allergy => (
            <label
              key={allergy}
              className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                formData.allergies.includes(allergy)
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.allergies.includes(allergy)}
                onChange={() => handleArrayToggle('allergies', allergy)}
                className="sr-only"
              />
              <span className="text-sm font-medium">{allergy}</span>
            </label>
          ))}
        </div>

        {/* Custom Allergy Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customAllergy}
            onChange={(e) => setCustomAllergy(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomItem('allergies', customAllergy, setCustomAllergy);
              }
            }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add other allergy..."
          />
          <button
            type="button"
            onClick={() => addCustomItem('allergies', customAllergy, setCustomAllergy)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add
          </button>
        </div>

        {/* Custom Allergies Display */}
        {formData.allergies.filter(allergy => !COMMON_ALLERGIES.includes(allergy)).length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-medium text-gray-700 mb-2">Custom allergies:</p>
            <div className="flex flex-wrap gap-2">
              {formData.allergies
                .filter(allergy => !COMMON_ALLERGIES.includes(allergy))
                .map(allergy => (
                  <span
                    key={allergy}
                    className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                  >
                    {allergy}
                    <button
                      type="button"
                      onClick={() => removeCustomItem('allergies', allergy)}
                      className="ml-2 text-red-600 hover:text-red-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Dislikes */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">
          Food Dislikes
          <span className="text-sm font-normal text-gray-600 ml-2">(Optional)</span>
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          Select foods you prefer to avoid. We'll minimize these in your meal plans but may suggest alternatives.
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
          {COMMON_DISLIKES.map(dislike => (
            <label
              key={dislike}
              className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                formData.dislikes.includes(dislike)
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.dislikes.includes(dislike)}
                onChange={() => handleArrayToggle('dislikes', dislike)}
                className="sr-only"
              />
              <span className="text-sm font-medium">{dislike}</span>
            </label>
          ))}
        </div>

        {/* Custom Dislike Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customDislike}
            onChange={(e) => setCustomDislike(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustomItem('dislikes', customDislike, setCustomDislike);
              }
            }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add other dislike..."
          />
          <button
            type="button"
            onClick={() => addCustomItem('dislikes', customDislike, setCustomDislike)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add
          </button>
        </div>

        {/* Custom Dislikes Display */}
        {formData.dislikes.filter(dislike => !COMMON_DISLIKES.includes(dislike)).length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-medium text-gray-700 mb-2">Custom dislikes:</p>
            <div className="flex flex-wrap gap-2">
              {formData.dislikes
                .filter(dislike => !COMMON_DISLIKES.includes(dislike))
                .map(dislike => (
                  <span
                    key={dislike}
                    className="inline-flex items-center px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm"
                  >
                    {dislike}
                    <button
                      type="button"
                      onClick={() => removeCustomItem('dislikes', dislike)}
                      className="ml-2 text-orange-600 hover:text-orange-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Safety Note */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start">
          <span className="text-red-500 text-lg mr-3">⚠️</span>
          <div>
            <h5 className="font-medium text-red-900 mb-1">Important Safety Note</h5>
            <p className="text-sm text-red-800">
              Please ensure all food allergies are accurately listed above. While we take great care to avoid 
              allergens in our recommendations, always check ingredient labels and consult with healthcare 
              providers for severe allergies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}