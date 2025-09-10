'use client';

import React, { useState, useEffect } from 'react';
import { googlePlacesService } from '@/lib/external-apis/google-places-service';

interface OptimizationStats {
  requestCount: number;
  dailyCost: number;
  monthlyCost: number;
  emergencyMode: boolean;
  cacheStats: {
    searchCache: number;
    detailsCache: number;
    validationCache: number;
  };
  costBreakdown: Record<string, { count: number; cost: number }>;
}

export default function GooglePlacesOptimizer() {
  const [stats, setStats] = useState<OptimizationStats | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [testResults, setTestResults] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
    // Removed continuous polling - now only loads on mount and manual refresh
  }, []);

  const loadStats = () => {
    try {
      const usageStats = googlePlacesService.getUsageStats();
      const optimizationRecs = googlePlacesService.getOptimizationRecommendations();
      const cacheInfo = googlePlacesService.getCacheStats();
      
      setStats(usageStats);
      setRecommendations(optimizationRecs);
      setCacheStats(cacheInfo);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleEmergencyToggle = () => {
    if (stats?.emergencyMode) {
      googlePlacesService.disableEmergencyMode();
    } else {
      googlePlacesService.enableEmergencyMode('Manual activation');
    }
    loadStats();
  };

  const handleClearCache = () => {
    googlePlacesService.clearAllCaches();
    loadStats();
  };

  const runOptimizationTest = async () => {
    setTestResults([]);
    const testLocation = { lat: 33.7490, lng: -84.3880 }; // Atlanta
    
    const tests = [
      {
        name: 'Cached Search Test',
        test: () => googlePlacesService.searchStores('Kroger', testLocation)
      },
      {
        name: 'Debounced Search Test', 
        test: () => googlePlacesService.debouncedSearch('Whole Foods', testLocation, 100)
      },
      {
        name: 'Nearby Stores Test',
        test: () => googlePlacesService.findNearbyGroceryStores(testLocation, 5000)
      }
    ];

    for (const test of tests) {
      const startTime = Date.now();
      try {
        const result = await test.test();
        const endTime = Date.now();
        
        setTestResults(prev => [...prev, {
          name: test.name,
          success: true,
          duration: endTime - startTime,
          resultCount: result.length,
          cached: result.length > 0 && result[0].id?.startsWith('static_')
        }]);
      } catch (error) {
        setTestResults(prev => [...prev, {
          name: test.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }]);
      }
    }
  };

  if (!stats) {
    return <div className="p-4">Loading optimization stats...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
          🚀 Google Places API Optimizer
          {stats.emergencyMode && (
            <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
              🚨 EMERGENCY MODE
            </span>
          )}
        </h1>
        
        {/* Cost Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-yellow-600">⚠️</span>
            <h3 className="font-semibold text-yellow-800">Cost Control Notice</h3>
          </div>
          <p className="text-yellow-700 text-sm">
            This page now loads data <strong>on-demand only</strong> to prevent continuous API costs. 
            Use the "Refresh" button to update statistics manually.
          </p>
        </div>
        
        {/* Cost Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800">Daily Cost</h3>
            <p className="text-2xl font-bold text-blue-600">
              ${stats.dailyCost.toFixed(4)}
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-800">Monthly Cost</h3>
            <p className="text-2xl font-bold text-green-600">
              ${stats.monthlyCost.toFixed(2)}
            </p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-800">Requests Today</h3>
            <p className="text-2xl font-bold text-purple-600">
              {stats.requestCount}
            </p>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="font-semibold text-orange-800">Cache Entries</h3>
            <p className="text-2xl font-bold text-orange-600">
              {stats.cacheStats.searchCache + stats.cacheStats.detailsCache + stats.cacheStats.validationCache}
            </p>
          </div>
        </div>

        {/* Cache Statistics */}
        {cacheStats && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold mb-2">📊 Cache Performance</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Entries:</span>
                <span className="ml-2 font-semibold">{cacheStats.totalEntries}</span>
              </div>
              <div>
                <span className="text-gray-600">Memory Usage:</span>
                <span className="ml-2 font-semibold">{cacheStats.memoryUsage}</span>
              </div>
              <div>
                <span className="text-gray-600">Hit Rate:</span>
                <span className="ml-2 font-semibold">{(cacheStats.hitRate * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-gray-600">Search Cache:</span>
                <span className="ml-2 font-semibold">{stats.cacheStats.searchCache}</span>
              </div>
            </div>
          </div>
        )}

        {/* Emergency Controls */}
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-red-800 mb-2">🚨 Emergency Controls</h3>
          <div className="flex gap-4">
            <button
              onClick={handleEmergencyToggle}
              className={`px-4 py-2 rounded font-semibold ${
                stats.emergencyMode
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {stats.emergencyMode ? '✅ Disable Emergency Mode' : '🚨 Enable Emergency Mode'}
            </button>
            
            <button
              onClick={handleClearCache}
              className="px-4 py-2 bg-gray-600 text-white rounded font-semibold hover:bg-gray-700"
            >
              🧹 Clear All Caches
            </button>
          </div>
          <p className="text-sm text-red-600 mt-2">
            Emergency mode blocks all API calls and uses fallback data only.
          </p>
        </div>

        {/* Optimization Recommendations */}
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-yellow-800 mb-2">💡 Optimization Recommendations</h3>
          <ul className="space-y-1 text-sm">
            {recommendations.map((rec, index) => (
              <li key={index} className="text-yellow-700">{rec}</li>
            ))}
          </ul>
        </div>

        {/* Test Suite */}
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-blue-800">🧪 Optimization Tests</h3>
            <button
              onClick={runOptimizationTest}
              className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
            >
              Run Tests
            </button>
          </div>
          
          {testResults.length > 0 && (
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded border ${
                    result.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">
                      {result.success ? '✅' : '❌'} {result.name}
                    </span>
                    {result.success && (
                      <div className="text-sm text-gray-600">
                        {result.duration}ms • {result.resultCount} results
                        {result.cached && <span className="ml-2 text-blue-600">📦 Cached</span>}
                      </div>
                    )}
                  </div>
                  {result.error && (
                    <p className="text-sm text-red-600 mt-1">{result.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}