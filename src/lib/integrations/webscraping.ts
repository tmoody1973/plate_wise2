/**
 * Clean WebScraping.AI Integration
 * Two focused functions for reliable recipe extraction
 */

import { config } from "dotenv";

// Load environment variables
config({ path: '.env.local' });

export interface RecipeData {
  title?: string;
  ingredients?: string[] | string;
  instructions?: string[] | string;
  servings?: number | string;
  totalTimeMinutes?: number;
  sourceUrl?: string;
  imageUrl?: string;
  yieldText?: string;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  jitter: boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  jitter: true
};

/**
 * AI-powered field extraction using WebScraping.AI
 */
export async function aiFields(url: string): Promise<Partial<RecipeData>> {
  const apiKey = process.env.WEBSCRAPING_AI_API_KEY;
  
  if (!apiKey) {
    throw new Error('WEBSCRAPING_AI_API_KEY environment variable is required');
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    url: url,
    format: 'json',
    timeout: '10000',
    js: 'true',
    js_timeout: '2000',
    fields: JSON.stringify({
      title: 'recipe title',
      ingredients: 'recipe ingredients list',
      instructions: 'cooking instructions or directions',
      servings: 'number of servings',
      yieldText: 'recipe yield text',
      totalTimeMinutes: 'total cooking time in minutes',
      sourceUrl: 'canonical URL from rel=canonical',
      imageUrl: 'main recipe image from og:image'
    })
  });

  return await fetchWithRetry(
    `https://api.webscraping.ai/ai/fields?${params}`,
    {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    },
    DEFAULT_RETRY_CONFIG
  ).then(response => {
    if (!response.ok) {
      throw new Error(`WebScraping.AI API error: ${response.status} - ${response.statusText}`);
    }
    return response.json();
  }).then(data => {
    return normalizeAIFieldsResponse(data.result || data, url);
  });
}

/**
 * Fallback extraction using HTML parsing and JSON-LD Schema.org
 */
export async function htmlJsonLdFallback(url: string): Promise<Partial<RecipeData>> {
  const apiKey = process.env.WEBSCRAPING_AI_API_KEY;
  
  if (!apiKey) {
    throw new Error('WEBSCRAPING_AI_API_KEY environment variable is required');
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    url: url,
    timeout: '10000',
    js: 'true',
    js_timeout: '2000'
  });

  return await fetchWithRetry(
    `https://api.webscraping.ai/html?${params}`,
    {
      method: 'GET',
      headers: {
        'Accept': 'text/html'
      }
    },
    DEFAULT_RETRY_CONFIG
  ).then(response => {
    if (!response.ok) {
      throw new Error(`WebScraping.AI API error: ${response.status} - ${response.statusText}`);
    }
    return response.text();
  }).then(html => {
    return parseJsonLdRecipe(html, url);
  });
}

/**
 * Fetch with exponential backoff retry logic
 */
async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  retryConfig: RetryConfig
): Promise<Response> {
  let lastError: Error;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      // Set connection and read timeouts
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 13000); // 3s connect + 10s read

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : calculateDelay(attempt, retryConfig);
        
        if (attempt < retryConfig.maxRetries) {
          console.log(`Rate limited, retrying after ${delay}ms (attempt ${attempt + 1}/${retryConfig.maxRetries + 1})`);
          await sleep(delay);
          continue;
        }
      }

      // Handle server errors (5xx)
      if (response.status >= 500 && attempt < retryConfig.maxRetries) {
        const delay = calculateDelay(attempt, retryConfig);
        console.log(`Server error ${response.status}, retrying after ${delay}ms (attempt ${attempt + 1}/${retryConfig.maxRetries + 1})`);
        await sleep(delay);
        continue;
      }

      return response;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < retryConfig.maxRetries) {
        const delay = calculateDelay(attempt, retryConfig);
        console.log(`Request failed, retrying after ${delay}ms (attempt ${attempt + 1}/${retryConfig.maxRetries + 1}):`, error);
        await sleep(delay);
        continue;
      }
    }
  }

  throw lastError!;
}

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = Math.min(
    config.baseDelay * Math.pow(2, attempt),
    config.maxDelay
  );

  if (config.jitter) {
    // Add ±25% jitter
    const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
    return Math.max(0, exponentialDelay + jitter);
  }

  return exponentialDelay;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Normalize AI Fields response to consistent format
 */
