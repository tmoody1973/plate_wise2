'use client';

import { useState, useEffect } from 'react';

interface APIStatus {
  name: string;
  status: 'working' | 'error' | 'not_configured';
  message: string;
  details?: any;
}

interface APIStatusResponse {
  summary: {
    total: number;
    working: number;
    errors: number;
    notConfigured: number;
    overallStatus: string;
  };
  apis: APIStatus[];
  timestamp: string;
  recommendations: string[];
}

export default function APIStatusPage() {
  const [statusData, setStatusData] = useState<APIStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkAPIStatus = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/debug/api-status');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setStatusData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAPIStatus();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working': return 'bg-green-100 text-green-800 border-green-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'not_configured': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'working': return '✅';
      case 'error': return '❌';
      case 'not_configured': return '⚠️';
      default: return '❓';
    }
  };

  const getSummaryColor = (overallStatus: string) => {
    switch (overallStatus) {
      case 'partial': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'errors': return 'bg-red-100 text-red-800 border-red-200';
      case 'none_configured': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">API Status Dashboard</h1>
            <button
              onClick={checkAPIStatus}
              disabled={isLoading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? 'Checking...' : 'Refresh Status'}
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              <strong>Error:</strong> {error}
            </div>
          )}

          {statusData && (
            <>
              {/* Summary */}
              <div className={`p-4 rounded-lg border mb-6 ${getSummaryColor(statusData.summary.overallStatus)}`}>
                <h2 className="text-xl font-semibold mb-2">Overall Status</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Total APIs:</span> {statusData.summary.total}
                  </div>
                  <div>
                    <span className="font-medium">Working:</span> {statusData.summary.working}
                  </div>
                  <div>
                    <span className="font-medium">Errors:</span> {statusData.summary.errors}
                  </div>
                  <div>
                    <span className="font-medium">Not Configured:</span> {statusData.summary.notConfigured}
                  </div>
                </div>
                <p className="mt-2 text-sm">
                  <strong>Status:</strong> {statusData.summary.overallStatus.replace('_', ' ').toUpperCase()}
                </p>
              </div>

              {/* Individual API Status */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-4">Individual API Status</h2>
                <div className="grid gap-4">
                  {statusData.apis.map((api, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${getStatusColor(api.status)}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-xl">{getStatusIcon(api.status)}</span>
                          <div>
                            <h3 className="font-semibold">{api.name}</h3>
                            <p className="text-sm">{api.message}</p>
                          </div>
                        </div>
                        <span className="text-xs font-medium uppercase">
                          {api.status.replace('_', ' ')}
                        </span>
                      </div>
                      
                      {api.details && (
                        <div className="mt-3 p-2 bg-white bg-opacity-50 rounded text-xs">
                          <strong>Details:</strong>
                          <pre className="mt-1 whitespace-pre-wrap">
                            {JSON.stringify(api.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              {statusData.recommendations.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-4">Recommendations</h2>
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <ul className="space-y-2">
                      {statusData.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-blue-500 mt-1">💡</span>
                          <span className="text-blue-800 text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <a
                    href="/smart-meal-planner"
                    className="block p-3 bg-green-500 text-white rounded text-center hover:bg-green-600"
                  >
                    🚀 Smart Meal Planner
                    <div className="text-xs mt-1">Auto-fallback system</div>
                  </a>
                  
                  <a
                    href="/production-meal-planner"
                    className="block p-3 bg-blue-500 text-white rounded text-center hover:bg-blue-600"
                  >
                    🔧 Production Mode
                    <div className="text-xs mt-1">Real APIs only</div>
                  </a>
                  
                  <a
                    href="/meal-plans-demo"
                    className="block p-3 bg-purple-500 text-white rounded text-center hover:bg-purple-600"
                  >
                    📊 Dashboard
                    <div className="text-xs mt-1">View meal plans</div>
                  </a>
                </div>
              </div>

              {/* Timestamp */}
              <div className="mt-6 text-center text-sm text-gray-500">
                Last checked: {new Date(statusData.timestamp).toLocaleString()}
              </div>
            </>
          )}

          {isLoading && !statusData && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-gray-600">Checking API status...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}