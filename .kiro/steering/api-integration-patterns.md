# API Integration Patterns for PlateWise

## General API Integration Standards

### Error Handling Pattern
```typescript
interface APIResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  cached?: boolean;
  timestamp: Date;
}

class APIService {
  async callWithRetry<T>(
    apiCall: () => Promise<T>,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<APIResponse<T>> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const data = await apiCall();
        return { data, timestamp: new Date() };
      } catch (error) {
        if (attempt === maxRetries || !this.isRetryable(error)) {
          return {
            error: {
              code: error.code || 'API_ERROR',
              message: error.message || 'API call failed',
              retryable: this.isRetryable(error)
            },
            timestamp: new Date()
          };
        }
        await this.delay(backoffMs * Math.pow(2, attempt - 1));
      }
    }
  }
}
```

### Caching Strategy
```typescript
interface CacheConfig {
  ttl: number; // Time to live in seconds
  staleWhileRevalidate: boolean;
  tags: string[]; // For cache invalidation
}

const CACHE_CONFIGS = {
  RECIPE_SEARCH: { ttl: 3600, staleWhileRevalidate: true, tags: ['recipes'] },
  STORE_PRICES: { ttl: 1800, staleWhileRevalidate: true, tags: ['prices'] },
  USER_PROFILE: { ttl: 3600, staleWhileRevalidate: false, tags: ['user'] },
  NUTRITION_DATA: { ttl: 86400, staleWhileRevalidate: true, tags: ['nutrition'] }
};
```

## Amazon Bedrock Integration

### Prompt Templates
```typescript
const MEAL_PLAN_PROMPT = `
You are a culturally-aware meal planning assistant. Generate a meal plan with the following constraints:

Cultural Preferences: {culturalCuisines}
Dietary Restrictions: {dietaryRestrictions}
Budget Limit: ${budgetLimit} for {householdSize} people
Time Frame: {timeFrame}
Nutritional Goals: {nutritionalGoals}

Requirements:
1. Respect cultural authenticity while staying within budget
2. Provide cost estimates for each meal
3. Include traditional cooking methods when possible
4. Suggest seasonal ingredients to reduce costs
5. Balance nutrition across the meal plan

Format the response as JSON with meal details, ingredients, and cultural context.
`;

const RECIPE_SUBSTITUTION_PROMPT = `
Suggest culturally appropriate ingredient substitutions for: {ingredient}
Original Recipe Culture: {culturalOrigin}
Reason for Substitution: {reason}
Budget Constraint: {budgetLimit}

Requirements:
1. Maintain cultural authenticity as much as possible
2. Explain the impact on flavor and tradition
3. Provide cost comparison
4. Include preparation method adjustments if needed
5. Suggest where to source authentic alternatives
`;
```

### Bedrock Service Implementation
```typescript
class BedrockService {
  private client: BedrockRuntimeClient;
  
  async generateMealPlan(params: MealPlanRequest): Promise<MealPlan> {
    const prompt = this.buildPrompt(MEAL_PLAN_PROMPT, params);
    
    const response = await this.callWithRetry(() =>
      this.client.send(new InvokeModelCommand({
        modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }]
        })
      }))
    );
    
    return this.parseMealPlanResponse(response.data);
  }
}
```

## Kroger Catalog API Integration

### Product Search and Pricing
```typescript
class KrogerService {
  private baseURL = 'https://api.kroger.com/v1';
  
  async searchProducts(query: string, location: string): Promise<Product[]> {
    const cacheKey = `kroger:search:${query}:${location}`;
    const cached = await this.cache.get(cacheKey);
    
    if (cached) return cached;
    
    const response = await this.callWithRetry(() =>
      fetch(`${this.baseURL}/products?filter.term=${encodeURIComponent(query)}&filter.locationId=${location}`, {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      })
    );
    
    const products = this.normalizeProducts(response.data.data);
    await this.cache.set(cacheKey, products, CACHE_CONFIGS.STORE_PRICES.ttl);
    
    return products;
  }
  
  private normalizeProducts(rawProducts: any[]): Product[] {
    return rawProducts.map(product => ({
      id: product.productId,
      name: this.cleanProductName(product.description),
      price: product.items?.[0]?.price?.regular || 0,
      unit: product.items?.[0]?.size || 'each',
      brand: product.brand,
      categories: product.categories || [],
      availability: product.items?.[0]?.inventory?.stockLevel || 'unknown'
    }));
  }
}
```

### Coupon Integration
```typescript
interface Coupon {
  id: string;
  title: string;
  description: string;
  discount: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  applicableProducts: string[];
  expirationDate: Date;
  minimumPurchase?: number;
}

class CouponService {
  async getAvailableCoupons(location: string): Promise<Coupon[]> {
    const response = await this.krogerService.callWithRetry(() =>
      fetch(`${this.baseURL}/coupons?filter.locationId=${location}`)
    );
    
    return response.data.data.map(this.normalizeCoupon);
  }
  
  calculateSavings(items: ShoppingItem[], coupons: Coupon[]): CouponSaving[] {
    return coupons.map(coupon => {
      const applicableItems = items.filter(item => 
        coupon.applicableProducts.includes(item.productId)
      );
      
      const totalApplicable = applicableItems.reduce((sum, item) => 
        sum + (item.price * item.quantity), 0
      );
      
      if (totalApplicable < (coupon.minimumPurchase || 0)) {
        return null;
      }
      
      const savings = coupon.discount.type === 'percentage'
        ? totalApplicable * (coupon.discount.value / 100)
        : coupon.discount.value;
        
      return {
        couponId: coupon.id,
        savings,
        applicableItems: applicableItems.map(item => item.id)
      };
    }).filter(Boolean);
  }
}
```

