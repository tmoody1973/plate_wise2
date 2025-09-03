'use client'

import React from 'react'
import { useUserLocation } from '@/hooks/useUserLocation'
import { Store } from 'lucide-react'

interface StoreSelectorProps {
  value?: string
  onChange: (store: string) => void
  className?: string
  label?: string
}

export function StoreSelector({ value, onChange, className = '', label = 'Preferred Primary Store' }: StoreSelectorProps) {
  const { location, stores, loading } = useUserLocation()

  // Default store based on location
  const getDefaultStore = () => {
    if (location.city.toLowerCase().includes('atlanta')) {
      return 'Kroger'
    } else if (location.city.toLowerCase().includes('milwaukee')) {
      return 'Pick \'n Save'
    } else if (location.city.toLowerCase().includes('miami')) {
      return 'Publix'
    } else if (location.city.toLowerCase().includes('houston')) {
      return 'HEB'
    }
    return stores[0] || 'Kroger'
  }

  const currentValue = value || getDefaultStore()

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4" />
          <span>{label}</span>
          <span className="text-xs text-gray-500">({location.city}, {location.state})</span>
        </div>
      </label>
      <select
        value={currentValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm disabled:opacity-50"
      >
        {stores.map(store => (
          <option key={store} value={store}>
            {store}
          </option>
        ))}
      </select>
    </div>
  )
}

export default StoreSelector