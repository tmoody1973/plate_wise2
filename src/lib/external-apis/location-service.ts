/**
 * Unified Location Service
 * Combines Google Places and USDA services for comprehensive local food sourcing
 */

import { googlePlacesService, type GroceryStore, type SpecialtyMarket } from './google-places-service';
import { usdaService, type LocalHarvest, type SeasonalProduce } from './usda-service';

export interface LocalFoodSource {
  id: string;
  name: string;
  type: 'grocery' | 'supermarket' | 'specialty' | 'farmers_market' | 'organic' | 'ethnic';
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  distance: number;
  rating?: number;
  priceLevel?: number;
  openNow?: boolean;
  specialties: string[];
  culturalFocus?: string[];
  acceptsPayments: {
    credit: boolean;
    snap: boolean;
    wic: boolean;
    cash: boolean;
  };
  seasonalInfo?: {
    currentSeason: string;
    availableProducts: string[];
    nextSeasonStart?: string;
  };
  contactInfo: {
    phone?: string;
    website?: string;
    hours?: string[];
  };
  photos: string[];
}

export interface CulturalShoppingGuide {
  culturalCuisine: string;
  recommendedStores: LocalFoodSource[];
  seasonalIngredients: SeasonalProduce[];
  shoppingTips: string[];
  authenticityNotes: string[];
  budgetTips: string[];
}

export interface LocalFoodMap {
  userLocation: {
    lat: number;
    lng: number;
  };
  radius: number;
  totalSources: number;
  groceryStores: LocalFoodSource[];
  specialtyMarkets: LocalFoodSource[];
  farmersMarkets: LocalFoodSource[];
  seasonalRecommendations: {
    season: string;
    produce: SeasonalProduce[];
    bestSources: LocalFoodSource[];
  };
  culturalGuides: CulturalShoppingGuide[];
}

export interface ShoppingRoute {
  totalDistance: number;
  totalTime: number;
  estimatedCost: number;
  fuelCost: number;
  netSavings: number;
  stops: ShoppingStop[];
  culturalOptimization: {
    authenticityScore: number;
    culturalStopsIncluded: number;
    traditionalIngredients: string[];
  };
}

export interface ShoppingStop {
  store: LocalFoodSource;
  items: ShoppingItem[];
  estimatedTime: number;
  order: number;
  culturalItems?: string[];
  specialFinds?: string[];
}

export interface ShoppingItem {
  name: string;
  category: string;
  culturalSignificance?: string;
  estimatedPrice: number;
  alternatives?: string[];
}

/**
 * Location Service
 * Provides unified access to local food sources and cultural shopping guidance
 */
export class LocationService {
  /**
   * Get comprehensive local food map
   */
  async getLocalFoodMap(
    location: { lat: number; lng: number },
    radius: number = 10,
    culturalPreferences: string[] = []
  ): Promise<LocalFoodMap> {
    try {
      // Get grocery stores and supermarkets
      const groceryStores = await googlePlacesService.findNearbyGroceryStores(location, radius * 1000);
      
      // Get specialty markets
      const specialtyMarkets = await googlePlacesService.findSpecialtyMarkets(
        location,
        culturalPreferences,
        radius * 1000
      );
      
      // Get farmer markets
      const farmersMarkets = await usdaService.findFarmerMarkets(location, radius);
      
      // Get seasonal recommendations
      const seasonalRecommendations = usdaService.getCurrentSeasonalRecommendations(location);
      
      // Convert to unified format
      const unifiedGroceryStores = groceryStores.map(store => this.convertGroceryStoreToFoodSource(store));
      const unifiedSpecialtyMarkets = specialtyMarkets.map(market => this.convertSpecialtyMarketToFoodSource(market));
      const unifiedFarmersMarkets = farmersMarkets.map(market => this.convertFarmerMarketToFoodSource(market));
      
      // Generate cultural shopping guides
      const culturalGuides = await this.generateCulturalShoppingGuides(
        culturalPreferences,
        [...unifiedGroceryStores, ...unifiedSpecialtyMarkets, ...unifiedFarmersMarkets],
        seasonalRecommendations.produce
      );
      
      return {
        userLocation: location,
        radius,
        totalSources: unifiedGroceryStores.length + unifiedSpecialtyMarkets.length + unifiedFarmersMarkets.length,
        groceryStores: unifiedGroceryStores,
        specialtyMarkets: unifiedSpecialtyMarkets,
        farmersMarkets: unifiedFarmersMarkets,
        seasonalRecommendations: {
          season: seasonalRecommendations.season,
          produce: seasonalRecommendations.produce,
          bestSources: this.identifyBestSeasonalSources(
            [...unifiedGroceryStores, ...unifiedSpecialtyMarkets, ...unifiedFarmersMarkets],
            seasonalRecommendations.produce
          ),
        },
        culturalGuides,
      };
    } catch (error) {
      console.error('Failed to get local food map:', error);
      throw new Error('Unable to load local food sources');
    }
  }

