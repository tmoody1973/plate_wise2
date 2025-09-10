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

export default function DatabaseMealPlanCreator() {
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

  const signIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@platewise.com',
        password: 'testpassword123'
      });

      if (error) {
        // Try to sign up if sign in fails
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: 'test@platewise.com',
          password: 'testpassword123'
        });

        if (signUpError) throw signUpError;
        setUser(signUpData.user);
      } else {
        setUser(data.user);
      }
    } catch (error: any) {
      setError(error.message);
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
    if (!user) {
      setError('Please sign in first');
      return;
    }

    setIsCreating(true);
    setStreamEvents([]);
    setCreatedMealPlan(null);
    setError(null);

    try {
      const response = await fetch('/api/meal-plans/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  if (!user) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Sign In Required</h2>
        <p className="text-gray-600 mb-4">
          Please sign in to create meal plans and test the database integration.
        </p>
        <button
          onClick={signIn}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
          Sign In as Test User
        </button>
        {error && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-6">Create Meal Plan</h1>
        
        {/* User Info */}
        <div className="bg-green-50 p-4 rounded-lg mb-6">
          <p className="text-green-800">
            ✅ Signed in as: {user.email}
          </p>
        </div>

        {/* Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium mb-2">Meal Plan Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg"
              placeholder="e.g., Mediterranean Week"
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
            <label className="block text-sm font-medium mb-2">Budget Limit ($)</label>
            <input
              type="number"
              value={formData.budgetLimit}
              onChange={(e) => handleInputChange('budgetLimit', Number(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-lg"
              min="10"
              max="500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Household Size</label>
            <input
              type="number"
              value={formData.householdSize}
              onChange={(e) => handleInputChange('householdSize', Number(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-lg"
              min="1"
              max="12"
            />
          </div>

          {/* ZIP Code & Time Frame */}
          <div>
            <label className="block text-sm font-medium mb-2">ZIP Code (for pricing)</label>
            <input
              type="text"
              value={formData.zipCode}
              onChange={(e) => handleInputChange('zipCode', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg"
              placeholder="e.g., 90210"
            />
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
          <label className="block text-sm font-medium mb-3">Cultural Cuisines</label>
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
          disabled={isCreating || !formData.name}
          className="w-full bg-green-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? 'Creating Meal Plan...' : 'Create Meal Plan'}
        </button>

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
              {streamEvents.map((event, index) => (
                <div key={index} className="mb-2 p-2 bg-white rounded border-l-4 border-blue-500">
                  <div className="text-xs text-gray-500 mb-1">
                    {event.timestamp.toLocaleTimeString()}
                  </div>
                  <div className="text-sm">
                    {event.data.message || JSON.stringify(event.data)}
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
            <div className="text-sm text-green-700">
              <p><strong>ID:</strong> {createdMealPlan.id}</p>
              <p><strong>Name:</strong> {createdMealPlan.name}</p>
              <p><strong>Recipes:</strong> {createdMealPlan.recipes?.length || 0}</p>
              <p><strong>Status:</strong> {createdMealPlan.status}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}