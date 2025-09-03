'use client'

import React, { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { MapPin, Store, Clock, DollarSign, AlertCircle, CheckCircle2, Search, RefreshCw } from 'lucide-react'
import type { Ingredient } from '@/types'

// Enhanced types for unified pricing
interface StoreOption {
  storeName: string
  productName: string
  packageSize: string
  packagePrice: number
  unitPrice: string
  portionCost: number
  storeType: 'mainstream' | 'ethnic' | 'specialty'
  storeAddress: string
  sourceUrl: string
}

interface IngredientPricing {
  ingredient: string
  storeOptions: StoreOption[]
  alternatives?: string[]
  unavailable?: boolean
}

interface ShoppingStop {
  storeName: string
  storeType: 'mainstream' | 'ethnic' | 'specialty'
  storeAddress: string
  items: Array<{
    ingredient: string
    productName: string
    portionCost: number
    packagePrice: number
  }>
  totalCost: number
  estimatedTime: number
}

interface ShoppingPlan {
  totalCost: number
  totalStores: number
  primaryStore: ShoppingStop
  additionalStores: ShoppingStop[]
  unavailableItems: string[]
  shoppingOrder: string[]
  estimatedTotalTime: number
  notes: string[]
}

// Actual API response format from Perplexity API
interface PerplexityAPIResponse {
  results: Array<{
    id: number
    original: string
    matched: string
    priceLabel?: string
    estimatedCost: number
    portionCost: number
    packagePrice: number
    packageSize?: string
    confidence: number
    needsReview: boolean
    packages: number
    bestPriceSummary?: string
    storeName?: string
    storeType?: string
    storeAddress?: string
    sourceUrl?: string
    storeOptions?: StoreOption[]
    alternatives?: string[]
  }>
  totalEstimated: number
  source: string
  shoppingPlan?: ShoppingPlan
}

interface UnifiedPricingResponse {
  ingredients: IngredientPricing[]
  shoppingPlan: ShoppingPlan
  totalEstimatedCost: number
  culturalContext: string
}

interface UnifiedPricingPanelProps {
  ingredients: Ingredient[]
  zipCode: string
  city?: string
  culturalContext?: string
  onPricingComplete?: (data: UnifiedPricingResponse) => void
}

const MILWAUKEE_STORES = [
  'Pick n Save',
  'Metro Market', 
  'Woodmans Markets',
  'Festival Foods',
  'Walmart',
  'Target',
  'Aldi',
  'Whole Foods Market',
  'Fresh Thyme Farmers Market',
  'Asian International Market'
]

export function UnifiedPricingPanel({ 
  ingredients, 
  zipCode, 
  city = '', 
  culturalContext = 'general',
  onPricingComplete 
}: UnifiedPricingPanelProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [pricingData, setPricingData] = useState<UnifiedPricingResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preferredStore, setPreferredStore] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null)

  const generatePricing = useCallback(async () => {
    if (ingredients.length === 0) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/pricing/perplexity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: ingredients.map(ing => ({
            name: ing.name,
            amount: ing.amount || 1,
            unit: ing.unit || 'unit'
          })),
          zip: zipCode,
          city,
          context: culturalContext,
          defaultStore: preferredStore,
          preferredStores: preferredStore ? [preferredStore] : [],
          generateShoppingPlan: true,
          preferredStore: preferredStore
        })
      })

      if (!response.ok) throw new Error('Failed to generate pricing')

      const apiData: PerplexityAPIResponse = await response.json()
      console.log('🔍 Raw API response:', apiData)
      console.log('🔍 First result:', apiData.results?.[0])
      
      // Transform API data to component format
      const transformedData: UnifiedPricingResponse = {
        ingredients: apiData.results.map(result => ({
          ingredient: result.original,
          storeOptions: result.storeOptions || [{
            storeName: result.storeName || 'Store',
            productName: result.matched || 'Product',
            packageSize: result.packageSize || 'package',
            packagePrice: result.packagePrice || 0,
            unitPrice: result.priceLabel || `$${(result.packagePrice || 0).toFixed(2)}/unit`,
            portionCost: result.portionCost || result.estimatedCost || 0,
            storeType: (result.storeType as 'mainstream' | 'ethnic' | 'specialty') || 'mainstream',
            storeAddress: result.storeAddress || '',
            sourceUrl: result.sourceUrl || ''
          }],
          alternatives: result.alternatives,
          unavailable: result.needsReview && result.estimatedCost === 0
        })),
        shoppingPlan: apiData.shoppingPlan || {
          totalCost: apiData.totalEstimated,
          totalStores: 1,
          primaryStore: {
            storeName: apiData.results[0]?.storeName || 'Store',
            storeType: (apiData.results[0]?.storeType as 'mainstream' | 'ethnic' | 'specialty') || 'mainstream',
            storeAddress: apiData.results[0]?.storeAddress || '',
            items: apiData.results.map(result => ({
              ingredient: result.original || '',
              productName: result.matched || 'Product',
              portionCost: result.portionCost || result.estimatedCost || 0,
              packagePrice: result.packagePrice || 0
            })),
            totalCost: apiData.totalEstimated,
            estimatedTime: 30
          },
          additionalStores: [],
          unavailableItems: [],
          shoppingOrder: ['Visit your preferred store for all ingredients'],
          estimatedTotalTime: 30,
          notes: ['All items available at one location']
        },
        totalEstimatedCost: apiData.totalEstimated,
        culturalContext: culturalContext
      }
      
      setPricingData(transformedData)
      onPricingComplete?.(transformedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate pricing')
    } finally {
      setIsLoading(false)
    }
  }, [ingredients, zipCode, city, culturalContext, preferredStore, onPricingComplete])

  const handleAlternativeSelect = async (ingredient: string, alternative: string) => {
    const updatedIngredients = ingredients.map(ing => 
      ing.name === ingredient ? { ...ing, name: alternative } : ing
    )
    
    // Trigger re-pricing with updated ingredients
    setSelectedIngredient(null)
    await generatePricing()
  }

  const filteredStores = MILWAUKEE_STORES.filter(store => 
    store.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6" role="region" aria-label="Recipe Pricing Information">
      {/* Store Selection Controls */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <Store className="w-5 h-5" />
            Pricing Preferences
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="preferred-store" className="block text-sm font-medium text-gray-700">Preferred Store</label>
              <select 
                id="preferred-store"
                value={preferredStore} 
                onChange={(e) => setPreferredStore(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                aria-describedby="store-help-text"
              >
                <option value="">Select your preferred store</option>
                {MILWAUKEE_STORES.map(store => (
                  <option key={store} value={store}>
                    {store}
                  </option>
                ))}
              </select>
              <p id="store-help-text" className="text-sm text-gray-500">
                We'll check this store first for common ingredients
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="store-search" className="block text-sm font-medium text-gray-700">Search Stores</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="store-search"
                  type="text"
                  placeholder="Search for stores..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          <button
            onClick={generatePricing} 
            disabled={isLoading || ingredients.length === 0}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            aria-describedby={isLoading ? "loading-text" : undefined}
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating Pricing...
              </>
            ) : (
              <>
                <DollarSign className="w-4 h-4" />
                Get Pricing & Shopping Plan
              </>
            )}
          </button>
          {isLoading && (
            <p id="loading-text" className="sr-only">
              Generating pricing information and shopping plan
            </p>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-white border border-red-300 rounded-lg">
          <div className="p-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          </div>
        </div>
      )}

      {/* Shopping Plan Display */}
      {pricingData?.shoppingPlan && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Smart Shopping Plan
              </h3>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-lg font-medium bg-gray-100 text-gray-900">
                Total: ${(pricingData.shoppingPlan.totalCost || 0).toFixed(2)}
              </span>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span>Total Stores:</span>
                <span>{pricingData.shoppingPlan.totalStores}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Time:</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {pricingData.shoppingPlan.estimatedTotalTime} min
                </span>
              </div>
            </div>

            <div className="border-t border-gray-200 my-4"></div>

            {/* Primary Store */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Primary Store: {pricingData.shoppingPlan.primaryStore.storeName}
              </h4>
              <div className="pl-6 space-y-2">
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {pricingData.shoppingPlan.primaryStore.storeAddress}
                </p>
                <div className="space-y-1">
                  {pricingData.shoppingPlan.primaryStore.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{item.ingredient} - {item.productName}</span>
                      <span className="font-medium">${(item.portionCost || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="text-right font-medium">
                  Store Total: ${(pricingData.shoppingPlan.primaryStore.totalCost || 0).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Additional Stores */}
            {pricingData.shoppingPlan.additionalStores.map((store, storeIndex) => (
              <div key={storeIndex} className="space-y-3">
                <div className="border-t border-gray-200 my-4"></div>
                <h4 className="font-medium flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  {store.storeName}
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border">
                    {store.storeType}
                  </span>
                </h4>
                <div className="pl-6 space-y-2">
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {store.storeAddress}
                  </p>
                  <div className="space-y-1">
                    {store.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.ingredient} - {item.productName}</span>
                        <span className="font-medium">${(item.portionCost || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-right font-medium">
                    Store Total: ${(store.totalCost || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            ))}

            {/* Shopping Order */}
            {pricingData.shoppingPlan.shoppingOrder.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <h5 className="font-medium mb-2">Suggested Shopping Route:</h5>
                <ol className="text-sm space-y-1">
                  {pricingData.shoppingPlan.shoppingOrder.map((instruction, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="text-gray-500">{index + 1}.</span>
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Notes */}
            {pricingData.shoppingPlan.notes.length > 0 && (
              <div className="mt-4 p-3 border rounded-lg">
                <h5 className="font-medium mb-2">Shopping Tips:</h5>
                <ul className="text-sm space-y-1">
                  {pricingData.shoppingPlan.notes.map((note, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="text-gray-500">•</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detailed Ingredient Pricing */}
      {pricingData?.ingredients && pricingData.ingredients.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Detailed Ingredient Pricing</h3>
          </div>
          <div className="p-6 space-y-4">
            {pricingData.ingredients.map((ingredient, index) => (
              <div key={index} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium capitalize">{ingredient.ingredient}</h4>
                  {ingredient.alternatives && ingredient.alternatives.length > 0 && (
                    <button
                      onClick={() => setSelectedIngredient(
                        selectedIngredient === ingredient.ingredient ? null : ingredient.ingredient
                      )}
                      aria-expanded={selectedIngredient === ingredient.ingredient}
                      aria-controls={`alternatives-${index}`}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    >
                      View Alternatives ({ingredient.alternatives.length})
                    </button>
                  )}
                </div>

                {/* Alternatives Panel */}
                {selectedIngredient === ingredient.ingredient && ingredient.alternatives && (
                  <div id={`alternatives-${index}`} className="p-3 bg-gray-50 rounded-lg">
                    <h5 className="font-medium mb-2">Alternative Options:</h5>
                    <div className="flex flex-wrap gap-2">
                      {ingredient.alternatives.map((alt, altIndex) => (
                        <button
                          key={altIndex}
                          onClick={() => handleAlternativeSelect(ingredient.ingredient, alt)}
                          className="inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                        >
                          Use {alt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Store Options */}
                <div className="grid gap-3 md:grid-cols-2">
                  {ingredient.storeOptions.map((option, optionIndex) => (
                    <div key={optionIndex} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{option.storeName}</span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          option.storeType === 'ethnic' ? 'bg-purple-100 text-purple-700' : 
                          option.storeType === 'specialty' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {option.storeType}
                        </span>
                      </div>
                      <p className="text-sm mb-2">{option.productName}</p>
                      <div className="text-sm text-gray-500 space-y-1">
                        <div className="flex justify-between">
                          <span>Package:</span>
                          <span>{option.packageSize} - ${(option.packagePrice || 0).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Unit Price:</span>
                          <span>{option.unitPrice}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span>Recipe Cost:</span>
                          <span>${(option.portionCost || 0).toFixed(2)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {option.storeAddress}
                      </p>
                      {option.sourceUrl && (
                        <a
                          href={option.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-orange-600 hover:underline mt-1 block"
                        >
                          View Product
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                {index < pricingData.ingredients.length - 1 && <div className="border-t border-gray-200 my-4"></div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}