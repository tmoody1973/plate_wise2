# PlateWise Byterover Handbook

*A culturally-aware, AI-driven meal planning platform that helps families optimize food budgets while preserving culinary traditions*

---

## Layer 1: System Overview

### Purpose
PlateWise is a Next.js 15 web application that combines advanced cost analysis, cultural heritage preservation, nutritional optimization, and community features to create a holistic meal planning and grocery shopping experience. The platform uses Amazon Bedrock AI to generate personalized meal plans that respect cultural authenticity while staying within budget constraints.

### Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript 5.9
- **Styling**: Tailwind CSS 3.4, Framer Motion 12
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Authentication**: Supabase Auth with OAuth support
- **AI Services**: Amazon Bedrock (Claude 3.5 Sonnet), Perplexity AI, ElevenLabs
- **External APIs**: Google Places, Kroger, Spoonacular, Tavily
- **State Management**: Zustand 5.0, TanStack Query 5.85
- **Testing**: Jest 30, Testing Library
- **Caching**: Redis/IORedis for API response caching
- **Deployment**: Vercel with Node.js 18+

### Architecture Pattern
**App Router Architecture** with server-side rendering, API routes, and client-side hydration. The application follows a modular service-oriented architecture with:
- **Presentation Layer**: React components with cultural theming
- **Business Logic Layer**: Service classes for pricing, recipes, and cultural analysis
- **Data Access Layer**: Supabase client with type-safe queries
- **External Integration Layer**: Circuit-breaker protected API services
- **Caching Layer**: Redis for performance optimization

### Key Technical Decisions
- **Cultural Intelligence**: AI-powered cultural authenticity scoring and preservation
- **Multi-tier Pricing**: Perplexity AI → Kroger API → Basic estimates fallback system
- **Responsive Design**: Mobile-first with cultural theme switching
- **Performance**: Server components, image optimization, and intelligent caching
- **Accessibility**: WCAG 2.1 AA compliance with multi-language support

---

## Layer 2: Module Map

### Core Application Modules

#### `/src/app` - Next.js App Router
**Responsibility**: Route definitions, page components, API endpoints, and layout management
- **Pages**: Landing, authentication, profile setup, dashboard, meal planning
- **API Routes**: Recipe management, pricing services, AI integrations
- **Layouts**: Root layout with cultural theming and authentication context

#### `/src/components` - UI Component Library
**Responsibility**: Reusable React components with cultural theming support
- **Cultural Components**: Theme switcher, cultural recipe cards, authenticity indicators
- **Form Components**: Profile setup wizard, recipe input forms, search modals
- **Layout Components**: Headers, sidebars, navigation with responsive design
- **UI Primitives**: Buttons, cards, modals built on Radix UI

#### `/src/lib` - Business Logic Services
**Responsibility**: Core business logic, external API integrations, and utility functions
- **Pricing Services**: Multi-tier pricing with cultural intelligence
- **Recipe Services**: CRUD operations, scaling, recommendations
- **AI Services**: Bedrock integration, cultural analysis, meal planning
- **External APIs**: Google Places, Kroger, Perplexity, ElevenLabs integrations

### Data & State Management

#### `/src/types` - TypeScript Definitions
**Responsibility**: Type safety across the application with cultural metadata support
- **Core Types**: Recipe, UserProfile, CulturalPreferences, PricingResult
- **API Types**: External service response types and request interfaces
- **Database Types**: Supabase-generated types with cultural extensions

#### `/src/hooks` - Custom React Hooks
**Responsibility**: Stateful logic encapsulation and API interaction patterns
- **Authentication**: `useAuth`, `useProfileSetup` for user management
- **Pricing**: `useCulturalPricing`, `useEnhancedCulturalPricing` for cost analysis
- **Recipes**: `useRecipeSearch`, `usePerplexityRecipeSearch` for recipe discovery
- **Location**: `useUserLocation` for store discovery and personalization

