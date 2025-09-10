# 🔍 Perplexity Citations Analysis

## **Current State**

Your Perplexity meal planner is calling the API with `return_citations: true` but **NOT extracting or using the citations**.

### **What's Happening Now:**
```typescript
// ✅ API call includes citations
const response = await fetch(this.baseURL, {
  body: JSON.stringify({
    model: 'sonar',
    messages: [...],
    return_citations: true  // ✅ This is set
  })
});

const data = await response.json();
const content = data.choices?.[0]?.message?.content || '';  // ❌ Only getting content

// ❌ Citations are ignored - they're in data.citations!
```

## **Perplexity Response Structure**

When `return_citations: true`, Perplexity returns:

```json
{
  "choices": [{
    "message": {
      "content": "Recipe suggestions with [1] and [2] references..."
    }
  }],
  "citations": [
    {
      "url": "https://www.foodnetwork.com/recipes/chicken-curry-recipe",
      "title": "Authentic Chicken Curry Recipe",
      "snippet": "This traditional chicken curry recipe..."
    },
    {
      "url": "https://www.allrecipes.com/recipe/indian-curry",
      "title": "Easy Indian Curry",
      "snippet": "A simple and delicious curry..."
    }
  ]
}
```

## **The Problem**

Your code is **missing the citations extraction**:

```typescript
// Current code - MISSING citations
const data = await response.json();
const content = data.choices?.[0]?.message?.content || '';
const concepts = this.parseRecipeConcepts(content, request.numberOfMeals);

// Should be:
const data = await response.json();
const content = data.choices?.[0]?.message?.content || '';
const citations = data.citations || [];  // ✅ Extract citations
```

## **How to Fix It**

### **1. Extract Citations from Response**

```typescript
// In perplexity-meal-planner.ts
const data = await response.json();
const content = data.choices?.[0]?.message?.content || '';
const citations = data.citations || [];

console.log('📚 Perplexity citations:', citations);

// Parse concepts AND match them with citations
const conceptsWithSources = this.parseRecipeConceptsWithSources(content, citations, request.numberOfMeals);
```

### **2. Match Citations to Recipe Concepts**

```typescript
private parseRecipeConceptsWithSources(
  content: string, 
  citations: any[], 
  numberOfMeals: number
): Array<{ concept: string; sourceUrl?: string; title?: string }> {
  const lines = content.split('\n').filter(line => line.trim());
  const conceptsWithSources: Array<{ concept: string; sourceUrl?: string; title?: string }> = [];

  for (const line of lines) {
    // Look for numbered lists with citation references [1], [2], etc.
    const match = line.match(/(?:\d+\.|\-|\*)\s*(.+?)(?:\s*\[(\d+)\])?/);
    if (match && match[1]) {
      const concept = match[1].trim();
      const citationIndex = match[2] ? parseInt(match[2]) - 1 : undefined;
      
      const citation = citationIndex !== undefined && citations[citationIndex] 
        ? citations[citationIndex] 
        : null;

      conceptsWithSources.push({
        concept,
        sourceUrl: citation?.url,
        title: citation?.title
      });
    }
  }

  return conceptsWithSources.slice(0, numberOfMeals);
}
```

### **3. Use Source URLs in Recipe Objects**

```typescript
// When creating MealPlanRecipe objects
return {
  id: `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  title: recipe.title,
  description: recipe.description,
  // ... other fields ...
  sourceUrl: conceptWithSource.sourceUrl || null,  // ✅ Use citation URL
  imageUrl: recipe.imageUrl
};
```

## **Benefits of Using Citations**

1. **Real Source URLs** - Get actual recipe website URLs from Perplexity's web search
2. **Better Attribution** - Proper credit to recipe sources
3. **Higher Quality** - Citations are from Perplexity's web crawling, not AI generation
4. **Reduced 404s** - Citations are from real, accessible web pages
5. **User Trust** - Users can see where recipes come from

## **Implementation Priority**

1. **High Priority**: Extract citations from Perplexity responses
2. **Medium Priority**: Match citations to recipe concepts  
3. **Low Priority**: Use citation URLs as primary source URLs

This would dramatically improve the quality and reliability of your recipe source URLs!