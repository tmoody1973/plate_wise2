# Interactive Meal Planner Integration Requirements

## Introduction

This specification outlines the integration of the proven Interactive Meal Planner (currently at `/test-interactive-planner`) into the main PlateWise meal planning interface. The working test demonstrates a superior user experience with fast recipe generation, user-controlled pricing, and real-time ingredient substitution capabilities.

## Requirements

### Requirement 1: Replace Current Meal Planner Interface with Full API Compatibility

**User Story:** As a PlateWise user, I want the main meal planning page to use the proven Interactive Meal Planner interface with all the same functionality, so that I get fast, reliable meal planning with better control over pricing and ingredients.

#### Acceptance Criteria

1. WHEN I visit `/meal-plans` THEN I SHALL see the Interactive Meal Planner interface instead of the current MealPlannerInterface
2. WHEN I access the meal planner THEN the system SHALL maintain authentication requirements and dashboard layout
3. WHEN the interface loads THEN I SHALL see the same 3-step process: Configure → Recipes → Pricing
4. WHEN I use the meal planner THEN ALL APIs SHALL work exactly as they do in `/test-interactive-planner`
5. WHEN I generate recipes THEN the system SHALL use `/api/meal-plans/recipes-only` exactly as in the test
6. WHEN I add pricing THEN the system SHALL use `/api/meal-plans/add-pricing` exactly as in the test
7. WHEN I search ingredients THEN the system SHALL use `/api/ingredients/search` exactly as in the test
8. WHEN I generate recipes THEN the system SHALL complete in 5-10 seconds without pricing delays
9. WHEN I interact with any feature THEN it SHALL behave identically to the test implementation

### Requirement 2: Preserve Authentication and Layout Integration

**User Story:** As a PlateWise user, I want the new meal planner to work seamlessly within the existing app structure, so that I don't lose access to navigation, profile, and other features.

#### Acceptance Criteria

1. WHEN I access `/meal-plans` THEN the system SHALL require authentication via ProtectedRoute
2. WHEN the meal planner loads THEN it SHALL be wrapped in the DashboardLayout component
3. WHEN I use the meal planner THEN I SHALL have access to the standard navigation and user menu
4. WHEN I navigate away and return THEN my meal planning progress SHALL be preserved
5. WHEN I log out and back in THEN my saved preferences SHALL be restored

### Requirement 3: Enhanced Configuration with User Profile Integration

**User Story:** As a PlateWise user, I want my dietary preferences and household information to be remembered and pre-populated from my profile, with the ability to override them for specific meal plans, so that I have both convenience and flexibility.

#### Acceptance Criteria

1. WHEN I first visit the meal planner THEN the system SHALL pre-populate cultural cuisines from my user profile
2. WHEN I first visit the meal planner THEN the system SHALL pre-populate dietary restrictions from my profile
3. WHEN I first visit the meal planner THEN the system SHALL pre-populate household size from my profile
4. WHEN I want to try different cuisines THEN I SHALL be able to override my profile preferences for this meal plan
5. WHEN I want to accommodate guests THEN I SHALL be able to temporarily change dietary restrictions
6. WHEN I override preferences THEN I SHALL see a clear indication that I'm using custom settings
7. WHEN I like my overrides THEN I SHALL have an option to "Save to Profile" to update my defaults
8. WHEN I return to the meal planner THEN it SHALL remember my last session preferences with option to reset to profile defaults

### Requirement 4: Improved Recipe Generation with Cultural Authenticity

**User Story:** As a PlateWise user, I want recipe generation to respect cultural authenticity while providing fast results, so that I get meaningful meal suggestions that align with my cultural preferences.

#### Acceptance Criteria

1. WHEN I select cultural cuisines THEN the system SHALL generate authentic recipes from those traditions
2. WHEN recipes are generated THEN each SHALL include cultural origin and authenticity indicators
3. WHEN I choose multiple cuisines THEN the system SHALL balance recipes across all selected cultures
4. WHEN recipes load THEN they SHALL include proper cultural context and cooking methods
5. WHEN I generate recipes THEN the system SHALL complete within 10 seconds maximum
6. WHEN no recipes are found THEN the system SHALL provide helpful suggestions for alternative cuisines

### Requirement 5: Recipe Swapping and Replacement

**User Story:** As a PlateWise user, I want to swap out recipes in my meal plan with alternatives from my saved recipes or by searching for new ones, so that I can customize my meal plan to my exact preferences.

