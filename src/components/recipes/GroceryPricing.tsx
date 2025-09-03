'use client'

import React, { useMemo, useState } from 'react'
import { ShoppingCart, MapPin, DollarSign, AlertCircle, Check, X, Star, Search, Plus } from 'lucide-react'
import type { Recipe } from '@/types'
import { parsePackSize, estimatePacksNeeded, normalizeUnit } from '@/utils/units'

export interface GroceryPricingItem {
  id: number
  original: string
  matched?: string
  priceLabel?: string
  estimatedCost: number
  needsReview?: boolean
  confidence?: number
  packages?: number
  packageSize?: string
  portionCost?: number
  packagePrice?: number
  // Optional: enhanced pricing comparison
  bestPriceSummary?: string // e.g., "$1.00/lb at Cermak"
  seasonalNote?: string
  compare?: {
    ethnic?: { store: string; price: string; tags?: string[] }[]
    mainstream?: { store: string; price: string; tags?: string[] }[]
    bulk?: { store: string; price: string; tags?: string[] }[]
  }
}

interface GroceryPricingProps {
  recipe: Recipe
  items: GroceryPricingItem[]
  zipValue: string
  selectedStoreName?: string
  isDefaultStore?: boolean
  isSearchingStore?: boolean
  refreshing?: boolean
  onZipChange: (v: string) => void
  onFindStore: () => void
  onSetDefault: () => void
  onRefreshPrices: () => void
  onSearchItem: (index: number) => void
  onReviewItem: (index: number) => void
  onChangeStore?: (index: number, storeOption: any) => void
}

