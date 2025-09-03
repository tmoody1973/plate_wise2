"use client"

import { useMutation, useQueryClient } from '@tanstack/react-query'

export type WebSearchFilters = {
  query?: string
  country?: string
  includeIngredients?: string[]
  excludeIngredients?: string[]
  maxResults?: number
  excludeSources?: string[]
  mode?: 'web' | 'fast'
}

type ApiResponse = {
  found: number
  rows: any[]
  results: any // RecipesResponseT
}

async function postJson<T>(url: string, body: any): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Request failed: ${res.status} ${text}`)
  }
  return (await res.json()) as T
}

export function useRecipeSearch() {
  const qc = useQueryClient()
  return useMutation<ApiResponse, Error, WebSearchFilters>({
    mutationFn: (filters) => postJson<ApiResponse>('/api/recipes/search', filters),
    onSuccess: () => {
      // Invalidate any recipe lists if needed
      qc.invalidateQueries()
    },
  })
}

export function useRecipeSearchMore() {
  const qc = useQueryClient()
  return useMutation<ApiResponse, Error, { previous: any } & WebSearchFilters>({
    mutationFn: ({ previous, ...filters }) =>
      postJson<ApiResponse>('/api/recipes/search/more', { previous, ...filters }),
    onSuccess: () => {
      qc.invalidateQueries()
    },
  })
}
