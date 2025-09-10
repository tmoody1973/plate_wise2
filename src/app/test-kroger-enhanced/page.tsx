import KrogerEnhancedMealPlanTest from '@/components/meal-plans/KrogerEnhancedMealPlanTest';

export default function TestKrogerEnhancedPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🚀 Kroger Enhanced Meal Planner
          </h1>
          <p className="text-gray-600 mb-4">
            Complete meal planning with real recipe discovery and Kroger grocery pricing
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left max-w-3xl mx-auto">
            <h3 className="font-semibold text-green-800 mb-2">🎯 Complete Integration Features:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-green-700">
              <div>
                <p>• Real recipe discovery with Perplexity AI</p>
                <p>• Live Kroger pricing for all ingredients</p>
                <p>• Cultural authenticity preservation</p>
                <p>• Budget optimization & analysis</p>
              </div>
              <div>
                <p>• Consolidated shopping lists by store</p>
                <p>• Sale detection & savings opportunities</p>
                <p>• Cost per serving calculations</p>
                <p>• Dietary restriction compliance</p>
              </div>
            </div>
          </div>
        </div>
        
        <KrogerEnhancedMealPlanTest />
      </div>
    </div>
  );
}