#### Acceptance Criteria

1. WHEN I view a recipe in my meal plan THEN I SHALL see a "Swap Recipe" button
2. WHEN I click "Swap Recipe" THEN I SHALL see options to browse "My Saved Recipes" or "Search New Recipes"
3. WHEN I choose "My Saved Recipes" THEN I SHALL see my personal recipe collection filtered by similar cuisine/type
4. WHEN I choose "Search New Recipes" THEN I SHALL be able to search using Perplexity API with cultural and dietary filters
5. WHEN I search for new recipes THEN I SHALL see results that match my meal plan preferences
6. WHEN I select a replacement recipe THEN it SHALL automatically replace the original in my meal plan
7. WHEN I swap a recipe THEN the meal plan cost SHALL recalculate automatically
8. WHEN I swap a recipe THEN the shopping list SHALL update with new ingredients
9. WHEN I swap recipes THEN I SHALL see a confirmation with cost and ingredient changes

### Requirement 6: Advanced Recipe Search and Discovery

**User Story:** As a PlateWise user searching for recipe replacements, I want powerful search capabilities that respect my cultural preferences and dietary needs, so that I can find the perfect recipes for my meal plan.

#### Acceptance Criteria

1. WHEN I search for replacement recipes THEN I SHALL be able to filter by cuisine type, cooking time, and difficulty
2. WHEN I search recipes THEN the system SHALL use my cultural preferences as default filters
3. WHEN I search recipes THEN I SHALL be able to override filters for this specific search
4. WHEN I see search results THEN each recipe SHALL show estimated cost, time, and cultural authenticity score
5. WHEN I preview a recipe THEN I SHALL see ingredients, instructions, and nutritional information
6. WHEN I find a recipe I like THEN I SHALL be able to save it to my collection before or after adding to meal plan
7. WHEN I search recipes THEN I SHALL see both traditional and modern variations
8. WHEN I use recipe search THEN it SHALL integrate with the same Perplexity API as the main recipe generation

### Requirement 7: Advanced Ingredient Management with Store Integration

**User Story:** As a PlateWise user, I want to easily manage ingredients with real store pricing and substitution options, so that I can optimize my shopping and stay within budget.

#### Acceptance Criteria

1. WHEN I view recipe ingredients THEN I SHALL see options to mark items as "already have" or "specialty store"
2. WHEN I mark an ingredient as "already have" THEN it SHALL be excluded from cost calculations
3. WHEN I mark an ingredient for "specialty store" THEN I SHALL be able to specify the store name
4. WHEN I search for ingredient alternatives THEN I SHALL see real Kroger pricing and product details
5. WHEN I substitute an ingredient THEN the recipe cost SHALL update automatically
6. WHEN I find alternatives THEN I SHALL see sale prices and savings opportunities
7. WHEN I make substitutions THEN the system SHALL maintain recipe authenticity warnings
8. WHEN I swap recipes THEN ingredient substitutions SHALL be preserved where applicable

### Requirement 8: Recipe Scaling and Quantity Management

**User Story:** As a PlateWise user, I want to adjust recipe serving sizes and match ingredient quantities to available package sizes, so that I can minimize waste and optimize my shopping.

#### Acceptance Criteria

1. WHEN I view a recipe THEN I SHALL see controls to scale servings up or down
2. WHEN I change serving size THEN all ingredient quantities SHALL automatically adjust proportionally
3. WHEN I scale a recipe THEN the total cost SHALL recalculate automatically
4. WHEN I see ingredient quantities THEN I SHALL be able to adjust them to match store package sizes
5. WHEN I adjust ingredient quantities THEN I SHALL see the impact on cost per serving
6. WHEN I buy larger quantities THEN I SHALL see the leftover amount for future use
7. WHEN I scale recipes THEN cooking times and instructions SHALL provide appropriate guidance
8. WHEN I have leftovers from quantity adjustments THEN the system SHALL suggest ways to use them

### Requirement 9: Smart Quantity Matching and Package Optimization

**User Story:** As a PlateWise user shopping for ingredients, I want the system to help me match recipe quantities to actual store packages, so that I can make informed decisions about package sizes and minimize waste.

#### Acceptance Criteria

