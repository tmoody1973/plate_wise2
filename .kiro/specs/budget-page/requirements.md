# Requirements Document: Budget Management Page

## Introduction

This specification defines the requirements for a comprehensive Budget Management page that serves as a control center for meal planning budgets, cost optimization, and savings opportunities. The Budget page integrates with the existing meal planning system to provide users with actionable insights and controls for managing their food spending.

## Current Context

The Budget page builds upon the existing meal planning infrastructure:
- ✅ **MealPlannerV2** with comprehensive pricing and cost calculations
- ✅ **Kroger pricing integration** with package optimization
- ✅ **Ingredient substitution** with cost alternatives
- ✅ **Cost optimization suggestions** already implemented
- ✅ **Package vs proportional pricing modes** already working

## Requirements

### Requirement 1: Budget Overview Dashboard

**User Story:** As a PlateWise user, I want to see my budget status at a glance, so that I can quickly understand my spending position and take action if needed.

#### Acceptance Criteria

1. WHEN I visit `/budget` THEN I SHALL see a clear header with "This week's budget," "Projected spend," and "Savings opportunities"
2. WHEN I view my budget status THEN I SHALL see both weekly and monthly budget amounts with a rollover toggle
3. WHEN I have a current meal plan THEN I SHALL see projected spend based on priced ingredients
4. WHEN pricing confidence is less than 100% THEN I SHALL see a range for projected spend
5. WHEN I view the budget overview THEN I SHALL see a confidence badge (high/medium/low) based on pricing accuracy
6. WHEN I look at plan cost vs budget THEN I SHALL see "$63 of $75" format with a small trend line
7. WHEN savings are available THEN I SHALL see "~$12 available" with "View all highest savings" link
8. WHEN I have estimated items THEN I SHALL see "3 to refine" with "Fix all" button

### Requirement 2: At-a-Glance Status Cards

**User Story:** As a budget-conscious user, I want key budget metrics displayed in easy-to-scan cards, so that I can quickly assess my financial position without digging into details.

#### Acceptance Criteria

1. WHEN I view the budget page THEN I SHALL see a "Plan cost vs Budget" card showing current spend against budget
2. WHEN I view the budget page THEN I SHALL see a "Suggested savings" card with estimated savings amount
3. WHEN I view the budget page THEN I SHALL see an "Estimated items" card showing items that need price refinement
4. WHEN I view the budget page THEN I SHALL see a "Spend breakdown" card showing pantry vs packages and category breakdown
5. WHEN I click on any card THEN I SHALL be taken to the relevant action or detail view
6. WHEN budget data is loading THEN I SHALL see appropriate loading states for each card
7. WHEN there are no savings opportunities THEN I SHALL see a positive message about being optimized

### Requirement 3: Savings Opportunities Hub

**User Story:** As a cost-conscious user, I want to see ranked savings opportunities with one-click actions, so that I can quickly optimize my meal plan costs.

#### Acceptance Criteria

1. WHEN I view savings opportunities THEN I SHALL see cheaper swaps ranked by per-unit savings
2. WHEN I see a cheaper swap THEN I SHALL see a one-click "Swap" button that updates my meal plan
3. WHEN I view expensive recipes THEN I SHALL see 1-2 recipes with biggest cost per serving
4. WHEN I want to replace expensive recipes THEN I SHALL see "Replace with cheaper dinner" options
5. WHEN multiple store zones are available THEN I SHALL see "Switch to Store X saves ~$Y" options
6. WHEN I take a savings action THEN the budget totals SHALL update immediately
7. WHEN I swap ingredients THEN I SHALL be taken back to the meal planner with changes applied

### Requirement 4: Budget Controls and Settings

**User Story:** As a PlateWise user, I want to control my budget settings and meal plan parameters from one place, so that I can optimize my spending without navigating between multiple pages.

#### Acceptance Criteria

1. WHEN I want to change costing mode THEN I SHALL see Package vs Proportional toggle with explanation
2. WHEN I want to adjust my meal plan THEN I SHALL see quick edits for meal count and meal types
3. WHEN I modify meal parameters THEN I SHALL see a "Recalculate" button to update projections
4. WHEN I want to manage ingredients THEN I SHALL see include/exclude ingredient chips with quick add/remove
5. WHEN I'm over budget THEN I SHALL see an "Auto-optimize to budget" button
6. WHEN I click auto-optimize THEN the system SHALL reduce per-meal cost using swaps and suggest recipe replacements
7. WHEN I change budget settings THEN they SHALL be saved automatically and persist across sessions

### Requirement 5: Confidence and Accuracy Tracking

**User Story:** As a user making budget decisions, I want to understand how accurate my cost projections are, so that I can make informed decisions about my spending.

#### Acceptance Criteria

1. WHEN I view budget projections THEN I SHALL see a confidence badge indicating accuracy level
2. WHEN confidence is high THEN I SHALL see ≥80% of items priced with real data and ≤10% estimated
3. WHEN confidence is medium THEN I SHALL see 60-79% of items priced with some estimates
4. WHEN confidence is low THEN I SHALL see <60% of items priced with many estimates
5. WHEN I have estimated items THEN I SHALL see the count and a "Fix all" button to get real prices
6. WHEN pricing data is updated THEN confidence levels SHALL recalculate automatically
7. WHEN I click on confidence details THEN I SHALL see a breakdown of priced vs estimated items

