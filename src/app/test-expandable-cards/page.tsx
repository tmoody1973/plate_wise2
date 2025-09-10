'use client';

import MealPlannerV2 from '@/components/meal-plans/MealPlannerV2';

export default function TestExpandableCardsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            ✨ Expandable Recipe Cards Test
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Testing the new shadcn expandable card component for recipe details
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-3xl mx-auto">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">🎯 New Features</h2>
            <ul className="text-blue-800 text-left space-y-1">
              <li>• <strong>Click any recipe card</strong> to see full details in an expandable modal</li>
              <li>• <strong>Smooth animations</strong> powered by Framer Motion</li>
              <li>• <strong>Full ingredient management</strong> - mark as "already have", find alternatives</li>
              <li>• <strong>Complete instructions</strong> with step-by-step numbering</li>
              <li>• <strong>Senior-friendly design</strong> - large fonts, high contrast, easy navigation</li>
              <li>• <strong>Keyboard accessible</strong> - press ESC to close, full keyboard navigation</li>
            </ul>
          </div>
        </div>
        
        <MealPlannerV2 />
        
        <div className="mt-12 bg-white rounded-lg border shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">🧪 How to Test</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Step 1: Generate Recipes</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• Select "Mexican" cuisine (already selected)</li>
                <li>• Keep household size at 4</li>
                <li>• Keep ZIP code as 90210</li>
                <li>• Click "Generate Recipes"</li>
                <li>• Wait for beautiful recipe cards to appear</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Step 2: Test Expandable Cards</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• <strong>Click any recipe card</strong> to expand it</li>
                <li>• See full ingredients and instructions</li>
                <li>• Try the ingredient management buttons</li>
                <li>• Press ESC or click X to close</li>
                <li>• Notice smooth animations</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Step 3: Add Pricing</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• Click "Accept Plan → Shopping"</li>
                <li>• Wait for Kroger pricing to load</li>
                <li>• Click cards again to see pricing in modal</li>
                <li>• Test "Already have" buttons</li>
                <li>• Watch prices recalculate</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Step 4: Accessibility Test</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• Use Tab key to navigate</li>
                <li>• Press Enter to open cards</li>
                <li>• Press ESC to close modals</li>
                <li>• Test with screen reader</li>
                <li>• Verify high contrast text</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8 p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-800 mb-2">✅ Expected Results</h3>
            <ul className="text-green-700 space-y-1">
              <li>• Recipe cards should expand smoothly when clicked</li>
              <li>• Full ingredient lists and instructions should be visible</li>
              <li>• All interactive buttons should work (already have, alternatives, etc.)</li>
              <li>• Modal should close with ESC key or X button</li>
              <li>• Animations should be smooth and professional</li>
              <li>• Text should be large and easy to read for seniors</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}