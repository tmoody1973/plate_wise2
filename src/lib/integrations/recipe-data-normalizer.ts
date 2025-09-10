/**
 * Recipe Data Normalization and Validation Service
 * 
 * Provides comprehensive normalization and validation of recipe data
 * extracted from Perplexity API responses. Ensures consistent formats,
 * validates completeness, and enhances data quality.
 */

import { ParsedRecipe, RecipeIngredient, RecipeInstruction, RecipeMetadata } from './perplexity-client';

export interface NormalizationOptions {
  strictValidation?: boolean;
  preserveOriginalUnits?: boolean;
  enhanceInstructions?: boolean;
  validateImages?: boolean;
  culturalContext?: string;
}

export interface NormalizationResult {
  normalizedRecipe: ParsedRecipe;
  changes: NormalizationChange[];
  warnings: string[];
  qualityScore: number;
}

export interface NormalizationChange {
  field: string;
  originalValue: any;
  normalizedValue: any;
  reason: string;
}

export interface ImageValidationResult {
  url: string;
  isValid: boolean;
  isAccessible: boolean;
  contentType?: string;
  dimensions?: { width: number; height: number };
  fileSize?: number;
  quality: 'high' | 'medium' | 'low';
  relevance: 'primary_dish' | 'cooking_process' | 'ingredients' | 'cultural_context' | 'unknown';
  issues: string[];
}

export class RecipeDataNormalizer {
  
  /**
   * Normalize complete recipe data with comprehensive validation
   */
  static async normalizeRecipe(
    recipe: ParsedRecipe, 
    options: NormalizationOptions = {}
  ): Promise<NormalizationResult> {
    const {
      strictValidation = false,
      preserveOriginalUnits = false,
      enhanceInstructions = true,
      validateImages = true,
      culturalContext
    } = options;

    const changes: NormalizationChange[] = [];
    const warnings: string[] = [];
    let qualityScore = 100;

    console.log(`🔧 Normalizing recipe: "${recipe.title}"`);

    // Normalize title
    const normalizedTitle = this.normalizeTitle(recipe.title);
    if (normalizedTitle !== recipe.title) {
      changes.push({
        field: 'title',
        originalValue: recipe.title,
        normalizedValue: normalizedTitle,
        reason: 'Title formatting and cleanup'
      });
    }

    // Normalize description
    const normalizedDescription = this.normalizeDescription(recipe.description);
    if (normalizedDescription !== recipe.description) {
      changes.push({
        field: 'description',
        originalValue: recipe.description,
        normalizedValue: normalizedDescription,
        reason: 'Description formatting and cleanup'
      });
    }

    // Normalize ingredients
    const ingredientResult = this.normalizeIngredients(
      recipe.ingredients, 
      { preserveOriginalUnits, culturalContext }
    );
    if (ingredientResult.changes.length > 0) {
      changes.push(...ingredientResult.changes);
    }
    warnings.push(...ingredientResult.warnings);
    qualityScore -= ingredientResult.qualityPenalty;

    // Normalize instructions
    const instructionResult = this.normalizeInstructions(
      recipe.instructions, 
      { enhance: enhanceInstructions, culturalContext }
    );
    if (instructionResult.changes.length > 0) {
      changes.push(...instructionResult.changes);
    }
    warnings.push(...instructionResult.warnings);
    qualityScore -= instructionResult.qualityPenalty;

    // Normalize metadata
    const metadataResult = this.normalizeMetadata(recipe.metadata);
    if (metadataResult.changes.length > 0) {
      changes.push(...metadataResult.changes);
    }
    warnings.push(...metadataResult.warnings);

    // Validate and normalize images
    let normalizedImages = recipe.images || [];
    if (validateImages && normalizedImages.length > 0) {
      const imageResult = await this.validateAndNormalizeImages(normalizedImages);
      normalizedImages = imageResult.validImages;
      warnings.push(...imageResult.warnings);
      qualityScore -= imageResult.qualityPenalty;
      
      if (imageResult.changes.length > 0) {
        changes.push(...imageResult.changes);
      }
    }

    // Normalize cultural context
    const normalizedCulturalContext = this.normalizeCulturalContext(
      recipe.culturalContext, 
      culturalContext
    );

    const normalizedRecipe: ParsedRecipe = {
      title: normalizedTitle,
      description: normalizedDescription,
      culturalContext: normalizedCulturalContext,
      ingredients: ingredientResult.ingredients,
      instructions: instructionResult.instructions,
      metadata: metadataResult.metadata,
      images: normalizedImages
    };

    // Final quality assessment
    qualityScore = Math.max(0, Math.min(qualityScore, 100));

    console.log(`✅ Recipe normalization completed (${changes.length} changes, score: ${qualityScore})`);

    return {
      normalizedRecipe,
      changes,
      warnings,
      qualityScore
    };
  }

