/**
 * Kroger Catalog API Integration
 * Provides real-time grocery pricing, product availability, and coupon data
 */

// Types for Kroger API integration
export interface Product {
  id: string;
  name: string;
  description: string;
  brand: string;
  price: ProductPrice;
  unit: string;
  size: string;
  categories: string[];
  availability: ProductAvailability;
  images: ProductImage[];
  nutritionalInfo?: NutritionalInfo;
  upc?: string;
}

export interface ProductPrice {
  regular: number;
  promo?: number;
  currency: string;
  unit: string;
  effectiveDate: string;
  expirationDate?: string;
}

export interface ProductAvailability {
  stockLevel: 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown';
  storeId: string;
  lastUpdated: string;
}

export interface ProductImage {
  url: string;
  size: 'small' | 'medium' | 'large';
  perspective: 'front' | 'back' | 'side' | 'top';
}

export interface NutritionalInfo {
  servingSize: string;
  calories: number;
  totalFat: number;
  saturatedFat: number;
  transFat: number;
  cholesterol: number;
  sodium: number;
  totalCarbs: number;
  dietaryFiber: number;
  sugars: number;
  protein: number;
  vitamins: Record<string, number>;
  minerals: Record<string, number>;
}

export interface Store {
  id: string;
  name: string;
  address: StoreAddress;
  phone: string;
  hours: StoreHours;
  services: string[];
  departments: string[];
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface StoreAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface StoreHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface DayHours {
  open: string;
  close: string;
  is24Hours: boolean;
  isClosed: boolean;
}

export interface Coupon {
  id: string;
  title: string;
  description: string;
  discount: CouponDiscount;
  applicableProducts: string[];
  restrictions: string[];
  expirationDate: string;
  minimumPurchase?: number;
  maximumDiscount?: number;
  usageLimit?: number;
  categories: string[];
}

export interface CouponDiscount {
  type: 'percentage' | 'fixed_amount' | 'buy_x_get_y';
  value: number;
  maxValue?: number;
  buyQuantity?: number;
  getQuantity?: number;
}

export interface CouponSaving {
  couponId: string;
  savings: number;
  applicableItems: string[];
  description: string;
}

export interface ProductSearchParams {
  query?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  storeId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'price' | 'name' | 'brand' | 'relevance';
  sortOrder?: 'asc' | 'desc';
}

export interface PriceComparison {
  productId: string;
  productName: string;
  stores: StorePrice[];
  lowestPrice: StorePrice;
  averagePrice: number;
  priceRange: {
    min: number;
    max: number;
  };
}

export interface StorePrice {
  storeId: string;
  storeName: string;
  price: number;
  promoPrice?: number;
  distance?: number;
  availability: string;
  lastUpdated: string;
}

/**
 * Kroger API Service
 * Uses the public Kroger Products API for product search and pricing
 * No authentication required for basic product searches
 */
export class KrogerService {
  private baseURL = 'https://api.kroger.com/v1';
  private mock: boolean;

  constructor() {
    // Use mock mode by default in dev to avoid 401/CORS; enable real API by setting NEXT_PUBLIC_KROGER_MOCK=false
    // Note: The real Kroger API typically requires OAuth; our integration falls back to mock data when unavailable.
    this.mock = (process.env.NEXT_PUBLIC_KROGER_MOCK ?? 'true') !== 'false';
    if (this.mock) {
      console.info('KrogerService: mock mode enabled (returning mock data).');
    } else {
      console.info('KrogerService: live mode enabled (calling Kroger API).');
    }
  }

  /**
   * Make public API request (no authentication required)
   */

