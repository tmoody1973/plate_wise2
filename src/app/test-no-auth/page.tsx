'use client';

import { useState } from 'react';

export default function TestNoAuthPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test: string, success: boolean, data?: any, error?: any) => {
    setResults(prev => [...prev, {
      test,
      success,
      data,
      error: error?.message || error,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const testDatabaseConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-db');
      const data = await response.json();
      
      addResult('Database Connection Test', data.success, data, data.error);
    } catch (error) {
      addResult('Database Connection Test', false, null, error);
    }
    setLoading(false);
  };

  const testAPIEndpoints = async () => {
    setLoading(true);
    
    const endpoints = [
      { name: 'User Preferences', url: '/api/user/preferences' },
      { name: 'Meal Plans List', url: '/api/meal-plans/list' },
      { name: 'User Analytics', url: '/api/user/analytics' },
      { name: 'Recipe Search', url: '/api/recipes/search?q=test' }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url);
        const data = await response.json();
        
        addResult(endpoint.name, response.ok, data, data.error);
      } catch (error) {
        addResult(endpoint.name, false, null, error);
      }
    }
    
    setLoading(false);
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Database Test (No Auth Required)</h1>
      
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">Rate Limit Bypass</h2>
        <p className="text-blue-800">
          This page tests database connectivity and API endpoints without requiring authentication.
          Some features may be limited due to Row Level Security.
        </p>
      </div>

      {/* Test Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <button
          onClick={testDatabaseConnection}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
        >
          Test Database Connection
        </button>

        <button
          onClick={testAPIEndpoints}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Test API Endpoints
        </button>
      </div>

      {/* Clear Results */}
      <div className="mb-4">
        <button
          onClick={clearResults}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Clear Results
        </button>
        {loading && (
          <span className="ml-4 text-blue-600">
            🔄 Running test...
          </span>
        )}
      </div>

      {/* Results */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Test Results</h2>
        
        {results.length === 0 ? (
          <div className="text-gray-500 italic">
            No tests run yet. Click a test button above to start.
          </div>
        ) : (
          results.map((result, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-l-4 ${
                result.success 
                  ? 'bg-green-50 border-green-500' 
                  : 'bg-red-50 border-red-500'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">
                  {result.success ? '✅' : '❌'} {result.test}
                </h3>
                <span className="text-sm text-gray-500">{result.timestamp}</span>
              </div>
              
              {result.success && result.data && (
                <div className="mt-2">
                  <strong>Data:</strong>
                  <pre className="bg-gray-100 p-2 rounded mt-1 text-sm overflow-x-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              )}
              
              {!result.success && result.error && (
                <div className="mt-2 text-red-600">
                  <strong>Error:</strong> {result.error}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Instructions */}
      <div className="mt-8 bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Next Steps:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
          <li>If database connection works, your Supabase setup is correct</li>
          <li>API endpoints may return "Authentication required" - this is expected</li>
          <li>Try the full demo at <code>/meal-plans-demo</code> with authentication</li>
          <li>Use "Try Existing Test Accounts" to bypass rate limits</li>
        </ul>
      </div>
    </div>
  );
}