/**
 * Perplexity Prompt Validation and Testing Utilities
 * 
 * Validates prompt responses and ensures they meet quality standards
 * for the Tavily + Perplexity recipe search system.
 */

import { RecipeIngredient, RecipeInstruction, DietaryInfo } from './recipe-types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  score: number; // 0-100 quality score
  suggestions: string[];
}

export interface RecipeValidationResult extends ValidationResult {
  completeness: {
    hasTitle: boolean;
    hasIngredients: boolean;
    hasInstructions: boolean;
    hasImages: boolean;
    hasCulturalContext: boolean;
    hasNutritionalInfo: boolean;
  };
  quality: {
    ingredientCount: number;
    instructionCount: number;
    imageCount: number;
    culturalDepth: number; // 0-10 scale
    authenticityScore: number; // 0-10 scale
  };
}

export class PerplexityPromptValidator {
  
  /**
   * Validate a complete recipe extraction response
   */
  static validateRecipeExtraction(response: any): RecipeValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Check basic structure
    if (!response || typeof response !== 'object') {
      errors.push('Response is not a valid object');
      return this.createFailedValidation(errors);
    }

    // Validate required fields
    const completeness = {
      hasTitle: this.validateTitle(response.title, errors, warnings),
      hasIngredients: this.validateIngredients(response.ingredients, errors, warnings, suggestions),
      hasInstructions: this.validateInstructions(response.instructions, errors, warnings, suggestions),
      hasImages: this.validateImages(response.images, errors, warnings, suggestions),
      hasCulturalContext: this.validateCulturalContext(response.culturalContext, errors, warnings),
      hasNutritionalInfo: this.validateNutritionalInfo(response.nutritionalInfo, warnings)
    };

    // Calculate quality metrics
    const quality = {
      ingredientCount: Array.isArray(response.ingredients) ? response.ingredients.length : 0,
      instructionCount: Array.isArray(response.instructions) ? response.instructions.length : 0,
      imageCount: Array.isArray(response.images) ? response.images.length : 0,
      culturalDepth: this.assessCulturalDepth(response),
      authenticityScore: this.assessAuthenticity(response)
    };

    // Validate metadata
    this.validateMetadata(response.metadata, errors, warnings);

    // Validate dietary information
    this.validateDietaryInfo(response.dietaryInfo, warnings);

    // Calculate overall score
    const score = this.calculateQualityScore(completeness, quality, errors.length, warnings.length);

