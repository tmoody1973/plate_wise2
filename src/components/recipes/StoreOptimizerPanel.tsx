"use client"

import React, { useState, useEffect } from 'react'
import { Store, MapPin, Clock, TrendingUp, Zap, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react'
import type { OptimizedShoppingPlan, StoreAssignment } from '@/lib/pricing/shopping-optimizer'
import { StoreSelector } from './StoreSelector'
import { useUserLocation } from '@/hooks/useUserLocation'

interface StoreOptimizerPanelProps {
  ingredients: Array<{name: string, amount: number, unit: string}>
  existingPricingData?: Array<any>
  onPlanGenerated?: (plan: OptimizedShoppingPlan) => void
  className?: string
}

interface OptimizationStrategy {
  strategy: string
  description: string
  estimatedTime: number
  estimatedStores: number
  efficiency: number
}

// Stores will be dynamically loaded based on user location

export function StoreOptimizerPanel({
  ingredients = [],
  existingPricingData = [],
  onPlanGenerated,
  className = ''
}: StoreOptimizerPanelProps) {
  const [selectedStore, setSelectedStore] = useState<string>('')
  const [optimizationPlan, setOptimizationPlan] = useState<OptimizedShoppingPlan | null>(null)
  const [strategies, setStrategies] = useState<OptimizationStrategy[]>([])
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { location: userLocation } = useUserLocation()

  // Safety check for ingredients
  const safeIngredients = Array.isArray(ingredients) ? ingredients : []
  const hasPricingData = Array.isArray(existingPricingData) && existingPricingData.length > 0

  // Load available strategies on mount
  useEffect(() => {
    loadStrategies()
  }, [])

  const loadStrategies = async () => {
    try {
      const response = await fetch('/api/pricing/optimize-stores')
      if (response.ok) {
        const data = await response.json()
        setStrategies(data.strategies || [])
      }
    } catch (err) {
      console.warn('Could not load optimization strategies:', err)
    }
  }

  const handleOptimizeStores = async () => {
    if (safeIngredients.length === 0) {
      setError('No ingredients to optimize')
      return
    }

    setIsOptimizing(true)
    setError(null)

    try {
      const response = await fetch('/api/pricing/optimize-stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: safeIngredients,
          preferredStore: selectedStore,
          location: userLocation.zipCode, // Using user's actual location
          city: userLocation.city,
          existingPricingData
        })
      })

      if (response.ok) {
        const data = await response.json()
        setOptimizationPlan(data.plan)
        onPlanGenerated?.(data.plan)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to optimize stores')
      }
    } catch (err) {
      console.error('Store optimization failed:', err)
      setError('Failed to optimize shopping plan')
    } finally {
      setIsOptimizing(false)
    }
  }

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 80) return 'text-green-600 bg-green-100'
    if (efficiency >= 60) return 'text-yellow-600 bg-yellow-100' 
    return 'text-red-600 bg-red-100'
  }

  const getStoreTypeColor = (storeType: string) => {
    switch (storeType) {
      case 'ethnic': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'specialty': return 'bg-blue-100 text-blue-700 border-blue-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Step-by-Step Instructions */}
      {!hasPricingData && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
            📋 How to Use Smart Shopping Optimization
          </h3>
          <div className="space-y-2 text-sm text-blue-800">
            <div className="flex items-start gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-600 text-white text-xs rounded-full shrink-0 mt-0.5">1</span>
              <span><strong>Get Recipe Pricing:</strong> First, click the "Get Recipe Pricing" button above to fetch store prices</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-600 text-white text-xs rounded-full shrink-0 mt-0.5">2</span>
              <span><strong>Select Your Preferred Store:</strong> Choose where you'd like to shop most often</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-600 text-white text-xs rounded-full shrink-0 mt-0.5">3</span>
              <span><strong>Optimize Your Plan:</strong> We'll show you the most efficient shopping route</span>
            </div>
          </div>
        </div>
      )}

      {/* Store Selection & Optimization Trigger */}
      <div className="bg-white rounded-xl border shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Smart Shopping Optimization
          {hasPricingData && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full border border-green-200">
              ✓ Pricing Data Ready
            </span>
          )}
        </h3>
        
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <StoreSelector
            value={selectedStore}
            onChange={setSelectedStore}
            label="Preferred Primary Store"
          />
          
          <div className="flex items-end">
            <button
              onClick={handleOptimizeStores}
              disabled={isOptimizing || safeIngredients.length === 0 || !hasPricingData}
              className={`w-full px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                hasPricingData 
                  ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isOptimizing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Optimizing...
                </>
              ) : !hasPricingData ? (
                <>
                  <AlertCircle className="w-4 h-4" />
                  Get Recipe Pricing First
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Optimize Shopping Plan
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>

      {/* Optimization Results */}
      {optimizationPlan && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-green-900 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6" />
              Optimized Shopping Plan
            </h3>
            
            <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getEfficiencyColor(optimizationPlan.efficiency)}`}>
              {optimizationPlan.efficiency}% Efficiency
            </div>
          </div>

          {/* Plan Summary */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 border border-green-100">
              <div className="flex items-center gap-2 text-green-700 mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm font-medium">Total Cost</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                ${optimizationPlan.totalCost.toFixed(2)}
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-green-100">
              <div className="flex items-center gap-2 text-green-700 mb-1">
                <Store className="w-4 h-4" />
                <span className="text-sm font-medium">Stores Needed</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {optimizationPlan.totalStores}
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-green-100">
              <div className="flex items-center gap-2 text-green-700 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Estimated Time</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {optimizationPlan.estimatedTime}m
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-green-100">
              <div className="flex items-center gap-2 text-green-700 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Primary Store</span>
              </div>
              <div className="text-sm font-bold text-gray-900">
                {optimizationPlan.primaryStore.name}
              </div>
            </div>
          </div>

          {/* Store Distribution */}
          <div className="space-y-3">
            <h4 className="text-md font-semibold text-gray-900">Shopping Distribution</h4>
            
            {/* Primary Store */}
            <div className="bg-white rounded-lg border border-green-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Store className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="font-semibold text-gray-900">{optimizationPlan.primaryStore.name}</div>
                    <div className="text-sm text-gray-600 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {optimizationPlan.primaryStore.address.split(',')[0]}
                    </div>
                  </div>
                </div>
                
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                  PRIMARY
                </span>
              </div>
              
              <div className="space-y-2">
                {Object.values(optimizationPlan.ingredientDistribution)
                  .filter(assignment => assignment.assignedStore === optimizationPlan.primaryStore.name)
                  .map((assignment, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <span className="text-gray-900 capitalize">{assignment.ingredient}</span>
                        <div className="text-xs text-gray-500">{assignment.productName}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">${assignment.packagePrice.toFixed(2)}</div>
                        <div className="text-xs text-gray-500">
                          {assignment.packageSize}
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Secondary Stores */}
            {optimizationPlan.secondaryStores.map(store => (
              <div key={store.name} className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Store className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="font-semibold text-gray-900">{store.name}</div>
                      <div className="text-sm text-gray-600 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {store.address.split(',')[0]}
                      </div>
                    </div>
                  </div>
                  
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStoreTypeColor(store.type)}`}>
                    {store.type}
                  </span>
                </div>
                
                <div className="space-y-2">
                  {Object.values(optimizationPlan.ingredientDistribution)
                    .filter(assignment => assignment.assignedStore === store.name)
                    .map((assignment, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <span className="text-gray-900 capitalize">{assignment.ingredient}</span>
                          <div className="text-xs text-gray-500">{assignment.productName}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">${assignment.packagePrice.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">
                            {assignment.packageSize}
                          </div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategy Suggestions */}
      {strategies.length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Shopping Strategy Options
          </h4>
          
          <div className="grid md:grid-cols-3 gap-4">
            {strategies.map((strategy, index) => (
              <div key={index} className="border rounded-lg p-4 hover:border-blue-300 transition-colors">
                <h5 className="font-semibold text-gray-900 mb-2">{strategy.strategy}</h5>
                <p className="text-sm text-gray-600 mb-3">{strategy.description}</p>
                
                <div className="space-y-1 text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>Time:</span>
                    <span>{strategy.estimatedTime}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stores:</span>
                    <span>{strategy.estimatedStores}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Efficiency:</span>
                    <span>{strategy.efficiency}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default StoreOptimizerPanel