1. WHEN I view ingredient pricing THEN I SHALL see the actual package size from the store
2. WHEN recipe calls for partial packages THEN I SHALL see options to buy full packages with leftover amounts
3. WHEN I select larger packages THEN I SHALL see cost per unit comparisons
4. WHEN I have leftover ingredients THEN the system SHALL suggest other recipes that use them
5. WHEN I buy in bulk THEN I SHALL see the total cost impact and savings per unit
6. WHEN packages are much larger than needed THEN I SHALL see warnings about potential waste
7. WHEN I adjust quantities THEN I SHALL see updated shopping list with correct amounts
8. WHEN I compare package sizes THEN I SHALL see clear cost-per-unit breakdowns

### Requirement 10: Real-time Pricing with Cost Optimization

**User Story:** As a PlateWise user, I want transparent, real-time pricing that helps me make cost-effective decisions, so that I can stay within my budget while getting quality ingredients.

#### Acceptance Criteria

1. WHEN I add pricing to recipes THEN I SHALL see per-serving and total costs clearly displayed
2. WHEN ingredients are on sale THEN the system SHALL highlight these opportunities prominently
3. WHEN I mark ingredients as "already have" THEN I SHALL see the savings amount
4. WHEN I use specialty stores THEN the system SHALL track these costs separately
5. WHEN costs are calculated THEN I SHALL see breakdowns by regular, sale, and specialty store prices
6. WHEN pricing is unavailable THEN the system SHALL clearly indicate this without breaking the interface
7. WHEN I make changes THEN all pricing SHALL update in real-time
8. WHEN I adjust quantities THEN pricing SHALL reflect the actual amounts I plan to buy

### Requirement 11: Enhanced User Experience with Progress Tracking and UI Components

**User Story:** As a PlateWise user, I want clear progress indicators and familiar UI components like expandable recipe cards, so that I understand where I am in the process and can interact with recipes in the same way as the current interface.

#### Acceptance Criteria

1. WHEN I use the meal planner THEN I SHALL see a clear 3-step progress indicator
2. WHEN I complete a step THEN the progress indicator SHALL update to show completion
3. WHEN I want to modify earlier choices THEN I SHALL be able to navigate back to previous steps
4. WHEN I'm in the pricing step THEN I SHALL still be able to modify recipe configurations
5. WHEN I make changes THEN the system SHALL preserve my work and update accordingly
6. WHEN I encounter errors THEN I SHALL see helpful messages with suggested actions
7. WHEN I view recipes THEN they SHALL be displayed using the existing shadcn expandable card component
8. WHEN I expand a recipe card THEN I SHALL see detailed ingredients, instructions, and pricing information
9. WHEN I collapse a recipe card THEN I SHALL see a compact summary view
10. WHEN I interact with recipe cards THEN the behavior SHALL match the current meal planner interface

### Requirement 12: Senior-Friendly Accessibility and Usability

**User Story:** As a senior citizen using PlateWise, I want the meal planner to be easy to read, understand, and navigate, so that I can confidently plan meals without frustration or confusion.

#### Acceptance Criteria

1. WHEN I view the interface THEN all text SHALL be at least 16px font size with high contrast
2. WHEN I interact with buttons THEN they SHALL be at least 44px tall for easy clicking
3. WHEN I read instructions THEN they SHALL be written in clear, simple language
4. WHEN I see icons THEN they SHALL be accompanied by descriptive text labels
5. WHEN I navigate between steps THEN the process SHALL be clearly explained with helpful tips
6. WHEN I encounter errors THEN the messages SHALL be friendly and provide clear solutions
7. WHEN I use the interface THEN there SHALL be consistent spacing and visual hierarchy
8. WHEN I need help THEN there SHALL be easily accessible help text and tooltips

### Requirement 13: Universal Accessibility Compliance

**User Story:** As a PlateWise user with accessibility needs, I want the meal planner to work with screen readers and other assistive technologies, so that I can use all features regardless of my abilities.

#### Acceptance Criteria

1. WHEN I use a screen reader THEN all content SHALL be properly announced with ARIA labels
2. WHEN I navigate with keyboard only THEN all interactive elements SHALL be reachable and usable
3. WHEN I have low vision THEN I SHALL be able to zoom to 200% without losing functionality
4. WHEN I have color blindness THEN information SHALL not rely solely on color to convey meaning
5. WHEN I use voice control THEN buttons and links SHALL have clear, speakable names
6. WHEN I have motor difficulties THEN I SHALL have sufficient time to complete actions
7. WHEN I make mistakes THEN I SHALL be able to easily undo or correct them
8. WHEN I need focus indicators THEN they SHALL be clearly visible and high contrast

