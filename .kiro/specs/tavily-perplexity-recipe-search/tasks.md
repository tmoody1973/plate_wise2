# Implementation Plan

## Overview

This implementation plan converts the Tavily + Perplexity recipe search design into actionable coding tasks. The system will be built incrementally, starting with core two-stage search functionality, then adding recipe modification and personal collection features. Each task builds on previous work and includes comprehensive testing.

## Implementation Tasks

- [x] 1. Set up core API integration infrastructure
  - Create Tavily API client with authentication and error handling
  - Create Perplexity API client with authentication and error handling  
  - Implement base configuration management for both APIs
  - Create shared interfaces and types for recipe data structures
  - _Requirements: 2.1, 2.4, 7.3, 10.1_
  
  **Terminal Test:**
  ```bash
  # Test API clients are working
  npm run test:api-clients
  
  # Or manual test:
  node -e "
  const { TavilyClient } = require('./src/lib/integrations/tavily-client');
  const { PerplexityClient } = require('./src/lib/integrations/perplexity-client');
  
  const tavily = new TavilyClient();
  const perplexity = new PerplexityClient();
  
  console.log('Tavily client initialized:', !!tavily);
  console.log('Perplexity client initialized:', !!perplexity);
  console.log('✅ API clients setup complete');
  "
  ```

- [x] 2. Implement Tavily URL discovery service
  - [x] 2.1 Create Tavily search query construction logic
    - Build intelligent query strings from user preferences (cuisine, dietary restrictions, meal types)
    - Implement meal type filtering with OR logic for multiple selections
    - Add dietary restriction terms to search queries (vegan, gluten-free, etc.)
    - Create query optimization for cultural authenticity and cooking constraints
    - _Requirements: 3.1, 4.1, 4.2, 6.1, 6.2_

  - [x] 2.2 Implement Tavily API integration with quality filtering
    - Call Tavily Search API with constructed queries and handle responses
    - Implement post-search filtering to exclude video sites, collection pages, and low-quality sources
    - Add URL validation to ensure 200 status codes and recipe content detection
    - Create quality scoring system based on title specificity and content indicators
    - _Requirements: 2.1, 2.2, 8.1, 8.2, 8.3, 11.1_
    
    **Terminal Test:**
    ```bash
    # Test Tavily search with real query
    node -e "
    const { TavilyService } = require('./src/lib/integrations/tavily-service');
    
    async function testTavilySearch() {
      const tavily = new TavilyService();
      const results = await tavily.findRecipeUrls('vegetarian pasta recipes', {
        maxResults: 3,
        searchDepth: 'basic',
        includeImages: true
      });
      
      console.log('Found URLs:', results.length);
      results.forEach((url, i) => console.log(\`\${i+1}. \${url}\`));
      console.log('✅ Tavily search working');
    }
    
    testTavilySearch().catch(console.error);
    "
    ```

  - [x] 2.3 Add URL validation and filtering logic
    - Validate URLs return individual recipe pages (not collections or categories)
    - Filter out problematic patterns (YouTube, Pinterest, search results, category pages)
    - Implement URL accessibility checking and content type validation
    - Create fallback logic when insufficient quality URLs are found
    - _Requirements: 2.3, 8.1, 8.3, 8.4, 11.4_

