"use client"

import { useMutation, useQueryClient } from '@tanstack/react-query'

export type PerplexitySearchFilters = {
  query: string
  country?: string
  includeIngredients?: string[]
  excludeIngredients?: string[]
  maxResults?: number
  cuisine?: string
  dietary?: string[]
  difficulty?: 'easy' | 'medium' | 'hard'
}

type PerplexityApiResponse = {
  recipes: any[]
  meta: {
    has_more: boolean
    sources: { url: string; title?: string }[]
    used_filters: any
  }
}

async function getPerplexityRecipes(filters: PerplexitySearchFilters): Promise<PerplexityApiResponse> {
  const params = new URLSearchParams()
  params.set('query', filters.query)
  if (filters.country) params.set('country', filters.country)
  if (filters.includeIngredients?.length) params.set('include', filters.includeIngredients.join(','))
  if (filters.excludeIngredients?.length) params.set('exclude', filters.excludeIngredients.join(','))
  if (filters.maxResults) params.set('max', filters.maxResults.toString())
  if (filters.cuisine) params.set('cuisine', filters.cuisine)
  if (filters.dietary?.length) params.set('dietary', filters.dietary.join(','))
  if (filters.difficulty) params.set('difficulty', filters.difficulty)

  const res = await fetch(`/api/recipes/search/perplexity?${params}`)
  
  if (!res.ok) {
    const errorText = await res.text().catch(() => '')
    throw new Error(`Perplexity recipe search failed: ${res.status} ${errorText}`)
  }
  
  return await res.json() as PerplexityApiResponse
}

export function usePerplexityRecipeSearch() {
  const qc = useQueryClient()
  
  return useMutation<PerplexityApiResponse, Error, PerplexitySearchFilters>({
    mutationFn: getPerplexityRecipes,
    onSuccess: () => {
      // Invalidate any recipe lists if needed
      qc.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

export type { PerplexityApiResponse }