### Requirement 14: Mobile-Responsive Design

**User Story:** As a PlateWise user onymobile devices, I want the meal planner to work seamlessly on my phone or tablet, so that I can plan meals while shopping or away from my computer.

#### Acceptance Criteria

1. WHEN I access the meal planner on mobile THEN all features SHALL be fully functional
2. WHEN I view recipes on mobile THEN the layout SHALL adapt appropriately
3. WHEN I search for ingredients on mobile THEN the modal SHALL be touch-friendly
4. WHEN I interact with buttons on mobile THEN they SHALL be appropriately sized for touch (minimum 44px)
5. WHEN I scroll through recipes on mobile THEN the interface SHALL remain responsive
6. WHEN I switch between portrait and landscape THEN the layout SHALL adapt smoothly
7. WHEN I use mobile THEN text SHALL remain readable without horizontal scrolling

### Requirement 15: Data Persistence and Session Management

**User Story:** As a PlateWise user, I want my meal planning work to be saved automatically, so that I don't lose progress if I navigate away or encounter technical issues.

#### Acceptance Criteria

1. WHEN I make configuration changes THEN they SHALL be saved automatically
2. WHEN I generate recipes THEN they SHALL be cached for the session
3. WHEN I add pricing THEN the results SHALL be preserved
4. WHEN I make ingredient substitutions THEN they SHALL be saved
5. WHEN I refresh the page THEN my current progress SHALL be restored
6. WHEN I navigate away and return THEN my meal plan SHALL still be available
7. WHEN I close and reopen the browser THEN my preferences SHALL be remembered

### Requirement 16: Save Meal Plans and Recipes to Collections

**User Story:** As a PlateWise user, I want to save my completed meal plans and individual recipes to my recipe collection, so that I can easily access them later and reuse successful meal plans.

#### Acceptance Criteria

1. WHEN I complete a meal plan THEN I SHALL see a "Save Meal Plan" button to save the entire plan
2. WHEN I save a meal plan THEN it SHALL be stored in my meal plan history with all customizations
3. WHEN I view individual recipes THEN I SHALL see a "Save Recipe" button for each recipe
4. WHEN I save a recipe THEN it SHALL be added to my recipe collection with all my substitutions
5. WHEN I save a recipe THEN it SHALL preserve my ingredient modifications and pricing information
6. WHEN I access my recipe collection THEN I SHALL see both original and customized versions
7. WHEN I save a meal plan THEN I SHALL be able to name it and add notes
8. WHEN I view saved meal plans THEN I SHALL be able to regenerate them with updated pricing

### Requirement 17: Smart Shopping List Generation

**User Story:** As a PlateWise user who has completed meal planning, I want to automatically generate an optimized shopping list that appears on my shopping page, so that I can efficiently shop for all my planned meals.

#### Acceptance Criteria

1. WHEN I complete a meal plan THEN I SHALL see a prominent "Generate Shopping List" button
2. WHEN I generate a shopping list THEN it SHALL consolidate all ingredients across all recipes
3. WHEN ingredients appear in multiple recipes THEN quantities SHALL be automatically combined
4. WHEN I generate a shopping list THEN it SHALL exclude items I marked as "already have"
5. WHEN I create a shopping list THEN it SHALL group items by store section (produce, dairy, etc.)
6. WHEN I generate a shopping list THEN it SHALL include current pricing and total estimated cost
7. WHEN I create a shopping list THEN it SHALL appear immediately on my `/shopping` page
8. WHEN I view the shopping list THEN I SHALL see which recipes each ingredient is for

### Requirement 18: Advanced Shopping List Optimization

**User Story:** As a PlateWise user with a generated shopping list, I want it to be organized and optimized for efficient shopping, so that I can complete my grocery shopping quickly and stay within budget.

#### Acceptance Criteria

1. WHEN I view my shopping list THEN items SHALL be organized by store layout (produce first, frozen last, etc.)
2. WHEN I have specialty store items THEN they SHALL be grouped separately with store names
3. WHEN I see package quantities THEN they SHALL reflect the actual amounts I need to buy
4. WHEN items are on sale THEN they SHALL be highlighted with sale prices and savings
5. WHEN I have multiple store options THEN I SHALL see cost comparisons
6. WHEN I check off items THEN the total cost SHALL update in real-time
7. WHEN I complete shopping THEN I SHALL be able to mark the entire list as completed
8. WHEN I need to modify quantities THEN I SHALL be able to edit them directly in the shopping list

