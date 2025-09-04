"use client"

import { useState, useCallback, useRef } from 'react'
import type { PerplexitySearchFilters } from './usePerplexityRecipeSearch'

export type StreamingState = 'idle' | 'connecting' | 'streaming' | 'complete' | 'error'

export type StreamingChunk = {
  type: 'partial' | 'complete' | 'error'
  content?: string
  recipes?: any[]
  sources?: string[]
  error?: string
}

export type StreamingRecipeSearchResult = {
  state: StreamingState
  recipes: any[]
  sources: string[]
  partialContent: string
  error?: string
  progress: {
    recipeTitles: number
    completeRecipes: number
  }
}

export function usePerplexityRecipeSearchStream() {
  const [result, setResult] = useState<StreamingRecipeSearchResult>({
    state: 'idle',
    recipes: [],
    sources: [],
    partialContent: '',
    progress: { recipeTitles: 0, completeRecipes: 0 }
  })
  
  const [lastRecipeCount, setLastRecipeCount] = useState(0)
  
  const abortController = useRef<AbortController | null>(null)
  
  const searchRecipes = useCallback(async (filters: PerplexitySearchFilters) => {
    // Cancel any existing search
    if (abortController.current) {
      abortController.current.abort()
    }
    
    abortController.current = new AbortController()
    
    // Reset state
    setResult({
      state: 'connecting',
      recipes: [],
      sources: [],
      partialContent: '',
      progress: { recipeTitles: 0, completeRecipes: 0 }
    })
    setLastRecipeCount(0)
    
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

      const response = await fetch(`/api/recipes/search/perplexity/stream?${params}`, {
        signal: abortController.current.signal
      })
      
      if (!response.ok) {
        throw new Error(`Streaming failed: ${response.status}`)
      }
      
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response stream available')
      }
      
      setResult(prev => ({ ...prev, state: 'streaming' }))
      
      const decoder = new TextDecoder()
      let buffer = ''
      
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        
        // Process complete lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            
            if (data === '[DONE]') {
              setResult(prev => ({ ...prev, state: 'complete' }))
              return
            }
            
            try {
              const chunk: StreamingChunk = JSON.parse(data)
              
              if (chunk.type === 'partial') {
                // Count recipe progress
                const recipeTitles = (chunk.content?.match(/"title"\s*:\s*"[^"]*"/g) || []).length
                const completeRecipes = chunk.recipes?.length || 0
                
                // Only update recipes if we have new ones (progressive loading)
                const hasNewRecipes = chunk.recipes && chunk.recipes.length > lastRecipeCount
                
                if (hasNewRecipes) {
                  console.log(`📈 Progressive update: ${lastRecipeCount} → ${chunk.recipes!.length} recipes`);
                  setLastRecipeCount(chunk.recipes!.length);
                }
                
                setResult(prev => ({
                  ...prev,
                  partialContent: chunk.content || prev.partialContent,
                  recipes: hasNewRecipes ? chunk.recipes! : prev.recipes,
                  progress: { recipeTitles, completeRecipes }
                }))
              } else if (chunk.type === 'complete') {
                setResult(prev => ({
                  ...prev,
                  state: 'complete',
                  recipes: chunk.recipes || prev.recipes,
                  sources: chunk.sources || prev.sources
                }))
                return
              } else if (chunk.type === 'error') {
                setResult(prev => ({
                  ...prev,
                  state: 'error',
                  error: chunk.error
                }))
                return
              }
            } catch (e) {
              console.warn('Failed to parse streaming chunk:', data)
            }
          }
        }
      }
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setResult(prev => ({ ...prev, state: 'idle' }))
      } else {
        setResult(prev => ({
          ...prev,
          state: 'error',
          error: error instanceof Error ? error.message : 'Unknown streaming error'
        }))
      }
    }
  }, [])
  
  const cancelSearch = useCallback(() => {
    if (abortController.current) {
      abortController.current.abort()
    }
    setResult(prev => ({ ...prev, state: 'idle' }))
    setLastRecipeCount(0)
  }, [])
  
  return {
    searchRecipes,
    cancelSearch,
    result,
    isIdle: result.state === 'idle',
    isConnecting: result.state === 'connecting',
    isStreaming: result.state === 'streaming',
    isComplete: result.state === 'complete',
    isError: result.state === 'error'
  }
}