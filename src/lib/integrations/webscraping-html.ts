/**
 * WebScraping.AI HTML Fetcher + Perplexity Parser
 * Stage 2 Alternative: Get HTML via WebScraping.AI, parse with Perplexity
 */

interface WebScrapingHtmlResponse {
  html: string;
  url: string;
  status: number;
}

interface ParsedRecipeData {
  title: string;
  ingredients: string[];
  instructions: string[];
  servings?: number;
  totalTimeMinutes?: number;
  description?: string;
  imageUrl?: string;
}

export class WebScrapingHtmlService {
  private apiKey: string;
  private perplexityApiKey: string;

  constructor() {
    this.apiKey = process.env.WEBSCRAPING_AI_API_KEY || '';
    this.perplexityApiKey = process.env.PERPLEXITY_API_KEY || '';
  }

  /**
   * Get raw HTML from WebScraping.AI
   */
  async getHtml(url: string): Promise<WebScrapingHtmlResponse> {
    if (!this.apiKey) {
      throw new Error('WebScraping.AI API key not configured');
    }

    console.log('🌐 Fetching HTML from WebScraping.AI:', url);

    const params = new URLSearchParams({
      api_key: this.apiKey,
      url: url,
      timeout: '10000',
      js: 'true',
      js_timeout: '2000',
      format: 'json'
    });

    const response = await fetch(`https://api.webscraping.ai/text?${params}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ WebScraping.AI HTML API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`WebScraping.AI HTML API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    console.log('📄 WebScraping.AI response:', {
      hasText: !!data.text,
      textLength: data.text?.length || 0,
      hasHtml: !!data.html,
      htmlLength: data.html?.length || 0,
      status: data.status || response.status,
      url: data.url || url
    });
    
    // Use HTML if available, otherwise use text or result
    const content = data.html || data.text || data.result || '';
    
    return {
      html: content,
      url: data.url || url,
      status: data.status || response.status
    };
  }

  /**
   * Parse recipe data from HTML using Perplexity AI
   */
  async parseRecipeFromHtml(html: string, originalUrl: string): Promise<ParsedRecipeData> {
    if (!this.perplexityApiKey) {
      throw new Error('Perplexity API key not configured');
    }

    console.log('🧠 Parsing recipe data with Perplexity AI...');

    // Truncate HTML if it's too long (Perplexity has token limits)
    const maxHtmlLength = 15000; // Reasonable limit for recipe pages
    const truncatedHtml = html.length > maxHtmlLength 
      ? html.substring(0, maxHtmlLength) + '...[truncated]'
      : html;

    const prompt = `
Extract recipe information from this HTML content. Return ONLY valid JSON with no additional text.

HTML Content:
${truncatedHtml}

Extract the following information and return as JSON:
{
  "title": "Recipe title",
  "ingredients": ["ingredient 1", "ingredient 2", ...],
  "instructions": ["step 1", "step 2", ...],
  "servings": number,
  "totalTimeMinutes": number,
  "description": "brief description",
  "imageUrl": "image URL if found"
}

Requirements:
- Extract ALL ingredients with amounts and units (e.g., "2 cups flour", "1 lb chicken")
- Extract ALL cooking steps in order
- Find serving size and cooking time if available
- Include recipe description if present
- Find the main recipe image URL if available
- Return valid JSON only, no markdown or extra text
- If information is missing, use null for that field
`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.perplexityApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a recipe extraction expert. Extract recipe data from HTML and return only valid JSON. Be precise and thorough in extracting ingredients and instructions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.1,
        top_p: 0.1,
        search_context_size: "medium" // Balanced search depth
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    if (!content) {
      throw new Error('Empty response from Perplexity API');
    }

    try {
      // Clean up the response to ensure it's valid JSON
      const cleanContent = content.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '');
      const parsedData = JSON.parse(cleanContent);
      
      console.log('✅ Successfully parsed recipe data:', {
        title: parsedData.title,
        ingredientsCount: parsedData.ingredients?.length || 0,
        instructionsCount: parsedData.instructions?.length || 0,
        hasServings: !!parsedData.servings,
        hasTime: !!parsedData.totalTimeMinutes
      });

      return {
        title: parsedData.title || 'Untitled Recipe',
        ingredients: Array.isArray(parsedData.ingredients) ? parsedData.ingredients : [],
        instructions: Array.isArray(parsedData.instructions) ? parsedData.instructions : [],
        servings: parsedData.servings || null,
        totalTimeMinutes: parsedData.totalTimeMinutes || null,
        description: parsedData.description || null,
        imageUrl: parsedData.imageUrl || null
      };
    } catch (parseError) {
      console.error('❌ Failed to parse Perplexity response as JSON:', parseError);
      console.log('Raw response:', content);
      throw new Error('Failed to parse recipe data from Perplexity response');
    }
  }

  /**
   * Complete recipe extraction: HTML fetch + AI parsing
   */
  async extractRecipe(url: string): Promise<ParsedRecipeData> {
    console.log('🔄 Starting hybrid extraction for:', url);

    try {
      // Step 1: Get HTML from WebScraping.AI
      const htmlResponse = await this.getHtml(url);
      
      if (!htmlResponse.html || htmlResponse.html.length < 100) {
        throw new Error('Received empty or invalid HTML content');
      }

      console.log('✅ HTML fetched successfully:', {
        htmlLength: htmlResponse.html.length,
        status: htmlResponse.status
      });

      // Step 2: Parse recipe data with Perplexity
      const recipeData = await this.parseRecipeFromHtml(htmlResponse.html, url);

      console.log('✅ Hybrid extraction completed successfully');
      return recipeData;

    } catch (error) {
      console.error('❌ Hybrid extraction failed:', error);
      throw error;
    }
  }
}

export const webScrapingHtmlService = new WebScrapingHtmlService();