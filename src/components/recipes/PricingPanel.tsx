'use client'

import React, { useState } from 'react'
import { Check, X, AlertCircle, Plus, DollarSign, Search } from 'lucide-react'

export interface PricingItem {
  id: string | number
  original: string
  matched: string
  priceLabel?: string // e.g., "$6.99 per 500 ml" or "$1.99 per lb"
  estimatedCost: number
  needsReview?: boolean
  confidence?: number
  packages?: number
  packageSize?: string
  portionCost?: number
  packagePrice?: number
}

interface PricingPanelProps {
  items: PricingItem[]
  totalEstimated: number
  onReview: (index: number) => void
  onSearch: (index: number) => void
}

export function PricingPanel({ items, totalEstimated, onReview, onSearch }: PricingPanelProps) {
  const [added, setAdded] = useState<Set<string | number>>(new Set())

  const handleAdd = (id: string | number) => {
    const next = new Set(added)
    next.add(id)
    setAdded(next)
    setTimeout(() => {
      const n2 = new Set(next)
      n2.delete(id)
      setAdded(n2)
    }, 1500)
  }

  const reviewCount = items.filter(i => i.needsReview).length

  return (
    <div className="space-y-6">
      {/* Summary banner */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-blue-600" />
          <div className="text-blue-800">
            <div className="text-xl font-bold">Total Estimated Cost: ${totalEstimated.toFixed(2)}</div>
            <div>For entire recipe (not per serving)</div>
          </div>
        </div>
        {reviewCount > 0 && (
          <div className="text-orange-700 font-semibold">{reviewCount} item{reviewCount>1?'s':''} need review</div>
        )}
      </div>

      <h3 className="text-2xl font-bold text-gray-900">Ingredients & Pricing</h3>

      <div className="space-y-4">
        {items.map((it, idx) => (
          <div key={it.id} className={`border rounded-lg p-4 ${it.needsReview ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-lg font-medium text-gray-900 mb-2">{it.original}</div>
                <div className="flex items-center gap-2 mb-2">
                  {it.matched && it.matched !== 'No match found' ? (
                    <>
                      <Check className="w-5 h-5 text-green-600" />
                      <span className="text-gray-700">{it.matched}</span>
                    </>
                  ) : (
                    <>
                      <X className="w-5 h-5 text-red-500" />
                      <span className="text-red-700">No match found</span>
                    </>
                  )}
                </div>
                {it.priceLabel && (
                  <div className="text-gray-600">{it.priceLabel}</div>
                )}
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                  {typeof it.portionCost === 'number' && <span>portion ~${it.portionCost.toFixed(2)}</span>}
                  {typeof it.packagePrice === 'number' && <span>full pack ~${it.packagePrice.toFixed(2)}</span>}
                  {it.packages && it.packageSize && (
                    <span className="text-gray-600 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">{it.packages} × {it.packageSize}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">${it.estimatedCost.toFixed(2)}</div>
                  <div className="text-sm text-gray-500">estimated</div>
                </div>
                <button
                  onClick={() => handleAdd(it.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${added.has(it.id)?'bg-green-100 border-green-300 text-green-800':'bg-purple-600 border-purple-600 text-white hover:bg-purple-700'}`}
                >
                  {added.has(it.id) ? (<><Check className="w-4 h-4" /> Added</>) : (<><Plus className="w-4 h-4" /> Add to Cart</>)}
                </button>
                <button onClick={() => onSearch(idx)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-300 text-blue-800 hover:bg-blue-50"><Search className="w-4 h-4"/> Search</button>
                {it.needsReview && (
                  <button onClick={() => onReview(idx)} className="px-3 py-2 rounded-lg border bg-amber-100 border-amber-300 text-amber-800 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> Review
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PricingPanel
