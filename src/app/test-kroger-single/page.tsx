import KrogerSingleTest from '@/components/meal-plans/KrogerSingleTest';
import KrogerTestSummary from '@/components/meal-plans/KrogerTestSummary';

export default function TestKrogerSinglePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Kroger API Testing Suite
          </h1>
          <p className="text-gray-600">
            Test the Kroger API with single ingredients or run comprehensive tests
          </p>
        </div>
        
        <div className="space-y-12">
          <KrogerTestSummary />
          
          <div className="border-t pt-8">
            <h2 className="text-xl font-semibold text-center mb-6">Single Ingredient Test</h2>
            <KrogerSingleTest />
          </div>
        </div>
      </div>
    </div>
  );
}