'use client';

import MealPlannerV2 from '@/components/meal-plans/MealPlannerV2';

export default function TestNewDesignPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎨 New Card-Based Design Test
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Testing the beautiful v0-inspired design with senior-friendly features
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">✅ What We're Testing</h2>
            <ul className="text-blue-800 text-left space-y-1">
              <li>• Beautiful card-based recipe display</li>
              <li>• Large fonts and senior-friendly design</li>
              <li>• Visual recipe cards with images and pricing</li>
              <li>• Smart sidebar with money-saving suggestions</li>
              <li>• All existing functionality preserved</li>
            </ul>
          </div>
        </div>
        
        <MealPlannerV2 />
        
        <div className="mt-12 bg-white rounded-lg border shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🧪 Test Instructions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Step 1: Configuration</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• Select "Mexican" cuisine (already selected)</li>
                <li>• Keep household size at 4</li>
                <li>• Keep ZIP code as 90210</li>
                <li>• Click "Generate Recipes"</li>
                <li>• Watch for improved loading screen</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Step 2: Recipe Cards</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• Notice beautiful card layout</li>
                <li>• See large, readable fonts</li>
                <li>• Try clicking "Details" button</li>
                <li>• Test ingredient interaction buttons</li>
                <li>• Click "Accept Plan → Shopping"</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Step 3: Pricing View</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• See price badges on recipe cards</li>
                <li>• Notice the helpful sidebar</li>
                <li>• Check budget overview at top</li>
                <li>• Try "Already have" buttons</li>
                <li>• Watch prices recalculate</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Senior Accessibility</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• All text is 16px+ (easy to read)</li>
                <li>• Buttons are 44px+ (easy to tap)</li>
                <li>• High contrast colors</li>
                <li>• Generous spacing</li>
                <li>• Clear visual hierarchy</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}