    // Add quality-based suggestions
    this.addQualitySuggestions(quality, completeness, suggestions);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      score,
      suggestions,
      completeness,
      quality
    };
  }

  /**
   * Validate recipe title
   */
  private static validateTitle(title: any, errors: string[], warnings: string[]): boolean {
    if (!title || typeof title !== 'string') {
      errors.push('Recipe title is missing or invalid');
      return false;
    }

    if (title.length < 3) {
      errors.push('Recipe title is too short');
      return false;
    }

    if (title.length > 200) {
      warnings.push('Recipe title is very long, consider shortening');
    }

    // Check for generic titles
    const genericTitles = ['recipe', 'dish', 'food', 'untitled'];
    if (genericTitles.some(generic => title.toLowerCase().includes(generic))) {
      warnings.push('Title appears generic, could be more specific');
    }

    return true;
  }

  /**
   * Validate ingredients array
   */
  private static validateIngredients(
    ingredients: any, 
    errors: string[], 
    warnings: string[], 
    suggestions: string[]
  ): boolean {
    if (!Array.isArray(ingredients)) {
      errors.push('Ingredients must be an array');
      return false;
    }

    if (ingredients.length === 0) {
      errors.push('Recipe must have at least one ingredient');
      return false;
    }

    if (ingredients.length < 3) {
      warnings.push('Recipe has very few ingredients, may be incomplete');
    }

    // Validate each ingredient
    ingredients.forEach((ingredient, index) => {
      this.validateSingleIngredient(ingredient, index, errors, warnings, suggestions);
    });

    return true;
  }

  /**
   * Validate single ingredient object
   */
  private static validateSingleIngredient(
    ingredient: any, 
    index: number, 
    errors: string[], 
    warnings: string[], 
    suggestions: string[]
  ): void {
    const prefix = `Ingredient ${index + 1}`;

    if (!ingredient || typeof ingredient !== 'object') {
      errors.push(`${prefix}: Invalid ingredient object`);
      return;
    }

    // Required fields
    if (!ingredient.name || typeof ingredient.name !== 'string') {
      errors.push(`${prefix}: Missing or invalid ingredient name`);
    }

    if (typeof ingredient.amount !== 'number' || ingredient.amount <= 0) {
      errors.push(`${prefix}: Missing or invalid amount`);
    }

    if (!ingredient.unit || typeof ingredient.unit !== 'string') {
      errors.push(`${prefix}: Missing or invalid unit`);
    }

    // Quality checks
    if (ingredient.name && ingredient.name.length < 2) {
      warnings.push(`${prefix}: Ingredient name is very short`);
    }

    // Check for common measurement units
    const validUnits = [
      'cup', 'cups', 'tablespoon', 'tablespoons', 'teaspoon', 'teaspoons',
      'pound', 'pounds', 'ounce', 'ounces', 'gram', 'grams', 'kilogram', 'kilograms',
      'liter', 'liters', 'milliliter', 'milliliters', 'piece', 'pieces', 'clove', 'cloves',
      'slice', 'slices', 'can', 'cans', 'package', 'packages', 'bunch', 'bunches'
    ];

    if (ingredient.unit && !validUnits.includes(ingredient.unit.toLowerCase())) {
      suggestions.push(`${prefix}: Consider using standard unit instead of "${ingredient.unit}"`);
    }

    // Check for cultural significance
    if (ingredient.culturalSignificance && 
        !['essential', 'important', 'common', 'optional'].includes(ingredient.culturalSignificance)) {
      warnings.push(`${prefix}: Invalid cultural significance value`);
    }
  }

  /**
   * Validate instructions array
   */
  private static validateInstructions(
    instructions: any, 
    errors: string[], 
    warnings: string[], 
    suggestions: string[]
  ): boolean {
    if (!Array.isArray(instructions)) {
      errors.push('Instructions must be an array');
      return false;
    }

    if (instructions.length === 0) {
      errors.push('Recipe must have at least one instruction');
      return false;
    }

    if (instructions.length < 3) {
      warnings.push('Recipe has very few instructions, may be incomplete');
    }

    // Validate each instruction
    instructions.forEach((instruction, index) => {
      this.validateSingleInstruction(instruction, index, errors, warnings, suggestions);
    });

    // Check step numbering
    const stepNumbers = instructions.map(inst => inst.step).filter(step => typeof step === 'number');
    if (stepNumbers.length > 0) {
      const expectedSteps = Array.from({length: stepNumbers.length}, (_, i) => i + 1);
      const hasCorrectNumbering = stepNumbers.every((step, index) => step === expectedSteps[index]);
      
      if (!hasCorrectNumbering) {
        warnings.push('Instruction step numbers are not sequential');
      }
    }

    return true;
  }

  /**
   * Validate single instruction object
   */
  private static validateSingleInstruction(
    instruction: any, 
    index: number, 
    errors: string[], 
    warnings: string[], 
    suggestions: string[]
  ): void {
    const prefix = `Instruction ${index + 1}`;

    if (!instruction || typeof instruction !== 'object') {
      errors.push(`${prefix}: Invalid instruction object`);
      return;
    }

    // Required fields
    if (!instruction.text || typeof instruction.text !== 'string') {
      errors.push(`${prefix}: Missing or invalid instruction text`);
    }

    if (typeof instruction.step !== 'number' || instruction.step <= 0) {
      errors.push(`${prefix}: Missing or invalid step number`);
    }

    // Quality checks
    if (instruction.text && instruction.text.length < 10) {
      warnings.push(`${prefix}: Instruction text is very short`);
    }

    if (instruction.text && instruction.text.length > 500) {
      suggestions.push(`${prefix}: Instruction is very long, consider breaking into smaller steps`);
    }

    // Validate time estimates
    if (instruction.timeMinutes && (typeof instruction.timeMinutes !== 'number' || instruction.timeMinutes <= 0)) {
      warnings.push(`${prefix}: Invalid time estimate`);
    }

    // Validate equipment array
    if (instruction.equipment && !Array.isArray(instruction.equipment)) {
      warnings.push(`${prefix}: Equipment should be an array`);
    }
  }

  /**
   * Validate images array
   */
  private static validateImages(
    images: any, 
    errors: string[], 
    warnings: string[], 
    suggestions: string[]
  ): boolean {
    if (!Array.isArray(images)) {
      warnings.push('Images should be an array');
      return false;
    }

    if (images.length === 0) {
      warnings.push('Recipe has no images, consider adding visual content');
      return false;
    }

    // Validate each image
    images.forEach((image, index) => {
      this.validateSingleImage(image, index, errors, warnings, suggestions);
    });

    return true;
  }

  /**
   * Validate single image object
   */
  private static validateSingleImage(
    image: any, 
    index: number, 
    errors: string[], 
    warnings: string[], 
    suggestions: string[]
  ): void {
    const prefix = `Image ${index + 1}`;

    if (!image || typeof image !== 'object') {
      warnings.push(`${prefix}: Invalid image object`);
      return;
    }

    // Required fields
    if (!image.url || typeof image.url !== 'string') {
      warnings.push(`${prefix}: Missing or invalid image URL`);
      return;
    }

    // URL validation
    try {
      new URL(image.url);
    } catch {
      warnings.push(`${prefix}: Invalid URL format`);
    }

    // Quality checks
    if (!image.url.match(/\.(jpg|jpeg|png|webp)$/i)) {
      suggestions.push(`${prefix}: Image URL should end with a valid image extension`);
    }

    if (image.quality && !['high', 'medium', 'low'].includes(image.quality)) {
      warnings.push(`${prefix}: Invalid quality value`);
    }

    if (image.relevance && !['primary_dish', 'cooking_process', 'ingredients', 'cultural_context'].includes(image.relevance)) {
      warnings.push(`${prefix}: Invalid relevance value`);
    }
  }

  /**
   * Validate cultural context
   */
  private static validateCulturalContext(culturalContext: any, errors: string[], warnings: string[]): boolean {
    if (!culturalContext || typeof culturalContext !== 'string') {
      warnings.push('Cultural context is missing or invalid');
      return false;
    }

    if (culturalContext.length < 20) {
      warnings.push('Cultural context is very brief, could be more informative');
    }

    return true;
  }

  /**
   * Validate nutritional information
   */
  private static validateNutritionalInfo(nutritionalInfo: any, warnings: string[]): boolean {
    if (!nutritionalInfo) {
      warnings.push('Nutritional information is missing');
      return false;
    }

    const requiredFields = ['calories', 'protein_g', 'fat_g', 'carbs_g'];
    const missingFields = requiredFields.filter(field => 
      typeof nutritionalInfo[field] !== 'number' || nutritionalInfo[field] < 0
    );

    if (missingFields.length > 0) {
      warnings.push(`Nutritional info missing or invalid: ${missingFields.join(', ')}`);
    }

    return missingFields.length === 0;
  }

  /**
   * Validate metadata object
   */
  private static validateMetadata(metadata: any, errors: string[], warnings: string[]): void {
    if (!metadata || typeof metadata !== 'object') {
      errors.push('Recipe metadata is missing or invalid');
      return;
    }

    // Required fields
    if (typeof metadata.servings !== 'number' || metadata.servings <= 0) {
      errors.push('Invalid servings count in metadata');
    }

    if (typeof metadata.totalTimeMinutes !== 'number' || metadata.totalTimeMinutes <= 0) {
      errors.push('Invalid total time in metadata');
    }

    // Optional but recommended fields
    if (!metadata.yieldText || typeof metadata.yieldText !== 'string') {
      warnings.push('Missing yield text in metadata');
    }

    if (metadata.difficulty && !['easy', 'medium', 'hard'].includes(metadata.difficulty)) {
      warnings.push('Invalid difficulty level in metadata');
    }

    if (metadata.culturalAuthenticity && 
        !['traditional', 'adapted', 'modern'].includes(metadata.culturalAuthenticity)) {
      warnings.push('Invalid cultural authenticity level in metadata');
    }
  }

  /**
   * Validate dietary information
   */
  private static validateDietaryInfo(dietaryInfo: any, warnings: string[]): void {
    if (!dietaryInfo || typeof dietaryInfo !== 'object') {
      warnings.push('Dietary information is missing');
      return;
    }

    const booleanFields = [
      'isVegetarian', 'isVegan', 'isGlutenFree', 'isDairyFree', 
      'isNutFree', 'isHalal', 'isKosher'
    ];

    booleanFields.forEach(field => {
      if (dietaryInfo[field] !== undefined && typeof dietaryInfo[field] !== 'boolean') {
        warnings.push(`Dietary info field ${field} should be boolean`);
      }
    });
  }

  /**
   * Assess cultural depth of the recipe
   */
  private static assessCulturalDepth(response: any): number {
    let score = 0;

    // Cultural context quality
    if (response.culturalContext && response.culturalContext.length > 50) score += 2;
    if (response.culturalContext && response.culturalContext.length > 100) score += 1;

    // Cultural origin specified
    if (response.culturalOrigin && Array.isArray(response.culturalOrigin) && response.culturalOrigin.length > 0) {
      score += 2;
    }

    // Traditional occasions
    if (response.traditionalOccasions && Array.isArray(response.traditionalOccasions) && response.traditionalOccasions.length > 0) {
      score += 1;
    }

    // Regional variations
    if (response.regionalVariations && Array.isArray(response.regionalVariations) && response.regionalVariations.length > 0) {
      score += 1;
    }

    // Cultural techniques in instructions
    if (response.instructions && Array.isArray(response.instructions)) {
      const culturalTechniques = response.instructions.filter(inst => inst.culturalTechnique);
      if (culturalTechniques.length > 0) score += 2;
    }

    // Cultural significance in ingredients
    if (response.ingredients && Array.isArray(response.ingredients)) {
      const culturalIngredients = response.ingredients.filter(ing => ing.culturalSignificance);
      if (culturalIngredients.length > 0) score += 1;
    }

    return Math.min(score, 10); // Cap at 10
  }

  /**
   * Assess authenticity score
   */
  private static assessAuthenticity(response: any): number {
    let score = 5; // Start with neutral score

    // Check metadata authenticity level
    if (response.metadata?.culturalAuthenticity === 'traditional') score += 3;
    else if (response.metadata?.culturalAuthenticity === 'adapted') score += 1;
    else if (response.metadata?.culturalAuthenticity === 'modern') score -= 1;

    // Check for traditional ingredients
    if (response.ingredients && Array.isArray(response.ingredients)) {
      const traditionalIngredients = response.ingredients.filter(ing => 
        ing.culturalSignificance === 'essential' || ing.culturalSignificance === 'important'
      );
      score += Math.min(traditionalIngredients.length, 3);
    }

    // Check for cultural techniques
    if (response.instructions && Array.isArray(response.instructions)) {
      const culturalTechniques = response.instructions.filter(inst => inst.culturalTechnique);
      score += Math.min(culturalTechniques.length, 2);
    }

    return Math.max(0, Math.min(score, 10)); // Keep between 0-10
  }

  /**
   * Calculate overall quality score
   */
  private static calculateQualityScore(
    completeness: any, 
    quality: any, 
    errorCount: number, 
    warningCount: number
  ): number {
    let score = 0;

    // Completeness scoring (40 points)
    if (completeness.hasTitle) score += 5;
    if (completeness.hasIngredients) score += 10;
    if (completeness.hasInstructions) score += 10;
    if (completeness.hasImages) score += 5;
    if (completeness.hasCulturalContext) score += 5;
    if (completeness.hasNutritionalInfo) score += 5;

    // Quality scoring (40 points)
    score += Math.min(quality.ingredientCount * 2, 10); // Up to 10 points for ingredients
    score += Math.min(quality.instructionCount * 1.5, 10); // Up to 10 points for instructions
    score += Math.min(quality.imageCount * 2, 6); // Up to 6 points for images
    score += Math.min(quality.culturalDepth, 8); // Up to 8 points for cultural depth
    score += Math.min(quality.authenticityScore, 6); // Up to 6 points for authenticity

    // Error penalties (20 points)
    score -= errorCount * 5; // 5 points per error
    score -= warningCount * 1; // 1 point per warning

    return Math.max(0, Math.min(score, 100)); // Keep between 0-100
  }

  /**
   * Add quality-based suggestions
   */
  private static addQualitySuggestions(quality: any, completeness: any, suggestions: string[]): void {
    if (quality.ingredientCount < 5) {
      suggestions.push('Consider adding more ingredients for a complete recipe');
    }

    if (quality.instructionCount < 5) {
      suggestions.push('Consider breaking down instructions into more detailed steps');
    }

    if (quality.imageCount === 0) {
      suggestions.push('Adding images would greatly improve the recipe presentation');
    }

    if (quality.culturalDepth < 5) {
      suggestions.push('Consider adding more cultural context and traditional significance');
    }

    if (quality.authenticityScore < 6) {
      suggestions.push('Consider researching traditional ingredients and techniques for better authenticity');
    }

    if (!completeness.hasNutritionalInfo) {
      suggestions.push('Adding nutritional information would be helpful for users');
    }
  }

  /**
   * Create a failed validation result
   */
  private static createFailedValidation(errors: string[]): RecipeValidationResult {
    return {
      isValid: false,
      errors,
      warnings: [],
      score: 0,
      suggestions: [],
      completeness: {
        hasTitle: false,
        hasIngredients: false,
        hasInstructions: false,
        hasImages: false,
        hasCulturalContext: false,
        hasNutritionalInfo: false
      },
      quality: {
        ingredientCount: 0,
        instructionCount: 0,
        imageCount: 0,
        culturalDepth: 0,
        authenticityScore: 0
      }
    };
  }

  /**
   * Validate JSON structure and parseability
   */
  static validateJSONStructure(responseText: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      // Try to extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        errors.push('No JSON object found in response');
        return { isValid: false, errors, warnings, score: 0, suggestions };
      }

      const jsonText = jsonMatch[0];
      const parsed = JSON.parse(jsonText);

      // Check if it's a valid object
      if (!parsed || typeof parsed !== 'object') {
        errors.push('Parsed JSON is not a valid object');
        return { isValid: false, errors, warnings, score: 0, suggestions };
      }

      // Success
      return { isValid: true, errors, warnings, score: 100, suggestions };

    } catch (parseError) {
      errors.push(`JSON parsing failed: ${parseError.message}`);
      
      // Try to identify common JSON issues
      if (responseText.includes('```json')) {
        suggestions.push('Response contains markdown formatting, ensure clean JSON extraction');
      }
      
      if (responseText.includes('\\n') || responseText.includes('\n')) {
        suggestions.push('Response may contain unescaped newlines');
      }

      return { isValid: false, errors, warnings, score: 0, suggestions };
    }
  }
}