- [x] 3. Implement Perplexity recipe content parsing service
  - [x] 3.1 Create Perplexity recipe extraction prompts
    - Design prompts for extracting structured recipe data (title, ingredients, instructions)
    - Add cultural context extraction for authenticity and traditional cooking methods
    - Implement ingredient parsing with proper measurements and units
    - Create instruction parsing with logical step ordering and cooking details
    - Add image URL extraction prompts to find high-quality recipe photos
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 5.1, 5.3, 11.2, 11.3_

  - [x] 3.2 Implement Perplexity API integration for recipe parsing
    - Call Perplexity API with recipe URLs and structured extraction prompts
    - Parse JSON responses and handle malformed or incomplete data
    - Implement retry logic for failed parsing attempts with exponential backoff
    - Add validation for recipe completeness (ingredients, instructions, metadata)
    - _Requirements: 4.1, 4.3, 4.4, 7.4, 10.2, 11.1_
    
    **Terminal Test:**
    ```bash
    # Test Perplexity recipe parsing with real URL
    node -e "
    const { PerplexityService } = require('./src/lib/integrations/perplexity-service');
    
    async function testPerplexityParsing() {
      const perplexity = new PerplexityService();
      const testUrl = 'https://www.allrecipes.com/recipe/213742/cheesy-chicken-broccoli-casserole/';
      
      const recipe = await perplexity.parseRecipeFromUrl(testUrl, {
        culturalCuisine: 'american',
        dietaryRestrictions: []
      });
      
      console.log('Recipe Title:', recipe.title);
      console.log('Ingredients:', recipe.ingredients.length);
      console.log('Instructions:', recipe.instructions.length);
      console.log('Image URL:', recipe.images[0] || 'No image');
      console.log('✅ Perplexity parsing working');
    }
    
    testPerplexityParsing().catch(console.error);
    "
    ```

  - [x] 3.3 Add recipe data normalization and validation
    - Normalize ingredient formats with consistent units and measurements
    - Validate instruction completeness and logical ordering
    - Extract and validate recipe metadata (cooking time, servings, difficulty)
    - Implement comprehensive image URL extraction and validation with accessibility checks
    - Prioritize original recipe photos over generic food images in image selection
    - Validate image URLs return high-resolution images and are directly related to the recipe
    - _Requirements: 4.3, 4.4, 4.5, 11.2, 11.3, 11.4, 11.5_

- [-] 4. Create two-stage search orchestration service
  - [x] 4.1 Implement main search workflow coordination
    - Orchestrate Tavily URL discovery followed by Perplexity content parsing
    - Implement parallel processing for multiple recipe URLs to improve performance
    - Add progress tracking and status reporting for long-running searches
    - Create result aggregation and quality scoring for final recipe ranking
    - _Requirements: 2.1, 2.2, 7.1, 11.1_
    
    **Terminal Test:**
    ```bash
    # Test complete two-stage search workflow
    node -e "
    const { TavilyPerplexitySearchService } = require('./src/lib/meal-planning/tavily-perplexity-search');
    
    async function testFullWorkflow() {
      const searchService = new TavilyPerplexitySearchService();
      
      const request = {
        query: 'easy vegetarian dinner recipes',
        culturalCuisine: 'italian',
        dietaryRestrictions: ['vegetarian'],
        maxResults: 2,
        maxTimeMinutes: 30
      };
      
      console.log('Starting two-stage search...');
      const response = await searchService.searchRecipes(request);
      
      console.log('Found recipes:', response.recipes.length);
      response.recipes.forEach((recipe, i) => {
        console.log(\`\${i+1}. \${recipe.title} (\${recipe.totalTimeMinutes}min)\`);
        console.log(\`   Ingredients: \${recipe.ingredients.length}\`);
        console.log(\`   Image: \${recipe.imageUrl ? '✅' : '❌'}\`);
      });
      console.log('✅ Full two-stage workflow working');
    }
    
    testFullWorkflow().catch(console.error);
    "
    ```

  - [ ] 4.2 Add comprehensive error handling and fallback mechanisms
    - Implement fallback to cached results when Tavily search fails
    - Add fallback to alternative parsing when Perplexity fails
    - Create graceful degradation with partial results when some recipes fail
    - Implement circuit breaker patterns for API reliability
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 13.1, 13.2, 13.3_

  - [ ] 4.3 Implement caching and performance optimization
    - Add intelligent caching for Tavily URL discoveries (4-hour TTL)
    - Implement Perplexity parsing result caching (24-hour TTL)
    - Create cache invalidation strategies based on recipe popularity
    - Add request deduplication and batching for cost optimization
    - _Requirements: 7.2, 12.1, 12.2, 12.3, 12.4_

