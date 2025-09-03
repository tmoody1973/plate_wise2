/**
 * Price Comparison Service
 * Provides intelligent price comparison and cost optimization features
 */

import { krogerService, type Product, type Store, type PriceComparison, type StorePrice } from './kroger-service';

export interface PriceAlert {
  id: string;
  userId: string;
  productId: string;
  productName: string;
  targetPrice: number;
  currentPrice: number;
  isActive: boolean;
  createdAt: Date;
  triggeredAt?: Date;
}

export interface PriceTrend {
  productId: string;
  productName: string;
  prices: PricePoint[];
  trend: 'increasing' | 'decreasing' | 'stable';
  averagePrice: number;
  lowestPrice: PricePoint;
  highestPrice: PricePoint;
  seasonalPattern?: SeasonalPattern;
}

export interface PricePoint {
  price: number;
  date: string;
  storeId: string;
  storeName: string;
}

export interface SeasonalPattern {
  season: 'spring' | 'summer' | 'fall' | 'winter';
  averagePrice: number;
  priceChange: number;
  bestMonths: string[];
  worstMonths: string[];
}

export interface BulkBuyingOpportunity {
  productId: string;
  productName: string;
  currentPrice: number;
  bulkPrice: number;
  bulkQuantity: number;
  savingsPerUnit: number;
  totalSavings: number;
  breakEvenUsage: number;
  expirationConsideration: string;
  recommendation: 'buy' | 'wait' | 'consider';
}

export interface CostOptimizationSuggestion {
  type: 'store_switch' | 'bulk_buying' | 'seasonal_timing' | 'coupon_stacking' | 'generic_brand';
  description: string;
  potentialSavings: number;
  effort: 'low' | 'medium' | 'high';
  timeframe: 'immediate' | 'weekly' | 'monthly' | 'seasonal';
  culturalImpact: 'none' | 'minimal' | 'moderate' | 'significant';
  details: any;
}

export interface ShoppingOptimization {
  totalSavings: number;
  suggestions: CostOptimizationSuggestion[];
  optimalStores: Store[];
  bestShoppingDay: string;
  estimatedTime: number;
  routeOptimization?: RouteOptimization;
}

export interface RouteOptimization {
  totalDistance: number;
  totalTime: number;
  stores: Array<{
    store: Store;
    items: string[];
    estimatedTime: number;
    order: number;
  }>;
  fuelCost: number;
  netSavings: number;
}

/**
 * Price Comparison and Optimization Service
 */
export class PriceComparisonService {
  private priceHistory: Map<string, PricePoint[]> = new Map();
  private alerts: Map<string, PriceAlert[]> = new Map();

  /**
   * Compare prices across multiple stores for a list of products
   */
  async compareMultipleProducts(
    productIds: string[],
    storeIds: string[],
    userLocation?: { lat: number; lng: number }
  ): Promise<PriceComparison[]> {
    const comparisons: PriceComparison[] = [];

    for (const productId of productIds) {
      try {
        const comparison = await krogerService.comparePrices(productId, storeIds);
        if (comparison) {
          // Add distance calculation if user location is provided
          if (userLocation) {
            comparison.stores = await this.addDistanceToStores(comparison.stores, userLocation);
          }
          comparisons.push(comparison);
        }
      } catch (error) {
        console.error(`Failed to compare prices for product ${productId}:`, error);
      }
    }

    return comparisons;
  }

  /**
   * Find the most cost-effective shopping strategy
   */
  async optimizeShoppingList(
    items: Array<{ productId: string; quantity: number; priority: 'high' | 'medium' | 'low' }>,
    userLocation: { lat: number; lng: number },
    maxStores: number = 3,
    maxDistance: number = 10
  ): Promise<ShoppingOptimization> {
    // Get nearby stores
    const stores = await krogerService.getStoreLocations(
      this.coordinatesToZipCode(userLocation), // Would need geocoding service
      maxDistance
    );

    // Get price comparisons for all items
    const storeIds = stores.slice(0, maxStores).map(store => store.id);
    const productIds = items.map(item => item.productId);
    const comparisons = await this.compareMultipleProducts(productIds, storeIds, userLocation);

    // Calculate optimal shopping strategy
    const suggestions = this.generateOptimizationSuggestions(comparisons, items);
    const optimalStores = this.selectOptimalStores(comparisons, stores, maxStores);
    const totalSavings = suggestions.reduce((sum, suggestion) => sum + suggestion.potentialSavings, 0);

    return {
      totalSavings,
      suggestions,
      optimalStores,
      bestShoppingDay: this.getBestShoppingDay(),
      estimatedTime: this.estimateShoppingTime(optimalStores, items),
      routeOptimization: await this.optimizeRoute(optimalStores, userLocation),
    };
  }

