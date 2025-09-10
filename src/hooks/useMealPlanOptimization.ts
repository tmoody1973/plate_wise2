"use client"

import { useMutation, useQueryClient } from '@tanstack/react-query'

export type MealPlanOptimizationRequest = {
  existingMealPlan: any // The current meal plan
  optimizationType: 'budget' | 'time' | 'nutrition' | 'cultural-authenticity'
  constraints?: {
    maxBudget?: number
    maxTimeMinutes?: number
    requiredNutrients?: string[]
    culturalPreferences?: string[]
  }
  preferences?: {
    keepFavorites?: string[] // Recipe IDs to keep
    avoidIngredients?: string[]
    preferredStores?: string[]
  }
}

export type OptimizedMealPlanResponse = {
  success: boolean
  optimizedMealPlan: any
  improvements: {
    costSavings?: number
    timeSaved?: number
    nutritionScore?: number
    authenticityScore?: number
  }
  changes: Array<{
    day: number
    mealType: string
    originalRecipe: string
    newRecipe: string
    reason: string
  }>
  searchTime: number
  source: string
}

async function optimizeMealPlan(request: MealPlanOptimizationRequest): Promise<OptimizedMealPlanResponse> {
  const response = await fetch('/api/meal-plans/optimize-perplexity', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`Meal plan optimization failed: ${response.status} ${errorText}`)
  }
  
  return await response.json() as OptimizedMealPlanResponse
}

export function useMealPlanOptimization() {
  const qc = useQueryClient()
  
  return useMutation<OptimizedMealPlanResponse, Error, MealPlanOptimizationRequest>({
    mutationFn: optimizeMealPlan,
    onSuccess: () => {
      // Invalidate meal plan cache after optimization
      qc.invalidateQueries({ queryKey: ['meal-plans'] })
      qc.invalidateQueries({ queryKey: ['optimized-meal-plans'] })
    },
  })
}