"use client"

import { useState } from 'react'
import { useMealPlanGeneration } from '@/hooks/useMealPlanGeneration'

export default function PerplexityMealPlanTest() {
  const [formData, setFormData] = useState({
    days: 3,
    mealsPerDay: 3,
    culturalCuisine: 'Mexican',
    dietaryRestrictions: [] as string[],
    budgetLimit: 100,
    householdSize: 4,
    maxTimeMinutes: 45
  })

  const mealPlanMutation = useMealPlanGeneration()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mealPlanMutation.mutate(formData)
  }

  const handleDietaryChange = (restriction: string) => {
    setFormData(prev => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(restriction)
        ? prev.dietaryRestrictions.filter(r => r !== restriction)
        : [...prev.dietaryRestrictions, restriction]
    }))
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Perplexity Meal Plan Generator</h2>
        <p className="text-gray-600 mb-6">
          Generate meal plans using the existing Perplexity recipe search infrastructure
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Days</label>
              <input
                type="number"
                min="1"
                max="7"
                value={formData.days}
                onChange={(e) => setFormData(prev => ({ ...prev, days: parseInt(e.target.value) }))}
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Meals per Day</label>
              <input
                type="number"
                min="1"
                max="4"
                value={formData.mealsPerDay}
                onChange={(e) => setFormData(prev => ({ ...prev, mealsPerDay: parseInt(e.target.value) }))}
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Cultural Cuisine</label>
            <select
              value={formData.culturalCuisine}
              onChange={(e) => setFormData(prev => ({ ...prev, culturalCuisine: e.target.value }))}
              className="w-full p-2 border rounded-md"
            >
              <option value="">Any Cuisine</option>
              <option value="Mexican">Mexican</option>
              <option value="Italian">Italian</option>
              <option value="Asian">Asian</option>
              <option value="Mediterranean">Mediterranean</option>
              <option value="American">American</option>
              <option value="Indian">Indian</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Dietary Restrictions</label>
            <div className="flex flex-wrap gap-2">
              {['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'keto', 'low-carb'].map(restriction => (
                <label key={restriction} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.dietaryRestrictions.includes(restriction)}
                    onChange={() => handleDietaryChange(restriction)}
                    className="mr-2"
                  />
                  <span className="text-sm capitalize">{restriction}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Budget Limit ($)</label>
              <input
                type="number"
                min="20"
                max="500"
                value={formData.budgetLimit}
                onChange={(e) => setFormData(prev => ({ ...prev, budgetLimit: parseInt(e.target.value) }))}
                className="w-full p-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Household Size</label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.householdSize}
                onChange={(e) => setFormData(prev => ({ ...prev, householdSize: parseInt(e.target.value) }))}
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Max Cooking Time (minutes)</label>
            <input
              type="number"
              min="15"
              max="120"
              value={formData.maxTimeMinutes}
              onChange={(e) => setFormData(prev => ({ ...prev, maxTimeMinutes: parseInt(e.target.value) }))}
              className="w-full p-2 border rounded-md"
            />
          </div>

          <button
            type="submit"
            disabled={mealPlanMutation.isPending}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {mealPlanMutation.isPending ? 'Generating Meal Plan...' : 'Generate Meal Plan'}
          </button>
        </form>
      </div>

      {/* Results */}
      {mealPlanMutation.data && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold mb-4">Generated Meal Plan</h3>
          
          <div className="mb-4 p-4 bg-green-50 rounded-md">
            <p><strong>Total Estimated Cost:</strong> ${mealPlanMutation.data.totalEstimatedCost?.toFixed(2)}</p>
            <p><strong>Generation Time:</strong> {mealPlanMutation.data.searchTime}ms</p>
            <p><strong>Source:</strong> {mealPlanMutation.data.source}</p>
          </div>

          <div className="space-y-4">
            {mealPlanMutation.data.mealPlan.days.map((day, dayIndex) => (
              <div key={dayIndex} className="border rounded-lg p-4">
                <h4 className="font-semibold mb-2">Day {dayIndex + 1} - {day.date}</h4>
                <p className="text-sm text-gray-600 mb-3">Daily Cost: ${day.totalCost?.toFixed(2)}</p>
                
                <div className="grid gap-3">
                  {day.meals.map((meal, mealIndex) => (
                    <div key={mealIndex} className="bg-gray-50 p-3 rounded">
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-medium capitalize">{meal.type}</h5>
                        <span className="text-sm text-gray-600">${meal.estimatedCost?.toFixed(2)}</span>
                      </div>
                      <p className="font-medium">{meal.recipe.title}</p>
                      <p className="text-sm text-gray-600">{meal.recipe.description}</p>
                      <div className="flex gap-4 text-xs text-gray-500 mt-2">
                        <span>🍽️ {meal.recipe.servings} servings</span>
                        <span>⏱️ {meal.recipe.totalTimeMinutes} min</span>
                        <span>🌍 {meal.recipe.cuisine}</span>
                      </div>
                      {meal.recipe.sourceUrl && (
                        <a 
                          href={meal.recipe.sourceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 text-sm hover:underline mt-1 inline-block"
                        >
                          View Recipe →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mealPlanMutation.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium mb-2">Error</h3>
          <p className="text-red-700">{mealPlanMutation.error.message}</p>
        </div>
      )}
    </div>
  )
}