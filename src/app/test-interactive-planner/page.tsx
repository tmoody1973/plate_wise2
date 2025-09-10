import InteractiveMealPlanner from '@/components/meal-plans/InteractiveMealPlanner';

export default function TestInteractivePlannerPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🎯 Interactive Meal Planner
          </h1>
          <p className="text-gray-600 mb-4">
            Fast recipe discovery with user-controlled pricing and ingredient substitution
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left max-w-3xl mx-auto">
            <h3 className="font-semibold text-green-800 mb-2">✨ Improved User Experience:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-green-700">
              <div>
                <p>• <strong>Step 1:</strong> Fast recipe generation (5-10 seconds)</p>
                <p>• <strong>Step 2:</strong> User-controlled pricing with button</p>
                <p>• <strong>Step 3:</strong> Search & substitute any ingredient</p>
              </div>
              <div>
                <p>• Real-time ingredient alternatives from Kroger</p>
                <p>• Compare prices and brands before substituting</p>
                <p>• See sale prices and savings opportunities</p>
              </div>
            </div>
          </div>
        </div>
        
        <InteractiveMealPlanner />
      </div>
    </div>
  );
}