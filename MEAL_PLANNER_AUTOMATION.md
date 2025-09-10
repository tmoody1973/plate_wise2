# Meal Planner Automation Setup

## Overview

This setup provides automated meal plan generation whenever you save changes to `data/plan-request.json`. The system respects cultural preferences, dietary restrictions, and generates culturally authentic recipes using **Perplexity AI for real recipe discovery**.

## 🎉 Stage 1 Complete: Perplexity AI Integration

**What's Working Now:**
- ✅ **Real Recipe URLs**: Perplexity AI discovers authentic recipes from reputable cooking websites
- ✅ **Cultural Intelligence**: Respects Mexican, West African, and other cultural cuisines
- ✅ **Dietary Compliance**: Automatically filters for halal-friendly, vegetarian, vegan, etc.
- ✅ **Quality Sources**: Finds recipes from Food Network, AllRecipes, cultural food blogs, etc.
- ✅ **Structured Output**: Reliable JSON schema for consistent recipe metadata

**Example Results:**
- "Spicy Mexican Rice and Beans Recipe" from Elizabeth's Kitchen Diary
- "Jollof Rice (West African One-Pot Rice)" from The Spruce Eats
- "Mexican Rice with Black Beans and Corn" from The Black Peppercorn

## How It Works

### 1. File Save Trigger
- When you save `data/plan-request.json`, the Kiro hook automatically triggers
- Debounced by 2 seconds to handle rapid saves
- Only one instance runs at a time (queued if multiple saves occur)

### 2. Meal Plan Generation
- Runs: `npm run plan:dev`
- Executes: `tsx src/lib/meal-planning/clean-meal-planner.ts --in data/plan-request.json --out data/plan.json`
- Uses environment variables: `PERPLEXITY_API_KEY` and `WEBSCRAPING_AI_API_KEY`

### 3. Results Display
- Shows meal plan summary with costs and cultural information
- Opens `data/plan.json` for review
- Displays any errors if generation fails

## Request Format

The `data/plan-request.json` file supports these properties:

```json
{
  "mealsTarget": 4,                           // Number of meals to generate
  "dietFlags": ["halal_friendly"],            // Dietary restrictions
  "cultureTags": ["Mexican", "West African"], // Cultural cuisines
  "maxTime": 45,                             // Max cooking time (minutes)
  "pantry": ["rice", "onion", "beans"],      // Available pantry items
  "exclude": ["peanuts", "pork"]             // Ingredients to exclude
}
```

### Supported Diet Flags
- `halal_friendly` - Ensures no pork products
- `kosher` - Kosher dietary laws
- `vegetarian` - No meat products
- `vegan` - No animal products
- `dairy_free` - No dairy products
- `gluten_free` - No gluten-containing ingredients

### Supported Cultural Tags
- `Mexican` - Authentic Mexican cuisine
- `West African` - Traditional West African dishes
- `Italian` - Classic Italian recipes
- `Asian` - Various Asian cuisines
- `Mediterranean` - Mediterranean diet recipes
- `Indian` - Traditional Indian cuisine
- `Middle Eastern` - Middle Eastern flavors

## Cultural Intelligence Features

### Mexican Cuisine
- **Authentic Ingredients**: Chipotle peppers, Mexican crema, corn tortillas
- **Traditional Techniques**: Proper tinga preparation, authentic spice blends
- **Halal Adaptations**: Automatically substitutes pork-based ingredients

### West African Cuisine
- **Signature Dishes**: Jollof rice, traditional one-pot meals
- **Authentic Spices**: Scotch bonnet peppers, traditional seasonings
- **Cultural Techniques**: Proper rice preparation, spice layering

## Generated Output

The `data/plan.json` file contains:

```json
{
  "success": true,
  "recipes": [
    {
      "id": "cultural-recipe-1",
      "title": "Chicken Tinga Tacos (Meal 1)",
      "description": "Authentic Mexican shredded chicken...",
      "cuisine": "Mexican",
      "totalTimeMinutes": 40,
      "servings": 4,
      "ingredients": [...],
      "instructions": [...],
      "estimatedCost": 15.75,
      "costPerServing": 3.9375
    }
  ],
  "totalCost": 57.5,
  "confidence": "high"
}
```

## Files Created/Modified

### Core Files
- `src/lib/meal-planning/clean-meal-planner.ts` - Main meal planning logic
- `package.json` - Added `plan:dev` script and `tsx` dependency
- `data/plan-request.json` - Input configuration
- `data/plan.json` - Generated meal plan output

### Automation Files
- `.kiro/hooks/meal-plan-generator.json` - Kiro hook configuration
- `show-meal-plan-diff.js` - Displays meal plan summary
- `MEAL_PLANNER_AUTOMATION.md` - This documentation

## Usage Examples

### Change Number of Meals
```json
{
  "mealsTarget": 6,
  "cultureTags": ["Mexican", "West African"]
}
```

