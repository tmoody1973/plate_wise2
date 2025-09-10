---
inclusion: always
---

# Perplexity API Integration Guide

## Key Insights from Production Usage

### What Works
- **Recipe name generation**: Perplexity excels at generating culturally appropriate recipe names
- **Content generation**: Good at creating meal plan descriptions and requirements
- **Citations**: When `return_citations: true` is used, citations are more reliable than generated URLs

### What Doesn't Work
- **URL generation**: AI-generated URLs are frequently broken (404 errors)
- **Structured JSON with URLs**: Complex schemas often fail or return invalid URLs
- **Reliable web search**: Results may be hallucinated rather than actual web searches

### Production Patterns

#### Pattern 1: Recipe Names Only (Cost-Optimized)
```javascript
// Use lightweight sonar model for simple recipe name generation
const response = await fetch('https://api.perplexity.ai/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'sonar', // Use cheaper model for simple tasks
    messages: [{ role: 'user', content: 'Generate 3 Mexican recipe names' }],
    max_tokens: 500,
    temperature: 0.3,
    disable_search: true // Disable search for pure generation tasks
  })
});

// Then use verified URLs or web scraping for actual recipes
```

#### Pattern 1b: Recipe Research (When You Need Real Sources)
```javascript
// Use sonar-pro with search for finding actual recipes
const response = await fetch('https://api.perplexity.ai/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'sonar-pro',
    messages: [{ role: 'user', content: 'Find 3 authentic Mexican recipes with ingredients' }],
    max_tokens: 1500,
    temperature: 0.2,
    search_mode: 'web',
    search_domain_filter: ['allrecipes.com', 'foodnetwork.com', 'bonappetit.com'],
    return_related_questions: true
  })
});
```

#### Pattern 2: Fallback Strategy
```javascript
try {
  // Try Perplexity for URLs
  const perplexityResult = await getPerplexityRecipes();
  if (validateUrls(perplexityResult.urls)) {
    return perplexityResult;
  }
} catch (error) {
  console.log('Perplexity failed, using verified URLs');
}

// Fallback to verified URLs
return getVerifiedRecipeUrls();
```

#### Pattern 3: Two-Stage Approach
```javascript
// Stage 1: Get recipe names from Perplexity
const recipeNames = await getRecipeNamesFromPerplexity();

// Stage 2: Use WebScraping.AI to find real URLs
const recipes = await Promise.all(
  recipeNames.map(name => scrapeRecipeFromWeb(name))
);
```

### Model Selection (Updated from Full API Reference)
- **`sonar`**: Lightweight, cost-effective ($1/1M tokens) - Best for quick facts, news updates, simple Q&A
- **`sonar-pro`**: Advanced search ($3 input, $15 output per 1M tokens) - Best for complex queries, competitive analysis, detailed research
- **`sonar-reasoning`**: Quick problem-solving with step-by-step logic ($1 input, $5 output per 1M tokens)
- **`sonar-reasoning-pro`**: Enhanced multi-step reasoning ($2 input, $8 output per 1M tokens)
- **`sonar-deep-research`**: Exhaustive research and detailed reports ($2 input, $8 output, $2 citations, $5 search queries per 1M tokens)

### Advanced Parameters (From Full API Reference)
- **`search_mode`**: `"academic"` or `"web"` - Controls search source type
- **`reasoning_effort`**: `"low"`, `"medium"`, `"high"` - For deep research models
- **`search_domain_filter`**: Array of domains to limit search results
- **`return_images`**: Boolean to include images in search results
- **`return_related_questions`**: Boolean for follow-up questions
- **`disable_search`**: Boolean to disable web search completely
- **`temperature`**: Keep low (0.1-0.3) for factual content
- **`max_tokens`**: 500-1000 for recipe names, 2000+ for detailed content

### Error Handling
```javascript
const maxRetries = 3;
let attempt = 0;

while (attempt < maxRetries) {
  try {
    const response = await callPerplexity();
    if (response.ok) return await response.json();
  } catch (error) {
    attempt++;
    if (attempt === maxRetries) {
      return getFallbackData();
    }
    await delay(1000 * Math.pow(2, attempt)); // Exponential backoff
  }
}
```

### Cost Optimization
- Cache responses when possible
- Use appropriate max_tokens limits
- Batch similar requests
- Monitor usage with logging

### Testing Strategy
- Always validate URLs before using them
- Test with real API calls, not just mock data
- Have fallback data ready
- Monitor success rates in production

## Complete API Reference Integration

### Available Models & Pricing (Per 1M Tokens)
| Model | Input | Output | Citations | Search | Best For |
|-------|-------|--------|-----------|---------|----------|
| `sonar` | $1 | $1 | - | - | Quick facts, simple Q&A |
| `sonar-pro` | $3 | $15 | - | - | Complex queries, research |
| `sonar-reasoning` | $1 | $5 | - | - | Logic puzzles, math |
| `sonar-reasoning-pro` | $2 | $8 | - | - | Complex problem-solving |
| `sonar-deep-research` | $2 | $8 | $2 | $5/1K | Academic research, reports |

### Advanced Search Parameters
```javascript
const advancedSearchOptions = {
  model: 'sonar-pro',
  messages: [{ role: 'user', content: 'Your query here' }],
  
  // Search Control
  search_mode: 'web', // or 'academic'
  search_domain_filter: ['allrecipes.com', 'foodnetwork.com'],
  disable_search: false, // Set true for pure generation
  
  // Response Enhancement
  return_images: true, // Include images in results
  return_related_questions: true, // Get follow-up questions
  
  // Quality Control
  temperature: 0.2, // Lower for factual content
  max_tokens: 1500,
  top_p: 0.9,
  
  // For Deep Research Models
  reasoning_effort: 'medium' // 'low', 'medium', 'high'
};
```

### Streaming Implementation
```javascript
const streamResponse = async (query) => {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'sonar-pro',
      messages: [{ role: 'user', content: query }],
      stream: true
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value, { stream: true });
    // Process chunk here
  }
};
```

### Cost Optimization Strategies
1. **Use appropriate models**: `sonar` for simple tasks, `sonar-pro` for complex ones
2. **Disable search when not needed**: Set `disable_search: true` for generation tasks
3. **Limit domains**: Use `search_domain_filter` to focus searches
4. **Set reasonable token limits**: Avoid excessive `max_tokens`
5. **Cache responses**: Store results for repeated queries

### Reference Documentation
- Full API Reference: `docs/perplexity_full_api.md`
- Official Docs: https://docs.perplexity.ai/
- Pricing: https://docs.perplexity.ai/getting-started/pricing