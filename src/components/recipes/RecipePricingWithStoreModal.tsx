"use client"

import React, { useMemo, useState } from 'react'
import { Search, Loader2 } from 'lucide-react'

export type StoreOption = {
  storeName: string
  productName: string
  packageSize: string
  packagePrice: number
  unitPrice: number | string
  portionCost: number
  storeType: 'mainstream' | 'ethnic' | 'specialty' | string
  storeAddress?: string
  sourceUrl?: string
}

export type IngredientPricing = {
  ingredient: string
  options: StoreOption[]
  selectedIndex?: number
}

type Props = {
  data: IngredientPricing[]
  className?: string
  onSearchStores?: (ingredient: string, ingredientIndex: number) => Promise<StoreOption[]>
}

export function RecipePricingWithStoreModal({ data, className = '', onSearchStores }: Props) {
  const [selections, setSelections] = useState<number[]>(
    () => data.map(d => (typeof d.selectedIndex === 'number' && d.selectedIndex! >= 0 ? (d.selectedIndex as number) : 0))
  )
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  const [searchingIdx, setSearchingIdx] = useState<number | null>(null)
  const [additionalOptions, setAdditionalOptions] = useState<Record<number, StoreOption[]>>({})

  const selectedOptions = useMemo(() => data.map((d, i) => d.options[(selections[i] ?? 0) as number] || d.options[0]), [data, selections])
  const checkoutTotal = useMemo(
    () => selectedOptions.reduce((sum, o) => sum + (o?.packagePrice || 0), 0),
    [selectedOptions]
  )
  const portionTotal = useMemo(
    () => selectedOptions.reduce((sum, o) => sum + (o?.portionCost || 0), 0),
    [selectedOptions]
  )

  const handleSelect = (ingIdx: number, optIdx: number) => {
    setSelections(prev => {
      const next = [...prev]
      next[ingIdx] = optIdx
      return next
    })
    setOpenIdx(null)
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

  return (
    <div className={`w-full ${className}`}>
      <div className="mb-5">
        <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-lg font-semibold text-gray-900">Estimated Checkout Total</div>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-100 text-purple-800 border border-purple-200">
                Source: Perplexity
              </span>
            </div>
            <div className="text-3xl font-bold text-gray-900">${checkoutTotal.toFixed(2)}</div>
            <div className="text-xs text-gray-500">Sum of full pack prices (what you pay in-store)</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">
              Portion subtotal: <span className="font-semibold">${portionTotal.toFixed(2)}</span>
            </div>
            <div className="text-xs text-gray-500">Recipe portion cost (for info only)</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {data.map((row, i) => {
          const selIdx = selections[i] ?? 0
          const safeIdx = selIdx >= 0 && selIdx < row.options.length ? selIdx : 0
          const sel = row.options[safeIdx]
          return (
            <div key={row.ingredient + i} className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-base font-semibold text-gray-900">{row.ingredient}</div>
                  <div className="mt-2 text-sm text-gray-700">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200">
                        {sel?.storeType || 'mainstream'}
                      </span>
                      <span className="font-medium">{sel?.storeName || 'Unknown Store'}</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-700 truncate max-w-[40ch]">{sel?.productName || 'Product'}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-gray-600">
                      <span className="inline-flex items-center text-sm font-semibold text-gray-900">
                        ${Number(sel?.packagePrice || 0).toFixed(2)}
                      </span>
                      {sel?.packageSize && (
                        <span className="text-xs bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">
                          {sel.packageSize}
                        </span>
                      )}
                      {sel?.unitPrice !== undefined && (
                        <span className="text-xs">
                          Unit: {typeof sel.unitPrice === 'number' ? `$${sel.unitPrice.toFixed(2)}` : sel.unitPrice}
                        </span>
                      )}
                      <span className="text-xs">Portion: ${Number(sel?.portionCost || 0).toFixed(2)}</span>
                      {sel?.storeAddress && (
                        <span className="text-xs text-gray-500 truncate max-w-[28ch]">{sel.storeAddress}</span>
                      )}
                      {sel?.sourceUrl && (
                        <a href={sel.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                          Source
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="shrink-0">
                  <button onClick={() => setOpenIdx(i)} className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 text-sm">
                    Change Store
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {openIdx !== null && (() => {
        const oi = openIdx as number
        const row = data[oi]
        const selIdx = selections[oi] ?? 0
        return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpenIdx(null)} aria-hidden="true" />
          <div className="relative w-full sm:max-w-2xl max-h-[85vh] overflow-auto bg-white rounded-t-xl sm:rounded-xl shadow-lg border">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="text-lg font-bold text-gray-900">Choose Store — {row?.ingredient}</div>
              <button onClick={() => setOpenIdx(null)} className="text-gray-500 hover:text-gray-700 text-sm" aria-label="Close">✕</button>
            </div>
            <div className="p-4 space-y-3">
              {/* Search for more stores button */}
              {onSearchStores && (
                <div className="border-b pb-3 mb-4">
                  <button 
                    onClick={() => handleSearchMoreStores(oi)}
                    disabled={searchingIdx === oi}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                  >
                    {searchingIdx === oi ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Searching with Perplexity AI...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        Find More Store Options
                      </>
                    )}
                  </button>
                  {additionalOptions[oi] && additionalOptions[oi].length > 0 && (
                    <div className="mt-2 text-xs text-green-600 text-center">
                      Found {additionalOptions[oi].length} additional options via Perplexity AI
                    </div>
                  )}
                </div>
              )}
              
              {/* Original options */}
              {(row?.options || []).map((opt, j) => {
                const isSelected = selIdx === j
                return (
                  <div key={opt.storeName + j} className={`rounded-lg border p-3 flex items-start justify-between gap-3 ${isSelected ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{opt.storeName || 'Unknown Store'}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-800 border">
                          {opt.storeType || 'mainstream'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 mt-1">{opt.productName || 'Product'}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                        <span className="text-sm font-semibold text-gray-900">${Number(opt?.packagePrice || 0).toFixed(2)}</span>
                        {opt.packageSize && <span className="bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">{opt.packageSize}</span>}
                        {opt.unitPrice !== undefined && <span>Unit Price: {typeof opt.unitPrice === 'number' ? `$${opt.unitPrice.toFixed(2)}` : opt.unitPrice}</span>}
                        <span>Portion Cost: ${Number(opt.portionCost || 0).toFixed(2)}</span>
                      </div>
                      {opt.storeAddress && (
                        <div className="mt-1 text-xs text-gray-500">{opt.storeAddress}</div>
                      )}
                      {opt.sourceUrl && (
                        <a href={opt.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-blue-600 hover:underline">Source</a>
                      )}
                    </div>
                    <div className="shrink-0">
                      <button onClick={() => handleSelect(oi, j)} className={`px-3 py-2 rounded-lg text-sm border ${isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'}`}>
                        {isSelected ? 'Selected' : 'Choose'}
                      </button>
                    </div>
                  </div>
                )
              })}
              
              {/* Additional search results */}
              {additionalOptions[oi] && additionalOptions[oi].length > 0 && (
                <>
                  <div className="border-t pt-3 mt-4">
                    <div className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <Search className="w-4 h-4 text-blue-600" />
                      Additional Options via Perplexity AI
                    </div>
                  </div>
                  {additionalOptions[oi].map((opt, j) => {
                    const adjustedIndex = (row?.options?.length || 0) + j
                    const isSelected = selIdx === adjustedIndex
                    return (
                      <div key={`additional-${opt.storeName}-${j}`} className={`rounded-lg border p-3 flex items-start justify-between gap-3 ${isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">{opt.storeName || 'Unknown Store'}</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800 border border-blue-200">
                              Perplexity AI
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-800 border">
                              {opt.storeType || 'mainstream'}
                            </span>
                          </div>
                          <div className="text-sm text-gray-700 mt-1">{opt.productName || 'Product'}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                            <span className="text-sm font-semibold text-gray-900">${Number(opt?.packagePrice || 0).toFixed(2)}</span>
                            {opt.packageSize && <span className="bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">{opt.packageSize}</span>}
                            {opt.unitPrice !== undefined && <span>Unit Price: {typeof opt.unitPrice === 'number' ? `$${opt.unitPrice.toFixed(2)}` : opt.unitPrice}</span>}
                            <span>Portion Cost: ${Number(opt.portionCost || 0).toFixed(2)}</span>
                          </div>
                          {opt.storeAddress && (
                            <div className="mt-1 text-xs text-gray-500">{opt.storeAddress}</div>
                          )}
                          {opt.sourceUrl && (
                            <a href={opt.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-blue-600 hover:underline">Source</a>
                          )}
                        </div>
                        <div className="shrink-0">
                          <button onClick={() => {
                            // We need to add these additional options to the ingredient's options temporarily
                            const updatedData = [...data]
                            if (updatedData[oi] && !updatedData[oi].options.includes(opt)) {
                              updatedData[oi].options.push(opt)
                            }
                            handleSelect(oi, adjustedIndex)
                          }} className={`px-3 py-2 rounded-lg text-sm border ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'}`}>
                            {isSelected ? 'Selected' : 'Choose'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-700">Checkout total: <span className="font-semibold">${selectedOptions.reduce((s, o) => s + (o?.packagePrice || 0), 0).toFixed(2)}</span></div>
              <button onClick={() => setOpenIdx(null)} className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 hover:bg-gray-100 text-sm">Done</button>
            </div>
          </div>
        </div>)})()}
    </div>
  )
}

export default RecipePricingWithStoreModal
