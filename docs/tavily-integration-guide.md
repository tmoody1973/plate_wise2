# Tavily Recipe Framework Integration Guide for PlateWise2

## 🎯 Overview

This comprehensive framework uses Tavily API to find individual recipes based on detailed user profiles and culinary preferences. It's designed specifically for PlateWise2's cultural intelligence and personalized meal planning features.

## 🏗️ Framework Architecture

```
User Profile Settings
        ↓
Profile-Aware Query Builder
        ↓
Multiple Tavily Searches
        ↓
Individual Recipe Filter
        ↓
Profile Matching & Scoring
        ↓
Recipe Validation & Enhancement
        ↓
Ranked Individual Recipes
```

## 📋 Key Features

### 🎭 **Cultural Intelligence**
- **Authenticity Levels**: Flexible, Moderate, Strict
- **Cultural Terms**: Cuisine-specific authentic language
- **Source Prioritization**: Cultural recipe sites naturally prioritized

### 🥗 **Dietary Compliance**
- **Restrictions**: Vegetarian, vegan, gluten-free, etc.
- **Allergies**: Automatic filtering and warnings
- **Nutritional Goals**: Protein, calories, low-fat, etc.

### 👨‍🍳 **Skill Adaptation**
- **Beginner**: Easy, simple, quick recipes
- **Intermediate**: Standard complexity
- **Advanced**: Gourmet, complex techniques

### ⏰ **Time Management**
- **Quick Meals**: 15-30 minute recipes
- **Meal Prep**: Batch cooking friendly
- **Time Constraints**: Respects user's available cooking time

## 🚀 Implementation Steps

### Step 1: Install the Framework

```bash
# Copy the framework to your project
cp tavily-recipe-framework.ts src/lib/external-apis/tavily-recipe-framework.ts
```

### Step 2: Environment Configuration

```env
# .env.local
TAVILY_API_KEY=your_tavily_api_key_here
```

### Step 3: Create API Route

```typescript
// src/app/api/recipes/profile-search/route.ts
import { TavilyRecipeFramework } from '@/lib/external-apis/tavily-recipe-framework';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { query, userProfile, mealType, maxResults } = await request.json();

    // Validate required fields
    if (!query || !userProfile) {
      return NextResponse.json({
        success: false,
        error: 'Query and user profile are required'
      }, { status: 400 });
    }

    // Initialize framework
    const framework = new TavilyRecipeFramework(process.env.TAVILY_API_KEY!);

    // Find recipes
    const recipes = await framework.findRecipes({
      query,
      userProfile,
      mealType,
      maxResults: maxResults || 10
    });

    // Calculate summary statistics
    const summary = {
      totalFound: recipes.length,
      averageProfileMatch: recipes.reduce((sum, r) => sum + r.profileMatch.overallScore, 0) / recipes.length,
      averageQuality: recipes.reduce((sum, r) => sum + r.qualityScore, 0) / recipes.length,
      verifiedRecipes: recipes.filter(r => r.isVerified).length,
      culturalMatches: recipes.filter(r => r.profileMatch.culturalScore > 0.7).length,
      dietaryCompliant: recipes.filter(r => r.profileMatch.dietaryScore > 0.8).length
    };

    return NextResponse.json({
      success: true,
      recipes,
      summary,
      searchMetadata: {
        query,
        mealType,
        userCuisines: userProfile.preferredCuisines,
        dietaryRestrictions: userProfile.dietaryRestrictions,
        skillLevel: userProfile.skillLevel
      }
    });

  } catch (error) {
    console.error('Profile recipe search error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
```

### Step 4: Frontend Integration

