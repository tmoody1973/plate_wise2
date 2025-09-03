/**
 * React Hook for Tavily Search Integration
 * Provides easy-to-use search and research capabilities for React components
 */

import { useState, useCallback } from 'react';
import { tavilyService, TavilyResult } from '@/lib/external-apis/tavily-service';

export interface UseTavilyReturn {
  // Search functions
  searchRecipes: (query: string, context?: any) => Promise<TavilyResult[]>;
  researchCulturalFood: (cuisine: string) => Promise<any>;
  findIngredientSubstitutions: (ingredient: string, culturalContext?: string, budgetConstraint?: number) => Promise<TavilyResult[]>;
  searchGroceryDeals: (location: string, items?: string[]) => Promise<TavilyResult[]>;

  // State
  isLoading: boolean;
  error: string | null;

  // Utilities
  clearError: () => void;
}

/**
 * Custom hook for Tavily search functionality
 */
export function useTavily(): UseTavilyReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleApiCall = useCallback(async <T>(
    apiCall: () => Promise<{ data?: T; error?: { message: string } }>
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiCall();

      if (result.error) {
        setError(result.error.message);
        return null;
      }

      return result.data || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchRecipes = useCallback(async (
    query: string,
    context?: any
  ): Promise<TavilyResult[]> => {
    // Method not implemented in tavilyService
    return [];
  }, [handleApiCall]);

  const researchCulturalFood = useCallback(async (
    cuisine: string
  ): Promise<any> => {
    // Method not implemented in tavilyService
    return null;
  }, [handleApiCall]);

  const findIngredientSubstitutions = useCallback(async (
    ingredient: string,
    culturalContext?: string,
    budgetConstraint?: number
  ): Promise<TavilyResult[]> => {
    // Method not implemented in tavilyService
    return [];
  }, [handleApiCall]);

  const searchGroceryDeals = useCallback(async (
    location: string,
    items?: string[]
  ): Promise<TavilyResult[]> => {
    // Method not implemented in tavilyService
    return [];
  }, [handleApiCall]);

  return {
    searchRecipes,
    researchCulturalFood,
    findIngredientSubstitutions,
    searchGroceryDeals,
    isLoading,
    error,
    clearError
  };
}

/**
 * Hook for recipe-specific search with cultural context
 */
export function useCulturalRecipeSearch() {
  const { searchRecipes, researchCulturalFood, isLoading, error, clearError } = useTavily();

  const searchWithCulturalContext = useCallback(async (
    query: string,
    culturalPreferences: string[],
    dietaryRestrictions: string[] = [],
    budgetRange?: { min: number; max: number }
  ) => {
    // First, research cultural context
    const culturalResearch = await Promise.all(
      culturalPreferences.map(cuisine => researchCulturalFood(cuisine))
    );

    // Then search for recipes with enhanced context
    const context: any = {
      culturalCuisines: culturalPreferences,
      dietaryRestrictions,
      budgetRange
    };

    const recipes = await searchRecipes(query, context);

    return {
      recipes,
      culturalContext: culturalResearch.filter(Boolean)
    };
  }, [searchRecipes, researchCulturalFood]);

  return {
    searchWithCulturalContext,
    isLoading,
    error,
    clearError
  };
}

/**
 * Hook for ingredient substitution with budget awareness
 */
export function useBudgetSubstitutions() {
  const { findIngredientSubstitutions, isLoading, error, clearError } = useTavily();

  const findBudgetFriendlySubstitutions = useCallback(async (
    ingredients: string[],
    culturalContext?: string,
    maxBudget?: number
  ) => {
    const substitutions = await Promise.all(
      ingredients.map(ingredient =>
        findIngredientSubstitutions(ingredient, culturalContext, maxBudget)
      )
    );

    return ingredients.map((ingredient, index) => ({
      ingredient,
      substitutions: substitutions[index] || []
    }));
  }, [findIngredientSubstitutions]);

  return {
    findBudgetFriendlySubstitutions,
    isLoading,
    error,
    clearError
  };
}