/**
 * Enhanced Cultural Pricing Hook
 * React hook for comprehensive cultural pricing intelligence
 */

import { useState, useCallback, useEffect } from 'react';
import type { 
  CulturalPricingRequest, 
  CulturalPricingResult,
  EthnicMarketRecommendation,
  CulturalPricingConfidence 
} from '@/lib/external-apis/enhanced-cultural-pricing-service';
import type { EnhancedCulturalIngredient } from '@/lib/database/cultural-pricing-db';

interface UseEnhancedCulturalPricingState {
  // Main pricing data
  pricingResult: CulturalPricingResult | null;
  loading: boolean;
  error: string | null;
  
  // Additional data
  ethnicMarkets: EthnicMarketRecommendation[];
  culturalIngredients: EnhancedCulturalIngredient[];
  confidence: CulturalPricingConfidence | null;
  traditionalMapping: Record<string, string>;
  
  // Loading states for individual operations
  marketsLoading: boolean;
  ingredientsLoading: boolean;
  confidenceLoading: boolean;
  mappingLoading: boolean;
}

interface UseEnhancedCulturalPricingActions {
  // Main pricing function
  getCulturalPricing: (request: CulturalPricingRequest) => Promise<void>;
  
  // Additional data functions
  discoverEthnicMarkets: (location: string, culturalContext?: string) => Promise<void>;
  getCulturalIngredients: (culturalOrigin: string) => Promise<void>;
  getConfidenceScore: (ingredients: string[], location: string, culturalContext?: string) => Promise<void>;
  mapTraditionalIngredients: (ingredients: string[], culturalContext: string) => Promise<void>;
  
  // Data management
  updateCulturalIngredient: (ingredientName: string, culturalData: Partial<EnhancedCulturalIngredient>) => Promise<boolean>;
  verifyMarket: (marketId: string, verified: boolean) => Promise<boolean>;
  
  // Utility functions
  clearData: () => void;
  refreshPricing: () => Promise<void>;
}

type UseEnhancedCulturalPricingReturn = UseEnhancedCulturalPricingState & UseEnhancedCulturalPricingActions;

