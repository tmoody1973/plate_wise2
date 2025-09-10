/**
 * Recipe Extraction Cache Service
 * Caches recipe data to speed up repeated extractions
 */

interface CachedRecipeData {
  title: string;
  ingredients: string[];
  instructions: string[];
  servings?: number;
  totalTimeMinutes?: number;
  description?: string;
  imageUrl?: string;
  cachedAt: number;
  extractionMethod: 'hybrid' | 'ai-fields' | 'json-ld' | 'fallback';
}

export class RecipeCacheService {
  private cache = new Map<string, CachedRecipeData>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * Get cached recipe data by URL
   */
  get(url: string): CachedRecipeData | null {
    const cached = this.cache.get(url);
    
    if (!cached) {
      return null;
    }

    // Check if cache is expired
    const now = Date.now();
    if (now - cached.cachedAt > this.CACHE_TTL) {
      this.cache.delete(url);
      return null;
    }

    console.log(`📦 Cache hit for ${url} (method: ${cached.extractionMethod})`);
    return cached;
  }

  /**
   * Store recipe data in cache
   */
  set(url: string, data: Omit<CachedRecipeData, 'cachedAt'>) {
    const cachedData: CachedRecipeData = {
      ...data,
      cachedAt: Date.now()
    };

    this.cache.set(url, cachedData);
    console.log(`💾 Cached recipe data for ${url} (method: ${data.extractionMethod})`);
  }

  /**
   * Check if URL is cached and valid
   */
  has(url: string): boolean {
    return this.get(url) !== null;
  }

  /**
   * Clear expired cache entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [url, data] of this.cache.entries()) {
      if (now - data.cachedAt > this.CACHE_TTL) {
        this.cache.delete(url);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      urls: Array.from(this.cache.keys()),
      methods: Array.from(this.cache.values()).reduce((acc, data) => {
        acc[data.extractionMethod] = (acc[data.extractionMethod] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }
}

// Global cache instance
export const recipeCacheService = new RecipeCacheService();

// Cleanup expired entries every hour
setInterval(() => {
  recipeCacheService.cleanup();
}, 60 * 60 * 1000);