  /**
   * Find stores for specific cultural cuisine
   */
  async findCulturalStores(
    location: { lat: number; lng: number },
    culturalCuisine: string,
    radius: number = 15
  ): Promise<CulturalShoppingGuide> {
    try {
      // Get specialty markets for this culture
      const specialtyMarkets = await googlePlacesService.findSpecialtyMarkets(
        location,
        [culturalCuisine],
        radius * 1000
      );
      
      // Get general grocery stores
      const groceryStores = await googlePlacesService.findNearbyGroceryStores(location, radius * 1000);
      
      // Get farmer markets
      const farmersMarkets = await usdaService.findFarmerMarkets(location, radius);
      
      // Get seasonal produce recommendations for this culture
      const culturalRecommendations = usdaService.getCulturalProduceRecommendations([culturalCuisine]);
      const seasonalIngredients = culturalRecommendations.length > 0 && culturalRecommendations[0]
        ? culturalRecommendations[0].produce 
        : [];
      
      // Convert and combine all sources
      const allSources = [
        ...specialtyMarkets.map(market => this.convertSpecialtyMarketToFoodSource(market)),
        ...groceryStores.map(store => this.convertGroceryStoreToFoodSource(store)),
        ...farmersMarkets.map(market => this.convertFarmerMarketToFoodSource(market)),
      ];
      
      // Sort by cultural relevance and distance
      const recommendedStores = this.rankStoresByCulturalRelevance(allSources, culturalCuisine);
      
      return {
        culturalCuisine,
        recommendedStores,
        seasonalIngredients,
        shoppingTips: this.generateCulturalShoppingTips(culturalCuisine),
        authenticityNotes: this.generateAuthenticityNotes(culturalCuisine),
        budgetTips: this.generateBudgetTips(culturalCuisine),
      };
    } catch (error) {
      console.error(`Failed to find cultural stores for ${culturalCuisine}:`, error);
      throw new Error(`Unable to find stores for ${culturalCuisine} cuisine`);
    }
  }

  /**
   * Optimize shopping route for multiple stores
   */
  async optimizeShoppingRoute(
    userLocation: { lat: number; lng: number },
    shoppingList: ShoppingItem[],
    culturalPreferences: string[] = [],
    maxStores: number = 4
  ): Promise<ShoppingRoute> {
    try {
      // Get local food sources
      const foodMap = await this.getLocalFoodMap(userLocation, 15, culturalPreferences);
      
      // Assign items to optimal stores
      const storeAssignments = this.assignItemsToStores(
        shoppingList,
        [...foodMap.groceryStores, ...foodMap.specialtyMarkets, ...foodMap.farmersMarkets],
        culturalPreferences
      );
      
      // Select best stores (up to maxStores)
      const selectedStores = this.selectOptimalStores(storeAssignments, maxStores);
      
      // Calculate route optimization
      const route = this.calculateOptimalRoute(userLocation, selectedStores);
      
      return route;
    } catch (error) {
      console.error('Failed to optimize shopping route:', error);
      throw new Error('Unable to optimize shopping route');
    }
  }

  /**
   * Get seasonal shopping recommendations
   */
  async getSeasonalShoppingRecommendations(
    location: { lat: number; lng: number },
    culturalPreferences: string[] = []
  ): Promise<{
    season: string;
    produce: SeasonalProduce[];
    recommendedMarkets: LocalFoodSource[];
    culturalRecipes: string[];
    budgetTips: string[];
  }> {
    try {
      // Get current seasonal recommendations
      const seasonalInfo = usdaService.getCurrentSeasonalRecommendations(location);
      
      // Get farmer markets for seasonal produce
      const farmersMarkets = await usdaService.findFarmerMarkets(location, 20);
      const recommendedMarkets = farmersMarkets.map(market => 
        this.convertFarmerMarketToFoodSource(market)
      );
      
      // Get cultural recipes for seasonal produce
      const culturalRecipes = this.getCulturalRecipesForSeason(
        seasonalInfo.produce,
        culturalPreferences
      );
      
      // Generate budget tips for seasonal shopping
      const budgetTips = this.generateSeasonalBudgetTips(seasonalInfo.season);
      
      return {
        season: seasonalInfo.season,
        produce: seasonalInfo.produce,
        recommendedMarkets,
        culturalRecipes,
        budgetTips,
      };
    } catch (error) {
      console.error('Failed to get seasonal recommendations:', error);
      throw new Error('Unable to get seasonal shopping recommendations');
    }
  }

