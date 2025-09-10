'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface MealPlanFormData {
  name: string;
  description: string;
  culturalCuisines: string[];
  dietaryRestrictions: string[];
  budgetLimit: number;
  householdSize: number;
  zipCode: string;
  timeFrame: string;
  numberOfMeals: number;
}

interface StreamEvent {
  type: string;
  data: any;
  timestamp: Date;
}

interface APIStatus {
  name: string;
  status: 'working' | 'error' | 'not_configured';
  message: string;
}

const CULTURAL_CUISINES = [
  'mediterranean', 'asian', 'mexican', 'indian', 'italian', 'french',
  'middle-eastern', 'african', 'caribbean', 'latin-american', 'international'
];

const DIETARY_RESTRICTIONS = [
  'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free',
  'low-carb', 'keto', 'paleo', 'halal', 'kosher'
];

const TIME_FRAMES = [
  { value: 'week', label: '1 Week (7 meals)' },
  { value: '3-days', label: '3 Days (3 meals)' },
  { value: '5-days', label: '5 Days (5 meals)' },
  { value: 'weekend', label: 'Weekend (2 meals)' }
];

export default function SmartMealPlanCreator() {
  const [user, setUser] = useState<any>(null);
  const [apiStatus, setApiStatus] = useState<APIStatus[]>([]);
  const [isCheckingAPIs, setIsCheckingAPIs] = useState(false);
  const [recommendedMode, setRecommendedMode] = useState<'production' | 'offline'>('offline');
  
  const [formData, setFormData] = useState<MealPlanFormData>({
    name: '',
    description: '',
    culturalCuisines: ['mediterranean'],
    dietaryRestrictions: [],
    budgetLimit: 50,
    householdSize: 4,
    zipCode: '',
    timeFrame: 'week',
    numberOfMeals: 6
  });
  
  const [isCreating, setIsCreating] = useState(false);
  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);
  const [createdMealPlan, setCreatedMealPlan] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 4 });
  const [selectedMode, setSelectedMode] = useState<'production' | 'offline' | 'perplexity' | 'simple-perplexity'>('offline');

  const supabase = createClientComponentClient();

  useEffect(() => {
    checkUser();
    checkAPIStatus();
  }, []);

  useEffect(() => {
    // Update number of meals based on time frame
    const mealCounts = {
      'week': 7,
      '3-days': 3,
      '5-days': 5,
      'weekend': 2
    };
    setFormData(prev => ({
      ...prev,
      numberOfMeals: mealCounts[formData.timeFrame as keyof typeof mealCounts] || 6
    }));
  }, [formData.timeFrame]);

  const checkUser = async () => {
    // Check for mock user first
    const mockUser = localStorage.getItem('mockUser');
    if (mockUser) {
      setUser(JSON.parse(mockUser));
      return;
    }

    // Fall back to Supabase auth
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const createMockUser = () => {
    const newMockUser = {
      id: `mock-user-${Date.now()}`,
      email: `test${Date.now()}@platewise.local`,
      created_at: new Date().toISOString(),
      isMockUser: true
    };

    localStorage.setItem('mockUser', JSON.stringify(newMockUser));
    setUser(newMockUser);
  };

  const checkAPIStatus = async () => {
    setIsCheckingAPIs(true);
    try {
      const response = await fetch('/api/debug/api-status');
      if (response.ok) {
        const data = await response.json();
        setApiStatus(data.apis);
        
        // Determine recommended mode based on API status
        const workingAPIs = data.apis.filter((api: APIStatus) => api.status === 'working');
        const hasPerplexity = workingAPIs.some((api: APIStatus) => api.name === 'Perplexity AI');
        
        if (hasPerplexity) {
          setRecommendedMode('production');
          setSelectedMode('production');
        } else {
          setRecommendedMode('offline');
          setSelectedMode('offline');
        }
      }
    } catch (error) {
      console.error('Failed to check API status:', error);
      setRecommendedMode('offline');
      setSelectedMode('offline');
    } finally {
      setIsCheckingAPIs(false);
    }
  };

  const handleInputChange = (field: keyof MealPlanFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleArrayItem = (field: 'culturalCuisines' | 'dietaryRestrictions', item: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item]
    }));
  };

  const createMealPlan = async () => {
    if (!formData.name.trim()) {
      setError('Please enter a meal plan name');
      return;
    }

    setIsCreating(true);
    setStreamEvents([]);
    setCreatedMealPlan(null);
    setError(null);
    setCurrentStep('Starting...');
    setProgress({ current: 0, total: 4 });

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Add mock user header if using mock authentication (only for production mode)
      if (selectedMode === 'production' && user?.isMockUser) {
        headers['x-mock-user'] = JSON.stringify(user);
      }

      // Choose endpoint based on selected mode
      let endpoint: string;
      if (selectedMode === 'production') {
        endpoint = '/api/meal-plans/create-production';
      } else if (selectedMode === 'perplexity') {
        endpoint = '/api/meal-plans/create-perplexity';
      } else if (selectedMode === 'simple-perplexity') {
        endpoint = '/api/meal-plans/create-simple-perplexity';
      } else {
        endpoint = '/api/meal-plans/create-simple';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        // If production mode fails, automatically try offline mode
        if (selectedMode === 'production') {
          console.log('Production mode failed, falling back to Perplexity test mode...');
          setSelectedMode('perplexity');
          setCurrentStep('Production APIs failed, switching to Perplexity test mode...');
          
          const perplexityResponse = await fetch('/api/meal-plans/create-perplexity', {
            method: 'POST',
            headers,
            body: JSON.stringify(formData)
          });
          
          if (!perplexityResponse.ok) {
            const errorData = await perplexityResponse.json();
            throw new Error(errorData.error || 'Both production and Perplexity modes failed');
          }
          
          // Process Perplexity response
          await processStreamingResponse(perplexityResponse);
          return;
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create meal plan');
        }
      }

      await processStreamingResponse(response);

    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const processStreamingResponse = async (response: Response) => {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('event: ') || line.startsWith('data: ')) {
            try {
              if (line.startsWith('data: ')) {
                const eventData = JSON.parse(line.slice(6));
                const newEvent: StreamEvent = {
                  type: 'data',
                  data: eventData,
                  timestamp: new Date()
                };
                
                setStreamEvents(prev => [...prev, newEvent]);

                // Update progress and current step
                if (eventData.step && eventData.total) {
                  setProgress({ current: eventData.step, total: eventData.total });
                }
                
                if (eventData.message) {
                  setCurrentStep(eventData.message);
                }

                // Check for completion
                if (eventData.mealPlan) {
                  setCreatedMealPlan(eventData.mealPlan);
                }
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getAPIStatusColor = (status: string) => {
    switch (status) {
      case 'working': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'not_configured': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getAPIStatusIcon = (status: string) => {
    switch (status) {
      case 'working': return '✅';
      case 'error': return '❌';
      case 'not_configured': return '⚠️';
      default: return '❓';
    }
  };

  // Show auth prompt only if user wants production mode and isn't authenticated
  const needsAuth = selectedMode === 'production' && !user;
  
  if (needsAuth) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Smart Meal Planner</h2>
        <p className="text-gray-600 mb-4">
          Production mode requires authentication for database access.
        </p>
        <button
          onClick={createMockUser}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 mb-3"
        >
          Create Test User (for Production Mode)
        </button>
        <button
          onClick={() => setSelectedMode('perplexity')}
          className="w-full bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600 mb-2"
        >
          Use Perplexity Test Mode (Real Recipes, No Auth)
        </button>
        <button
          onClick={() => setSelectedMode('offline')}
          className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
        >
          Use Offline Mode (Local Database, No Auth)
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-6">Smart Meal Plan Creator</h1>
        
        {/* User Info */}
        {user && (
          <div className="bg-green-50 p-4 rounded-lg mb-6">
            <p className="text-green-800">
              ✅ Signed in as: {user.email}
              {user.isMockUser && <span className="ml-2 text-sm">(Mock User)</span>}
            </p>
          </div>
        )}
        
        {!user && selectedMode === 'offline' && (
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <p className="text-blue-800">
              ℹ️ Offline mode - No authentication required
            </p>
          </div>
        )}

        {selectedMode === 'perplexity' && (
          <div className="bg-purple-50 p-4 rounded-lg mb-6">
            <p className="text-purple-800">
              🧪 Perplexity Test mode - Full AI service
              {user ? ' (will save to database)' : ' (temporary only - sign in to save)'}
            </p>
          </div>
        )}

        {!user && selectedMode === 'simple-perplexity' && (
          <div className="bg-indigo-50 p-4 rounded-lg mb-6">
            <p className="text-indigo-800">
              🔧 Simple Perplexity mode - Direct API test, no authentication required
            </p>
          </div>
        )}

        {/* API Status */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-blue-800">🔍 API Status Check</h3>
            <button
              onClick={checkAPIStatus}
              disabled={isCheckingAPIs}
              className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isCheckingAPIs ? 'Checking...' : 'Refresh'}
            </button>
          </div>
          <p className="text-xs text-blue-600 mb-2">
            Production mode only needs Perplexity AI - no webscraping required!
          </p>
          
          {apiStatus.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {apiStatus.map((api, index) => (
                <div key={index} className={`flex items-center space-x-2 ${getAPIStatusColor(api.status)}`}>
                  <span>{getAPIStatusIcon(api.status)}</span>
                  <span className="font-medium">{api.name}:</span>
                  <span>{api.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-blue-700 text-sm">Click "Refresh" to check API status</p>
          )}
        </div>

        {/* Mode Selection */}
        <div className="bg-yellow-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-yellow-800 mb-3">🎯 Meal Planning Mode</h3>
          <div className="space-y-3">
            <label className="flex items-center space-x-3">
              <input
                type="radio"
                name="mode"
                value="production"
                checked={selectedMode === 'production'}
                onChange={(e) => setSelectedMode(e.target.value as 'production' | 'offline' | 'perplexity')}
                className="text-blue-500"
              />
              <div>
                <span className="font-medium">Production Mode</span>
                <span className="ml-2 text-sm text-gray-600">
                  (Perplexity AI + Database + optional Kroger pricing)
                </span>
                {recommendedMode !== 'production' && (
                  <div className="text-xs text-red-600 mt-1">
                    ⚠️ Requires authentication - will auto-fallback to offline mode
                  </div>
                )}
              </div>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="radio"
                name="mode"
                value="perplexity"
                checked={selectedMode === 'perplexity'}
                onChange={(e) => setSelectedMode(e.target.value as 'production' | 'offline' | 'perplexity' | 'simple-perplexity')}
                className="text-purple-500"
              />
              <div>
                <span className="font-medium">Perplexity Test Mode</span>
                <span className="ml-2 text-sm text-gray-600">
                  (Complex Perplexity AI service - No auth required)
                </span>
                <div className="text-xs text-purple-600 mt-1">
                  🧪 Full Perplexity service with all features
                </div>
              </div>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="radio"
                name="mode"
                value="simple-perplexity"
                checked={selectedMode === 'simple-perplexity'}
                onChange={(e) => setSelectedMode(e.target.value as 'production' | 'offline' | 'perplexity' | 'simple-perplexity')}
                className="text-indigo-500"
              />
              <div>
                <span className="font-medium">Simple Perplexity Mode</span>
                <span className="ml-2 text-sm text-gray-600">
                  (Direct Perplexity API call - No auth required)
                </span>
                <div className="text-xs text-indigo-600 mt-1">
                  🔧 Simple API test for debugging
                </div>
              </div>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="radio"
                name="mode"
                value="offline"
                checked={selectedMode === 'offline'}
                onChange={(e) => setSelectedMode(e.target.value as 'production' | 'offline' | 'perplexity')}
                className="text-green-500"
              />
              <div>
                <span className="font-medium">Offline Mode</span>
                <span className="ml-2 text-sm text-gray-600">
                  (Local recipe database with cost estimates)
                </span>
                {recommendedMode === 'offline' && (
                  <div className="text-xs text-green-600 mt-1">
                    ✅ Recommended - Reliable and fast
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>

        {/* Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium mb-2">Meal Plan Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg"
              placeholder="e.g., Mediterranean Week"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg"
              placeholder="Optional description"
            />
          </div>

          {/* Budget & Household */}
          <div>
            <label className="block text-sm font-medium mb-2">Budget Limit ($) *</label>
            <input
              type="number"
              value={formData.budgetLimit}
              onChange={(e) => handleInputChange('budgetLimit', Number(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-lg"
              min="10"
              max="500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Household Size *</label>
            <input
              type="number"
              value={formData.householdSize}
              onChange={(e) => handleInputChange('householdSize', Number(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-lg"
              min="1"
              max="12"
              required
            />
          </div>

          {/* Time Frame & ZIP Code */}
          <div>
            <label className="block text-sm font-medium mb-2">Time Frame</label>
            <select
              value={formData.timeFrame}
              onChange={(e) => handleInputChange('timeFrame', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg"
            >
              {TIME_FRAMES.map(frame => (
                <option key={frame.value} value={frame.value}>
                  {frame.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              ZIP Code {selectedMode === 'production' && '(for Kroger pricing)'}
            </label>
            <input
              type="text"
              value={formData.zipCode}
              onChange={(e) => handleInputChange('zipCode', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg"
              placeholder="e.g., 90210"
            />
            <p className="text-xs text-gray-500 mt-1">
              {selectedMode === 'production' 
                ? 'Optional - enables real Kroger pricing' 
                : 'Optional - not used in offline mode'
              }
            </p>
          </div>
        </div>

        {/* Cultural Cuisines */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">Cultural Cuisines *</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {CULTURAL_CUISINES.map(cuisine => (
              <label key={cuisine} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.culturalCuisines.includes(cuisine)}
                  onChange={() => toggleArrayItem('culturalCuisines', cuisine)}
                  className="rounded"
                />
                <span className="text-sm capitalize">{cuisine.replace('-', ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Dietary Restrictions */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">Dietary Restrictions</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {DIETARY_RESTRICTIONS.map(restriction => (
              <label key={restriction} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.dietaryRestrictions.includes(restriction)}
                  onChange={() => toggleArrayItem('dietaryRestrictions', restriction)}
                  className="rounded"
                />
                <span className="text-sm capitalize">{restriction.replace('-', ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Create Button */}
        <button
          onClick={createMealPlan}
          disabled={isCreating || !formData.name.trim() || formData.culturalCuisines.length === 0 || (selectedMode === 'production' && !user)}
          className={`w-full py-3 px-6 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed ${
            selectedMode === 'perplexity' 
              ? 'bg-purple-500 hover:bg-purple-600 text-white'
              : selectedMode === 'simple-perplexity'
              ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
              : selectedMode === 'production'
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {isCreating 
            ? `Creating with ${
                selectedMode === 'production' ? 'Production APIs' : 
                selectedMode === 'perplexity' ? 'Perplexity AI Service' : 
                selectedMode === 'simple-perplexity' ? 'Simple Perplexity API' :
                'Offline Database'
              }...` 
            : `🚀 Create Meal Plan (${
                selectedMode === 'production' ? 'Production' : 
                selectedMode === 'perplexity' ? 'Perplexity Test' : 
                selectedMode === 'simple-perplexity' ? 'Simple Perplexity' :
                'Offline'
              } Mode)`
          }
        </button>
        
        {selectedMode === 'production' && !user && (
          <p className="text-sm text-red-600 mt-2 text-center">
            Production mode requires authentication. Create a test user, use Perplexity test mode, or switch to offline mode.
          </p>
        )}

        {/* Progress Bar */}
        {isCreating && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-gray-500">{progress.current}/{progress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">{currentStep}</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Stream Events */}
        {streamEvents.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Real-time Progress</h3>
            <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
              {streamEvents.slice(-10).map((event, index) => (
                <div key={index} className="mb-2 p-2 bg-white rounded border-l-4 border-blue-500">
                  <div className="text-xs text-gray-500 mb-1">
                    {event.timestamp.toLocaleTimeString()}
                  </div>
                  <div className="text-sm">
                    {event.data.message || JSON.stringify(event.data, null, 2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Created Meal Plan */}
        {createdMealPlan && (
          <div className="mt-6 p-4 bg-green-100 border border-green-400 rounded-lg">
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              ✅ Meal Plan Created Successfully!
            </h3>
            <div className="text-sm text-green-700 space-y-1">
              <p><strong>ID:</strong> {createdMealPlan.id}</p>
              <p><strong>Name:</strong> {createdMealPlan.name}</p>
              <p><strong>Recipes:</strong> {createdMealPlan.recipes?.length || 0}</p>
              <p><strong>Status:</strong> {createdMealPlan.status}</p>
              <p><strong>Mode:</strong> {
                selectedMode === 'production' ? 'Production APIs' : 
                selectedMode === 'perplexity' ? 'Perplexity AI Test' : 
                'Offline Database'
              }</p>
              {createdMealPlan.total_cost > 0 && (
                <>
                  <p><strong>Total Cost:</strong> {formatCurrency(createdMealPlan.total_cost)}</p>
                  <p><strong>Budget Used:</strong> {createdMealPlan.budget_utilization?.toFixed(1)}%</p>
                </>
              )}
            </div>
            <div className="mt-3">
              <a 
                href="/meal-plans-demo" 
                className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
              >
                View in Dashboard
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}