"use client"

import React, { useMemo, useState } from 'react'
import { Search, Loader2, MapPin, Store, CheckCircle2, Clock, Navigation, ExternalLink, RefreshCw, Shield, AlertTriangle } from 'lucide-react'
import IngredientSearchModal from './IngredientSearchModal'

export type StoreOption = {
  storeName: string
  productName: string
  packageSize: string
  packagePrice: number
  unitPrice: number | string
  portionCost: number
  storeType: 'mainstream' | 'global' | 'specialty' | string
  storeAddress?: string
  sourceUrl?: string
  verification?: 'verified' | 'corrected' | 'unverified'
  placeId?: string
  phone?: string
  website?: string
  rating?: number
}

export type IngredientPricing = {
  ingredient: string
  options: StoreOption[]
  selectedIndex?: number
}

type GroupedStore = {
  name: string
  type: string
  address: string
  items: Array<{
    ingredient: string
    productName: string
    packagePrice: number
    portionCost: number
    packageSize: string
  }>
  total: number
  estimatedTime: number
}

type Props = {
  data: IngredientPricing[]
  className?: string
  onSearchStores?: (ingredient: string, ingredientIndex: number) => Promise<StoreOption[]>
}

export function EnhancedPricingPanel({ data, className = '', onSearchStores }: Props) {
  const [selections, setSelections] = useState<number[]>(
    () => data.map(d => (typeof d.selectedIndex === 'number' && d.selectedIndex! >= 0 ? (d.selectedIndex as number) : 0))
  )
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const [searchingIdx, setSearchingIdx] = useState<number | null>(null)
  const [additionalOptions, setAdditionalOptions] = useState<Record<number, StoreOption[]>>({})
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  
  // Ingredient search modal state
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [searchingIngredient, setSearchingIngredient] = useState<string>('')
  const [searchingCurrentStore, setSearchingCurrentStore] = useState<string>('')

  const selectedOptions = useMemo(() => data.map((d, i) => {
    const originalOptions = d.options || []
    const extraOptions = additionalOptions[i] || []
    const allOptions = [...originalOptions, ...extraOptions]
    const selectedIndex = selections[i] ?? 0
    return allOptions[selectedIndex] || allOptions[0] || originalOptions[0]
  }), [data, selections, additionalOptions])
  
  const checkoutTotal = useMemo(
    () => selectedOptions.reduce((sum, o) => sum + (o?.packagePrice || 0), 0),
    [selectedOptions]
  )
  
  const portionTotal = useMemo(
    () => selectedOptions.reduce((sum, o) => sum + (o?.portionCost || 0), 0),
    [selectedOptions]
  )

  // Group ingredients by store for shopping list
  const groupedStores = useMemo(() => {
    const storeMap = new Map<string, GroupedStore>()
    
    selectedOptions.forEach((option, index) => {
      if (!option) return
      
      const storeName = option.storeName || 'Unknown Store'
      const ingredient = data[index]?.ingredient || 'Unknown'
      
      if (!storeMap.has(storeName)) {
        storeMap.set(storeName, {
          name: storeName,
          type: option.storeType || 'mainstream',
          address: option.storeAddress || '',
          items: [],
          total: 0,
          estimatedTime: 20
        })
      }
      
      const store = storeMap.get(storeName)!
      store.items.push({
        ingredient,
        productName: option.productName || 'Product',
        packagePrice: option.packagePrice || 0,
        portionCost: option.portionCost || 0,
        packageSize: option.packageSize || ''
      })
      store.total += option.packagePrice || 0
    })
    
    return Array.from(storeMap.values()).sort((a, b) => b.total - a.total)
  }, [selectedOptions, data])

  const totalStores = groupedStores.length
  const totalTime = groupedStores.reduce((sum, store) => sum + store.estimatedTime, 0) + (totalStores - 1) * 10

  const handleSelect = (ingIdx: number, optIdx: number) => {
    setSelections(prev => {
      const next = [...prev]
      next[ingIdx] = optIdx
      return next
    })
    setOpenIdx(null)
  }

  const handleItemCheck = (storeName: string, ingredient: string, checked: boolean) => {
    setCheckedItems(prev => ({
      ...prev,
      [`${storeName}-${ingredient}`]: checked
    }))
  }

  const handleSearchIngredient = (ingredient: string, currentStore?: string) => {
    setSearchingIngredient(ingredient)
    setSearchingCurrentStore(currentStore || '')
    setSearchModalOpen(true)
  }

  const handleAlternativeSelect = (alternative: any) => {
    // TODO: Integrate selected alternative back into pricing data
    console.log('Alternative selected:', alternative)
    // For now, just close the modal - in a full implementation, 
    // this would update the pricing data with the new alternative
  }

  const handleSearchMoreStores = async (ingredientIndex: number) => {
    if (!onSearchStores || searchingIdx !== null) return
    
    setSearchingIdx(ingredientIndex)
    try {
      const ingredient = data[ingredientIndex]?.ingredient
      if (ingredient) {
        const newOptions = await onSearchStores(ingredient, ingredientIndex)
        setAdditionalOptions(prev => ({
          ...prev,
          [ingredientIndex]: newOptions
        }))
      }
    } catch (error) {
      console.error('Failed to search for more stores:', error)
    } finally {
      setSearchingIdx(null)
    }
  }

  const getDirectionsUrl = (address: string) => {
    const encodedAddress = encodeURIComponent(address)
    return `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`
  }

  const checkedItemsCount = Object.values(checkedItems).filter(Boolean).length
  const totalItemsCount = selectedOptions.length

  return (
    <div className={`w-full space-y-6 ${className}`}>
      {/* Enhanced Hero Section */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-6">
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
            <h2 className="text-2xl font-bold text-green-900">Recipe Total</h2>
          </div>
          <div className="text-4xl font-black text-green-900 mb-2">
            ${checkoutTotal.toFixed(2)}
          </div>
          <div className="flex items-center justify-center gap-4 text-sm text-green-700">
            <span className="flex items-center gap-1">
              <Store className="w-4 h-4" />
              {totalStores} store{totalStores === 1 ? '' : 's'}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              ~{totalTime} min
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs bg-purple-100 text-purple-800 border border-purple-200">
              Source: Perplexity AI
            </span>
            <span className="text-green-700">Verified store locations</span>
          </div>
          <div className="text-green-700">
            Portion cost: <span className="font-semibold">${portionTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Shopping Progress */}
      {totalItemsCount > 0 && (
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              Shopping Progress
            </h3>
            <span className="text-sm text-gray-600">
              {checkedItemsCount} / {totalItemsCount} items
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(checkedItemsCount / totalItemsCount) * 100}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 text-center">
            {checkedItemsCount === totalItemsCount ? '🎉 Shopping complete!' : 'Check off items as you shop'}
          </div>
        </div>
      )}

      {/* Shopping List by Store */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Store className="w-5 h-5" />
          Your Shopping Plan
        </h3>
        
        {groupedStores.map((store, storeIndex) => (
          <div key={store.name} className="bg-white rounded-xl border shadow-sm overflow-hidden">
            {/* Store Header */}
            <div className="bg-gray-50 border-b p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-semibold text-gray-900">{store.name}</h4>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                      store.type === 'global' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      store.type === 'specialty' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-gray-50 text-gray-700 border-gray-200'
                    }`}>
                      {store.type}
                    </span>
                    {storeIndex === 0 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                        Start here
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="font-semibold text-lg text-gray-900">
                      ${store.total.toFixed(2)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      ~{store.estimatedTime} min
                    </span>
                    {store.address && (
                      <span className="flex items-center gap-1 text-xs">
                        <MapPin className="w-3 h-3" />
                        {store.address.split(',')[0]}
                      </span>
                    )}
                  </div>
                </div>
                
                {store.address && (
                  <a
                    href={getDirectionsUrl(store.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    <Navigation className="w-4 h-4" />
                    Directions
                  </a>
                )}
              </div>
            </div>

            {/* Store Items */}
            <div className="divide-y divide-gray-100">
              {store.items.map((item, itemIndex) => {
                const itemKey = `${store.name}-${item.ingredient}`
                const isChecked = checkedItems[itemKey] || false
                
                return (
                  <label 
                    key={itemIndex}
                    className={`flex items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      isChecked ? 'bg-green-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => handleItemCheck(store.name, item.ingredient, e.target.checked)}
                      className="w-5 h-5 text-green-600 bg-white border-gray-300 rounded focus:ring-green-500 focus:ring-2 mr-4"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className={`flex items-center justify-between ${isChecked ? 'line-through text-gray-500' : ''}`}>
                        <div>
                          <div className="font-medium text-gray-900 capitalize">
                            {item.ingredient}
                          </div>
                          <div className="text-sm text-gray-600 truncate max-w-[250px] sm:max-w-none">
                            {item.productName}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            {item.packageSize && (
                              <span className="bg-gray-100 px-2 py-1 rounded">
                                {item.packageSize}
                              </span>
                            )}
                            <span>Recipe portion: ${item.portionCost.toFixed(2)}</span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900">
                            ${item.packagePrice.toFixed(2)}
                          </div>
                          <div className="flex flex-col gap-1 mt-1">
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                const ingIndex = data.findIndex(d => d.ingredient === item.ingredient)
                                if (ingIndex >= 0) setOpenIdx(ingIndex)
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Change Store
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                handleSearchIngredient(item.ingredient, store.name)
                              }}
                              className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Find Alternatives
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Store Selection Modal - Enhanced */}
      {openIdx !== null && (() => {
        const oi = openIdx as number
        const row = data[oi]
        const selIdx = selections[oi] ?? 0
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setOpenIdx(null)} aria-hidden="true" />
            <div className="relative w-full sm:max-w-2xl max-h-[90vh] overflow-auto bg-white rounded-2xl shadow-xl border">
              <div className="sticky top-0 bg-white border-b p-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Choose Store</h3>
                  <button 
                    onClick={() => setOpenIdx(null)} 
                    className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Find the best price for <span className="font-medium">{row?.ingredient}</span>
                </p>
              </div>

              <div className="p-4 space-y-4">
                {/* Search for more stores */}
                {onSearchStores && (
                  <button 
                    onClick={() => handleSearchMoreStores(oi)}
                    disabled={searchingIdx === oi}
                    className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
                  >
                    {searchingIdx === oi ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Searching local stores...
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        Find More Store Options
                      </>
                    )}
                  </button>
                )}
                
                {/* Store options */}
                <div className="space-y-3">
                  {/* Combine original options with additional options */}
                  {(() => {
                    const originalOptions = row?.options || []
                    const extraOptions = additionalOptions[oi] || []
                    const allOptions = [...originalOptions, ...extraOptions]
                    
                    return allOptions.map((opt, j) => {
                      const isSelected = selIdx === j
                    return (
                      <div 
                        key={j} 
                        className={`rounded-xl border-2 p-4 transition-all cursor-pointer ${
                          isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleSelect(oi, j)}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-gray-900">{opt.storeName}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                opt.storeType === 'global' ? 'bg-purple-100 text-purple-700' :
                                opt.storeType === 'specialty' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {opt.storeType}
                              </span>
                              {/* Address verification indicator */}
                              {opt.verification === 'verified' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                                  <Shield className="w-3 h-3" />
                                  Verified
                                </span>
                              )}
                              {opt.verification === 'corrected' && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
                                  <AlertTriangle className="w-3 h-3" />
                                  Corrected
                                </span>
                              )}
                              {isSelected && (
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                              )}
                            </div>
                            
                            <p className="text-gray-700 mb-3">{opt.productName}</p>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Package Price:</span>
                                <div className="font-bold text-lg text-gray-900">
                                  ${opt.packagePrice.toFixed(2)}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-500">Recipe Portion:</span>
                                <div className="font-medium text-gray-700">
                                  ${opt.portionCost.toFixed(2)}
                                </div>
                              </div>
                            </div>
                            
                            {opt.storeAddress && (
                              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {opt.storeAddress}
                              </p>
                            )}
                            
                            {opt.sourceUrl && (
                              <a
                                href={opt.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-2"
                              >
                                <ExternalLink className="w-3 h-3" />
                                View Product
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                  })()}
                </div>
              </div>
            </div>
          </div>
        )
      })()}
        
      {/* Ingredient Search Modal */}
      <IngredientSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        ingredient={searchingIngredient}
        currentStore={searchingCurrentStore}
        onAlternativeSelect={handleAlternativeSelect}
      />
    </div>
  )
}

export { EnhancedPricingPanel as default }