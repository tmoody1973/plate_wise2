/**
 * Fallback geocoding service that doesn't rely on external APIs
 * Uses a database of major US cities with coordinates
 */

interface CityData {
  city: string;
  state: string;
  zipCode: string;
  coordinates: { lat: number; lng: number };
  commonStores: string[];
}

// Database of major US cities with coordinates and common stores
const CITY_DATABASE: Record<string, CityData> = {
  // Major cities with coordinates from Google's geocoding (pre-fetched)
  'atlanta': {
    city: 'Atlanta',
    state: 'GA', 
    zipCode: '30309',
    coordinates: { lat: 33.7488, lng: -84.3877 },
    commonStores: ['Kroger', 'Publix', 'Whole Foods Market', 'Walmart Supercenter', 'Target', 'Aldi', 'Trader Joe\'s', 'H Mart', 'Sprouts Farmers Market']
  },
  'milwaukee': {
    city: 'Milwaukee',
    state: 'WI',
    zipCode: '53202', 
    coordinates: { lat: 43.0389, lng: -87.9065 },
    commonStores: ['Pick \'n Save', 'Metro Market', 'Woodman\'s Markets', 'Walmart Supercenter', 'Target', 'Aldi', 'Festival Foods', 'Fresh Thyme Market']
  },
  'chicago': {
    city: 'Chicago',
    state: 'IL',
    zipCode: '60601',
    coordinates: { lat: 41.8781, lng: -87.6298 },
    commonStores: ['Jewel-Osco', 'Mariano\'s', 'Whole Foods Market', 'Trader Joe\'s', 'Aldi', 'Pete\'s Fresh Market', 'Target', 'Walmart']
  },
  'new york': {
    city: 'New York',
    state: 'NY', 
    zipCode: '10001',
    coordinates: { lat: 40.7128, lng: -74.0060 },
    commonStores: ['Whole Foods Market', 'Trader Joe\'s', 'Key Food', 'C-Town Supermarkets', 'Fairway Market', 'Gristedes', 'H Mart', 'Morton Williams']
  },
  'los angeles': {
    city: 'Los Angeles',
    state: 'CA',
    zipCode: '90001', 
    coordinates: { lat: 34.0522, lng: -118.2437 },
    commonStores: ['Ralphs', 'Vons', 'Trader Joe\'s', 'Whole Foods Market', 'Sprouts Farmers Market', 'H Mart', 'Northgate Market', 'Smart & Final']
  },
  'houston': {
    city: 'Houston', 
    state: 'TX',
    zipCode: '77001',
    coordinates: { lat: 29.7604, lng: -95.3698 },
    commonStores: ['H-E-B', 'Kroger', 'Randalls', 'Whole Foods Market', 'Fiesta Mart', 'H Mart', 'Walmart Supercenter', 'Target']
  },
  'phoenix': {
    city: 'Phoenix',
    state: 'AZ', 
    zipCode: '85001',
    coordinates: { lat: 33.4484, lng: -112.0740 },
    commonStores: ['Fry\'s Food Stores', 'Safeway', 'Walmart Supercenter', 'Target', 'Whole Foods Market', 'Sprouts Farmers Market', 'Bashas\'']
  },
  'philadelphia': {
    city: 'Philadelphia',
    state: 'PA',
    zipCode: '19101', 
    coordinates: { lat: 39.9526, lng: -75.1652 },
    commonStores: ['ACME Markets', 'ShopRite', 'Whole Foods Market', 'Trader Joe\'s', 'Fresh Grocer', 'Giant Food Stores', 'Walmart']
  },
  'san antonio': {
    city: 'San Antonio',
    state: 'TX',
    zipCode: '78201',
    coordinates: { lat: 29.4241, lng: -98.4936 },
    commonStores: ['H-E-B', 'Walmart Supercenter', 'Target', 'Market Street', 'Whole Foods Market', 'Fiesta Mart']
  },
  'san diego': {
    city: 'San Diego', 
    state: 'CA',
    zipCode: '92101',
    coordinates: { lat: 32.7157, lng: -117.1611 },
    commonStores: ['Vons', 'Ralphs', 'Whole Foods Market', 'Trader Joe\'s', 'Sprouts Farmers Market', 'H Mart', 'Smart & Final']
  },
  'dallas': {
    city: 'Dallas',
    state: 'TX', 
    zipCode: '75201',
    coordinates: { lat: 32.7767, lng: -96.7970 },
    commonStores: ['Kroger', 'Tom Thumb', 'Walmart Supercenter', 'Target', 'Whole Foods Market', 'H-E-B', 'Market Street']
  },
  'san jose': {
    city: 'San Jose',
    state: 'CA',
    zipCode: '95101',
    coordinates: { lat: 37.3382, lng: -121.8863 },
    commonStores: ['Safeway', 'Lucky Supermarkets', 'Whole Foods Market', 'Trader Joe\'s', 'Target', 'Walmart', '99 Ranch Market']
  },
  'austin': {
    city: 'Austin',
    state: 'TX',
    zipCode: '78701', 
    coordinates: { lat: 30.2672, lng: -97.7431 },
    commonStores: ['H-E-B', 'Whole Foods Market', 'Trader Joe\'s', 'Randalls', 'Target', 'Walmart Supercenter', 'Central Market']
  },
  'jacksonville': {
    city: 'Jacksonville',
    state: 'FL',
    zipCode: '32099',
    coordinates: { lat: 30.3322, lng: -81.6557 },
    commonStores: ['Publix', 'Winn-Dixie', 'Walmart Supercenter', 'Target', 'Whole Foods Market', 'Fresh Market']
  },
  'fort worth': {
    city: 'Fort Worth',
    state: 'TX',
    zipCode: '76101',
    coordinates: { lat: 32.7555, lng: -97.3308 },
    commonStores: ['Kroger', 'Tom Thumb', 'Walmart Supercenter', 'Target', 'Whole Foods Market', 'Albertsons']
  },
  'columbus': {
    city: 'Columbus', 
    state: 'OH',
    zipCode: '43085',
    coordinates: { lat: 39.9612, lng: -82.9988 },
    commonStores: ['Kroger', 'Giant Eagle', 'Meijer', 'Walmart Supercenter', 'Target', 'Whole Foods Market', 'Aldi']
  },
  'san francisco': {
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    coordinates: { lat: 37.7749, lng: -122.4194 },
    commonStores: ['Safeway', 'Whole Foods Market', 'Trader Joe\'s', 'Rainbow Grocery', 'Mollie Stone\'s Market', 'Lucky Supermarkets']
  },
  'charlotte': {
    city: 'Charlotte',
    state: 'NC', 
    zipCode: '28202',
    coordinates: { lat: 35.2271, lng: -80.8431 },
    commonStores: ['Harris Teeter', 'Food Lion', 'Publix', 'Walmart Supercenter', 'Target', 'Whole Foods Market', 'Aldi']
  },
  'indianapolis': {
    city: 'Indianapolis',
    state: 'IN',
    zipCode: '46201',
    coordinates: { lat: 39.7684, lng: -86.1581 },
    commonStores: ['Kroger', 'Meijer', 'IGA', 'Walmart Supercenter', 'Target', 'Whole Foods Market', 'Fresh Thyme Market']
  },
  'seattle': {
    city: 'Seattle',
    state: 'WA',
    zipCode: '98101', 
    coordinates: { lat: 47.6062, lng: -122.3321 },
    commonStores: ['Safeway', 'QFC', 'Whole Foods Market', 'Trader Joe\'s', 'PCC Community Markets', 'Metropolitan Market', 'Uwajimaya']
  },
  'denver': {
    city: 'Denver',
    state: 'CO',
    zipCode: '80201',
    coordinates: { lat: 39.7392, lng: -104.9903 },
    commonStores: ['King Soopers', 'Safeway', 'Whole Foods Market', 'Sprouts Farmers Market', 'Target', 'Walmart Supercenter']
  },
  'washington': {
    city: 'Washington',
    state: 'DC',
    zipCode: '20001',
    coordinates: { lat: 38.9072, lng: -77.0369 },
    commonStores: ['Giant Food', 'Safeway', 'Whole Foods Market', 'Trader Joe\'s', 'Harris Teeter', 'Fresh Market']
  },
  'boston': {
    city: 'Boston',
    state: 'MA', 
    zipCode: '02101',
    coordinates: { lat: 42.3601, lng: -71.0589 },
    commonStores: ['Stop & Shop', 'Star Market', 'Whole Foods Market', 'Trader Joe\'s', 'Market Basket', 'Big Y Supermarkets']
  },
  'el paso': {
    city: 'El Paso',
    state: 'TX',
    zipCode: '79901', 
    coordinates: { lat: 31.7619, lng: -106.4850 },
    commonStores: ['H-E-B', 'Walmart Supercenter', 'Albertsons', 'Market Street', 'WinCo Foods']
  },
  'detroit': {
    city: 'Detroit',
    state: 'MI',
    zipCode: '48201',
    coordinates: { lat: 42.3314, lng: -83.0458 },
    commonStores: ['Meijer', 'Kroger', 'Walmart Supercenter', 'Target', 'Whole Foods Market', 'Holiday Market']
  },
  'nashville': {
    city: 'Nashville',
    state: 'TN',
    zipCode: '37201', 
    coordinates: { lat: 36.1627, lng: -86.7816 },
    commonStores: ['Kroger', 'Publix', 'Walmart Supercenter', 'Target', 'Whole Foods Market', 'Fresh Market']
  },
  'portland': {
    city: 'Portland',
    state: 'OR',
    zipCode: '97201',
    coordinates: { lat: 45.5152, lng: -122.6784 },
    commonStores: ['Fred Meyer', 'Safeway', 'Whole Foods Market', 'Trader Joe\'s', 'New Seasons Market', 'WinCo Foods']
  },
  'memphis': {
    city: 'Memphis', 
    state: 'TN',
    zipCode: '38103',
    coordinates: { lat: 35.1495, lng: -90.0490 },
    commonStores: ['Kroger', 'Walmart Supercenter', 'Target', 'Fresh Market', 'Schnucks']
  },
  'las vegas': {
    city: 'Las Vegas',
    state: 'NV',
    zipCode: '89101',
    coordinates: { lat: 36.1699, lng: -115.1398 },
    commonStores: ['Smith\'s Food and Drug', 'Albertsons', 'Walmart Supercenter', 'Target', 'Whole Foods Market', 'WinCo Foods']
  },
  'oklahoma city': {
    city: 'Oklahoma City', 
    state: 'OK',
    zipCode: '73102',
    coordinates: { lat: 35.4676, lng: -97.5164 },
    commonStores: ['Homeland', 'Walmart Supercenter', 'Target', 'Whole Foods Market', 'Sprouts Farmers Market']
  },
  'louisville': {
    city: 'Louisville',
    state: 'KY',
    zipCode: '40202',
    coordinates: { lat: 38.2527, lng: -85.7585 },
    commonStores: ['Kroger', 'IGA', 'Walmart Supercenter', 'Target', 'Whole Foods Market', 'Fresh Market']
  },
  'baltimore': {
    city: 'Baltimore',
    state: 'MD',
    zipCode: '21201', 
    coordinates: { lat: 39.2904, lng: -76.6122 },
    commonStores: ['Giant Food', 'Safeway', 'Harris Teeter', 'Whole Foods Market', 'ShopRite', 'Fresh Market']
  },
  'milwaukee': {
    city: 'Milwaukee',
    state: 'WI',
    zipCode: '53202',
    coordinates: { lat: 43.0389, lng: -87.9065 },
    commonStores: ['Pick \'n Save', 'Metro Market', 'Woodman\'s Markets', 'Walmart Supercenter', 'Target', 'Aldi', 'Festival Foods']
  },
  'albuquerque': {
    city: 'Albuquerque',
    state: 'NM',
    zipCode: '87101',
    coordinates: { lat: 35.0844, lng: -106.6504 },
    commonStores: ['Smith\'s Food and Drug', 'Albertsons', 'Walmart Supercenter', 'Target', 'Whole Foods Market', 'Market Street']
  },
  'tucson': {
    city: 'Tucson',
    state: 'AZ',
    zipCode: '85701',
    coordinates: { lat: 32.2226, lng: -110.9747 },
    commonStores: ['Fry\'s Food Stores', 'Safeway', 'Walmart Supercenter', 'Target', 'Whole Foods Market', 'Sprouts Farmers Market']
  },
  'fresno': {
    city: 'Fresno',
    state: 'CA',
    zipCode: '93701', 
    coordinates: { lat: 36.7378, lng: -119.7871 },
    commonStores: ['Save Mart', 'FoodMaxx', 'Walmart Supercenter', 'Target', 'Whole Foods Market', 'WinCo Foods']
  },
  'mesa': {
    city: 'Mesa',
    state: 'AZ',
    zipCode: '85201',
    coordinates: { lat: 33.4152, lng: -111.8315 },
    commonStores: ['Fry\'s Food Stores', 'Safeway', 'Walmart Supercenter', 'Target', 'Whole Foods Market', 'Sprouts Farmers Market']
  },
  'sacramento': {
    city: 'Sacramento', 
    state: 'CA',
    zipCode: '95814',
    coordinates: { lat: 38.5816, lng: -121.4944 },
    commonStores: ['Safeway', 'Save Mart', 'Walmart Supercenter', 'Target', 'Whole Foods Market', 'WinCo Foods']
  },
  'kansas city': {
    city: 'Kansas City',
    state: 'MO',
    zipCode: '64108',
    coordinates: { lat: 39.0997, lng: -94.5786 },
    commonStores: ['Hy-Vee', 'Price Chopper', 'Walmart Supercenter', 'Target', 'Whole Foods Market', 'Hen House']
  },
  'atlanta': {
    city: 'Atlanta',
    state: 'GA',
    zipCode: '30309',
    coordinates: { lat: 33.7488, lng: -84.3877 },
    commonStores: ['Kroger', 'Publix', 'Whole Foods Market', 'Walmart Supercenter', 'Target', 'Aldi', 'Trader Joe\'s', 'H Mart']
  },
  'long beach': {
    city: 'Long Beach',
    state: 'CA', 
    zipCode: '90802',
    coordinates: { lat: 33.7701, lng: -118.1937 },
    commonStores: ['Ralphs', 'Vons', 'Trader Joe\'s', 'Whole Foods Market', 'Walmart Supercenter', 'Target']
  },
  'colorado springs': {
    city: 'Colorado Springs',
    state: 'CO',
    zipCode: '80903',
    coordinates: { lat: 38.8339, lng: -104.8214 },
    commonStores: ['King Soopers', 'Safeway', 'Walmart Supercenter', 'Target', 'Whole Foods Market', 'Sprouts Farmers Market']
  },
  'raleigh': {
    city: 'Raleigh',
    state: 'NC',
    zipCode: '27601', 
    coordinates: { lat: 35.7796, lng: -78.6382 },
    commonStores: ['Harris Teeter', 'Food Lion', 'Kroger', 'Walmart Supercenter', 'Target', 'Whole Foods Market']
  },
  'omaha': {
    city: 'Omaha',
    state: 'NE',
    zipCode: '68102',
    coordinates: { lat: 41.2565, lng: -95.9345 },
    commonStores: ['Hy-Vee', 'Baker\'s', 'Walmart Supercenter', 'Target', 'Whole Foods Market', 'No Frills Supermarkets']
  },
  'miami': {
    city: 'Miami', 
    state: 'FL',
    zipCode: '33101',
    coordinates: { lat: 25.7617, lng: -80.1918 },
    commonStores: ['Publix', 'Winn-Dixie', 'Whole Foods Market', 'Trader Joe\'s', 'Sedano\'s', 'Fresco y Más']
  },
  'oakland': {
    city: 'Oakland',
    state: 'CA',
    zipCode: '94612',
    coordinates: { lat: 37.8044, lng: -122.2712 },
    commonStores: ['Safeway', 'Lucky Supermarkets', 'Whole Foods Market', 'Trader Joe\'s', 'Berkeley Bowl', 'Ranch 99']
  },
  'tulsa': {
    city: 'Tulsa',
    state: 'OK', 
    zipCode: '74103',
    coordinates: { lat: 36.1540, lng: -95.9928 },
    commonStores: ['Reasor\'s', 'Walmart Supercenter', 'Target', 'Whole Foods Market', 'Sprouts Farmers Market']
  },
  'minneapolis': {
    city: 'Minneapolis',
    state: 'MN',
    zipCode: '55401',
    coordinates: { lat: 44.9778, lng: -93.2650 },
    commonStores: ['Cub Foods', 'Lunds & Byerlys', 'Target', 'Whole Foods Market', 'Trader Joe\'s', 'Aldi']
  },
  'cleveland': {
    city: 'Cleveland',
    state: 'OH',
    zipCode: '44113', 
    coordinates: { lat: 41.4993, lng: -81.6944 },
    commonStores: ['Giant Eagle', 'IGA', 'Walmart Supercenter', 'Target', 'Whole Foods Market', 'Aldi']
  },
  'wichita': {
    city: 'Wichita',
    state: 'KS',
    zipCode: '67202',
    coordinates: { lat: 37.6872, lng: -97.3301 },
    commonStores: ['Dillons', 'Walmart Supercenter', 'Target', 'Whole Foods Market', 'Aldi']
  },
  'arlington': {
    city: 'Arlington', 
    state: 'TX',
    zipCode: '76010',
    coordinates: { lat: 32.7357, lng: -97.1081 },
    commonStores: ['Kroger', 'Tom Thumb', 'Walmart Supercenter', 'Target', 'Whole Foods Market', 'Albertsons']
  }
};