- [ ] 5. Implement recipe modification service using Perplexity
  - [ ] 5.1 Create recipe modification prompt engineering
    - Design prompts for dietary restriction modifications (vegetarian, vegan, gluten-free)
    - Add cultural authenticity preservation in modification prompts
    - Implement ingredient substitution logic with quantity adjustments
    - Create cooking instruction modification for substitute ingredients
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

  - [ ] 5.2 Build modification API and response handling
    - Create recipe modification request/response interfaces
    - Implement Perplexity API calls for recipe modification with structured prompts
    - Parse modification responses and extract substitution reasoning
    - Add modification impact assessment (flavor, texture, authenticity)
    - _Requirements: 14.1, 14.2, 14.3, 14.5_
    
    **Terminal Test:**
    ```bash
    # Test recipe modification functionality
    node -e "
    const { TavilyPerplexitySearchService } = require('./src/lib/meal-planning/tavily-perplexity-search');
    
    async function testRecipeModification() {
      const searchService = new TavilyPerplexitySearchService();
      
      // First get a recipe
      const searchResponse = await searchService.searchRecipes({
        query: 'chicken pasta recipes',
        maxResults: 1
      });
      
      const originalRecipe = searchResponse.recipes[0];
      console.log('Original Recipe:', originalRecipe.title);
      
      // Then modify it
      const modificationRequest = {
        originalRecipe,
        modificationType: 'vegetarian',
        maintainAuthenticity: true
      };
      
      const modifiedResponse = await searchService.modifyRecipe(modificationRequest);
      
      console.log('Modified Recipe:', modifiedResponse.modifiedRecipe.title);
      console.log('Modifications made:', modifiedResponse.modifications.length);
      modifiedResponse.modifications.forEach(mod => {
        console.log(\`  \${mod.originalIngredient} → \${mod.substituteIngredient}\`);
      });
      console.log('✅ Recipe modification working');
    }
    
    testRecipeModification().catch(console.error);
    "
    ```

  - [ ] 5.3 Add modification validation and quality assurance
    - Validate modified recipes maintain cultural authenticity where possible
    - Ensure ingredient substitutions have proper quantities and cooking adjustments
    - Implement modification explanation generation for user understanding
    - Add fallback to generic substitutions when cultural alternatives unavailable
    - _Requirements: 14.2, 14.3, 14.5_

- [ ] 6. Implement personal recipe collection and database integration
  - [ ] 6.1 Create database schema for saved recipes
    - Design tables for saved recipes, user collections, and recipe ratings
    - Implement relationships between users, recipes, modifications, and usage history
    - Add indexes for efficient querying by user, cuisine, dietary restrictions
    - Create migration scripts for database schema deployment
    - _Requirements: 15.1, 15.2, 15.3_

  - [ ] 6.2 Build recipe saving and collection management APIs
    - Create API endpoints for saving recipes with modifications and personal notes
    - Implement recipe collection management (create, update, delete collections)
    - Add recipe rating and feedback storage with family preference tracking
    - Create usage history tracking for meal plan integration
    - _Requirements: 15.1, 15.2, 15.4, 15.5_
    
    **Terminal Test:**
    ```bash
    # Test recipe saving and collection management
    node -e "
    const { TavilyPerplexitySearchService } = require('./src/lib/meal-planning/tavily-perplexity-search');
    
    async function testRecipeSaving() {
      const searchService = new TavilyPerplexitySearchService();
      
      // Get a recipe to save
      const searchResponse = await searchService.searchRecipes({
        query: 'easy pasta recipes',
        maxResults: 1
      });
      
      const recipe = searchResponse.recipes[0];
      
      // Save the recipe
      const saveRequest = {
        userId: 'test-user-123',
        recipe: recipe,
        personalNotes: 'Family loved this! Make double next time.',
        isFavorite: true,
        collections: ['Family Favorites', 'Quick Meals']
      };
      
      const saveResponse = await searchService.saveRecipe(saveRequest);
      console.log('Recipe saved:', saveResponse.success);
      console.log('Saved recipe ID:', saveResponse.savedRecipeId);
      
      // Get user's saved recipes
      const userRecipes = await searchService.getUserRecipes('test-user-123', {
        isFavorite: true
      });
      
      console.log('User has', userRecipes.recipes.length, 'favorite recipes');
      console.log('Collections:', userRecipes.collections);
      console.log('✅ Recipe saving working');
    }
    
    testRecipeSaving().catch(console.error);
    "
    ```

  - [ ] 6.3 Implement recipe search and filtering for saved recipes
    - Build search functionality across saved recipes by ingredients, cuisine, notes
    - Implement filtering by favorites, collections, ratings, and dietary restrictions
    - Add sorting by date saved, rating, usage frequency, and cooking time
    - Create pagination and efficient querying for large recipe collections
    - _Requirements: 15.3, 15.5_

