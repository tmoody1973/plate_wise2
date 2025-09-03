"use client"

import React, { useState, useEffect } from 'react'
import { Search, Loader2, ShoppingCart, MapPin, Clock, CheckCircle2, X, Edit3, ChefHat, Info, Star, Package } from 'lucide-react'

interface AlternativeProduct {
  id: string
  name: string
  brand?: string
  packageSize: string
  price: number
  unitPrice?: string
  storeName: string
  storeAddress: string
  inStock: boolean
  isVerified: boolean
  nutritionScore?: number
  imageUrl?: string
  description?: string
}

interface SubstituteOption {
  name: string
  ratio: string
  notes: string
  difficulty: 'easy' | 'medium' | 'hard'
  flavor: 'identical' | 'similar' | 'different'
  price: number
  availability: number // 0-100% 
}

interface Props {
  isOpen: boolean
  onClose: () => void
  originalIngredient: string
  currentStore?: string
  onSelectAlternative: (alternative: AlternativeProduct | SubstituteOption) => void
}

export function EnhancedIngredientModal({ 
  isOpen, 
  onClose, 
  originalIngredient, 
  currentStore = '',
  onSelectAlternative 
}: Props) {
  const [searchIngredient, setSearchIngredient] = useState(originalIngredient)
  const [activeTab, setActiveTab] = useState<'alternatives' | 'substitutes' | 'stores'>('alternatives')
  const [isLoading, setIsLoading] = useState(false)
  const [alternatives, setAlternatives] = useState<AlternativeProduct[]>([])
  const [substitutes, setSubstitutes] = useState<SubstituteOption[]>([])
  const [error, setError] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchIngredient(originalIngredient)
      setActiveTab('alternatives')
      setError('')
      setIsEditing(false)
    }
  }, [isOpen, originalIngredient])

  const handleSearch = async () => {
    if (!searchIngredient.trim()) return

    setIsLoading(true)
    setError('')
    
    try {
      console.log('🔍 Searching for enhanced alternatives:', searchIngredient)
      
      // Call our enhanced ingredient search API
      const response = await fetch('/api/ingredients/enhanced-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredient: searchIngredient,
          searchTypes: ['alternatives', 'substitutes'],
          location: '53206',
          city: 'Milwaukee, WI',
          preferredStore: currentStore
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.success) {
          setAlternatives(data.alternatives || [])
          setSubstitutes(data.substitutes || [])
          console.log('✅ Enhanced search results:', data)
        } else {
          setError(data.error || 'Search failed')
        }
      } else {
        setError('Network error while searching')
      }
    } catch (err) {
      console.error('Enhanced ingredient search error:', err)
      setError('Failed to search for alternatives')
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-search when ingredient changes
  useEffect(() => {
    if (isOpen && searchIngredient.trim()) {
      const searchTimer = setTimeout(() => {
        handleSearch()
      }, 500) // Debounce search
      
      return () => clearTimeout(searchTimer)
    }
  }, [searchIngredient, isOpen])

  const handleIngredientEdit = () => {
    setIsEditing(true)
  }

  const handleIngredientSave = () => {
    setIsEditing(false)
    if (searchIngredient !== originalIngredient) {
      handleSearch()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ChefHat className="w-6 h-6 text-blue-600" />
              Find Better Ingredients
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Editable Ingredient Search */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search for ingredient alternatives
                </label>
                <div className="relative">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={searchIngredient}
                        onChange={(e) => setSearchIngredient(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleIngredientSave()}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Type any ingredient..."
                        autoFocus
                      />
                      <button
                        onClick={handleIngredientSave}
                        className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium">
                        {searchIngredient}
                      </div>
                      <button
                        onClick={handleIngredientEdit}
                        className="px-4 py-3 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-blue-200"
                        title="Edit ingredient"
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {currentStore && (
                <div className="text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {currentStore}
                  </div>
                </div>
              )}
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b">
              {[
                { id: 'alternatives', label: 'Similar Products', count: alternatives.length },
                { id: 'substitutes', label: 'Cooking Substitutes', count: substitutes.length },
                { id: 'stores', label: 'Store Options', count: 0 }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-3 font-medium text-sm transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-gray-600">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Finding the best alternatives...</span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Alternatives Tab */}
              {activeTab === 'alternatives' && (
                <div className="space-y-4">
                  {alternatives.length === 0 ? (
                    <div className="text-center py-12">
                      <ChefHat className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">No alternatives found yet</p>
                      <p className="text-sm text-gray-500">Try searching for a different ingredient</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {alternatives.map((alt) => (
                        <div 
                          key={alt.id}
                          className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => onSelectAlternative(alt)}
                        >
                          <div className="flex items-start gap-3">
                            {alt.imageUrl && (
                              <img 
                                src={alt.imageUrl} 
                                alt={alt.name}
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-semibold text-gray-900 line-clamp-2">
                                    {alt.name}
                                  </h3>
                                  {alt.brand && (
                                    <p className="text-sm text-gray-600">{alt.brand}</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-gray-900">
                                    ${alt.price.toFixed(2)}
                                  </div>
                                  {alt.unitPrice && (
                                    <div className="text-xs text-gray-500">
                                      {alt.unitPrice}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="mt-2 space-y-1">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Package className="w-4 h-4" />
                                  {alt.packageSize}
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <MapPin className="w-4 h-4 text-gray-400" />
                                  <span className="text-gray-700">{alt.storeName}</span>
                                  {alt.inStock ? (
                                    <span className="text-green-600 text-xs font-medium">In Stock</span>
                                  ) : (
                                    <span className="text-orange-600 text-xs font-medium">Check Availability</span>
                                  )}
                                </div>
                              </div>

                              {alt.description && (
                                <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                  {alt.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Substitutes Tab */}
              {activeTab === 'substitutes' && (
                <div className="space-y-4">
                  {substitutes.length === 0 ? (
                    <div className="text-center py-12">
                      <Info className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">No cooking substitutes found yet</p>
                      <p className="text-sm text-gray-500">Try searching for a different ingredient</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {substitutes.map((sub, index) => (
                        <div 
                          key={index}
                          className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => onSelectAlternative(sub)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 mb-1">
                                {sub.name}
                              </h3>
                              <p className="text-sm text-gray-600 mb-2">
                                <strong>Ratio:</strong> {sub.ratio}
                              </p>
                              <p className="text-sm text-gray-700 mb-3">
                                {sub.notes}
                              </p>
                              
                              <div className="flex items-center gap-4 text-xs">
                                <span className={`px-2 py-1 rounded-full font-medium ${
                                  sub.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                                  sub.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {sub.difficulty} to use
                                </span>
                                <span className={`px-2 py-1 rounded-full font-medium ${
                                  sub.flavor === 'identical' ? 'bg-blue-100 text-blue-700' :
                                  sub.flavor === 'similar' ? 'bg-purple-100 text-purple-700' :
                                  'bg-orange-100 text-orange-700'
                                }`}>
                                  {sub.flavor} flavor
                                </span>
                                <span className="text-gray-500">
                                  {sub.availability}% available
                                </span>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="text-lg font-bold text-gray-900">
                                ${sub.price.toFixed(2)}
                              </div>
                              <div className="text-xs text-gray-500">
                                avg price
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Store Options Tab */}
              {activeTab === 'stores' && (
                <div className="text-center py-12">
                  <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Store comparison coming soon</p>
                  <p className="text-sm text-gray-500">Compare prices across different Milwaukee stores</p>
                </div>
              )}
              
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Results update automatically</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>Milwaukee area stores</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default EnhancedIngredientModal