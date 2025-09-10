# Design Document: Budget Management Page

## Overview

The Budget Management page serves as a comprehensive control center for meal planning budgets, providing users with actionable insights, cost optimization tools, and seamless integration with the existing meal planning system. The design emphasizes clarity, quick actions, and real-time feedback.

## Architecture

### Component Hierarchy
```
BudgetPage
├── BudgetHeader
│   ├── BudgetOverview
│   ├── ProjectedSpend
│   └── SavingsOpportunities
├── AtAGlanceCards
│   ├── PlanCostCard
│   ├── SuggestedSavingsCard
│   ├── EstimatedItemsCard
│   └── SpendBreakdownCard
├── SavingsOpportunitiesHub
│   ├── CheaperSwapsList
│   ├── ExpensiveRecipesList
│   └── StoreComparisonList
├── BudgetControls
│   ├── CostingModeToggle
│   ├── MealPlanQuickEdits
│   ├── IngredientChips
│   └── AutoOptimizeButton
└── ActivityFeed
    ├── RecentActions
    ├── BudgetHistory
    └── AchievementBadges
```

### Data Flow Architecture
```
User Profile → Budget Settings → Meal Plan Data → Pricing Service → Budget Calculations → UI Updates
     ↓              ↓               ↓              ↓                ↓                ↓
Store Preferences → Cost Mode → Recipe Data → Kroger API → Savings Analysis → Real-time Updates
```

## User Interface Design

### Layout Structure

#### Header Section
- **Budget Overview**: Weekly/monthly budget with rollover toggle
- **Projected Spend**: Current plan cost with confidence range
- **Savings Opportunities**: Quick access to optimization actions

#### Main Content Grid
```
┌─────────────────┬─────────────────┐
│  Plan Cost      │  Suggested      │
│  vs Budget      │  Savings        │
├─────────────────┼─────────────────┤
│  Estimated      │  Spend          │
│  Items          │  Breakdown      │
└─────────────────┴─────────────────┘
```

#### Action Sections
- **Savings Opportunities**: Ranked list with one-click actions
- **Budget Controls**: Inline settings and quick edits
- **Activity Feed**: Recent actions and achievements

### Visual Design Principles

#### Color Scheme
- **Green**: Budget on track, savings achieved
- **Yellow/Orange**: Caution, approaching budget limit
- **Red**: Over budget, needs attention
- **Blue**: Actions and interactive elements
- **Gray**: Secondary information and disabled states

#### Typography
- **Headers**: Bold, clear hierarchy
- **Metrics**: Large, prominent numbers
- **Actions**: Clear, actionable button text
- **Details**: Readable secondary information

#### Iconography
- **💰**: Budget and cost-related items
- **📊**: Analytics and breakdowns
- **🔄**: Swaps and replacements
- **✅**: Completed actions and achievements
- **⚠️**: Warnings and attention items

## Component Specifications

### BudgetHeader Component
```typescript
interface BudgetHeaderProps {
  weeklyBudget: number;
  monthlyBudget: number;
  projectedSpend: {
    amount: number;
    range?: { min: number; max: number };
    confidence: 'high' | 'medium' | 'low';
  };
  savingsAvailable: number;
  rolloverEnabled: boolean;
  onRolloverToggle: (enabled: boolean) => void;
}
```

### AtAGlanceCards Component
```typescript
interface AtAGlanceCardsProps {
  planCost: number;
  budget: number;
  trendData: number[];
  suggestedSavings: number;
  estimatedItemsCount: number;
  spendBreakdown: {
    pantry: number;
    packages: number;
    categories: Record<string, number>;
  };
  onCardClick: (cardType: string) => void;
}
```

### SavingsOpportunitiesHub Component
```typescript
interface SavingsOpportunity {
  type: 'swap' | 'recipe' | 'store';
  id: string;
  title: string;
  currentCost: number;
  newCost: number;
  savings: number;
  confidence: 'high' | 'medium' | 'low';
  action: () => void;
}

interface SavingsOpportunitiesHubProps {
  opportunities: SavingsOpportunity[];
  onSwapAction: (opportunityId: string) => void;
  onReplaceRecipe: (recipeId: string) => void;
  onStoreSwitch: (storeId: string) => void;
}
```

### BudgetControls Component
```typescript
interface BudgetControlsProps {
  costingMode: 'package' | 'proportional';
  mealCount: number;
  mealTypes: string[];
  includeIngredients: string[];
  excludeIngredients: string[];
  onCostingModeChange: (mode: 'package' | 'proportional') => void;
  onMealPlanChange: (count: number, types: string[]) => void;
  onIngredientsChange: (include: string[], exclude: string[]) => void;
  onAutoOptimize: () => void;
}
```

