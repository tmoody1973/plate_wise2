/**
 * Pricing Cache Service
 * Implements aggressive caching for ingredient prices to eliminate 504 timeouts
 */

import { createClient } from '@/lib/supabase/server'

export type CachedPriceData = {
  ingredient_name: string
  location: string
  package_price: number
  portion_cost: number
  product_name: string
  package_size: string
  store_name: string
  store_type: string
  unit_price: string
  confidence: number
  source: 'perplexity' | 'kroger' | 'estimated' | 'usda'
  cached_at: string
  expires_at: string
}

export type PricingCacheOptions = {
  ttlHours?: number // Time to live in hours (default 48)
  location?: string
  source?: 'perplexity' | 'kroger' | 'estimated' | 'usda'
}

class PricingCacheService {
  private readonly DEFAULT_TTL_HOURS = 48
  private readonly STALE_HOURS = 72 // Allow serving stale data briefly
  
  /**
   * Get cached pricing for ingredients
   */
  async getCachedPricing(
    ingredientNames: string[], 
    location: string = 'default'
  ): Promise<{ cached: CachedPriceData[], missing: string[] }> {
    const supabase = createClient()
    
    try {
      const normalizedNames = ingredientNames.map(name => this.normalizeIngredientName(name))
      const normalizedLocation = this.normalizeLocation(location)
      
      const { data: cached, error } = await supabase
        .from('ingredient_price_cache')
        .select('*')
        .in('ingredient_name', normalizedNames)
        .eq('location', normalizedLocation)
        .gt('expires_at', new Date().toISOString()) // Only non-expired
        .order('cached_at', { ascending: false })
      
      if (error) {
        console.error('Cache lookup error:', error)
        return { cached: [], missing: ingredientNames }
      }
      
      const cachedMap = new Map(cached?.map(item => [item.ingredient_name, item]) || [])
      const missing = normalizedNames.filter(name => !cachedMap.has(name))
      
      console.log(`📦 Cache hit: ${cached?.length || 0}/${ingredientNames.length} ingredients`)
      
      return {
        cached: cached || [],
        missing: missing.map(name => {
          // Map back to original case
          const originalIndex = normalizedNames.indexOf(name)
          return ingredientNames[originalIndex] || name
        })
      }
    } catch (error) {
      console.error('Cache service error:', error)
      return { cached: [], missing: ingredientNames }
    }
  }
  
  /**
   * Cache pricing data for ingredients
   */
  async cachePricing(
    pricingData: Array<{
      ingredientName: string
      location: string
      packagePrice: number
      portionCost: number
      productName: string
      packageSize?: string
      storeName?: string
      storeType?: string
      unitPrice?: string
      confidence?: number
      source?: 'perplexity' | 'kroger' | 'estimated' | 'usda'
    }>,
    options: PricingCacheOptions = {}
  ): Promise<boolean> {
    const supabase = createClient()
    const ttlHours = options.ttlHours || this.DEFAULT_TTL_HOURS
    
    try {
      const cacheEntries = pricingData.map(item => ({
        ingredient_name: this.normalizeIngredientName(item.ingredientName),
        location: this.normalizeLocation(item.location),
        package_price: item.packagePrice,
        portion_cost: item.portionCost,
        product_name: item.productName || item.ingredientName,
        package_size: item.packageSize || 'standard',
        store_name: item.storeName || 'Unknown',
        store_type: item.storeType || 'mainstream',
        unit_price: item.unitPrice || `$${(item.packagePrice / 10).toFixed(2)}`,
        confidence: item.confidence || 0.5,
        source: item.source || 'estimated',
        cached_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString()
      }))
      
      // Use upsert to handle duplicates
      const { error } = await supabase
        .from('ingredient_price_cache')
        .upsert(cacheEntries, {
          onConflict: 'ingredient_name,location'
        })
      
      if (error) {
        console.error('Cache write error:', error)
        return false
      }
      
      console.log(`💾 Cached pricing for ${cacheEntries.length} ingredients`)
      return true
    } catch (error) {
      console.error('Cache service write error:', error)
      return false
    }
  }
  
