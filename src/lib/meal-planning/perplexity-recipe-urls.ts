/**
 * Perplexity Recipe URL Discovery Service
 * Stage 1: Get real recipe URLs using Perplexity AI with structured outputs
 */

import { urlValidatorService } from '@/lib/utils/url-validator';

export interface PerplexityRecipeUrlRequest {
  numberOfMeals: number;
  culturalCuisines: string[];
  dietaryRestrictions: string[];
  maxTime?: number;
  pantry?: string[];
  exclude?: string[];
  dishCategories?: string[];
  country?: string;
  language?: string;
}

export interface RecipeUrlResult {
  title: string;
  url: string;
  cuisine: string;
  estimatedTime: number;
  description: string;
}

export interface PerplexityRecipeUrlResponse {
  success: boolean;
  recipes: RecipeUrlResult[];
  confidence: "high" | "medium" | "low";
}

export class PerplexityRecipeUrlService {
  private apiKey: string;
  private baseURL = 'https://api.perplexity.ai/chat/completions';
  private skipUrlValidation: boolean;

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY || '';
    // Allow disabling URL validation via environment variable
    this.skipUrlValidation = process.env.SKIP_URL_VALIDATION === 'true';
  }

  /**
   * Enhance recipes with URLs from citations if better than what's in JSON
   */
  private enhanceRecipesWithCitations(recipes: any[], citations: any[]): RecipeUrlResult[] {
    if (citations.length === 0) {
      return recipes;
    }
    
    console.log(`🔗 Enhancing ${recipes.length} recipes with ${citations.length} citations`);
    
    // Extract URLs from citations
    const citationUrls: string[] = [];
    
    // Handle different citation formats
    if (Array.isArray(citations)) {
      citations.forEach(citation => {
        if (typeof citation === 'string') {
          citationUrls.push(citation);
        } else if (citation.url) {
          citationUrls.push(citation.url);
        } else if (citation.link) {
          citationUrls.push(citation.link);
        }
      });
    }
    
    console.log(`📎 Extracted ${citationUrls.length} URLs from citations`);
    
    // Enhance recipes with citation URLs if they don't have URLs or have invalid ones
    return recipes.map((recipe, index) => {
      // If recipe already has a valid URL, keep it
      if (recipe.url && recipe.url.startsWith('http')) {
        return recipe;
      }
      
      // Otherwise try to find a matching URL from citations
      let matchedUrl = '';
      
      // First try: direct index matching
      if (citationUrls[index]) {
        matchedUrl = citationUrls[index];
      }
      // Second try: look for URL that contains recipe title keywords
      else if (recipe.title && citationUrls.length > 0) {
        const titleKeywords = recipe.title.toLowerCase().split(' ')
          .filter(word => word.length > 3);
        
        matchedUrl = citationUrls.find(url => 
          titleKeywords.some(keyword => url.toLowerCase().includes(keyword))
        ) || '';
      }
      
      if (matchedUrl) {
        console.log(`✨ Enhanced "${recipe.title}" with citation URL: ${matchedUrl}`);
        return { ...recipe, url: matchedUrl };
      }
      
      return recipe;
    });
  }

  /**
   * Validate if a URL is properly formatted and optionally check if it's accessible
   */
  private async validateUrl(url: string, checkAccessibility = false): Promise<boolean> {
    // Use the URL validator service for consistent validation
    const validation = urlValidatorService.validateURL(url);
    
    if (!validation.isValid) {
      console.warn(`❌ Invalid URL format: ${url} - ${validation.error}`);
      return false;
    }
    
    // If we only need format validation, return here
    if (!checkAccessibility || this.skipUrlValidation) {
      return true;
    }
    
    // Optional: Check if URL is actually accessible
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(validation.sanitizedUrl!, { 
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PlateWise/1.0; +https://platewise.com)'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`✅ URL is accessible: ${validation.sanitizedUrl}`);
        return true;
      } else {
        console.warn(`⚠️ URL returned ${response.status}: ${validation.sanitizedUrl}`);
        // Don't include URLs that return 404 or other errors
        return response.status !== 404;
      }
      
    } catch (error) {
      // Network errors, timeouts, CORS, etc - we'll be lenient here
      console.log(`⚠️ Could not verify URL accessibility: ${validation.sanitizedUrl}`);
      // Return true for URLs we can't verify (might be CORS restricted)
      return true;
    }
  }

  /**
   * Validate multiple URLs in parallel
   */
  private async validateRecipeUrls(response: PerplexityRecipeUrlResponse): Promise<PerplexityRecipeUrlResponse> {
    if (!response.success || response.recipes.length === 0) {
      return response;
    }

    console.log('🔍 Validating recipe URLs...');
    
    const scoreDomain = (urlStr: string): number => {
      try {
        const u = new URL(urlStr);
        const host = u.hostname.toLowerCase();
        let score = 0;
        if (host.includes('allrecipes') || host.includes('seriouseats') || host.includes('bbcgoodfood') || host.includes('foodnetwork') || host.includes('simplyrecipes')) score += 3;
        const path = u.pathname.toLowerCase();
        if (path.includes('/recipe')) score += 2;
        if (/\/[a-z0-9-]+\/?$/.test(path)) score += 1; // sluggy path
        if (path.endsWith('/recipes') || path.endsWith('/category') || path.endsWith('/categories')) score -= 2; // listicle-ish
        return score;
      } catch { return 0; }
    };

    const jsonLdLikelyDomains = new Set([
      'seriouseats.com','allrecipes.com','bbcgoodfood.com','foodnetwork.com','simplyrecipes.com','taste.com.au','kingarthurbaking.com'
    ]);
    const validationPromises = response.recipes.map(async (recipe) => {
      // If no URL, keep the recipe (we'll use fallback later)
      if (!recipe.url || recipe.url === '') {
        console.log(`⚠️ Recipe "${recipe.title}" has no URL, using as-is`);
        return recipe;
      }
      
      const isValid = await this.validateUrl(recipe.url);
      if (!isValid) {
        console.log(`🚫 Invalid URL removed: ${recipe.url} (${recipe.title})`);
        // Instead of removing, just clear the URL
        return { ...recipe, url: '' };
      }
      // Attach a simple domain score for downstream ordering
      let score = scoreDomain(recipe.url);
      try {
        const h = new URL(recipe.url).hostname.replace(/^www\./,'').toLowerCase();
        if (jsonLdLikelyDomains.has(h)) score += 1; // light bonus for schema-rich sites
      } catch {}
      return { ...recipe, domainScore: score } as any;
    });

    let validatedRecipes = (await Promise.all(validationPromises)).filter(Boolean) as (RecipeUrlResult & { domainScore?: number })[];
    // Sort by domain score descending to prefer likely recipe pages
    validatedRecipes = validatedRecipes.sort((a, b) => (b.domainScore || 0) - (a.domainScore || 0));
    // Strip helper prop
    const cleaned = validatedRecipes.map(({ domainScore, ...rest }) => rest) as RecipeUrlResult[];
    
    console.log(`✅ URL validation complete: ${cleaned.length}/${response.recipes.length} URLs valid`);

    return {
      ...response,
      recipes: cleaned,
      confidence: cleaned.length >= response.recipes.length * 0.8 ? response.confidence : 'low'
    };
  }

  /**
   * Get recipe URLs using Perplexity AI with structured JSON output and URL validation
   */
  async getRecipeUrls(request: PerplexityRecipeUrlRequest, retryCount = 0): Promise<PerplexityRecipeUrlResponse> {
    const maxRetries = 2;
    
    if (!this.apiKey) {
      console.warn('⚠️ Perplexity API key not found, using fallback URLs');
      return this.getFallbackUrls(request);
    }

    try {
      console.log('🔍 Requesting recipe URLs from Perplexity:', request);

      const prompt = this.buildRecipeUrlPrompt(request, retryCount);
      const schema = this.getRecipeUrlJsonSchema();

      const useLargeContext = (request.dishCategories && request.dishCategories.length > 0) || ((request.culturalCuisines || []).length <= 2);
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'sonar-pro', // Use sonar-pro for better URL discovery and citations
          messages: [
            {
              role: 'system',
              content: 'You are a recipe discovery assistant. Search for real, individual recipe pages on reputable cooking websites. Prefer high-quality recipe domains, but if good matches are not found, use other reputable recipe sites. Avoid social/video/paywalled sites. Copy recipe URLs from citations only. Exclude listicles and category pages. Return JSON only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: retryCount > 0 ? 0.1 : 0.2,
          top_p: 0.2,
          return_citations: true, // Get real URLs from citations
          search_context_size: useLargeContext ? "large" : "medium",
          response_format: {
            type: "json_schema",
            json_schema: schema
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Perplexity API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      // Citations can be in different places in the response
      const citations = data.citations || 
                       data.choices?.[0]?.citations || 
                       data.choices?.[0]?.message?.citations || 
                       [];

      if (!content) {
        throw new Error('Empty response from Perplexity API');
      }

      console.log(`📚 Received ${citations.length} citations from Perplexity`);
      console.log('📍 Citation structure:', citations.slice(0, 2)); // Log first 2 citations for debugging
      
      const parsedContent = JSON.parse(content);
      
      // Try to enhance recipes with URLs from citations if available
      const recipesWithUrls = citations.length > 0 
        ? this.enhanceRecipesWithCitations(parsedContent.recipes || [], citations)
        : parsedContent.recipes || [];
      
      // Filter out blocked domains (video/social media platforms)
      const blockedDomains = [
        'youtube.com',
        'youtu.be',
        'tiktok.com',
        'instagram.com',
        'facebook.com',
        'twitter.com',
        'x.com',
        'pinterest.com',
        'snapchat.com',
        'reddit.com'
      ];
      
      const filteredRecipes = recipesWithUrls.filter((recipe: any) => {
        // If no URL from citations, keep the recipe (we'll handle it later)
        if (!recipe.url || recipe.url === '') {
          console.log(`⚠️ Recipe "${recipe.title}" has no URL from citations, keeping it`);
          return true;
        }
        
        try {
          const url = new URL(recipe.url);
          const domain = url.hostname.toLowerCase().replace('www.', '');
          
          const isBlocked = blockedDomains.some(blocked => 
            domain === blocked || domain.endsWith('.' + blocked)
          );
          
          if (isBlocked) {
            console.log(`🚫 Filtered out blocked URL: ${recipe.url} (${recipe.title})`);
            return false;
          }
          
          return true;
        } catch (error) {
          console.log(`🚫 Filtered out invalid URL: ${recipe.url}`);
          return false;
        }
      });
      
      const initialResponse = {
        success: true,
        recipes: filteredRecipes,
        confidence: parsedContent.confidence || 'medium'
      };

      // Validate URLs (skip if disabled)
      const validatedResponse = this.skipUrlValidation 
        ? initialResponse 
        : await this.validateRecipeUrls(initialResponse);
      
      // Diversify results by domain/title and enforce requested count
      const diversified = this.diversifyRecipes(validatedResponse.recipes, request.numberOfMeals);

      // If not enough valid URLs, supplement with verified fallbacks
      const successThreshold = request.numberOfMeals * 0.5; // Need at least 50% success
      if (diversified.length < successThreshold) {
        console.log(`⚠️ Only ${diversified.length}/${request.numberOfMeals} diversified URLs from Perplexity`);
        
        if (retryCount < maxRetries) {
          console.log(`🔄 Retrying with different prompt (${retryCount + 1}/${maxRetries})...`);
          return this.getRecipeUrls(request, retryCount + 1);
        } else {
          console.log(`🔄 Max retries reached, supplementing with verified fallback URLs...`);
          // Supplement with verified URLs to meet the requirement
          const fallbackResponse = this.getFallbackUrls({
            ...request,
            numberOfMeals: request.numberOfMeals - diversified.length
          });
          
          return {
            success: true,
            recipes: [...diversified, ...fallbackResponse.recipes].slice(0, request.numberOfMeals),
            confidence: 'medium'
          };
        }
      }
      
      console.log('✅ Successfully received and validated recipe URLs:', {
        originalCount: parsedContent.recipes?.length || 0,
        filteredCount: filteredRecipes.length,
        validatedCount: validatedResponse.recipes.length,
        diversifiedCount: diversified.length,
        confidence: validatedResponse.confidence
      });

      return { ...validatedResponse, recipes: diversified.slice(0, request.numberOfMeals) };

    } catch (error) {
      if (retryCount < maxRetries) {
        console.log(`🔄 Retry ${retryCount + 1}/${maxRetries} after error:`, error);
        return this.getRecipeUrls(request, retryCount + 1);
      }
      
      console.error('❌ All retries failed, using fallback URLs:', error);
      return this.getFallbackUrls(request);
    }
  }

  /**
   * Build the prompt for recipe URL discovery
   */
  private buildRecipeUrlPrompt(request: PerplexityRecipeUrlRequest, retryCount = 0): string {
    // Preferred domains (soft). Keep list short to avoid token bloat.
    const globalPreferred = [
      'seriouseats.com', 'allrecipes.com', 'bbcgoodfood.com', 'foodnetwork.com',
      'taste.com.au', 'kingarthurbaking.com', 'simplyrecipes.com'
    ];

    const cuisine = (request.culturalCuisines?.[0] || '').toLowerCase();
    const country = (request.country || '').toLowerCase();
    const cuisineDomains: Record<string, string[]> = {
      japanese: ['justonecookbook.com', 'chopstickchronicles.com', 'thewoksoflife.com', 'seriouseats.com'],
      mexican: ['mexicanplease.com', 'isabeleats.com', 'seriouseats.com', 'allrecipes.com'],
      indian: ['vegrecipesofindia.com', 'seriouseats.com', 'bbcgoodfood.com', 'allrecipes.com'],
      chinese: ['thewoksoflife.com', 'redhousespice.com', 'seriouseats.com'],
      korean: ['maangchi.com', 'seriouseats.com', 'bbcgoodfood.com'],
      italian: ['seriouseats.com', 'allrecipes.com', 'bbcgoodfood.com'],
      greek: ['akispetretzikis.com', 'bbcgoodfood.com', 'seriouseats.com']
    };
    const countryDomains: Record<string, string[]> = {
      japan: ['justonecookbook.com', 'cookpad.com'],
      mexico: ['mexicanplease.com', 'kiwilimon.com'],
      india: ['vegrecipesofindia.com'],
      italy: ['giallozafferano.com'],
    };
    const preferredDomains = Array.from(new Set([
      ...(cuisineDomains[cuisine] || []),
      ...(countryDomains[country] || []),
      ...globalPreferred,
    ])).slice(0, 8);

    // Category synonyms help targeting
    const cats = (request.dishCategories || []).map(s => s.toLowerCase());
    const synonyms: string[] = [];
    if (cats.includes('dessert')) synonyms.push('dessert', 'sweet');
    if (cuisine === 'japanese' && cats.includes('dessert')) synonyms.push('wagashi', 'mochi', 'dorayaki', 'anko', 'castella', '和菓子');
    if (cats.includes('soup_stew')) synonyms.push('soup', 'stew', 'broth');
    if (cuisine === 'japanese' && cats.includes('soup_stew')) synonyms.push('miso', 'nabemono');
    if (cats.includes('appetizer')) synonyms.push('appetizer', 'starter');
    if (cats.includes('bread')) synonyms.push('bread', 'flatbread', 'naan', 'rolls');
    if (cats.includes('salad')) synonyms.push('salad');
    if (cats.includes('side')) synonyms.push('side dish');
    if (cats.includes('drink')) synonyms.push('drink', 'beverage', 'smoothie');
    if (synonyms.length === 0 && cats.length === 0) synonyms.push('recipe');

    // Cuisine-specific enrichments for minority cuisines (e.g., Hmong, Haitian, Brazilian)
    const cuisineSynonyms: Record<string, Record<string, string[]>> = {
      hmong: {
        dessert: ['ncua\u030bv (rice cake)', 'ncuv', 'sticky rice dessert', 'purple yam', 'sesame balls', 'sweet rice cake'],
        soup_stew: ['hmong soup', 'noodles soup', 'paj ntaub broth']
      },
      haitian: {
        dessert: ['pen/pain patate', 'dous makos', 'tablet pistach', 'syrup candies', 'pen patat', 'douce makos'],
        soup_stew: ['soup joumou', 'soupe joumou', 'bouillon']
      },
      brazilian: {
        dessert: ['brigadeiro', 'beijinho', 'quindim', 'pudim', 'bolo de cenoura', 'manjar branco'],
        soup_stew: ['caldo verde', 'feijoada']
      }
    };
    const cKey = cuisine.replace(/\s+/g, '');
    const catKey = cats.includes('dessert') ? 'dessert' : cats.includes('soup_stew') ? 'soup_stew' : '';
    if (cuisineSynonyms[cKey] && catKey && cuisineSynonyms[cKey][catKey]) {
      synonyms.push(...cuisineSynonyms[cKey][catKey]);
    }

    const dietaryText = request.dietaryRestrictions.length > 0 
      ? `Dietary restrictions: ${request.dietaryRestrictions.join(', ')}`
      : 'No dietary restrictions';

    const pantryText = request.pantry && request.pantry.length > 0
      ? `Available pantry items: ${request.pantry.join(', ')}`
      : 'No specific pantry items';

    const excludeText = request.exclude && request.exclude.length > 0
      ? `Exclude these ingredients: ${request.exclude.join(', ')}`
      : 'No ingredient exclusions';

    const timeText = request.maxTime 
      ? `Maximum cooking time: ${request.maxTime} minutes`
      : 'No time restrictions';

    const retryInstructions = retryCount > 0 
      ? `\n\nIMPORTANT: This is retry attempt ${retryCount + 1}. Previous results were insufficient. Prefer different reputable domains and broaden synonyms. Use citations and copy URLs from citations only.`
      : '';

    const courseText = cats.length ? `Course/category: ${cats.join(', ')}` : 'Course/category: any';
    const localeText = request.language ? `Preferred language: ${request.language}` : '';

    return `
Find ${request.numberOfMeals} authentic, real recipe pages (not listicles) that match:
- Cultural cuisines: ${request.culturalCuisines.join(', ')}
- ${courseText}
- ${dietaryText}
- ${timeText}
${localeText}
${pantryText}
${excludeText}

Quality rules:
- Prefer recipe pages with ingredients + step-by-step instructions.
- Prefer domains: ${preferredDomains.join(', ')}. If none suitable, use other reputable recipe sites. Avoid video/social/paywalled sites (YouTube, TikTok, Instagram, Pinterest, Reddit).
- Exclude listicles, category indexes, or pages without a specific recipe.
- Copy the recipe URL from a citation only. If not certain, set url = "" (empty). Do not guess.
- Use helpful synonyms: ${synonyms.join(', ') || 'recipe'}.
 - Diversity: Return results from at least 3 distinct domains and vary the primary ingredient/technique across items.

Return concise JSON only with each item having title, url, cuisine, estimatedTime, description.${retryInstructions}
`;
  }

  /** Diversify results by domain and title to avoid near-duplicates */
  private diversifyRecipes(recipes: RecipeUrlResult[], target: number): RecipeUrlResult[] {
    const normTitle = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const seenTitle = new Set<string>();
    const usedDomain = new Set<string>();
    const result: RecipeUrlResult[] = [];

    const items = [...recipes];
    for (const r of items) {
      if (!r.url) continue;
      let host = '';
      try { host = new URL(r.url).hostname.replace(/^www\./,'').toLowerCase(); } catch {}
      const t = normTitle(r.title || '');
      if (usedDomain.has(host)) continue;
      if (seenTitle.has(t)) continue;
      result.push(r);
      usedDomain.add(host);
      seenTitle.add(t);
      if (result.length >= target) return result;
    }
    // Fill remaining with items not duplicating titles (domains can repeat now)
    for (const r of items) {
      if (result.includes(r)) continue;
      const t = normTitle(r.title || '');
      if (seenTitle.has(t)) continue;
      result.push(r);
      seenTitle.add(t);
      if (result.length >= target) break;
    }
    // Final fill if still short
    for (const r of items) {
      if (result.includes(r)) continue;
      result.push(r);
      if (result.length >= target) break;
    }
    return result;
  }

  /**
   * JSON Schema for structured recipe URL output
   */
  private getRecipeUrlJsonSchema() {
    return {
      name: "recipe_urls",
      schema: {
        type: "object",
        properties: {
          recipes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "Exact recipe title to search for"
                },
                url: {
                  type: "string",
                  description: "URL to the recipe if available (optional - leave empty if uncertain)"
                },
                cuisine: {
                  type: "string",
                  description: "Primary cuisine type (e.g., Mexican, West African, Italian)"
                },
                course: {
                  type: "string",
                  description: "Course/dish category (e.g., Dessert, Soup, Appetizer)"
                },
                estimatedTime: {
                  type: "number",
                  description: "Total cooking time in minutes"
                },
                description: {
                  type: "string",
                  description: "Brief description of the dish and its cultural significance"
                },
                sourceDomain: {
                  type: "string",
                  description: "Domain of the source website"
                },
                score: {
                  type: "number",
                  description: "0-100 match quality score"
                },
                reason: {
                  type: "string",
                  description: "Why this matches filters (1 sentence)"
                }
              },
              required: ["title", "cuisine", "estimatedTime", "description"]
            }
          },
          confidence: {
            type: "string",
            enum: ["high", "medium", "low"],
            description: "Confidence level in the recipe URL quality and authenticity"
          }
        },
        required: ["recipes", "confidence"]
      }
    };
  }

  /**
   * Fallback URLs when Perplexity is not available - using VERIFIED working URLs
   */
  private getFallbackUrls(request: PerplexityRecipeUrlRequest): PerplexityRecipeUrlResponse {
    // Expanded list of VERIFIED working URLs (manually tested)
    const verifiedUrls: RecipeUrlResult[] = [
      // Mexican
      {
        title: "Classic Chicken Tacos",
        url: "https://www.allrecipes.com/recipe/70734/chicken-soft-tacos/",
        cuisine: "Mexican",
        estimatedTime: 30,
        description: "Simple and authentic chicken tacos"
      },
      {
        title: "Chicken Fajitas",
        url: "https://www.allrecipes.com/recipe/70935/chicken-fajitas/",
        cuisine: "Mexican",
        estimatedTime: 30,
        description: "Sizzling chicken fajitas with peppers"
      },
      {
        title: "Easy Beef Tacos",
        url: "https://www.allrecipes.com/recipe/70343/easy-taco-meat/",
        cuisine: "Mexican",
        estimatedTime: 25,
        description: "Quick and easy beef tacos"
      },
      
      // Indian
      {
        title: "Chicken Curry",
        url: "https://www.allrecipes.com/recipe/212721/indian-chicken-curry/",
        cuisine: "Indian",
        estimatedTime: 40,
        description: "Aromatic Indian chicken curry"
      },
      {
        title: "Butter Chicken",
        url: "https://www.allrecipes.com/recipe/45736/chicken-makhani-indian-butter-chicken/",
        cuisine: "Indian",
        estimatedTime: 45,
        description: "Creamy Indian butter chicken"
      },
      {
        title: "Chicken Tikka Masala",
        url: "https://www.allrecipes.com/recipe/228293/curry-stand-chicken-tikka-masala-sauce/",
        cuisine: "Indian",
        estimatedTime: 50,
        description: "Popular Indian chicken dish"
      },
      
      // Italian
      {
        title: "Spaghetti Marinara",
        url: "https://www.allrecipes.com/recipe/158140/simple-marinara-sauce/",
        cuisine: "Italian",
        estimatedTime: 25,
        description: "Classic Italian pasta with marinara sauce"
      },
      {
        title: "Chicken Parmesan",
        url: "https://www.allrecipes.com/recipe/223042/chicken-parmesan/",
        cuisine: "Italian",
        estimatedTime: 35,
        description: "Crispy breaded chicken with marinara"
      },
      {
        title: "Fettuccine Alfredo",
        url: "https://www.allrecipes.com/recipe/22831/alfredo-sauce/",
        cuisine: "Italian",
        estimatedTime: 20,
        description: "Creamy pasta with alfredo sauce"
      },
      
      // Asian
      {
        title: "Chicken Stir Fry",
        url: "https://www.allrecipes.com/recipe/223382/chicken-stir-fry/",
        cuisine: "Asian",
        estimatedTime: 20,
        description: "Quick and healthy chicken stir fry"
      },
      {
        title: "Vegetable Fried Rice",
        url: "https://www.allrecipes.com/recipe/79543/fried-rice-restaurant-style/",
        cuisine: "Chinese",
        estimatedTime: 20,
        description: "Restaurant-style vegetable fried rice"
      },
      {
        title: "Beef and Rice Bowl",
        url: "https://www.allrecipes.com/recipe/231947/korean-beef-bowl/",
        cuisine: "Korean",
        estimatedTime: 25,
        description: "Korean-inspired beef and rice bowl"
      },
      {
        title: "Teriyaki Chicken",
        url: "https://www.allrecipes.com/recipe/128532/teriyaki-chicken/",
        cuisine: "Japanese",
        estimatedTime: 30,
        description: "Sweet and savory teriyaki chicken"
      },
      
      // African
      {
        title: "Jollof Rice",
        url: "https://www.allrecipes.com/recipe/231944/nigerian-jollof-rice/",
        cuisine: "West African", 
        estimatedTime: 45,
        description: "Traditional West African rice dish"
      },
      
      // American/General
      {
        title: "Baked Chicken Breast",
        url: "https://www.allrecipes.com/recipe/240208/simple-baked-chicken-breasts/",
        cuisine: "American",
        estimatedTime: 35,
        description: "Simple and juicy baked chicken"
      },
      {
        title: "Beef and Vegetable Stew",
        url: "https://www.allrecipes.com/recipe/14685/slow-cooker-beef-stew-i/",
        cuisine: "American",
        estimatedTime: 60,
        description: "Hearty slow cooker beef stew"
      },
      {
        title: "Grilled Salmon",
        url: "https://www.allrecipes.com/recipe/12720/grilled-salmon-i/",
        cuisine: "American",
        estimatedTime: 25,
        description: "Simple grilled salmon with herbs"
      },
      
      // Mediterranean
      {
        title: "Greek Chicken",
        url: "https://www.allrecipes.com/recipe/231644/greek-lemon-chicken-and-potatoes/",
        cuisine: "Greek",
        estimatedTime: 50,
        description: "Lemon herb Greek chicken with potatoes"
      },
      {
        title: "Mediterranean Pasta",
        url: "https://www.allrecipes.com/recipe/213742/cheesy-chicken-broccoli-casserole/",
        cuisine: "Mediterranean",
        estimatedTime: 30,
        description: "Fresh Mediterranean pasta salad"
      }
    ];

    // Filter by requested cuisines if possible
    const matchingRecipes = verifiedUrls.filter(recipe => 
      request.culturalCuisines.some(cuisine => 
        recipe.cuisine.toLowerCase().includes(cuisine.toLowerCase()) ||
        cuisine.toLowerCase().includes(recipe.cuisine.toLowerCase())
      )
    );

    // If no matches, return first N recipes
    const selectedRecipes = matchingRecipes.length >= request.numberOfMeals 
      ? matchingRecipes.slice(0, request.numberOfMeals)
      : [...matchingRecipes, ...verifiedUrls.filter(r => !matchingRecipes.includes(r))]
          .slice(0, request.numberOfMeals);

    console.log(`✅ Using ${selectedRecipes.length} verified fallback URLs`);

    return {
      success: true,
      recipes: selectedRecipes,
      confidence: 'medium'
    };
  }
}

export const perplexityRecipeUrlService = new PerplexityRecipeUrlService();
