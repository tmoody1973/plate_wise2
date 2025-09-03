/**
 * USDA API Integration
 * Provides farmer market data, seasonal information, and agricultural data
 */

// Types for USDA API integration
export interface FarmerMarket {
  id: string;
  marketName: string;
  website?: string;
  facebook?: string;
  twitter?: string;
  season1Date?: string;
  season1Time?: string;
  season2Date?: string;
  season2Time?: string;
  season3Date?: string;
  season3Time?: string;
  season4Date?: string;
  season4Time?: string;
  x: number; // longitude
  y: number; // latitude
  location: string;
  addressLine1?: string;
  city?: string;
  county?: string;
  state?: string;
  zip?: string;
  kiosk?: string;
  bakedgoods?: string;
  cheese?: string;
  crafts?: string;
  flowers?: string;
  eggs?: string;
  seafood?: string;
  herbs?: string;
  vegetables?: string;
  honey?: string;
  jams?: string;
  maple?: string;
  meat?: string;
  nursery?: string;
  nuts?: string;
  plants?: string;
  poultry?: string;
  prepared?: string;
  soap?: string;
  trees?: string;
  wine?: string;
  coffee?: string;
  beans?: string;
  fruits?: string;
  grains?: string;
  juices?: string;
  mushrooms?: string;
  petFood?: string;
  tofu?: string;
  wildHarvested?: string;
  organic?: string;
  credit?: string;
  wic?: string;
  wiccash?: string;
  sfmnp?: string;
  snap?: string;
  updateTime?: string;
}

export interface SeasonalProduce {
  name: string;
  season: 'spring' | 'summer' | 'fall' | 'winter';
  months: string[];
  peakMonths: string[];
  nutritionalBenefits: string[];
  storageInfo: string;
  preparationTips: string[];
  culturalUses: Record<string, string[]>;
}

export interface NutritionData {
  fdcId: number;
  description: string;
  dataType: string;
  gtinUpc?: string;
  publishedDate: string;
  brandOwner?: string;
  brandName?: string;
  ingredients?: string;
  marketCountry?: string;
  foodCategory?: string;
  modifiedDate?: string;
  dataSource?: string;
  packageWeight?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodNutrients: FoodNutrient[];
  foodAttributes?: FoodAttribute[];
  foodPortions?: FoodPortion[];
  inputFoods?: InputFood[];
  wweiaFoodCategory?: WweiaFoodCategory;
}

export interface FoodNutrient {
  nutrientId: number;
  nutrientName: string;
  nutrientNumber: string;
  unitName: string;
  derivationCode?: string;
  derivationDescription?: string;
  derivationId?: number;
  value?: number;
  foodNutrientSourceId?: number;
  foodNutrientSourceCode?: string;
  foodNutrientSourceDescription?: string;
  rank?: number;
  indentLevel?: number;
  foodNutrientId?: number;
  percentDailyValue?: number;
}

export interface FoodAttribute {
  id: number;
  name: string;
  value: string;
}

export interface FoodPortion {
  id: number;
  amount: number;
  unitName: string;
  modifier?: string;
  gramWeight: number;
  sequenceNumber: number;
  minYearAcquired?: number;
}

export interface InputFood {
  id: number;
  unit: string;
  portionCode?: string;
  portionDescription?: string;
  gramWeight: number;
  rank?: number;
  srCode?: number;
  value?: number;
}

export interface WweiaFoodCategory {
  wweiaFoodCategoryCode: number;
  wweiaFoodCategoryDescription: string;
}

export interface FoodSearchCriteria {
  query: string;
  dataType?: string[];
  pageSize?: number;
  pageNumber?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  brandOwner?: string;
  tradeChannel?: string[];
  startDate?: string;
  endDate?: string;
}

export interface FoodSearchResult {
  totalHits: number;
  currentPage: number;
  totalPages: number;
  pageList: number[];
  foodSearchCriteria: FoodSearchCriteria;
  foods: NutritionData[];
  aggregations?: {
    dataType: Record<string, number>;
    nutrients: Record<string, number>;
  };
}

export interface LocalHarvest {
  marketId: string;
  marketName: string;
  location: {
    lat: number;
    lng: number;
  };
  address: string;
  seasonalAvailability: SeasonalAvailability;
  productsAvailable: string[];
  organicOptions: boolean;
  acceptsPayments: PaymentOptions;
  culturalSpecialties: string[];
  distance?: number;
}

