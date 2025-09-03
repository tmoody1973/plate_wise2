'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { MapPin, Store, DollarSign, AlertCircle, Clock, ShoppingCart, CheckCircle2 } from 'lucide-react'
import type { Ingredient } from '@/types'

interface IngredientPrice {
  name: string
  price: number
  store: string
  confidence: 'verified' | 'estimated'
}

interface SimplePricingPanelProps {
  ingredients: Ingredient[]
  zipCode: string
  city?: string
  culturalContext?: string
}

// Intelligent price estimation based on ingredient type
const estimatePrice = (ingredient: string): number => {
  const name = ingredient.toLowerCase()
  
  // Spices and seasonings (expensive per unit but small amounts needed)
  if (name.includes('dashi') || name.includes('miso')) return 0.25
  if (name.includes('sauce') && name.includes('okonomiyaki')) return 1.50
  if (name.includes('soy sauce')) return 0.30
  if (name.includes('salt') || name.includes('pepper')) return 0.10
  
  // Fresh produce
  if (name.includes('cabbage')) return 1.50
  if (name.includes('onion')) return 0.75
  if (name.includes('garlic')) return 0.25
  
  // Proteins
  if (name.includes('bacon')) return 2.50
  if (name.includes('egg')) return 0.30
  
  // Pantry staples
  if (name.includes('flour')) return 0.50
  if (name.includes('oil')) return 0.25
  if (name.includes('water')) return 0.05
  
  // Default fallback
  return 1.00
}

const getStoreForIngredient = (ingredient: string): string => {
  const name = ingredient.toLowerCase()
  
  if (name.includes('dashi') || name.includes('miso') || name.includes('okonomiyaki')) {
    return 'Asian International Market'
  }
  if (name.includes('bacon') || name.includes('egg')) {
    return 'Metro Market'
  }
  return 'Pick n Save'
}

export function SimplePricingPanel({ 
  ingredients, 
  zipCode, 
  city = 'Milwaukee', 
  culturalContext = 'general'
}: SimplePricingPanelProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [pricingData, setPricingData] = useState<IngredientPrice[]>([])
  const [error, setError] = useState<string | null>(null)
  const [preferredStore, setPreferredStore] = useState<string>('Pick n Save')

  const MILWAUKEE_STORES = [
    'Pick n Save',
    'Metro Market',
    'Asian International Market',
    'Walmart',
    'Target',
    'Woodmans Markets'
  ]

  const generatePricing = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Try the Perplexity API first
      const response = await fetch('/api/pricing/perplexity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: ingredients,  // Send full ingredient objects like working system
          location: zipCode || '53206',  // Use 'location' not 'zip' 
          city: city || 'Milwaukee',
          culturalContext: culturalContext,  // Use full name like working system
          defaultStoreName: preferredStore  // Use 'defaultStoreName' not 'defaultStore'
        })
      })

      if (response.ok) {
        const apiData = await response.json()
        console.log('✅ API Response:', apiData)
        console.log('✅ First result sample:', apiData.results?.[0])
        
        // Transform API response to simple format
        const prices: IngredientPrice[] = apiData.results?.map((result: any) => {
          const ingredientName = result.original || result.ingredient || 'Unknown'
          const portionCost = result.portionCost || result.estimatedCost || 0
          const finalPrice = portionCost > 0 ? portionCost : estimatePrice(ingredientName)
          
          console.log(`✅ Processing: ${ingredientName} = $${finalPrice} (raw: ${portionCost})`)
          
          return {
            name: ingredientName,
            price: finalPrice,
            store: result.storeName || getStoreForIngredient(ingredientName),
            confidence: (portionCost > 0) ? 'verified' : 'estimated'
          }
        }) || []

        // Fallback to estimates if no valid prices
        if (prices.length === 0 || prices.every(p => p.price === 0)) {
          throw new Error('No valid pricing data returned')
        }

        setPricingData(prices)
      } else {
        console.error('API request failed:', response.status, response.statusText)
        throw new Error(`API request failed: ${response.status}`)
      }
    } catch (err) {
      console.warn('API failed, using intelligent estimates:', err)
      
      // Fallback to intelligent estimates
      const estimatedPrices: IngredientPrice[] = ingredients.map(ing => ({
        name: ing.name,
        price: estimatePrice(ing.name),
        store: getStoreForIngredient(ing.name),
        confidence: 'estimated'
      }))
      
      setPricingData(estimatedPrices)
    } finally {
      setIsLoading(false)
    }
  }

  const totalCost = pricingData.reduce((sum, item) => sum + item.price, 0)
  const uniqueStores = [...new Set(pricingData.map(item => item.store))]
  const verifiedCount = pricingData.filter(item => item.confidence === 'verified').length

  return (
    <div className="space-y-6">
      {/* Simple Store Selection */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <Store className="w-5 h-5" />
          Where do you shop?
        </h3>
        
        <div className="space-y-4">
          <select 
            value={preferredStore} 
            onChange={(e) => setPreferredStore(e.target.value)}
            className="block w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            {MILWAUKEE_STORES.map(store => (
              <option key={store} value={store}>{store}</option>
            ))}
          </select>
          
          <button
            onClick={generatePricing}
            disabled={isLoading || ingredients.length === 0}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-6 py-4 rounded-lg font-medium text-lg transition-colors flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Getting Prices...
              </>
            ) : (
              <>
                <DollarSign className="w-5 h-5" />
                Get Recipe Prices
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {pricingData.length > 0 && (
        <>
          {/* Price Summary */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-xl font-bold text-green-900 mb-2">
              Recipe Total: ${totalCost.toFixed(2)}
            </h3>
            <div className="text-sm text-green-700 space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {uniqueStores.length} store{uniqueStores.length === 1 ? '' : 's'} needed
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                About {Math.max(30, uniqueStores.length * 20)} minutes shopping
              </div>
              {verifiedCount > 0 && (
                <div className="text-xs">
                  {verifiedCount} verified price{verifiedCount === 1 ? '' : 's'}, {pricingData.length - verifiedCount} estimated
                </div>
              )}
            </div>
          </div>

          {/* Shopping Plan by Store */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Your Shopping Plan
              </h3>
            </div>
            
            <div className="divide-y divide-gray-200">
              {uniqueStores.map((store, storeIndex) => {
                const storeItems = pricingData.filter(item => item.store === store)
                const storeTotal = storeItems.reduce((sum, item) => sum + item.price, 0)
                
                return (
                  <div key={store} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        <Store className="w-4 h-4" />
                        {store}
                        {storeIndex === 0 && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                            PRIMARY
                          </span>
                        )}
                      </h4>
                      <span className="font-medium text-gray-900">
                        ${storeTotal.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {storeItems.map((item, index) => (
                        <div key={index} className="flex justify-between items-center py-2">
                          <div>
                            <span className="text-gray-900">{item.name}</span>
                            {item.confidence === 'estimated' && (
                              <span className="ml-2 text-xs text-gray-500 italic">estimated</span>
                            )}
                          </div>
                          <span className="font-medium text-gray-700">
                            ${item.price.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}