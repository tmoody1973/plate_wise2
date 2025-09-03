# Perplexity Cultural Pricing Integration Plan

## Overview
Enhance PlateWise's existing multi-tier pricing system with advanced Perplexity AI integration for culturally-aware grocery pricing that understands ethnic markets, traditional ingredients, and cultural shopping patterns.

## Phase 1: Enhanced Perplexity Service (Week 1-2)

### 1.1 Upgrade Perplexity Service with Cultural Intelligence

**File**: `src/lib/external-apis/perplexity-service.ts`

```typescript
// Enhanced cultural pricing prompt
private buildAdvancedCulturalPricingPrompt(
  ingredients: string[], 
  location: string, 
  culturalContext?: string
): string {
  return `Find current grocery prices for these ${culturalContext || ''} ingredients in ${location}:

${ingredients.map((ing, i) => `${i + 1}. ${ing}`).join('\n')}

CRITICAL REQUIREMENTS:
1. Search BOTH mainstream stores (Kroger, Walmart, Safeway) AND ethnic markets
2. For cultural ingredients, prioritize ethnic markets where they're fresher/cheaper
3. Include traditional names (e.g., "za'faran" for saffron, "masa harina" for corn flour)
4. Note seasonal availability and price variations
5. Identify bulk pricing for staples (rice, spices, etc.)
6. Rate cultural significance: essential/important/common/optional

${culturalContext ? `
CULTURAL CONTEXT: These ingredients are for ${culturalContext} cooking.
- Prioritize stores specializing in ${culturalContext} ingredients
- Include cultural shopping tips and seasonal recommendations
- Note authenticity levels (traditional/adapted/substitute)
- Suggest ethnic markets known for quality ${culturalContext} ingredients
` : ''}

FORMAT RESPONSE AS:
For each ingredient:
- Ingredient: [name] (traditional name if different)
- Best Price: $X.XX per [unit] at [store name]
- Store Type: mainstream/ethnic_market/specialty
- Cultural Significance: essential/important/common/optional
- Availability: in_stock/seasonal/call_ahead
- Bulk Options: [if available]
- Cultural Notes: [authenticity, sourcing tips]
- Alternative Stores: [2-3 other options with prices]

SUMMARY:
- Total estimated cost: $XX.XX
- Best ethnic markets found: [list]
- Seasonal considerations: [notes]
- Cultural shopping strategy: [recommendations]`;
}

// Enhanced response parsing
interface PerplexityCulturalPriceResult {
  ingredient: string;
  traditionalName?: string;
  bestPrice: {
    price: number;
    unit: string;
    store: string;
    storeType: 'mainstream' | 'ethnic_market' | 'specialty';
  };
  culturalSignificance: 'essential' | 'important' | 'common' | 'optional';
  availability: 'in_stock' | 'seasonal' | 'call_ahead' | 'unknown';
  bulkOptions?: {
    quantity: string;
    price: number;
    savings: number;
  };
  culturalNotes: string[];
  alternativeStores: Array<{
    store: string;
    price: number;
    storeType: string;
  }>;
  confidence: number;
}
```

### 1.2 Create Cultural Pricing Database Schema

**File**: `database-migrations/enhanced-cultural-pricing.sql`

```sql
-- Enhanced cultural pricing tables
CREATE TABLE IF NOT EXISTS perplexity_pricing_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key VARCHAR(500) NOT NULL UNIQUE,
  ingredients TEXT[] NOT NULL,
  location_zip VARCHAR(20) NOT NULL,
  cultural_context VARCHAR(100),
  raw_response TEXT NOT NULL,
  parsed_results JSONB NOT NULL,
  total_estimated_cost DECIMAL(10,2),
  ethnic_markets_found TEXT[],
  cultural_insights TEXT[],
  shopping_strategy TEXT,
  confidence_score DECIMAL(3,2) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Traditional ingredient names mapping
CREATE TABLE IF NOT EXISTS traditional_ingredient_names (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name VARCHAR(255) NOT NULL,
  traditional_names JSONB NOT NULL, -- {"persian": "za'faran", "arabic": "za'faran"}
  cultural_origins TEXT[] NOT NULL,
  cultural_significance VARCHAR(20) DEFAULT 'common',
  seasonal_notes TEXT,
  sourcing_tips TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ethnic market discovery and ratings
CREATE TABLE IF NOT EXISTS ethnic_markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  location_zip VARCHAR(20),
  cultural_specialties TEXT[] NOT NULL,
  store_type VARCHAR(50) NOT NULL,
  quality_rating DECIMAL(3,2) DEFAULT 3.0,
  authenticity_rating DECIMAL(3,2) DEFAULT 3.0,
  price_competitiveness DECIMAL(3,2) DEFAULT 0.0, -- % vs mainstream
  languages_spoken TEXT[],
  community_notes TEXT,
  discovered_via VARCHAR(50) DEFAULT 'perplexity',
  last_verified TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_perplexity_cache_key ON perplexity_pricing_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_perplexity_cache_location ON perplexity_pricing_cache(location_zip);
CREATE INDEX IF NOT EXISTS idx_perplexity_cache_expires ON perplexity_pricing_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_traditional_names_ingredient ON traditional_ingredient_names(ingredient_name);
CREATE INDEX IF NOT EXISTS idx_ethnic_markets_location ON ethnic_markets(location_zip);
CREATE INDEX IF NOT EXISTS idx_ethnic_markets_specialties ON ethnic_markets USING GIN(cultural_specialties);
```

