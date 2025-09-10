/**
 * Perplexity Recipe Service
 * 
 * High-level service that orchestrates recipe parsing using structured prompts
 * and validation. This is the main interface for the Tavily + Perplexity
 * two-stage recipe search system.
 */

import { PerplexityClient, ParsingContext, ParsedRecipe } from './perplexity-client';
import { PerplexityRecipePrompts } from './perplexity-recipe-prompts';
import { PerplexityPromptValidator, RecipeValidationResult } from './perplexity-prompt-validator';
import { RecipeValidationService, ComprehensiveValidationResult } from './recipe-validation-service';
import { EnhancedRecipe, RecipeModificationRequest, ModifiedRecipeResponse } from './recipe-types';

export interface RecipeParsingOptions {
  validateResponse?: boolean;
  retryOnValidationFailure?: boolean;
  maxRetries?: number;
  includeImages?: boolean;
  culturalAuthenticity?: 'strict' | 'moderate' | 'flexible';
}

export interface RecipeParsingResult {
  recipe: ParsedRecipe;
  validation: ComprehensiveValidationResult;
  metadata: {
    parseTime: number;
    retryCount: number;
    source: 'perplexity';
    qualityScore: number;
  };
}

export interface ImageExtractionResult {
  images: Array<{
    url: string;
    description: string;
    quality: 'high' | 'medium' | 'low';
    relevance: 'primary_dish' | 'cooking_process' | 'ingredients' | 'cultural_context';
    priority: number;
  }>;
  totalFound: number;
  highQualityCount: number;
}

export class PerplexityRecipeService {
  private client: PerplexityClient;

  constructor(config?: any) {
    this.client = new PerplexityClient(config);
  }

