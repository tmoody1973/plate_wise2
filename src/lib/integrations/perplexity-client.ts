/**
 * Perplexity API Client for Recipe Content Parsing
 * 
 * Provides a dedicated client for Perplexity AI API with:
 * - Authentication and error handling
 * - Circuit breaker protection
 * - Recipe-specific parsing prompts
 * - Cultural context extraction
 */

import { circuitBreakerManager } from '../pricing/circuit-breaker';
import { PerplexityRecipePrompts } from './perplexity-recipe-prompts';
import { RecipeDataNormalizer } from './recipe-data-normalizer';

export interface PerplexityConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
  maxRetries: number;
  timeoutMs: number;
}

export interface ParsingContext {
  culturalCuisine?: string;
  dietaryRestrictions?: string[];
  expectedLanguage?: string;
}

export interface ParsedRecipe {
  title: string;
  description: string;
  culturalContext: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  metadata: RecipeMetadata;
  images: string[];
}

export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
  notes?: string;
  substitutions?: string[];
}

export interface Instruction {
  step: number;
  text: string;
  timeMinutes?: number;
  temperature?: string;
  equipment?: string[];
}

export interface RecipeMetadata {
  servings: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  totalTimeMinutes: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  culturalAuthenticity?: 'traditional' | 'adapted' | 'modern';
}

export interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface PerplexityResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
    delta?: {
      role?: string;
      content?: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class PerplexityClient {
  private config: PerplexityConfig;
  private circuitBreaker: any;

  constructor(config?: Partial<PerplexityConfig>) {
    this.config = {
      apiKey: process.env.PERPLEXITY_API_KEY || '',
      baseUrl: 'https://api.perplexity.ai',
      model: 'sonar-pro', // Using advanced model for better performance and quality
      maxTokens: 2000,
      temperature: 0.2,
      maxRetries: 3,
      timeoutMs: 30000,
      ...config
    };

    this.circuitBreaker = circuitBreakerManager.getBreaker('PerplexityAPI', {
      failureThreshold: 5,
      timeout: 60000,
      monitoringPeriod: 120000,
      successThreshold: 2
    });

    if (!this.config.apiKey) {
      console.warn('Perplexity API key not found. Set PERPLEXITY_API_KEY environment variable.');
    }
  }

  /**
   * Parse recipe content from URL using Perplexity AI
   */
  async parseRecipeFromUrl(url: string, context: ParsingContext = {}): Promise<ParsedRecipe> {
    try {
      const promptData = PerplexityRecipePrompts.buildRecipeExtractionPrompt(url, context);
      
      const response = await this.circuitBreaker.execute(() => 
        this.callPerplexityAPI([
          { role: 'system', content: promptData.systemPrompt },
          { role: 'user', content: promptData.userPrompt }
        ])
      );

      const parsedRecipe = this.parseRecipeResponse(response.choices[0].message.content);
      
      // Normalize and validate the parsed recipe
      const normalizationResult = await RecipeDataNormalizer.normalizeRecipe(parsedRecipe, {
        strictValidation: false,
        enhanceInstructions: true,
        validateImages: true,
        culturalContext: context.culturalCuisine
      });

      if (normalizationResult.changes.length > 0) {
        console.log(`🔧 Applied ${normalizationResult.changes.length} normalizations`);
      }

      if (normalizationResult.warnings.length > 0) {
        console.warn('Recipe normalization warnings:', normalizationResult.warnings);
      }

      // Validate the normalized recipe
      const { PerplexityPromptValidator } = await import('./perplexity-prompt-validator');
      const validation = PerplexityPromptValidator.validateRecipeExtraction(normalizationResult.normalizedRecipe);
      
      if (!validation.isValid) {
        console.warn('Recipe validation failed:', validation.errors);
        // Still return the recipe but log validation issues
      }

      console.log(`✅ Recipe quality score: ${normalizationResult.qualityScore}/100`);

      return normalizationResult.normalizedRecipe;
    } catch (error) {
      console.error('Perplexity recipe parsing failed:', error);
      throw new Error(`Recipe parsing failed: ${error.message}`);
    }
  }

  /**
   * Modify recipe for dietary restrictions using Perplexity AI
   */
  async modifyRecipe(
    originalRecipe: ParsedRecipe, 
    modificationType: string,
    maintainAuthenticity: boolean = true
  ): Promise<{
    modifiedRecipe: ParsedRecipe;
    modifications: Array<{
      originalIngredient: string;
      substituteIngredient: string;
      reason: string;
      culturalAuthenticity: 'traditional' | 'adapted' | 'modern';
    }>;
    authenticityNotes: string;
  }> {
    try {
      const promptData = PerplexityRecipePrompts.buildRecipeModificationPrompt(
        originalRecipe, 
        modificationType, 
        maintainAuthenticity
      );
      
      const response = await this.circuitBreaker.execute(() => 
        this.callPerplexityAPI([
          { role: 'system', content: promptData.systemPrompt },
          { role: 'user', content: promptData.userPrompt }
        ])
      );

      const modificationResult = this.parseModificationResponse(response.choices[0].message.content);
      
      // Validate the modified recipe
      const { PerplexityPromptValidator } = await import('./perplexity-prompt-validator');
      const validation = PerplexityPromptValidator.validateRecipeExtraction(modificationResult.modifiedRecipe);
      
      if (!validation.isValid) {
        console.warn('Modified recipe validation failed:', validation.errors);
      }

      return modificationResult;
    } catch (error) {
      console.error('Perplexity recipe modification failed:', error);
      throw new Error(`Recipe modification failed: ${error.message}`);
    }
  }

  /**
   * Call Perplexity API with messages and comprehensive error handling
   */
  private async callPerplexityAPI(messages: PerplexityMessage[]): Promise<PerplexityResponse> {
    const requestBody = {
      model: this.config.model,
      messages,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      search_mode: 'web',
      return_citations: true,
      return_images: true,
      search_domain_filter: [
        'allrecipes.com',
        'foodnetwork.com',
        'seriouseats.com',
        'bonappetit.com',
        'epicurious.com',
        'tasteofhome.com',
        'delish.com',
        'food.com'
      ]
    };

    let lastError: Error;
    
    // Implement retry logic with exponential backoff
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

      try {
        console.log(`🧠 Perplexity API call attempt ${attempt}/${this.config.maxRetries}`);
        
        const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          const error = new Error(`Perplexity API error: ${response.status} ${response.statusText} - ${errorText}`);
          
          // Check if error is retryable
          if (this.isRetryableError(response.status)) {
            lastError = error;
            console.warn(`Retryable error on attempt ${attempt}:`, error.message);
            
            if (attempt < this.config.maxRetries) {
              const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
              console.log(`Waiting ${delay}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
          }
          
          throw error;
        }

        const result = await response.json();
        
        // Validate response structure
        if (!result.choices || !Array.isArray(result.choices) || result.choices.length === 0) {
          throw new Error('Invalid response structure from Perplexity API');
        }

        if (!result.choices[0].message || !result.choices[0].message.content) {
          throw new Error('No content in Perplexity API response');
        }

        console.log(`✅ Perplexity API call successful (tokens: ${result.usage?.total_tokens || 'unknown'})`);
        return result;

      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error as Error;
        
        if (error.name === 'AbortError') {
          lastError = new Error('Perplexity API request timeout');
        }

        console.error(`Perplexity API attempt ${attempt} failed:`, lastError.message);
        
        // If this is the last attempt or error is not retryable, throw
        if (attempt >= this.config.maxRetries || !this.isRetryableError(0)) {
          break;
        }

        // Wait before retrying
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Check if an HTTP status code indicates a retryable error
   */
  private isRetryableError(statusCode: number): boolean {
    // Retry on server errors, rate limits, and timeouts
    return statusCode >= 500 || statusCode === 429 || statusCode === 408;
  }

  /**
   * Build recipe parsing prompt with cultural context using structured prompts
   */
  private buildRecipeParsingPrompt(url: string, context: ParsingContext): string {
    const promptData = PerplexityRecipePrompts.buildRecipeExtractionPrompt(url, context);
    return promptData.userPrompt;
  }

  /**
   * Build recipe modification prompt using structured prompts
   */
  private buildRecipeModificationPrompt(
    originalRecipe: ParsedRecipe,
    modificationType: string,
    maintainAuthenticity: boolean
  ): string {
    const promptData = PerplexityRecipePrompts.buildRecipeModificationPrompt(
      originalRecipe, 
      modificationType, 
      maintainAuthenticity
    );
    return promptData.userPrompt;
  }

  /**
   * Parse recipe response from Perplexity with comprehensive validation
   */
  private parseRecipeResponse(content: string): ParsedRecipe {
    try {
      console.log('🔍 Parsing Perplexity recipe response...');
      
      // First validate JSON structure
      const { PerplexityPromptValidator } = require('./perplexity-prompt-validator');
      const jsonValidation = PerplexityPromptValidator.validateJSONStructure(content);
      
      if (!jsonValidation.isValid) {
        console.error('JSON validation failed:', jsonValidation.errors);
        throw new Error(`Invalid JSON structure: ${jsonValidation.errors.join(', ')}`);
      }

      // Extract and parse JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields with detailed error messages
      const missingFields = [];
      if (!parsed.title || typeof parsed.title !== 'string') missingFields.push('title');
      if (!parsed.ingredients || !Array.isArray(parsed.ingredients)) missingFields.push('ingredients');
      if (!parsed.instructions || !Array.isArray(parsed.instructions)) missingFields.push('instructions');
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required recipe fields: ${missingFields.join(', ')}`);
      }

      // Parse and validate ingredients
      const ingredients = parsed.ingredients.map((ing: any, index: number) => {
        const ingredient = {
          name: this.sanitizeString(ing.name) || `Ingredient ${index + 1}`,
          amount: this.parseNumericValue(ing.amount, 1),
          unit: this.sanitizeString(ing.unit) || 'piece',
          notes: this.sanitizeString(ing.notes),
          substitutions: Array.isArray(ing.substitutions) ? ing.substitutions.map(this.sanitizeString) : []
        };

        // Validate ingredient has meaningful data
        if (!ingredient.name || ingredient.name.length < 2) {
          console.warn(`Warning: Ingredient ${index + 1} has invalid name: "${ingredient.name}"`);
        }

        return ingredient;
      });

      // Parse and validate instructions
      const instructions = parsed.instructions.map((inst: any, index: number) => {
        const instruction = {
          step: this.parseNumericValue(inst.step, index + 1),
          text: this.sanitizeString(inst.text) || `Step ${index + 1}`,
          timeMinutes: inst.timeMinutes ? this.parseNumericValue(inst.timeMinutes) : undefined,
          temperature: this.sanitizeString(inst.temperature),
          equipment: Array.isArray(inst.equipment) ? inst.equipment.map(this.sanitizeString) : []
        };

        // Validate instruction has meaningful content
        if (!instruction.text || instruction.text.length < 10) {
          console.warn(`Warning: Instruction ${index + 1} is very short: "${instruction.text}"`);
        }

        return instruction;
      });

      // Parse and validate metadata
      const metadata = {
        servings: this.parseNumericValue(parsed.metadata?.servings, 4),
        prepTimeMinutes: parsed.metadata?.prepTimeMinutes ? this.parseNumericValue(parsed.metadata.prepTimeMinutes) : undefined,
        cookTimeMinutes: parsed.metadata?.cookTimeMinutes ? this.parseNumericValue(parsed.metadata.cookTimeMinutes) : undefined,
        totalTimeMinutes: this.parseNumericValue(parsed.metadata?.totalTimeMinutes, 30),
        difficulty: this.validateDifficulty(parsed.metadata?.difficulty),
        culturalAuthenticity: this.validateAuthenticity(parsed.metadata?.culturalAuthenticity)
      };

      // Parse and validate images
      const images = Array.isArray(parsed.images) 
        ? parsed.images.filter(img => typeof img === 'string' && img.length > 0)
        : [];

      const result: ParsedRecipe = {
        title: this.sanitizeString(parsed.title) || 'Untitled Recipe',
        description: this.sanitizeString(parsed.description) || '',
        culturalContext: this.sanitizeString(parsed.culturalContext) || '',
        ingredients,
        instructions,
        metadata,
        images
      };

      console.log(`✅ Recipe parsed successfully: "${result.title}" (${ingredients.length} ingredients, ${instructions.length} steps)`);
      return result;

    } catch (error) {
      console.error('Failed to parse recipe response:', error);
      console.error('Response content preview:', content.substring(0, 500) + '...');
      throw new Error(`Failed to parse recipe: ${error.message}`);
    }
  }

  /**
   * Sanitize string values from API responses
   */
  private sanitizeString(value: any): string | undefined {
    if (typeof value !== 'string') return undefined;
    return value.trim().replace(/\s+/g, ' ') || undefined;
  }

  /**
   * Parse numeric values with fallback
   */
  private parseNumericValue(value: any, fallback?: number): number | undefined {
    if (typeof value === 'number' && !isNaN(value) && value > 0) {
      return value;
    }
    
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    
    return fallback;
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
    return 'medium'; // Default fallback
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
    return 'adapted'; // Default fallback
  }

  /**
   * Parse modification response from Perplexity with validation
   */
  private parseModificationResponse(content: string): any {
    try {
      console.log('🔍 Parsing Perplexity modification response...');
      
      // Validate JSON structure
      const { PerplexityPromptValidator } = require('./perplexity-prompt-validator');
      const jsonValidation = PerplexityPromptValidator.validateJSONStructure(content);
      
      if (!jsonValidation.isValid) {
        console.error('Modification JSON validation failed:', jsonValidation.errors);
        throw new Error(`Invalid JSON structure: ${jsonValidation.errors.join(', ')}`);
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in modification response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate required fields
      if (!parsed.modifiedRecipe) {
        throw new Error('Missing modifiedRecipe in response');
      }

      // Parse the modified recipe
      const modifiedRecipe = this.parseRecipeResponse(JSON.stringify(parsed.modifiedRecipe));

      // Parse and validate modifications
      const modifications = Array.isArray(parsed.modifications) 
        ? parsed.modifications.map((mod: any, index: number) => ({
            originalIngredient: this.sanitizeString(mod.originalIngredient) || `Original ingredient ${index + 1}`,
            substituteIngredient: this.sanitizeString(mod.substituteIngredient) || `Substitute ingredient ${index + 1}`,
            reason: this.sanitizeString(mod.reason) || 'Dietary modification',
            culturalAuthenticity: this.validateAuthenticity(mod.culturalAuthenticity)
          }))
        : [];

      const result = {
        modifiedRecipe,
        modifications,
        authenticityNotes: this.sanitizeString(parsed.authenticityNotes) || 'Recipe has been modified for dietary restrictions.'
      };

      console.log(`✅ Modification parsed successfully: ${modifications.length} substitutions made`);
      return result;

    } catch (error) {
      console.error('Failed to parse modification response:', error);
      console.error('Response content preview:', content.substring(0, 500) + '...');
      throw new Error(`Failed to parse modification: ${error.message}`);
    }
  }

  /**
   * Get client health status
   */
  getHealthStatus() {
    return {
      circuitBreakerState: this.circuitBreaker.getStats().state,
      hasApiKey: !!this.config.apiKey,
      baseUrl: this.config.baseUrl,
      model: this.config.model
    };
  }
}