## Spoonacular API Integration

### Recipe Search with Cultural Filtering
```typescript
class SpoonacularService {
  async searchRecipes(params: RecipeSearchParams): Promise<Recipe[]> {
    const queryParams = new URLSearchParams({
      query: params.query || '',
      cuisine: params.culturalCuisines?.join(',') || '',
      diet: params.dietaryRestrictions?.join(',') || '',
      maxReadyTime: params.maxCookTime?.toString() || '',
      number: '50',
      addRecipeInformation: 'true',
      fillIngredients: 'true'
    });
    
    const response = await this.callWithRetry(() =>
      fetch(`${this.baseURL}/recipes/complexSearch?${queryParams}`, {
        headers: { 'X-RapidAPI-Key': this.apiKey }
      })
    );
    
    return response.data.results.map(this.normalizeRecipe);
  }
  
  private normalizeRecipe(spoonacularRecipe: any): Recipe {
    return {
      id: spoonacularRecipe.id.toString(),
      title: spoonacularRecipe.title,
      description: spoonacularRecipe.summary?.replace(/<[^>]*>/g, '') || '',
      culturalOrigin: [spoonacularRecipe.cuisines?.[0] || 'international'],
      cuisine: spoonacularRecipe.cuisines?.[0] || 'international',
      ingredients: this.normalizeIngredients(spoonacularRecipe.extendedIngredients),
      instructions: this.normalizeInstructions(spoonacularRecipe.analyzedInstructions),
      metadata: {
        servings: spoonacularRecipe.servings,
        prepTime: spoonacularRecipe.preparationMinutes || 0,
        cookTime: spoonacularRecipe.cookingMinutes || 0,
        totalTime: spoonacularRecipe.readyInMinutes || 0,
        difficulty: this.calculateDifficulty(spoonacularRecipe),
        culturalAuthenticity: this.assessAuthenticity(spoonacularRecipe)
      },
      source: 'spoonacular',
      tags: [...(spoonacularRecipe.dishTypes || []), ...(spoonacularRecipe.cuisines || [])],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}
```

## ElevenLabs Voice Integration

### Text-to-Speech Service
```typescript
class VoiceService {
  private elevenLabsAPI = 'https://api.elevenlabs.io/v1';
  
  async synthesizeSpeech(
    text: string, 
    language: string = 'en',
    voiceId?: string
  ): Promise<AudioBuffer> {
    const selectedVoice = voiceId || this.getVoiceForLanguage(language);
    
    const response = await this.callWithRetry(() =>
      fetch(`${this.elevenLabsAPI}/text-to-speech/${selectedVoice}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: JSON.stringify({
          text: this.preprocessText(text, language),
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            style: 0.0,
            use_speaker_boost: true
          }
        })
      })
    );
    
    return await response.arrayBuffer();
  }
  
  private getVoiceForLanguage(language: string): string {
    const voiceMap = {
      'en': 'pNInz6obpgDQGcFmaJgB', // Adam
      'es': 'VR6AewLTigWG4xSOukaG', // Arnold
      'fr': 'rNtGKTTMq6GQlzROqNyQ', // Bella
      'de': 'yoZ06aMxZJJ28mfd3POQ', // Sam
      'it': 'AZnzlk1XvdvUeBnXmlld', // Domi
      'pt': 'pqHfZKP75CvOlQylNhV4', // Bill
      'zh': 'XrExE9yKIg1WjnnlVkGX', // Matilda
      'ja': 'bVMeCyTHy58xNoL34h3p', // Jeremy
      'ko': 'LcfcDJNUP1GQjkzn1xUU', // Liam
      'ar': 'TxGEqnHWrfWFTfGW9XjX'  // Dorothy
    };
    
    return voiceMap[language] || voiceMap['en'];
  }
}
```

## Google Places API Integration

### Store Discovery Service
```typescript
class PlacesService {
  private baseURL = 'https://maps.googleapis.com/maps/api/place';
  
  async findGroceryStores(location: string, radius: number = 5000): Promise<Store[]> {
    const response = await this.callWithRetry(() =>
      fetch(`${this.baseURL}/nearbysearch/json?` + new URLSearchParams({
        location,
        radius: radius.toString(),
        type: 'grocery_or_supermarket',
        key: this.apiKey
      }))
    );
    
    const stores = response.data.results.map(this.normalizeStore);
    
    // Enrich with specialty store data
    const specialtyStores = await this.findSpecialtyStores(location, radius);
    
    return [...stores, ...specialtyStores];
  }
  
  private async findSpecialtyStores(location: string, radius: number): Promise<Store[]> {
    const specialtyTypes = [
      'halal+grocery',
      'kosher+market',
      'asian+grocery',
      'mexican+market',
      'middle+eastern+market',
      'african+grocery'
    ];
    
    const allStores = await Promise.all(
      specialtyTypes.map(type => this.searchByKeyword(location, type, radius))
    );
    
    return allStores.flat();
  }
}
```

## Rate Limiting and Circuit Breaker

### Implementation Pattern
```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}
```

This comprehensive API integration guide ensures consistent, reliable, and culturally-sensitive integration with all external services in PlateWise.