### Requirement 19: Instacart API Integration for Online Shopping

**User Story:** As a PlateWise user who prefers online grocery shopping, I want to send my shopping list directly to Instacart for delivery or pickup, so that I can get my meal plan ingredients without visiting the store.

#### Acceptance Criteria

1. WHEN I complete a shopping list THEN I SHALL see an "Order with Instacart" button
2. WHEN I click "Order with Instacart" THEN my shopping list SHALL be automatically transferred to Instacart
3. WHEN I transfer to Instacart THEN ingredient quantities SHALL match my meal plan requirements
4. WHEN I use Instacart integration THEN I SHALL be able to select my preferred store
5. WHEN I order through Instacart THEN I SHALL see delivery time estimates and fees
6. WHEN items are unavailable on Instacart THEN I SHALL see suggested substitutions
7. WHEN I complete an Instacart order THEN the shopping list SHALL be marked as ordered
8. WHEN I track my order THEN I SHALL see delivery status updates within PlateWise

### Requirement 20: Instacart Price Comparison and Optimization

**User Story:** As a PlateWise user comparing shopping options, I want to see Instacart pricing alongside in-store prices, so that I can make informed decisions about delivery versus in-store shopping.

#### Acceptance Criteria

1. WHEN I view shopping list pricing THEN I SHALL see both in-store and Instacart prices
2. WHEN I compare options THEN I SHALL see total cost including delivery fees
3. WHEN I use Instacart THEN I SHALL see time savings versus cost trade-offs
4. WHEN items have different prices THEN I SHALL see clear cost comparisons
5. WHEN I select Instacart THEN I SHALL see estimated delivery windows
6. WHEN I have Instacart+ membership THEN pricing SHALL reflect member benefits
7. WHEN stores have different availability THEN I SHALL see alternative store options
8. WHEN I order frequently THEN I SHALL see personalized recommendations

### Requirement 21: Shopping Page Integration

**User Story:** As a PlateWise user, I want my meal plan shopping lists to seamlessly integrate with the existing shopping page features, so that I have a unified shopping experience.

#### Acceptance Criteria

1. WHEN I navigate to `/shopping` THEN I SHALL see my meal plan shopping lists prominently displayed
2. WHEN I have multiple shopping lists THEN I SHALL be able to manage them separately
3. WHEN I view a shopping list THEN I SHALL see which meal plan it came from
4. WHEN I modify a shopping list THEN changes SHALL be saved automatically
5. WHEN I complete a shopping trip THEN I SHALL be able to mark items as purchased
6. WHEN I mark items as purchased THEN they SHALL be removed from active shopping lists
7. WHEN I have recurring meal plans THEN I SHALL be able to reuse shopping lists
8. WHEN I share shopping lists THEN family members SHALL be able to access them
9. WHEN I use Instacart THEN I SHALL see order history and tracking information
10. WHEN I have both in-store and delivery options THEN I SHALL see clear choice buttons

### Requirement 22: Database Schema Validation and Migration

**User Story:** As a PlateWise developer, I want to ensure all database tables and schemas are properly aligned with Supabase requirements, so that meal plans, recipes, and shopping lists are stored and retrieved correctly.

#### Acceptance Criteria

1. WHEN I audit the database THEN all required tables SHALL exist in Supabase with correct schemas
2. WHEN I check meal_plans table THEN it SHALL support all fields needed for meal plan storage and retrieval
3. WHEN I check recipes table THEN it SHALL support cultural data, pricing, ingredients, and user modifications
4. WHEN I check shopping_lists table THEN it SHALL support consolidated items, pricing, and Instacart integration
5. WHEN I run migrations THEN they SHALL execute successfully without data loss
6. WHEN I test data operations THEN all CRUD operations SHALL work correctly with proper RLS policies
7. WHEN I validate relationships THEN foreign keys SHALL maintain data integrity
8. WHEN I check performance THEN proper indexes SHALL exist for frequently queried fields

### Requirement 23: Error Handling and Fallback Systems

**User Story:** As a PlateWise user, I want the meal planner to handle errors gracefully and provide fallback options, so that I can continue using the app even when some services are unavailable.

#### Acceptance Criteria

