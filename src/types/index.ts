// Core user and profile types
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  location: {
    zipCode: string;
    city: string;
    state: string;
  };
  preferences: {
    languages: string[];
    primaryLanguage: string;
    culturalCuisines: string[];
    dietaryRestrictions: string[];
    allergies: string[];
    dislikes: string[];
    preferFreshProduce?: boolean;
  };
  budget: {
    monthlyLimit: number;
    householdSize: number;
    shoppingFrequency: 'weekly' | 'biweekly' | 'monthly';
  };
  nutritionalGoals: {
    calorieTarget: number;
    macroTargets: {
      protein: number;
      carbs: number;
      fat: number;
    };
    healthGoals: string[];
    activityLevel: string;
  };
  cookingProfile: {
    skillLevel: 'beginner' | 'intermediate' | 'advanced';
    availableTime: number;
    equipment: string[];
    mealPrepPreference: boolean;
  };
  savedStores: SavedStore[];
  createdAt: Date;
  updatedAt: Date;
}

// Recipe and ingredient types
export interface Recipe {
  id: string;
  title: string;
  description: string;
  culturalOrigin: string[];
  cuisine: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  nutritionalInfo: NutritionalInfo;
  costAnalysis: CostAnalysis;
  metadata: {
    servings: number;
    prepTime: number;
    cookTime: number;
    totalTime: number;
    difficulty: 'easy' | 'medium' | 'hard';
    culturalAuthenticity: number; // 1-10 scale
    imageUrl?: string; // optional image proxy URL or direct
    sourceUrl?: string; // original source link when imported
  };
  tags: string[];
  source: 'user' | 'spoonacular' | 'community';
  authorId?: string;
  ratings: Rating[];
  reviews: Review[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Ingredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
  culturalName?: string;
  substitutes: IngredientSubstitute[];
  costPerUnit: number;
  availability: StoreAvailability[];
  culturalSignificance?: string;
  notes?: string;
  weightGrams?: number;
  wholeEquivalent?: string;
}

export interface Instruction {
  step: number;
  description: string;
  culturalTechnique?: string;
  estimatedTime?: number;
}

// Enhanced instruction interface for detailed, beginner-friendly recipes
export interface EnhancedInstruction {
  step: number;
  title?: string;                    // Short description: "Prepare vegetables"
  text: string;                     // Detailed instruction (maps to description)
  timing?: {
    duration: number;               // Time in minutes
    isActive: boolean;              // Active vs. passive time
    description?: string;           // "Let simmer", "Prep while cooking"
  };
  temperature?: {
    value: number;                  // Temperature value
    unit: 'F' | 'C';               // Fahrenheit or Celsius
    type: 'oven' | 'stovetop' | 'oil' | 'water'; // Where to apply temperature
  };
  equipment?: string[];             // Required tools for this step
  visualCues?: string[];            // What to look for: "golden brown", "bubbling"
  tips?: string[];                  // Beginner tips and troubleshooting
  techniques?: {                    // Cooking techniques explained
    name: string;                   // "sauté", "fold", "whisk"
    description: string;            // How to perform the technique
  }[];
  warnings?: string[];              // Safety warnings or common mistakes
  ingredients?: string[];           // Ingredients used in this step
  servingNote?: string;             // Notes specific to this step
  culturalTechnique?: string;       // Inherited from basic Instruction
  estimatedTime?: number;           // Inherited from basic Instruction
}

// Budget and cost types
export interface BudgetTracker {
  id: string;
  userId: string;
  period: 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  budgetLimit: number;
  currentSpending: number;
  categories: {
    produce: number;
    meat: number;
    dairy: number;
    pantry: number;
    specialty: number;
  };
  transactions: Transaction[];
  alerts: BudgetAlert[];
  projectedSpending: number;
  savingsAchieved: number;
}

export interface CostAnalysis {
  totalCost: number;
  costPerServing: number;
  storeComparison: StorePrice[];
  seasonalTrends: PriceTrend[];
  bulkBuyingOpportunities: BulkOpportunity[];
  couponSavings: CouponSaving[];
  alternativeIngredients: CostAlternative[];
}

// Meal planning types
export interface MealPlan {
  id: string;
  userId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  meals: PlannedMeal[];
  totalCost: number;
  nutritionalSummary: NutritionalSummary;
  culturalBalance: CulturalBalance;
  shoppingList: ShoppingList;
  leftoverPlan: LeftoverUtilization[];
  generatedBy: 'ai' | 'user';
  preferences: MealPlanPreferences;
}

export interface PlannedMeal {
  date: Date;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipeId: string;
  servings: number;
  scaledIngredients: Ingredient[];
  estimatedCost: number;
  culturalContext?: string;
}

// Shopping and store types
export interface ShoppingList {
  id: string;
  userId: string;
  mealPlanId?: string;
  name: string;
  items: ShoppingItem[];
  totalEstimatedCost: number;
  storeRecommendations: StoreRecommendation[];
  couponsAvailable: Coupon[];
  generatedAt: Date;
  completedAt?: Date;
  actualCost?: number;
}

export interface ShoppingItem {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  estimatedPrice: number;
  storeAvailability: StoreAvailability[];
  isChecked: boolean;
  actualPrice?: number;
  notes?: string;
  culturalAlternatives?: string[];
}

export interface SavedStore {
  id: string;
  storeName: string;
  storeType: string;
  address: string;
  googlePlaceId?: string;
  specialties: string[];
  notes?: string;
  rating?: number;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Cultural and authenticity types
export interface CulturalBalance {
  authenticity: number; // 0-1 scale
  cuisineDistribution: Record<string, number>;
  traditionalTechniques: string[];
  culturalSignificance: string;
}

export interface CulturalAuthenticity {
  level: 'traditional' | 'adapted' | 'inspired' | 'fusion';
  culturalOrigin: string[];
  traditionalIngredients: string[];
  adaptations: {
    ingredient: string;
    reason: 'dietary' | 'availability' | 'cost' | 'preference';
    culturalImpact: 'minimal' | 'moderate' | 'significant';
    explanation: string;
  }[];
  culturalContext: string;
  ceremonialSignificance?: string;
}

// API response types
export interface APIResponse<T> {
  data?: T;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  cached?: boolean;
  timestamp: Date;
}

// Utility types
export interface IngredientSubstitute {
  ingredient: string;
  ratio: number;
  culturalImpact: 'minimal' | 'moderate' | 'significant';
  costDifference: number;
}

export interface StoreAvailability {
  storeId: string;
  storeName: string;
  available: boolean;
  price: number;
  unit: string;
  lastUpdated: Date;
}

export interface NutritionalInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  vitamins: Record<string, number>;
  minerals: Record<string, number>;
}

export interface Rating {
  userId: string;
  rating: number;
  costRating: number;
  authenticityRating: number;
  createdAt: Date;
}

export interface Review {
  userId: string;
  userName: string;
  review: string;
  rating: number;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  budgetPeriodId: string;
  shoppingListId?: string;
  storeName: string;
  storeId?: string;
  amount: number;
  items: any[];
  transactionDate: Date;
  createdAt: Date;
}

export interface BudgetAlert {
  type: 'warning' | 'limit' | 'exceeded';
  message: string;
  threshold: number;
  currentAmount: number;
  createdAt: Date;
}

export interface StorePrice {
  storeId: string;
  storeName: string;
  price: number;
  distance: number;
  savings: number;
}

export interface PriceTrend {
  ingredient: string;
  historicalPrices: { date: Date; price: number }[];
  trend: 'increasing' | 'decreasing' | 'stable';
  optimalBuyingTime?: Date;
}

export interface BulkOpportunity {
  ingredient: string;
  bulkSize: number;
  bulkPrice: number;
  unitSavings: number;
  expirationConsideration: string;
}

export interface CouponSaving {
  couponId: string;
  savings: number;
  applicableItems: string[];
}

export interface CostAlternative {
  originalIngredient: string;
  alternative: string;
  costSavings: number;
  culturalImpact: 'minimal' | 'moderate' | 'significant';
}

export interface StoreRecommendation {
  storeId: string;
  storeName: string;
  estimatedTotal: number;
  distance: number;
  specialtyItems: string[];
  reasoning: string;
}

export interface Coupon {
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

export interface NutritionalSummary {
  totalCalories: number;
  averageCaloriesPerMeal: number;
  macroBreakdown: {
    protein: number;
    carbs: number;
    fat: number;
  };
  goalProgress: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface LeftoverUtilization {
  originalMeal: string;
  leftoverAmount: number;
  suggestedUse: string;
  newRecipeId?: string;
  culturalTradition?: string;
}

export interface MealPlanPreferences {
  culturalCuisines: string[];
  dietaryRestrictions: string[];
  budgetConstraints: {
    maxDailySpend: number;
    maxWeeklySpend: number;
  };
  cookingTime: {
    weekday: number;
    weekend: number;
  };
  mealTypes: ('breakfast' | 'lunch' | 'dinner' | 'snack')[];
}

// Cultural theme types
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  gradient: string[];
  // Background colors
  background: string;
  surface: string;
  card: string;
  // Text colors
  foreground: string;
  muted: string;
  // Border and divider colors
  border: string;
  ring: string;
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface CulturalTheme {
  id: string;
  name: string;
  displayName: string;
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
  patterns: {
    background: string;
    accent: string;
  };
  typography: {
    heading: string;
    body: string;
  };
  culturalElements: {
    cuisine: string[];
    traditions: string[];
    ingredients: string[];
  };
}

export interface ThemePreferences {
  culturalTheme: string;
  mode: ThemeMode;
  highContrast: boolean;
  reducedMotion: boolean;
}

export interface ThemeContextType {
  currentTheme: CulturalTheme;
  currentMode: ThemeMode;
  resolvedMode: 'light' | 'dark'; // The actual mode being used (system resolved)
  preferences: ThemePreferences;
  availableThemes: CulturalTheme[];
  setTheme: (themeId: string) => void;
  setMode: (mode: ThemeMode) => void;
  setPreferences: (preferences: Partial<ThemePreferences>) => void;
  isLoading: boolean;
}