  /**
   * Parse recipe from URL with comprehensive validation and retry logic
   */
  async parseRecipeFromUrl(
    url: string, 
    context: ParsingContext = {}, 
    options: RecipeParsingOptions = {}
  ): Promise<RecipeParsingResult> {
    const startTime = Date.now();
    const {
      validateResponse = true,
      retryOnValidationFailure = true,
      maxRetries = 2,
      includeImages = true,
      culturalAuthenticity = 'moderate'
    } = options;

    let retryCount = 0;
    let lastError: Error | null = null;
    let bestResult: RecipeParsingResult | null = null;

    // Adjust context based on authenticity preference
    const enhancedContext: ParsingContext = {
      ...context,
      maintainAuthenticity: culturalAuthenticity !== 'flexible'
    };

    while (retryCount <= maxRetries) {
      try {
        console.log(`🧠 Parsing recipe from ${url} (attempt ${retryCount + 1}/${maxRetries + 1})`);

        // Parse the recipe
        const recipe = await this.client.parseRecipeFromUrl(url, enhancedContext);

        // Extract additional images if requested
        if (includeImages && (!recipe.images || recipe.images.length === 0)) {
          try {
            const imageResult = await this.extractHighQualityImages(url, recipe.title);
            if (imageResult.images.length > 0) {
              recipe.images = imageResult.images.map(img => img.url);
            }
          } catch (imageError) {
            console.warn('Image extraction failed:', imageError);
          }
        }

        // Comprehensive validation
        let validation: ComprehensiveValidationResult;
        if (validateResponse) {
          validation = await RecipeValidationService.validateRecipe(recipe, {
            validatePromptResponse: true,
            validateDataQuality: true,
            validateCulturalAuthenticity: culturalAuthenticity !== 'flexible',
            minQualityScore: culturalAuthenticity === 'strict' ? 80 : 70,
            requireImages: includeImages,
            culturalContext: enhancedContext.culturalCuisine,
            strictValidation: culturalAuthenticity === 'strict',
            enhanceInstructions: true,
            validateImages: includeImages
          });
          
          // If validation fails and we have retries left, try again
          if (!validation.isValid && retryOnValidationFailure && retryCount < maxRetries) {
            console.warn(`Validation failed (score: ${validation.overallScore}), retrying...`, validation.issues);
            retryCount++;
            continue;
          }
        } else {
          // Quick validation only
          const quickValidation = RecipeValidationService.quickValidate(recipe);
          validation = {
            isValid: quickValidation.isValid,
            recipe,
            promptValidation: {
              isValid: quickValidation.isValid,
              errors: quickValidation.criticalIssues,
              warnings: [],
              score: quickValidation.score,
              suggestions: [],
              completeness: {
                hasTitle: !!recipe.title,
                hasIngredients: recipe.ingredients?.length > 0,
                hasInstructions: recipe.instructions?.length > 0,
                hasImages: recipe.images?.length > 0,
                hasCulturalContext: !!recipe.culturalContext,
                hasNutritionalInfo: false
              },
              quality: {
                ingredientCount: recipe.ingredients?.length || 0,
                instructionCount: recipe.instructions?.length || 0,
                imageCount: recipe.images?.length || 0,
                culturalDepth: 5,
                authenticityScore: 7
              }
            },
            normalizationResult: {
              normalizedRecipe: recipe,
              changes: [],
              warnings: [],
              qualityScore: quickValidation.score
            },
            overallScore: quickValidation.score,
            issues: quickValidation.criticalIssues.map(issue => ({
              type: 'error' as const,
              category: 'structure' as const,
              message: issue,
              severity: 'critical' as const,
              fixable: false
            })),
            recommendations: [],
            metadata: {
              validationTime: 0,
              changesApplied: 0,
              warningsCount: 0,
              errorsCount: quickValidation.criticalIssues.length
            }
          };
        }

        const result: RecipeParsingResult = {
          recipe: validation.recipe, // Use the validated/normalized recipe
          validation,
          metadata: {
            parseTime: Date.now() - startTime,
            retryCount,
            source: 'perplexity',
            qualityScore: validation.overallScore
          }
        };

        // Keep track of the best result
        if (!bestResult || validation.overallScore > bestResult.validation.overallScore) {
          bestResult = result;
        }

        // If validation passed or we're out of retries, return the result
        if (validation.isValid || retryCount >= maxRetries) {
          console.log(`✅ Recipe parsing completed (score: ${validation.overallScore}, retries: ${retryCount})`);
          if (validation.recommendations.length > 0) {
            console.log('💡 Recommendations:', validation.recommendations);
          }
          return result;
        }

      } catch (error) {
        lastError = error as Error;
        console.error(`❌ Recipe parsing attempt ${retryCount + 1} failed:`, error);
        
        if (retryCount >= maxRetries) {
          break;
        }
      }

      retryCount++;
      
      // Wait before retrying (exponential backoff)
      if (retryCount <= maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // If we have a best result, return it even if not perfect
    if (bestResult) {
      console.warn(`Returning best result after ${retryCount} attempts (score: ${bestResult.validation.overallScore})`);
      return bestResult;
    }

    // If all attempts failed, throw the last error
    throw new Error(`Recipe parsing failed after ${retryCount} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Extract high-quality images from recipe URL
   */
  async extractHighQualityImages(url: string, recipeTitle?: string): Promise<ImageExtractionResult> {
    try {
      console.log(`🖼️ Extracting images from ${url}`);

      const promptData = PerplexityRecipePrompts.buildImageExtractionPrompt(url, recipeTitle);
      
      const response = await this.client['callPerplexityAPI']([
        { role: 'system', content: promptData.systemPrompt },
        { role: 'user', content: promptData.userPrompt }
      ]);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from Perplexity API');
      }

      // Parse the JSON response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in image extraction response');
      }

      const images = JSON.parse(jsonMatch[0]);
      
      // Sort by priority and quality
      const sortedImages = images
        .filter((img: any) => img.url && img.quality !== 'low')
        .sort((a: any, b: any) => {
          // Primary dish images first, then by priority
          if (a.relevance === 'primary_dish' && b.relevance !== 'primary_dish') return -1;
          if (b.relevance === 'primary_dish' && a.relevance !== 'primary_dish') return 1;
          return (b.priority || 5) - (a.priority || 5);
        })
        .slice(0, 5); // Limit to top 5 images

      const highQualityCount = sortedImages.filter((img: any) => img.quality === 'high').length;

      console.log(`✅ Found ${sortedImages.length} quality images (${highQualityCount} high quality)`);

      return {
        images: sortedImages,
        totalFound: images.length,
        highQualityCount
      };

    } catch (error) {
      console.error('Image extraction failed:', error);
      return {
        images: [],
        totalFound: 0,
        highQualityCount: 0
      };
    }
  }

  /**
   * Modify recipe for dietary restrictions
   */
  async modifyRecipe(request: RecipeModificationRequest): Promise<ModifiedRecipeResponse> {
    try {
      console.log(`🔄 Modifying recipe for ${request.modificationType}`);

      const result = await this.client.modifyRecipe(
        request.originalRecipe as any,
        request.modificationType,
        request.maintainAuthenticity !== false
      );

      // Validate the modified recipe
      const validation = PerplexityPromptValidator.validateRecipeExtraction(result.modifiedRecipe);
      
      if (!validation.isValid) {
        console.warn('Modified recipe validation failed:', validation.errors);
      }

      console.log(`✅ Recipe modification completed (authenticity: ${result.authenticityNotes})`);

      return {
        modifiedRecipe: this.convertToEnhancedRecipe(result.modifiedRecipe),
        modifications: result.modifications.map(mod => ({
          originalIngredient: mod.originalIngredient,
          substituteIngredient: mod.substituteIngredient,
          reason: mod.reason,
          quantityAdjustment: '',
          cookingAdjustment: '',
          flavorImpact: 'moderate' as const,
          culturalAuthenticity: mod.culturalAuthenticity
        })),
        authenticityNotes: result.authenticityNotes,
        culturalContext: result.modifiedRecipe.culturalContext || ''
      };

    } catch (error) {
      console.error('Recipe modification failed:', error);
      throw new Error(`Recipe modification failed: ${error.message}`);
    }
  }

  /**
   * Assess cultural authenticity of a recipe
   */
  async assessCulturalAuthenticity(recipe: any, claimedCuisine: string): Promise<{
    authenticityScore: number;
    authenticityLevel: 'traditional' | 'adapted' | 'fusion' | 'inauthentic';
    culturalAccuracy: any;
    historicalContext: string;
    improvementSuggestions: string[];
  }> {
    try {
      console.log(`🏛️ Assessing cultural authenticity for ${claimedCuisine} cuisine`);

      const promptData = PerplexityRecipePrompts.buildCulturalAuthenticityPrompt(recipe, claimedCuisine);
      
      const response = await this.client['callPerplexityAPI']([
        { role: 'system', content: promptData.systemPrompt },
        { role: 'user', content: promptData.userPrompt }
      ]);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from authenticity assessment');
      }

      // Parse the JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in authenticity assessment response');
      }

      const assessment = JSON.parse(jsonMatch[0]);
      
      console.log(`✅ Authenticity assessment completed (score: ${assessment.authenticityScore}/10)`);

      return assessment;

    } catch (error) {
      console.error('Cultural authenticity assessment failed:', error);
      throw new Error(`Authenticity assessment failed: ${error.message}`);
    }
  }

  /**
   * Parse and normalize ingredient list
   */
  async parseIngredients(rawIngredients: string[]): Promise<{
    ingredients: Array<{
      name: string;
      amount: number;
      unit: string;
      notes?: string;
      culturalSignificance?: string;
    }>;
    parsingNotes: string[];
    culturalIngredients: string[];
  }> {
    try {
      console.log(`📝 Parsing ${rawIngredients.length} ingredients`);

      const promptData = PerplexityRecipePrompts.buildIngredientParsingPrompt(rawIngredients);
      
      const response = await this.client['callPerplexityAPI']([
        { role: 'system', content: promptData.systemPrompt },
        { role: 'user', content: promptData.userPrompt }
      ]);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from ingredient parsing');
      }

      // Parse the JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in ingredient parsing response');
      }

      const result = JSON.parse(jsonMatch[0]);
      
      console.log(`✅ Ingredient parsing completed (${result.ingredients?.length || 0} ingredients)`);

      return {
        ingredients: result.ingredients || [],
        parsingNotes: result.parsingNotes || [],
        culturalIngredients: result.culturalIngredients || []
      };

    } catch (error) {
      console.error('Ingredient parsing failed:', error);
      throw new Error(`Ingredient parsing failed: ${error.message}`);
    }
  }

  /**
   * Parse and enhance cooking instructions
   */
  async parseInstructions(rawInstructions: string[], culturalContext?: string): Promise<{
    instructions: Array<{
      step: number;
      text: string;
      timeMinutes?: number;
      equipment?: string[];
      culturalTechnique?: string;
    }>;
    cookingFlow: any;
    culturalTechniques: any[];
  }> {
    try {
      console.log(`📋 Parsing ${rawInstructions.length} instructions`);

      const promptData = PerplexityRecipePrompts.buildInstructionParsingPrompt(rawInstructions, culturalContext);
      
      const response = await this.client['callPerplexityAPI']([
        { role: 'system', content: promptData.systemPrompt },
        { role: 'user', content: promptData.userPrompt }
      ]);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from instruction parsing');
      }

      // Parse the JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in instruction parsing response');
      }

      const result = JSON.parse(jsonMatch[0]);
      
      console.log(`✅ Instruction parsing completed (${result.instructions?.length || 0} steps)`);

      return {
        instructions: result.instructions || [],
        cookingFlow: result.cookingFlow || {},
        culturalTechniques: result.culturalTechniques || []
      };

    } catch (error) {
      console.error('Instruction parsing failed:', error);
      throw new Error(`Instruction parsing failed: ${error.message}`);
    }
  }

  /**
   * Convert ParsedRecipe to EnhancedRecipe format for backward compatibility
   */
  private convertToEnhancedRecipe(parsedRecipe: ParsedRecipe): EnhancedRecipe {
    return {
      title: parsedRecipe.title,
      description: parsedRecipe.description,
      culturalOrigin: parsedRecipe.culturalContext ? [parsedRecipe.culturalContext] : [],
      cuisine: parsedRecipe.culturalContext || 'international',
      sourceUrl: '', // Will be set by the calling service
      imageUrl: parsedRecipe.images?.[0],
      totalTimeMinutes: parsedRecipe.metadata.totalTimeMinutes,
      servings: parsedRecipe.metadata.servings,
      yieldText: `Serves ${parsedRecipe.metadata.servings}`,
      ingredients: parsedRecipe.ingredients.map(ing => ({
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit
      })),
      instructions: parsedRecipe.instructions.map(inst => ({
        step: inst.step,
        text: inst.text
      })),
      nutritionalInfo: undefined, // Will be calculated separately if needed
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Get service health status
   */
  getHealthStatus() {
    return {
      ...this.client.getHealthStatus(),
      promptsLoaded: true,
      validatorLoaded: true
    };
  }
}

// Export singleton instance
export const perplexityRecipeService = new PerplexityRecipeService();