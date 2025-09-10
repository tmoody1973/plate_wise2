/**
 * Database Types for PlateWise Meal Planning
 * Auto-generated from Supabase schema
 */

export interface Database {
  public: {
    Tables: {
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          preferred_cuisines: string[];
          dietary_restrictions: string[];
          default_budget: number;
          household_size: number;
          zip_code: string | null;
          preferred_stores: string[];
          cultural_background: string[];
          allergies: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          preferred_cuisines?: string[];
          dietary_restrictions?: string[];
          default_budget?: number;
          household_size?: number;
          zip_code?: string | null;
          preferred_stores?: string[];
          cultural_background?: string[];
          allergies?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          preferred_cuisines?: string[];
          dietary_restrictions?: string[];
          default_budget?: number;
          household_size?: number;
          zip_code?: string | null;
          preferred_stores?: string[];
          cultural_background?: string[];
          allergies?: string[];
          created_at?: string;
          updated_at?: string;
        };
      };
      meal_plans: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          cultural_cuisines: string[];
          dietary_restrictions: string[];
          budget_limit: number;
          household_size: number;
          zip_code: string | null;
          time_frame: string;
          nutritional_goals: string[];
          exclude_ingredients: string[];
          status: string;
          total_cost: number;
          cost_per_serving: number;
          budget_utilization: number;
          has_pricing: boolean;
          recipe_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          cultural_cuisines?: string[];
          dietary_restrictions?: string[];
          budget_limit: number;
          household_size?: number;
          zip_code?: string | null;
          time_frame?: string;
          nutritional_goals?: string[];
          exclude_ingredients?: string[];
          status?: string;
          total_cost?: number;
          cost_per_serving?: number;
          budget_utilization?: number;
          has_pricing?: boolean;
          recipe_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          cultural_cuisines?: string[];
          dietary_restrictions?: string[];
          budget_limit?: number;
          household_size?: number;
          zip_code?: string | null;
          time_frame?: string;
          nutritional_goals?: string[];
          exclude_ingredients?: string[];
          status?: string;
          total_cost?: number;
          cost_per_serving?: number;
          budget_utilization?: number;
          has_pricing?: boolean;
          recipe_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      recipes: {
        Row: {
          id: string;
          meal_plan_id: string;
          title: string;
          description: string | null;
          cultural_origin: string[];
          cuisine: string;
          source: string;
          source_url: string | null;
          image_url: string | null;
          servings: number;
          prep_time: number;
          cook_time: number;
          total_time: number;
          difficulty: string;
          cultural_authenticity: string;
          instructions: any; // JSONB
          tags: string[];
          has_pricing: boolean;
          total_cost: number;
          cost_per_serving: number;
          budget_friendly: boolean;
          savings_opportunities: string[];
          kroger_store_location: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          meal_plan_id: string;
          title: string;
          description?: string | null;
          cultural_origin?: string[];
          cuisine?: string;
          source?: string;
          source_url?: string | null;
          image_url?: string | null;
          servings?: number;
          prep_time?: number;
          cook_time?: number;
          total_time?: number;
          difficulty?: string;
          cultural_authenticity?: string;
          instructions?: any;
          tags?: string[];
          has_pricing?: boolean;
          total_cost?: number;
          cost_per_serving?: number;
          budget_friendly?: boolean;
          savings_opportunities?: string[];
          kroger_store_location?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          meal_plan_id?: string;
          title?: string;
          description?: string | null;
          cultural_origin?: string[];
          cuisine?: string;
          source?: string;
          source_url?: string | null;
          image_url?: string | null;
          servings?: number;
          prep_time?: number;
          cook_time?: number;
          total_time?: number;
          difficulty?: string;
          cultural_authenticity?: string;
          instructions?: any;
          tags?: string[];
          has_pricing?: boolean;
          total_cost?: number;
          cost_per_serving?: number;
          budget_friendly?: boolean;
          savings_opportunities?: string[];
          kroger_store_location?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      recipe_ingredients: {
        Row: {
          id: string;
          recipe_id: string;
          name: string;
          amount: string;
          unit: string;
          original_name: string;
          is_substituted: boolean;
          user_status: string;
          specialty_store: string | null;
          kroger_product_id: string | null;
          kroger_product_name: string | null;
          kroger_price: number | null;
          kroger_unit_price: number | null;
          kroger_confidence: string | null;
          kroger_store_location: string | null;
          kroger_brand: string | null;
          kroger_size: string | null;
          on_sale: boolean;
          sale_price: number | null;
          alternatives: any; // JSONB
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          name: string;
          amount?: string;
          unit?: string;
          original_name: string;
          is_substituted?: boolean;
          user_status?: string;
          specialty_store?: string | null;
          kroger_product_id?: string | null;
          kroger_product_name?: string | null;
          kroger_price?: number | null;
          kroger_unit_price?: number | null;
          kroger_confidence?: string | null;
          kroger_store_location?: string | null;
          kroger_brand?: string | null;
          kroger_size?: string | null;
          on_sale?: boolean;
          sale_price?: number | null;
          alternatives?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          recipe_id?: string;
          name?: string;
          amount?: string;
          unit?: string;
          original_name?: string;
          is_substituted?: boolean;
          user_status?: string;
          specialty_store?: string | null;
          kroger_product_id?: string | null;
          kroger_product_name?: string | null;
          kroger_price?: number | null;
          kroger_unit_price?: number | null;
          kroger_confidence?: string | null;
          kroger_store_location?: string | null;
          kroger_brand?: string | null;
          kroger_size?: string | null;
          on_sale?: boolean;
          sale_price?: number | null;
          alternatives?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      shopping_lists: {
        Row: {
          id: string;
          meal_plan_id: string;
          user_id: string;
          name: string;
          total_estimated_cost: number;
          store_breakdown: any; // JSONB
          status: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          meal_plan_id: string;
          user_id: string;
          name: string;
          total_estimated_cost?: number;
          store_breakdown?: any;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          meal_plan_id?: string;
          user_id?: string;
          name?: string;
          total_estimated_cost?: number;
          store_breakdown?: any;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      shopping_list_items: {
        Row: {
          id: string;
          shopping_list_id: string;
          ingredient_name: string;
          total_amount: string | null;
          estimated_cost: number;
          store: string | null;
          category: string | null;
          recipes: string[];
          kroger_product_id: string | null;
          is_purchased: boolean;
          actual_cost: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shopping_list_id: string;
          ingredient_name: string;
          total_amount?: string | null;
          estimated_cost?: number;
          store?: string | null;
          category?: string | null;
          recipes?: string[];
          kroger_product_id?: string | null;
          is_purchased?: boolean;
          actual_cost?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shopping_list_id?: string;
          ingredient_name?: string;
          total_amount?: string | null;
          estimated_cost?: number;
          store?: string | null;
          category?: string | null;
          recipes?: string[];
          kroger_product_id?: string | null;
          is_purchased?: boolean;
          actual_cost?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      recipe_collections: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          is_public: boolean;
          cultural_theme: string | null;
          tags: string[];
          recipe_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          is_public?: boolean;
          cultural_theme?: string | null;
          tags?: string[];
          recipe_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          is_public?: boolean;
          cultural_theme?: string | null;
          tags?: string[];
          recipe_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      collection_recipes: {
        Row: {
          collection_id: string;
          recipe_id: string;
          added_at: string;
          notes: string | null;
        };
        Insert: {
          collection_id: string;
          recipe_id: string;
          added_at?: string;
          notes?: string | null;
        };
        Update: {
          collection_id?: string;
          recipe_id?: string;
          added_at?: string;
          notes?: string | null;
        };
      };
      meal_plan_analytics: {
        Row: {
          id: string;
          meal_plan_id: string;
          user_id: string;
          event_type: string;
          event_data: any; // JSONB
          cultural_cuisines: string[];
          budget_range: string | null;
          success_metrics: any; // JSONB
          created_at: string;
        };
        Insert: {
          id?: string;
          meal_plan_id: string;
          user_id: string;
          event_type: string;
          event_data?: any;
          cultural_cuisines?: string[];
          budget_range?: string | null;
          success_metrics?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          meal_plan_id?: string;
          user_id?: string;
          event_type?: string;
          event_data?: any;
          cultural_cuisines?: string[];
          budget_range?: string | null;
          success_metrics?: any;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Helper types for common operations
export type MealPlan = Database['public']['Tables']['meal_plans']['Row'];
export type Recipe = Database['public']['Tables']['recipes']['Row'];
export type RecipeIngredient = Database['public']['Tables']['recipe_ingredients']['Row'];
export type UserPreferences = Database['public']['Tables']['user_preferences']['Row'];
export type ShoppingList = Database['public']['Tables']['shopping_lists']['Row'];
export type ShoppingListItem = Database['public']['Tables']['shopping_list_items']['Row'];
export type RecipeCollection = Database['public']['Tables']['recipe_collections']['Row'];
export type MealPlanAnalytics = Database['public']['Tables']['meal_plan_analytics']['Row'];

// Insert types
export type MealPlanInsert = Database['public']['Tables']['meal_plans']['Insert'];
export type RecipeInsert = Database['public']['Tables']['recipes']['Insert'];
export type RecipeIngredientInsert = Database['public']['Tables']['recipe_ingredients']['Insert'];
export type UserPreferencesInsert = Database['public']['Tables']['user_preferences']['Insert'];

// Update types
export type MealPlanUpdate = Database['public']['Tables']['meal_plans']['Update'];
export type RecipeUpdate = Database['public']['Tables']['recipes']['Update'];
export type RecipeIngredientUpdate = Database['public']['Tables']['recipe_ingredients']['Update'];
export type UserPreferencesUpdate = Database['public']['Tables']['user_preferences']['Update'];