- [ ] 7. Create unified service interface and API endpoints
  - [ ] 7.1 Build main recipe search API endpoint
    - Create REST API endpoint that matches existing enhanced-recipe-search interface
    - Implement request validation and user profile integration
    - Add response formatting to match existing meal planner expectations
    - Ensure 100% backward compatibility with current meal planning system
    - _Requirements: 2.1, 2.2, 1.1, 1.2, 1.3_
    
    **Terminal Test:**
    ```bash
    # Test REST API endpoints
    curl -X POST http://localhost:3000/api/recipes/enhanced-search \\
      -H "Content-Type: application/json" \\
      -d '{
        "query": "vegetarian italian recipes",
        "culturalCuisine": "italian",
        "dietaryRestrictions": ["vegetarian"],
        "maxResults": 2,
        "maxTimeMinutes": 45
      }' | jq '.'
    
    # Should return:
    # {
    #   "recipes": [
    #     {
    #       "title": "...",
    #       "ingredients": [...],
    #       "instructions": [...],
    #       "imageUrl": "...",
    #       "totalTimeMinutes": 30
    #     }
    #   ]
    # }
    
    echo "✅ REST API endpoints working"
    ```

  - [ ] 7.2 Add recipe modification API endpoints
    - Create REST endpoints for recipe modification requests
    - Implement modification type validation and user preference handling
    - Add response formatting for modified recipes with explanation details
    - Create integration points for meal planner modification features
    - _Requirements: 14.1, 14.2, 14.3_

  - [ ] 7.3 Build personal recipe collection API endpoints
    - Create REST endpoints for recipe saving, rating, and collection management
    - Implement user authentication and authorization for personal recipes
    - Add endpoints for recipe search and filtering within user collections
    - Create integration with meal planner for saved recipe usage
    - _Requirements: 15.1, 15.2, 15.3, 15.5_

- [ ] 8. Implement comprehensive monitoring and cost management
  - [ ] 8.1 Add API usage tracking and cost monitoring
    - Implement usage metrics collection for both Tavily and Perplexity APIs
    - Create cost tracking with daily/monthly budget alerts and thresholds
    - Add performance monitoring for response times and success rates
    - Implement dashboard for API usage patterns and optimization insights
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
    
    **Terminal Test:**
    ```bash
    # Test monitoring and cost tracking
    node -e "
    const { MonitoringService } = require('./src/lib/monitoring/monitoring-service');
    
    async function testMonitoring() {
      const monitor = new MonitoringService();
      
      // Get current usage stats
      const stats = await monitor.getUsageStats();
      console.log('Today\\'s API calls:');
      console.log('  Tavily:', stats.tavily.callsToday);
      console.log('  Perplexity:', stats.perplexity.callsToday);
      console.log('Total cost today: $', stats.totalCostToday.toFixed(2));
      
      // Check if we're within budget
      const budgetStatus = await monitor.checkBudgetStatus();
      console.log('Budget status:', budgetStatus.status);
      console.log('Remaining budget: $', budgetStatus.remaining.toFixed(2));
      
      console.log('✅ Monitoring and cost tracking working');
    }
    
    testMonitoring().catch(console.error);
    "
    ```

  - [ ] 8.2 Create alerting and automated cost controls
    - Set up alerts for API failure rates exceeding 5% threshold
    - Implement automatic fallback activation when costs exceed budget limits
    - Add monitoring for cache hit rates and performance degradation
    - Create automated scaling and rate limiting based on usage patterns
    - _Requirements: 9.2, 9.5, 12.5_

