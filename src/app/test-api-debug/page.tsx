'use client';

import { useState } from 'react';

export default function TestApiDebugPage() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const testAPI = async (endpoint: string, method: string = 'GET', body?: any) => {
    setLoading(true);
    const startTime = Date.now();
    
    try {
      const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      
      if (body) {
        options.body = JSON.stringify(body);
      }
      
      const response = await fetch(endpoint, options);
      const endTime = Date.now();
      
      // Get response details
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      
      let responseData;
      let error = null;
      
      try {
        if (isJson) {
          responseData = await response.json();
        } else {
          responseData = await response.text();
          error = 'Response is not JSON';
        }
      } catch (parseError) {
        error = `JSON Parse Error: ${parseError}`;
        responseData = await response.text();
      }
      
      const result = {
        endpoint,
        method,
        status: response.status,
        statusText: response.statusText,
        contentType,
        isJson,
        duration: endTime - startTime,
        success: response.ok && !error,
        error,
        data: responseData,
        timestamp: new Date().toISOString()
      };
      
      setResults(prev => [result, ...prev]);
      
    } catch (networkError) {
      const result = {
        endpoint,
        method,
        status: 0,
        statusText: 'Network Error',
        contentType: null,
        isJson: false,
        duration: Date.now() - startTime,
        success: false,
        error: `Network Error: ${networkError}`,
        data: null,
        timestamp: new Date().toISOString()
      };
      
      setResults(prev => [result, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const testRecipesAPI = () => {
    testAPI('/api/meal-plans/recipes-only', 'POST', {
      culturalCuisines: ['mexican'],
      dietaryRestrictions: [],
      householdSize: 4,
      timeFrame: 'week'
    });
  };

  const testPricingAPI = () => {
    // Test with minimal recipe data
    const testRecipes = [{
      id: 'test-recipe',
      title: 'Test Recipe',
      ingredients: [
        { id: '1', name: 'chicken breast', amount: '1', unit: 'lb' },
        { id: '2', name: 'rice', amount: '1', unit: 'cup' }
      ],
      metadata: { servings: 4 }
    }];
    
    testAPI('/api/meal-plans/add-pricing', 'POST', {
      recipes: testRecipes,
      zipCode: '90210'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">🔧 API Debug Tool</h1>
        
        <div className="bg-white rounded-lg border shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test API Endpoints</h2>
          <div className="flex gap-4">
            <button
              onClick={testRecipesAPI}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Recipes API'}
            </button>
            
            <button
              onClick={testPricingAPI}
              disabled={loading}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Pricing API'}
            </button>
            
            <button
              onClick={() => setResults([])}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700"
            >
              Clear Results
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {results.map((result, index) => (
            <div key={index} className={`bg-white rounded-lg border shadow-sm p-6 ${
              result.success ? 'border-green-200' : 'border-red-200'
            }`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">
                    {result.method} {result.endpoint}
                  </h3>
                  <p className="text-sm text-gray-600">{result.timestamp}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  result.success 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {result.success ? '✅ Success' : '❌ Failed'}
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                <div>
                  <span className="font-medium">Status:</span> {result.status} {result.statusText}
                </div>
                <div>
                  <span className="font-medium">Content-Type:</span> {result.contentType || 'None'}
                </div>
                <div>
                  <span className="font-medium">Duration:</span> {result.duration}ms
                </div>
                <div>
                  <span className="font-medium">JSON:</span> {result.isJson ? 'Yes' : 'No'}
                </div>
              </div>
              
              {result.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-red-800 mb-2">Error:</h4>
                  <p className="text-red-700 text-sm">{result.error}</p>
                </div>
              )}
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-2">Response Data:</h4>
                <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
                  {typeof result.data === 'string' 
                    ? result.data.substring(0, 1000) + (result.data.length > 1000 ? '...' : '')
                    : JSON.stringify(result.data, null, 2)
                  }
                </pre>
              </div>
            </div>
          ))}
        </div>
        
        {results.length === 0 && (
          <div className="bg-white rounded-lg border shadow-sm p-8 text-center">
            <p className="text-gray-600">No API tests run yet. Click a button above to test an endpoint.</p>
          </div>
        )}
      </div>
    </div>
  );
}