## Phase 2: Advanced UI Components (Week 2-3)

### 2.1 Enhanced Perplexity Pricing Panel

**File**: `src/components/recipes/AdvancedPerplexityPricingPanel.tsx`

```typescript
interface AdvancedPerplexityPricingPanelProps {
  recipe: Recipe;
  userProfile: UserProfile;
  onEthnicMarketSelect?: (market: EthnicMarket) => void;
  onIngredientLearn?: (ingredient: string) => void;
}

export function AdvancedPerplexityPricingPanel({ 
  recipe, 
  userProfile, 
  onEthnicMarketSelect,
  onIngredientLearn 
}: AdvancedPerplexityPricingPanelProps) {
  // Component features:
  // 1. Real-time Perplexity pricing with cultural context
  // 2. Ethnic market discovery and recommendations
  // 3. Cultural ingredient education tooltips
  // 4. Traditional name recognition and display
  // 5. Seasonal availability indicators
  // 6. Bulk buying recommendations
  // 7. Cultural shopping strategy suggestions
  // 8. Authenticity ratings for ingredient sources
}
```

### 2.2 Cultural Shopping Strategy Component

**File**: `src/components/recipes/CulturalShoppingStrategy.tsx`

```typescript
interface CulturalShoppingStrategyProps {
  pricingResults: PerplexityCulturalPriceResult[];
  ethnicMarkets: EthnicMarket[];
  culturalContext: string;
  userLocation: string;
}

export function CulturalShoppingStrategy({
  pricingResults,
  ethnicMarkets,
  culturalContext,
  userLocation
}: CulturalShoppingStrategyProps) {
  // Features:
  // 1. Optimal shopping route planning
  // 2. Store-by-store shopping lists
  // 3. Cultural ingredient prioritization
  // 4. Seasonal timing recommendations
  // 5. Bulk buying opportunities
  // 6. Cost vs authenticity trade-offs
}
```

## Phase 3: Database Integration (Week 3-4)

### 3.1 Enhanced Cultural Pricing Database Service

**File**: `src/lib/database/enhanced-cultural-pricing-db.ts`

```typescript
class EnhancedCulturalPricingDatabase {
  /**
   * Cache Perplexity cultural pricing results
   */
  async cachePerplexityResults(
    ingredients: string[],
    location: string,
    culturalContext: string,
    rawResponse: string,
    parsedResults: PerplexityCulturalPriceResult[],
    culturalInsights: string[]
  ): Promise<boolean> {
    // Implementation for caching with confidence scoring
  }

  /**
   * Discover and store ethnic markets from Perplexity results
   */
  async discoverEthnicMarkets(
    pricingResults: PerplexityCulturalPriceResult[],
    location: string
  ): Promise<EthnicMarket[]> {
    // Extract ethnic market information from pricing results
    // Store new markets, update existing ones
    // Rate authenticity and quality based on community feedback
  }

  /**
   * Build traditional ingredient name mapping
   */
  async buildTraditionalNameMapping(
    ingredients: string[],
    culturalContext: string
  ): Promise<void> {
    // Use AI to identify traditional names
    // Store cultural significance ratings
    // Add sourcing tips and seasonal notes
  }
}
```

### 3.2 Cultural Pricing Cache Strategy

```typescript
interface CulturalPricingCacheStrategy {
  // Cache TTL based on ingredient type and cultural significance
  essential_ingredients: 4 * 60 * 60; // 4 hours for essential items
  seasonal_ingredients: 2 * 60 * 60; // 2 hours for seasonal items
  common_ingredients: 6 * 60 * 60; // 6 hours for common items
  
  // Confidence-based caching
  high_confidence: 8 * 60 * 60; // 8 hours for high confidence results
  medium_confidence: 4 * 60 * 60; // 4 hours for medium confidence
  low_confidence: 1 * 60 * 60; // 1 hour for low confidence
}
```

## Phase 4: Integration with Existing Systems (Week 4-5)

### 4.1 Enhanced Pricing Service Integration

**File**: `src/lib/external-apis/enhanced-pricing-service.ts`

```typescript
// Modify existing service to prioritize Perplexity for cultural ingredients
class EnhancedPricingService {
  async getIngredientPricing(request: PricingRequest): Promise<PricingResponse> {
    // 1. Identify cultural ingredients using AI
    const culturalIngredients = await this.identifyCulturalIngredients(
      request.ingredients, 
      request.culturalContext
    );

    // 2. Use Perplexity for cultural ingredients
    const perplexityResults = await this.perplexityService.getCulturalPricing({
      ingredients: culturalIngredients,
      location: request.location,
      culturalContext: request.culturalContext
    });

    // 3. Use Kroger/fallback for standard ingredients
    const standardIngredients = request.ingredients.filter(
      ing => !culturalIngredients.includes(ing)
    );
    const krogerResults = await this.krogerService.getPricing(standardIngredients);

    // 4. Combine results with confidence scoring
    return this.combineResults(perplexityResults, krogerResults);
  }
}
```

