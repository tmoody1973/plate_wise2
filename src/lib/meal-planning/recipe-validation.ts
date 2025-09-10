/**
 * Recipe Validation and Error Handling
 * Validates enhanced recipe data and provides comprehensive error handling
 */

import { EnhancedRecipe, EnhancedIngredient, EnhancedNutritionalInfo } from '@/types';

export interface ValidationError {
    field: string;
    message: string;
    code: string;
    severity: 'error' | 'warning';
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
    score: number; // 0-100 quality score
}

export interface RecipeQualityMetrics {
    completeness: number;        // 0-100: How complete is the recipe data
    instructionQuality: number;  // 0-100: Quality of cooking instructions
    ingredientDetail: number;    // 0-100: Detail level of ingredients
    safetyCompliance: number;    // 0-100: USDA safety compliance
    accessibility: number;       // 0-100: Accessibility features (synonyms, etc.)
}

class RecipeValidationService {

    /**
     * Validate an enhanced recipe with comprehensive checks
     */
    validateRecipe(recipe: any): ValidationResult {
        const errors: ValidationError[] = [];
        const warnings: ValidationError[] = [];

        // Required field validation
        this.validateRequiredFields(recipe, errors);

        // URL validation
        this.validateUrls(recipe, errors, warnings);

        // Ingredient validation
        this.validateIngredients(recipe.ingredients, errors, warnings);

        // Instruction validation
        this.validateInstructions(recipe.instructions, errors, warnings);

        // Nutritional info validation
        this.validateNutritionalInfo(recipe.nutritionalInfo, errors, warnings);

        // Data quality validation
        this.validateDataQuality(recipe, warnings);

        const isValid = errors.length === 0;
        const score = this.calculateQualityScore(recipe, errors, warnings);

        return {
            isValid,
            errors,
            warnings,
            score
        };
    }

    /**
     * Validate required fields according to production schema
     */
    private validateRequiredFields(recipe: any, errors: ValidationError[]): void {
        const requiredFields = [
            'title', 'description', 'cuisine', 'culturalOrigin',
            'sourceUrl', 'imageUrl', 'totalTimeMinutes', 'servings',
            'yieldText', 'ingredients', 'instructions', 'nutritionalInfo'
        ];

        requiredFields.forEach(field => {
            if (!recipe[field]) {
                errors.push({
                    field,
                    message: `Required field '${field}' is missing`,
                    code: 'REQUIRED_FIELD_MISSING',
                    severity: 'error'
                });
            }
        });

        // Validate field types and constraints
        if (recipe.title && recipe.title.length < 3) {
            errors.push({
                field: 'title',
                message: 'Title must be at least 3 characters long',
                code: 'TITLE_TOO_SHORT',
                severity: 'error'
            });
        }

        if (recipe.description && recipe.description.length < 10) {
            errors.push({
                field: 'description',
                message: 'Description must be at least 10 characters long',
                code: 'DESCRIPTION_TOO_SHORT',
                severity: 'error'
            });
        }

        if (recipe.totalTimeMinutes && recipe.totalTimeMinutes < 1) {
            errors.push({
                field: 'totalTimeMinutes',
                message: 'Total time must be at least 1 minute',
                code: 'INVALID_TIME',
                severity: 'error'
            });
        }

        if (recipe.servings && recipe.servings < 1) {
            errors.push({
                field: 'servings',
                message: 'Servings must be at least 1',
                code: 'INVALID_SERVINGS',
                severity: 'error'
            });
        }

        if (recipe.yieldText && recipe.yieldText.length < 2) {
            errors.push({
                field: 'yieldText',
                message: 'Yield text must be at least 2 characters long',
                code: 'YIELD_TEXT_TOO_SHORT',
                severity: 'error'
            });
        }
    }

