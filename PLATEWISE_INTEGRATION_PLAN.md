# PlateWise Integration Plan
## Complete Meal Planning System with Kroger API & Streaming

### 🎯 **Integration Overview**

This plan integrates all the developed features into the main PlateWise application:
- **Real-time streaming recipe discovery**
- **Complete Kroger API pricing integration**
- **Interactive ingredient substitution**
- **Cultural authenticity preservation**
- **Budget optimization with real grocery prices**

---

## 📋 **Phase 1: Core Infrastructure Setup**

### **1.1 Database Schema Updates**
```sql
-- Add meal planning tables
CREATE TABLE meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name VARCHAR(255) NOT NULL,
  cultural_cuisines TEXT[],
  dietary_restrictions TEXT[],
  budget_limit DECIMAL(10,2),
  household_size INTEGER,
  zip_code VARCHAR(10),
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id UUID REFERENCES meal_plans(id),
  title VARCHAR(500) NOT NULL,
  description TEXT,
  cultural_origin TEXT[],
  cuisine VARCHAR(100),
  source_url TEXT,
  image_url TEXT,
  servings INTEGER DEFAULT 4,
  prep_time INTEGER DEFAULT 15,
  cook_time INTEGER DEFAULT 30,
  total_time INTEGER DEFAULT 45,
  difficulty VARCHAR(50) DEFAULT 'medium',
  instructions JSONB,
  has_pricing BOOLEAN DEFAULT FALSE,
  total_cost DECIMAL(10,2),
  cost_per_serving DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id),
  name VARCHAR(255) NOT NULL,
  amount VARCHAR(100),
  unit VARCHAR(50),
  original_name VARCHAR(255),
  is_substituted BOOLEAN DEFAULT FALSE,
  user_status VARCHAR(50) DEFAULT 'normal', -- 'normal', 'already-have', 'specialty-store'
  specialty_store VARCHAR(255),
  kroger_product_id VARCHAR(100),
  kroger_price DECIMAL(10,2),
  kroger_unit_price DECIMAL(10,2),
  kroger_confidence VARCHAR(20),
  kroger_store_location VARCHAR(255),
  on_sale BOOLEAN DEFAULT FALSE,
  sale_price DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  preferred_cuisines TEXT[],
  dietary_restrictions TEXT[],
  default_budget DECIMAL(10,2) DEFAULT 50.00,
  household_size INTEGER DEFAULT 4,
  zip_code VARCHAR(10),
  preferred_stores TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### **1.2 Environment Variables Setup**
```bash
# Add to .env.local (already configured)
KROGER_CLIENT_ID=your_kroger_client_id
KROGER_API_KEY=your_kroger_api_key
PERPLEXITY_API_KEY=your_perplexity_api_key
WEBSCRAPING_AI_API_KEY=your_webscraping_api_key
```

---

## 📋 **Phase 2: API Integration**

### **2.1 Core API Endpoints**
Move from `/api/debug/` to production endpoints:

```typescript
// Production API Structure
/api/meal-plans/
├── create/              // Create new meal plan
├── stream/              // Real-time recipe streaming
├── pricing/             // Add Kroger pricing to recipes
├── [id]/                // Get specific meal plan
├── [id]/update/         // Update meal plan
└── [id]/shopping-list/  // Generate shopping list

/api/ingredients/
├── search/              // Search Kroger for alternatives
├── substitute/          // Replace ingredient in recipe
└── pricing/             // Get single ingredient pricing