#### `/src/contexts` - React Context Providers
**Responsibility**: Global state management for authentication and theming
- **AuthContext**: User authentication state and session management
- **ThemeContext**: Cultural theme switching and persistence

### Utility & Infrastructure

#### `/src/utils` - Helper Functions
**Responsibility**: Pure utility functions for data transformation and validation
- **Data Processing**: Ingredient normalization, price calculations
- **Validation**: Form validation, cultural authenticity scoring
- **Formatting**: Currency, measurements, cultural name formatting

#### `/src/styles` - Styling Configuration
**Responsibility**: Global styles, Tailwind configuration, and cultural themes
- **Cultural Themes**: 5 authentic cultural color palettes and patterns
- **Component Styles**: Consistent styling patterns across components

---

## Layer 3: Integration Guide

### API Endpoints

#### Recipe Management APIs
```typescript
// Recipe CRUD operations
GET    /api/recipes              // List recipes with cultural filtering
POST   /api/recipes              // Create new recipe with cultural metadata
GET    /api/recipes/[id]         // Get recipe details with cost analysis
PUT    /api/recipes/[id]         // Update recipe with authenticity validation
DELETE /api/recipes/[id]         // Delete recipe

// Recipe search and discovery
POST   /api/recipes/search       // Search recipes with cultural filters
POST   /api/recipes/web-search   // External recipe discovery via Perplexity
GET    /api/recipes/recommendations // Personalized recipe suggestions
```

#### Pricing Intelligence APIs
```typescript
// Multi-tier pricing system
POST   /api/pricing/analyze      // Analyze ingredient costs with cultural context
POST   /api/pricing/cultural     // Enhanced cultural pricing with ethnic markets
POST   /api/pricing/optimize     // Shopping optimization across multiple stores
GET    /api/pricing/health       // Service health monitoring and fallback status
```

#### AI Integration APIs
```typescript
// Amazon Bedrock integration
POST   /api/ai/meal-plan         // Generate culturally-aware meal plans
POST   /api/ai/recipe-analysis   // Analyze recipe authenticity and nutrition
POST   /api/ai/substitutions     // Get culturally-appropriate ingredient substitutions

// Voice integration
POST   /api/voice/synthesize     // Text-to-speech with cultural pronunciation
POST   /api/voice/commands       // Process voice commands for recipe interaction
```

### External Service Integrations

#### Primary AI Services
- **Amazon Bedrock**: Claude 3.5 Sonnet for meal planning and cultural analysis
- **Perplexity AI**: Real-time recipe search and cultural pricing intelligence
- **ElevenLabs**: Multilingual text-to-speech with cultural pronunciation

#### Grocery & Location Services
- **Google Places API**: Store discovery with cultural market identification
- **Kroger API**: Mainstream grocery pricing and coupon integration
- **Tavily API**: Cultural food research and authenticity validation

#### Database & Caching
- **Supabase**: PostgreSQL with Row Level Security for user data
- **Redis**: API response caching and session management

### Configuration Files

#### Environment Variables
```bash
# Authentication
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Services
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
PERPLEXITY_API_KEY=your_perplexity_key
ELEVENLABS_API_KEY=your_elevenlabs_key

# External APIs
GOOGLE_PLACES_API_KEY=your_google_places_key
KROGER_CLIENT_ID=your_kroger_client_id
KROGER_CLIENT_SECRET=your_kroger_client_secret
TAVILY_API_KEY=your_tavily_key

# Caching
REDIS_URL=your_redis_url
```

#### Key Configuration Files
- **`next.config.js`**: Next.js configuration with image optimization
- **`tailwind.config.js`**: Tailwind CSS with cultural theme extensions
- **`supabase-schema.sql`**: Database schema with cultural metadata support
- **`middleware.ts`**: Authentication and route protection middleware

---

## Layer 4: Extension Points

### Design Patterns