1. WHEN API calls fail THEN I SHALL see helpful error messages with suggested actions
2. WHEN Kroger pricing is unavailable THEN I SHALL still be able to plan meals with estimated costs
3. WHEN Instacart is down THEN I SHALL still be able to create and manage shopping lists
4. WHEN recipe generation fails THEN I SHALL see alternative options or cached results
5. WHEN ingredient search fails THEN I SHALL see fallback suggestions from cached data
6. WHEN network is slow THEN I SHALL see loading indicators and progress updates
7. WHEN data fails to save THEN I SHALL be notified and given retry options
8. WHEN I encounter errors THEN my work in progress SHALL be preserved

### Requirement 24: Performance and Caching Strategy

**User Story:** As a PlateWise user, I want the meal planner to load quickly and respond smoothly, so that I can efficiently plan meals without waiting.

#### Acceptance Criteria

1. WHEN I load the meal planner THEN it SHALL appear within 2 seconds
2. WHEN I generate recipes THEN results SHALL appear within 10 seconds maximum
3. WHEN I search ingredients THEN results SHALL appear within 3 seconds
4. WHEN I use cached data THEN it SHALL load instantly
5. WHEN I switch between steps THEN transitions SHALL be smooth and immediate
6. WHEN I scale recipes THEN calculations SHALL update in real-time
7. WHEN I modify ingredients THEN pricing SHALL update within 1 second
8. WHEN I use the app repeatedly THEN performance SHALL remain consistent

### Requirement 25: Data Migration and Backward Compatibility

**User Story:** As an existing PlateWise user, I want my current meal plans and recipes to work with the new interface, so that I don't lose any of my saved work.

#### Acceptance Criteria

1. WHEN the new interface launches THEN my existing meal plans SHALL be accessible
2. WHEN I view old meal plans THEN they SHALL display correctly in the new interface
3. WHEN I have saved recipes THEN they SHALL be compatible with the new system
4. WHEN I migrate data THEN no information SHALL be lost or corrupted
5. WHEN I use old features THEN they SHALL continue to work during transition
6. WHEN I save new data THEN it SHALL be compatible with both old and new systems
7. WHEN I encounter migration issues THEN I SHALL have clear support options
8. WHEN migration completes THEN I SHALL be notified of any changes or new features

### Requirement 26: Testing and Quality Assurance

**User Story:** As a PlateWise user, I want the new meal planner to be thoroughly tested and reliable, so that I can trust it for my meal planning needs.

#### Acceptance Criteria

1. WHEN the system is deployed THEN all APIs SHALL be tested to match test-interactive-planner behavior
2. WHEN I use any feature THEN it SHALL work consistently across different browsers
3. WHEN I use mobile devices THEN all functionality SHALL work without issues
4. WHEN I test edge cases THEN the system SHALL handle them gracefully
5. WHEN I use accessibility tools THEN they SHALL work properly with all features
6. WHEN I test with different user profiles THEN cultural preferences SHALL work correctly
7. WHEN I stress test the system THEN it SHALL maintain performance under load
8. WHEN I test data integrity THEN all saved information SHALL be accurate and complete

### Requirement 27: Integration with Existing PlateWise Features

**User Story:** As a PlateWise user, I want the new meal planner to work with existing features like recipe collections and store preferences, so that I have a seamless experience across the entire app.

#### Acceptance Criteria

1. WHEN I use the meal planner THEN it SHALL integrate with my existing store preferences
2. WHEN I generate meal plans THEN they SHALL be available in my meal plan history
3. WHEN I have favorite ingredients THEN they SHALL be suggested during substitution
4. WHEN I complete meal planning THEN I SHALL have clear next steps for shopping and cooking
5. WHEN I access saved recipes THEN I SHALL be able to add them to new meal plans
6. WHEN I view my recipe collection THEN I SHALL see recipes saved from meal planning sessions
7. WHEN I have store loyalty cards THEN pricing SHALL reflect member discounts
8. WHEN I set store preferences THEN shopping lists SHALL prioritize those stores
9. WHEN I save data THEN it SHALL be stored in the correct Supabase tables with proper schema
10. WHEN I retrieve data THEN it SHALL be formatted correctly for the UI components

## Success Criteria

- Users can complete meal planning 80% faster than the current interface
- Recipe generation completes in under 10 seconds
- Pricing integration works without blocking the user experience
- Ingredient substitution provides relevant alternatives 90% of the time
- Mobile users have full functionality with touch-optimized interactions
- User preferences are preserved across sessions with 99% reliability
- Integration with existing PlateWise features works seamlessly

