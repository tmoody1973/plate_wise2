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
  nutritionalGoals: string[];
  excludeIngredients: string[];
}

interface StreamEvent {
  type: string;
  data: any;
  timestamp: Date;
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
  { value: 'week', label: '1 Week' },
  { value: '3-days', label: '3 Days' },
  { value: '5-days', label: '5 Days (Weekdays)' },
  { value: 'weekend', label: 'Weekend Only' }
];

export default function ProductionMealPlanCreator() {
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState<MealPlanFormData>({
    name: '',
    description: '',
    culturalCuisines: ['mediterranean'],
    dietaryRestrictions: [],
    budgetLimit: 50,
    householdSize: 4,
    zipCode: '',
    timeFrame: 'week',
    nutritionalGoals: [],
    excludeIngredients: []
  });
  
  const [isCreating, setIsCreating] = useState(false);
  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);
  const [createdMealPlan, setCreatedMealPlan] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 6 });

  const supabase = createClientComponentClient();

  useEffect(() => {
    checkUser();
  }, []);

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
    if (!user) {
      setError('Please sign in first');
      return;
    }

    if (!formData.name.trim()) {
      setError('Please enter a meal plan name');
      return;
    }

    setIsCreating(true);
    setStreamEvents([]);
    setCreatedMealPlan(null);
    setError(null);
    setCurrentStep('Starting...');
    setProgress({ current: 0, total: 6 });

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Add mock user header if using mock authentication
      if (user.isMockUser) {
        headers['x-mock-user'] = JSON.stringify(user);
      }

      const response = await fetch('/api/meal-plans/create-production', {
        method: 'POST',
        headers,
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create meal plan');
      }

      // Handle streaming response
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
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Production Meal Planner</h2>
        <p className="text-gray-600 mb-4">
          Create meal plans with real recipe discovery and Kroger pricing integration.
        </p>
        <button
          onClick={createMockUser}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
          Create Test User
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-6">Production Meal Plan Creator</h1>
        
        {/* User Info */}
        <div className="bg-green-50 p-4 rounded-lg mb-6">
          <p className="text-green-800">
            ✅ Signed in as: {user.email}
            {user.isMockUser && <span className="ml-2 text-sm">(Mock User)</span>}
          </p>
        </div>

        {/* API Status */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-blue-800 mb-2">🚀 Production APIs Enabled:</h3>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>✅ Perplexity AI - Recipe URL discovery</li>
            <li>✅ WebScraping.AI - Recipe content extraction</li>
            <li>✅ Kroger API - Real-time pricing</li>
            <li>✅ Supabase Database - Data persistence</li>
          </ul>
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

          {/* ZIP Code & Time Frame */}
          <div>
            <label className="block text-sm font-medium mb-2">ZIP Code (for Kroger pricing)</label>
            <input
              type="text"
              value={formData.zipCode}
              onChange={(e) => handleInputChange('zipCode', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg"
              placeholder="e.g., 90210"
            />
            <p className="text-xs text-gray-500 mt-1">Optional - enables real Kroger pricing</p>
          </div>

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
          disabled={isCreating || !formData.name.trim() || formData.culturalCuisines.length === 0}
          className="w-full bg-green-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? 'Creating with Real APIs...' : '🚀 Create Meal Plan (Production)'}
        </button>

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
              ✅ Production Meal Plan Created Successfully!
            </h3>
            <div className="text-sm text-green-700 space-y-1">
              <p><strong>ID:</strong> {createdMealPlan.id}</p>
              <p><strong>Name:</strong> {createdMealPlan.name}</p>
              <p><strong>Recipes:</strong> {createdMealPlan.recipes?.length || 0}</p>
              <p><strong>Status:</strong> {createdMealPlan.status}</p>
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