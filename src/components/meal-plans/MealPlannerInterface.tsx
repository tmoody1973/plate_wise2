'use client';

import { useState, useEffect } from 'react';
import { MealPlannerHeader } from './MealPlannerHeader';
import { RecipeGrid } from './RecipeGrid';
import { PantrySidebar } from './PantrySidebar';
import { StoreIntegrationDemo } from './StoreIntegrationDemo';
import { IngredientClassificationDemo } from './IngredientClassificationDemo';
import { CaribbeanAfricanDemo } from './CaribbeanAfricanDemo';
import { MexicanSouthAmericanDemo } from './MexicanSouthAmericanDemo';
import { useAuth } from '@/contexts/AuthContext';

interface MealPlan {
  recipes: any[];
  totalEstimatedCost: number;
  costRange: { min: number; max: number };
  budgetUtilization: number;
  confidence: 'high' | 'medium' | 'low';
  shoppingList: any[];
  savings: any;
  culturalBalance: any;
}

export function MealPlannerInterface() {
  const { user } = useAuth();
  const [weeklyBudget, setWeeklyBudget] = useState(75);
  const [numberOfMeals, setNumberOfMeals] = useState(5);
  const [estimatedTotal, setEstimatedTotal] = useState({ min: 64, max: 85 });
  const [confidence, setConfidence] = useState('High');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentMealPlan, setCurrentMealPlan] = useState<MealPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userStores, setUserStores] = useState<any[]>([]);

  // Generate meal plan using Perplexity
  const generateMealPlan = async () => {
    if (!user) {
      setError('Please log in to generate meal plans');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/meal-plans/clean-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          weeklyBudget,
          numberOfMeals,
          householdSize: 4, // Could be made configurable
          culturalCuisines: ['International', 'Asian', 'Mediterranean'], // From user profile
          dietaryRestrictions: [], // From user profile
          pantryItems: ['Rice', 'Onions', 'Garlic', 'Cooking Oil'], // From pantry sidebar
          location: 'United States'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate meal plan');
      }

      const data = await response.json();
      
      if (data.success && data.mealPlan) {
        setCurrentMealPlan(data.mealPlan);
        setEstimatedTotal(data.mealPlan.costRange);
        setConfidence(data.mealPlan.confidence === 'high' ? 'High' : 
                     data.mealPlan.confidence === 'medium' ? 'Medium' : 'Low');
      } else {
        throw new Error('Invalid response from meal planning service');
      }

    } catch (error) {
      console.error('❌ Meal plan generation failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate meal plan');
    } finally {
      setIsGenerating(false);
    }
  };

  // Fetch user's favorite stores on component mount
  useEffect(() => {
    const fetchUserStores = async () => {
      if (!user) {
        console.log('👤 No user found, skipping store fetch');
        return;
      }
      
      console.log('🏪 Fetching user stores for:', user.id);
      
      try {
        const response = await fetch('/api/stores/saved');
        console.log('🏪 Store fetch response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('🏪 Store fetch data:', data);
          
          const allStores = data.stores || [];
          const favoriteStores = allStores.filter((store: any) => store.is_favorite);
          
          console.log('🏪 Total stores:', allStores.length, 'Favorite stores:', favoriteStores.length);
          
          setUserStores(allStores.map((store: any) => ({
            name: store.store_name,
            type: store.store_type,
            address: store.address,
            url: store.store_url,
            specialties: store.specialties || [],
            rating: store.rating,
            isFavorite: store.is_favorite
          })));
        } else {
          const errorData = await response.json();
          console.error('🏪 Store fetch failed:', response.status, errorData);
        }
      } catch (error) {
        console.error('🏪 Failed to fetch user stores:', error);
      }
    };

    fetchUserStores();
  }, [user]);

  // Update estimated total when budget or meals change
  useEffect(() => {
    if (currentMealPlan) {
      // Recalculate based on current settings
      const costPerMeal = weeklyBudget / numberOfMeals;
      setEstimatedTotal({
        min: Math.round(costPerMeal * numberOfMeals * 0.85),
        max: Math.round(costPerMeal * numberOfMeals * 1.15)
      });
    }
  }, [weeklyBudget, numberOfMeals, currentMealPlan]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with controls */}
      <MealPlannerHeader
        weeklyBudget={weeklyBudget}
        setWeeklyBudget={setWeeklyBudget}
        numberOfMeals={numberOfMeals}
        setNumberOfMeals={setNumberOfMeals}
        estimatedTotal={estimatedTotal}
        confidence={confidence}
        isGenerating={isGenerating}
        onGenerateMealPlan={generateMealPlan}
        onAcceptPlan={() => {
          // Handle accept plan - navigate to shopping
          console.log('Accepting meal plan and proceeding to shopping');
        }}
      />

      {/* Error display */}
      {error && (
        <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <div className="text-red-600 text-sm">
              <strong>Error:</strong> {error}
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Store Integration Demo */}
      <div className="px-6 space-y-6">
        <StoreIntegrationDemo 
          stores={userStores}
          mealPlan={currentMealPlan}
        />
        
        {/* Ingredient Classification Demo */}
        <IngredientClassificationDemo />
        
        {/* Caribbean & African Demo */}
        <CaribbeanAfricanDemo />
        
        {/* Mexican & South American Demo */}
        <MexicanSouthAmericanDemo />
      </div>

      {/* Main content area */}
      <div className="flex gap-6 p-6">
        {/* Recipe grid - main content */}
        <div className="flex-1">
          <RecipeGrid 
            numberOfMeals={numberOfMeals}
            recipes={currentMealPlan?.recipes || []}
            isLoading={isGenerating}
          />
        </div>

        {/* Pantry sidebar */}
        <div className="w-80">
          <PantrySidebar 
            mealPlan={currentMealPlan}
            onPantryChange={(items) => {
              // Handle pantry changes - could trigger cost recalculation
              console.log('Pantry items changed:', items);
            }}
          />
        </div>
      </div>
    </div>
  );
}