# Design Document: Meal Planner V2

## Overview

The Meal Planner V2 will integrate the proven working InteractiveMealPlanner component into the main PlateWise application. This design focuses on a clean, simple integration that preserves all existing functionality while providing the full PlateWise user experience.

## Architecture

### Component Structure

```
/meal-plans (page)
├── ProtectedRoute (authentication wrapper)
├── DashboardLayout (main PlateWise layout)
└── InteractiveMealPlanner (core functionality)
    ├── ConfigurationStep (cultural cuisines, dietary restrictions, household size)
    ├── RecipeStep (generated recipes with expandable cards)
    └── PricingStep (Kroger pricing integration with cost calculations)
```

### Integration Points

1. **Authentication**: Uses existing `ProtectedRoute` component
2. **Layout**: Uses existing `DashboardLayout` with PlateWise navigation
3. **APIs**: Uses existing `/api/meal-plans/recipes-only` and `/api/meal-plans/add-pricing` endpoints
4. **Styling**: Uses existing shadcn/ui components and PlateWise design system

## Components and Interfaces

### Main Page Component
```typescript
// src/app/meal-plans/page.tsx
export default function MealPlansPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <InteractiveMealPlanner />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
```

### Core Meal Planner Component
```typescript
// src/components/meal-plans/InteractiveMealPlanner.tsx
interface MealPlanConfig {
  culturalCuisines: string[];
  dietaryRestrictions: string[];
  householdSize: number;
  timeFrame: string;
  zipCode: string;
}

interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: Ingredient[];
  instructions: string[];
  metadata: RecipeMetadata;
  pricing?: RecipePricing;
}
```

### Step Components

#### Configuration Step
- Cultural cuisine selection (checkboxes)
- Dietary restrictions (checkboxes)
- Household size (number input)
- Time frame (dropdown)
- ZIP code for pricing (text input)

#### Recipe Step
- Progress indicator showing "Recipes" step
- Generated recipe cards using `ExpandableCard` component
- Recipe details with ingredients and instructions
- "Add Pricing" button to proceed to next step

#### Pricing Step
- Recipe cards with pricing information
- Cost per recipe and per serving
- Ingredient-level pricing with Kroger data
- "Already have" toggles for ingredients
- Total cost calculations

## Data Models

### Recipe Interface
```typescript
interface Recipe {
  id: string;
  title: string;
  description: string;
  culturalOrigin: string[];
  cuisine: string;
  ingredients: Ingredient[];
  instructions: string[];
  metadata: {
    servings: number;
    totalTime: number;
    estimatedTime: number;
  };
  pricing?: {
    totalCost: number;
    costPerServing: number;
    budgetFriendly: boolean;
    savingsOpportunities: string[];
  };
}
```

### Ingredient Interface
```typescript
interface Ingredient {
  id: string;
  name: string;
  amount: string;
  unit: string;
  originalName: string;
  isSubstituted: boolean;
  userStatus: 'normal' | 'already-have' | 'specialty-store';
  krogerPrice?: {
    unitPrice: number;
    totalCost: number;
    productName: string;
    onSale: boolean;
    salePrice?: number;
  };
}
```

## Error Handling

### API Error Handling
- Network errors: Display retry button with helpful message
- Authentication errors: Redirect to login
- Validation errors: Show field-specific error messages
- Service unavailable: Show fallback options

### User Input Validation
- Required fields: Cultural cuisines (at least 1), ZIP code for pricing
- Format validation: ZIP code format, household size (1-12)
- Real-time validation feedback

## Testing Strategy

### Component Testing
- Unit tests for each step component
- Integration tests for the full meal planner flow
- Mock API responses for consistent testing

### User Flow Testing
- Complete meal planning workflow
- Error scenarios and recovery
- Navigation between steps
- Authentication integration

### API Integration Testing
- Recipe generation with various parameters
- Pricing integration with different ZIP codes
- Error handling for API failures

## Implementation Phases

### Phase 1: Basic Integration (Day 1)
1. Copy working InteractiveMealPlanner component
2. Update main meal plans page to use new component
3. Verify authentication and layout integration
4. Test basic functionality

### Phase 2: Enhancement (Future)
- Recipe saving and collections
- Shopping list generation
- User preference integration
- Advanced filtering and search

## Success Criteria

1. **Functional**: All existing InteractiveMealPlanner functionality works in main app
2. **Integrated**: Uses PlateWise authentication, layout, and navigation
3. **Consistent**: Matches PlateWise design system and user experience
4. **Reliable**: Handles errors gracefully and provides good user feedback
5. **Performant**: Loads quickly and responds smoothly to user interactions