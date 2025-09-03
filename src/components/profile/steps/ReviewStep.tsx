/**
 * Review step for profile setup
 * Shows a summary of all collected data for final review
 */

'use client';

import type { ProfileSetupData } from '../ProfileSetupWizard';

interface ReviewStepProps {
  data: ProfileSetupData;
  onUpdate: (data: Partial<ProfileSetupData>) => void;
}

export function ReviewStep({ data }: ReviewStepProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatList = (items: string[]) => {
    if (items.length === 0) return 'None selected';
    if (items.length <= 3) return items.join(', ');
    return `${items.slice(0, 3).join(', ')} and ${items.length - 3} more`;
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Your Profile</h3>
        <p className="text-gray-600 mb-6">
          Please review your information below. You can always update these settings later in your profile.
        </p>
      </div>

      {/* Personal Information */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Personal Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-sm font-medium text-gray-700">Name:</span>
            <p className="text-gray-900">{data.personalInfo.name || 'Not provided'}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Location:</span>
            <p className="text-gray-900">
              {data.personalInfo.location.city && data.personalInfo.location.state
                ? `${data.personalInfo.location.city}, ${data.personalInfo.location.state} ${data.personalInfo.location.zipCode}`
                : 'Not provided'}
            </p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Languages:</span>
            <p className="text-gray-900">{formatList(data.personalInfo.languages)}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Primary Language:</span>
            <p className="text-gray-900">{data.personalInfo.primaryLanguage}</p>
          </div>
        </div>
      </div>

      {/* Cultural Preferences */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Cultural Preferences</h4>
        <div className="space-y-3">
          <div>
            <span className="text-sm font-medium text-gray-700">Preferred Cuisines:</span>
            <p className="text-gray-900">{formatList(data.culturalPreferences.culturalCuisines)}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Cultural Background:</span>
            <p className="text-gray-900">{formatList(data.culturalPreferences.culturalBackground)}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Traditional Cooking Methods:</span>
            <p className="text-gray-900">{formatList(data.culturalPreferences.traditionalCookingMethods)}</p>
          </div>
        </div>
      </div>

      {/* Dietary Restrictions */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Dietary Needs</h4>
        <div className="space-y-3">
          <div>
            <span className="text-sm font-medium text-gray-700">Dietary Restrictions:</span>
            <p className="text-gray-900">{formatList(data.dietaryRestrictions.dietaryRestrictions)}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Religious Restrictions:</span>
            <p className="text-gray-900">{formatList(data.dietaryRestrictions.religiousRestrictions)}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Allergies:</span>
            <p className="text-gray-900 text-red-700 font-medium">
              {data.dietaryRestrictions.allergies.length > 0 
                ? formatList(data.dietaryRestrictions.allergies)
                : 'None reported'}
            </p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Dislikes:</span>
            <p className="text-gray-900">{formatList(data.dietaryRestrictions.dislikes)}</p>
          </div>
        </div>
      </div>

      {/* Budget Settings */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Budget Settings</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-sm font-medium text-gray-700">Monthly Budget:</span>
            <p className="text-gray-900 text-lg font-semibold">{formatCurrency(data.budgetSettings.monthlyLimit)}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Household Size:</span>
            <p className="text-gray-900">{data.budgetSettings.householdSize} {data.budgetSettings.householdSize === 1 ? 'person' : 'people'}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Shopping Frequency:</span>
            <p className="text-gray-900 capitalize">{data.budgetSettings.shoppingFrequency.replace('-', ' ')}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Budget Priorities:</span>
            <p className="text-gray-900">{formatList(data.budgetSettings.priorityCategories)}</p>
          </div>
        </div>
      </div>

      {/* Nutritional Goals */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Nutritional Goals</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-sm font-medium text-gray-700">Daily Calories:</span>
            <p className="text-gray-900">{data.nutritionalGoals.calorieTarget} calories</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Activity Level:</span>
            <p className="text-gray-900 capitalize">{data.nutritionalGoals.activityLevel.replace('-', ' ')}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Macro Targets:</span>
            <p className="text-gray-900">
              Protein: {data.nutritionalGoals.macroTargets.protein}%, 
              Carbs: {data.nutritionalGoals.macroTargets.carbs}%, 
              Fat: {data.nutritionalGoals.macroTargets.fat}%
            </p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Health Goals:</span>
            <p className="text-gray-900">{formatList(data.nutritionalGoals.healthGoals)}</p>
          </div>
        </div>
      </div>

      {/* Cooking Profile */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Cooking Profile</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-sm font-medium text-gray-700">Skill Level:</span>
            <p className="text-gray-900 capitalize">{data.cookingProfile.skillLevel}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Available Time:</span>
            <p className="text-gray-900">{data.cookingProfile.availableTime} minutes</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Cooking Frequency:</span>
            <p className="text-gray-900 capitalize">{data.cookingProfile.cookingFrequency.replace('-', ' ')}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-gray-700">Meal Prep:</span>
            <p className="text-gray-900">{data.cookingProfile.mealPrepPreference ? 'Yes' : 'No'}</p>
          </div>
          <div className="md:col-span-2">
            <span className="text-sm font-medium text-gray-700">Equipment:</span>
            <p className="text-gray-900">{formatList(data.cookingProfile.equipment)}</p>
          </div>
        </div>
      </div>

      {/* Completion Message */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-start">
          <span className="text-green-500 text-2xl mr-4">🎉</span>
          <div>
            <h5 className="font-semibold text-green-900 mb-2">Ready to Start Your PlateWise Journey!</h5>
            <p className="text-green-800 mb-4">
              Your profile is complete! We'll use this information to create personalized meal plans that:
            </p>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Honor your cultural food traditions and preferences</li>
              <li>• Respect your dietary needs and restrictions</li>
              <li>• Stay within your budget while maximizing nutrition</li>
              <li>• Match your cooking skills and available time</li>
              <li>• Support your health and wellness goals</li>
            </ul>
            <p className="text-green-800 mt-4 text-sm">
              You can always update these settings later in your profile page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}