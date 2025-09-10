/**
 * Tests for Recipe Data Normalization and Validation
 * 
 * Comprehensive tests for all normalization and validation functionality
 * including ingredient formatting, instruction enhancement, metadata validation,
 * and image URL validation.
 */

import { RecipeDataNormalizer } from '../recipe-data-normalizer';
import { ParsedRecipe } from '../perplexity-client';

describe('RecipeDataNormalizer', () => {
  
  describe('Recipe Title Normalization', () => {
    it('should normalize recipe titles correctly', async () => {
      const recipe: ParsedRecipe = {
        title: '  recipe: CHICKEN parmesan recipe  ',
        description: '',
        culturalContext: '',
        ingredients: [{ name: 'chicken', amount: 1, unit: 'lb' }],
        instructions: [{ step: 1, text: 'Cook chicken' }],
        metadata: { servings: 4, totalTimeMinutes: 30, difficulty: 'medium', culturalAuthenticity: 'adapted' },
        images: []
      };

      const result = await RecipeDataNormalizer.normalizeRecipe(recipe);

      expect(result.normalizedRecipe.title).toBe('Chicken Parmesan');
      expect(result.changes).toContainEqual(
        expect.objectContaining({
          field: 'title',
          reason: 'Title formatting and cleanup'
        })
      );
    });

    it('should handle missing or invalid titles', async () => {
      const recipe: ParsedRecipe = {
        title: '',
        description: '',
        culturalContext: '',
        ingredients: [{ name: 'chicken', amount: 1, unit: 'lb' }],
        instructions: [{ step: 1, text: 'Cook chicken' }],
        metadata: { servings: 4, totalTimeMinutes: 30, difficulty: 'medium', culturalAuthenticity: 'adapted' },
        images: []
      };

      const result = await RecipeDataNormalizer.normalizeRecipe(recipe);

      expect(result.normalizedRecipe.title).toBe('Untitled Recipe');
    });
  });

  describe('Ingredient Normalization', () => {
    it('should normalize ingredient amounts and units', async () => {
      const recipe: ParsedRecipe = {
        title: 'Test Recipe',
        description: '',
        culturalContext: '',
        ingredients: [
          { name: '  Fresh Chicken Breast  ', amount: '1.5', unit: 'lbs' },
          { name: 'tomatoes', amount: '2-3', unit: 'cups' },
          { name: 'flour', amount: '1/2', unit: 'c' }
        ],
        instructions: [{ step: 1, text: 'Cook ingredients' }],
        metadata: { servings: 4, totalTimeMinutes: 30, difficulty: 'medium', culturalAuthenticity: 'adapted' },
        images: []
      };

      const result = await RecipeDataNormalizer.normalizeRecipe(recipe);

      expect(result.normalizedRecipe.ingredients[0].name).toBe('chicken breast');
      expect(result.normalizedRecipe.ingredients[0].amount).toBe(1.5);
      expect(result.normalizedRecipe.ingredients[0].unit).toBe('pound');

      expect(result.normalizedRecipe.ingredients[1].amount).toBe(2.5); // Average of 2-3
      expect(result.normalizedRecipe.ingredients[1].unit).toBe('cup');

      expect(result.normalizedRecipe.ingredients[2].amount).toBe(0.5); // 1/2 fraction
      expect(result.normalizedRecipe.ingredients[2].unit).toBe('cup');
    });

    it('should handle invalid ingredient data', async () => {
      const recipe: ParsedRecipe = {
        title: 'Test Recipe',
        description: '',
        culturalContext: '',
        ingredients: [
          { name: '', amount: 0, unit: 'invalid' },
          { name: 'valid ingredient', amount: -5, unit: 'cup' }
        ],
        instructions: [{ step: 1, text: 'Cook ingredients' }],
        metadata: { servings: 4, totalTimeMinutes: 30, difficulty: 'medium', culturalAuthenticity: 'adapted' },
        images: []
      };

      const result = await RecipeDataNormalizer.normalizeRecipe(recipe);

      expect(result.warnings).toContain('Ingredient 1 has invalid name: "unknown ingredient"');
      expect(result.warnings).toContain('Ingredient 2 has invalid amount: 1');
      expect(result.qualityScore).toBeLessThan(100);
    });
  });

  describe('Instruction Normalization', () => {
    it('should normalize instruction text and timing', async () => {
      const recipe: ParsedRecipe = {
        title: 'Test Recipe',
        description: '',
        culturalContext: '',
        ingredients: [{ name: 'chicken', amount: 1, unit: 'lb' }],
        instructions: [
          { step: 1, text: '1. heat oil in pan', timeMinutes: '5.5' },
          { step: 2, text: '  add chicken and cook until done  ', timeMinutes: 10 },
          { step: 3, text: 'serve hot', temperature: '350F' }
        ],
        metadata: { servings: 4, totalTimeMinutes: 30, difficulty: 'medium', culturalAuthenticity: 'adapted' },
        images: []
      };

      const result = await RecipeDataNormalizer.normalizeRecipe(recipe);

      expect(result.normalizedRecipe.instructions[0].text).toBe('Heat oil in pan');
      expect(result.normalizedRecipe.instructions[0].timeMinutes).toBe(6); // Rounded
      expect(result.normalizedRecipe.instructions[1].text).toBe('Add chicken and cook until done');
      expect(result.normalizedRecipe.instructions[2].temperature).toBe('350°F');
    });

    it('should validate instruction completeness', async () => {
      const recipe: ParsedRecipe = {
        title: 'Test Recipe',
        description: '',
        culturalContext: '',
        ingredients: [{ name: 'chicken', amount: 1, unit: 'lb' }],
        instructions: [
          { step: 1, text: 'Cook' }, // Very short instruction
          { step: 3, text: 'Serve hot' } // Non-sequential step
        ],
        metadata: { servings: 4, totalTimeMinutes: 30, difficulty: 'medium', culturalAuthenticity: 'adapted' },
        images: []
      };

      const result = await RecipeDataNormalizer.normalizeRecipe(recipe);

      expect(result.warnings).toContain('Instruction 1 is very short: "Cook"');
      expect(result.warnings).toContain('Instruction step numbers are not sequential');
    });
  });

  describe('Metadata Normalization', () => {
    it('should normalize servings and time values', async () => {
      const recipe: ParsedRecipe = {
        title: 'Test Recipe',
        description: '',
        culturalContext: '',
        ingredients: [{ name: 'chicken', amount: 1, unit: 'lb' }],
        instructions: [{ step: 1, text: 'Cook chicken thoroughly' }],
        metadata: {
          servings: '4-6',
          prepTimeMinutes: '15.5',
          cookTimeMinutes: 20,
          totalTimeMinutes: '45',
          difficulty: 'EASY',
          culturalAuthenticity: 'authentic'
        },
        images: []
      };

      const result = await RecipeDataNormalizer.normalizeRecipe(recipe);

      expect(result.normalizedRecipe.metadata.servings).toBe(5); // Average of 4-6
      expect(result.normalizedRecipe.metadata.prepTimeMinutes).toBe(16); // Rounded
      expect(result.normalizedRecipe.metadata.totalTimeMinutes).toBe(45);
      expect(result.normalizedRecipe.metadata.difficulty).toBe('easy');
      expect(result.normalizedRecipe.metadata.culturalAuthenticity).toBe('traditional');
    });

    it('should validate time consistency', async () => {
      const recipe: ParsedRecipe = {
        title: 'Test Recipe',
        description: '',
        culturalContext: '',
        ingredients: [{ name: 'chicken', amount: 1, unit: 'lb' }],
        instructions: [{ step: 1, text: 'Cook chicken thoroughly' }],
        metadata: {
          servings: 4,
          prepTimeMinutes: 15,
          cookTimeMinutes: 20,
          totalTimeMinutes: 60, // Inconsistent with prep + cook
          difficulty: 'medium',
          culturalAuthenticity: 'adapted'
        },
        images: []
      };

      const result = await RecipeDataNormalizer.normalizeRecipe(recipe);

      expect(result.warnings).toContain(
        expect.stringContaining("Total time (60min) doesn't match prep + cook time (35min)")
      );
    });
  });

  describe('Image URL Validation', () => {
    it('should validate and filter image URLs', async () => {
      const recipe: ParsedRecipe = {
        title: 'Test Recipe',
        description: '',
        culturalContext: '',
        ingredients: [{ name: 'chicken', amount: 1, unit: 'lb' }],
        instructions: [{ step: 1, text: 'Cook chicken thoroughly' }],
        metadata: { servings: 4, totalTimeMinutes: 30, difficulty: 'medium', culturalAuthenticity: 'adapted' },
        images: [
          'https://example.com/recipe-image.jpg',
          'https://example.com/high-res-dish.png',
          'invalid-url',
          'https://example.com/placeholder.jpg',
          'https://example.com/thumb-150x150.jpg'
        ]
      };

      const result = await RecipeDataNormalizer.normalizeRecipe(recipe, {
        validateImages: true
      });

      expect(result.normalizedRecipe.images.length).toBeLessThan(recipe.images.length);
      expect(result.warnings).toContain(expect.stringContaining('validation failed'));
      expect(result.changes).toContainEqual(
        expect.objectContaining({
          field: 'images',
          reason: 'Removed invalid or inaccessible images'
        })
      );
    });

    it('should handle missing images gracefully', async () => {
      const recipe: ParsedRecipe = {
        title: 'Test Recipe',
        description: '',
        culturalContext: '',
        ingredients: [{ name: 'chicken', amount: 1, unit: 'lb' }],
        instructions: [{ step: 1, text: 'Cook chicken thoroughly' }],
        metadata: { servings: 4, totalTimeMinutes: 30, difficulty: 'medium', culturalAuthenticity: 'adapted' },
        images: []
      };

      const result = await RecipeDataNormalizer.normalizeRecipe(recipe, {
        validateImages: true
      });

      expect(result.normalizedRecipe.images).toEqual([]);
      expect(result.warnings).toContain('No images provided for validation');
    });
  });

  describe('Cultural Context Normalization', () => {
    it('should enhance cultural context', async () => {
      const recipe: ParsedRecipe = {
        title: 'Test Recipe',
        description: '',
        culturalContext: '  this is a traditional italian dish  ',
        ingredients: [{ name: 'chicken', amount: 1, unit: 'lb' }],
        instructions: [{ step: 1, text: 'Cook chicken thoroughly' }],
        metadata: { servings: 4, totalTimeMinutes: 30, difficulty: 'medium', culturalAuthenticity: 'adapted' },
        images: []
      };

      const result = await RecipeDataNormalizer.normalizeRecipe(recipe, {
        culturalContext: 'italian'
      });

      expect(result.normalizedRecipe.culturalContext).toBe('This is a traditional italian dish');
    });

    it('should provide default cultural context when missing', async () => {
      const recipe: ParsedRecipe = {
        title: 'Test Recipe',
        description: '',
        culturalContext: '',
        ingredients: [{ name: 'chicken', amount: 1, unit: 'lb' }],
        instructions: [{ step: 1, text: 'Cook chicken thoroughly' }],
        metadata: { servings: 4, totalTimeMinutes: 30, difficulty: 'medium', culturalAuthenticity: 'adapted' },
        images: []
      };

      const result = await RecipeDataNormalizer.normalizeRecipe(recipe, {
        culturalContext: 'mexican'
      });

      expect(result.normalizedRecipe.culturalContext).toBe('This recipe represents mexican culinary traditions.');
    });
  });

  describe('Quality Scoring', () => {
    it('should calculate quality scores based on issues', async () => {
      const highQualityRecipe: ParsedRecipe = {
        title: 'Perfect Chicken Parmesan',
        description: 'A delicious Italian-American dish',
        culturalContext: 'This dish combines Italian techniques with American preferences',
        ingredients: [
          { name: 'chicken breast', amount: 1, unit: 'pound' },
          { name: 'parmesan cheese', amount: 0.5, unit: 'cup' },
          { name: 'breadcrumbs', amount: 1, unit: 'cup' }
        ],
        instructions: [
          { step: 1, text: 'Pound chicken to even thickness for consistent cooking', timeMinutes: 5 },
          { step: 2, text: 'Bread chicken with seasoned breadcrumbs and parmesan', timeMinutes: 10 },
          { step: 3, text: 'Fry until golden brown and cooked through', timeMinutes: 15 }
        ],
        metadata: {
          servings: 4,
          prepTimeMinutes: 15,
          cookTimeMinutes: 15,
          totalTimeMinutes: 30,
          difficulty: 'medium',
          culturalAuthenticity: 'adapted'
        },
        images: ['https://example.com/chicken-parmesan.jpg']
      };

      const lowQualityRecipe: ParsedRecipe = {
        title: '',
        description: '',
        culturalContext: '',
        ingredients: [
          { name: '', amount: 0, unit: '' }
        ],
        instructions: [
          { step: 1, text: 'Cook' }
        ],
        metadata: {
          servings: 0,
          totalTimeMinutes: 0,
          difficulty: 'medium',
          culturalAuthenticity: 'adapted'
        },
        images: []
      };

      const highQualityResult = await RecipeDataNormalizer.normalizeRecipe(highQualityRecipe);
      const lowQualityResult = await RecipeDataNormalizer.normalizeRecipe(lowQualityRecipe);

      expect(highQualityResult.qualityScore).toBeGreaterThan(80);
      expect(lowQualityResult.qualityScore).toBeLessThan(50);
      expect(lowQualityResult.warnings.length).toBeGreaterThan(highQualityResult.warnings.length);
    });
  });

  describe('Normalization Options', () => {
    it('should respect preserveOriginalUnits option', async () => {
      const recipe: ParsedRecipe = {
        title: 'Test Recipe',
        description: '',
        culturalContext: '',
        ingredients: [{ name: 'flour', amount: 1, unit: 'c' }],
        instructions: [{ step: 1, text: 'Mix flour with water' }],
        metadata: { servings: 4, totalTimeMinutes: 30, difficulty: 'medium', culturalAuthenticity: 'adapted' },
        images: []
      };

      const normalizedResult = await RecipeDataNormalizer.normalizeRecipe(recipe, {
        preserveOriginalUnits: false
      });

      const preservedResult = await RecipeDataNormalizer.normalizeRecipe(recipe, {
        preserveOriginalUnits: true
      });

      expect(normalizedResult.normalizedRecipe.ingredients[0].unit).toBe('cup');
      expect(preservedResult.normalizedRecipe.ingredients[0].unit).toBe('c');
    });

    it('should apply strict validation when requested', async () => {
      const recipe: ParsedRecipe = {
        title: 'Test Recipe',
        description: '',
        culturalContext: '',
        ingredients: [{ name: 'chicken', amount: 1, unit: 'lb' }],
        instructions: [{ step: 1, text: 'Cook' }], // Short instruction
        metadata: { servings: 4, totalTimeMinutes: 30, difficulty: 'medium', culturalAuthenticity: 'adapted' },
        images: []
      };

      const strictResult = await RecipeDataNormalizer.normalizeRecipe(recipe, {
        strictValidation: true
      });

      const lenientResult = await RecipeDataNormalizer.normalizeRecipe(recipe, {
        strictValidation: false
      });

      // Strict validation should be more critical
      expect(strictResult.qualityScore).toBeLessThanOrEqual(lenientResult.qualityScore);
    });
  });
});