#### Service Layer Pattern
```typescript
// Example: Cultural Pricing Service
export class CulturalPricingService {
  private perplexityService: PerplexityService;
  private krogerService: KrogerService;
  private circuitBreaker: CircuitBreaker;
  
  async analyzePricing(ingredients: Ingredient[], context: CulturalContext): Promise<PricingResult> {
    // Multi-tier pricing with cultural intelligence
  }
}
```

#### Hook Pattern for State Management
```typescript
// Example: Cultural pricing hook
export function useCulturalPricing() {
  const [state, setState] = useState<PricingState>();
  
  const analyzePricing = useCallback(async (ingredients: Ingredient[]) => {
    // Encapsulated pricing logic with error handling
  }, []);
  
  return { state, analyzePricing };
}
```

#### Circuit Breaker Pattern for API Resilience
```typescript
// Example: API service with circuit breaker
export class ExternalAPIService {
  private circuitBreaker = new CircuitBreaker({
    threshold: 5,
    timeout: 60000
  });
  
  async callAPI<T>(operation: () => Promise<T>): Promise<T> {
    return this.circuitBreaker.execute(operation);
  }
}
```

### Customization Areas

#### Cultural Theme System
**Location**: `/src/lib/themes/`
**Purpose**: Add new cultural themes with authentic color palettes and patterns
```typescript
interface CulturalTheme {
  id: string;
  name: string;
  colors: ThemeColors;
  patterns: CulturalPatterns;
  typography: ThemeTypography;
}
```

#### AI Prompt Templates
**Location**: `/src/lib/ai/prompts/`
**Purpose**: Customize AI behavior for different cultural contexts
```typescript
interface CulturalPromptTemplate {
  cuisine: string;
  mealPlanningPrompt: string;
  authenticityAnalysisPrompt: string;
  substitutionPrompt: string;
}
```

#### Pricing Strategy Extensions
**Location**: `/src/lib/pricing/strategies/`
**Purpose**: Add new pricing sources or cultural market integrations
```typescript
interface PricingStrategy {
  name: string;
  priority: number;
  supports: (ingredient: Ingredient, context: CulturalContext) => boolean;
  getPricing: (ingredient: Ingredient, context: CulturalContext) => Promise<PricingResult>;
}
```

### Plugin Architecture

#### Recipe Source Plugins
**Location**: `/src/lib/recipes/sources/`
**Purpose**: Add new recipe discovery sources with cultural filtering
```typescript
interface RecipeSourcePlugin {
  name: string;
  search: (query: string, filters: CulturalFilters) => Promise<Recipe[]>;
  getDetails: (recipeId: string) => Promise<Recipe>;
  supportsCulture: (cuisine: string) => boolean;
}
```

#### Cultural Validation Plugins
**Location**: `/src/lib/cultural/validators/`
**Purpose**: Add cuisine-specific authenticity validation rules
```typescript
interface CulturalValidator {
  cuisine: string;
  validateIngredients: (ingredients: Ingredient[]) => AuthenticityScore;
  validateTechniques: (instructions: string[]) => AuthenticityScore;
  suggestImprovements: (recipe: Recipe) => CulturalSuggestion[];
}
```

### Recent Development Patterns

#### Enhanced Cultural Intelligence
- **Multi-tier AI Integration**: Primary Perplexity → Fallback Kroger → Basic estimates
- **Cultural Context Preservation**: Authenticity scoring with traditional name recognition
- **Community-Driven Validation**: User feedback integration for cultural accuracy

#### Performance Optimization Patterns
- **Intelligent Caching**: Redis-based caching with cultural context awareness
- **Circuit Breaker Implementation**: Automatic failover for external API reliability
- **Server Component Optimization**: Reduced client-side JavaScript with SSR

#### Accessibility & Internationalization
- **Multi-language Support**: ElevenLabs integration for pronunciation guides
- **Cultural Color Accessibility**: WCAG 2.1 AA compliance across all cultural themes
- **Right-to-Left Language Support**: Arabic and Hebrew language compatibility

---

*This handbook provides a comprehensive guide to PlateWise's architecture, enabling efficient development and cultural authenticity preservation.*