```typescript
// src/components/ProfileRecipeSearch.tsx
import { useState } from 'react';
import { UserProfile, IndividualRecipe } from '@/lib/external-apis/tavily-recipe-framework';

interface ProfileRecipeSearchProps {
  userProfile: UserProfile;
}

export function ProfileRecipeSearch({ userProfile }: ProfileRecipeSearchProps) {
  const [query, setQuery] = useState('');
  const [mealType, setMealType] = useState<string>('');
  const [recipes, setRecipes] = useState<IndividualRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  const searchRecipes = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/recipes/profile-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          userProfile,
          mealType: mealType || undefined,
          maxResults: 8
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setRecipes(result.recipes);
        setSummary(result.summary);
      } else {
        console.error('Recipe search failed:', result.error);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-recipe-search">
      <div className="search-controls">
        <div className="search-input-group">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What would you like to cook? (e.g., 'pasta dinner', 'healthy breakfast')"
            className="search-input"
            onKeyPress={(e) => e.key === 'Enter' && searchRecipes()}
          />
          
          <select
            value={mealType}
            onChange={(e) => setMealType(e.target.value)}
            className="meal-type-select"
          >
            <option value="">Any meal type</option>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="snack">Snack</option>
            <option value="dessert">Dessert</option>
          </select>
          
          <button 
            onClick={searchRecipes}
            disabled={loading || !query.trim()}
            className="search-button"
          >
            {loading ? 'Searching...' : 'Find Recipes'}
          </button>
        </div>

        {/* Profile Summary */}
        <div className="profile-summary">
          <div className="profile-tags">
            {userProfile.preferredCuisines.map(cuisine => (
              <span key={cuisine} className="tag cuisine-tag">{cuisine}</span>
            ))}
            {userProfile.dietaryRestrictions.map(restriction => (
              <span key={restriction} className="tag dietary-tag">{restriction}</span>
            ))}
            <span className="tag skill-tag">{userProfile.skillLevel}</span>
            <span className="tag time-tag">≤{userProfile.maxCookingTime}min</span>
          </div>
        </div>
      </div>

      {/* Search Summary */}
      {summary && (
        <div className="search-summary">
          <h3>Search Results Summary</h3>
          <div className="summary-stats">
            <div className="stat">
              <span className="stat-value">{summary.totalFound}</span>
              <span className="stat-label">Recipes Found</span>
            </div>
            <div className="stat">
              <span className="stat-value">{Math.round(summary.averageProfileMatch * 100)}%</span>
              <span className="stat-label">Avg Profile Match</span>
            </div>
            <div className="stat">
              <span className="stat-value">{summary.culturalMatches}</span>
              <span className="stat-label">Cultural Matches</span>
            </div>
            <div className="stat">
              <span className="stat-value">{summary.dietaryCompliant}</span>
              <span className="stat-label">Dietary Compliant</span>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Results */}
      <div className="recipe-results">
        {recipes.map((recipe, index) => (
          <div key={index} className="recipe-card">
            <div className="recipe-header">
              <h4 className="recipe-title">{recipe.title}</h4>
              <div className="recipe-meta">
                <span className="source">{recipe.sourceName}</span>
                <span className="confidence">
                  {Math.round(recipe.confidence * 100)}% match
                </span>
                {recipe.isVerified && <span className="verified">✓ Verified</span>}
              </div>
            </div>

            <p className="recipe-description">{recipe.description}</p>

            <div className="recipe-details">
              <div className="detail-item">
                <span className="label">Time:</span>
                <span className="value">{recipe.totalTime} min</span>
              </div>
              <div className="detail-item">
                <span className="label">Difficulty:</span>
                <span className="value">{recipe.difficulty}</span>
              </div>
              <div className="detail-item">
                <span className="label">Serves:</span>
                <span className="value">{recipe.servings}</span>
              </div>
            </div>

            {/* Profile Match Breakdown */}
            <div className="profile-match">
              <h5>Profile Match Breakdown</h5>
              <div className="match-scores">
                <div className="score-item">
                  <span className="score-label">Cultural:</span>
                  <div className="score-bar">
                    <div 
                      className="score-fill cultural"
                      style={{ width: `${recipe.profileMatch.culturalScore * 100}%` }}
                    ></div>
                  </div>
                  <span className="score-value">
                    {Math.round(recipe.profileMatch.culturalScore * 100)}%
                  </span>
                </div>
                
                <div className="score-item">
                  <span className="score-label">Dietary:</span>
                  <div className="score-bar">
                    <div 
                      className="score-fill dietary"
                      style={{ width: `${recipe.profileMatch.dietaryScore * 100}%` }}
                    ></div>
                  </div>
                  <span className="score-value">
                    {Math.round(recipe.profileMatch.dietaryScore * 100)}%
                  </span>
                </div>
                
                <div className="score-item">
                  <span className="score-label">Nutrition:</span>
                  <div className="score-bar">
                    <div 
                      className="score-fill nutrition"
                      style={{ width: `${recipe.profileMatch.nutritionScore * 100}%` }}
                    ></div>
                  </div>
                  <span className="score-value">
                    {Math.round(recipe.profileMatch.nutritionScore * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Matched Criteria */}
            {recipe.profileMatch.matchedCriteria.length > 0 && (
              <div className="matched-criteria">
                <h6>Matched Criteria:</h6>
                <div className="criteria-tags">
                  {recipe.profileMatch.matchedCriteria.map((criteria, idx) => (
                    <span 
                      key={idx} 
                      className={`criteria-tag ${criteria.startsWith('⚠️') ? 'warning' : 'success'}`}
                    >
                      {criteria}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="recipe-actions">
              <a 
                href={recipe.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="view-recipe-btn"
              >
                View Full Recipe
              </a>
              <button className="save-recipe-btn">
                Save to Meal Plan
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Step 5: User Profile Management

```typescript
// src/lib/user-profile-manager.ts
import { UserProfile } from './external-apis/tavily-recipe-framework';