export class FallbackGeocodingService {
  /**
   * Look up city data from our local database
   */
  getCityData(locationString: string): CityData | null {
    // Normalize the location string
    const normalized = this.normalizeLocationString(locationString);
    
    // Try exact match first
    if (CITY_DATABASE[normalized]) {
      return CITY_DATABASE[normalized];
    }
    
    // Try partial matches
    const cityName = locationString.split(',')[0].trim().toLowerCase();
    for (const [key, data] of Object.entries(CITY_DATABASE)) {
      if (key.includes(cityName) || data.city.toLowerCase().includes(cityName)) {
        return data;
      }
    }
    
    return null;
  }

  /**
   * Get coordinates for a location
   */
  getCoordinates(locationString: string): { lat: number; lng: number } | null {
    const cityData = this.getCityData(locationString);
    return cityData?.coordinates || null;
  }

  /**
   * Get zip code for a location
   */
  getZipCode(locationString: string): string | null {
    const cityData = this.getCityData(locationString);
    return cityData?.zipCode || null;
  }

  /**
   * Get common stores for a location
   */
  getCommonStores(locationString: string): string[] {
    const cityData = this.getCityData(locationString);
    return cityData?.commonStores || [];
  }

  /**
   * Get all available cities
   */
  getAvailableCities(): string[] {
    return Object.keys(CITY_DATABASE).map(key => {
      const data = CITY_DATABASE[key];
      return `${data.city}, ${data.state}`;
    });
  }

  /**
   * Normalize location string for lookup
   */
  private normalizeLocationString(locationString: string): string {
    return locationString
      .toLowerCase()
      .trim()
      .replace(/,?\s*(usa?|united states).*$/i, '') // Remove country
      .replace(/,\s*$/, '') // Remove trailing comma
      .split(',')[0] // Take just the city part
      .trim();
  }

  /**
   * Find closest city by name similarity
   */
  findClosestCity(locationString: string): CityData | null {
    const normalized = this.normalizeLocationString(locationString);
    let bestMatch: CityData | null = null;
    let bestScore = 0;

    for (const data of Object.values(CITY_DATABASE)) {
      const score = this.calculateSimilarity(normalized, data.city.toLowerCase());
      if (score > bestScore && score > 0.6) { // Only accept good matches
        bestScore = score;
        bestMatch = data;
      }
    }

    return bestMatch;
  }

  /**
   * Calculate string similarity (0-1)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

export const fallbackGeocodingService = new FallbackGeocodingService();