    /**
     * Validate URLs for proper format and accessibility
     */
    private validateUrls(recipe: any, errors: ValidationError[], warnings: ValidationError[]): void {
        // Source URL validation
        if (recipe.sourceUrl) {
            if (!this.isValidUrl(recipe.sourceUrl)) {
                errors.push({
                    field: 'sourceUrl',
                    message: 'Source URL is not a valid URI format',
                    code: 'INVALID_SOURCE_URL',
                    severity: 'error'
                });
            } else if (!recipe.sourceUrl.startsWith('https://')) {
                warnings.push({
                    field: 'sourceUrl',
                    message: 'Source URL should use HTTPS for security',
                    code: 'NON_HTTPS_SOURCE_URL',
                    severity: 'warning'
                });
            }
        }

        // Image URL validation
        if (recipe.imageUrl) {
            if (!this.isValidUrl(recipe.imageUrl)) {
                errors.push({
                    field: 'imageUrl',
                    message: 'Image URL is not a valid URI format',
                    code: 'INVALID_IMAGE_URL',
                    severity: 'error'
                });
            } else if (!recipe.imageUrl.startsWith('https://')) {
                warnings.push({
                    field: 'imageUrl',
                    message: 'Image URL should use HTTPS for security',
                    code: 'NON_HTTPS_IMAGE_URL',
                    severity: 'warning'
                });
            }

            // Check for recommended image dimensions (1200x630 or larger)
            if (recipe.imageUrl && !this.hasRecommendedImageSize(recipe.imageUrl)) {
                warnings.push({
                    field: 'imageUrl',
                    message: 'Image should be at least 1200x630 pixels for optimal display',
                    code: 'SUBOPTIMAL_IMAGE_SIZE',
                    severity: 'warning'
                });
            }
        }
    }

    /**
     * Validate ingredients array and individual ingredient objects
     */
    private validateIngredients(ingredients: any[], errors: ValidationError[], warnings: ValidationError[]): void {
        if (!Array.isArray(ingredients)) {
            errors.push({
                field: 'ingredients',
                message: 'Ingredients must be an array',
                code: 'INGREDIENTS_NOT_ARRAY',
                severity: 'error'
            });
            return;
        }

        if (ingredients.length < 1) {
            errors.push({
                field: 'ingredients',
                message: 'Recipe must have at least 1 ingredient',
                code: 'NO_INGREDIENTS',
                severity: 'error'
            });
            return;
        }

        ingredients.forEach((ingredient, index) => {
            const fieldPrefix = `ingredients[${index}]`;

            // Required ingredient fields
            if (!ingredient.name) {
                errors.push({
                    field: `${fieldPrefix}.name`,
                    message: 'Ingredient name is required',
                    code: 'INGREDIENT_NAME_MISSING',
                    severity: 'error'
                });
            }

            if (typeof ingredient.amount !== 'number') {
                errors.push({
                    field: `${fieldPrefix}.amount`,
                    message: 'Ingredient amount must be a number',
                    code: 'INGREDIENT_AMOUNT_INVALID',
                    severity: 'error'
                });
            }

            if (!ingredient.unit) {
                errors.push({
                    field: `${fieldPrefix}.unit`,
                    message: 'Ingredient unit is required',
                    code: 'INGREDIENT_UNIT_MISSING',
                    severity: 'error'
                });
            }

            // Check for synonyms (accessibility feature)
            if (!ingredient.synonyms || ingredient.synonyms.length === 0) {
                warnings.push({
                    field: `${fieldPrefix}.synonyms`,
                    message: 'Consider adding synonyms for better accessibility',
                    code: 'MISSING_SYNONYMS',
                    severity: 'warning'
                });
            }

            // Validate amount is positive
            if (ingredient.amount && ingredient.amount <= 0) {
                errors.push({
                    field: `${fieldPrefix}.amount`,
                    message: 'Ingredient amount must be positive',
                    code: 'INGREDIENT_AMOUNT_NEGATIVE',
                    severity: 'error'
                });
            }
        });
    }

