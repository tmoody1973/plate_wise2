"use client"

import React, { useState } from 'react'
import { Search, Clock, Users, ChefHat, Sparkles, CheckCircle, Loader2 } from 'lucide-react'
import { usePerplexityRecipeStreamSearch } from '@/hooks/usePerplexityRecipeStreamSearch'

interface PerplexityRecipeStreamSearchProps {
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

interface RecipeCardProps {
  recipe: any;
  index: number;
  isNew?: boolean;
}

function RecipeCard({ recipe, index, isNew = false }: RecipeCardProps) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 transition-all duration-500 ${
      isNew ? 'animate-in slide-in-from-bottom-4 border-green-300 bg-green-50' : ''
    }`}>
      <div className="flex items-start space-x-3">
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          isNew ? 'bg-green-500 text-white animate-pulse' : 'bg-gray-100 text-gray-600'
        }`}>
          {isNew ? <CheckCircle className="w-4 h-4" /> : index + 1}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{recipe.title}</h3>
          
          {recipe.description && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">{recipe.description}</p>
          )}
          
          <div className="flex flex-wrap gap-2 mb-3">
            {recipe.cuisine && (
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                {recipe.cuisine}
              </span>
            )}
            {recipe.metadata?.difficulty && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                recipe.metadata.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                recipe.metadata.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {recipe.metadata.difficulty}
              </span>
            )}
            {recipe.metadata?.servings && (
              <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full flex items-center">
                <Users className="w-3 h-3 mr-1" />
                {recipe.metadata.servings} servings
              </span>
            )}
            {recipe.metadata?.total_time_minutes && (
              <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {recipe.metadata.total_time_minutes} min
              </span>
            )}
          </div>

          <div className="text-xs text-gray-500">
            {recipe.ingredients?.length} ingredients • {recipe.instructions?.length} steps
            {recipe.metadata?.source_url && (
              <span className="ml-2">
                • <a href={recipe.metadata.source_url} target="_blank" rel="noopener noreferrer" 
                     className="text-blue-600 hover:underline">View source</a>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function PerplexityRecipeStreamSearch({ 
  onRecipesFound, 
  defaultQuery = '', 
  showFilters = true 
}: PerplexityRecipeStreamSearchProps) {
  const [query, setQuery] = useState(defaultQuery)
  const [cuisine, setCuisine] = useState('')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | ''>('')
  const [dietary, setDietary] = useState<string[]>([])
  const [includeIngredients, setIncludeIngredients] = useState('')
  const [excludeIngredients, setExcludeIngredients] = useState('')
  const [maxResults, setMaxResults] = useState(3)
  const [newRecipeIndex, setNewRecipeIndex] = useState<number | null>(null)

  const streamSearch = usePerplexityRecipeStreamSearch()

  const handleSearch = () => {
    if (!query.trim()) return

    const searchFilters = {
      query: query.trim(),
      cuisine: cuisine || undefined,
      difficulty: difficulty || undefined,
      dietary: dietary.length > 0 ? dietary : undefined,
      includeIngredients: includeIngredients 
        ? includeIngredients.split(',').map(s => s.trim()).filter(Boolean)
        : undefined,
      excludeIngredients: excludeIngredients
        ? excludeIngredients.split(',').map(s => s.trim()).filter(Boolean) 
        : undefined,
      maxResults
    }

    streamSearch.search(searchFilters, {
      onRecipeFound: (recipe, index) => {
        console.log('✅ New recipe found:', recipe.title)
        setNewRecipeIndex(index)
        // Clear the "new" indicator after animation
        setTimeout(() => setNewRecipeIndex(null), 2000)
      },
      onComplete: (recipes) => {
        console.log('🎉 Search completed with', recipes.length, 'recipes')
        onRecipesFound?.(recipes)
      },
      onError: (error) => {
        console.error('❌ Stream search error:', error)
      }
    })
  }

  const handleDietaryChange = (option: string, checked: boolean) => {
    if (checked) {
      setDietary(prev => [...prev, option])
    } else {
      setDietary(prev => prev.filter(d => d !== option))
    }
  }

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center space-x-2 text-orange-600">
          <Sparkles className="w-5 h-5" />
          <h3 className="font-semibold">AI Recipe Search - Live Results</h3>
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
            onClick={handleSearch}
            disabled={streamSearch.isSearching || !query.trim()}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {streamSearch.isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            <span>Search</span>
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 border-t border-gray-200">
            {/* Cuisine */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cuisine</label>
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
                <ChefHat className="w-4 h-4 inline mr-1" />Difficulty
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

            {/* Max Results */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Users className="w-4 h-4 inline mr-1" />Results
              </label>
              <select 
                value={maxResults} 
                onChange={(e) => setMaxResults(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value={1}>1 recipe</option>
                <option value={3}>3 recipes</option>
                <option value={5}>5 recipes</option>
              </select>
            </div>

            {/* Include ingredients */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Must Include</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Must Exclude</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Dietary</label>
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
      </div>

      {/* Search Status */}
      {streamSearch.isSearching && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <div className="flex-1">
              <div className="text-blue-800 font-medium">{streamSearch.status}</div>
              {streamSearch.progress > 0 && (
                <div className="mt-2">
                  <div className="bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${streamSearch.progress}%` }}
                    />
                  </div>
                  <div className="text-sm text-blue-600 mt-1">{Math.round(streamSearch.progress)}% complete</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {streamSearch.error && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 p-4 rounded-lg">
          <strong>Search failed:</strong> {streamSearch.error}
          <button
            onClick={streamSearch.reset}
            className="ml-3 text-red-800 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Live Results */}
      {(streamSearch.recipes.length > 0 || streamSearch.totalRecipes > 0) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-900">
              Live Results ({streamSearch.recipes.length}
              {streamSearch.totalRecipes > 0 && ` of ${streamSearch.totalRecipes}`})
            </h4>
            {!streamSearch.isSearching && streamSearch.recipes.length > 0 && (
              <div className="text-green-600 text-sm flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" />
                Search Complete!
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            {streamSearch.recipes.map((recipe, index) => (
              <RecipeCard 
                key={`${recipe.title}-${index}`}
                recipe={recipe} 
                index={index}
                isNew={newRecipeIndex === index}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      {streamSearch.sources.length > 0 && (
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <strong>Sources:</strong> {streamSearch.sources.length} websites searched
        </div>
      )}
    </div>
  )
}

export default PerplexityRecipeStreamSearch