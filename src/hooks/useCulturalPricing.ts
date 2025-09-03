import { useState, useCallback } from 'react';
import { culturalPricingService, type CulturalPricingRequest, type CulturalPricingResponse } from '@/lib/external-apis/cultural-pricing-service';

interface UseCulturalPricingState {
  loading: boolean;
  data: CulturalPricingResponse | null;
  error: string | null;
}

export function useCulturalPricing() {
  const [state, setState] = useState<UseCulturalPricingState>({
    loading: false,
    data: null,
    error: null
  });

  const getCulturalPricing = useCallback(async (request: CulturalPricingRequest) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/pricing/cultural', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Cultural pricing request failed');
      }

      setState(prev => ({
        ...prev,
        loading: false,
        data: result.data,
        error: null
      }));

      return result.data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get cultural pricing';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
      throw error;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      loading: false,
      data: null,
      error: null
    });
  }, []);

  return {
    ...state,
    getCulturalPricing,
    reset,
    // Computed values for easy access
    totalCost: state.data?.totalEstimatedCost || 0,
    potentialSavings: state.data?.potentialSavings || 0,
    culturalStores: state.data?.storeRecommendations || [],
    shoppingStrategy: state.data?.shoppingStrategy,
    culturalInsights: state.data?.culturalInsights || [],
    hasResults: !!state.data?.results.length,
    hasCulturalStores: (state.data?.storeRecommendations || []).some(store => store.type !== 'mainstream'),
  };
}