  /**
   * Track price trends for products
   */
  async trackPriceTrends(productIds: string[], storeIds: string[]): Promise<PriceTrend[]> {
    const trends: PriceTrend[] = [];

    for (const productId of productIds) {
      const priceHistory = this.priceHistory.get(productId) || [];
      
      if (priceHistory.length < 2) {
        // Not enough data for trend analysis
        continue;
      }

      const prices = priceHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const trend = this.calculateTrend(prices);
      const averagePrice = prices.reduce((sum, point) => sum + point.price, 0) / prices.length;
      const lowestPrice = prices.reduce((lowest, current) => 
        current.price < lowest.price ? current : lowest
      );
      const highestPrice = prices.reduce((highest, current) => 
        current.price > highest.price ? current : highest
      );

      trends.push({
        productId,
        productName: `Product ${productId}`, // Would need product lookup
        prices,
        trend,
        averagePrice,
        lowestPrice,
        highestPrice,
        seasonalPattern: this.analyzeSeasonalPattern(prices),
      });
    }

    return trends;
  }

  /**
   * Identify bulk buying opportunities
   */
  async identifyBulkOpportunities(
    productIds: string[],
    householdSize: number,
    storageCapacity: 'small' | 'medium' | 'large'
  ): Promise<BulkBuyingOpportunity[]> {
    const opportunities: BulkBuyingOpportunity[] = [];

    for (const productId of productIds) {
      try {
        // Get regular and bulk pricing (simplified - would need actual bulk pricing API)
        const regularProduct = await krogerService.getProductDetails(productId);
        if (!regularProduct) continue;

        const bulkSavings = this.calculateBulkSavings(
          regularProduct,
          householdSize,
          storageCapacity
        );

        if (bulkSavings && bulkSavings.totalSavings > 0) {
          opportunities.push(bulkSavings);
        }
      } catch (error) {
        console.error(`Failed to analyze bulk opportunity for ${productId}:`, error);
      }
    }

    return opportunities.sort((a, b) => b.totalSavings - a.totalSavings);
  }

