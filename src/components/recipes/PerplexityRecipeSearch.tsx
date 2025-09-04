"use client"

import React, { useState, useEffect } from 'react'
import { Search, Clock, Users, ChefHat, Sparkles, Zap, Plus, Loader2 } from 'lucide-react'
import { usePerplexityRecipeSearchStream } from '@/hooks/usePerplexityRecipeSearchStream'

interface PerplexityRecipeSearchProps {
  onRecipesFound?: (recipes: any[]) => void;
  defaultQuery?: string;
  showFilters?: boolean;
}

const CUISINES = [
  '', 'Italian', 'Mexican', 'Chinese', 'Indian', 'Thai', 'Japanese', 'French', 
  'Mediterranean', 'Korean', 'Vietnamese', 'Greek', 'Spanish', 'American'
]

const DIETARY_OPTIONS = [
  'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'keto', 'paleo', 'low-carb', 'high-protein'
]

export function PerplexityRecipeSearch({ 
  onRecipesFound, 
  defaultQuery = '', 
  showFilters = true 
}: PerplexityRecipeSearchProps) {
  const [query, setQuery] = useState(defaultQuery)
  const [cuisine, setCuisine] = useState('')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | ''>('')
  const [dietary, setDietary] = useState<string[]>([])
  const [includeIngredients, setIncludeIngredients] = useState('')
  const [excludeIngredients, setExcludeIngredients] = useState('')
  const [maxResults, setMaxResults] = useState(3)
  const [allRecipes, setAllRecipes] = useState<any[]>([])
  const [lastSearchQuery, setLastSearchQuery] = useState('')
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  
  const { 
    searchRecipes, 
    result, 
    isIdle, 
    isConnecting, 
    isStreaming, 
    isComplete, 
    isError 
  } = usePerplexityRecipeSearchStream()

  const handleSearch = async (loadMore = false) => {
    if (!query.trim()) return

    if (!loadMore) {
      // New search - reset recipes
      setAllRecipes([])
      setLastSearchQuery(query.trim())
    } else {
      setIsLoadingMore(true)
    }

    const searchFilters = {
      query: loadMore ? lastSearchQuery : query.trim(),
      cuisine: cuisine || undefined,
      difficulty: difficulty || undefined,
      dietary: dietary.length > 0 ? dietary : undefined,
      includeIngredients: includeIngredients 
        ? includeIngredients.split(',').map(s => s.trim()).filter(Boolean)
        : undefined,
      excludeIngredients: excludeIngredients
        ? excludeIngredients.split(',').map(s => s.trim()).filter(Boolean) 
        : undefined,
      maxResults: 3 // Always fetch 3 at a time
    }

    await searchRecipes(searchFilters)
  }

  const handleLoadMore = async () => {
    await handleSearch(true)
  }

  // Update allRecipes when new results come in
  useEffect(() => {
    if (result.recipes.length > 0) {
      if (isLoadingMore) {
        // Append new recipes to existing ones
        const newRecipes = [...allRecipes, ...result.recipes]
        setAllRecipes(newRecipes)
        onRecipesFound?.(newRecipes)
        setIsLoadingMore(false)
      } else {
        // Replace with new search results
        setAllRecipes(result.recipes)
        onRecipesFound?.(result.recipes)
      }
    }
  }, [result.recipes])

  // Check if we can load more (simple heuristic: if last search returned 3 recipes)
  const canLoadMore = isComplete && allRecipes.length > 0 && allRecipes.length % 3 === 0

  const handleDietaryChange = (option: string, checked: boolean) => {
    if (checked) {
      setDietary(prev => [...prev, option])
    } else {
      setDietary(prev => prev.filter(d => d !== option))
    }
  }

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center space-x-2 text-orange-600">
        <Sparkles className="w-5 h-5" />
        <h3 className="font-semibold">AI Recipe Search</h3>
        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">Powered by Perplexity</span>
      </div>

      {/* Main search */}
      <div className="flex space-x-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search for recipes... (e.g., 'spicy pasta dishes')"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => handleSearch(false)}
          disabled={(isConnecting || isStreaming) || !query.trim()}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {isConnecting || isStreaming ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              <Zap className="w-3 h-3 animate-pulse" />
            </>
          ) : (
            <Search className="w-4 h-4" />
          )}
          <span>{isStreaming ? 'Streaming...' : 'Search'}</span>
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 border-t border-gray-200">
          {/* Cuisine */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cuisine
            </label>
            <select 
              value={cuisine} 
              onChange={(e) => setCuisine(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">Any Cuisine</option>
              {CUISINES.filter(Boolean).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <ChefHat className="w-4 h-4 inline mr-1" />
              Difficulty
            </label>
            <select 
              value={difficulty} 
              onChange={(e) => setDifficulty(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="">Any Difficulty</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* Results Info - Display Only */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Users className="w-4 h-4 inline mr-1" />
              Results Per Load
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700">
              3 recipes at a time
            </div>
          </div>

          {/* Include ingredients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Must Include
            </label>
            <input
              type="text"
              value={includeIngredients}
              onChange={(e) => setIncludeIngredients(e.target.value)}
              placeholder="e.g. chicken, tomatoes"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Exclude ingredients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Must Exclude
            </label>
            <input
              type="text"
              value={excludeIngredients}
              onChange={(e) => setExcludeIngredients(e.target.value)}
              placeholder="e.g. nuts, dairy"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Dietary restrictions */}
          <div className="md:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dietary
            </label>
            <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
              {DIETARY_OPTIONS.map(option => (
                <label key={option} className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={dietary.includes(option)}
                    onChange={(e) => handleDietaryChange(option, e.target.checked)}
                    className="mr-1 rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span className="capitalize">{option}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Status */}
      {isConnecting && (
        <div className="flex items-center space-x-2 text-orange-600">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-600 border-t-transparent" />
          <span className="text-sm">Connecting to AI search...</span>
        </div>
      )}

      {isStreaming && (
        <div className="flex items-center space-x-3 text-blue-600 bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 animate-pulse" />
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">Streaming recipes in real-time...</div>
            <div className="text-xs mt-1">
              Found {result.progress.recipeTitles} recipe titles, {result.progress.completeRecipes} complete recipes
            </div>
          </div>
          {result.progress.completeRecipes > 0 && (
            <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              {result.progress.completeRecipes} ready
            </div>
          )}
        </div>
      )}

      {isError && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
          <strong>Search failed:</strong> {result.error}
        </div>
      )}

      {isComplete && !isLoadingMore && result.recipes.length > 0 && (
        <div className="text-green-600 text-sm bg-green-50 p-3 rounded-lg">
          ✅ Found {result.recipes.length} new recipe(s)! Total: {allRecipes.length} recipes
          {result.sources.length > 0 && (
            <span className="ml-2">
              Sources: {result.sources.length} websites
            </span>
          )}
        </div>
      )}

      {isComplete && result.recipes.length === 0 && !isError && allRecipes.length === 0 && (
        <div className="text-yellow-600 text-sm bg-yellow-50 p-3 rounded-lg">
          No recipes found. Try adjusting your search terms or filters.
        </div>
      )}

      {/* Load More Button */}
      {canLoadMore && !isConnecting && !isStreaming && (
        <div className="flex justify-center mt-4">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-md transition-all transform hover:scale-105"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading more recipes...</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                <span>Load More Recipes</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Loading More Indicator */}
      {isLoadingMore && isStreaming && (
        <div className="flex items-center space-x-3 text-blue-600 bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 animate-pulse" />
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
          </div>
          <div className="text-sm font-medium">Loading more recipes...</div>
        </div>
      )}
    </div>
  )
}

export default PerplexityRecipeSearch
