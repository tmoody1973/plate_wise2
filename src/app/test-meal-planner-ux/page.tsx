'use client';

import MealPlannerV2 from '@/components/meal-plans/MealPlannerV2';

export default function TestMealPlannerUXPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Meal Planner V2 - User Experience Test
          </h1>
          <p className="text-gray-600">
            Testing improved navigation, error handling, and accessibility
          </p>
        </div>
        
        <MealPlannerV2 />
      </div>
    </div>
  );
}