### 4.2 Recipe Cost Analysis Enhancement

**File**: `src/lib/recipes/enhanced-recipe-cost-analysis.ts`

```typescript
interface CulturalCostAnalysis {
  totalCost: number;
  culturalAuthenticityScore: number; // 1-10 scale
  ethnicMarketSavings: number;
  seasonalOptimization: string[];
  bulkBuyingOpportunities: BulkOpportunity[];
  culturalShoppingStrategy: ShoppingStrategy;
  ingredientAuthenticity: {
    [ingredient: string]: {
      authenticity: 'traditional' | 'adapted' | 'substitute';
      culturalImpact: 'minimal' | 'moderate' | 'significant';
      recommendedSource: string;
    };
  };
}
```

## Phase 5: Testing and Optimization (Week 5-6)

### 5.1 Cultural Pricing Test Suite

**File**: `src/components/debug/CulturalPricingTestSuite.tsx`

```typescript
export function CulturalPricingTestSuite() {
  const testScenarios = [
    {
      name: 'Persian Recipe Test',
      ingredients: ['saffron', 'basmati rice', 'sumac', 'pomegranate molasses'],
      culturalContext: 'persian',
      location: '90210'
    },
    {
      name: 'Mexican Recipe Test', 
      ingredients: ['masa harina', 'dried chiles guajillo', 'mexican crema'],
      culturalContext: 'mexican',
      location: '90210'
    },
    {
      name: 'Indian Recipe Test',
      ingredients: ['ghee', 'garam masala', 'paneer', 'curry leaves'],
      culturalContext: 'indian', 
      location: '90210'
    }
  ];

  // Test features:
  // 1. Perplexity API response validation
  // 2. Cultural context understanding
  // 3. Ethnic market discovery accuracy
  // 4. Traditional name recognition
  // 5. Pricing confidence scoring
  // 6. Cache performance testing
}
```

## Implementation Timeline

**Week 1-2**: Enhanced Perplexity Service
- Upgrade cultural pricing prompts
- Implement advanced response parsing
- Create cultural significance detection

**Week 2-3**: UI Components
- Build AdvancedPerplexityPricingPanel
- Create CulturalShoppingStrategy component
- Add ethnic market discovery interface

**Week 3-4**: Database Integration
- Implement enhanced cultural pricing database
- Build traditional name mapping system
- Create ethnic market discovery and storage

**Week 4-5**: System Integration
- Integrate with existing EnhancedPricingService
- Enhance recipe cost analysis
- Build cultural authenticity scoring

**Week 5-6**: Testing and Optimization
- Create comprehensive test suite
- Optimize cache performance
- Validate cultural accuracy with community feedback

## Success Metrics

1. **Cultural Accuracy**: 90%+ accuracy in identifying cultural ingredients and their significance
2. **Ethnic Market Discovery**: Find 3+ relevant ethnic markets per cultural context
3. **Cost Savings**: 15-25% average savings on cultural ingredients vs mainstream stores
4. **User Engagement**: 40%+ increase in recipe cost analysis usage
5. **Cultural Authenticity**: 8.5+ average authenticity score for traditional recipes

## Risk Mitigation

1. **API Rate Limits**: Implement intelligent caching and request batching
2. **Cultural Sensitivity**: Community review process for cultural content
3. **Data Quality**: Confidence scoring and fallback to existing systems
4. **Performance**: Async processing and progressive loading
5. **Cost Management**: Budget monitoring and usage optimization

This plan leverages your existing sophisticated architecture while adding powerful cultural intelligence that truly understands diverse food traditions and shopping patterns.
## Phase 
1 Implementation Complete! ✅

### What We Built:
1. **Enhanced Perplexity Service** with advanced cultural intelligence
2. **Cultural Ingredient Recognition** for 15+ key ingredients with traditional names
3. **Authenticity Scoring System** (1-10 scale) for cultural accuracy
4. **Advanced Fallback System** with cultural context
5. **Comprehensive Test Infrastructure** including debug components and API endpoints

### Key Features:
- **Smart Cultural Prompts**: Understands ethnic markets, traditional names, seasonal availability
- **Ingredient Intelligence**: Automatic classification (essential/important/common/optional)
- **Shopping Strategy**: Cost vs authenticity analysis with practical recommendations
- **Bulk Pricing Recognition**: Identifies bulk buying opportunities for cultural staples
- **Enhanced Database Schema**: Ready for Phase 2 implementation

### Ready for Testing:
- Use the enhanced `CulturalPricingTest.tsx` component to test the new functionality
- API endpoint: `/api/test/perplexity-cultural` for integration testing
- Test helper: `perplexity-test-helper.ts` for validation

**Phase 1 Complete - Ready for Phase 2 Database Integration!** 🎉