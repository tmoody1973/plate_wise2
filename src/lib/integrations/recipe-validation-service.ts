/**
 * Recipe Validation Service
 * 
 * Comprehensive validation service that combines prompt validation,
 * data normalization, and quality assessment for recipe data.
 * Provides a unified interface for all validation needs.
 */

import { ParsedRecipe } from './perplexity-client';
import { PerplexityPromptValidator, RecipeValidationResult } from './perplexity-prompt-validator';
import { RecipeDataNormalizer, NormalizationResult, NormalizationOptions } from './recipe-data-normalizer';

export interface ComprehensiveValidationOptions extends NormalizationOptions {
  validatePromptResponse?: boolean;
  validateDataQuality?: boolean;
  validateCulturalAuthenticity?: boolean;
  minQualityScore?: number;
  requireImages?: boolean;
  requireCulturalContext?: boolean;
}

export interface ComprehensiveValidationResult {
  isValid: boolean;
  recipe: ParsedRecipe;
  promptValidation: RecipeValidationResult;
  normalizationResult: NormalizationResult;
  overallScore: number;
  issues: ValidationIssue[];
  recommendations: string[];
  metadata: {
    validationTime: number;
    changesApplied: number;
    warningsCount: number;
    errorsCount: number;
  };
}

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  category: 'structure' | 'content' | 'quality' | 'cultural' | 'images';
  message: string;
  field?: string;
  severity: 'critical' | 'major' | 'minor';
  fixable: boolean;
}

export class RecipeValidationService {
  
  /**
   * Perform comprehensive validation of recipe data
   */
  static async validateRecipe(
    recipe: ParsedRecipe,
    options: ComprehensiveValidationOptions = {}
  ): Promise<ComprehensiveValidationResult> {
    const startTime = Date.now();
    const {
      validatePromptResponse = true,
      validateDataQuality = true,
      validateCulturalAuthenticity = true,
      minQualityScore = 70,
      requireImages = false,
      requireCulturalContext = false,
      ...normalizationOptions
    } = options;

    console.log(`🔍 Starting comprehensive recipe validation: "${recipe.title}"`);

    const issues: ValidationIssue[] = [];
    const recommendations: string[] = [];

    // Step 1: Validate prompt response structure
    let promptValidation: RecipeValidationResult;
    if (validatePromptResponse) {
      promptValidation = PerplexityPromptValidator.validateRecipeExtraction(recipe);
      
      // Convert prompt validation errors to issues
      promptValidation.errors.forEach(error => {
        issues.push({
          type: 'error',
          category: 'structure',
          message: error,
          severity: 'critical',
          fixable: false
        });
      });

      promptValidation.warnings.forEach(warning => {
        issues.push({
          type: 'warning',
          category: 'structure',
          message: warning,
          severity: 'minor',
          fixable: true
        });
      });
    } else {
      // Create minimal validation result
      promptValidation = {
        isValid: true,
        errors: [],
        warnings: [],
        score: 85,
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
      };
    }

    // Step 2: Normalize and validate data quality
    let normalizationResult: NormalizationResult;
    if (validateDataQuality) {
      normalizationResult = await RecipeDataNormalizer.normalizeRecipe(recipe, normalizationOptions);
      
      // Convert normalization warnings to issues
      normalizationResult.warnings.forEach(warning => {
        issues.push({
          type: 'warning',
          category: 'quality',
          message: warning,
          severity: 'minor',
          fixable: true
        });
      });

      // Add recommendations based on normalization changes
      if (normalizationResult.changes.length > 0) {
        recommendations.push(`Applied ${normalizationResult.changes.length} data normalizations to improve quality`);
      }
    } else {
      // Use original recipe without normalization
      normalizationResult = {
        normalizedRecipe: recipe,
        changes: [],
        warnings: [],
        qualityScore: 85
      };
    }

    // Step 3: Validate cultural authenticity
    if (validateCulturalAuthenticity) {
      const culturalIssues = this.validateCulturalAuthenticity(
        normalizationResult.normalizedRecipe,
        options.culturalContext
      );
      issues.push(...culturalIssues);
    }

    // Step 4: Validate specific requirements
    if (requireImages && (!normalizationResult.normalizedRecipe.images || normalizationResult.normalizedRecipe.images.length === 0)) {
      issues.push({
        type: 'error',
        category: 'images',
        message: 'Recipe requires images but none were found',
        severity: 'major',
        fixable: true
      });
    }

    if (requireCulturalContext && !normalizationResult.normalizedRecipe.culturalContext) {
      issues.push({
        type: 'error',
        category: 'cultural',
        message: 'Recipe requires cultural context but none was provided',
        severity: 'major',
        fixable: true
      });
    }

    // Step 5: Calculate overall score and validity
    const overallScore = this.calculateOverallScore(
      promptValidation.score,
      normalizationResult.qualityScore,
      issues
    );

    const isValid = this.determineValidity(
      promptValidation.isValid,
      overallScore,
      minQualityScore,
      issues
    );

    // Step 6: Generate recommendations
    const additionalRecommendations = this.generateRecommendations(
      normalizationResult.normalizedRecipe,
      promptValidation,
      issues
    );
    recommendations.push(...additionalRecommendations);

    const validationTime = Date.now() - startTime;

    console.log(`✅ Recipe validation completed (${validationTime}ms, score: ${overallScore}, valid: ${isValid})`);

    return {
      isValid,
      recipe: normalizationResult.normalizedRecipe,
      promptValidation,
      normalizationResult,
      overallScore,
      issues,
      recommendations,
      metadata: {
        validationTime,
        changesApplied: normalizationResult.changes.length,
        warningsCount: issues.filter(i => i.type === 'warning').length,
        errorsCount: issues.filter(i => i.type === 'error').length
      }
    };
  }

