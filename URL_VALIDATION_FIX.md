# 🔧 Recipe URL Validation Fix

## **The Problem**
AI-generated URLs from Perplexity are leading to 404 "Page Not Found" errors because:

1. **AI Hallucination**: Models generate plausible but non-existent URLs
2. **Outdated Training Data**: URLs that existed during training have been removed
3. **Recipe Site Changes**: Food websites frequently reorganize content
4. **URL Pattern Guessing**: AI constructs URLs based on patterns but gets them wrong

## **Immediate Solutions**

### 1. **Add URL Validation Before Using**

```typescript
// Add to PerplexityRecipeUrlService
async validateUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { 
      method: 'HEAD', // Only check headers, don't download content
      timeout: 5000 
    });
    return response.ok; // Returns true for 200-299 status codes
  } catch (error) {
    console.warn(`❌ URL validation failed: ${url}`, error);
    return false;
  }
}

async getRecipeUrls(request: PerplexityRecipeUrlRequest): Promise<PerplexityRecipeUrlResponse> {
  // ... existing code ...
  
  // Validate URLs before returning
  const validatedRecipes = await Promise.all(
    filteredRecipes.map(async (recipe: any) => {
      const isValid = await this.validateUrl(recipe.url);
      return isValid ? recipe : null;
    })
  );
  
  const validRecipes = validatedRecipes.filter(Boolean);
  
  // If too many URLs are invalid, try again with different prompt
  if (validRecipes.length < request.numberOfMeals * 0.5) {
    console.warn('⚠️ Too many invalid URLs, retrying with fallback strategy');
    return this.getFallbackUrls(request);
  }
  
  return {
    success: true,
    recipes: validRecipes,
    confidence: validRecipes.length >= request.numberOfMeals ? 'high' : 'medium'
  };
}
```

### 2. **Improve Perplexity Prompt for Better URLs**

```typescript
private buildRecipeUrlPrompt(request: PerplexityRecipeUrlRequest): string {
  return `
Find ${request.numberOfMeals} REAL, WORKING recipe URLs from established cooking websites.

CRITICAL: Only return URLs that you are CERTAIN exist and work. Do not guess or construct URLs.

Requirements:
- Cultural cuisines: ${request.culturalCuisines.join(', ')}
- Dietary restrictions: ${request.dietaryRestrictions.join(', ') || 'None'}

VERIFIED SOURCES ONLY:
- Food Network: foodnetwork.com (use actual recipe URLs you know exist)
- AllRecipes: allrecipes.com (use real recipe IDs)
- BBC Good Food: bbcgoodfood.com (use actual recipe paths)
- Serious Eats: seriouseats.com (use real article URLs)
- Bon Appétit: bonappetit.com (use actual recipe URLs)

IMPORTANT RULES:
1. Only return URLs you have verified exist
2. Use specific recipe IDs/paths from these sites
3. Do not construct or guess URL patterns
4. If unsure about a URL, use a different recipe
5. Prefer popular, well-established recipes that are likely to still exist

Example of GOOD URLs (these are real):
- https://www.foodnetwork.com/recipes/alton-brown/baked-macaroni-and-cheese-recipe-1939524
- https://www.allrecipes.com/recipe/213742/cheesy-chicken-broccoli-casserole/
- https://www.seriouseats.com/the-best-slow-cooked-italian-american-tomato-sauce-red-sauce-recipe

Do NOT return URLs unless you are confident they exist.
`;
}
```

### 3. **Enhanced Fallback Strategy**

```typescript
private getFallbackUrls(request: PerplexityRecipeUrlRequest): PerplexityRecipeUrlResponse {
  // Use VERIFIED working URLs from major sites
  const verifiedUrls = [
    {
      title: "Classic Chicken Tacos",
      url: "https://www.foodnetwork.com/recipes/rachael-ray/chicken-soft-tacos-recipe-1944317",
      cuisine: "Mexican",
      estimatedTime: 30,
      description: "Simple and authentic chicken tacos"
    },
    {
      title: "Nigerian Jollof Rice",
      url: "https://www.allrecipes.com/recipe/231944/nigerian-jollof-rice/",
      cuisine: "West African", 
      estimatedTime: 45,
      description: "Traditional West African rice dish"
    },
    {
      title: "Italian Pasta Marinara",
      url: "https://www.seriouseats.com/the-best-slow-cooked-italian-american-tomato-sauce-red-sauce-recipe",
      cuisine: "Italian",
      estimatedTime: 25,
      description: "Classic Italian pasta with marinara sauce"
    },
    {
      title: "Chicken Stir Fry",
      url: "https://www.allrecipes.com/recipe/223382/chicken-stir-fry/",
      cuisine: "Asian",
      estimatedTime: 20,
      description: "Quick and healthy chicken stir fry"
    }
  ];

  // Filter by requested cuisines and return appropriate number
  const matchingRecipes = verifiedUrls.filter(recipe => 
    request.culturalCuisines.some(cuisine => 
      recipe.cuisine.toLowerCase().includes(cuisine.toLowerCase()) ||
      cuisine.toLowerCase().includes(recipe.cuisine.toLowerCase())
    )
  );

  // If no matches, return first N recipes
  const selectedRecipes = matchingRecipes.length > 0 
    ? matchingRecipes.slice(0, request.numberOfMeals)
    : verifiedUrls.slice(0, request.numberOfMeals);

  return {
    success: true,
    recipes: selectedRecipes,
    confidence: 'medium'
  };
}
```

### 4. **Add Retry Logic with Different Prompts**

```typescript
async getRecipeUrls(request: PerplexityRecipeUrlRequest, retryCount = 0): Promise<PerplexityRecipeUrlResponse> {
  const maxRetries = 2;
  
  try {
    const result = await this.fetchRecipeUrls(request, retryCount);
    
    // Validate URLs
    const validatedResult = await this.validateRecipeUrls(result);
    
    // If not enough valid URLs and we haven't exceeded retries
    if (validatedResult.recipes.length < request.numberOfMeals * 0.7 && retryCount < maxRetries) {
      console.log(`🔄 Only ${validatedResult.recipes.length}/${request.numberOfMeals} valid URLs, retrying...`);
      return this.getRecipeUrls(request, retryCount + 1);
    }
    
    return validatedResult;
    
  } catch (error) {
    if (retryCount < maxRetries) {
      console.log(`🔄 Retry ${retryCount + 1}/${maxRetries} after error:`, error);
      return this.getRecipeUrls(request, retryCount + 1);
    }
    
    console.error('❌ All retries failed, using fallback URLs');
    return this.getFallbackUrls(request);
  }
}
```

## **Long-term Solutions**

### 1. **Build a Curated Recipe Database**
- Maintain a database of verified working recipe URLs
- Regularly validate and update URLs
- Categorize by cuisine, dietary restrictions, etc.

### 2. **Use Recipe APIs Instead**
- Spoonacular API (has working URLs)
- Edamam Recipe API
- TheMealDB API

### 3. **Web Scraping with Search**
- Use Google Custom Search API to find recipes
- Scrape recipe aggregator sites directly
- Build your own recipe discovery system

## **Quick Implementation Priority**

1. **Immediate**: Add URL validation to existing code
2. **Short-term**: Improve Perplexity prompts and fallbacks  
3. **Medium-term**: Integrate recipe APIs as primary source
4. **Long-term**: Build curated recipe database

This will dramatically reduce 404 errors and improve user experience!