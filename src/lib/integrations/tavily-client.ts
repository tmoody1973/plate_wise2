/**
 * Tavily API Client for Recipe URL Discovery
 * 
 * Provides a dedicated client for Tavily Search API with:
 * - Authentication and error handling
 * - Circuit breaker protection
 * - Recipe-specific search optimization
 * - Quality filtering and validation
 */

import { circuitBreakerManager } from '../pricing/circuit-breaker';

export interface TavilySearchOptions {
  maxResults: number;
  searchDepth: 'basic' | 'advanced';
  includeImages: boolean;
  mealTypes?: string[];
  qualityFilter?: {
    excludeVideoSites: boolean;
    excludeCollectionPages: boolean;
    minContentLength: number;
    requireIngredients: boolean;
  };
}

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

export interface TavilySearchResponse {
  results: TavilySearchResult[];
  query: string;
  follow_up_questions?: string[];
  answer?: string;
  images?: string[];
  search_depth: string;
  response_time: number;
}

export interface TavilyConfig {
  apiKey: string;
  baseUrl: string;
  defaultSearchDepth: 'basic' | 'advanced';
  maxRetries: number;
  timeoutMs: number;
  qualityThresholds: {
    minTitleLength: number;
    minContentLength: number;
    excludePatterns: string[];
  };
}

export class TavilyClient {
  private config: TavilyConfig;
  private circuitBreaker: any;

  constructor(config?: Partial<TavilyConfig>) {
    this.config = {
      apiKey: process.env.TAVILY_API_KEY || '',
      baseUrl: 'https://api.tavily.com',
      defaultSearchDepth: 'basic',
      maxRetries: 3,
      timeoutMs: 15000,
      qualityThresholds: {
        minTitleLength: 10,
        minContentLength: 100,
        excludePatterns: [
          'youtube.com',
          'tiktok.com', 
          'pinterest.com',
          '/collection/',
          '/category/',
          '/search/',
          '/recipes/',
          'recipe-collection',
          'best-recipes',
          'top-recipes'
        ]
      },
      ...config
    };

    this.circuitBreaker = circuitBreakerManager.getBreaker('TavilyAPI', {
      failureThreshold: 5,
      timeout: 60000,
      monitoringPeriod: 120000,
      successThreshold: 2
    });

    if (!this.config.apiKey) {
      console.warn('Tavily API key not found. Set TAVILY_API_KEY environment variable.');
    }
  }

