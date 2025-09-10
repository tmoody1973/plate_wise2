import SmartMealPlanCreator from '@/components/meal-plans/SmartMealPlanCreator';

export default function TestPerplexityAPIPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🧪 Perplexity API Test Lab
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Test real Perplexity AI recipe generation without authentication. 
            Perfect for API testing and development.
          </p>
          <div className="mt-4 p-4 bg-purple-100 rounded-lg inline-block">
            <p className="text-purple-800 text-sm">
              <strong>What this tests:</strong> Direct Perplexity AI integration using the "sonar" model
            </p>
          </div>
        </div>
        <SmartMealPlanCreator />
      </div>
    </div>
  );
}