'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Search, Filter, X, Clock, Users, Globe, Tag } from 'lucide-react';
import { recipeService } from '@/lib/recipes';
import type { Recipe } from '@/types';
import type { CombinedRecipeSearchFilters } from '@/lib/recipes/recipe-service';

interface RecipeSearchProps {
  onResults: (recipes: Recipe[]) => void;
  onLoading: (loading: boolean) => void;
  initialFilters?: Partial<CombinedRecipeSearchFilters>;
  showExternalToggle?: boolean;
}

export function RecipeSearch({ 
  onResults, 
  onLoading, 
  initialFilters = {},
  showExternalToggle = true 
}: RecipeSearchProps) {
  const [query, setQuery] = useState(initialFilters.query || '');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<CombinedRecipeSearchFilters>({
    includeExternal: false,
    limit: 20,
    ...initialFilters,
  });

  // Debounced search
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const performSearch = useCallback(async (searchFilters: CombinedRecipeSearchFilters) => {
    onLoading(true);
    try {
      const results = await recipeService.searchRecipes(searchFilters);
      onResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      onResults([]);
    } finally {
      onLoading(false);
    }
  }, [onResults, onLoading]);

  const handleSearch = useCallback((newQuery: string, newFilters?: Partial<CombinedRecipeSearchFilters>) => {
    const searchFilters = {
      ...filters,
      ...newFilters,
      query: newQuery.trim() || undefined,
    };

    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      performSearch(searchFilters);
    }, 300);

    setSearchTimeout(timeout);
  }, [filters, searchTimeout, performSearch]);

  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery);
    handleSearch(newQuery);
  };

  const handleFilterChange = (newFilters: Partial<CombinedRecipeSearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    handleSearch(query, newFilters);
  };

  const clearFilters = () => {
    const clearedFilters: CombinedRecipeSearchFilters = {
      query: query || undefined,
      includeExternal: false,
      limit: 20,
    };
    setFilters(clearedFilters);
    handleSearch(query, clearedFilters);
  };

  // Initial search on mount
  useEffect(() => {
    if (initialFilters.query || Object.keys(initialFilters).length > 1) {
      performSearch(filters);
    }
  }, []); // Only run on mount

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'query' || key === 'limit' || key === 'offset') return false;
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && value !== false;
  }).length;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search recipes by name, ingredient, or cuisine..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-md transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'text-orange-600 bg-orange-50'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Filter className="w-5 h-5" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Filters</h3>
            <div className="flex items-center space-x-2">
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear all
                </button>
              )}
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Cultural Origin */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Globe className="w-4 h-4 inline mr-1" />
                Cultural Origin
              </label>
              <select
                multiple
                value={filters.culturalOrigin || []}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  handleFilterChange({ culturalOrigin: values.length > 0 ? values : undefined });
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                size={4}
              >
                <option value="italian">Italian</option>
                <option value="mexican">Mexican</option>
                <option value="chinese">Chinese</option>
                <option value="indian">Indian</option>
                <option value="japanese">Japanese</option>
                <option value="thai">Thai</option>
                <option value="french">French</option>
                <option value="mediterranean">Mediterranean</option>
                <option value="middle-eastern">Middle Eastern</option>
                <option value="african">African</option>
              </select>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty
              </label>
              <div className="space-y-2">
                {['easy', 'medium', 'hard'].map((difficulty) => (
                  <label key={difficulty} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.difficulty?.includes(difficulty as any) || false}
                      onChange={(e) => {
                        const current = filters.difficulty || [];
                        const updated = e.target.checked
                          ? [...current, difficulty as any]
                          : current.filter(d => d !== difficulty);
                        handleFilterChange({ 
                          difficulty: updated.length > 0 ? updated : undefined 
                        });
                      }}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 capitalize">
                      {difficulty}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Time Constraints */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                Max Cook Time
              </label>
              <select
                value={filters.maxCookTime || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : undefined;
                  handleFilterChange({ maxCookTime: value });
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Any time</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
              </select>
            </div>

            {/* Servings */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Servings
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Min"
                  min="1"
                  value={filters.minServings || ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : undefined;
                    handleFilterChange({ minServings: value });
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  placeholder="Max"
                  min="1"
                  value={filters.maxServings || ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : undefined;
                    handleFilterChange({ maxServings: value });
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>

            {/* Source */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source
              </label>
              <div className="space-y-2">
                {[
                  { value: 'user', label: 'My Recipes' },
                  { value: 'community', label: 'Community' },
                  { value: 'spoonacular', label: 'Spoonacular' },
                ].map((source) => (
                  <label key={source.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.source?.includes(source.value as any) || false}
                      onChange={(e) => {
                        const current = filters.source || [];
                        const updated = e.target.checked
                          ? [...current, source.value as any]
                          : current.filter(s => s !== source.value);
                        handleFilterChange({ 
                          source: updated.length > 0 ? updated : undefined 
                        });
                      }}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {source.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Cultural Authenticity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Cultural Authenticity
              </label>
              <select
                value={filters.minCulturalAuthenticity || ''}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value) : undefined;
                  handleFilterChange({ minCulturalAuthenticity: value });
                }}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="">Any level</option>
                <option value="6">High (6+)</option>
                <option value="8">Very High (8+)</option>
                <option value="9">Exceptional (9+)</option>
              </select>
            </div>
          </div>

          {/* External Sources Toggle */}
          {showExternalToggle && (
            <div className="pt-4 border-t border-gray-200">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.includeExternal || false}
                  onChange={(e) => {
                    handleFilterChange({ includeExternal: e.target.checked });
                  }}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Include external recipe sources (Spoonacular)
                </span>
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RecipeSearch;