  /**
   * Convert GroceryStore to LocalFoodSource
   */
  private convertGroceryStoreToFoodSource(store: GroceryStore): LocalFoodSource {
    return {
      id: store.id,
      name: store.name,
      type: store.storeType,
      address: store.address,
      location: store.location,
      distance: store.distance || 0,
      rating: store.rating,
      priceLevel: store.priceLevel,
      openNow: store.openNow,
      specialties: store.specialties,
      acceptsPayments: {
        credit: true,
        snap: false, // Would need to check store details
        wic: false,
        cash: true,
      },
      contactInfo: {
        phone: store.phone,
        website: store.website,
        hours: store.openingHours,
      },
      photos: store.photos,
    };
  }

  /**
   * Convert SpecialtyMarket to LocalFoodSource
   */
  private convertSpecialtyMarketToFoodSource(market: SpecialtyMarket): LocalFoodSource {
    return {
      id: market.id,
      name: market.name,
      type: 'specialty',
      address: market.address,
      location: market.location,
      distance: market.distance || 0,
      rating: market.rating,
      priceLevel: market.priceLevel,
      openNow: market.openNow,
      specialties: market.specialties,
      culturalFocus: market.culturalFocus,
      acceptsPayments: {
        credit: true,
        snap: false,
        wic: false,
        cash: true,
      },
      contactInfo: {
        phone: market.phone,
        website: market.website,
        hours: market.openingHours,
      },
      photos: market.photos,
    };
  }

  /**
   * Convert LocalHarvest to LocalFoodSource
   */
  private convertFarmerMarketToFoodSource(market: LocalHarvest): LocalFoodSource {
    const currentSeason = this.getCurrentSeason();
    const seasonalInfo = market.seasonalAvailability[currentSeason];

    return {
      id: market.marketId,
      name: market.marketName,
      type: 'farmers_market',
      address: market.address,
      location: market.location,
      distance: market.distance || 0,
      specialties: market.productsAvailable,
      culturalFocus: market.culturalSpecialties,
      acceptsPayments: {
        credit: market.acceptsPayments.credit,
        snap: market.acceptsPayments.snap,
        wic: market.acceptsPayments.wic,
        cash: market.acceptsPayments.cash,
      },
      seasonalInfo: {
        currentSeason,
        availableProducts: seasonalInfo.products,
        nextSeasonStart: this.getNextSeasonStart(),
      },
      contactInfo: {
        hours: [seasonalInfo.hours],
      },
      photos: [],
    };
  }

  /**
   * Generate cultural shopping guides
   */
  private async generateCulturalShoppingGuides(
    culturalPreferences: string[],
    allSources: LocalFoodSource[],
    seasonalProduce: SeasonalProduce[]
  ): Promise<CulturalShoppingGuide[]> {
    const guides: CulturalShoppingGuide[] = [];

    for (const culture of culturalPreferences) {
      const culturalSources = allSources.filter(source => 
        source.culturalFocus?.includes(culture) || 
        source.specialties.some(specialty => 
          this.isCulturallyRelevant(specialty, culture)
        )
      );

      const culturalSeasonalProduce = seasonalProduce.filter(produce =>
        produce.culturalUses[culture.toLowerCase()]
      );

      guides.push({
        culturalCuisine: culture,
        recommendedStores: culturalSources.slice(0, 10), // Top 10 recommendations
        seasonalIngredients: culturalSeasonalProduce,
        shoppingTips: this.generateCulturalShoppingTips(culture),
        authenticityNotes: this.generateAuthenticityNotes(culture),
        budgetTips: this.generateBudgetTips(culture),
      });
    }

    return guides;
  }