export class UserProfileManager {
  
  /**
   * Create a user profile from PlateWise2 user data
   */
  static createFromPlateWiseUser(plateWiseUser: any): UserProfile {
    return {
      userId: plateWiseUser.id,
      name: plateWiseUser.name,
      
      // Cultural preferences
      culturalBackground: plateWiseUser.culturalBackground,
      preferredCuisines: plateWiseUser.preferredCuisines || [],
      culturalAuthenticityLevel: plateWiseUser.culturalAuthenticityLevel || 'moderate',
      
      // Dietary requirements
      dietaryRestrictions: plateWiseUser.dietaryRestrictions || [],
      allergies: plateWiseUser.allergies || [],
      nutritionalGoals: plateWiseUser.nutritionalGoals,
      
      // Cooking preferences
      skillLevel: plateWiseUser.skillLevel || 'intermediate',
      maxCookingTime: plateWiseUser.maxCookingTime || 45,
      preferredMealTypes: plateWiseUser.preferredMealTypes || ['breakfast', 'lunch', 'dinner'],
      
      // Lifestyle factors
      familySize: plateWiseUser.familySize || 1,
      budgetLevel: plateWiseUser.budgetLevel || 'medium',
      mealPrepPreference: plateWiseUser.mealPrepPreference || false,
      kitchenEquipment: plateWiseUser.kitchenEquipment || [],
      
      // Ingredient preferences
      favoriteIngredients: plateWiseUser.favoriteIngredients || [],
      dislikedIngredients: plateWiseUser.dislikedIngredients || [],
      seasonalPreference: plateWiseUser.seasonalPreference || false,
      
      // Special considerations
      healthConditions: plateWiseUser.healthConditions,
      fitnessGoals: plateWiseUser.fitnessGoals,
      sustainabilityFocus: plateWiseUser.sustainabilityFocus || false
    };
  }

  /**
   * Update profile based on user feedback and recipe interactions
   */
  static updateFromFeedback(profile: UserProfile, feedback: {
    likedRecipes: string[];
    dislikedRecipes: string[];
    preferredSources: string[];
    timeConstraints: number;
  }): UserProfile {
    // Implementation would analyze feedback and update profile
    // This is a simplified example
    
    return {
      ...profile,
      maxCookingTime: feedback.timeConstraints || profile.maxCookingTime,
      // Add logic to infer preferences from liked/disliked recipes
    };
  }
}
```

## 📊 Example Usage Scenarios

### Scenario 1: Italian Family Dinner

```typescript
const userProfile: UserProfile = {
  userId: 'family123',
  preferredCuisines: ['Italian'],
  culturalAuthenticityLevel: 'moderate',
  dietaryRestrictions: ['vegetarian'],
  allergies: ['nuts'],
  skillLevel: 'intermediate',
  maxCookingTime: 45,
  familySize: 4,
  budgetLevel: 'medium',
  favoriteIngredients: ['pasta', 'tomatoes', 'cheese'],
  dislikedIngredients: ['mushrooms']
};