export function useEnhancedCulturalPricing(): UseEnhancedCulturalPricingReturn {
  const [state, setState] = useState<UseEnhancedCulturalPricingState>({
    pricingResult: null,
    loading: false,
    error: null,
    ethnicMarkets: [],
    culturalIngredients: [],
    confidence: null,
    traditionalMapping: {},
    marketsLoading: false,
    ingredientsLoading: false,
    confidenceLoading: false,
    mappingLoading: false,
  });

  const [lastRequest, setLastRequest] = useState<CulturalPricingRequest | null>(null);

  const getCulturalPricing = useCallback(async (request: CulturalPricingRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    setLastRequest(request);

    try {
      const response = await fetch('/api/pricing/cultural-enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get cultural pricing');
      }

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        pricingResult: data.data,
        loading: false,
        error: null,
      }));

    } catch (error) {
      console.error('Error getting cultural pricing:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }));
    }
  }, []);

  const discoverEthnicMarkets = useCallback(async (location: string, culturalContext?: string) => {
    setState(prev => ({ ...prev, marketsLoading: true }));

    try {
      const params = new URLSearchParams({
        action: 'markets',
        location,
        ...(culturalContext && { culturalContext }),
      });

      const response = await fetch(`/api/pricing/cultural-enhanced?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to discover ethnic markets');
      }

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        ethnicMarkets: data.data.markets,
        marketsLoading: false,
      }));

    } catch (error) {
      console.error('Error discovering ethnic markets:', error);
      setState(prev => ({
        ...prev,
        marketsLoading: false,
        error: error instanceof Error ? error.message : 'Failed to discover markets',
      }));
    }
  }, []);

  const getCulturalIngredients = useCallback(async (culturalOrigin: string) => {
    setState(prev => ({ ...prev, ingredientsLoading: true }));

    try {
      const params = new URLSearchParams({
        action: 'cultural-ingredients',
        culturalOrigin,
      });

      const response = await fetch(`/api/pricing/cultural-enhanced?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to get cultural ingredients');
      }

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        culturalIngredients: data.data.ingredients,
        ingredientsLoading: false,
      }));

    } catch (error) {
      console.error('Error getting cultural ingredients:', error);
      setState(prev => ({
        ...prev,
        ingredientsLoading: false,
        error: error instanceof Error ? error.message : 'Failed to get cultural ingredients',
      }));
    }
  }, []);

  const getConfidenceScore = useCallback(async (
    ingredients: string[], 
    location: string, 
    culturalContext?: string
  ) => {
    setState(prev => ({ ...prev, confidenceLoading: true }));

    try {
      const params = new URLSearchParams({
        action: 'confidence',
        ingredients: ingredients.join(','),
        location,
        ...(culturalContext && { culturalContext }),
      });

      const response = await fetch(`/api/pricing/cultural-enhanced?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to get confidence score');
      }

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        confidence: data.data.confidence,
        confidenceLoading: false,
      }));

    } catch (error) {
      console.error('Error getting confidence score:', error);
      setState(prev => ({
        ...prev,
        confidenceLoading: false,
        error: error instanceof Error ? error.message : 'Failed to get confidence score',
      }));
    }
  }, []);

  const mapTraditionalIngredients = useCallback(async (
    ingredients: string[], 
    culturalContext: string
  ) => {
    setState(prev => ({ ...prev, mappingLoading: true }));

    try {
      const params = new URLSearchParams({
        action: 'traditional-mapping',
        ingredients: ingredients.join(','),
        culturalContext,
      });

      const response = await fetch(`/api/pricing/cultural-enhanced?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to map traditional ingredients');
      }

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        traditionalMapping: data.data.mapping,
        mappingLoading: false,
      }));

    } catch (error) {
      console.error('Error mapping traditional ingredients:', error);
      setState(prev => ({
        ...prev,
        mappingLoading: false,
        error: error instanceof Error ? error.message : 'Failed to map traditional ingredients',
      }));
    }
  }, []);

  const updateCulturalIngredient = useCallback(async (
    ingredientName: string, 
    culturalData: Partial<EnhancedCulturalIngredient>
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/pricing/cultural-enhanced', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update-cultural-ingredient',
          ingredientName,
          culturalData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update cultural ingredient');
      }

      const data = await response.json();
      return data.success;

    } catch (error) {
      console.error('Error updating cultural ingredient:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update cultural ingredient',
      }));
      return false;
    }
  }, []);

  const verifyMarket = useCallback(async (marketId: string, verified: boolean): Promise<boolean> => {
    try {
      const response = await fetch('/api/pricing/cultural-enhanced', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'verify-market',
          marketId,
          verified,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to verify market');
      }

      const data = await response.json();
      return data.success;

    } catch (error) {
      console.error('Error verifying market:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to verify market',
      }));
      return false;
    }
  }, []);

  const clearData = useCallback(() => {
    setState({
      pricingResult: null,
      loading: false,
      error: null,
      ethnicMarkets: [],
      culturalIngredients: [],
      confidence: null,
      traditionalMapping: {},
      marketsLoading: false,
      ingredientsLoading: false,
      confidenceLoading: false,
      mappingLoading: false,
    });
    setLastRequest(null);
  }, []);

  const refreshPricing = useCallback(async () => {
    if (lastRequest) {
      await getCulturalPricing(lastRequest);
    }
  }, [lastRequest, getCulturalPricing]);

  // Auto-refresh pricing data every 30 minutes if we have a result
  useEffect(() => {
    if (state.pricingResult && !state.pricingResult.cached) {
      const interval = setInterval(() => {
        refreshPricing();
      }, 30 * 60 * 1000); // 30 minutes

      return () => clearInterval(interval);
    }
    return undefined; // Explicit return for when condition isn't met
  }, [state.pricingResult, refreshPricing]);

  return {
    ...state,
    getCulturalPricing,
    discoverEthnicMarkets,
    getCulturalIngredients,
    getConfidenceScore,
    mapTraditionalIngredients,
    updateCulturalIngredient,
    verifyMarket,
    clearData,
    refreshPricing,
  };
}

// Helper hook for cultural ingredient management
export function useCulturalIngredientManager() {
  const [ingredients, setIngredients] = useState<EnhancedCulturalIngredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadIngredientsByOrigin = useCallback(async (culturalOrigin: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        action: 'cultural-ingredients',
        culturalOrigin,
      });

      const response = await fetch(`/api/pricing/cultural-enhanced?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to load cultural ingredients');
      }

      const data = await response.json();
      setIngredients(data.data.ingredients);

    } catch (error) {
      console.error('Error loading cultural ingredients:', error);
      setError(error instanceof Error ? error.message : 'Failed to load ingredients');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateIngredient = useCallback(async (
    ingredientName: string, 
    updates: Partial<EnhancedCulturalIngredient>
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/pricing/cultural-enhanced', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update-cultural-ingredient',
          ingredientName,
          culturalData: updates,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update ingredient');
      }

      const data = await response.json();
      
      if (data.success) {
        // Update local state
        setIngredients(prev => prev.map(ing => 
          ing.ingredient_name === ingredientName 
            ? { ...ing, ...updates, updated_at: new Date().toISOString() }
            : ing
        ));
      }

      return data.success;

    } catch (error) {
      console.error('Error updating ingredient:', error);
      setError(error instanceof Error ? error.message : 'Failed to update ingredient');
      return false;
    }
  }, []);

  return {
    ingredients,
    loading,
    error,
    loadIngredientsByOrigin,
    updateIngredient,
  };
}