export interface SeasonalAvailability {
  spring: {
    active: boolean;
    dates: string;
    hours: string;
    products: string[];
  };
  summer: {
    active: boolean;
    dates: string;
    hours: string;
    products: string[];
  };
  fall: {
    active: boolean;
    dates: string;
    hours: string;
    products: string[];
  };
  winter: {
    active: boolean;
    dates: string;
    hours: string;
    products: string[];
  };
}

export interface PaymentOptions {
  credit: boolean;
  wic: boolean;
  snap: boolean;
  cash: boolean;
  sfmnp: boolean; // Senior Farmers Market Nutrition Program
}

/**
 * USDA API Service
 * Handles farmer market data, seasonal produce information, and nutrition data
 */
export class USDAService {
  private farmerMarketBaseURL = 'https://www.usda.gov/media/digital/fns/farmers-market-api';
  private nutritionBaseURL = 'https://api.nal.usda.gov/fdc/v1';
  private nutritionApiKey: string;
  
  private requestCount = 0;
  private dailyLimit = 1000; // Typical API limit
  private lastResetDate = new Date().toDateString();

  // Seasonal produce data (would typically come from USDA databases)
  private seasonalProduceData: SeasonalProduce[] = [
    {
      name: 'Asparagus',
      season: 'spring',
      months: ['March', 'April', 'May', 'June'],
      peakMonths: ['April', 'May'],
      nutritionalBenefits: ['High in folate', 'Good source of vitamin K', 'Contains antioxidants'],
      storageInfo: 'Store in refrigerator for up to 4 days',
      preparationTips: ['Snap off tough ends', 'Steam or roast for best flavor'],
      culturalUses: {
        'european': ['Grilled with olive oil', 'In risotto'],
        'asian': ['Stir-fried with garlic', 'In tempura'],
      },
    },
    {
      name: 'Tomatoes',
      season: 'summer',
      months: ['June', 'July', 'August', 'September'],
      peakMonths: ['July', 'August'],
      nutritionalBenefits: ['High in lycopene', 'Good source of vitamin C', 'Contains potassium'],
      storageInfo: 'Store at room temperature until ripe, then refrigerate',
      preparationTips: ['Choose firm, unblemished fruits', 'Salt slices to remove excess moisture'],
      culturalUses: {
        'mediterranean': ['In caprese salad', 'For pasta sauce'],
        'mexican': ['In salsa', 'For gazpacho'],
        'indian': ['In curry', 'For chutneys'],
      },
    },
    {
      name: 'Apples',
      season: 'fall',
      months: ['September', 'October', 'November', 'December'],
      peakMonths: ['October', 'November'],
      nutritionalBenefits: ['High in fiber', 'Contains antioxidants', 'Good source of vitamin C'],
      storageInfo: 'Store in refrigerator for up to 2 months',
      preparationTips: ['Choose firm fruits', 'Add lemon juice to prevent browning'],
      culturalUses: {
        'american': ['Apple pie', 'Apple sauce'],
        'european': ['Strudel', 'Tarte tatin'],
        'middle_eastern': ['In tagines', 'With lamb dishes'],
      },
    },
    {
      name: 'Winter Squash',
      season: 'winter',
      months: ['October', 'November', 'December', 'January', 'February'],
      peakMonths: ['November', 'December'],
      nutritionalBenefits: ['High in beta-carotene', 'Good source of fiber', 'Contains potassium'],
      storageInfo: 'Store in cool, dry place for up to 6 months',
      preparationTips: ['Cut carefully with sharp knife', 'Roast to bring out sweetness'],
      culturalUses: {
        'american': ['Butternut squash soup', 'Roasted acorn squash'],
        'italian': ['In risotto', 'Stuffed squash'],
        'thai': ['In curry', 'Coconut squash soup'],
      },
    },
  ];

  constructor() {
    this.nutritionApiKey = process.env.USDA_NUTRITION_API_KEY || '';
    
    if (!this.nutritionApiKey) {
      console.warn('USDA Nutrition API key not configured');
    }
  }