  /**
   * Get stale pricing data (expired but recently cached)
   * Used as ultra-fast fallback when fresh data isn't available
   */
  async getStalePricing(
    ingredientNames: string[],
    location: string = 'default'
  ): Promise<CachedPriceData[]> {
    const supabase = createClient()
    
    try {
      const normalizedNames = ingredientNames.map(name => this.normalizeIngredientName(name))
      const normalizedLocation = this.normalizeLocation(location)
      const staleThreshold = new Date(Date.now() - this.STALE_HOURS * 60 * 60 * 1000).toISOString()
      
      const { data: stale, error } = await supabase
        .from('ingredient_price_cache')
        .select('*')
        .in('ingredient_name', normalizedNames)
        .eq('location', normalizedLocation)
        .gt('cached_at', staleThreshold) // Within stale window
        .order('cached_at', { ascending: false })
      
      if (error) {
        console.error('Stale cache lookup error:', error)
        return []
      }
      
      console.log(`🔄 Found ${stale?.length || 0} stale prices as fallback`)
      return stale || []
    } catch (error) {
      console.error('Stale cache service error:', error)
      return []
    }
  }
  
  /**
   * Clear expired cache entries (cleanup job)
   */
  async cleanupExpiredCache(): Promise<void> {
    const supabase = createClient()
    
    try {
      const { error } = await supabase
        .from('ingredient_price_cache')
        .delete()
        .lt('expires_at', new Date().toISOString())
      
      if (error) {
        console.error('Cache cleanup error:', error)
      } else {
        console.log('🧹 Cleaned up expired cache entries')
      }
    } catch (error) {
      console.error('Cache cleanup service error:', error)
    }
  }
  
  /**
   * Get cache statistics for monitoring
   */
  async getCacheStats(): Promise<{
    totalEntries: number
    freshEntries: number
    staleEntries: number
    expiredEntries: number
    hitRate?: number
  }> {
    const supabase = createClient()
    
    try {
      const now = new Date().toISOString()
      const staleThreshold = new Date(Date.now() - this.STALE_HOURS * 60 * 60 * 1000).toISOString()
      
      const [total, fresh, stale] = await Promise.all([
        supabase.from('ingredient_price_cache').select('id', { count: 'exact' }),
        supabase.from('ingredient_price_cache').select('id', { count: 'exact' }).gt('expires_at', now),
        supabase.from('ingredient_price_cache').select('id', { count: 'exact' })
          .lt('expires_at', now).gt('cached_at', staleThreshold)
      ])
      
      const totalEntries = total.count || 0
      const freshEntries = fresh.count || 0  
      const staleEntries = stale.count || 0
      const expiredEntries = totalEntries - freshEntries - staleEntries
      
      return {
        totalEntries,
        freshEntries,
        staleEntries,
        expiredEntries
      }
    } catch (error) {
      console.error('Cache stats error:', error)
      return { totalEntries: 0, freshEntries: 0, staleEntries: 0, expiredEntries: 0 }
    }
  }
  
  /**
   * Normalize ingredient names for consistent caching
   */
  private normalizeIngredientName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[,\s]+/g, ' ')
      .replace(/\s+/g, ' ')
      .substring(0, 100) // Limit length
  }
  
  /**
   * Normalize location for consistent caching
   */
  private normalizeLocation(location: string): string {
    // Extract ZIP code if present, otherwise use city
    const zipMatch = location.match(/\b\d{5}(-\d{4})?\b/)
    if (zipMatch) {
      return zipMatch[0].split('-')[0] // Use 5-digit ZIP
    }
    
    return location
      .toLowerCase()
      .replace(/[,\s]+/g, ' ')
      .trim()
      .substring(0, 50)
  }
}

export const pricingCacheService = new PricingCacheService()

// SQL to create the cache table (run this in Supabase)
export const CACHE_TABLE_SQL = `
-- Create ingredient pricing cache table
CREATE TABLE IF NOT EXISTS ingredient_price_cache (
  id SERIAL PRIMARY KEY,
  ingredient_name VARCHAR(100) NOT NULL,
  location VARCHAR(50) NOT NULL,
  package_price DECIMAL(10,2) NOT NULL,
  portion_cost DECIMAL(10,2) NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  package_size VARCHAR(100) DEFAULT 'standard',
  store_name VARCHAR(100) DEFAULT 'Unknown',
  store_type VARCHAR(50) DEFAULT 'mainstream',
  unit_price VARCHAR(50),
  confidence DECIMAL(3,2) DEFAULT 0.5,
  source VARCHAR(20) DEFAULT 'estimated',
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  UNIQUE(ingredient_name, location)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_ingredient_cache_lookup 
ON ingredient_price_cache(ingredient_name, location, expires_at);

CREATE INDEX IF NOT EXISTS idx_ingredient_cache_cleanup 
ON ingredient_price_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_ingredient_cache_source 
ON ingredient_price_cache(source, cached_at);
`;