  /**
   * Identify best seasonal sources
   */
  private identifyBestSeasonalSources(
    allSources: LocalFoodSource[],
    seasonalProduce: SeasonalProduce[]
  ): LocalFoodSource[] {
    // Prioritize farmer markets for seasonal produce
    const farmersMarkets = allSources.filter(source => source.type === 'farmers_market');
    const organicStores = allSources.filter(source => source.type === 'organic');
    const regularStores = allSources.filter(source => 
      source.type === 'grocery' || source.type === 'supermarket'
    );

    return [...farmersMarkets, ...organicStores, ...regularStores].slice(0, 5);
  }

  /**
   * Rank stores by cultural relevance
   */
  private rankStoresByCulturalRelevance(
    stores: LocalFoodSource[],
    culturalCuisine: string
  ): LocalFoodSource[] {
    return stores
      .map(store => ({
        store,
        score: this.calculateCulturalRelevanceScore(store, culturalCuisine),
      }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.store);
  }

  /**
   * Calculate cultural relevance score
   */
  private calculateCulturalRelevanceScore(
    store: LocalFoodSource,
    culturalCuisine: string
  ): number {
    let score = 0;

    // Cultural focus match
    if (store.culturalFocus?.includes(culturalCuisine)) {
      score += 50;
    }

    // Specialty match
    if (store.specialties.some(specialty => 
      this.isCulturallyRelevant(specialty, culturalCuisine)
    )) {
      score += 30;
    }

    // Store type bonus
    if (store.type === 'specialty') {
      score += 20;
    } else if (store.type === 'farmers_market') {
      score += 15;
    }

    // Distance penalty (closer is better)
    score -= store.distance * 2;

    // Rating bonus
    if (store.rating) {
      score += store.rating * 5;
    }

    return Math.max(0, score);
  }

  /**
   * Check if specialty is culturally relevant
   */
  private isCulturallyRelevant(specialty: string, culture: string): boolean {
    const culturalKeywords: Record<string, string[]> = {
      'asian': ['asian', 'chinese', 'japanese', 'korean', 'thai', 'vietnamese', 'soy', 'rice'],
      'mexican': ['mexican', 'latino', 'hispanic', 'tortilla', 'salsa', 'chili'],
      'indian': ['indian', 'curry', 'spices', 'lentils', 'basmati'],
      'mediterranean': ['mediterranean', 'olive', 'feta', 'herbs'],
      'middle_eastern': ['middle eastern', 'halal', 'pita', 'hummus'],
    };

    const keywords = culturalKeywords[culture.toLowerCase()] || [];
    return keywords.some(keyword => 
      specialty.toLowerCase().includes(keyword)
    );
  }

  /**
   * Assign shopping items to optimal stores
   */
  private assignItemsToStores(
    shoppingList: ShoppingItem[],
    availableStores: LocalFoodSource[],
    culturalPreferences: string[]
  ): Map<LocalFoodSource, ShoppingItem[]> {
    const assignments = new Map<LocalFoodSource, ShoppingItem[]>();

    shoppingList.forEach(item => {
      const bestStore = this.findBestStoreForItem(item, availableStores, culturalPreferences);
      
      if (!assignments.has(bestStore)) {
        assignments.set(bestStore, []);
      }
      assignments.get(bestStore)!.push(item);
    });

    return assignments;
  }

  /**
   * Find best store for a specific item
   */
  private findBestStoreForItem(
    item: ShoppingItem,
    availableStores: LocalFoodSource[],
    culturalPreferences: string[]
  ): LocalFoodSource {
    // Score stores based on item category and cultural relevance
    const scoredStores = availableStores.map(store => ({
      store,
      score: this.scoreStoreForItem(store, item, culturalPreferences),
    }));

    // Return store with highest score
    const bestStore = scoredStores.reduce((best, current) => 
      current.score > best.score ? current : best
    );

    return bestStore.store;
  }

  /**
   * Score store for specific item
   */
  private scoreStoreForItem(
    store: LocalFoodSource,
    item: ShoppingItem,
    culturalPreferences: string[]
  ): number {
    let score = 0;

    // Cultural relevance
    if (item.culturalSignificance && store.culturalFocus) {
      const culturalMatch = culturalPreferences.some(pref => 
        store.culturalFocus!.includes(pref)
      );
      if (culturalMatch) score += 40;
    }

    // Specialty match
    if (store.specialties.some(specialty => 
      specialty.toLowerCase().includes(item.category.toLowerCase())
    )) {
      score += 30;
    }

    // Store type appropriateness
    if (item.category === 'produce' && store.type === 'farmers_market') {
      score += 25;
    } else if (item.category === 'organic' && store.type === 'organic') {
      score += 25;
    }

    // Distance penalty
    score -= store.distance * 3;

    // Price level consideration (lower is better for budget)
    if (store.priceLevel) {
      score -= store.priceLevel * 5;
    }

    return score;
  }

  /**
   * Select optimal stores from assignments
   */
  private selectOptimalStores(
    assignments: Map<LocalFoodSource, ShoppingItem[]>,
    maxStores: number
  ): ShoppingStop[] {
    // Convert assignments to stops and sort by value
    const stops = Array.from(assignments.entries())
      .map(([store, items]) => ({
        store,
        items,
        estimatedTime: this.estimateShoppingTime(items, store),
        order: 0, // Will be set during route optimization
        culturalItems: items.filter(item => item.culturalSignificance).map(item => item.name),
        specialFinds: this.identifySpecialFinds(items, store),
      }))
      .sort((a, b) => b.items.length - a.items.length) // Sort by number of items
      .slice(0, maxStores);

    return stops;
  }

  /**
   * Calculate optimal route
   */
  private calculateOptimalRoute(
    userLocation: { lat: number; lng: number },
    stops: ShoppingStop[]
  ): ShoppingRoute {
    // Simple route optimization (in practice, would use routing API)
    const orderedStops = this.optimizeStopOrder(userLocation, stops);
    
    const totalDistance = this.calculateTotalDistance(userLocation, orderedStops);
    const totalTime = orderedStops.reduce((sum, stop) => sum + stop.estimatedTime, 0) + 
                     (orderedStops.length * 10); // 10 minutes travel between stores
    
    const estimatedCost = orderedStops.reduce((sum, stop) => 
      sum + stop.items.reduce((itemSum, item) => itemSum + item.estimatedPrice, 0), 0
    );
    
    const fuelCost = totalDistance * 0.15; // Estimate $0.15 per mile
    const netSavings = this.calculateNetSavings(orderedStops, fuelCost);
    
    const culturalOptimization = this.calculateCulturalOptimization(orderedStops);

    return {
      totalDistance,
      totalTime,
      estimatedCost,
      fuelCost,
      netSavings,
      stops: orderedStops,
      culturalOptimization,
    };
  }

  /**
   * Helper methods
   */
  private getCurrentSeason(): 'spring' | 'summer' | 'fall' | 'winter' {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  private getNextSeasonStart(): string {
    const currentSeason = this.getCurrentSeason();
    const nextSeasonDates = {
      spring: 'June 21',
      summer: 'September 21',
      fall: 'December 21',
      winter: 'March 21',
    };
    return nextSeasonDates[currentSeason];
  }

  private generateCulturalShoppingTips(culture: string): string[] {
    const tips: Record<string, string[]> = {
      'asian': [
        'Look for fresh ginger and garlic at Asian markets',
        'Buy soy sauce and rice in bulk for savings',
        'Check the seafood section for fresh fish',
      ],
      'mexican': [
        'Visit Mexican markets for authentic chili peppers',
        'Buy dried beans and rice in bulk',
        'Look for fresh tortillas made daily',
      ],
      'indian': [
        'Purchase whole spices and grind at home for freshness',
        'Buy lentils and basmati rice in large quantities',
        'Look for fresh curry leaves and cilantro',
      ],
    };

    return tips[culture.toLowerCase()] || [
      'Shop at specialty markets for authentic ingredients',
      'Buy staples in bulk to save money',
      'Ask store staff for recommendations',
    ];
  }

  private generateAuthenticityNotes(culture: string): string[] {
    return [
      `Look for traditional ${culture} brands and products`,
      'Ask staff about the most authentic ingredients',
      'Check expiration dates on imported items',
      'Consider seasonal availability for best quality',
    ];
  }

  private generateBudgetTips(culture: string): string[] {
    return [
      'Buy staple ingredients in bulk',
      'Compare prices between specialty and regular stores',
      'Look for sales on cultural ingredients',
      'Consider frozen alternatives for expensive fresh items',
    ];
  }

  private getCulturalRecipesForSeason(
    produce: SeasonalProduce[],
    culturalPreferences: string[]
  ): string[] {
    const recipes: string[] = [];
    
    produce.forEach(item => {
      culturalPreferences.forEach(culture => {
        const culturalRecipes = item.culturalUses[culture.toLowerCase()];
        if (culturalRecipes) {
          recipes.push(...culturalRecipes);
        }
      });
    });

    return [...new Set(recipes)]; // Remove duplicates
  }

  private generateSeasonalBudgetTips(season: string): string[] {
    const tips: Record<string, string[]> = {
      spring: [
        'Buy fresh asparagus and greens at farmer markets',
        'Stock up on spring onions and herbs',
        'Look for early season discounts',
      ],
      summer: [
        'Take advantage of peak tomato and pepper season',
        'Buy in bulk and preserve for winter',
        'Shop early morning for best selection',
      ],
      fall: [
        'Stock up on storage crops like squash and apples',
        'Buy root vegetables in bulk',
        'Look for harvest festival deals',
      ],
      winter: [
        'Focus on stored and preserved foods',
        'Buy citrus fruits at peak season',
        'Look for greenhouse produce deals',
      ],
    };

    return tips[season] || [];
  }

  private estimateShoppingTime(items: ShoppingItem[], store: LocalFoodSource): number {
    // Base time + time per item + store type modifier
    let baseTime = 15; // 15 minutes base
    const timePerItem = 2; // 2 minutes per item
    
    if (store.type === 'farmers_market') {
      baseTime += 10; // More time for browsing
    } else if (store.type === 'specialty') {
      baseTime += 5; // Time to find specialty items
    }

    return baseTime + (items.length * timePerItem);
  }

  private identifySpecialFinds(items: ShoppingItem[], store: LocalFoodSource): string[] {
    return items
      .filter(item => item.culturalSignificance)
      .map(item => `Authentic ${item.name}`)
      .slice(0, 3); // Top 3 special finds
  }

  private optimizeStopOrder(
    userLocation: { lat: number; lng: number },
    stops: ShoppingStop[]
  ): ShoppingStop[] {
    // Simple nearest-neighbor optimization
    const orderedStops: ShoppingStop[] = [];
    let currentLocation = userLocation;
    const remainingStops = [...stops];

    while (remainingStops.length > 0) {
      const nearestIndex = this.findNearestStoreIndex(currentLocation, remainingStops);
      const nearestStop = remainingStops.splice(nearestIndex, 1)[0];
      if (!nearestStop) break; // Safety check
      nearestStop.order = orderedStops.length + 1;
      orderedStops.push(nearestStop);
      currentLocation = nearestStop.store.location;
    }

    return orderedStops;
  }

  private findNearestStoreIndex(
    location: { lat: number; lng: number },
    stores: ShoppingStop[]
  ): number {
    if (stores.length === 0) return 0;
    
    let nearestIndex = 0;
    let nearestDistance = this.calculateDistance(location, stores[0]!.store.location);

    for (let i = 1; i < stores.length; i++) {
      const distance = this.calculateDistance(location, stores[i]!.store.location);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    return nearestIndex;
  }

  private calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private calculateTotalDistance(
    userLocation: { lat: number; lng: number },
    stops: ShoppingStop[]
  ): number {
    let totalDistance = 0;
    let currentLocation = userLocation;

    stops.forEach(stop => {
      totalDistance += this.calculateDistance(currentLocation, stop.store.location);
      currentLocation = stop.store.location;
    });

    // Add return trip to user location
    if (stops.length > 0) {
      totalDistance += this.calculateDistance(
        stops[stops.length - 1]!.store.location,
        userLocation
      );
    }

    return totalDistance;
  }

  private calculateNetSavings(stops: ShoppingStop[], fuelCost: number): number {
    // Simplified calculation - would need actual price comparison data
    const estimatedSavings = stops.length * 15; // $15 savings per store
    return Math.max(0, estimatedSavings - fuelCost);
  }

  private calculateCulturalOptimization(stops: ShoppingStop[]): {
    authenticityScore: number;
    culturalStopsIncluded: number;
    traditionalIngredients: string[];
  } {
    const culturalStops = stops.filter(stop => 
      stop.store.type === 'specialty' || stop.culturalItems!.length > 0
    );

    const traditionalIngredients = stops.flatMap(stop => stop.culturalItems || []);
    
    const authenticityScore = culturalStops.length > 0 
      ? (culturalStops.length / stops.length) * 100 
      : 0;

    return {
      authenticityScore,
      culturalStopsIncluded: culturalStops.length,
      traditionalIngredients: [...new Set(traditionalIngredients)],
    };
  }
}

/**
 * Singleton instance of LocationService
 */
export const locationService = new LocationService();