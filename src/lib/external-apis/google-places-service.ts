/**
 * Google Places API Integration
 * Provides local store discovery, specialty market finding, and location services
 */

// Simple in-memory cache for validated addresses
interface ValidationCacheEntry {
  result: {
    isValid: boolean;
    correctedAddress?: string;
    placeId?: string;
    phone?: string;
    website?: string;
    rating?: number;
    verification: 'verified' | 'corrected' | 'not_found';
  };
  timestamp: number;
}

const validationCache = new Map<string, ValidationCacheEntry>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Types for Google Places API integration
export interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
    viewport?: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
  };
  types: string[];
  business_status?: string;
  opening_hours?: {
    open_now: boolean;
    periods?: OpeningPeriod[];
    weekday_text?: string[];
  };
  photos?: PlacePhoto[];
  price_level?: number;
  rating?: number;
  user_ratings_total?: number;
  vicinity?: string;
  plus_code?: {
    compound_code: string;
    global_code: string;
  };
}

export interface OpeningPeriod {
  close?: {
    day: number;
    time: string;
  };
  open: {
    day: number;
    time: string;
  };
}

export interface PlacePhoto {
  height: number;
  width: number;
  photo_reference: string;
  html_attributions: string[];
}

export interface PlaceDetails extends PlaceResult {
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  url?: string;
  utc_offset?: number;
  reviews?: PlaceReview[];
  address_components?: AddressComponent[];
  adr_address?: string;
  icon?: string;
  icon_background_color?: string;
  icon_mask_base_uri?: string;
  reference?: string;
  scope?: string;
}

export interface PlaceReview {
  author_name: string;
  author_url?: string;
  language: string;
  profile_photo_url?: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
}

export interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export interface NearbySearchRequest {
  location: string; // lat,lng
  radius: number;
  type?: string;
  keyword?: string;
  language?: string;
  minprice?: number;
  maxprice?: number;
  name?: string;
  opennow?: boolean;
  rankby?: 'prominence' | 'distance';
  pagetoken?: string;
}

export interface TextSearchRequest {
  query: string;
  location?: string; // lat,lng
  radius?: number;
  language?: string;
  minprice?: number;
  maxprice?: number;
  opennow?: boolean;
  type?: string;
  pagetoken?: string;
}

export interface GroceryStore {
  id: string;
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  phone?: string;
  website?: string;
  rating?: number;
  priceLevel?: number;
  openNow?: boolean;
  openingHours?: string[];
  storeType: 'supermarket' | 'grocery' | 'specialty' | 'global' | 'organic' | 'farmers_market';
  specialties: string[];
  distance?: number;
  photos: string[];
  reviews: {
    rating: number;
    text: string;
    author: string;
    date: string;
  }[];
}

export interface SpecialtyMarket extends GroceryStore {
  culturalFocus: string[];
  authenticIngredients: string[];
  languagesSpoken: string[];
  culturalEvents?: string[];
}

/**
 * Google Places Service
 * Handles location-based store discovery and place information
 */
export class GooglePlacesService {
  private baseURL = 'https://maps.googleapis.com/maps/api/place';
  private apiKey: string;
  private requestCount = 0;
  private dailyLimit = 1000; // Typical API limit
  private lastResetDate = new Date().toDateString();

  constructor() {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY || '';
    
    if (!this.apiKey) {
      console.error('Google Places API key not configured. Please set GOOGLE_PLACES_API_KEY in your environment variables.');
      // Don't throw error, let methods handle the missing key gracefully
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
      throw new Error('Daily API limit reached for Google Places');
    }
    
    this.requestCount++;
  }