/api/user/
├── preferences/         // User meal planning preferences
└── meal-plans/          // User's meal plan history
```

### **2.2 API Endpoint Implementation**

#### **A. Main Meal Plan Creation** (`/api/meal-plans/create`)
```typescript
// Combines streaming + pricing + user preferences
export async function POST(request: NextRequest) {
  // 1. Validate user authentication
  // 2. Get user preferences from database
  // 3. Create meal plan record
  // 4. Stream recipe discovery
  // 5. Save recipes to database
  // 6. Return meal plan ID for frontend tracking
}
```

#### **B. Streaming Endpoint** (`/api/meal-plans/stream`)
```typescript
// Enhanced version of current streaming with database persistence
export async function POST(request: NextRequest) {
  // 1. Create meal plan record
  // 2. Stream recipe discovery (current implementation)
  // 3. Save each recipe to database as it's discovered
  // 4. Update meal plan status
  // 5. Send recipe IDs in stream for frontend tracking
}
```

#### **C. Pricing Integration** (`/api/meal-plans/pricing`)
```typescript
// Add Kroger pricing to existing meal plan
export async function POST(request: NextRequest) {
  // 1. Get meal plan and recipes from database
  // 2. Process Kroger pricing (current implementation)
  // 3. Update recipe_ingredients table with pricing
  // 4. Calculate meal plan totals
  // 5. Return updated pricing data
}
```

---

## 📋 **Phase 3: Frontend Integration**

### **3.1 Main App Structure**
```
src/app/
├── meal-plans/
│   ├── page.tsx                 // Meal plan dashboard
│   ├── create/
│   │   └── page.tsx            // New meal plan wizard
│   ├── [id]/
│   │   ├── page.tsx            // View meal plan
│   │   ├── edit/
│   │   │   └── page.tsx        // Edit meal plan
│   │   └── shopping-list/
│   │       └── page.tsx        // Shopping list view
│   └── history/
│       └── page.tsx            // Meal plan history

src/components/meal-plans/
├── MealPlanWizard.tsx          // Main creation flow
├── StreamingRecipeDiscovery.tsx // Real-time recipe streaming
├── RecipeCard.tsx              // Individual recipe display
├── IngredientManager.tsx       // Ingredient substitution
├── PricingManager.tsx          // Kroger pricing integration
├── ShoppingListGenerator.tsx   // Shopping list creation
└── BudgetAnalyzer.tsx          // Budget optimization
```

### **3.2 Core Components**

#### **A. Meal Plan Wizard** (`MealPlanWizard.tsx`)
```typescript
// Multi-step wizard combining all features
const steps = [
  'Preferences',    // Cultural cuisines, dietary restrictions, budget
  'Discovery',      // Streaming recipe discovery
  'Review',         // Review and customize recipes
  'Pricing',        // Add Kroger pricing
  'Optimize',       // Budget optimization and substitutions
  'Finalize'        // Save meal plan
];
```

#### **B. Streaming Recipe Discovery** (`StreamingRecipeDiscovery.tsx`)
```typescript
// Enhanced version of current StreamingMealPlanner
// - Integrates with user authentication
// - Saves recipes to database
// - Shows cultural authenticity scores
// - Allows real-time recipe filtering
```

#### **C. Ingredient Manager** (`IngredientManager.tsx`)
```typescript
// Enhanced version of current ingredient substitution
// - Kroger search integration
// - "Already have" / "Specialty store" tagging
// - Real-time price updates
// - Cultural authenticity warnings
```

---

## 📋 **Phase 4: User Experience Flow**

### **4.1 New User Onboarding**
```
1. Welcome & Cultural Preferences
   - Select preferred cuisines
   - Set dietary restrictions
   - Enter zip code for local pricing

2. Budget Setup
   - Set default budget range
   - Choose household size
   - Select preferred stores

3. First Meal Plan Creation
   - Guided tutorial through streaming discovery
   - Show Kroger pricing integration
   - Demonstrate ingredient substitution
```

### **4.2 Returning User Flow**
```
1. Dashboard
   - Recent meal plans
   - Budget summaries
   - Favorite recipes

2. Quick Actions
   - "Generate meal plan for this week"
   - "Find recipes under $X"
   - "Plan for [cultural event]"

3. Advanced Features
   - Recipe collections
   - Shopping list history
   - Budget analytics
