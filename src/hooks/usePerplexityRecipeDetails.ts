"use client"

import { useMutation } from '@tanstack/react-query'
import type { CreateRecipeInput } from '@/lib/recipes/recipe-database-service'
import { recipeService } from '@/lib/recipes'

export type DetailsResult = {
  success: boolean
  recipe?: CreateRecipeInput
  error?: string
  used?: { method: 'jsonld' | 'heuristic' | 'perplexity'; imageFallback: boolean }
}

async function fetchDetails(url: string, requireImage = true): Promise<DetailsResult> {
  const u = new URL('/api/recipes/details/perplexity', window.location.origin)
  u.searchParams.set('url', url)
  if (requireImage) u.searchParams.set('requireImage', '1')
  const res = await fetch(u.toString(), { method: 'GET' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Details fetch failed: ${res.status} ${text}`)
  }
  return res.json()
}

export function usePerplexityRecipeDetails() {
  const getDetails = useMutation<DetailsResult, Error, { url: string; requireImage?: boolean }>({
    mutationFn: ({ url, requireImage }) => fetchDetails(url, requireImage ?? true),
  })

  const saveFromUrl = useMutation<unknown, Error, { url: string; userId: string; requireImage?: boolean }>({
    mutationFn: async ({ url, userId, requireImage }) => {
      const details = await fetchDetails(url, requireImage ?? true)
      if (!details.success || !details.recipe) throw new Error(details.error || 'No recipe extracted')
      // Persist using existing recipe service
      return recipeService.createRecipe(details.recipe, userId)
    },
  })

  return { getDetails, saveFromUrl }
}