### Add Dietary Restrictions
```json
{
  "mealsTarget": 4,
  "dietFlags": ["halal_friendly", "dairy_free"],
  "cultureTags": ["Mexican", "West African"]
}
```

### Specify Pantry Items
```json
{
  "mealsTarget": 4,
  "cultureTags": ["Mexican", "West African"],
  "pantry": ["rice", "onion", "beans", "garlic", "olive oil"],
  "exclude": ["peanuts", "shellfish"]
}
```

## Troubleshooting

### Common Issues

1. **TypeScript Errors**: Ensure `tsx` is installed: `npm install tsx`
2. **Permission Errors**: Make sure the hook has proper file permissions
3. **API Key Issues**: Check that environment variables are set correctly

### Manual Testing
```bash
# Test the meal planner directly
npm run plan:dev

# View the results
node show-meal-plan-diff.js
```

### Debug Mode
The meal planner logs detailed information during execution:
- Request parsing and normalization
- Recipe query generation
- Cultural recipe selection
- Cost calculations

## Future Enhancements

### Stage 1: Perplexity Integration
- Real recipe URL discovery using Perplexity AI
- Structured JSON Schema outputs
- Cultural cuisine filtering

### Stage 2: WebScraping.AI Integration
- Extract complete recipe data from URLs
- Parse ingredients, instructions, and metadata
- Fallback to JSON-LD Recipe schema parsing

### Advanced Features
- Budget optimization across multiple stores
- Seasonal ingredient recommendations
- Nutritional analysis and balancing
- Shopping list generation with store mapping

## Cultural Authenticity

The system prioritizes cultural authenticity by:

1. **Ingredient Selection**: Using traditional ingredients specific to each cuisine
2. **Cooking Techniques**: Incorporating authentic preparation methods
3. **Dietary Adaptations**: Respectfully modifying recipes for dietary restrictions
4. **Cultural Context**: Providing background on traditional dishes and their significance

This ensures that budget optimization doesn't compromise the cultural integrity of traditional recipes.
## 🎉 
Stage 2 Complete: WebScraping.AI Integration Success!

### **What**: Real Recipe Data Extraction
Your PlateWise meal planner now extracts complete recipe data from the URLs discovered by Perplexity AI, providing real ingredients, instructions, and cooking details.

### **Why**: Complete Recipe Intelligence
This completes the two-stage pipeline: Perplexity discovers authentic recipe URLs, then WebScraping.AI extracts the complete recipe data. You now get real, cookable recipes with actual ingredients and step-by-step instructions.

### **How**: Robust Extraction Pipeline

**Stage 2 Implementation (✅ COMPLETED):**
1. **AI Fields Extraction**: Primary method using WebScraping.AI's AI-powered field extraction
2. **JSON-LD Fallback**: Secondary method parsing Schema.org Recipe markup (industry standard)
3. **Exponential Backoff**: Proper retry logic with jitter for rate limiting
4. **Graceful Degradation**: Falls back to generated recipes if extraction fails
5. **Industry Standards**: Leverages Schema.org and Open Graph protocols

### **Real Results You're Getting:**

**Complete Recipe Data:**
- **Real Ingredients**: "(15 oz) can of black beans, rinsed and drained", "uncooked long grain brown rice"
- **Real Instructions**: "Press the 'saute' button and once it is hot add the garlic and onions"
- **Timing Extraction**: "20 mins", "10 minutes" properly parsed from instructions
- **Source URLs**: Direct links to the actual recipe websites
- **Recipe Images**: Extracted from Open Graph metadata when available

**Example Success:**
- **Title**: "Instant Pot Rice and Beans"
- **Source**: "https://thebellyrulesthemind.net/instant-pot-rice-and-beans-recipe/"
- **Real Ingredients**: 12 actual ingredients with proper amounts and units
- **Real Instructions**: 6 step-by-step cooking instructions with timing

### **Technical Excellence:**

1. **Reliability**: Two-method extraction with smart fallbacks
2. **Performance**: Proper timeout handling (3s connect, 10s read)
3. **Resilience**: Exponential backoff with jitter for rate limits
4. **Standards**: Uses the same Schema.org markup that Google requires
5. **Maintainability**: Clean, focused functions vs. complex parsing logic

### **Complete Pipeline Working:**
- **Stage 1**: Perplexity AI → Real recipe URLs from authentic cooking websites ✅
- **Stage 2**: WebScraping.AI → Complete recipe data extraction ✅
- **Cultural Intelligence**: Respects Mexican, West African, and other cuisines ✅
- **Dietary Compliance**: Automatically filters for halal-friendly requirements ✅
- **Automatic Workflow**: Triggers on every save of `data/plan-request.json` ✅

Your meal planning system now provides a complete bridge from AI intelligence to authentic, cookable recipes with real ingredients and instructions!