    /**
     * Validate instructions for completeness and safety
     */
    private validateInstructions(instructions: any[], errors: ValidationError[], warnings: ValidationError[]): void {
        if (!Array.isArray(instructions)) {
            errors.push({
                field: 'instructions',
                message: 'Instructions must be an array',
                code: 'INSTRUCTIONS_NOT_ARRAY',
                severity: 'error'
            });
            return;
        }

        if (instructions.length < 6) {
            errors.push({
                field: 'instructions',
                message: 'Recipe must have at least 6 instruction steps',
                code: 'INSUFFICIENT_INSTRUCTIONS',
                severity: 'error'
            });
            return;
        }

        let hasTemperatureGuidance = false;
        let hasSafetyGuidance = false;
        let hasTimingGuidance = false;

        instructions.forEach((instruction, index) => {
            const fieldPrefix = `instructions[${index}]`;

            // Required instruction fields
            if (typeof instruction.step !== 'number' || instruction.step < 1) {
                errors.push({
                    field: `${fieldPrefix}.step`,
                    message: 'Instruction step must be a positive number',
                    code: 'INSTRUCTION_STEP_INVALID',
                    severity: 'error'
                });
            }

            if (!instruction.text || instruction.text.length < 30) {
                errors.push({
                    field: `${fieldPrefix}.text`,
                    message: 'Instruction text must be at least 30 characters for clarity',
                    code: 'INSTRUCTION_TEXT_TOO_SHORT',
                    severity: 'error'
                });
            }

            // Check for quality indicators
            if (instruction.text) {
                const text = instruction.text.toLowerCase();

                // Temperature guidance
                if (text.includes('°f') || text.includes('°c') || text.includes('degrees')) {
                    hasTemperatureGuidance = true;
                }

                // Safety guidance (USDA temperatures)
                if (text.includes('165°f') || text.includes('160°f') || text.includes('145°f') ||
                    text.includes('internal temperature')) {
                    hasSafetyGuidance = true;
                }

                // Timing guidance
                if (text.includes('minutes') || text.includes('seconds') || text.includes('until')) {
                    hasTimingGuidance = true;
                }

                // Check for beginner-friendly details
                if (!this.hasBeginnerFriendlyDetails(text)) {
                    warnings.push({
                        field: `${fieldPrefix}.text`,
                        message: 'Consider adding more specific details (cookware size, visual cues, timing)',
                        code: 'LACKS_BEGINNER_DETAILS',
                        severity: 'warning'
                    });
                }
            }
        });

        // Overall instruction quality checks
        if (!hasTemperatureGuidance) {
            warnings.push({
                field: 'instructions',
                message: 'Consider adding temperature guidance for better results',
                code: 'MISSING_TEMPERATURE_GUIDANCE',
                severity: 'warning'
            });
        }

        if (!hasSafetyGuidance && this.requiresSafetyGuidance(instructions)) {
            warnings.push({
                field: 'instructions',
                message: 'Consider adding USDA-aligned safe cooking temperatures',
                code: 'MISSING_SAFETY_GUIDANCE',
                severity: 'warning'
            });
        }

        if (!hasTimingGuidance) {
            warnings.push({
                field: 'instructions',
                message: 'Consider adding timing guidance for better results',
                code: 'MISSING_TIMING_GUIDANCE',
                severity: 'warning'
            });
        }
    }