- [ ] 9. Build comprehensive testing suite
  - [ ] 9.1 Create unit tests for all service components
    - Test Tavily search query construction with various user profiles
    - Test Perplexity recipe parsing with real and mock recipe URLs including image extraction
    - Test recipe modification logic with different dietary restrictions
    - Test personal recipe collection CRUD operations and data integrity
    - Test image URL extraction, validation, and accessibility checking
    - _Requirements: All requirements validation_

  - [ ] 9.2 Implement integration tests for end-to-end workflows
    - Test complete two-stage search workflow with real API calls
    - Test recipe modification workflow from original to modified recipe
    - Test recipe saving and retrieval with user authentication
    - Test error handling and fallback mechanisms under various failure conditions
    - _Requirements: 2.1, 2.2, 14.1, 15.1_

  - [ ] 9.3 Add performance and load testing
    - Test concurrent recipe searches and API rate limiting
    - Validate response times meet 15-second requirement for 3 recipes
    - Test caching effectiveness and cost optimization under load
    - Validate system behavior under API failures and high traffic
    - _Requirements: 7.1, 7.2, 12.4, 12.5_

- [ ] 10. Deploy and validate production readiness
  - [ ] 10.1 Create deployment configuration and environment setup
    - Set up production environment with API keys and configuration management
    - Implement secure credential storage and rotation for Tavily and Perplexity
    - Create deployment scripts and CI/CD pipeline for automated releases
    - Set up production monitoring, logging, and alerting infrastructure
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ] 10.2 Perform production validation and compatibility testing
    - Validate 100% backward compatibility with existing meal planner APIs
    - Test recipe quality and cultural authenticity with real user scenarios
    - Validate cost optimization and caching effectiveness in production
    - Perform user acceptance testing with recipe modification and saving features
    - _Requirements: All requirements validation in production environment_
    
    **Terminal Test:**
    ```bash
    # Final end-to-end production test
    node -e "
    const { TavilyPerplexitySearchService } = require('./src/lib/meal-planning/tavily-perplexity-search');
    
    async function finalProductionTest() {
      console.log('🚀 Running final production validation...');
      
      const searchService = new TavilyPerplexitySearchService();
      
      // Test 1: Basic search
      console.log('1. Testing basic recipe search...');
      const searchResponse = await searchService.searchRecipes({
        query: 'healthy dinner recipes',
        maxResults: 2
      });
      console.log('   ✅ Found', searchResponse.recipes.length, 'recipes');
      
      // Test 2: Recipe modification
      console.log('2. Testing recipe modification...');
      const modifiedResponse = await searchService.modifyRecipe({
        originalRecipe: searchResponse.recipes[0],
        modificationType: 'vegetarian'
      });
      console.log('   ✅ Modified recipe:', modifiedResponse.modifiedRecipe.title);
      
      // Test 3: Recipe saving
      console.log('3. Testing recipe saving...');
      const saveResponse = await searchService.saveRecipe({
        userId: 'prod-test-user',
        recipe: modifiedResponse.modifiedRecipe,
        isFavorite: true
      });
      console.log('   ✅ Recipe saved:', saveResponse.success);
      
      // Test 4: Performance check
      console.log('4. Testing performance...');
      const startTime = Date.now();
      await searchService.searchRecipes({
        query: 'quick pasta recipes',
        maxResults: 3
      });
      const duration = Date.now() - startTime;
      console.log('   ✅ Search completed in', duration, 'ms');
      
      console.log('🎉 All production tests passed!');
    }
    
    finalProductionTest().catch(console.error);
    "
    ```

## Success Criteria

- **Functional**: All recipe searches return working URLs with complete recipe data
- **Performance**: 15-second response time for 3 recipes with two API calls each
- **Quality**: Recipe modification maintains cultural authenticity and provides clear explanations
- **Compatibility**: 100% backward compatibility with existing meal planner interface
- **Reliability**: Graceful fallback handling with 95%+ uptime under normal conditions
- **Cost**: API costs stay within budget through intelligent caching and optimization

## Dependencies

- Tavily Search API access and authentication
- Perplexity AI API access and authentication  
- Database setup for personal recipe collections
- Existing meal planner interface compatibility requirements
- User authentication system for personal recipe features