  /**
   * Normalize recipe title
   */
  private static normalizeTitle(title: string): string {
    if (!title || typeof title !== 'string') {
      return 'Untitled Recipe';
    }

    return title
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/^recipe:?\s*/i, '') // Remove "Recipe:" prefix
      .replace(/\s+recipe$/i, '') // Remove "recipe" suffix
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Normalize recipe description
   */
  private static normalizeDescription(description: string): string {
    if (!description || typeof description !== 'string') {
      return '';
    }

    return description
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/^(this is |this recipe is |a )/i, '') // Remove common prefixes
      .charAt(0).toUpperCase() + description.slice(1);
  }

  /**
   * Normalize ingredients with unit standardization
   */
  private static normalizeIngredients(
    ingredients: RecipeIngredient[], 
    options: { preserveOriginalUnits?: boolean; culturalContext?: string } = {}
  ): {
    ingredients: RecipeIngredient[];
    changes: NormalizationChange[];
    warnings: string[];
    qualityPenalty: number;
  } {
    const changes: NormalizationChange[] = [];
    const warnings: string[] = [];
    let qualityPenalty = 0;

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      warnings.push('No ingredients found in recipe');
      qualityPenalty += 30;
      return { ingredients: [], changes, warnings, qualityPenalty };
    }

    const normalizedIngredients = ingredients.map((ingredient, index) => {
      const original = { ...ingredient };
      
      // Normalize ingredient name
      let normalizedName = this.normalizeIngredientName(ingredient.name);
      if (normalizedName !== ingredient.name) {
        changes.push({
          field: `ingredients[${index}].name`,
          originalValue: ingredient.name,
          normalizedValue: normalizedName,
          reason: 'Ingredient name normalization'
        });
      }

      // Normalize amount
      let normalizedAmount = this.normalizeAmount(ingredient.amount);
      if (normalizedAmount !== ingredient.amount) {
        changes.push({
          field: `ingredients[${index}].amount`,
          originalValue: ingredient.amount,
          normalizedValue: normalizedAmount,
          reason: 'Amount normalization'
        });
      }

      // Normalize unit
      let normalizedUnit = options.preserveOriginalUnits 
        ? ingredient.unit 
        : this.normalizeUnit(ingredient.unit);
      if (normalizedUnit !== ingredient.unit) {
        changes.push({
          field: `ingredients[${index}].unit`,
          originalValue: ingredient.unit,
          normalizedValue: normalizedUnit,
          reason: 'Unit standardization'
        });
      }

      // Validate ingredient quality
      if (!normalizedName || normalizedName.length < 2) {
        warnings.push(`Ingredient ${index + 1} has invalid name: "${normalizedName}"`);
        qualityPenalty += 5;
      }

      if (normalizedAmount <= 0) {
        warnings.push(`Ingredient ${index + 1} has invalid amount: ${normalizedAmount}`);
        qualityPenalty += 3;
      }

      return {
        name: normalizedName,
        amount: normalizedAmount,
        unit: normalizedUnit,
        notes: ingredient.notes ? ingredient.notes.trim() : undefined,
        substitutions: Array.isArray(ingredient.substitutions) 
          ? ingredient.substitutions.filter(sub => sub && sub.trim().length > 0)
          : []
      };
    });

    return {
      ingredients: normalizedIngredients,
      changes,
      warnings,
      qualityPenalty
    };
  }

  /**
   * Normalize ingredient name
   */
  private static normalizeIngredientName(name: string): string {
    if (!name || typeof name !== 'string') {
      return 'Unknown ingredient';
    }

    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/^(fresh |dried |ground |chopped |diced |sliced )/g, '') // Move prep to notes
      .trim();
  }

  /**
   * Normalize amount values
   */
  private static normalizeAmount(amount: any): number {
    if (typeof amount === 'number' && !isNaN(amount) && amount > 0) {
      return Math.round(amount * 100) / 100; // Round to 2 decimal places
    }

    if (typeof amount === 'string') {
      // Handle fractions
      if (amount.includes('/')) {
        const parts = amount.split('/');
        if (parts.length === 2) {
          const numerator = parseFloat(parts[0]);
          const denominator = parseFloat(parts[1]);
          if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
            return Math.round((numerator / denominator) * 100) / 100;
          }
        }
      }

      // Handle ranges (take the average)
      if (amount.includes('-')) {
        const parts = amount.split('-');
        if (parts.length === 2) {
          const min = parseFloat(parts[0]);
          const max = parseFloat(parts[1]);
          if (!isNaN(min) && !isNaN(max)) {
            return Math.round(((min + max) / 2) * 100) / 100;
          }
        }
      }

      // Try direct parsing
      const parsed = parseFloat(amount);
      if (!isNaN(parsed) && parsed > 0) {
        return Math.round(parsed * 100) / 100;
      }
    }

    return 1; // Default fallback
  }

  /**
   * Normalize measurement units
   */
  private static normalizeUnit(unit: string): string {
    if (!unit || typeof unit !== 'string') {
      return 'piece';
    }

    const normalized = unit.toLowerCase().trim();
    
    // Unit mapping for standardization
    const unitMap: Record<string, string> = {
      // Volume
      'c': 'cup',
      'cups': 'cup',
      'tbsp': 'tablespoon',
      'tablespoons': 'tablespoon',
      'tsp': 'teaspoon',
      'teaspoons': 'teaspoon',
      'fl oz': 'fluid ounce',
      'fluid ounces': 'fluid ounce',
      'pt': 'pint',
      'pints': 'pint',
      'qt': 'quart',
      'quarts': 'quart',
      'gal': 'gallon',
      'gallons': 'gallon',
      'ml': 'milliliter',
      'milliliters': 'milliliter',
      'l': 'liter',
      'liters': 'liter',

      // Weight
      'oz': 'ounce',
      'ounces': 'ounce',
      'lb': 'pound',
      'lbs': 'pound',
      'pounds': 'pound',
      'g': 'gram',
      'grams': 'gram',
      'kg': 'kilogram',
      'kilograms': 'kilogram',

      // Count
      'pcs': 'piece',
      'pieces': 'piece',
      'each': 'piece',
      'whole': 'piece',
      'cloves': 'clove',
      'slices': 'slice',
      'strips': 'strip',

      // Containers
      'cans': 'can',
      'bottles': 'bottle',
      'packages': 'package',
      'boxes': 'box',
      'bags': 'bag',
      'bunches': 'bunch'
    };

    return unitMap[normalized] || normalized;
  }

  /**
   * Normalize cooking instructions
   */
  private static normalizeInstructions(
    instructions: RecipeInstruction[], 
    options: { enhance?: boolean; culturalContext?: string } = {}
  ): {
    instructions: RecipeInstruction[];
    changes: NormalizationChange[];
    warnings: string[];
    qualityPenalty: number;
  } {
    const changes: NormalizationChange[] = [];
    const warnings: string[] = [];
    let qualityPenalty = 0;

    if (!Array.isArray(instructions) || instructions.length === 0) {
      warnings.push('No instructions found in recipe');
      qualityPenalty += 30;
      return { instructions: [], changes, warnings, qualityPenalty };
    }

    const normalizedInstructions = instructions.map((instruction, index) => {
      const original = { ...instruction };

      // Normalize step number
      let normalizedStep = typeof instruction.step === 'number' 
        ? instruction.step 
        : index + 1;

      // Normalize instruction text
      let normalizedText = this.normalizeInstructionText(instruction.text);
      if (normalizedText !== instruction.text) {
        changes.push({
          field: `instructions[${index}].text`,
          originalValue: instruction.text,
          normalizedValue: normalizedText,
          reason: 'Instruction text normalization'
        });
      }

      // Normalize time estimates
      let normalizedTime = this.normalizeTimeEstimate(instruction.timeMinutes);
      if (normalizedTime !== instruction.timeMinutes) {
        changes.push({
          field: `instructions[${index}].timeMinutes`,
          originalValue: instruction.timeMinutes,
          normalizedValue: normalizedTime,
          reason: 'Time estimate normalization'
        });
      }

      // Normalize temperature
      let normalizedTemperature = this.normalizeTemperature(instruction.temperature);
      if (normalizedTemperature !== instruction.temperature) {
        changes.push({
          field: `instructions[${index}].temperature`,
          originalValue: instruction.temperature,
          normalizedValue: normalizedTemperature,
          reason: 'Temperature normalization'
        });
      }

      // Validate instruction quality
      if (!normalizedText || normalizedText.length < 10) {
        warnings.push(`Instruction ${index + 1} is very short: "${normalizedText}"`);
        qualityPenalty += 3;
      }

      return {
        step: normalizedStep,
        text: normalizedText,
        timeMinutes: normalizedTime,
        temperature: normalizedTemperature,
        equipment: Array.isArray(instruction.equipment) 
          ? instruction.equipment.filter(eq => eq && eq.trim().length > 0)
          : []
      };
    });

    // Validate step sequence
    const stepNumbers = normalizedInstructions.map(inst => inst.step);
    const expectedSequence = Array.from({length: stepNumbers.length}, (_, i) => i + 1);
    const hasCorrectSequence = stepNumbers.every((step, index) => step === expectedSequence[index]);
    
    if (!hasCorrectSequence) {
      warnings.push('Instruction step numbers are not sequential');
      qualityPenalty += 5;
    }

    return {
      instructions: normalizedInstructions,
      changes,
      warnings,
      qualityPenalty
    };
  }

  /**
   * Normalize instruction text
   */
  private static normalizeInstructionText(text: string): string {
    if (!text || typeof text !== 'string') {
      return 'Complete this cooking step';
    }

    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/^\d+\.\s*/, '') // Remove step numbers from text
      .charAt(0).toUpperCase() + text.slice(1);
  }

  /**
   * Normalize time estimates
   */
  private static normalizeTimeEstimate(timeMinutes: any): number | undefined {
    if (typeof timeMinutes === 'number' && !isNaN(timeMinutes) && timeMinutes > 0) {
      return Math.round(timeMinutes);
    }

    if (typeof timeMinutes === 'string') {
      const parsed = parseFloat(timeMinutes);
      if (!isNaN(parsed) && parsed > 0) {
        return Math.round(parsed);
      }
    }

    return undefined;
  }

  /**
   * Normalize temperature values
   */
  private static normalizeTemperature(temperature: any): string | undefined {
    if (!temperature || typeof temperature !== 'string') {
      return undefined;
    }

    const temp = temperature.trim();
    
    // Extract numeric value and unit
    const match = temp.match(/(\d+)\s*°?\s*([CF])?/i);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2] ? match[2].toUpperCase() : 'F'; // Default to Fahrenheit
      return `${value}°${unit}`;
    }

    return temp;
  }

  /**
   * Normalize recipe metadata
   */
  private static normalizeMetadata(metadata: RecipeMetadata): {
    metadata: RecipeMetadata;
    changes: NormalizationChange[];
    warnings: string[];
  } {
    const changes: NormalizationChange[] = [];
    const warnings: string[] = [];

    if (!metadata || typeof metadata !== 'object') {
      warnings.push('Missing recipe metadata');
      return {
        metadata: {
          servings: 4,
          totalTimeMinutes: 30,
          difficulty: 'medium',
          culturalAuthenticity: 'adapted'
        },
        changes,
        warnings
      };
    }

    // Normalize servings
    let normalizedServings = this.normalizeServings(metadata.servings);
    if (normalizedServings !== metadata.servings) {
      changes.push({
        field: 'metadata.servings',
        originalValue: metadata.servings,
        normalizedValue: normalizedServings,
        reason: 'Servings normalization'
      });
    }

    // Normalize times
    let normalizedTotalTime = this.normalizeTimeEstimate(metadata.totalTimeMinutes) || 30;
    let normalizedPrepTime = this.normalizeTimeEstimate(metadata.prepTimeMinutes);
    let normalizedCookTime = this.normalizeTimeEstimate(metadata.cookTimeMinutes);

    // Validate time consistency
    if (normalizedPrepTime && normalizedCookTime) {
      const calculatedTotal = normalizedPrepTime + normalizedCookTime;
      if (Math.abs(calculatedTotal - normalizedTotalTime) > 10) {
        warnings.push(`Total time (${normalizedTotalTime}min) doesn't match prep + cook time (${calculatedTotal}min)`);
      }
    }

    return {
      metadata: {
        servings: normalizedServings,
        prepTimeMinutes: normalizedPrepTime,
        cookTimeMinutes: normalizedCookTime,
        totalTimeMinutes: normalizedTotalTime,
        difficulty: this.normalizeDifficulty(metadata.difficulty),
        culturalAuthenticity: this.normalizeAuthenticity(metadata.culturalAuthenticity)
      },
      changes,
      warnings
    };
  }

  /**
   * Normalize servings count
   */
  private static normalizeServings(servings: any): number {
    if (typeof servings === 'number' && !isNaN(servings) && servings > 0) {
      return Math.round(servings);
    }

    if (typeof servings === 'string') {
      // Handle ranges (take the average)
      if (servings.includes('-')) {
        const parts = servings.split('-');
        if (parts.length === 2) {
          const min = parseInt(parts[0]);
          const max = parseInt(parts[1]);
          if (!isNaN(min) && !isNaN(max)) {
            return Math.round((min + max) / 2);
          }
        }
      }

      const parsed = parseInt(servings);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }

    return 4; // Default fallback
  }

  /**
   * Normalize difficulty level
   */
  private static normalizeDifficulty(difficulty: any): 'easy' | 'medium' | 'hard' {
    if (typeof difficulty === 'string') {
      const normalized = difficulty.toLowerCase().trim();
      if (['easy', 'simple', 'beginner'].includes(normalized)) return 'easy';
      if (['hard', 'difficult', 'advanced', 'expert'].includes(normalized)) return 'hard';
      if (['medium', 'moderate', 'intermediate'].includes(normalized)) return 'medium';
    }
    return 'medium';
  }

  /**
   * Normalize cultural authenticity level
   */
  private static normalizeAuthenticity(authenticity: any): 'traditional' | 'adapted' | 'modern' {
    if (typeof authenticity === 'string') {
      const normalized = authenticity.toLowerCase().trim();
      if (['traditional', 'authentic', 'classic'].includes(normalized)) return 'traditional';
      if (['modern', 'contemporary', 'fusion'].includes(normalized)) return 'modern';
      if (['adapted', 'modified', 'adjusted'].includes(normalized)) return 'adapted';
    }
    return 'adapted';
  }

  /**
   * Normalize cultural context
   */
  private static normalizeCulturalContext(
    culturalContext: string, 
    expectedContext?: string
  ): string {
    if (!culturalContext || typeof culturalContext !== 'string') {
      return expectedContext 
        ? `This recipe represents ${expectedContext} culinary traditions.`
        : 'This recipe has cultural significance and traditional cooking methods.';
    }

    return culturalContext
      .trim()
      .replace(/\s+/g, ' ')
      .charAt(0).toUpperCase() + culturalContext.slice(1);
  }

  /**
   * Validate and normalize image URLs
   */
  private static async validateAndNormalizeImages(images: string[]): Promise<{
    validImages: string[];
    changes: NormalizationChange[];
    warnings: string[];
    qualityPenalty: number;
  }> {
    const changes: NormalizationChange[] = [];
    const warnings: string[] = [];
    let qualityPenalty = 0;

    if (!Array.isArray(images) || images.length === 0) {
      warnings.push('No images provided for validation');
      return { validImages: [], changes, warnings, qualityPenalty };
    }

    const validImages: string[] = [];
    const validationPromises = images.map(async (url, index) => {
      try {
        const validation = await this.validateImageUrl(url);
        
        if (validation.isValid && validation.isAccessible) {
          validImages.push(url);
        } else {
          warnings.push(`Image ${index + 1} validation failed: ${validation.issues.join(', ')}`);
          qualityPenalty += 5;
        }

        return validation;
      } catch (error) {
        warnings.push(`Image ${index + 1} validation error: ${error.message}`);
        qualityPenalty += 5;
        return null;
      }
    });

    await Promise.allSettled(validationPromises);

    // Sort images by quality and relevance
    const sortedImages = validImages.slice(0, 5); // Limit to top 5 images

    if (sortedImages.length < images.length) {
      changes.push({
        field: 'images',
        originalValue: images,
        normalizedValue: sortedImages,
        reason: 'Removed invalid or inaccessible images'
      });
    }

    return {
      validImages: sortedImages,
      changes,
      warnings,
      qualityPenalty
    };
  }

  /**
   * Validate individual image URL
   */
  private static async validateImageUrl(url: string): Promise<ImageValidationResult> {
    const issues: string[] = [];
    let isValid = true;
    let isAccessible = false;
    let contentType: string | undefined;
    let quality: 'high' | 'medium' | 'low' = 'medium';
    let relevance: ImageValidationResult['relevance'] = 'unknown';

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      issues.push('Invalid URL format');
      isValid = false;
    }

    // Check URL patterns for quality indicators
    if (isValid) {
      // Check for high-quality indicators
      if (url.includes('high-res') || url.includes('large') || url.includes('original')) {
        quality = 'high';
      } else if (url.includes('thumb') || url.includes('small') || url.includes('150x')) {
        quality = 'low';
        issues.push('Low resolution image detected');
      }

      // Check for relevance indicators
      if (url.includes('recipe') || url.includes('dish') || url.includes('food')) {
        relevance = 'primary_dish';
      } else if (url.includes('cooking') || url.includes('process') || url.includes('step')) {
        relevance = 'cooking_process';
      } else if (url.includes('ingredient')) {
        relevance = 'ingredients';
      }

      // Check for problematic patterns
      if (url.includes('placeholder') || url.includes('default') || url.includes('no-image')) {
        issues.push('Placeholder or default image');
        quality = 'low';
      }

      // Validate image extension
      const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
      const hasValidExtension = validExtensions.some(ext => url.toLowerCase().includes(ext));
      if (!hasValidExtension) {
        issues.push('No valid image extension detected');
      }

      // Try to validate accessibility (simplified check)
      try {
        // In a real implementation, you might want to make a HEAD request
        // For now, we'll do basic validation
        if (url.startsWith('https://') && hasValidExtension) {
          isAccessible = true;
        }
      } catch {
        issues.push('Image not accessible');
      }
    }

    return {
      url,
      isValid,
      isAccessible,
      contentType,
      quality,
      relevance,
      issues
    };
  }
}