## Data Models

### Budget Model
```typescript
interface Budget {
  id: string;
  userId: string;
  weeklyBudget: number;
  monthlyBudget: number;
  rolloverEnabled: boolean;
  startDate: Date;
  endDate: Date;
  currentSpend: number;
  projectedSpend: {
    amount: number;
    range?: { min: number; max: number };
    confidence: number; // 0-1
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### Savings Analysis Model
```typescript
interface SavingsAnalysis {
  totalSavingsAvailable: number;
  opportunities: SavingsOpportunity[];
  confidence: {
    pricedIngredients: number;
    totalIngredients: number;
    estimatedItems: number;
    level: 'high' | 'medium' | 'low';
  };
  breakdown: {
    swapSavings: number;
    recipeSavings: number;
    storeSavings: number;
  };
}
```

### Activity Feed Model
```typescript
interface ActivityItem {
  id: string;
  type: 'swap' | 'recipe_replace' | 'budget_met' | 'pricing_update';
  title: string;
  description: string;
  savings?: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}
```

## Integration Patterns

### Meal Planner Integration
```typescript
// Deep linking to meal planner with context
const navigateToMealPlanner = (context: {
  recipeId?: string;
  ingredientId?: string;
  action: 'swap' | 'replace' | 'edit';
}) => {
  router.push(`/meal-plans?${new URLSearchParams(context)}`);
};

// Real-time data sync
const useBudgetMealPlanSync = () => {
  const { recipes, pricing } = useMealPlanData();
  const { budget, updateBudget } = useBudgetData();
  
  useEffect(() => {
    const projectedSpend = calculateProjectedSpend(recipes, pricing);
    updateBudget({ projectedSpend });
  }, [recipes, pricing]);
};
```

### Shopping List Integration
```typescript
// Shopping list impact calculation
const calculateShoppingImpact = (
  recipes: Recipe[],
  shoppingList: ShoppingList
) => {
  const pantryItems = shoppingList.items.filter(item => 
    item.status === 'already-have'
  );
  
  const remainingSpend = recipes.reduce((total, recipe) => {
    return total + recipe.ingredients
      .filter(ing => !pantryItems.some(p => p.name === ing.name))
      .reduce((sum, ing) => sum + (ing.krogerPrice?.totalCost || 0), 0);
  }, 0);
  
  return { remainingSpend, pantryItems };
};
```

## Performance Considerations

### Caching Strategy
- **Budget calculations**: Cache for 5 minutes
- **Savings analysis**: Cache for 10 minutes
- **Pricing data**: Use existing Kroger API cache
- **Activity feed**: Cache recent items, paginate older ones

### Real-time Updates
- **WebSocket connection**: For real-time pricing updates
- **Optimistic updates**: Immediate UI feedback for user actions
- **Background sync**: Periodic refresh of stale data
- **Error recovery**: Graceful handling of failed updates

### Loading States
- **Skeleton screens**: For initial page load
- **Progressive loading**: Load cards as data becomes available
- **Inline loading**: For individual actions and updates
- **Error boundaries**: Graceful degradation for failed components

## Accessibility Features

### Screen Reader Support
- **ARIA labels**: All interactive elements properly labeled
- **Live regions**: Dynamic content updates announced
- **Semantic HTML**: Proper heading hierarchy and landmarks
- **Focus management**: Logical tab order and focus indicators

### Keyboard Navigation
- **Tab order**: Logical flow through all interactive elements
- **Keyboard shortcuts**: Quick access to common actions
- **Escape handling**: Close modals and cancel actions
- **Enter/Space**: Activate buttons and links

### Visual Accessibility
- **High contrast**: 4.5:1 minimum contrast ratios
- **Color independence**: Information not conveyed by color alone
- **Scalable text**: Readable at 200% zoom
- **Focus indicators**: Clear visual focus states

## Mobile Responsiveness

### Breakpoints
- **Mobile**: < 768px - Single column layout
- **Tablet**: 768px - 1024px - Two column layout
- **Desktop**: > 1024px - Full grid layout

### Touch Interactions
- **Button sizes**: Minimum 44px touch targets
- **Swipe gestures**: Navigate between sections
- **Pull to refresh**: Update budget data
- **Long press**: Access additional options

### Mobile-Specific Features
- **Sticky header**: Budget overview always visible
- **Collapsible sections**: Expandable detail areas
- **Bottom sheet**: Modal actions slide up from bottom
- **Native feel**: iOS/Android appropriate interactions