  /**
   * Search for recipe URLs using Tavily API with quality filtering
   */
  async searchRecipes(query: string, options: Partial<TavilySearchOptions> = {}): Promise<string[]> {
    const searchOptions: TavilySearchOptions = {
      maxResults: 10,
      searchDepth: this.config.defaultSearchDepth,
      includeImages: true,
      qualityFilter: {
        excludeVideoSites: true,
        excludeCollectionPages: true,
        minContentLength: 200,
        requireIngredients: true
      },
      ...options
    };

    try {
      const response = await this.circuitBreaker.execute(() => 
        this.performSearch(query, searchOptions)
      );

      // Apply comprehensive quality filtering
      const filteredResults = this.applyQualityFiltering(response.results, searchOptions.qualityFilter);
      
      // Validate URLs return 200 status and contain recipe content
      const validatedUrls = await this.validateRecipeUrls(filteredResults.map(r => r.url));
      
      // Apply final quality scoring and return top results
      return validatedUrls.slice(0, searchOptions.maxResults);
    } catch (error) {
      console.error('Tavily search failed:', error);
      throw new Error(`Tavily search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get detailed search results with quality scores
   */
  async searchRecipesWithDetails(query: string, options: Partial<TavilySearchOptions> = {}): Promise<TavilySearchResult[]> {
    const searchOptions: TavilySearchOptions = {
      maxResults: 10,
      searchDepth: this.config.defaultSearchDepth,
      includeImages: true,
      qualityFilter: {
        excludeVideoSites: true,
        excludeCollectionPages: true,
        minContentLength: 200,
        requireIngredients: true
      },
      ...options
    };

    try {
      const response = await this.circuitBreaker.execute(() => 
        this.performSearch(query, searchOptions)
      );

      // Apply quality filtering and return detailed results
      const filteredResults = this.applyQualityFiltering(response.results, searchOptions.qualityFilter);
      
      return filteredResults.slice(0, searchOptions.maxResults);
    } catch (error) {
      console.error('Tavily search with details failed:', error);
      throw new Error(`Tavily search with details failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Perform the actual search request to Tavily API
   */
  private async performSearch(query: string, options: TavilySearchOptions): Promise<TavilySearchResponse> {
    const optimizedQuery = this.optimizeQuery(query, options);
    
    const requestBody = {
      api_key: this.config.apiKey,
      query: optimizedQuery,
      search_depth: options.searchDepth,
      include_images: options.includeImages,
      include_answer: false,
      max_results: options.maxResults * 2, // Get more for better filtering
      include_domains: this.getPreferredDomains(),
      exclude_domains: this.getExcludedDomains()
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Tavily API request timeout');
      }
      throw error;
    }
  }

  /**
   * Optimize search query for recipe discovery
   */
  private optimizeQuery(baseQuery: string, options: TavilySearchOptions): string {
    let optimizedQuery = baseQuery;

    // Add meal type filters if specified
    if (options.mealTypes && options.mealTypes.length > 0) {
      const mealTypeTerms = options.mealTypes.map(type => {
        switch(type) {
          case 'breakfast': return 'breakfast brunch morning';
          case 'lunch': return 'lunch midday light meal';
          case 'dinner': return 'dinner evening main course';
          case 'snack': return 'snack appetizer finger food';
          case 'dessert': return 'dessert sweet treat';
          default: return type;
        }
      }).join(' OR ');
      
      optimizedQuery = `${baseQuery} (${mealTypeTerms})`;
    }

    // Add recipe-specific terms
    optimizedQuery += ' recipe ingredients instructions cooking';

    return optimizedQuery;
  }

  /**
   * Get preferred recipe domains for better results
   */
  private getPreferredDomains(): string[] {
    return [
      'allrecipes.com',
      'foodnetwork.com',
      'seriouseats.com',
      'bonappetit.com',
      'epicurious.com',
      'food.com',
      'delish.com',
      'tasteofhome.com',
      'simplyrecipes.com',
      'cookinglight.com'
    ];
  }

  /**
   * Get domains to exclude from search
   */
  private getExcludedDomains(): string[] {
    return [
      'youtube.com',
      'tiktok.com',
      'pinterest.com',
      'instagram.com',
      'facebook.com'
    ];
  }

  /**
   * Apply comprehensive quality filtering to search results
   */
  private applyQualityFiltering(
    results: TavilySearchResult[], 
    qualityFilter?: TavilySearchOptions['qualityFilter']
  ): TavilySearchResult[] {
    const filter = qualityFilter || {
      excludeVideoSites: true,
      excludeCollectionPages: true,
      minContentLength: 200,
      requireIngredients: true
    };

    return results
      .filter(result => this.passesQualityFilters(result, filter))
      .map(result => ({
        ...result,
        score: this.calculateRecipeQualityScore(result)
      }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Check if a result passes all quality filters
   */
  private passesQualityFilters(
    result: TavilySearchResult, 
    filter: NonNullable<TavilySearchOptions['qualityFilter']>
  ): boolean {
    const url = result.url.toLowerCase();
    const title = result.title.toLowerCase();
    const content = result.content.toLowerCase();

    // 1. Exclude video sites if requested
    if (filter.excludeVideoSites) {
      const videoSites = ['youtube.com', 'tiktok.com', 'vimeo.com', 'dailymotion.com'];
      if (videoSites.some(site => url.includes(site))) {
        return false;
      }
    }

    // 2. Exclude collection pages if requested
    if (filter.excludeCollectionPages) {
      const collectionPatterns = [
        '/collection/', '/category/', '/search/', '/recipes/', '/gallery/',
        '/recipe-collection/', '/best-recipes/', '/top-recipes/',
        'recipe-collection', 'best-recipes', 'top-recipes',
        'recipe-index', 'cooking-tips', 'kitchen-hacks',
        'roundup', 'compilation', 'list-of', '/gallery/', 
        'recipes-menus', 'recipe-ideas', 'recipe-gallery'
      ];
      
      if (collectionPatterns.some(pattern => url.includes(pattern) || title.includes(pattern))) {
        return false;
      }

      // Check for collection indicators in title
      const collectionTitleIndicators = [
        'best', 'top', 'collection', 'roundup', 'list of',
        'compilation', 'guide to', 'ultimate guide', 'gallery',
        'recipes to', 'ideas for', 'ways to', 'types of'
      ];
      
      if (collectionTitleIndicators.some(indicator => title.includes(indicator))) {
        return false;
      }
    }

    // 3. Check minimum content length
    if (result.content.length < filter.minContentLength) {
      return false;
    }

    // 4. Require recipe indicators if requested
    if (filter.requireIngredients) {
      const recipeIndicators = [
        'recipe', 'ingredients', 'instructions', 'directions',
        'how to make', 'cooking', 'bake', 'cook', 'prepare',
        'servings', 'prep time', 'cook time'
      ];
      
      const hasRecipeIndicator = recipeIndicators.some(indicator => 
        title.includes(indicator) || content.includes(indicator)
      );
      
      if (!hasRecipeIndicator) {
        return false;
      }
    }

    // 5. Check against global exclude patterns
    const hasExcludedPattern = this.config.qualityThresholds.excludePatterns.some(pattern => 
      url.includes(pattern) || title.includes(pattern)
    );
    
    if (hasExcludedPattern) {
      return false;
    }

    // 6. Check minimum title length
    if (result.title.length < this.config.qualityThresholds.minTitleLength) {
      return false;
    }

    // 7. Exclude obvious non-recipe pages
    const nonRecipeIndicators = [
      'about us', 'contact', 'privacy policy', 'terms of service',
      'newsletter', 'subscribe', 'login', 'register', 'cart',
      'checkout', 'payment', 'shipping'
    ];
    
    if (nonRecipeIndicators.some(indicator => title.includes(indicator) || url.includes(indicator))) {
      return false;
    }

    return true;
  }

  /**
   * Calculate comprehensive quality score for recipe results
   */
  private calculateRecipeQualityScore(result: TavilySearchResult): number {
    let score = result.score || 0;
    
    const title = result.title.toLowerCase();
    const url = result.url.toLowerCase();
    const content = result.content.toLowerCase();

    // 1. Recipe specificity scoring
    const recipeTerms = {
      'recipe': 0.3,
      'ingredients': 0.2,
      'instructions': 0.2,
      'directions': 0.15,
      'how to make': 0.25,
      'cooking': 0.1,
      'bake': 0.1,
      'cook': 0.1,
      'prepare': 0.1
    };

    Object.entries(recipeTerms).forEach(([term, boost]) => {
      if (title.includes(term)) score += boost;
      if (content.includes(term)) score += boost * 0.5; // Content gets half weight
    });

    // 2. Domain authority scoring
    const domainScores = {
      'allrecipes.com': 0.4,
      'foodnetwork.com': 0.4,
      'seriouseats.com': 0.5,
      'bonappetit.com': 0.4,
      'epicurious.com': 0.4,
      'food.com': 0.3,
      'delish.com': 0.3,
      'tasteofhome.com': 0.3,
      'simplyrecipes.com': 0.4,
      'cookinglight.com': 0.3,
      'foodandwine.com': 0.4,
      'marthastewart.com': 0.3,
      'bhg.com': 0.3,
      'pillsbury.com': 0.2,
      'kraftrecipes.com': 0.2
    };

    Object.entries(domainScores).forEach(([domain, boost]) => {
      if (url.includes(domain)) {
        score += boost;
      }
    });

    // 3. Title specificity scoring
    const titleLength = result.title.length;
    if (titleLength >= 20 && titleLength <= 80) {
      score += 0.1; // Good title length
    } else if (titleLength > 80) {
      score -= 0.05; // Too long
    } else if (titleLength < 10) {
      score -= 0.1; // Too short
    }

    // 4. Content depth scoring
    const contentLength = result.content.length;
    if (contentLength >= 300) {
      score += 0.15; // Good content depth
    } else if (contentLength >= 150) {
      score += 0.1; // Moderate content
    }

    // 5. Penalty for collection/list indicators
    const collectionPenalties = {
      'best': -0.3,
      'top': -0.3,
      'collection': -0.4,
      'roundup': -0.4,
      'list of': -0.3,
      'compilation': -0.3,
      'ultimate guide': -0.2,
      'complete guide': -0.2
    };

    Object.entries(collectionPenalties).forEach(([term, penalty]) => {
      if (title.includes(term)) {
        score += penalty;
      }
    });

    // 6. Freshness scoring (if published date available)
    if (result.published_date) {
      const publishedDate = new Date(result.published_date);
      const now = new Date();
      const daysSincePublished = (now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSincePublished <= 365) {
        score += 0.1; // Recent content bonus
      } else if (daysSincePublished <= 1825) { // 5 years
        score += 0.05; // Moderate freshness
      }
      // No penalty for older content as classic recipes are valuable
    }

    // 7. URL structure scoring
    if (url.includes('/recipe/') || url.includes('/recipes/')) {
      score += 0.15; // Good URL structure
    }

    // 8. Individual recipe page indicators
    const individualRecipeIndicators = [
      'servings', 'prep time', 'cook time', 'total time',
      'difficulty', 'cuisine', 'course', 'method'
    ];

    const individualIndicatorCount = individualRecipeIndicators.filter(indicator => 
      title.includes(indicator) || content.includes(indicator)
    ).length;

    score += individualIndicatorCount * 0.05; // Boost for each indicator

    // 9. Penalty for obvious non-individual recipes
    const nonIndividualPenalties = [
      'menu', 'meal plan', 'weekly', 'monthly',
      'subscription', 'newsletter', 'blog archive'
    ];

    nonIndividualPenalties.forEach(term => {
      if (title.includes(term) || url.includes(term)) {
        score -= 0.2;
      }
    });

    // Ensure score is within reasonable bounds
    return Math.max(0, Math.min(2, score));
  }

  /**
   * Validate URLs return 200 status and contain recipe content
   */
  private async validateRecipeUrls(urls: string[]): Promise<string[]> {
    const validationPromises = urls.map(async (url) => {
      try {
        // First check if URL is accessible
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const headResponse = await fetch(url, { 
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; RecipeBot/1.0)'
          }
        });
        
        clearTimeout(timeoutId);

        if (!headResponse.ok) {
          return null;
        }

        // Check content type
        const contentType = headResponse.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) {
          return null;
        }

        // For a subset of URLs, do a more thorough content check
        if (Math.random() < 0.3) { // Check 30% of URLs more thoroughly
          const contentCheck = await this.validateRecipeContent(url);
          return contentCheck ? url : null;
        }

        return url;
      } catch (error) {
        console.warn(`URL validation failed for ${url}:`, error instanceof Error ? error.message : 'Unknown error');
        return null;
      }
    });

    const results = await Promise.all(validationPromises);
    return results.filter((url): url is string => url !== null);
  }

  /**
   * Validate that a URL contains actual recipe content
   */
  private async validateRecipeContent(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RecipeBot/1.0)'
        }
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        return false;
      }

