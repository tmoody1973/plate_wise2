/**
 * Groq API Client for Recipe Content Parsing
 * 
 * Provides a dedicated client for Groq AI API with web search capabilities
 * for comparison with Perplexity API performance and quality.
 */

import Groq from 'groq-sdk';

export interface GroqConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  maxRetries: number;
  timeoutMs: number;
}

export interface GroqRecipeResult {
  title: string;
  description: string;
  culturalContext: string;
  ingredients: Array<{
    name: string;
    amount: number;
    unit: string;
    notes?: string;
  }>;
  instructions: Array<{
    step: number;
    text: string;
    timeMinutes?: number;
    temperature?: string;
    equipment?: string[];
  }>;
  metadata: {
    servings: number;
    prepTimeMinutes?: number;
    cookTimeMinutes?: number;
    totalTimeMinutes: number;
    difficulty: 'easy' | 'medium' | 'hard';
    culturalAuthenticity: 'traditional' | 'adapted' | 'modern';
  };
  images: string[];
  extractionMethod: 'groq-compound';
  extractionTimeMs: number;
}

export class GroqRecipeClient {
  private groq: Groq;
  private config: GroqConfig;

  constructor(config?: Partial<GroqConfig>) {
    this.config = {
      apiKey: process.env.GROQ_API_KEY || '',
      model: 'groq/compound', // Using Groq's compound model for web search
      maxTokens: 2000,
      temperature: 0.2,
      maxRetries: 3,
      timeoutMs: 30000,
      ...config
    };

    this.groq = new Groq({
      apiKey: this.config.apiKey,
      defaultHeaders: {
        "Groq-Model-Version": "latest"
      }
    });

    if (!this.config.apiKey) {
      console.warn('Groq API key not found. Set GROQ_API_KEY environment variable.');
    }
  }

  /**
   * Parse recipe from URL using Groq AI with web search
   */
  async parseRecipeFromUrl(url: string, culturalCuisine?: string): Promise<GroqRecipeResult> {
    const startTime = Date.now();

    try {
      console.log(`🤖 Groq parsing recipe from: ${url}`);

      const prompt = this.buildRecipeExtractionPrompt(url, culturalCuisine);

      const chatCompletion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a professional culinary expert and recipe extraction specialist. Extract complete recipe data from URLs and return structured JSON. Always include cultural context and traditional cooking methods."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: this.config.model,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        top_p: 1,
        stream: false,
        compound_custom: {
          tools: {
            enabled_tools: ["web_search", "visit_website"]
          }
        }
      });

