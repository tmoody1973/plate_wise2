# Requirements Document: Enhanced Meal Planner V2

## Introduction

This specification defines the requirements for the enhanced meal planning system in PlateWise. Based on the current implementation analysis, this document reflects what has been built and identifies remaining features needed to complete the comprehensive meal planning experience.

## Current Implementation Status

✅ **COMPLETED FEATURES:**
- Main interface integration with authentication and dashboard layout
- 3-step meal planning process (Configure → Recipes → Pricing)
- Recipe generation using enhanced search with real URLs and images
- Kroger pricing integration with detailed cost calculations
- Ingredient substitution with real-time search
- User profile integration for preferences pre-population
- Recipe streaming capabilities for better UX
- Recipe saving to user collections
- Advanced configuration options
- Package vs proportional pricing modes
- Ingredient status management (already have, specialty store)
- Cost optimization suggestions

## Requirements

### Requirement 1: Enhanced Main Interface (✅ COMPLETED)

**User Story:** As a PlateWise user, I want to access a comprehensive meal planner from the main navigation, so that I can create detailed meal plans with pricing and shopping integration.

#### Acceptance Criteria

1. ✅ WHEN I visit `/meal-plans` THEN I SHALL see the MealPlannerV2 interface with full functionality
2. ✅ WHEN I access the meal planner THEN the system SHALL maintain authentication requirements and dashboard layout
3. ✅ WHEN the interface loads THEN I SHALL see the 3-step process: Configure → Recipes → Pricing
4. ✅ WHEN I navigate using the main PlateWise navigation THEN the meal planner SHALL be accessible from the "Meal Plans" menu item

### Requirement 2: Enhanced Recipe Generation (✅ COMPLETED)

**User Story:** As a user, I want to generate culturally authentic recipes with real URLs and images based on my comprehensive preferences, so that I can discover quality meals that fit my dietary needs and cultural background.

#### Acceptance Criteria

1. ✅ WHEN I select cultural cuisines THEN the system SHALL generate authentic recipes from those traditions using enhanced web search
2. ✅ WHEN I specify dietary restrictions, allergies, or dislikes THEN all generated recipes SHALL comply with those restrictions
3. ✅ WHEN I set household size THEN recipe servings SHALL be appropriate for that number of people
4. ✅ WHEN I generate recipes THEN I SHALL receive 3-12 complete recipes with ingredients, instructions, real URLs, and images
5. ✅ WHEN recipes are generated THEN each recipe SHALL include cultural authenticity information and source URLs
6. ✅ WHEN I use streaming generation THEN recipes SHALL appear one by one with progress indicators
7. ✅ WHEN I want to replace a recipe THEN I SHALL be able to swap individual recipes with alternatives

### Requirement 3: Advanced Pricing Integration (✅ COMPLETED)

**User Story:** As a budget-conscious user, I want to see detailed real grocery prices with package optimization and cost analysis, so that I can make informed decisions about meal costs and shopping.

#### Acceptance Criteria

1. ✅ WHEN I add pricing to recipes THEN the system SHALL show real Kroger grocery prices for each ingredient with detailed metadata
2. ✅ WHEN pricing is displayed THEN I SHALL see total cost per recipe, cost per serving, and package optimization details
3. ✅ WHEN ingredients have pricing THEN I SHALL be able to mark items as "already have" or "specialty store" to manage costs
4. ✅ WHEN pricing is available THEN I SHALL see store location, package sizes, and leftover amounts
5. ✅ WHEN ingredients are on sale THEN the system SHALL highlight sale prices and calculate savings
6. ✅ WHEN I choose pricing mode THEN I SHALL be able to switch between package-based and proportional costing
7. ✅ WHEN I want to optimize costs THEN the system SHALL suggest cheaper alternatives for expensive ingredients

### Requirement 4: Enhanced User Experience (✅ COMPLETED)

**User Story:** As a user, I want a smooth and intuitive meal planning experience with advanced features, so that I can efficiently create comprehensive meal plans.

#### Acceptance Criteria

1. ✅ WHEN I use the meal planner THEN the interface SHALL provide clear progress indicators and step navigation
2. ✅ WHEN I complete each step THEN I SHALL be able to navigate back to previous steps to make changes
3. ✅ WHEN errors occur THEN the system SHALL display helpful error messages with specific guidance
4. ✅ WHEN the system is processing THEN I SHALL see appropriate loading indicators and streaming progress
5. ✅ WHEN I interact with the interface THEN all buttons and controls SHALL be responsive and accessible
6. ✅ WHEN I have preferences THEN the system SHALL pre-populate settings from my user profile
7. ✅ WHEN I want advanced options THEN I SHALL be able to access detailed configuration settings
8. ✅ WHEN I find recipes I like THEN I SHALL be able to save them to my recipe collection

