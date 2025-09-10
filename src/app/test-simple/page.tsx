'use client';

import { useState } from 'react';

export default function SimpleTestPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testPipeline = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/meal-plans/test-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numberOfMeals: 1,
          culturalCuisines: ['Mexican'],
          householdSize: 4
        })
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Simple Pipeline Test</h1>
      
      <button 
        onClick={testPipeline}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test Pipeline'}
      </button>

      {result && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Results:</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}