## Technical Considerations

### API Compatibility Requirements
- **CRITICAL**: All APIs must work exactly as they do in `/test-interactive-planner`
- Preserve `/api/meal-plans/recipes-only` endpoint functionality and response format
- Preserve `/api/meal-plans/add-pricing` endpoint functionality and response format  
- Preserve `/api/ingredients/search` endpoint functionality and response format
- Maintain identical request/response patterns and error handling
- Ensure same performance characteristics (5-10 second recipe generation)
- Preserve all existing API parameters and options
- Maintain backward compatibility with test implementation

### User Profile Integration
- Connect meal plan configuration to user profile cultural preferences
- Implement preference override system with clear UI indicators
- Provide "Save to Profile" functionality for preferred overrides
- Maintain session-based preference memory
- Integrate with existing user profile management system

### Core Technical Requirements
- Maintain existing authentication and authorization patterns
- Ensure mobile responsiveness across all device sizes
- Implement proper error handling and fallback states
- Maintain cultural authenticity scoring and recommendations
- Optimize for fast loading and smooth interactions
- Ensure accessibility compliance (WCAG 2.1 AA)
- Use semantic HTML and proper heading hierarchy
- Implement high contrast color schemes (4.5:1 minimum)
- Provide keyboard navigation for all interactive elements
- Include skip links and focus management
- Use clear, descriptive button and link text
- Implement proper form labels and error messaging
- Ensure consistent navigation and layout patterns
- **CRITICAL**: Preserve existing shadcn expandable card component for recipe display
- Maintain consistent UI component library usage across the application
- Ensure recipe cards expand/collapse functionality matches current interface
- Preserve existing card styling and interaction patterns

### Database Schema Requirements
- **CRITICAL**: Validate all database tables match Supabase schema requirements
- Ensure `meal_plans` table supports all required fields for meal plan storage
- Ensure `recipes` table supports cultural authenticity, pricing, and substitution data
- Ensure `shopping_lists` table supports consolidated ingredients and Instacart integration
- Create migration scripts for any missing tables or columns
- Implement proper foreign key relationships between meal plans, recipes, and shopping lists
- Add indexes for performance optimization on frequently queried fields
- Ensure RLS (Row Level Security) policies are properly configured for all tables
- Validate data types match API response formats
- Create backup and rollback procedures for schema changes

### Required Database Tables and Fields

#### Meal Plans Table
```sql
meal_plans (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT,
  description TEXT,
  cultural_cuisines TEXT[],
  dietary_restrictions TEXT[],
  household_size INTEGER,
  total_cost DECIMAL,
  cost_per_serving DECIMAL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  is_saved BOOLEAN DEFAULT false,
  zip_code TEXT,
  preferences JSONB
)
```

#### Recipes Table  
```sql
recipes (
  id UUID PRIMARY KEY,
  meal_plan_id UUID REFERENCES meal_plans(id),
  title TEXT NOT NULL,
  description TEXT,
  cultural_origin TEXT[],
  cuisine TEXT,
  ingredients JSONB,
  instructions TEXT[],
  servings INTEGER,
  total_time INTEGER,
  estimated_cost DECIMAL,
  has_pricing BOOLEAN DEFAULT false,
  image_url TEXT,
  source_url TEXT,
  authenticity_score DECIMAL,
  user_modifications JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

#### Shopping Lists Table
```sql
shopping_lists (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  meal_plan_id UUID REFERENCES meal_plans(id),
  name TEXT,
  items JSONB,
  total_cost DECIMAL,
  store_preferences JSONB,
  instacart_order_id TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  completed_at TIMESTAMP
)
```

### Advanced Integration Requirements
- Integrate Instacart API with proper authentication and error handling
- Implement real-time price comparison between in-store and delivery options
- Handle Instacart API rate limits and service availability
- Secure storage of user Instacart preferences and order history
- Implement proper data synchronization between PlateWise and Instacart
- Handle Instacart substitution suggestions and user preferences
- Implement order tracking and status updates
- Ensure compliance with Instacart API terms of service
- Implement recipe scaling and quantity management algorithms
- Create shopping list consolidation and optimization logic

## Cultural Sensitivity Requirements

- Respect traditional cooking methods and ingredient combinations
- Provide cultural context for recipe modifications
- Maintain authenticity warnings when making substitutions
- Support diverse dietary restrictions and cultural preferences
- Include proper attribution for traditional recipes and techniques