  /**
   * Check rate limiting before making requests
   */
  private checkRateLimit(): void {
    const today = new Date().toDateString();
    
    if (today !== this.lastResetDate) {
      this.requestCount = 0;
      this.lastResetDate = today;
    }
    
    if (this.requestCount >= this.dailyLimit) {
      throw new Error('Daily API limit reached for USDA API');
    }
    
    this.requestCount++;
  }

  /**
   * Make API request
   */
  private async makeRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    this.checkRateLimit();

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`USDA API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`USDA API request failed for ${url}:`, error);
      throw error;
    }
  }

  /**
   * Find farmer markets near location
   */
  async findFarmerMarkets(
    location: { lat: number; lng: number },
    radius: number = 25
  ): Promise<LocalHarvest[]> {
    // Note: The actual USDA Farmer Market API has been discontinued
    // This is a mock implementation showing how it would work
    try {
      // Mock data for demonstration
      const mockMarkets: FarmerMarket[] = [
        {
          id: '1',
          marketName: 'Downtown Farmers Market',
          x: location.lng + 0.01,
          y: location.lat + 0.01,
          location: 'Downtown Square',
          city: 'Sample City',
          state: 'CA',
          season1Date: 'April to October',
          season1Time: 'Saturday 8:00 AM to 2:00 PM',
          vegetables: 'Y',
          fruits: 'Y',
          organic: 'Y',
          snap: 'Y',
          wic: 'Y',
          credit: 'Y',
        },
        {
          id: '2',
          marketName: 'Riverside Community Market',
          x: location.lng - 0.02,
          y: location.lat + 0.015,
          location: 'Riverside Park',
          city: 'Sample City',
          state: 'CA',
          season1Date: 'May to September',
          season1Time: 'Sunday 9:00 AM to 1:00 PM',
          vegetables: 'Y',
          fruits: 'Y',
          herbs: 'Y',
          honey: 'Y',
          organic: 'Y',
          snap: 'Y',
        },
      ];

      return mockMarkets
        .map(market => this.convertToLocalHarvest(market, location))
        .filter(market => market.distance! <= radius)
        .sort((a, b) => a.distance! - b.distance!);
    } catch (error) {
      console.error('Failed to find farmer markets:', error);
      return [];
    }
  }

  /**
   * Get seasonal produce information
   */
  getSeasonalProduce(
    season?: 'spring' | 'summer' | 'fall' | 'winter',
    month?: string
  ): SeasonalProduce[] {
    let produce = this.seasonalProduceData;

    if (season) {
      produce = produce.filter(item => item.season === season);
    }

    if (month) {
      produce = produce.filter(item => 
        item.months.includes(month) || item.peakMonths.includes(month)
      );
    }

    return produce;
  }

  /**
   * Get current seasonal recommendations
   */
  getCurrentSeasonalRecommendations(
    location?: { lat: number; lng: number }
  ): {
    season: string;
    produce: SeasonalProduce[];
    recommendations: string[];
  } {
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const currentSeason = this.getCurrentSeason();
    
    const seasonalProduce = this.getSeasonalProduce(currentSeason, currentMonth);
    const recommendations = this.generateSeasonalRecommendations(seasonalProduce, currentSeason);

    return {
      season: currentSeason,
      produce: seasonalProduce,
      recommendations,
    };
  }

  /**
   * Search for nutrition data
   */
  async searchNutritionData(criteria: FoodSearchCriteria): Promise<FoodSearchResult | null> {
    if (!this.nutritionApiKey) {
      console.warn('USDA Nutrition API key not configured');
      return null;
    }

    const params = new URLSearchParams({
      api_key: this.nutritionApiKey,
      query: criteria.query,
      pageSize: (criteria.pageSize || 25).toString(),
      pageNumber: (criteria.pageNumber || 1).toString(),
    });

    if (criteria.dataType) {
      criteria.dataType.forEach(type => params.append('dataType', type));
    }

    if (criteria.sortBy) {
      params.append('sortBy', criteria.sortBy);
      params.append('sortOrder', criteria.sortOrder || 'asc');
    }

    try {
      const url = `${this.nutritionBaseURL}/foods/search?${params.toString()}`;
      return await this.makeRequest<FoodSearchResult>(url);
    } catch (error) {
      console.error('Nutrition data search failed:', error);
      return null;
    }
  }

  /**
   * Get detailed nutrition information for a food item
   */
  async getFoodNutrition(fdcId: number): Promise<NutritionData | null> {
    if (!this.nutritionApiKey) {
      console.warn('USDA Nutrition API key not configured');
      return null;
    }

    try {
      const url = `${this.nutritionBaseURL}/food/${fdcId}?api_key=${this.nutritionApiKey}`;
      return await this.makeRequest<NutritionData>(url);
    } catch (error) {
      console.error(`Failed to get nutrition data for FDC ID ${fdcId}:`, error);
      return null;
    }
  }

  /**
   * Get cultural produce recommendations
   */
  getCulturalProduceRecommendations(
    culturalCuisines: string[],
    season?: 'spring' | 'summer' | 'fall' | 'winter'
  ): {
    cuisine: string;
    produce: SeasonalProduce[];
    recipes: string[];
  }[] {
    const recommendations: {
      cuisine: string;
      produce: SeasonalProduce[];
      recipes: string[];
    }[] = [];

    const seasonalProduce = season 
      ? this.getSeasonalProduce(season)
      : this.seasonalProduceData;

    culturalCuisines.forEach(cuisine => {
      const culturalProduce = seasonalProduce.filter(produce => 
        produce.culturalUses[cuisine.toLowerCase()]
      );

      const recipes = culturalProduce.flatMap(produce => 
        produce.culturalUses[cuisine.toLowerCase()] || []
      );

      if (culturalProduce.length > 0) {
        recommendations.push({
          cuisine,
          produce: culturalProduce,
          recipes,
        });
      }
    });

    return recommendations;
  }

  /**
   * Get farmer market recommendations based on cultural preferences
   */
  async getCulturalFarmerMarketRecommendations(
    location: { lat: number; lng: number },
    culturalPreferences: string[],
    radius: number = 25
  ): Promise<{
    markets: LocalHarvest[];
    seasonalTips: string[];
    culturalFinds: string[];
  }> {
    const markets = await this.findFarmerMarkets(location, radius);
    const currentSeason = this.getCurrentSeason();
    const culturalRecommendations = this.getCulturalProduceRecommendations(
      culturalPreferences,
      currentSeason
    );

    const seasonalTips = this.generateSeasonalShoppingTips(currentSeason);
    const culturalFinds = culturalRecommendations.flatMap(rec => rec.recipes);

    return {
      markets,
      seasonalTips,
      culturalFinds,
    };
  }

  /**
   * Convert USDA farmer market data to LocalHarvest format
   */
  private convertToLocalHarvest(
    market: FarmerMarket,
    userLocation: { lat: number; lng: number }
  ): LocalHarvest {
    const distance = this.calculateDistance(
      userLocation,
      { lat: market.y, lng: market.x }
    );

    const productsAvailable = this.extractAvailableProducts(market);
    const seasonalAvailability = this.parseSeasonalAvailability(market);
    const paymentOptions = this.parsePaymentOptions(market);

    return {
      marketId: market.id,
      marketName: market.marketName,
      location: { lat: market.y, lng: market.x },
      address: this.formatAddress(market),
      seasonalAvailability,
      productsAvailable,
      organicOptions: market.organic === 'Y',
      acceptsPayments: paymentOptions,
      culturalSpecialties: this.identifyCulturalSpecialties(productsAvailable),
      distance,
    };
  }

  /**
   * Extract available products from farmer market data
   */
  private extractAvailableProducts(market: FarmerMarket): string[] {
    const products: string[] = [];
    
    if (market.vegetables === 'Y') products.push('Vegetables');
    if (market.fruits === 'Y') products.push('Fruits');
    if (market.herbs === 'Y') products.push('Herbs');
    if (market.honey === 'Y') products.push('Honey');
    if (market.meat === 'Y') products.push('Meat');
    if (market.poultry === 'Y') products.push('Poultry');
    if (market.seafood === 'Y') products.push('Seafood');
    if (market.eggs === 'Y') products.push('Eggs');
    if (market.cheese === 'Y') products.push('Cheese');
    if (market.bakedgoods === 'Y') products.push('Baked Goods');
    if (market.flowers === 'Y') products.push('Flowers');
    if (market.plants === 'Y') products.push('Plants');
    if (market.crafts === 'Y') products.push('Crafts');

    return products;
  }

  /**
   * Parse seasonal availability from farmer market data
   */
  private parseSeasonalAvailability(market: FarmerMarket): SeasonalAvailability {
    return {
      spring: {
        active: !!market.season1Date,
        dates: market.season1Date || '',
        hours: market.season1Time || '',
        products: this.extractAvailableProducts(market),
      },
      summer: {
        active: !!market.season2Date,
        dates: market.season2Date || '',
        hours: market.season2Time || '',
        products: this.extractAvailableProducts(market),
      },
      fall: {
        active: !!market.season3Date,
        dates: market.season3Date || '',
        hours: market.season3Time || '',
        products: this.extractAvailableProducts(market),
      },
      winter: {
        active: !!market.season4Date,
        dates: market.season4Date || '',
        hours: market.season4Time || '',
        products: this.extractAvailableProducts(market),
      },
    };
  }

  /**
   * Parse payment options from farmer market data
   */
  private parsePaymentOptions(market: FarmerMarket): PaymentOptions {
    return {
      credit: market.credit === 'Y',
      wic: market.wic === 'Y',
      snap: market.snap === 'Y',
      cash: true, // Assume all markets accept cash
      sfmnp: market.sfmnp === 'Y',
    };
  }

  /**
   * Format address from farmer market data
   */
  private formatAddress(market: FarmerMarket): string {
    const parts = [
      market.addressLine1,
      market.city,
      market.state,
      market.zip,
    ].filter(Boolean);

    return parts.join(', ') || market.location;
  }

  /**
   * Identify cultural specialties based on available products
   */
  private identifyCulturalSpecialties(products: string[]): string[] {
    const specialties: string[] = [];

    if (products.includes('Herbs')) {
      specialties.push('Fresh herbs for ethnic cooking');
    }
    if (products.includes('Vegetables')) {
      specialties.push('Seasonal vegetables for traditional recipes');
    }
    if (products.includes('Fruits')) {
      specialties.push('Local fruits for cultural desserts');
    }

    return specialties;
  }

  /**
   * Get current season based on date
   */
  private getCurrentSeason(): 'spring' | 'summer' | 'fall' | 'winter' {
    const month = new Date().getMonth();
    
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  /**
   * Generate seasonal recommendations
   */
  private generateSeasonalRecommendations(
    produce: SeasonalProduce[],
    season: string
  ): string[] {
    const recommendations: string[] = [];

    recommendations.push(`${season.charAt(0).toUpperCase() + season.slice(1)} is perfect for fresh ${produce.map(p => p.name.toLowerCase()).join(', ')}`);
    
    if (produce.length > 0) {
      recommendations.push(`Visit farmer markets for the freshest ${produce[0]!.name.toLowerCase()} and other seasonal produce`);
      recommendations.push(`Try traditional recipes featuring ${produce.slice(0, 2).map(p => p.name.toLowerCase()).join(' and ')}`);
    }

    return recommendations;
  }

  /**
   * Generate seasonal shopping tips
   */
  private generateSeasonalShoppingTips(season: string): string[] {
    const tips: Record<string, string[]> = {
      spring: [
        'Look for fresh asparagus and early greens',
        'Ask vendors about organic options',
        'Bring reusable bags for your purchases',
      ],
      summer: [
        'Shop early for the best selection',
        'Bring a cooler for perishable items',
        'Try new varieties of tomatoes and peppers',
      ],
      fall: [
        'Stock up on storage crops like squash and apples',
        'Ask about preservation techniques',
        'Look for late-season herbs to dry',
      ],
      winter: [
        'Focus on root vegetables and stored crops',
        'Ask about greenhouse-grown produce',
        'Look for preserved goods like jams and pickles',
      ],
    };

    return tips[season] || [];
  }

  /**
   * Calculate distance between two points
   */
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

  /**
   * Get usage statistics
   */
  getUsageStats(): { requestCount: number; dailyLimit: number; remaining: number } {
    return {
      requestCount: this.requestCount,
      dailyLimit: this.dailyLimit,
      remaining: this.dailyLimit - this.requestCount,
    };
  }
}

/**
 * Singleton instance of USDAService
 */
export const usdaService = new USDAService();