### Requirement 5: Technical Integration (✅ COMPLETED)

**User Story:** As a developer, I want the meal planner to integrate seamlessly with existing PlateWise infrastructure, so that it maintains consistency with the rest of the application.

#### Acceptance Criteria

1. ✅ WHEN the meal planner loads THEN it SHALL use the existing PlateWise authentication system
2. ✅ WHEN displaying the interface THEN it SHALL use the standard PlateWise layout and navigation
3. ✅ WHEN making API calls THEN it SHALL use robust API endpoints for recipe generation, pricing, and ingredient search
4. ✅ WHEN handling errors THEN it SHALL use comprehensive error handling with user-friendly messages
5. ✅ WHEN styling components THEN it SHALL use the existing PlateWise design system and components
6. ✅ WHEN storing data THEN it SHALL integrate with the recipe database service for saving user recipes
7. ✅ WHEN managing state THEN it SHALL persist user preferences and settings across sessions

## NEW REQUIREMENTS (Not Yet Implemented)

### Requirement 6: Shopping List Generation (🔄 NEEDED)

**User Story:** As a PlateWise user who has completed meal planning, I want to automatically generate optimized shopping lists, so that I can efficiently shop for all my planned meals.

#### Acceptance Criteria

1. WHEN I complete a meal plan with pricing THEN I SHALL see a "Generate Shopping List" button
2. WHEN I generate a shopping list THEN it SHALL consolidate all ingredients across all recipes
3. WHEN ingredients appear in multiple recipes THEN quantities SHALL be automatically combined
4. WHEN I generate a shopping list THEN it SHALL exclude items I marked as "already have"
5. WHEN I create a shopping list THEN it SHALL group items by store section (produce, dairy, etc.)
6. WHEN I generate a shopping list THEN it SHALL include current pricing and total estimated cost
7. WHEN I create a shopping list THEN it SHALL appear on my `/shopping` page
8. WHEN I view the shopping list THEN I SHALL see which recipes each ingredient is for

### Requirement 7: Shopping Page Integration (🔄 NEEDED)

**User Story:** As a PlateWise user, I want my meal plan shopping lists to seamlessly integrate with the shopping page, so that I have a unified shopping experience.

#### Acceptance Criteria

1. WHEN I navigate to `/shopping` THEN I SHALL see my meal plan shopping lists prominently displayed
2. WHEN I have multiple shopping lists THEN I SHALL be able to manage them separately
3. WHEN I view a shopping list THEN I SHALL see which meal plan it came from
4. WHEN I modify a shopping list THEN changes SHALL be saved automatically
5. WHEN I complete shopping THEN I SHALL be able to mark items as purchased
6. WHEN I mark items as purchased THEN they SHALL be removed from active shopping lists

### Requirement 8: Enhanced Recipe Management (🔄 NEEDED)

**User Story:** As a PlateWise user, I want advanced recipe management features, so that I can customize and optimize my meal plans.

#### Acceptance Criteria

1. WHEN I view a recipe THEN I SHALL see controls to scale servings up or down
2. WHEN I change serving size THEN all ingredient quantities SHALL automatically adjust proportionally
3. WHEN I scale a recipe THEN the total cost SHALL recalculate automatically
4. WHEN I want to replace a recipe THEN I SHALL have access to my saved recipes and new search options
5. WHEN I find better ingredient alternatives THEN I SHALL be able to substitute them with cost impact shown
6. WHEN I make recipe modifications THEN they SHALL be preserved in my meal plan

### Requirement 9: Meal Plan Persistence (🔄 NEEDED)

**User Story:** As a PlateWise user, I want to save and reuse successful meal plans, so that I can easily recreate meals I enjoyed.

#### Acceptance Criteria

1. WHEN I complete a meal plan THEN I SHALL be able to save it with a custom name
2. WHEN I save a meal plan THEN it SHALL preserve all my customizations and substitutions
3. WHEN I access saved meal plans THEN I SHALL be able to regenerate them with updated pricing
4. WHEN I view my meal plan history THEN I SHALL see cost trends and favorite recipes
5. WHEN I want to modify a saved plan THEN I SHALL be able to create variations