    /**
     * Validate nutritional information
     */
    private validateNutritionalInfo(nutritionalInfo: any, errors: ValidationError[], warnings: ValidationError[]): void {
        if (!nutritionalInfo) {
            errors.push({
                field: 'nutritionalInfo',
                message: 'Nutritional information is required',
                code: 'NUTRITIONAL_INFO_MISSING',
                severity: 'error'
            });
            return;
        }

        const requiredNutrients = ['calories', 'protein_g', 'fat_g', 'carbs_g'];

        requiredNutrients.forEach(nutrient => {
            if (typeof nutritionalInfo[nutrient] !== 'number') {
                errors.push({
                    field: `nutritionalInfo.${nutrient}`,
                    message: `${nutrient} must be a number`,
                    code: 'NUTRITIONAL_VALUE_INVALID',
                    severity: 'error'
                });
            } else if (nutritionalInfo[nutrient] < 0) {
                errors.push({
                    field: `nutritionalInfo.${nutrient}`,
                    message: `${nutrient} cannot be negative`,
                    code: 'NUTRITIONAL_VALUE_NEGATIVE',
                    severity: 'error'
                });
            }
        });

        // Sanity checks for nutritional values
        if (nutritionalInfo.calories && nutritionalInfo.calories > 2000) {
            warnings.push({
                field: 'nutritionalInfo.calories',
                message: 'Calories per serving seem unusually high (>2000)',
                code: 'HIGH_CALORIES',
                severity: 'warning'
            });
        }
    }

    /**
     * Validate overall data quality
     */
    private validateDataQuality(recipe: any, warnings: ValidationError[]): void {
        // Check cultural origin array
        if (!Array.isArray(recipe.culturalOrigin) || recipe.culturalOrigin.length === 0) {
            warnings.push({
                field: 'culturalOrigin',
                message: 'Cultural origin should be specified for authenticity',
                code: 'MISSING_CULTURAL_ORIGIN',
                severity: 'warning'
            });
        }

        // Check for tags
        if (!recipe.tags || recipe.tags.length === 0) {
            warnings.push({
                field: 'tags',
                message: 'Consider adding tags for better discoverability',
                code: 'MISSING_TAGS',
                severity: 'warning'
            });
        }

        // Check reasonable cooking time
        if (recipe.totalTimeMinutes && recipe.totalTimeMinutes > 480) { // 8 hours
            warnings.push({
                field: 'totalTimeMinutes',
                message: 'Cooking time seems unusually long (>8 hours)',
                code: 'EXCESSIVE_COOKING_TIME',
                severity: 'warning'
            });
        }
    }

