'use client';

import { useState } from 'react';
import DatabaseMealPlanCreator from '@/components/meal-plans/DatabaseMealPlanCreator';
import MealPlanDashboard from '@/components/meal-plans/MealPlanDashboard';
import TestAuth from '@/components/auth/TestAuth';
import MockUserStatus from '@/components/auth/MockUserStatus';

type ActiveTab = 'dashboard' | 'create' | 'test';

export default function MealPlansDemoPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const tabs = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: '📊' },
    { id: 'create' as ActiveTab, label: 'Create Plan', icon: '➕' },
    { id: 'test' as ActiveTab, label: 'API Tests', icon: '🧪' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            PlateWise Meal Planning Demo
          </h1>
          <p className="text-gray-600 mt-1">
            Test the complete meal planning system with database integration
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="py-8">
        <div className="max-w-6xl mx-auto px-6">
          <MockUserStatus />
          <TestAuth>
            {activeTab === 'dashboard' && <MealPlanDashboard />}
            {activeTab === 'create' && <DatabaseMealPlanCreator />}
            {activeTab === 'test' && <APITestSection />}
          </TestAuth>
        </div>
      </div>
    </div>
  );
}

function APITestSection() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    setLoading(true);
    const startTime = Date.now();
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      setTestResults(prev => [...prev, {
        name: testName,
        success: true,
        result,
        duration,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      setTestResults(prev => [...prev, {
        name: testName,
        success: false,
        error: error.message,
        duration,
        timestamp: new Date().toLocaleTimeString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const tests = [
    {
      name: 'User Preferences API',
      description: 'Test getting and updating user preferences',
      run: async () => {
        const response = await fetch('/api/user/preferences');
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        return data;
      }
    },
    {
      name: 'Meal Plans List API',
      description: 'Test fetching user meal plans',
      run: async () => {
        const response = await fetch('/api/meal-plans/list');
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        return data;
      }
    },
    {
      name: 'User Analytics API',
      description: 'Test user analytics and statistics',
      run: async () => {
        const response = await fetch('/api/user/analytics');
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        return data;
      }
    },
    {
      name: 'Recipe Search API',
      description: 'Test searching user recipes',
      run: async () => {
        const response = await fetch('/api/recipes/search?q=mediterranean');
        const data = await response.json();
        if (!data.success) throw new Error(data.error);
        return data;
      }
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6">API Test Suite</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {tests.map((test, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold mb-2">{test.name}</h3>
              <p className="text-sm text-gray-600 mb-3">{test.description}</p>
              <button
                onClick={() => runTest(test.name, test.run)}
                disabled={loading}
                className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Running...' : 'Run Test'}
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Test Results</h3>
          <button
            onClick={() => setTestResults([])}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Clear Results
          </button>
        </div>

        <div className="space-y-3">
          {testResults.length === 0 ? (
            <div className="text-gray-500 italic text-center py-8">
              No tests run yet. Click a test button above to start.
            </div>
          ) : (
            testResults.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  result.success 
                    ? 'bg-green-50 border-green-500' 
                    : 'bg-red-50 border-red-500'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">
                    {result.success ? '✅' : '❌'} {result.name}
                  </h4>
                  <div className="text-sm text-gray-500">
                    {result.timestamp} ({result.duration}ms)
                  </div>
                </div>
                
                {result.success ? (
                  <div className="text-sm">
                    <div className="text-green-700 mb-2">
                      Test passed successfully
                    </div>
                    <details className="text-gray-600">
                      <summary className="cursor-pointer hover:text-gray-800">
                        View Response Data
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                        {JSON.stringify(result.result, null, 2)}
                      </pre>
                    </details>
                  </div>
                ) : (
                  <div className="text-sm text-red-700">
                    <strong>Error:</strong> {result.error}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}