export function GroceryPricing({
  recipe,
  items,
  zipValue,
  selectedStoreName,
  isDefaultStore,
  isSearchingStore,
  refreshing,
  onZipChange,
  onFindStore,
  onSetDefault,
  onRefreshPrices,
  onSearchItem,
  onReviewItem,
  onChangeStore,
}: GroceryPricingProps) {
  const [added, setAdded] = useState<Set<number>>(new Set())
  const [openCompare, setOpenCompare] = useState<number | null>(null)

  const totalEstimated = useMemo(() => items.reduce((s, it) => s + (it.estimatedCost || 0), 0), [items])
  const reviewCount = items.filter(i => i.needsReview).length

  const handleAdd = (id: number) => {
    const next = new Set(added)
    next.add(id)
    setAdded(next)
    setTimeout(() => {
      const n2 = new Set(next)
      n2.delete(id)
      setAdded(n2)
    }, 1500)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShoppingCart className="w-7 h-7 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Recipe Pricing</h2>
      </div>

      {/* Store Controls (Select Store Location) */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
        <div>
          <div className="text-gray-900 font-semibold mb-3">Select Store Location</div>
          <label className="block text-sm text-gray-700 mb-1" htmlFor="zipInput">ZIP Code</label>
          <div className="flex items-center gap-3">
            <input
              id="zipInput"
              value={zipValue}
              onChange={e => onZipChange(e.target.value)}
              placeholder="ZIP"
              maxLength={5}
              className="w-32 md:w-40 px-3 py-2 border border-gray-300 rounded-lg bg-white shadow-sm"
            />
            <button
              onClick={onFindStore}
              disabled={isSearchingStore || zipValue.length !== 5}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              {isSearchingStore ? 'Finding…' : 'Find Store'}
            </button>
          </div>
        </div>

        {/* Selected store line */}
        <div className="flex flex-wrap items-center gap-2 text-gray-700">
          <MapPin className="w-5 h-5" />
          <span>{selectedStoreName || 'No store selected'}</span>
          {isDefaultStore && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">
              <Star className="w-3 h-3 fill-current" /> Default
            </span>
          )}
          {!isDefaultStore && selectedStoreName && (
            <button onClick={onSetDefault} className="ml-2 px-2 py-1 text-xs rounded border bg-green-50 text-green-800 border-green-200">Set Default</button>
          )}
          <button onClick={onRefreshPrices} disabled={refreshing} className="ml-auto px-3 py-1.5 rounded-lg border bg-purple-50 text-purple-800 border-purple-200 disabled:opacity-50">
            {refreshing ? 'Refreshing…' : 'Refresh Prices'}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-blue-600" />
          <div>
            <div className="text-xl font-bold text-blue-800">Total Estimated Cost: ${totalEstimated.toFixed(2)}</div>
            <div className="text-blue-700">For entire recipe (not per serving)</div>
          </div>
        </div>
        {reviewCount > 0 && (
          <div className="text-orange-700 font-semibold">{reviewCount} item{reviewCount>1?'s':''} need review</div>
        )}
      </div>

      {/* Section header */}
      <div className="pt-2">
        <h3 className="text-2xl font-bold text-gray-900">Ingredients & Pricing</h3>
      </div>

      {/* Items */}
      <div className="space-y-4">
        {items.map((it, idx) => {
          let derivedPacks: number | undefined
          if (!it.packages && it.packageSize) {
            const ing = recipe.ingredients.find(r => r.name.toLowerCase().trim() === it.original.toLowerCase().trim())
            const parsed = parsePackSize(it.packageSize)
            if (ing && parsed) {
              const u = normalizeUnit(ing.unit) || 'each'
              derivedPacks = estimatePacksNeeded(ing.amount || 0, u, parsed.qty, parsed.unit)
            }
          }
          return (
          <div key={it.id} className={`border rounded-xl p-4 ${it.needsReview ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-lg font-semibold text-gray-900 mb-1">{it.original}</div>
                <div className="flex items-center gap-2 mb-2">
                  {it.matched && it.matched !== 'No match found' ? (
                    <>
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-gray-700">{it.matched}</span>
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4 text-red-500" />
                      <span className="text-red-700">No match found</span>
                    </>
                  )}
                </div>
                {typeof it.portionCost === 'number' && (
                  <div className="text-sm text-green-700 font-medium mb-1">
                    Recipe portion: ${it.portionCost.toFixed(2)}
                  </div>
                )}
                <div className="text-gray-600 text-sm flex items-center gap-2">
                  {it.priceLabel && <span>{it.priceLabel}</span>}
                  {(it.packages || derivedPacks) && it.packageSize && (
                    <span className="text-xs text-gray-600 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">{it.packages || derivedPacks} × {it.packageSize}</span>
                  )}
                </div>

                {/* Compact best price + compare toggle */}
                {(it.bestPriceSummary || it.compare) && (
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    {it.bestPriceSummary && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Cheapest: {it.bestPriceSummary}
                      </span>
                    )}
                    {it.seasonalNote && (
                      <span className="inline-flex items-center gap-1 text-gray-500">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{it.seasonalNote}</span>
                      </span>
                    )}
                    {it.compare && (
                      <button
                        className="ml-auto text-blue-700 hover:underline"
                        onClick={() => setOpenCompare(openCompare === it.id ? null : it.id)}
                        aria-expanded={openCompare === it.id}
                      >
                        {openCompare === it.id ? 'Hide comparison' : 'Compare prices'}
                      </button>
                    )}
                  </div>
                )}

                {/* Collapsible comparison panel */}
                {openCompare === it.id && it.compare && (
                  <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
                    {/* Ethnic / Specialty */}
                    {it.compare.ethnic && it.compare.ethnic.length > 0 && (
                      <div className="p-3 border-b border-gray-100">
                        <div className="text-xs font-semibold text-gray-600 mb-1">Ethnic / Specialty</div>
                        <div className="divide-y">
                          {it.compare.ethnic.slice(0, 3).map((o, i) => (
                            <div key={o.store + i} className="flex items-center justify-between py-1.5">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{o.store}</span>
                                {(o.tags || []).map(t => (
                                  <span key={t} className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border">
                                    {t}
                                  </span>
                                ))}
                              </div>
                              <div className="text-sm tabular-nums">{o.price}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Mainstream Grocery */}
                    {it.compare.mainstream && it.compare.mainstream.length > 0 && (
                      <div className="p-3 border-b border-gray-100">
                        <div className="text-xs font-semibold text-gray-600 mb-1">Mainstream Grocery</div>
                        <div className="divide-y">
                          {it.compare.mainstream.slice(0, 3).map((o, i) => (
                            <div key={o.store + i} className="flex items-center justify-between py-1.5">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{o.store}</span>
                                {(o.tags || []).map(t => (
                                  <span key={t} className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border">
                                    {t}
                                  </span>
                                ))}
                              </div>
                              <div className="text-sm tabular-nums">{o.price}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bulk */}
                    {it.compare.bulk && it.compare.bulk.length > 0 && (
                      <div className="p-3">
                        <div className="text-xs font-semibold text-gray-600 mb-1">Bulk</div>
                        <div className="divide-y">
                          {it.compare.bulk.slice(0, 3).map((o, i) => (
                            <div key={o.store + i} className="flex items-center justify-between py-1.5">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{o.store}</span>
                                {(o.tags || []).map(t => (
                                  <span key={t} className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border">
                                    {t}
                                  </span>
                                ))}
                              </div>
                              <div className="text-sm tabular-nums">{o.price}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">${(it.packagePrice || it.estimatedCost).toFixed(2)}</div>
                  <div className="text-sm text-gray-500">store price</div>
                </div>
                <button onClick={() => handleAdd(it.id as number)} className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${added.has(it.id) ? 'bg-green-100 text-green-800 border-green-300' : 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700'}`}>
                  {added.has(it.id) ? (<><Check className="w-4 h-4" /> Added</>) : (<><Plus className="w-4 h-4" /> Add to Cart</>)}
                </button>
                <button onClick={() => onSearchItem(idx)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-300 text-blue-800 hover:bg-blue-50">
                  <Search className="w-4 h-4" /> Search
                </button>
                {it.needsReview && (
                  <button onClick={() => onReviewItem(idx)} className="px-3 py-2 rounded-lg border bg-amber-100 border-amber-300 text-amber-800 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> Review
                  </button>
                )}
              </div>
            </div>
          </div>
          )
        })}
      </div>
    </div>
  )
}

export default GroceryPricing
