"use client"

import { useMutation, useQueryClient } from '@tanstack/react-query'

export type MealPlanRequest = {
  days: number
  mealsPerDay: number
  culturalCuisine?: string
  dietaryRestrictions?: string[]
  budgetLimit?: number
  householdSize?: number
  maxTimeMinutes?: number
  excludeIngredients?: string[]
  includeIngredients?: string[]
  preferences?: {
    breakfast?: boolean
    lunch?: boolean
    dinner?: boolean
    snacks?: boolean
  }
}

export type MealPlanResponse = {
  success: boolean
  mealPlan: {
    days: Array<{
      date: string
      meals: Array<{
        type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
        recipe: {
          title: string
          description: string
          cuisine: string
          sourceUrl: string
          imageUrl?: string
          totalTimeMinutes: number
          servings: number
          ingredients: Array<{
            name: string
            amount: number
            unit: string
          }>
          instructions: Array<{
            step: number
            text: string
          }>
        }
        estimatedCost?: number
      }>
      totalCost?: number
    }>
  }
  totalEstimatedCost?: number
  searchTime: number
  source: string
  errors?: string[]
}

async function generateMealPlan(request: MealPlanRequest): Promise<MealPlanResponse> {
  const response = await fetch('/api/meal-plans/generate-perplexity', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`Meal plan generation failed: ${response.status} ${errorText}`)
  }
  
  return await response.json() as MealPlanResponse
}

export function useMealPlanGeneration() {
  const qc = useQueryClient()
  
  return useMutation<MealPlanResponse, Error, MealPlanRequest>({
    mutationFn: generateMealPlan,
    onSuccess: () => {
      // Invalidate meal plan cache
      qc.invalidateQueries({ queryKey: ['meal-plans'] })
      qc.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

export type { MealPlanRequest as MealPlanFilters }