  /**
   * Set up price alerts for products
   */
  async setPriceAlert(
    userId: string,
    productId: string,
    targetPrice: number
  ): Promise<PriceAlert> {
    const product = await krogerService.getProductDetails(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const alert: PriceAlert = {
      id: `alert_${userId}_${productId}_${Date.now()}`,
      userId,
      productId,
      productName: product.name,
      targetPrice,
      currentPrice: product.price.regular,
      isActive: true,
      createdAt: new Date(),
    };

    const userAlerts = this.alerts.get(userId) || [];
    userAlerts.push(alert);
    this.alerts.set(userId, userAlerts);

    return alert;
  }

  /**
   * Check for triggered price alerts
   */
  async checkPriceAlerts(userId: string): Promise<PriceAlert[]> {
    const userAlerts = this.alerts.get(userId) || [];
    const triggeredAlerts: PriceAlert[] = [];

    for (const alert of userAlerts.filter(a => a.isActive)) {
      try {
        const product = await krogerService.getProductDetails(alert.productId);
        if (!product) continue;

        const currentPrice = product.price.promo || product.price.regular;
        
        if (currentPrice <= alert.targetPrice) {
          alert.triggeredAt = new Date();
          alert.isActive = false;
          triggeredAlerts.push(alert);
        }
      } catch (error) {
        console.error(`Failed to check alert for product ${alert.productId}:`, error);
      }
    }

    return triggeredAlerts;
  }

  /**
   * Generate cost optimization suggestions
   */
  private generateOptimizationSuggestions(
    comparisons: PriceComparison[],
    items: Array<{ productId: string; quantity: number; priority: 'high' | 'medium' | 'low' }>
  ): CostOptimizationSuggestion[] {
    const suggestions: CostOptimizationSuggestion[] = [];

    // Store switching suggestions
    for (const comparison of comparisons) {
      const savings = comparison.priceRange.max - comparison.priceRange.min;
      if (savings > 0.50) { // Minimum $0.50 savings threshold
        suggestions.push({
          type: 'store_switch',
          description: `Buy ${comparison.productName} at ${comparison.lowestPrice.storeName} instead of the most expensive store`,
          potentialSavings: savings,
          effort: 'low',
          timeframe: 'immediate',
          culturalImpact: 'none',
          details: {
            productId: comparison.productId,
            recommendedStore: comparison.lowestPrice.storeId,
            savings,
          },
        });
      }
    }

    // Generic brand suggestions
    suggestions.push({
      type: 'generic_brand',
      description: 'Consider store brands for non-culturally specific items',
      potentialSavings: 15, // Estimated average savings
      effort: 'low',
      timeframe: 'immediate',
      culturalImpact: 'minimal',
      details: {
        averageSavings: '20-30%',
        categories: ['pantry staples', 'cleaning supplies', 'basic ingredients'],
      },
    });

    return suggestions;
  }

  /**
   * Select optimal stores based on price comparisons
   */
  private selectOptimalStores(
    comparisons: PriceComparison[],
    allStores: Store[],
    maxStores: number
  ): Store[] {
    const storeScores = new Map<string, number>();

    // Score stores based on how often they have the lowest prices
    for (const comparison of comparisons) {
      const lowestStoreId = comparison.lowestPrice.storeId;
      const currentScore = storeScores.get(lowestStoreId) || 0;
      storeScores.set(lowestStoreId, currentScore + 1);
    }

    // Sort stores by score and return top performers
    const sortedStores = Array.from(storeScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxStores)
      .map(([storeId]) => allStores.find(store => store.id === storeId))
      .filter(Boolean) as Store[];

    return sortedStores;
  }

  /**
   * Calculate price trend direction
   */
  private calculateTrend(prices: PricePoint[]): 'increasing' | 'decreasing' | 'stable' {
    if (prices.length < 2) return 'stable';

    const recent = prices.slice(-5); // Last 5 price points
    const older = prices.slice(-10, -5); // Previous 5 price points

    if (recent.length === 0 || older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, p) => sum + p.price, 0) / recent.length;
    const olderAvg = older.reduce((sum, p) => sum + p.price, 0) / older.length;

    const change = (recentAvg - olderAvg) / olderAvg;

    if (change > 0.05) return 'increasing';
    if (change < -0.05) return 'decreasing';
    return 'stable';
  }

  /**
   * Analyze seasonal price patterns
   */
  private analyzeSeasonalPattern(prices: PricePoint[]): SeasonalPattern | undefined {
    // Simplified seasonal analysis - would need more sophisticated algorithm
    const seasonalPrices = {
      spring: prices.filter(p => this.getSeason(p.date) === 'spring'),
      summer: prices.filter(p => this.getSeason(p.date) === 'summer'),
      fall: prices.filter(p => this.getSeason(p.date) === 'fall'),
      winter: prices.filter(p => this.getSeason(p.date) === 'winter'),
    };

    const seasonalAverages = Object.entries(seasonalPrices).map(([season, seasonPrices]) => ({
      season: season as 'spring' | 'summer' | 'fall' | 'winter',
      average: seasonPrices.length > 0 
        ? seasonPrices.reduce((sum, p) => sum + p.price, 0) / seasonPrices.length 
        : 0,
    }));

    const lowestSeason = seasonalAverages.reduce((lowest, current) => 
      current.average < lowest.average ? current : lowest
    );

    if (lowestSeason.average === 0) return undefined;

    return {
      season: lowestSeason.season,
      averagePrice: lowestSeason.average,
      priceChange: 0, // Would calculate based on historical data
      bestMonths: this.getSeasonMonths(lowestSeason.season),
      worstMonths: [],
    };
  }