  /**
   * Validate cultural authenticity aspects
   */
  private static validateCulturalAuthenticity(
    recipe: ParsedRecipe,
    expectedCulture?: string
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check cultural context quality
    if (!recipe.culturalContext || recipe.culturalContext.length < 20) {
      issues.push({
        type: 'warning',
        category: 'cultural',
        message: 'Cultural context is missing or too brief',
        severity: 'minor',
        fixable: true
      });
    }

    // Check for cultural ingredients
    const culturalIngredients = recipe.ingredients?.filter(ing => 
      ing.notes?.includes('traditional') || 
      ing.substitutions?.length > 0
    ) || [];

    if (culturalIngredients.length === 0 && expectedCulture) {
      issues.push({
        type: 'info',
        category: 'cultural',
        message: `No culturally significant ingredients identified for ${expectedCulture} cuisine`,
        severity: 'minor',
        fixable: true
      });
    }

    // Check cultural techniques in instructions
    const culturalTechniques = recipe.instructions?.filter(inst => 
      inst.equipment?.some(eq => eq.includes('traditional')) ||
      inst.text?.includes('traditional')
    ) || [];

    if (culturalTechniques.length === 0 && expectedCulture) {
      issues.push({
        type: 'info',
        category: 'cultural',
        message: `No traditional cooking techniques identified for ${expectedCulture} cuisine`,
        severity: 'minor',
        fixable: true
      });
    }

    return issues;
  }

  /**
   * Calculate overall validation score
   */
  private static calculateOverallScore(
    promptScore: number,
    normalizationScore: number,
    issues: ValidationIssue[]
  ): number {
    let baseScore = (promptScore + normalizationScore) / 2;

    // Apply penalties for issues
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const majorIssues = issues.filter(i => i.severity === 'major').length;
    const minorIssues = issues.filter(i => i.severity === 'minor').length;

    baseScore -= (criticalIssues * 15);
    baseScore -= (majorIssues * 8);
    baseScore -= (minorIssues * 3);

    return Math.max(0, Math.min(baseScore, 100));
  }

  /**
   * Determine if recipe is valid based on all criteria
   */
  private static determineValidity(
    promptValid: boolean,
    overallScore: number,
    minQualityScore: number,
    issues: ValidationIssue[]
  ): boolean {
    // Must pass prompt validation
    if (!promptValid) return false;

    // Must meet minimum quality score
    if (overallScore < minQualityScore) return false;

    // Must not have critical issues
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) return false;