// Search query: "pasta dinner"
// Expected results: Authentic Italian vegetarian pasta recipes, 
// nut-free, family-sized portions, moderate difficulty
```

### Scenario 2: Quick Healthy Breakfast

```typescript
const userProfile: UserProfile = {
  userId: 'fitness123',
  preferredCuisines: ['American', 'Mediterranean'],
  culturalAuthenticityLevel: 'flexible',
  skillLevel: 'beginner',
  maxCookingTime: 15,
  familySize: 1,
  mealPrepPreference: true,
  nutritionalGoals: {
    targetCalories: 400,
    proteinGoal: 25,
    highFiber: true
  },
  favoriteIngredients: ['oats', 'berries', 'protein powder'],
  fitnessGoals: ['muscle building']
};

// Search query: "protein breakfast"
// Expected results: Quick, high-protein breakfast recipes,
// meal-prep friendly, under 15 minutes
```

### Scenario 3: Budget Student Meals

```typescript
const userProfile: UserProfile = {
  userId: 'student123',
  preferredCuisines: ['American', 'Asian'],
  culturalAuthenticityLevel: 'flexible',
  skillLevel: 'beginner',
  maxCookingTime: 30,
  familySize: 1,
  budgetLevel: 'low',
  mealPrepPreference: true,
  favoriteIngredients: ['rice', 'chicken', 'vegetables'],
  kitchenEquipment: ['rice cooker', 'basic pots']
};

// Search query: "chicken rice bowl"
// Expected results: Budget-friendly, simple recipes,
// meal-prep suitable, basic equipment
```

## 🎯 Framework Benefits

### ✅ **Individual Recipe Focus**
- Filters out recipe collections and category pages
- Ensures each result is a complete, standalone recipe
- URL pattern recognition prevents 404 errors

### ✅ **Deep Profile Matching**
- Multi-dimensional scoring (cultural, dietary, nutrition, difficulty, time)
- Weighted scoring based on user priorities
- Detailed match explanations for transparency

### ✅ **Cultural Intelligence**
- Authentic cuisine terminology
- Cultural source prioritization
- Authenticity level customization

### ✅ **Adaptive Learning**
- Profile updates based on user feedback
- Recipe interaction tracking
- Preference refinement over time

### ✅ **Quality Assurance**
- URL validation and verification
- Source quality scoring
- Content quality analysis

## 📈 Performance Metrics

Track these metrics to monitor framework performance:

```typescript
interface FrameworkMetrics {
  searchSuccessRate: number;        // % of successful searches
  individualRecipeRate: number;     // % of results that are individual recipes
  averageProfileMatch: number;      // Average profile matching score
  averageQualityScore: number;      // Average recipe quality score
  urlValidationRate: number;        // % of working URLs
  userSatisfactionScore: number;    // Based on user feedback
  culturalAuthenticityRate: number; // % of culturally authentic results
  dietaryComplianceRate: number;    // % of dietary-compliant results
}
```

## 🔧 Configuration Options

```typescript
// Framework configuration
const frameworkConfig = {
  maxSearchQueries: 8,              // Max parallel searches per request
  searchTimeout: 30000,             // Timeout per search (ms)
  urlValidationTimeout: 5000,       // URL validation timeout (ms)
  minConfidenceScore: 0.3,          // Minimum recipe confidence
  maxResults: 20,                   // Maximum results to return
  enableUrlValidation: true,        // Enable URL validation
  enableContentAnalysis: true,      // Enable content quality analysis
  culturalWeighting: 0.25,          // Cultural match weight
  dietaryWeighting: 0.30,           // Dietary match weight
  nutritionWeighting: 0.20,         // Nutrition match weight
  difficultyWeighting: 0.15,        // Difficulty match weight
  timeWeighting: 0.10               // Time match weight
};
```

This framework provides PlateWise2 with a powerful, culturally-intelligent recipe discovery system that finds individual recipes perfectly matched to each user's unique profile and preferences! 🍽️

