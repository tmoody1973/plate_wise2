/**
 * Geocoding Service using Google Geocoding API
 * Converts addresses to coordinates and extracts location information
 */

export interface GeocodeResult {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  formattedAddress: string;
  placeId?: string;
}

export interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export interface GoogleGeocodeResponse {
  results: Array<{
    formatted_address: string;
    address_components: AddressComponent[];
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
      location_type: string;
      viewport: {
        northeast: { lat: number; lng: number };
        southwest: { lat: number; lng: number };
      };
    };
    place_id: string;
    types: string[];
  }>;
  status: string;
}

export class GeocodingService {
  private baseURL = 'https://maps.googleapis.com/maps/api/geocode/json';
  private apiKey: string;
  private cache = new Map<string, GeocodeResult>();
  private requestCount = 0;
  private dailyLimit = 2500; // Google's daily geocoding limit

  constructor() {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY || '';
    
    if (!this.apiKey) {
      throw new Error('Google Places API key required for geocoding');
    }
  }

  /**
   * Geocode an address to get coordinates and location details
   */
  async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    const cacheKey = address.toLowerCase().trim();
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Check rate limits
    if (this.requestCount >= this.dailyLimit) {
      console.warn('Geocoding daily limit reached');
      return null;
    }

    try {
      const url = new URL(this.baseURL);
      url.searchParams.append('address', address);
      url.searchParams.append('key', this.apiKey);

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }

      const data: GoogleGeocodeResponse = await response.json();
      this.requestCount++;

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        console.warn(`Geocoding failed for "${address}": ${data.status}`);
        return null;
      }

      const result = this.parseGeocodeResult(data.results[0]);
      
      // Cache the result
      this.cache.set(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  /**
   * Reverse geocode coordinates to get address information
   */
  async reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
    const cacheKey = `${lat},${lng}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    if (this.requestCount >= this.dailyLimit) {
      console.warn('Geocoding daily limit reached');
      return null;
    }

    try {
      const url = new URL(this.baseURL);
      url.searchParams.append('latlng', `${lat},${lng}`);
      url.searchParams.append('key', this.apiKey);

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`Reverse geocoding API error: ${response.status}`);
      }

      const data: GoogleGeocodeResponse = await response.json();
      this.requestCount++;

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        console.warn(`Reverse geocoding failed for ${lat},${lng}: ${data.status}`);
        return null;
      }

      const result = this.parseGeocodeResult(data.results[0]);
      
      // Cache the result
      this.cache.set(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Get coordinates for a city name
   */
  async getCityCoordinates(cityName: string): Promise<{ lat: number; lng: number; zipCode: string } | null> {
    const result = await this.geocodeAddress(cityName);
    if (!result) return null;

    return {
      lat: result.coordinates.lat,
      lng: result.coordinates.lng,
      zipCode: result.zipCode
    };
  }

  /**
   * Get zip code for a city name
   */
  async getZipCodeForCity(cityName: string): Promise<string | null> {
    const result = await this.geocodeAddress(cityName);
    return result?.zipCode || null;
  }

  /**
   * Validate and standardize an address
   */
  async validateAddress(address: string): Promise<{
    isValid: boolean;
    standardizedAddress?: string;
    components?: GeocodeResult;
    confidence: 'high' | 'medium' | 'low';
  }> {
    const result = await this.geocodeAddress(address);
    
    if (!result) {
      return { isValid: false, confidence: 'low' };
    }

    // Determine confidence based on how specific the result is
    let confidence: 'high' | 'medium' | 'low' = 'low';
    
    if (result.zipCode && result.city && result.state) {
      confidence = 'high';
    } else if (result.city && result.state) {
      confidence = 'medium';
    }

    return {
      isValid: true,
      standardizedAddress: result.formattedAddress,
      components: result,
      confidence
    };
  }

  /**
   * Get multiple addresses in batch
   */
  async batchGeocode(addresses: string[]): Promise<Array<GeocodeResult | null>> {
    const results: Array<GeocodeResult | null> = [];
    
    for (const address of addresses) {
      const result = await this.geocodeAddress(address);
      results.push(result);
      
      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return results;
  }

  /**
   * Parse geocoding API result into our format
   */
  private parseGeocodeResult(result: GoogleGeocodeResponse['results'][0]): GeocodeResult {
    const components = result.address_components;
    
    const getComponent = (types: string[]): string => {
      for (const component of components) {
        if (types.some(type => component.types.includes(type))) {
          return component.long_name;
        }
      }
      return '';
    };

    const getShortComponent = (types: string[]): string => {
      for (const component of components) {
        if (types.some(type => component.types.includes(type))) {
          return component.short_name;
        }
      }
      return '';
    };

    // Extract components
    const streetNumber = getComponent(['street_number']);
    const streetName = getComponent(['route']);
    const city = getComponent(['locality', 'sublocality', 'administrative_area_level_2']);
    const state = getShortComponent(['administrative_area_level_1']);
    const zipCode = getComponent(['postal_code']);
    const country = getShortComponent(['country']);

    // Build address
    const addressParts = [streetNumber, streetName].filter(Boolean);
    const address = addressParts.join(' ');

    return {
      address: address || result.formatted_address,
      city: city || '',
      state: state || '',
      zipCode: zipCode || '',
      country: country || 'US',
      coordinates: {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng
      },
      formattedAddress: result.formatted_address,
      placeId: result.place_id
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): { requestCount: number; dailyLimit: number; remaining: number; cacheSize: number } {
    return {
      requestCount: this.requestCount,
      dailyLimit: this.dailyLimit,
      remaining: this.dailyLimit - this.requestCount,
      cacheSize: this.cache.size
    };
  }
}

export const geocodingService = new GeocodingService();