  /**
   * Make authenticated API request
   */
  private async makeRequest<T>(
    endpoint: string,
    params: Record<string, any> = {}
  ): Promise<T> {
    this.checkRateLimit();

    const url = new URL(`${this.baseURL}${endpoint}`);
    url.searchParams.append('key', this.apiKey);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    try {
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Google Places API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
      }

      return data;
    } catch (error) {
      console.error(`Google Places API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Find nearby grocery stores and supermarkets
   */
  async findNearbyGroceryStores(
    location: { lat: number; lng: number },
    radius: number = 5000,
    options: {
      openNow?: boolean;
      minRating?: number;
      priceLevel?: number[];
    } = {}
  ): Promise<GroceryStore[]> {
    const request: NearbySearchRequest = {
      location: `${location.lat},${location.lng}`,
      radius,
      type: 'grocery_or_supermarket',
      opennow: options.openNow,
    };

    try {
      const response = await this.makeRequest<{ results: PlaceResult[] }>('/nearbysearch/json', request);
      const stores = await Promise.all(
        response.results.map(place => this.convertToGroceryStore(place, location))
      );

      // Filter by rating and price level if specified
      return stores.filter(store => {
        if (options.minRating && store.rating && store.rating < options.minRating) {
          return false;
        }
        if (options.priceLevel && store.priceLevel && !options.priceLevel.includes(store.priceLevel)) {
          return false;
        }
        return true;
      });
    } catch (error) {
      console.error('Failed to find nearby grocery stores:', error);
      return [];
    }
  }

  /**
   * Find specialty markets by cultural focus
   */
  async findSpecialtyMarkets(
    location: { lat: number; lng: number },
    culturalFocus: string[],
    radius: number = 10000
  ): Promise<SpecialtyMarket[]> {
    const specialtyMarkets: SpecialtyMarket[] = [];

    // Search for different types of specialty markets
    const searchTerms = this.generateSpecialtySearchTerms(culturalFocus);

    for (const searchTerm of searchTerms) {
      try {
        const request: TextSearchRequest = {
          query: `${searchTerm} near ${location.lat},${location.lng}`,
          location: `${location.lat},${location.lng}`,
          radius,
          type: 'grocery_or_supermarket',
        };

        const response = await this.makeRequest<{ results: PlaceResult[] }>('/textsearch/json', request);
        
        for (const place of response.results) {
          const specialtyMarket = await this.convertToSpecialtyMarket(place, location, culturalFocus);
          if (specialtyMarket) {
            specialtyMarkets.push(specialtyMarket);
          }
        }
      } catch (error) {
        console.error(`Failed to search for ${searchTerm}:`, error);
      }
    }

    // Remove duplicates and sort by distance
    const uniqueMarkets = this.removeDuplicateMarkets(specialtyMarkets);
    return uniqueMarkets.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }

  /**
   * Get detailed information about a specific place
   */
  async getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
    if (!this.apiKey) {
      console.error('Google Places API: Cannot get place details without API key');
      return null;
    }

    try {
      console.log('Google Places API: Getting details for place:', placeId);
      const response = await this.makeRequest<{ result: PlaceDetails }>('/details/json', {
        place_id: placeId,
        fields: 'name,formatted_address,formatted_phone_number,website,rating,reviews,opening_hours,photos,price_level,types,business_status,address_components',
      });

      console.log('Google Places API: Got details for:', response.result?.name);
      return response.result;
    } catch (error) {
      console.error(`Failed to get place details for ${placeId}:`, error);
      return null;
    }
  }

  /**
   * Search for stores by text query
   */
  async searchStores(
    query: string,
    location?: { lat: number; lng: number },
    radius: number = 10000
  ): Promise<GroceryStore[]> {
    if (!this.apiKey) {
      console.error('Google Places API: Cannot search stores without API key');
      return [];
    }

    const request: TextSearchRequest = {
      query,
      location: location ? `${location.lat},${location.lng}` : undefined,
      radius: location ? radius : undefined,
      type: 'grocery_or_supermarket',
    };

    try {
      console.log('Google Places API: Searching for stores with query:', query);
      const response = await this.makeRequest<{ results: PlaceResult[] }>('/textsearch/json', request);
      console.log('Google Places API: Found', response.results?.length || 0, 'stores');
      return Promise.all(
        response.results.map(place => this.convertToGroceryStore(place, location))
      );
    } catch (error) {
      console.error('Store search failed:', error);
      return [];
    }
  }

  /**
   * Find stores with specific amenities or services
   */
  async findStoresWithAmenities(
    location: { lat: number; lng: number },
    amenities: string[],
    radius: number = 5000
  ): Promise<GroceryStore[]> {
    const stores: GroceryStore[] = [];

    for (const amenity of amenities) {
      try {
        const query = `grocery store ${amenity}`;
        const storesWithAmenity = await this.searchStores(query, location, radius);
        stores.push(...storesWithAmenity);
      } catch (error) {
        console.error(`Failed to find stores with ${amenity}:`, error);
      }
    }

    return this.removeDuplicateStores(stores);
  }

  /**
   * Get photo URL for a place photo
   */
  getPhotoUrl(
    photoReference: string,
    maxWidth: number = 400,
    maxHeight?: number
  ): string {
    const params = new URLSearchParams({
      photoreference: photoReference,
      maxwidth: maxWidth.toString(),
      key: this.apiKey,
    });

    if (maxHeight) {
      params.append('maxheight', maxHeight.toString());
    }

    return `${this.baseURL}/photo?${params.toString()}`;
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const R = 6371; // Earth's radius in kilometers
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
   * Convert Google Places result to GroceryStore
   */
  private async convertToGroceryStore(
    place: PlaceResult,
    userLocation?: { lat: number; lng: number }
  ): Promise<GroceryStore> {
    const distance = userLocation 
      ? this.calculateDistance(userLocation, place.geometry.location)
      : undefined;

    const storeType = this.determineStoreType(place);
    const specialties = this.extractSpecialties(place);

    // Get detailed information including website and phone
    const details = await this.getPlaceDetails(place.place_id);

    return {
      id: place.place_id,
      name: place.name,
      address: place.formatted_address,
      location: place.geometry.location,
      phone: details?.formatted_phone_number,
      website: details?.website,
      rating: place.rating,
      priceLevel: place.price_level,
      openNow: place.opening_hours?.open_now,
      openingHours: place.opening_hours?.weekday_text,
      storeType,
      specialties,
      distance,
      photos: place.photos?.map(photo => this.getPhotoUrl(photo.photo_reference)) || [],
      reviews: [], // Would be populated from place details
    };
  }

  /**
   * Convert Google Places result to SpecialtyMarket
   */
  private async convertToSpecialtyMarket(
    place: PlaceResult,
    userLocation: { lat: number; lng: number },
    culturalFocus: string[]
  ): Promise<SpecialtyMarket | null> {
    const baseStore = await this.convertToGroceryStore(place, userLocation);
    
    // Determine if this is actually a specialty market
    const culturalMatch = this.analyzeCulturalMatch(place, culturalFocus);
    if (culturalMatch.score < 0.3) {
      return null; // Not culturally relevant enough
    }

    return {
      ...baseStore,
      culturalFocus: culturalMatch.cultures,
      authenticIngredients: culturalMatch.ingredients,
      languagesSpoken: culturalMatch.languages,
      culturalEvents: culturalMatch.events,
    };
  }

  /**
   * Determine store type based on place data
   */
  private determineStoreType(place: PlaceResult): GroceryStore['storeType'] {
    const name = place.name.toLowerCase();
    const types = place.types.map(type => type.toLowerCase());

    if (name.includes('farmers market') || types.includes('farmers_market')) {
      return 'farmers_market';
    }
    
    if (name.includes('organic') || name.includes('whole foods') || name.includes('natural')) {
      return 'organic';
    }
    
    if (this.isGlobalMarket(name)) {
      return 'global';
    }
    
    if (name.includes('specialty') || name.includes('gourmet')) {
      return 'specialty';
    }
    
    if (types.includes('supermarket') || name.includes('supermarket')) {
      return 'supermarket';
    }
    
    return 'grocery';
  }

  /**
   * Check if store is a global market
   */
  private isGlobalMarket(name: string): boolean {
    const globalKeywords = [
      'asian', 'chinese', 'japanese', 'korean', 'thai', 'vietnamese',
      'indian', 'pakistani', 'bangladeshi',
      'mexican', 'latino', 'hispanic',
      'middle eastern', 'persian', 'turkish', 'lebanese',
      'african', 'ethiopian', 'somali',
      'european', 'italian', 'german', 'polish', 'russian',
      'halal', 'kosher', 'international'
    ];

    return globalKeywords.some(keyword => name.includes(keyword));
  }

  /**
   * Extract specialties from place data
   */
  private extractSpecialties(place: PlaceResult): string[] {
    const specialties: string[] = [];
    const name = place.name.toLowerCase();

    // Extract from name
    if (name.includes('organic')) specialties.push('Organic Products');
    if (name.includes('fresh')) specialties.push('Fresh Produce');
    if (name.includes('meat')) specialties.push('Butcher/Meat');
    if (name.includes('seafood') || name.includes('fish')) specialties.push('Seafood');
    if (name.includes('bakery') || name.includes('bread')) specialties.push('Bakery');
    if (name.includes('deli')) specialties.push('Deli');
    if (name.includes('wine') || name.includes('liquor')) specialties.push('Wine & Spirits');

    return specialties;
  }

  /**
   * Generate search terms for specialty markets
   */
  private generateSpecialtySearchTerms(culturalFocus: string[]): string[] {
    const baseTerms = ['grocery store', 'market', 'food store', 'supermarket'];
    const culturalTerms: Record<string, string[]> = {
      'asian': ['asian grocery', 'chinese market', 'korean store', 'japanese market', 'thai grocery'],
      'mexican': ['mexican market', 'latino grocery', 'hispanic store', 'mercado'],
      'indian': ['indian grocery', 'south asian market', 'pakistani store', 'bangladeshi market'],
      'middle_eastern': ['middle eastern market', 'persian grocery', 'turkish store', 'halal market'],
      'african': ['african market', 'ethiopian grocery', 'somali store'],
      'european': ['european deli', 'italian market', 'german store', 'polish grocery'],
      'kosher': ['kosher market', 'kosher grocery', 'jewish market'],
      'organic': ['organic market', 'natural foods', 'whole foods', 'health food store'],
    };

    const searchTerms = [...baseTerms];
    
    culturalFocus.forEach(culture => {
      const terms = culturalTerms[culture.toLowerCase()];
      if (terms) {
        searchTerms.push(...terms);
      }
    });

    return searchTerms;
  }

  /**
   * Analyze cultural match for specialty markets
   */
  private analyzeCulturalMatch(
    place: PlaceResult,
    culturalFocus: string[]
  ): {
    score: number;
    cultures: string[];
    ingredients: string[];
    languages: string[];
    events: string[];
  } {
    const name = place.name.toLowerCase();
    const address = place.formatted_address.toLowerCase();
    
    let score = 0;
    const matchedCultures: string[] = [];
    const ingredients: string[] = [];
    const languages: string[] = [];
    const events: string[] = [];

    // Check for cultural keywords in name and address
    culturalFocus.forEach(culture => {
      const cultureLower = culture.toLowerCase();
      if (name.includes(cultureLower) || address.includes(cultureLower)) {
        score += 0.4;
        matchedCultures.push(culture);
        
        // Add typical ingredients and languages for this culture
        const culturalData = this.getCulturalData(culture);
        ingredients.push(...culturalData.ingredients);
        languages.push(...culturalData.languages);
        events.push(...culturalData.events);
      }
    });

    // Check for general global market indicators
    const globalMarketKeywords = ['international', 'world', 'global', 'imported'];
    if (globalMarketKeywords.some(keyword => name.includes(keyword))) {
      score += 0.2;
    }

    return {
      score: Math.min(1, score),
      cultures: matchedCultures,
      ingredients,
      languages,
      events,
    };
  }

  /**
   * Get cultural data for a specific culture
   */
  private getCulturalData(culture: string): {
    ingredients: string[];
    languages: string[];
    events: string[];
  } {
    const culturalData: Record<string, any> = {
      'asian': {
        ingredients: ['soy sauce', 'rice', 'noodles', 'tofu', 'sesame oil'],
        languages: ['Chinese', 'Japanese', 'Korean', 'Thai', 'Vietnamese'],
        events: ['Chinese New Year', 'Mid-Autumn Festival'],
      },
      'mexican': {
        ingredients: ['tortillas', 'beans', 'chili peppers', 'corn', 'avocado'],
        languages: ['Spanish'],
        events: ['Cinco de Mayo', 'Day of the Dead'],
      },
      'indian': {
        ingredients: ['spices', 'lentils', 'basmati rice', 'curry', 'naan'],
        languages: ['Hindi', 'Tamil', 'Gujarati', 'Punjabi'],
        events: ['Diwali', 'Holi'],
      },
      'middle_eastern': {
        ingredients: ['pita bread', 'hummus', 'olive oil', 'dates', 'lamb'],
        languages: ['Arabic', 'Persian', 'Turkish', 'Hebrew'],
        events: ['Ramadan', 'Eid'],
      },
    };

    return culturalData[culture.toLowerCase()] || {
      ingredients: [],
      languages: [],
      events: [],
    };
  }

  /**
   * Remove duplicate stores from array
   */
  private removeDuplicateStores(stores: GroceryStore[]): GroceryStore[] {
    const seen = new Set<string>();
    return stores.filter(store => {
      if (seen.has(store.id)) {
        return false;
      }
      seen.add(store.id);
      return true;
    });
  }

  /**
   * Remove duplicate specialty markets from array
   */
  private removeDuplicateMarkets(markets: SpecialtyMarket[]): SpecialtyMarket[] {
    const seen = new Set<string>();
    return markets.filter(market => {
      if (seen.has(market.id)) {
        return false;
      }
      seen.add(market.id);
      return true;
    });
  }

  /**
   * Validate and correct store address using Google Places
   */
  async validateStoreAddress(
    storeName: string,
    currentAddress: string,
    city: string = 'Atlanta, GA'
  ): Promise<{
    isValid: boolean;
    correctedAddress?: string;
    placeId?: string;
    phone?: string;
    website?: string;
    rating?: number;
    verification: 'verified' | 'corrected' | 'not_found';
  }> {
    // Create cache key from store name and city
    const cacheKey = `${storeName.toLowerCase()}:${city.toLowerCase()}`;
    
    // Check cache first
    const cached = validationCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log(`📦 Using cached validation for ${storeName} in ${city}`);
      return cached.result;
    }

    try {
      // First, try to find the exact store by name and location
      const searchQuery = `${storeName} ${city}`;
      
      const response = await this.makeRequest<{ results: PlaceResult[] }>('/textsearch/json', {
        query: searchQuery,
        type: 'grocery_or_supermarket'
      });

      let result;

      if (response.results && response.results.length > 0) {
        // Find the best match
        let bestMatch = response.results[0];
        let bestScore = this.calculateStoreNameMatch(storeName, bestMatch.name);

        // Check all results for better matches
        for (const r of response.results) {
          const score = this.calculateStoreNameMatch(storeName, r.name);
          if (score > bestScore) {
            bestMatch = r;
            bestScore = score;
          }
        }

        // Only accept matches with reasonable confidence
        if (bestScore > 0.6) {
          // Get additional details
          const details = await this.getPlaceDetails(bestMatch.place_id);
          
          // Check if the address matches or is close
          const addressMatch = this.compareAddresses(currentAddress, bestMatch.formatted_address);
          
          result = {
            isValid: addressMatch > 0.8,
            correctedAddress: bestMatch.formatted_address,
            placeId: bestMatch.place_id,
            phone: details?.formatted_phone_number,
            website: details?.website,
            rating: bestMatch.rating,
            verification: addressMatch > 0.8 ? 'verified' : 'corrected'
          };
        }
      }

      // If no good match found, try a more general search
      if (!result) {
        const fallbackQuery = `grocery store ${storeName.split(' ')[0]} ${city}`;
        const fallbackResponse = await this.makeRequest<{ results: PlaceResult[] }>('/textsearch/json', {
          query: fallbackQuery
        });

        if (fallbackResponse.results && fallbackResponse.results.length > 0) {
          const fallbackMatch = fallbackResponse.results[0];
          result = {
            isValid: false,
            correctedAddress: fallbackMatch.formatted_address,
            placeId: fallbackMatch.place_id,
            verification: 'corrected'
          };
        }
      }

      // Final fallback
      if (!result) {
        result = {
          isValid: false,
          verification: 'not_found'
        };
      }

      // Cache the result
      validationCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      console.error('Store address validation failed:', error);
      const errorResult = {
        isValid: false,
        verification: 'not_found'
      };
      
      // Even cache error results to avoid repeated failures
      validationCache.set(cacheKey, {
        result: errorResult,
        timestamp: Date.now()
      });
      
      return errorResult;
    }
  }

  /**
   * Batch validate multiple store addresses
   */
  async validateMultipleStores(
    stores: Array<{
      storeName: string;
      address: string;
      city?: string;
    }>
  ): Promise<Array<{
    storeName: string;
    originalAddress: string;
    isValid: boolean;
    correctedAddress?: string;
    placeId?: string;
    phone?: string;
    website?: string;
    rating?: number;
    verification: 'verified' | 'corrected' | 'not_found';
  }>> {
    const results = [];

    for (const store of stores) {
      try {
        const validation = await this.validateStoreAddress(
          store.storeName,
          store.address,
          store.city || 'Atlanta, GA'
        );

        results.push({
          storeName: store.storeName,
          originalAddress: store.address,
          ...validation
        });

        // Add small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`Failed to validate ${store.storeName}:`, error);
        results.push({
          storeName: store.storeName,
          originalAddress: store.address,
          isValid: false,
          verification: 'not_found' as const
        });
      }
    }

    return results;
  }

  /**
   * Get verified Milwaukee grocery stores
   */
  async getMilwaukeeStores(
    storeNames: string[]
  ): Promise<Array<{
    name: string;
    address: string;
    placeId: string;
    phone?: string;
    website?: string;
    rating?: number;
    location: { lat: number; lng: number };
  }>> {
    const verifiedStores = [];

    for (const storeName of storeNames) {
      try {
        const validation = await this.validateStoreAddress(storeName, '', 'Atlanta, GA');
        
        if (validation.verification !== 'not_found' && validation.correctedAddress) {
          // Get location details
          const details = validation.placeId 
            ? await this.getPlaceDetails(validation.placeId)
            : null;

          verifiedStores.push({
            name: storeName,
            address: validation.correctedAddress,
            placeId: validation.placeId || '',
            phone: validation.phone,
            website: validation.website,
            rating: validation.rating,
            location: details?.geometry?.location || { lat: 0, lng: 0 }
          });
        }

        // Rate limit protection
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`Failed to get details for ${storeName}:`, error);
      }
    }

    return verifiedStores;
  }

  /**
   * Calculate similarity score between two store names
   */
  private calculateStoreNameMatch(name1: string, name2: string): number {
    const normalize = (str: string) => str.toLowerCase().replace(/[^\w]/g, '');
    const n1 = normalize(name1);
    const n2 = normalize(name2);

    // Exact match
    if (n1 === n2) return 1.0;

    // Check if one contains the other
    if (n1.includes(n2) || n2.includes(n1)) return 0.9;

    // Check individual words
    const words1 = n1.split(' ').filter(w => w.length > 2);
    const words2 = n2.split(' ').filter(w => w.length > 2);
    
    let matchCount = 0;
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1.includes(word2) || word2.includes(word1)) {
          matchCount++;
          break;
        }
      }
    }

    return words1.length > 0 ? matchCount / words1.length : 0;
  }

  /**
   * Compare two addresses for similarity
   */
  private compareAddresses(address1: string, address2: string): number {
    const normalize = (addr: string) => 
      addr.toLowerCase()
          .replace(/\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|way|place|pl)\b/g, '')
          .replace(/[^\w\s]/g, '')
          .trim();

    const norm1 = normalize(address1);
    const norm2 = normalize(address2);

    if (norm1 === norm2) return 1.0;

    // Extract key components (numbers, street names)
    const nums1 = address1.match(/\d+/g) || [];
    const nums2 = address2.match(/\d+/g) || [];
    
    // Check if street numbers match
    const numberMatch = nums1.length > 0 && nums2.length > 0 && nums1[0] === nums2[0];
    
    // Check word overlap
    const words1 = norm1.split(' ').filter(w => w.length > 2);
    const words2 = norm2.split(' ').filter(w => w.length > 2);
    
    let wordMatches = 0;
    for (const word1 of words1) {
      if (words2.some(word2 => word1.includes(word2) || word2.includes(word1))) {
        wordMatches++;
      }
    }

    const wordScore = words1.length > 0 ? wordMatches / words1.length : 0;
    
    // Combine number and word matching
    return numberMatch ? Math.max(0.5, wordScore) : wordScore * 0.8;
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
 * Singleton instance of GooglePlacesService
 */
export const googlePlacesService = new GooglePlacesService();