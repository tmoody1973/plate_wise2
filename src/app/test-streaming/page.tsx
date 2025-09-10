import StreamingMealPlanner from '@/components/meal-plans/StreamingMealPlanner';

export default function TestStreamingPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🚀 Real-Time Streaming Meal Planner
          </h1>
          <p className="text-gray-600 mb-4">
            Watch recipes appear in real-time as they're discovered and extracted
          </p>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-left max-w-3xl mx-auto">
            <h3 className="font-semibold text-purple-800 mb-2">✨ Streaming Benefits:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-purple-700">
              <div>
                <p>• <strong>Instant feedback:</strong> See recipes as they're found</p>
                <p>• <strong>Real-time progress:</strong> Live status updates</p>
                <p>• <strong>No waiting:</strong> Start reviewing recipes immediately</p>
              </div>
              <div>
                <p>• <strong>Better UX:</strong> Visual progress indicators</p>
                <p>• <strong>Transparency:</strong> See exactly what's happening</p>
                <p>• <strong>Responsive:</strong> Cancel or interact while streaming</p>
              </div>
            </div>
          </div>
        </div>
        
        <StreamingMealPlanner />
      </div>
    </div>
  );
}