function normalizeAIFieldsResponse(data: any, originalUrl: string): Partial<RecipeData> {
  const result: Partial<RecipeData> = {};

  // Title
  if (data.title) {
    result.title = String(data.title).trim();
  }

  // Ingredients - handle both array and string formats
  if (data.ingredients) {
    if (Array.isArray(data.ingredients)) {
      result.ingredients = data.ingredients.filter(Boolean).map(String);
    } else if (typeof data.ingredients === 'string') {
      result.ingredients = data.ingredients.trim();
    }
  }

  // Instructions - handle both array and string formats
  if (data.instructions) {
    if (Array.isArray(data.instructions)) {
      result.instructions = data.instructions.filter(Boolean).map(String);
    } else if (typeof data.instructions === 'string') {
      result.instructions = data.instructions.trim();
    }
  }

  // Servings
  if (data.servings) {
    const servingsNum = parseServings(data.servings);
    if (servingsNum) {
      result.servings = servingsNum;
      result.yieldText = String(data.servings);
    }
  }

  // Total time
  if (data.totalTimeMinutes) {
    const timeNum = parseTimeMinutes(data.totalTimeMinutes);
    if (timeNum) {
      result.totalTimeMinutes = timeNum;
    }
  }

  // URLs
  result.sourceUrl = data.sourceUrl || originalUrl;
  result.imageUrl = data.imageUrl;

  return result;
}

/**
 * Parse JSON-LD Recipe schema from HTML
 */
function parseJsonLdRecipe(html: string, originalUrl: string): Partial<RecipeData> {
  const result: Partial<RecipeData> = {};

  try {
    // Extract all JSON-LD script blocks
    const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gi;
    let match;

    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const jsonContent = match[1].trim();
        const data = JSON.parse(jsonContent);

        // Handle both single objects and arrays
        const items = Array.isArray(data) ? data : [data];

        for (const item of items) {
          if (isRecipeSchema(item)) {
            return parseRecipeSchema(item, originalUrl);
          }
        }
      } catch (parseError) {
        console.warn('Failed to parse JSON-LD block:', parseError);
        continue;
      }
    }

    // Fallback: try to extract Open Graph and canonical URLs
    result.sourceUrl = extractCanonicalUrl(html) || originalUrl;
    result.imageUrl = extractOgImage(html);

  } catch (error) {
    console.warn('Failed to parse JSON-LD recipe:', error);
  }

  return result;
}

/**
 * Check if JSON-LD object is a Recipe schema
 */
function isRecipeSchema(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  
  const type = data['@type'];
  if (!type) return false;

  if (typeof type === 'string') {
    return type === 'Recipe' || type.includes('Recipe');
  }

  if (Array.isArray(type)) {
    return type.some(t => t === 'Recipe' || String(t).includes('Recipe'));
  }

  return false;
}

/**
 * Parse Recipe schema object
 */