      const content = chatCompletion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from Groq API');
      }

      const extractionTime = Date.now() - startTime;
      const parsedRecipe = this.parseGroqResponse(content, extractionTime);

      console.log(`✅ Groq parsing completed in ${extractionTime}ms`);
      return parsedRecipe;

    } catch (error) {
      console.error('Groq recipe parsing failed:', error);
      throw new Error(`Groq parsing failed: ${error.message}`);
    }
  }

  /**
   * Build recipe extraction prompt for Groq
   */
  private buildRecipeExtractionPrompt(url: string, culturalCuisine?: string): string {
    const culturalContext = culturalCuisine 
      ? `This recipe is from ${culturalCuisine} cuisine. Please preserve cultural authenticity and traditional cooking methods.`
      : 'Please identify the cultural origin and include relevant cultural context.';

    return `
Please extract the complete recipe information from this URL: ${url}

${culturalContext}

Visit the URL and extract the following information, then return it as a JSON object:

{
  "title": "Complete recipe title",
  "description": "Brief but informative description of the dish",
  "culturalContext": "Cultural background, traditional significance, and authenticity notes",
  "ingredients": [
    {
      "name": "ingredient name",
      "amount": numeric_amount,
      "unit": "measurement unit",
      "notes": "preparation notes or cultural significance"
    }
  ],
  "instructions": [
    {
      "step": step_number,
      "text": "detailed instruction text",
      "timeMinutes": estimated_time_for_step,
      "temperature": "cooking temperature if applicable",
      "equipment": ["required equipment for this step"]
    }
  ],
  "metadata": {
    "servings": number_of_servings,
    "prepTimeMinutes": preparation_time,
    "cookTimeMinutes": cooking_time,
    "totalTimeMinutes": total_time,
    "difficulty": "easy|medium|hard",
    "culturalAuthenticity": "traditional|adapted|modern"
  },
  "images": ["high-quality image URLs from the recipe page"]
}

Requirements:
1. Extract ALL ingredients with precise measurements and units
2. Provide step-by-step instructions in logical cooking order
3. Include cultural context and traditional significance
4. Find and validate high-quality recipe images
5. Estimate cooking times and difficulty levels accurately
6. Preserve authentic ingredient names and techniques
7. Return ONLY valid JSON without additional text or markdown

Use your web search and website visit tools to access the URL and extract this information accurately.
`;
  }

  /**
   * Parse Groq response and normalize data
   */
  private parseGroqResponse(content: string, extractionTimeMs: number): GroqRecipeResult {
    try {
      // Clean the response to extract JSON
      let jsonText = content.trim();
      
      // Remove markdown formatting if present
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      
      // Try to find JSON object in the response
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      const parsed = JSON.parse(jsonText);
      
      // Validate and normalize the parsed data
      return {
        title: parsed.title || 'Untitled Recipe',
        description: parsed.description || '',
        culturalContext: parsed.culturalContext || '',
        ingredients: this.normalizeIngredients(parsed.ingredients || []),
        instructions: this.normalizeInstructions(parsed.instructions || []),
        metadata: {
          servings: parseInt(parsed.metadata?.servings) || 4,
          prepTimeMinutes: parsed.metadata?.prepTimeMinutes ? parseInt(parsed.metadata.prepTimeMinutes) : undefined,
          cookTimeMinutes: parsed.metadata?.cookTimeMinutes ? parseInt(parsed.metadata.cookTimeMinutes) : undefined,
          totalTimeMinutes: parseInt(parsed.metadata?.totalTimeMinutes) || 30,
          difficulty: this.validateDifficulty(parsed.metadata?.difficulty),
          culturalAuthenticity: this.validateAuthenticity(parsed.metadata?.culturalAuthenticity)
        },
        images: Array.isArray(parsed.images) ? parsed.images.filter(img => typeof img === 'string') : [],
        extractionMethod: 'groq-compound-mini',
        extractionTimeMs
      };

    } catch (error) {
      console.error('Failed to parse Groq response:', error);
      console.error('Response content:', content.substring(0, 500) + '...');
      throw new Error(`Failed to parse Groq response: ${error.message}`);
    }
  }

  /**
   * Normalize ingredients from Groq response
   */
  private normalizeIngredients(ingredients: any[]): Array<{
    name: string;
    amount: number;
    unit: string;
    notes?: string;
  }> {
    return ingredients.map((ing, index) => ({
      name: ing.name || `Ingredient ${index + 1}`,
      amount: parseFloat(ing.amount) || 1,
      unit: ing.unit || 'piece',
      notes: ing.notes
    }));
  }

  /**
   * Normalize instructions from Groq response
   */
  private normalizeInstructions(instructions: any[]): Array<{
    step: number;
    text: string;
    timeMinutes?: number;
    temperature?: string;
    equipment?: string[];
  }> {
    return instructions.map((inst, index) => ({
      step: inst.step || index + 1,
      text: inst.text || '',
      timeMinutes: inst.timeMinutes ? parseInt(inst.timeMinutes) : undefined,
      temperature: inst.temperature,
      equipment: Array.isArray(inst.equipment) ? inst.equipment : []
    }));
  }

  /**
   * Validate difficulty level
   */
  private validateDifficulty(difficulty: any): 'easy' | 'medium' | 'hard' {
    if (typeof difficulty === 'string') {
      const normalized = difficulty.toLowerCase();
      if (['easy', 'medium', 'hard'].includes(normalized)) {
        return normalized as 'easy' | 'medium' | 'hard';
      }
    }
    return 'medium';
  }

  /**
   * Validate cultural authenticity level
   */
  private validateAuthenticity(authenticity: any): 'traditional' | 'adapted' | 'modern' {
    if (typeof authenticity === 'string') {
      const normalized = authenticity.toLowerCase();
      if (['traditional', 'adapted', 'modern'].includes(normalized)) {
        return normalized as 'traditional' | 'adapted' | 'modern';
      }
    }
    return 'adapted';
  }

  /**
   * Get client health status
   */
  getHealthStatus() {
    return {
      hasApiKey: !!this.config.apiKey,
      model: this.config.model,
      webSearchEnabled: true
    };
  }
}

export const groqRecipeClient = new GroqRecipeClient();