```

---

## 📋 **Phase 5: Advanced Features**

### **5.1 User Profiles & Preferences**
```typescript
interface UserProfile {
  culturalBackground: string[];
  dietaryRestrictions: string[];
  budgetPreferences: {
    weeklyBudget: number;
    maxPerMeal: number;
    preferGeneric: boolean;
  };
  householdInfo: {
    size: number;
    ages: number[];
    allergies: string[];
  };
  locationInfo: {
    zipCode: string;
    preferredStores: string[];
  };
}
```

### **5.2 Recipe Collections & Favorites**
```sql
CREATE TABLE recipe_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE collection_recipes (
  collection_id UUID REFERENCES recipe_collections(id),
  recipe_id UUID REFERENCES recipes(id),
  added_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (collection_id, recipe_id)
);
```

### **5.3 Shopping List Integration**
```typescript
interface ShoppingList {
  id: string;
  mealPlanId: string;
  items: ShoppingItem[];
  totalCost: number;
  storeBreakdown: Map<string, ShoppingItem[]>;
  generatedAt: Date;
}

interface ShoppingItem {
  ingredient: string;
  quantity: string;
  estimatedCost: number;
  krogerProductId?: string;
  store: string;
  onSale: boolean;
  recipes: string[]; // Which recipes use this ingredient
}
```

---

## 📋 **Phase 6: Implementation Timeline**

### **Week 1: Infrastructure**
- [ ] Database schema setup
- [ ] User authentication integration
- [ ] API endpoint structure
- [ ] Basic frontend routing

### **Week 2: Core Features**
- [ ] Streaming recipe discovery integration
- [ ] Kroger pricing API integration
- [ ] Basic meal plan CRUD operations
- [ ] User preferences system

### **Week 3: Advanced Features**
- [ ] Ingredient substitution system
- [ ] Shopping list generation
- [ ] Budget optimization
- [ ] Cultural authenticity scoring

### **Week 4: Polish & Testing**
- [ ] UI/UX refinements
- [ ] Performance optimization
- [ ] Error handling improvements
- [ ] User testing and feedback

---

## 📋 **Phase 7: Production Deployment**

### **7.1 Performance Optimization**
```typescript
// Caching Strategy
- Recipe cache: 24 hours
- Kroger pricing cache: 2 hours
- User preferences cache: 1 hour
- Image cache: 7 days

// Database Optimization
- Index on user_id, cultural_cuisines, dietary_restrictions
- Pagination for meal plan history
- Lazy loading for recipe details
```

### **7.2 Monitoring & Analytics**
```typescript
// Key Metrics
- Recipe discovery success rate
- Kroger API response times
- User engagement with pricing features
- Cultural authenticity satisfaction
- Budget optimization effectiveness
```

### **7.3 Error Handling & Fallbacks**
```typescript
// Graceful Degradation
- Kroger API failure → Show estimated prices
- Recipe extraction failure → Show basic recipe info
- Streaming failure → Fall back to batch processing
- Image loading failure → Show cultural food emojis
```

---

## 🎯 **Success Metrics**

### **User Engagement**
- [ ] 80%+ users complete meal plan creation
- [ ] 60%+ users use Kroger pricing features
- [ ] 40%+ users substitute ingredients
- [ ] 70%+ users save meal plans

### **Technical Performance**
- [ ] <5 second time to first recipe
- [ ] <30 second complete meal plan generation
- [ ] 95%+ Kroger API success rate
- [ ] <2 second ingredient search response

### **Cultural Authenticity**
- [ ] 90%+ recipes match selected cultural cuisines
- [ ] Cultural authenticity scores >7/10
- [ ] Proper ingredient substitution warnings
- [ ] Specialty store recommendations

---

## 🚀 **Next Steps**

1. **Start with Phase 1** - Set up database schema and core infrastructure
2. **Implement streaming integration** - Move from test endpoints to production
3. **Add user authentication** - Integrate with existing Supabase auth
4. **Create main meal plan wizard** - Combine all features into cohesive flow
5. **Add Kroger pricing throughout** - Real grocery prices in all workflows
6. **Polish and optimize** - Performance, UX, and error handling

This plan transforms PlateWise from a concept into a production-ready, culturally-aware meal planning platform with real grocery pricing and streaming recipe discovery!