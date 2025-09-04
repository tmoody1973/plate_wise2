"use client"

import { useState, useCallback } from 'react'

export type StreamSearchFilters = {
  query: string
  country?: string
  includeIngredients?: string[]
  excludeIngredients?: string[]
  maxResults?: number
  cuisine?: string
  dietary?: string[]
  difficulty?: 'easy' | 'medium' | 'hard'
}

export type StreamSearchState = {
  isSearching: boolean
  error: string | null
  status: string
  progress: number
  recipes: any[]
  totalRecipes: number
  sources: { url: string; title: string }[]
}

export type StreamEventHandlers = {
  onRecipeFound?: (recipe: any, index: number) => void
  onStatusUpdate?: (status: string, progress: number) => void
  onComplete?: (recipes: any[]) => void
  onError?: (error: string) => void
}

export function usePerplexityRecipeStreamSearch() {
  const [state, setState] = useState<StreamSearchState>({
    isSearching: false,
    error: null,
    status: '',
    progress: 0,
    recipes: [],
    totalRecipes: 0,
    sources: []
  })

  const search = useCallback(async (
    filters: StreamSearchFilters,
    handlers?: StreamEventHandlers
  ) => {
    // Reset state
    setState({
      isSearching: true,
      error: null,
      status: 'Initializing search...',
      progress: 0,
      recipes: [],
      totalRecipes: 0,
      sources: []
    })

    try {
      const params = new URLSearchParams()
      params.set('query', filters.query)
      if (filters.country) params.set('country', filters.country)
      if (filters.includeIngredients?.length) params.set('include', filters.includeIngredients.join(','))
      if (filters.excludeIngredients?.length) params.set('exclude', filters.excludeIngredients.join(','))
      if (filters.maxResults) params.set('max', filters.maxResults.toString())
      if (filters.cuisine) params.set('cuisine', filters.cuisine)
      if (filters.dietary?.length) params.set('dietary', filters.dietary.join(','))
      if (filters.difficulty) params.set('difficulty', filters.difficulty)

      const response = await fetch(`/api/recipes/search/perplexity/stream?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('Response body is not readable')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7)
            continue
          }
          
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (line.includes('"event":"status"') || (!line.includes('"event":') && data.message)) {
                // Status update
                setState(prev => ({
                  ...prev,
                  status: data.message,
                  progress: data.progress || prev.progress
                }))
                handlers?.onStatusUpdate?.(data.message, data.progress || 0)
              }
              
              else if (line.includes('"event":"meta"') || data.totalRecipes !== undefined) {
                // Meta information
                setState(prev => ({
                  ...prev,
                  totalRecipes: data.totalRecipes,
                  sources: data.sources || []
                }))
              }
              
              else if (line.includes('"event":"recipe"') || data.recipe) {
                // New recipe found
                const recipe = data.recipe
                const index = data.index
                setState(prev => ({
                  ...prev,
                  recipes: [...prev.recipes, recipe],
                  status: `Found recipe: ${recipe.title}`
                }))
                handlers?.onRecipeFound?.(recipe, index)
              }
              
              else if (line.includes('"event":"complete"')) {
                // Search completed
                setState(prev => ({
                  ...prev,
                  isSearching: false,
                  status: data.message
                }))
                handlers?.onComplete?.(state.recipes)
              }
              
              else if (line.includes('"event":"error"') || data.error) {
                // Error occurred
                setState(prev => ({
                  ...prev,
                  isSearching: false,
                  error: data.error
                }))
                handlers?.onError?.(data.error)
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e)
            }
          }
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setState(prev => ({
        ...prev,
        isSearching: false,
        error: errorMessage
      }))
      handlers?.onError?.(errorMessage)
    }
  }, [state.recipes]) // Include state.recipes in dependency to get current value

  const reset = useCallback(() => {
    setState({
      isSearching: false,
      error: null,
      status: '',
      progress: 0,
      recipes: [],
      totalRecipes: 0,
      sources: []
    })
  }, [])

  return {
    ...state,
    search,
    reset
  }
}