### Requirement 6: Integration with Meal Plans

**User Story:** As a user managing my budget, I want seamless integration with my meal planning, so that budget actions directly update my meal plan without losing context.

#### Acceptance Criteria

1. WHEN I click "Replace expensive recipe" THEN I SHALL be taken to the meal planner with the recipe picker open
2. WHEN I click "Find cheaper swaps" THEN I SHALL jump to the relevant ingredient in meal plans with alternatives shown
3. WHEN I make changes in the budget page THEN they SHALL be reflected immediately in the meal planner
4. WHEN I return from the meal planner THEN the budget page SHALL show updated calculations
5. WHEN I have an active meal plan THEN the budget page SHALL read current priced totals and confidence
6. WHEN I don't have a meal plan THEN the budget page SHALL show a "Create Meal Plan" call-to-action
7. WHEN meal plan data changes THEN budget calculations SHALL update in real-time

### Requirement 7: Shopping List Integration

**User Story:** As a user with shopping lists, I want to see how my pantry items affect my budget, so that I can optimize my actual spending.

#### Acceptance Criteria

1. WHEN I have a shopping list THEN the budget page SHALL show "remaining spend after pantry items"
2. WHEN I view shopping list impact THEN I SHALL see items that drive costs highlighted
3. WHEN I want to reduce costs THEN I SHALL see "Mark as already have" buttons for expensive items
4. WHEN I mark items as "already have" THEN the budget total SHALL reduce immediately
5. WHEN I have pantry items THEN I SHALL see the savings amount clearly displayed
6. WHEN I modify shopping list status THEN changes SHALL sync with the meal planner
7. WHEN I don't have a shopping list THEN I SHALL see a "Generate Shopping List" suggestion

### Requirement 8: Activity Feed and History

**User Story:** As a user tracking my budget performance, I want to see my savings actions and budget trends, so that I can understand my spending patterns and celebrate successes.

#### Acceptance Criteria

1. WHEN I take savings actions THEN I SHALL see records like "you saved $3.20 swapping rice brand"
2. WHEN pricing updates occur THEN I SHALL see notifications like "pricing updated for milk"
3. WHEN I meet budget goals THEN I SHALL see achievements like "budget met for 2 weeks straight"
4. WHEN I view budget history THEN I SHALL see last N weeks' spend vs budget
5. WHEN I want to see trends THEN I SHALL see average per week and category breakdowns
6. WHEN I view activity feed THEN I SHALL see recent actions in chronological order
7. WHEN I achieve savings milestones THEN I SHALL see celebratory messages and progress indicators

### Requirement 9: Profile Integration

**User Story:** As a PlateWise user, I want my budget settings to integrate with my profile, so that I have consistent preferences across the app without duplicate data entry.

#### Acceptance Criteria

1. WHEN I set budget preferences THEN they SHALL sync with my user profile
2. WHEN I change household size THEN it SHALL update both budget calculations and my profile
3. WHEN I modify store preferences THEN they SHALL be reflected in pricing calculations
4. WHEN I access budget settings THEN I SHALL see key controls inline without navigating to profile
5. WHEN I want detailed profile settings THEN I SHALL see links to the full profile page
6. WHEN profile data changes THEN budget calculations SHALL update automatically
7. WHEN I'm a new user THEN budget settings SHALL be pre-populated from my profile setup

### Requirement 10: Responsive Design and Accessibility

**User Story:** As a PlateWise user on any device, I want the budget page to work seamlessly on mobile and desktop, so that I can manage my budget anywhere.

#### Acceptance Criteria

1. WHEN I access the budget page on mobile THEN all cards and controls SHALL be touch-friendly
2. WHEN I view the page on different screen sizes THEN the layout SHALL adapt appropriately
3. WHEN I use the page with a screen reader THEN all content SHALL be properly announced
4. WHEN I navigate with keyboard only THEN all interactive elements SHALL be accessible
5. WHEN I have low vision THEN I SHALL be able to zoom to 200% without losing functionality
6. WHEN I interact with controls THEN they SHALL have appropriate focus indicators
7. WHEN I use the page on slow connections THEN it SHALL load progressively with meaningful loading states

## Success Criteria

- Users can see their budget status and take action within 3 clicks
- Budget projections are accurate within 10% when confidence is high
- Users can optimize their meal plan costs by 15-25% using suggested actions
- 90% of budget actions complete without requiring navigation to other pages
- Budget page loads within 2 seconds and updates in real-time
- Mobile users have full functionality with touch-optimized interactions

## Technical Considerations

### Data Integration
- Read current meal plan data from existing MealPlannerV2 state
- Integrate with Kroger pricing service for real-time cost calculations
- Use existing ingredient substitution logic for cheaper swap suggestions
- Leverage existing package optimization calculations for cost modes

### State Management
- Maintain budget settings in user profile and local storage
- Sync budget actions with meal planner state in real-time
- Cache savings calculations to avoid repeated API calls
- Persist activity feed data for historical tracking

### Performance Requirements
- Budget calculations must complete within 1 second
- Real-time updates when meal plan data changes
- Efficient caching of pricing data and savings calculations
- Progressive loading for historical data and trends

### Integration Points
- `/meal-plans` - Deep linking to specific recipes and ingredients
- `/shopping` - Shopping list status and pantry item management
- `/profile` - Budget preferences and household settings
- Existing APIs - Kroger pricing, ingredient search, recipe data