      // Get first 2KB of content to check for recipe indicators
      const reader = response.body?.getReader();
      if (!reader) return false;

      let content = '';
      let bytesRead = 0;
      const maxBytes = 2048;

      while (bytesRead < maxBytes) {
        const { done, value } = await reader.read();
        if (done) break;
        
        content += new TextDecoder().decode(value);
        bytesRead += value.length;
      }

      reader.releaseLock();

      // Check for recipe content indicators
      const recipeContentIndicators = [
        'recipe', 'ingredients', 'instructions', 'directions',
        'prep time', 'cook time', 'servings', 'yield',
        'application/ld+json', 'schema.org/Recipe',
        'recipe-card', 'recipe-instructions', 'ingredient-list'
      ];

      const hasRecipeContent = recipeContentIndicators.some(indicator => 
        content.toLowerCase().includes(indicator.toLowerCase())
      );

      return hasRecipeContent;
    } catch (error) {
      console.warn(`Content validation failed for ${url}:`, error instanceof Error ? error.message : 'Unknown error');
      return false; // Assume invalid if we can't check
    }
  }

  /**
   * Validate URLs return individual recipe pages (not collections or categories)
   */
  async validateIndividualRecipePages(urls: string[]): Promise<string[]> {
    const validationPromises = urls.map(async (url) => {
      try {
        // Check URL structure first
        if (!this.isValidRecipeUrl(url)) {
          return null;
        }

        // Check accessibility
        const isAccessible = await this.checkUrlAccessibility(url);
        if (!isAccessible) {
          return null;
        }

        // Check if it's an individual recipe page
        const isIndividualRecipe = await this.isIndividualRecipePage(url);
        if (!isIndividualRecipe) {
          return null;
        }

        return url;
      } catch (error) {
        console.warn(`URL validation failed for ${url}:`, error instanceof Error ? error.message : 'Unknown error');
        return null;
      }
    });

    const results = await Promise.all(validationPromises);
    return results.filter((url): url is string => url !== null);
  }

  /**
   * Check if URL structure indicates a valid recipe page
   */
  private isValidRecipeUrl(url: string): boolean {
    const urlLower = url.toLowerCase();

    // Check for problematic patterns
    const problematicPatterns = [
      // Video platforms
      'youtube.com', 'youtu.be', 'tiktok.com', 'vimeo.com',
      // Social media
      'pinterest.com', 'instagram.com', 'facebook.com', 'twitter.com',
      // Collection/category pages
      '/collection/', '/category/', '/categories/', '/search/',
      '/recipes/', '/recipe-index/', '/recipe-collection/', '/gallery/',
      '/recipes-menus/', '/recipe-ideas/', '/recipe-gallery/',
      // Non-recipe pages
      '/about', '/contact', '/privacy', '/terms', '/login',
      '/register', '/cart', '/checkout', '/newsletter',
      // Generic patterns
      'recipe-roundup', 'best-recipes', 'top-recipes',
      'recipe-compilation', 'cooking-tips', 'kitchen-hacks',
      'recipes-to-make', 'recipe-ideas'
    ];

    if (problematicPatterns.some(pattern => urlLower.includes(pattern))) {
      return false;
    }

    // Check for positive indicators for individual recipes
    const positiveIndicators = [
      '/recipe/', '-recipe-', '_recipe_', '/recipe-',
      'how-to-make', '/cooking/', '/baking/',
      // Specific recipe URL patterns
      '/recipe-', '-recipe/', 'recipe-for-'
    ];

    // URL should have at least one positive indicator or be from a trusted domain
    const hasTrustedDomain = this.getPreferredDomains().some(domain => 
      urlLower.includes(domain)
    );

    const hasPositiveIndicator = positiveIndicators.some(indicator => 
      urlLower.includes(indicator)
    );

    return hasTrustedDomain || hasPositiveIndicator;
  }

  /**
   * Check URL accessibility and content type
   */
  private async checkUrlAccessibility(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RecipeBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml'
        }
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        return false;
      }

      // Check content type
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        return false;
      }

      // Check for redirect chains (too many redirects might indicate problems)
      if (response.redirected && response.url !== url) {
        const redirectedUrl = response.url.toLowerCase();
        // Check if redirected to a problematic page
        const problematicRedirects = [
          'login', 'register', 'subscribe', 'paywall',
          'error', '404', '403', 'not-found'
        ];
        
        if (problematicRedirects.some(pattern => redirectedUrl.includes(pattern))) {
          return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if URL points to an individual recipe page vs collection
   */
  private async isIndividualRecipePage(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RecipeBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml'
        }
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        return false;
      }

      // Get first 3KB of content to analyze
      const reader = response.body?.getReader();
      if (!reader) return false;

      let content = '';
      let bytesRead = 0;
      const maxBytes = 3072; // 3KB

      while (bytesRead < maxBytes) {
        const { done, value } = await reader.read();
        if (done) break;
        
        content += new TextDecoder().decode(value);
        bytesRead += value.length;
      }

      reader.releaseLock();
      const contentLower = content.toLowerCase();

      // Check for individual recipe indicators
      const individualRecipeIndicators = [
        // Structured data (strong indicators)
        'application/ld+json', 'schema.org/recipe', '"@type":"recipe"',
        // Recipe-specific elements (strong indicators)
        'recipe-card', 'recipe-instructions', 'ingredient-list',
        'prep-time', 'cook-time', 'total-time', 'servings',
        // Common recipe page elements
        'ingredients:', 'directions:', 'instructions:',
        'method:', 'preparation:', 'cooking method',
        // Additional strong indicators
        'recipe-nutrition', 'recipe-yield', 'recipe-category'
      ];

      const individualIndicatorCount = individualRecipeIndicators.filter(indicator => 
        contentLower.includes(indicator)
      ).length;

      // Check for collection page indicators (negative signals)
      const collectionIndicators = [
        'recipe collection', 'recipe roundup', 'recipe index',
        'browse recipes', 'search recipes', 'filter recipes',
        'recipe categories', 'recipe tags', 'more recipes',
        'related recipes', 'similar recipes', 'recipe gallery',
        'our best', 'top recipes', 'best recipes', 'recipe ideas',
        'gallery', 'slideshow', 'photo gallery', 'recipe slideshow'
      ];

      const collectionIndicatorCount = collectionIndicators.filter(indicator => 
        contentLower.includes(indicator)
      ).length;

      // Decision logic: balanced approach - prefer individual recipes but allow some flexibility
      // Strong rejection if clear collection indicators, otherwise use individual indicator count
      if (collectionIndicatorCount >= 2) {
        return false; // Definitely a collection page
      }
      
      if (individualIndicatorCount >= 3) {
        return true; // Strong individual recipe indicators
      }
      
      if (individualIndicatorCount >= 1 && collectionIndicatorCount === 0) {
        return true; // Some individual indicators and no collection indicators
      }
      
      return false; // Default to rejecting unclear pages

    } catch (error) {
      console.warn(`Individual recipe page check failed for ${url}:`, error instanceof Error ? error.message : 'Unknown error');
      return false; // Assume not individual if we can't check
    }
  }

  /**
   * Create fallback logic when insufficient quality URLs are found
   */
  async findRecipeUrlsWithFallback(
    query: string, 
    options: Partial<TavilySearchOptions> = {},
    minResults: number = 3
  ): Promise<string[]> {
    try {
      // First attempt with strict quality filtering
      let urls = await this.searchRecipes(query, options);
      
      if (urls.length >= minResults) {
        return urls;
      }

      console.log(`Only found ${urls.length} URLs with strict filtering, trying fallback approaches...`);

      // Fallback 1: Relax quality filtering
      const relaxedOptions = {
        ...options,
        qualityFilter: {
          excludeVideoSites: true,
          excludeCollectionPages: false, // Allow some collection pages
          minContentLength: 100, // Reduce minimum content length
          requireIngredients: false // Don't require ingredient indicators
        }
      };

      const relaxedUrls = await this.searchRecipes(query, relaxedOptions);
      urls = [...new Set([...urls, ...relaxedUrls])]; // Deduplicate

      if (urls.length >= minResults) {
        return urls.slice(0, options.maxResults || 10);
      }

      // Fallback 2: Expand search with broader query
      const broaderQuery = this.createBroaderQuery(query);
      const broaderUrls = await this.searchRecipes(broaderQuery, relaxedOptions);
      urls = [...new Set([...urls, ...broaderUrls])]; // Deduplicate

      if (urls.length >= minResults) {
        return urls.slice(0, options.maxResults || 10);
      }

      // Fallback 3: Use advanced search depth
      const advancedOptions = {
        ...relaxedOptions,
        searchDepth: 'advanced' as const
      };

      const advancedUrls = await this.searchRecipes(query, advancedOptions);
      urls = [...new Set([...urls, ...advancedUrls])]; // Deduplicate

      return urls.slice(0, options.maxResults || 10);

    } catch (error) {
      console.error('All fallback attempts failed:', error);
      throw error;
    }
  }

  /**
   * Create a broader search query for fallback
   */
  private createBroaderQuery(originalQuery: string): string {
    // Remove specific terms that might be too restrictive
    let broaderQuery = originalQuery
      .replace(/\b(authentic|traditional|classic)\b/gi, '')
      .replace(/\b(easy|quick|simple)\b/gi, '')
      .replace(/\b(homemade|from scratch)\b/gi, '')
      .trim();

    // Add generic recipe terms
    broaderQuery += ' recipe cooking';

    return broaderQuery;
  }

  /**
   * Get client health status
   */
  getHealthStatus() {
    return {
      circuitBreakerState: this.circuitBreaker.getStats().state,
      hasApiKey: !!this.config.apiKey,
      baseUrl: this.config.baseUrl
    };
  }
}