  /**
   * Calculate bulk buying savings
   */
  private calculateBulkSavings(
    product: Product,
    householdSize: number,
    storageCapacity: 'small' | 'medium' | 'large'
  ): BulkBuyingOpportunity | null {
    // Simplified bulk calculation - would need actual bulk pricing data
    const bulkQuantity = this.getBulkQuantity(product, storageCapacity);
    const bulkDiscount = 0.15; // Assume 15% bulk discount
    const bulkPrice = product.price.regular * (1 - bulkDiscount);
    const savingsPerUnit = product.price.regular - bulkPrice;
    const totalSavings = savingsPerUnit * bulkQuantity;

    if (totalSavings < 5) return null; // Minimum $5 savings threshold

    return {
      productId: product.id,
      productName: product.name,
      currentPrice: product.price.regular,
      bulkPrice,
      bulkQuantity,
      savingsPerUnit,
      totalSavings,
      breakEvenUsage: bulkQuantity / (householdSize * 4), // Weeks to use up
      expirationConsideration: this.getExpirationAdvice(product),
      recommendation: totalSavings > 20 ? 'buy' : 'consider',
    };
  }

  /**
   * Helper methods
   */
  private async addDistanceToStores(
    storePrices: StorePrice[],
    userLocation: { lat: number; lng: number }
  ): Promise<StorePrice[]> {
    // Would integrate with Google Maps API for actual distance calculation
    return storePrices.map(store => ({
      ...store,
      distance: Math.random() * 10, // Mock distance for now
    }));
  }

  private coordinatesToZipCode(location: { lat: number; lng: number }): string {
    // Would use reverse geocoding service
    return '12345'; // Mock zip code
  }

  private getBestShoppingDay(): string {
    // Based on typical grocery store patterns
    const days = ['Tuesday', 'Wednesday', 'Thursday'];
    return days[Math.floor(Math.random() * days.length)]!;
  }

  private estimateShoppingTime(stores: Store[], items: any[]): number {
    // Estimate 15 minutes per store + 2 minutes per item
    return stores.length * 15 + items.length * 2;
  }

  private async optimizeRoute(
    stores: Store[],
    userLocation: { lat: number; lng: number }
  ): Promise<RouteOptimization> {
    // Simplified route optimization - would use actual routing service
    return {
      totalDistance: stores.length * 5, // Mock 5 miles per store
      totalTime: stores.length * 20, // Mock 20 minutes per store
      stores: stores.map((store, index) => ({
        store,
        items: [], // Would assign items to optimal stores
        estimatedTime: 20,
        order: index + 1,
      })),
      fuelCost: stores.length * 2, // Mock $2 fuel cost per store
      netSavings: 50, // Mock net savings after fuel costs
    };
  }

  private getSeason(date: string): 'spring' | 'summer' | 'fall' | 'winter' {
    const month = new Date(date).getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  private getSeasonMonths(season: 'spring' | 'summer' | 'fall' | 'winter'): string[] {
    const months = {
      spring: ['March', 'April', 'May'],
      summer: ['June', 'July', 'August'],
      fall: ['September', 'October', 'November'],
      winter: ['December', 'January', 'February'],
    };
    return months[season];
  }

  private getBulkQuantity(product: Product, storageCapacity: 'small' | 'medium' | 'large'): number {
    const baseQuantity = 6; // Base bulk quantity
    const multipliers = { small: 1, medium: 1.5, large: 2 };
    return Math.floor(baseQuantity * multipliers[storageCapacity]);
  }

  private getExpirationAdvice(product: Product): string {
    // Simplified expiration advice based on product category
    if (product.categories.some(cat => cat.toLowerCase().includes('produce'))) {
      return 'Consider expiration dates for fresh produce';
    }
    if (product.categories.some(cat => cat.toLowerCase().includes('dairy'))) {
      return 'Check expiration dates carefully for dairy products';
    }
    return 'Long shelf life - good for bulk buying';
  }
}

/**
 * Singleton instance of PriceComparisonService
 */
export const priceComparisonService = new PriceComparisonService();