    /**
     * Calculate overall quality score
     */
    private calculateQualityScore(recipe: any, errors: ValidationError[], warnings: ValidationError[]): number {
        let score = 100;

        // Deduct points for errors (more severe)
        score -= errors.length * 15;

        // Deduct points for warnings (less severe)
        score -= warnings.length * 5;

        // Bonus points for quality features
        if (recipe.ingredients?.some((ing: any) => ing.synonyms?.length > 0)) {
            score += 5; // Accessibility features
        }

        if (this.hasDetailedInstructions(recipe.instructions)) {
            score += 10; // Detailed instructions
        }

        if (this.hasProperUrls(recipe)) {
            score += 5; // Proper URL formatting
        }

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Helper methods
     */
    private isValidUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    private hasRecommendedImageSize(imageUrl: string): boolean {
        // This is a simplified check - in production, you might want to fetch image metadata
        // For now, we'll assume URLs with certain patterns indicate proper sizing
        return imageUrl.includes('1200') || imageUrl.includes('large') || imageUrl.includes('og-image');
    }

    private hasBeginnerFriendlyDetails(text: string): boolean {
        const detailIndicators = [
            'inch', 'cm', 'skillet', 'pan', 'pot', 'until', 'golden', 'brown',
            'bubbling', 'fragrant', 'tender', 'crispy', 'minutes', 'seconds'
        ];

        return detailIndicators.some(indicator => text.toLowerCase().includes(indicator));
    }

    private requiresSafetyGuidance(instructions: any[]): boolean {
        const instructionText = instructions.map(i => i.text?.toLowerCase() || '').join(' ');
        const meatKeywords = ['chicken', 'beef', 'pork', 'turkey', 'meat', 'poultry'];

        return meatKeywords.some(keyword => instructionText.includes(keyword));
    }

    private hasDetailedInstructions(instructions: any[]): boolean {
        if (!instructions || instructions.length < 6) return false;

        const avgLength = instructions.reduce((sum, inst) => sum + (inst.text?.length || 0), 0) / instructions.length;
        return avgLength >= 50; // Average instruction length of 50+ characters
    }

    private hasProperUrls(recipe: any): boolean {
        return recipe.sourceUrl?.startsWith('https://') && recipe.imageUrl?.startsWith('https://');
    }

    /**
     * Get quality metrics breakdown
     */
    getQualityMetrics(recipe: any): RecipeQualityMetrics {
        const validation = this.validateRecipe(recipe);

        return {
            completeness: this.calculateCompleteness(recipe),
            instructionQuality: this.calculateInstructionQuality(recipe.instructions),
            ingredientDetail: this.calculateIngredientDetail(recipe.ingredients),
            safetyCompliance: this.calculateSafetyCompliance(recipe.instructions),
            accessibility: this.calculateAccessibility(recipe)
        };
    }

    private calculateCompleteness(recipe: any): number {
        const requiredFields = [
            'title', 'description', 'cuisine', 'culturalOrigin',
            'sourceUrl', 'imageUrl', 'totalTimeMinutes', 'servings',
            'yieldText', 'ingredients', 'instructions', 'nutritionalInfo'
        ];

        const presentFields = requiredFields.filter(field => recipe[field]).length;
        return Math.round((presentFields / requiredFields.length) * 100);
    }

    private calculateInstructionQuality(instructions: any[]): number {
        if (!instructions || instructions.length === 0) return 0;

        let score = 0;
        const hasMinimumSteps = instructions.length >= 6 ? 30 : 0;
        const avgLength = instructions.reduce((sum, inst) => sum + (inst.text?.length || 0), 0) / instructions.length;
        const lengthScore = Math.min(30, avgLength); // Up to 30 points for length

        const detailScore = instructions.filter(inst =>
            this.hasBeginnerFriendlyDetails(inst.text || '')
        ).length / instructions.length * 40; // Up to 40 points for details

        return Math.round(hasMinimumSteps + lengthScore + detailScore);
    }

    private calculateIngredientDetail(ingredients: any[]): number {
        if (!ingredients || ingredients.length === 0) return 0;

        const withSynonyms = ingredients.filter(ing => ing.synonyms?.length > 0).length;
        const synonymScore = (withSynonyms / ingredients.length) * 50;

        const withValidAmounts = ingredients.filter(ing =>
            typeof ing.amount === 'number' && ing.amount > 0
        ).length;
        const amountScore = (withValidAmounts / ingredients.length) * 50;

        return Math.round(synonymScore + amountScore);
    }

    private calculateSafetyCompliance(instructions: any[]): number {
        if (!instructions || instructions.length === 0) return 0;

        const instructionText = instructions.map(i => i.text?.toLowerCase() || '').join(' ');
        const hasMeat = ['chicken', 'beef', 'pork', 'turkey', 'meat', 'poultry']
            .some(keyword => instructionText.includes(keyword));

        if (!hasMeat) return 100; // No meat, no safety concerns

        const hasSafetyTemp = instructionText.includes('165°f') ||
            instructionText.includes('160°f') ||
            instructionText.includes('145°f') ||
            instructionText.includes('internal temperature');

        return hasSafetyTemp ? 100 : 20; // Major deduction if meat recipe lacks safety guidance
    }

    private calculateAccessibility(recipe: any): number {
        let score = 0;

        // Synonyms for ingredients
        const ingredientsWithSynonyms = recipe.ingredients?.filter((ing: any) =>
            ing.synonyms?.length > 0
        ).length || 0;
        const synonymScore = recipe.ingredients?.length > 0 ?
            (ingredientsWithSynonyms / recipe.ingredients.length) * 50 : 0;

        // Clear cultural origin
        const culturalScore = recipe.culturalOrigin?.length > 0 ? 25 : 0;

        // Proper URLs for attribution
        const urlScore = (recipe.sourceUrl && recipe.imageUrl) ? 25 : 0;

        return Math.round(synonymScore + culturalScore + urlScore);
    }
}

// Export singleton instance
export const recipeValidationService = new RecipeValidationService();