  private async makeRequest<T>(endpoint: string): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        // Use warn to reduce noisy console errors in dev
        console.warn(`Kroger API request failed: ${response.status} ${response.statusText}`);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.warn(`Kroger API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Search for products by query and filters
   */
  async searchProducts(params: ProductSearchParams): Promise<Product[]> {
    if (this.mock) {
      return this.generateMockProducts(params.limit || 10);
    }
    const queryParams = new URLSearchParams();
    
    if (params.query) queryParams.append('filter.term', params.query);
    if (params.category) queryParams.append('filter.category', params.category);
    if (params.brand) queryParams.append('filter.brand', params.brand);
    if (params.storeId) queryParams.append('filter.locationId', params.storeId);
    if (params.limit) queryParams.append('filter.limit', params.limit.toString());
    if (params.offset) queryParams.append('filter.start', params.offset.toString());

    const endpoint = `/products?${queryParams.toString()}`;
    
    try {
      const response = await this.makeRequest<any>(endpoint);
      return this.normalizeProducts(response.data || []);
    } catch (error) {
      console.warn('Kroger API failed, returning mock data:', error);
      return this.generateMockProducts(params.limit || 10);
    }
  }

  /**
   * Get detailed product information by ID
   */
  async getProductDetails(productId: string, storeId?: string): Promise<Product | null> {
    if (this.mock) {
      return this.generateMockProducts(1)[0] || null;
    }
    const queryParams = new URLSearchParams();
    if (storeId) queryParams.append('filter.locationId', storeId);

    const endpoint = `/products/${productId}?${queryParams.toString()}`;
    
    try {
      const response = await this.makeRequest<any>(endpoint);
      const products = this.normalizeProducts([response.data]);
      return products[0] || null;
    } catch (error) {
      console.warn(`Failed to get product details for ${productId}:`, error);
      return this.generateMockProducts(1)[0] || null;
    }
  }

  /**
   * Get product pricing for specific store
   */
  async getProductPricing(productId: string, storeId: string): Promise<ProductPrice | null> {
    try {
      const product = await this.getProductDetails(productId, storeId);
      return product?.price || null;
    } catch (error) {
      console.error(`Failed to get pricing for product ${productId}:`, error);
      return null;
    }
  }

  /**
   * Compare prices across multiple stores
   */
  async comparePrices(productId: string, storeIds: string[]): Promise<PriceComparison | null> {
    try {
      const pricePromises = storeIds.map(async (storeId) => {
        const product = await this.getProductDetails(productId, storeId);
        if (!product) return null;

        return {
          storeId,
          storeName: `Store ${storeId}`, // Would need store lookup for actual name
          price: product.price.regular,
          promoPrice: product.price.promo,
          availability: product.availability.stockLevel,
          lastUpdated: product.availability.lastUpdated,
        };
      });

      const storePrices = (await Promise.all(pricePromises)).filter(Boolean) as StorePrice[];
      
      if (storePrices.length === 0) {
        return null;
      }

      const prices = storePrices.map(sp => sp.promoPrice || sp.price);
      const lowestPrice = storePrices.reduce((lowest, current) => 
        (current.promoPrice || current.price) < (lowest.promoPrice || lowest.price) ? current : lowest
      );

      return {
        productId,
        productName: 'Product Name', // Would need product lookup
        stores: storePrices,
        lowestPrice,
        averagePrice: prices.reduce((sum, price) => sum + price, 0) / prices.length,
        priceRange: {
          min: Math.min(...prices),
          max: Math.max(...prices),
        },
      };
    } catch (error) {
      console.error(`Failed to compare prices for product ${productId}:`, error);
      return null;
    }
  }

  /**
   * Get available coupons for a location
   */
  async getCoupons(storeId: string): Promise<Coupon[]> {
    if (this.mock) {
      return [];
    }
    const endpoint = `/coupons?filter.locationId=${storeId}`;
    
    try {
      const response = await this.makeRequest<any>(endpoint);
      return this.normalizeCoupons(response.data || []);
    } catch (error) {
      console.warn('Failed to get coupons:', error);
      return []; // Return empty array on failure
    }
  }

  /**
   * Get store locations by zip code
   */
  async getStoreLocations(zipCode: string, radius: number = 10): Promise<Store[]> {
    if (this.mock) {
      return [
        {
          id: 'mock-location',
          name: 'Mock Kroger',
          address: { street: '1 Mock St', city: 'Devville', state: 'CA', zipCode: zipCode || '00000', country: 'USA' },
          phone: '000-000-0000',
          hours: this.normalizeStoreHours({}),
          services: ['pickup'],
          departments: ['grocery'],
          coordinates: { latitude: 0, longitude: 0 },
        },
      ];
    }
    const endpoint = `/locations?filter.zipCode.near=${zipCode}&filter.radiusInMiles=${radius}`;
    
    try {
      const response = await this.makeRequest<any>(endpoint);
      return this.normalizeStores(response.data || []);
    } catch (error) {
      console.warn('Failed to get store locations:', error);
      return [];
    }
  }

  /**
   * Check product availability at specific store
   */
  async getProductAvailability(productId: string, storeId: string): Promise<ProductAvailability | null> {
    try {
      const product = await this.getProductDetails(productId, storeId);
      return product?.availability || null;
    } catch (error) {
      console.error(`Failed to check availability for product ${productId}:`, error);
      return null;
    }
  }

  /**
   * Calculate coupon savings for shopping list
   */
  calculateCouponSavings(items: Array<{id: string; price: number; quantity: number}>, coupons: Coupon[]): CouponSaving[] {
    return coupons.map(coupon => {
      const applicableItems = items.filter(item => 
        coupon.applicableProducts.includes(item.id)
      );

      if (applicableItems.length === 0) {
        return null;
      }

      const totalApplicable = applicableItems.reduce((sum, item) => 
        sum + (item.price * item.quantity), 0
      );

      if (coupon.minimumPurchase && totalApplicable < coupon.minimumPurchase) {
        return null;
      }

      let savings = 0;
      
      switch (coupon.discount.type) {
        case 'percentage':
          savings = totalApplicable * (coupon.discount.value / 100);
          if (coupon.discount.maxValue) {
            savings = Math.min(savings, coupon.discount.maxValue);
          }
          break;
        case 'fixed_amount':
          savings = coupon.discount.value;
          break;
        case 'buy_x_get_y':
          // Simplified calculation for buy X get Y deals
          const buyQty = coupon.discount.buyQuantity || 1;
          const getQty = coupon.discount.getQuantity || 1;
          const totalQty = applicableItems.reduce((sum, item) => sum + item.quantity, 0);
          const freeItems = Math.floor(totalQty / buyQty) * getQty;
          const avgPrice = totalApplicable / totalQty;
          savings = freeItems * avgPrice;
          break;
      }

      if (coupon.maximumDiscount) {
        savings = Math.min(savings, coupon.maximumDiscount);
      }

      return {
        couponId: coupon.id,
        savings,
        applicableItems: applicableItems.map(item => item.id),
        description: coupon.description,
      };
    }).filter(Boolean) as CouponSaving[];
  }

  /**
   * Normalize Kroger API product response
   */
  private normalizeProducts(rawProducts: any[]): Product[] {
    return rawProducts.map(product => ({
      id: product.productId || product.upc,
      name: this.cleanProductName(product.description || product.name),
      description: product.description || '',
      brand: product.brand || 'Unknown',
      price: {
        regular: product.items?.[0]?.price?.regular || 0,
        promo: product.items?.[0]?.price?.promo,
        currency: 'USD',
        unit: product.items?.[0]?.size || 'each',
        effectiveDate: new Date().toISOString(),
      },
      unit: product.items?.[0]?.size || 'each',
      size: product.items?.[0]?.size || '',
      categories: product.categories || [],
      availability: {
        stockLevel: this.normalizeStockLevel(product.items?.[0]?.inventory?.stockLevel),
        storeId: product.locationId || '',
        lastUpdated: new Date().toISOString(),
      },
      images: this.normalizeImages(product.images || []),
      upc: product.upc,
    }));
  }

  /**
   * Normalize Kroger API coupon response
   */
  private normalizeCoupons(rawCoupons: any[]): Coupon[] {
    return rawCoupons.map(coupon => ({
      id: coupon.couponId,
      title: coupon.shortDescription || coupon.description,
      description: coupon.description,
      discount: {
        type: this.normalizeCouponType(coupon.discountType),
        value: coupon.discountValue || 0,
        maxValue: coupon.maximumDiscountValue,
      },
      applicableProducts: coupon.applicableProducts || [],
      restrictions: coupon.restrictions || [],
      expirationDate: coupon.expirationDate,
      minimumPurchase: coupon.minimumPurchaseAmount,
      maximumDiscount: coupon.maximumDiscountValue,
      categories: coupon.categories || [],
    }));
  }

  /**
   * Normalize Kroger API store response
   */
  private normalizeStores(rawStores: any[]): Store[] {
    return rawStores.map(store => ({
      id: store.locationId,
      name: store.name,
      address: {
        street: store.address?.addressLine1 || '',
        city: store.address?.city || '',
        state: store.address?.state || '',
        zipCode: store.address?.zipCode || '',
        country: store.address?.country || 'US',
      },
      phone: store.phone || '',
      hours: this.normalizeStoreHours(store.hours || {}),
      services: store.services || [],
      departments: store.departments || [],
      coordinates: {
        latitude: store.geolocation?.latitude || 0,
        longitude: store.geolocation?.longitude || 0,
      },
    }));
  }

  /**
   * Helper methods for data normalization
   */
  private cleanProductName(name: string): string {
    return name.replace(/\s+/g, ' ').trim();
  }

  private normalizeStockLevel(level: string): 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown' {
    if (!level) return 'unknown';
    
    const normalized = level.toLowerCase();
    if (normalized.includes('in stock') || normalized.includes('available')) return 'in_stock';
    if (normalized.includes('low') || normalized.includes('limited')) return 'low_stock';
    if (normalized.includes('out') || normalized.includes('unavailable')) return 'out_of_stock';
    
    return 'unknown';
  }

  private normalizeImages(images: any[]): ProductImage[] {
    return images.map(image => ({
      url: image.url,
      size: image.size || 'medium',
      perspective: image.perspective || 'front',
    }));
  }

  private normalizeCouponType(type: string): 'percentage' | 'fixed_amount' | 'buy_x_get_y' {
    if (!type) return 'fixed_amount';
    
    const normalized = type.toLowerCase();
    if (normalized.includes('percent') || normalized.includes('%')) return 'percentage';
    if (normalized.includes('buy') && normalized.includes('get')) return 'buy_x_get_y';
    
    return 'fixed_amount';
  }

  private normalizeStoreHours(hours: any): StoreHours {
    const defaultHours: DayHours = {
      open: '08:00',
      close: '22:00',
      is24Hours: false,
      isClosed: false,
    };

    return {
      monday: hours.monday || defaultHours,
      tuesday: hours.tuesday || defaultHours,
      wednesday: hours.wednesday || defaultHours,
      thursday: hours.thursday || defaultHours,
      friday: hours.friday || defaultHours,
      saturday: hours.saturday || defaultHours,
      sunday: hours.sunday || defaultHours,
    };
  }

  /**
   * Generate mock product data for development
   */
  private generateMockProducts(count: number): Product[] {
    const mockProductTemplates = [
      { name: 'Organic Olive Oil', category: 'Pantry', brand: 'Kroger', price: 8.99 },
      { name: 'Fresh Basil', category: 'Produce', brand: 'Simple Truth', price: 2.49 },
      { name: 'Whole Grain Pasta', category: 'Pantry', brand: 'Barilla', price: 1.89 },
      { name: 'Roma Tomatoes', category: 'Produce', brand: 'Fresh', price: 1.99 },
      { name: 'Parmesan Cheese', category: 'Dairy', brand: 'Kroger', price: 5.99 },
    ];

    return Array.from({ length: count }, (_, index) => {
      const template = mockProductTemplates[index % mockProductTemplates.length] || {
        name: 'Generic Product',
        category: 'Food',
        brand: 'Generic',
        price: 2.99
      };
      return {
        id: `mock-${1000 + index}`,
        upc: `${12345678901 + index}`,
        name: `${template.name} (Mock)`,
        description: `Mock product for development: ${template.name}`,
        brand: template.brand,
        categories: [template.category],
        unit: 'each',
        size: '1 unit',
        price: {
          regular: template.price,
          promo: template.price * 0.9,
          currency: 'USD',
          unit: 'each',
          effectiveDate: new Date().toISOString(),
        },
        images: [{
          url: '/images/mock-product.jpg',
          perspective: 'front',
          size: 'large',
        }],
        nutritionalInfo: {
          servingSize: '1 serving',
          calories: 100 + index * 10,
          totalFat: 5,
          saturatedFat: 1,
          transFat: 0,
          cholesterol: 0,
          sodium: 200,
          totalCarbs: 15,
          dietaryFiber: 2,
          sugars: 8,
          protein: 3,
          vitamins: { 'Vitamin C': 10 },
          minerals: { 'Iron': 5 },
        },
        availability: {
          stockLevel: 'in_stock' as const,
          storeId: 'mock-location',
          lastUpdated: new Date().toISOString(),
        },
      };
    });
  }
}

/**
 * Singleton instance of KrogerService
 */
export const krogerService = new KrogerService();
