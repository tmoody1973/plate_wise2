import { useState } from 'react'

interface IngredientSearchOptions {
  ingredient: string
  store?: string
  location?: string
  searchType?: 'alternatives' | 'substitutes' | 'availability'
}

interface SearchResults {
  structured?: any[]
  text: string
  hasStructuredData: boolean
}

export function useIngredientSearch() {
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<SearchResults | null>(null)
  const [error, setError] = useState<string | null>(null)

  const searchIngredient = async (options: IngredientSearchOptions) => {
    const { ingredient, store, location = '53206', searchType = 'alternatives' } = options

    if (!ingredient.trim()) {
      setError('Ingredient name is required')
      return null
    }

    setIsSearching(true)
    setError(null)
    setResults(null)

    try {
      console.log(`🔍 Searching for ingredient: "${ingredient}" at ${store || 'any store'} (${searchType})`)

      const response = await fetch('/api/ingredients/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredient: ingredient.trim(),
          store,
          location,
          searchType
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`✅ Ingredient search results:`, data.results)
        setResults(data.results)
        return data.results
      } else {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Search failed'
        console.error('❌ Ingredient search failed:', errorMessage)
        setError(errorMessage)
        return null
      }
    } catch (err) {
      const errorMessage = 'Network error while searching'
      console.error('❌ Ingredient search network error:', err)
      setError(errorMessage)
      return null
    } finally {
      setIsSearching(false)
    }
  }

  const clearResults = () => {
    setResults(null)
    setError(null)
  }

  return {
    searchIngredient,
    clearResults,
    isSearching,
    results,
    error,
    hasResults: !!results
  }
}

export default useIngredientSearch