function parseRecipeSchema(recipe: any, originalUrl: string): Partial<RecipeData> {
  const result: Partial<RecipeData> = {};

  // Title
  result.title = recipe.name || recipe.headline;

  // Ingredients
  if (recipe.recipeIngredient) {
    result.ingredients = Array.isArray(recipe.recipeIngredient) 
      ? recipe.recipeIngredient 
      : [recipe.recipeIngredient];
  }

  // Instructions
  if (recipe.recipeInstructions) {
    if (Array.isArray(recipe.recipeInstructions)) {
      result.instructions = recipe.recipeInstructions.map((instruction: any) => {
        if (typeof instruction === 'string') return instruction;
        if (instruction.text) return instruction.text;
        if (instruction.name) return instruction.name;
        return String(instruction);
      });
    } else {
      result.instructions = [String(recipe.recipeInstructions)];
    }
  }

  // Servings/Yield
  if (recipe.recipeYield) {
    const yieldValue = Array.isArray(recipe.recipeYield) 
      ? recipe.recipeYield[0] 
      : recipe.recipeYield;
    
    result.yieldText = String(yieldValue);
    const servingsNum = parseServings(yieldValue);
    if (servingsNum) {
      result.servings = servingsNum;
    }
  }

  // Total time
  if (recipe.totalTime) {
    const timeNum = parseIsoDuration(recipe.totalTime);
    if (timeNum) {
      result.totalTimeMinutes = timeNum;
    }
  }

  // Image
  if (recipe.image) {
    const imageUrl = Array.isArray(recipe.image) ? recipe.image[0] : recipe.image;
    if (typeof imageUrl === 'string') {
      result.imageUrl = imageUrl;
    } else if (imageUrl && imageUrl.url) {
      result.imageUrl = imageUrl.url;
    }
  }

  // Source URL
  result.sourceUrl = originalUrl;

  return result;
}

/**
 * Parse servings from various formats
 */
function parseServings(value: any): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return undefined;

  // Extract first number from string
  const match = value.match(/(\d+)/);
  return match ? parseInt(match[1]) : undefined;
}

/**
 * Parse time in minutes from various formats
 */
function parseTimeMinutes(value: any): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return undefined;

  // Try ISO 8601 duration first
  const isoTime = parseIsoDuration(value);
  if (isoTime) return isoTime;

  // Extract numbers and time units
  const match = value.match(/(\d+)\s*(minutes?|mins?|hours?|hrs?)/i);
  if (match) {
    const num = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    if (unit.startsWith('hour') || unit.startsWith('hr')) {
      return num * 60;
    }
    return num;
  }

  return undefined;
}

/**
 * Parse ISO 8601 duration (PT30M, PT1H30M, etc.)
 */
function parseIsoDuration(duration: string): number | undefined {
  if (!duration || typeof duration !== 'string') return undefined;

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!match) return undefined;

  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  
  return hours * 60 + minutes;
}

/**
 * Extract canonical URL from HTML
 */
function extractCanonicalUrl(html: string): string | undefined {
  const match = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
  return match ? match[1] : undefined;
}

/**
 * Extract Open Graph image from HTML
 */
function extractOgImage(html: string): string | undefined {
  const match = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
  return match ? match[1] : undefined;
}

/**
 * WebScraping.AI Service Class
 * Provides a unified interface for recipe extraction
 */
export class WebScrapingAIService {
  /**
   * Extract recipe data from URL using AI fields first, fallback to JSON-LD
   */
  async extractRecipe(url: string): Promise<RecipeData> {
    try {
      // Try AI fields extraction first
      const aiResult = await aiFields(url);
      
      // Check if we got meaningful data
      if (aiResult.title && (aiResult.ingredients || aiResult.instructions)) {
        return {
          title: aiResult.title,
          ingredients: aiResult.ingredients,
          instructions: aiResult.instructions,
          servings: aiResult.servings,
          totalTimeMinutes: aiResult.totalTimeMinutes,
          sourceUrl: aiResult.sourceUrl || url,
          imageUrl: aiResult.imageUrl,
          yieldText: aiResult.yieldText
        };
      }
      
      // Fallback to JSON-LD extraction
      console.log('AI fields extraction incomplete, trying JSON-LD fallback');
      const fallbackResult = await htmlJsonLdFallback(url);
      
      return {
        title: fallbackResult.title || 'Recipe',
        ingredients: fallbackResult.ingredients || [],
        instructions: fallbackResult.instructions || [],
        servings: fallbackResult.servings || 4,
        totalTimeMinutes: fallbackResult.totalTimeMinutes || 30,
        sourceUrl: fallbackResult.sourceUrl || url,
        imageUrl: fallbackResult.imageUrl,
        yieldText: fallbackResult.yieldText
      };
      
    } catch (error) {
      console.error('WebScraping.AI extraction failed:', error);
      throw new Error(`Failed to extract recipe from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}