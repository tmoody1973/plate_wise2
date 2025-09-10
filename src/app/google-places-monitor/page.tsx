'use client';

import { useState, useEffect } from 'react';

interface UsageStats {
  endpoint: string;
  count: number;
  estimatedCost: number;
  costFormatted: string;
  lastUsed: Date;
  lastUsedFormatted: string;
}

interface MonitorData {
  summary?: {
    totalRequests: number;
    totalEstimatedCost: number;
    totalCostFormatted: string;
    endpointCount: number;
    mostExpensive?: UsageStats;
    mostUsed?: UsageStats;
  };
  endpoints?: UsageStats[];
  recommendations?: string[];
  pricing?: Record<string, number>;
}

export default function GooglePlacesMonitorPage() {
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsageData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/debug/google-places-monitor?action=summary');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const resetStats = async () => {
    if (!confirm('Are you sure you want to reset all usage statistics?')) {
      return;
    }

    try {
      const response = await fetch('/api/debug/google-places-monitor?reset=true');
      if (response.ok) {
        await fetchUsageData();
      }
    } catch (err) {
      setError('Failed to reset statistics');
    }
  };

  useEffect(() => {
    fetchUsageData();
    // Removed continuous polling - now only loads on mount and manual refresh
  }, []);

  const getCostColor = (cost: number) => {
    if (cost > 5) return 'text-red-600 bg-red-50 border-red-200';
    if (cost > 1) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">📍 Google Places API Monitor</h1>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
              <p className="text-green-800 text-sm">
                ✅ <strong>Cost Optimized:</strong> This monitor now loads data on-demand only (no continuous polling)
              </p>
            </div>
            <div className="space-x-3">
              <button
                onClick={fetchUsageData}
                disabled={loading}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                onClick={resetStats}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Reset Stats
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              <strong>Error:</strong> {error}
            </div>
          )}

          {data?.summary && (
            <>
              {/* Cost Summary */}
              <div className={`p-6 rounded-lg border mb-6 ${getCostColor(data.summary.totalEstimatedCost)}`}>
                <h2 className="text-2xl font-bold mb-4">💰 Cost Summary</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-2xl font-bold">{data.summary.totalCostFormatted}</div>
                    <div className="text-sm opacity-75">Total Estimated Cost</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{data.summary.totalRequests}</div>
                    <div className="text-sm opacity-75">Total Requests</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{data.summary.endpointCount}</div>
                    <div className="text-sm opacity-75">Endpoints Used</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      ${(data.summary.totalEstimatedCost / data.summary.totalRequests * 1000).toFixed(2)}
                    </div>
                    <div className="text-sm opacity-75">Cost per 1K requests</div>
                  </div>
                </div>
              </div>

              {/* Most Expensive & Most Used */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {data.summary.mostExpensive && (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <h3 className="font-semibold text-red-800 mb-2">💸 Most Expensive Endpoint</h3>
                    <div className="text-red-700">
                      <div className="font-medium">{data.summary.mostExpensive.endpoint}</div>
                      <div className="text-sm">
                        {data.summary.mostExpensive.count} requests • {data.summary.mostExpensive.costFormatted}
                      </div>
                    </div>
                  </div>
                )}

                {data.summary.mostUsed && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-800 mb-2">📊 Most Used Endpoint</h3>
                    <div className="text-blue-700">
                      <div className="font-medium">{data.summary.mostUsed.endpoint}</div>
                      <div className="text-sm">
                        {data.summary.mostUsed.count} requests • {data.summary.mostUsed.costFormatted}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Detailed Breakdown */}
              {data.endpoints && data.endpoints.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-4">📋 Detailed Usage Breakdown</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left">Endpoint</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Requests</th>
                          <th className="border border-gray-300 px-4 py-2 text-right">Est. Cost</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Last Used</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.endpoints.map((endpoint, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-4 py-2 font-mono text-sm">
                              {endpoint.endpoint}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-right">
                              {endpoint.count}
                            </td>
                            <td className={`border border-gray-300 px-4 py-2 text-right font-semibold ${
                              endpoint.estimatedCost > 1 ? 'text-red-600' : 
                              endpoint.estimatedCost > 0.1 ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {endpoint.costFormatted}
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">
                              {endpoint.lastUsedFormatted}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {data.recommendations && data.recommendations.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-4">💡 Cost Optimization Recommendations</h2>
                  <div className="space-y-2">
                    {data.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg">
                        <span className="text-blue-500 mt-1">💡</span>
                        <span className="text-blue-800 text-sm">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing Reference */}
              {data.pricing && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h2 className="text-xl font-semibold mb-4">💵 Google Places API Pricing Reference</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    {Object.entries(data.pricing).map(([endpoint, price]) => (
                      <div key={endpoint} className="bg-white p-3 rounded border">
                        <div className="font-mono text-xs text-gray-600">{endpoint}</div>
                        <div className="font-semibold">${price.toFixed(3)} per request</div>
                        <div className="text-xs text-gray-500">${(price * 1000).toFixed(2)} per 1K</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {(!data?.summary || data.summary.totalRequests === 0) && !loading && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-6xl mb-4">📍</div>
              <h2 className="text-xl font-semibold mb-2">No Google Places API Usage Detected</h2>
              <p className="text-gray-600 mb-4">
                Usage will appear here when Google Places API calls are made.
              </p>
              <div className="bg-blue-50 p-4 rounded-lg text-left max-w-md mx-auto">
                <h3 className="font-semibold text-blue-800 mb-2">🔍 To Start Monitoring:</h3>
                <ol className="text-blue-700 text-sm space-y-1 list-decimal list-inside">
                  <li>Use any feature that searches for stores</li>
                  <li>Try the store finder or location services</li>
                  <li>Usage will be tracked automatically</li>
                  <li>Refresh this page to see updated stats</li>
                </ol>
              </div>
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="mt-2 text-gray-600">Loading usage statistics...</p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-8 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h3 className="font-semibold text-yellow-800 mb-2">⚡ Quick Cost Control Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white p-3 rounded border">
                <h4 className="font-medium mb-1">🛑 Emergency Stop</h4>
                <p className="text-gray-600 mb-2">Remove API key from .env.local</p>
                <code className="text-xs bg-gray-100 p-1 rounded">GOOGLE_PLACES_API_KEY=</code>
              </div>
              
              <div className="bg-white p-3 rounded border">
                <h4 className="font-medium mb-1">💾 Enable Caching</h4>
                <p className="text-gray-600 mb-2">Cache results for 24 hours</p>
                <code className="text-xs bg-gray-100 p-1 rounded">CACHE_TTL=86400</code>
              </div>
              
              <div className="bg-white p-3 rounded border">
                <h4 className="font-medium mb-1">🔒 Rate Limiting</h4>
                <p className="text-gray-600 mb-2">Limit requests per minute</p>
                <code className="text-xs bg-gray-100 p-1 rounded">MAX_REQUESTS_PER_MIN=10</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}