    return true;
  }

  /**
   * Generate actionable recommendations
   */
  private static generateRecommendations(
    recipe: ParsedRecipe,
    promptValidation: RecipeValidationResult,
    issues: ValidationIssue[]
  ): string[] {
    const recommendations: string[] = [];

    // Quality-based recommendations
    if (promptValidation.quality.ingredientCount < 5) {
      recommendations.push('Consider adding more ingredients for a complete recipe');
    }

    if (promptValidation.quality.instructionCount < 5) {
      recommendations.push('Break down cooking steps into more detailed instructions');
    }

    if (promptValidation.quality.imageCount === 0) {
      recommendations.push('Adding high-quality images would greatly improve recipe presentation');
    }

    if (promptValidation.quality.culturalDepth < 5) {
      recommendations.push('Enhance cultural context with traditional significance and cooking methods');
    }

    // Issue-based recommendations
    const fixableIssues = issues.filter(i => i.fixable);
    if (fixableIssues.length > 0) {
      recommendations.push(`${fixableIssues.length} issues can be automatically fixed with re-processing`);
    }

    // Content-specific recommendations
    if (!recipe.metadata.prepTimeMinutes && !recipe.metadata.cookTimeMinutes) {
      recommendations.push('Add preparation and cooking time estimates for better meal planning');
    }

    if (recipe.metadata.difficulty === 'medium' && recipe.instructions.length < 5) {
      recommendations.push('Consider adjusting difficulty level based on instruction complexity');
    }

    return recommendations;
  }

  /**
   * Validate recipe meets minimum requirements for specific use cases
   */
  static validateForMealPlanning(recipe: ParsedRecipe): {
    isValid: boolean;
    missingRequirements: string[];
  } {
    const missingRequirements: string[] = [];

    if (!recipe.title || recipe.title.length < 3) {
      missingRequirements.push('Valid recipe title');
    }

    if (!recipe.ingredients || recipe.ingredients.length < 2) {
      missingRequirements.push('At least 2 ingredients');
    }

    if (!recipe.instructions || recipe.instructions.length < 2) {
      missingRequirements.push('At least 2 cooking instructions');
    }

    if (!recipe.metadata.servings || recipe.metadata.servings < 1) {
      missingRequirements.push('Valid serving count');
    }

    if (!recipe.metadata.totalTimeMinutes || recipe.metadata.totalTimeMinutes < 5) {
      missingRequirements.push('Realistic cooking time estimate');
    }

    return {
      isValid: missingRequirements.length === 0,
      missingRequirements
    };
  }

  /**
   * Validate recipe for cultural authenticity requirements
   */
  static validateForCulturalAuthenticity(
    recipe: ParsedRecipe,
    expectedCuisine: string,
    strictMode: boolean = false
  ): {
    isValid: boolean;
    authenticityScore: number;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let authenticityScore = 10;

    // Check cultural context
    if (!recipe.culturalContext || recipe.culturalContext.length < 50) {
      issues.push('Insufficient cultural context provided');
      authenticityScore -= 2;
      suggestions.push('Add detailed cultural background and traditional significance');
    }

    // Check authenticity level
    if (recipe.metadata.culturalAuthenticity === 'modern' && strictMode) {
      issues.push('Recipe marked as modern interpretation, not traditional');
      authenticityScore -= 3;
    }

    // Check for traditional ingredients
    const traditionalIngredients = recipe.ingredients?.filter(ing => 
      ing.notes?.includes('traditional') || ing.substitutions?.length > 0
    ) || [];

    if (traditionalIngredients.length === 0) {
      issues.push('No traditional or culturally significant ingredients identified');
      authenticityScore -= 2;
      suggestions.push('Research traditional ingredients specific to ' + expectedCuisine + ' cuisine');
    }

    // Check for cultural techniques
    const culturalTechniques = recipe.instructions?.filter(inst => 
      inst.text?.toLowerCase().includes('traditional') ||
      inst.equipment?.some(eq => eq.includes('traditional'))
    ) || [];

    if (culturalTechniques.length === 0) {
      issues.push('No traditional cooking techniques mentioned');
      authenticityScore -= 1;
      suggestions.push('Include traditional cooking methods and techniques');
    }

    authenticityScore = Math.max(0, authenticityScore);

    return {
      isValid: authenticityScore >= (strictMode ? 8 : 6),
      authenticityScore,
      issues,
      suggestions
    };
  }

  /**
   * Quick validation for API responses
   */
  static quickValidate(recipe: ParsedRecipe): {
    isValid: boolean;
    score: number;
    criticalIssues: string[];
  } {
    const criticalIssues: string[] = [];
    let score = 100;

    if (!recipe.title) {
      criticalIssues.push('Missing recipe title');
      score -= 20;
    }

    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      criticalIssues.push('Missing ingredients');
      score -= 30;
    }

    if (!recipe.instructions || recipe.instructions.length === 0) {
      criticalIssues.push('Missing cooking instructions');
      score -= 30;
    }

    if (!recipe.metadata || !recipe.metadata.servings) {
      criticalIssues.push('Missing serving information');
      score -= 10;
    }

    return {
      isValid: criticalIssues.length === 0,
      score: Math.max(0, score),
      criticalIssues
    };
  }
}